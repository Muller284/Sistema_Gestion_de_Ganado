/**
 * ============================================================================
 * SISTEMA DE GESTION DE GANADO
 * Pruebas del asistente con IA (fase 5, RF-38 a RF-42)
 * Responsable: Aaron
 * ============================================================================
 *
 * Contra el PostgreSQL de verdad y el servidor levantado, con las semillas
 * cargadas. El modelo de lenguaje es un proveedor SIMULADO que esta prueba
 * levanta en el puerto 4599: el servidor tiene que arrancar con
 *
 *   ASISTENTE_URL=http://localhost:4599/v1
 *   ASISTENTE_VOZ_URL=http://localhost:4599/v1beta
 *   ASISTENTE_CLAVE=prueba
 *
 * (asi lo hace la integracion continua). Si el servidor apunta a otro
 * proveedor, por ejemplo a Gemini con una clave real, las pruebas que hablan
 * con el modelo se omiten: no se gasta la cuota gratis en pruebas.
 *
 * El simulado responde segun una marca en la pregunta ([buscar], [ficha],
 * [sanidad], [bucle], [limite]) y guarda cada pedido que recibe, para revisar
 * que herramientas se le ofrecieron y que datos le llegaron.
 *
 * RF-38  Responde con los datos del rancho, combinando herramientas.
 * RF-39  Solo lee: no hay herramientas de alta, edicion ni baja.
 * RF-40  Solo ofrece y ejecuta herramientas de los modulos que se ven.
 * RF-41  No llega a otro rancho, aunque el modelo pida un animal ajeno.
 * RF-42  Cuota por usuario y por mes.
 * Voz    La pregunta hablada se transcribe y la respuesta se lee, con la API
 *        propia de Gemini (generateContent), simulada en el mismo puerto.
 * ============================================================================
 */

require('../cargar-entorno').cargarEntorno();
const assert = require('assert');
const http = require('http');
const { randomUUID } = require('crypto');
const { Pool } = require('pg');

const BASE = process.env.URL_SERVIDOR || 'http://localhost:3000';
const PUERTO_SIMULADO = 4599;

const RANCHO_A = 'a0000000-0000-4000-8000-000000000001';
const PROPIETARIO_A = 'a1000000-0000-4000-8000-000000000001';
const SOCIO_A = 'a1000000-0000-4000-8000-000000000002';
const ALMACEN_A = 'a1000000-0000-4000-8000-000000000005';
const PROPIETARIO_B = 'b1000000-0000-4000-8000-000000000001';
const SIN_RANCHO = 'c1000000-0000-4000-8000-000000000001';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:tu_password@localhost:5432/gestion_ganado',
});

let exitosas = 0;
let fallidas = 0;
let omitidas = 0;

async function prueba(nombre, cuerpo) {
  try {
    await cuerpo();
    console.log(`  [PASA]  ${nombre}`);
    exitosas++;
  } catch (error) {
    console.error(`  [FALLA] ${nombre}`);
    console.error(`          ${error.message}`);
    fallidas++;
  }
}

async function pedir(ruta, usuarioId, cuerpo) {
  const respuesta = await fetch(`${BASE}${ruta}`, {
    method: cuerpo === undefined ? 'GET' : 'POST',
    headers: { 'x-usuario-id': usuarioId, 'Content-Type': 'application/json', 'Accept-Language': 'es' },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  return { estado: respuesta.status, cuerpo: await respuesta.json().catch(() => null) };
}

const preguntar = (usuarioId, pregunta, extra = {}) => pedir('/asistente/preguntas', usuarioId, { pregunta, ...extra });

// ── Proveedor simulado ──────────────────────────────────────────────────────

/** Cada pedido que llega al simulado: { cuerpo, autorizacion }. */
let pedidos = [];

const FIRMA = 'firma-de-pensamiento-simulada';

function llamada(nombre, argumentos) {
  return {
    id: `llamada-${randomUUID()}`,
    type: 'function',
    function: { name: nombre, arguments: JSON.stringify(argumentos) },
    // Como Gemini 3: la firma va en la llamada y tiene que volver igual.
    extra_content: { google: { thought_signature: FIRMA } },
  };
}

function responderSimulado(cuerpo) {
  const mensajes = cuerpo.messages;
  const ultimo = mensajes[mensajes.length - 1];
  const primeraPregunta = [...mensajes].reverse().find((m) => m.role === 'user')?.content ?? '';
  const conTexto = (texto) => ({ estado: 200, json: { choices: [{ message: { role: 'assistant', content: texto } }] } });
  const conLlamadas = (...llamadas) => ({
    estado: 200,
    json: { choices: [{ message: { role: 'assistant', content: null, tool_calls: llamadas } }] },
  });

  if (primeraPregunta.includes('[limite]')) return { estado: 429, json: { error: { message: 'quota' } } };

  if (primeraPregunta.includes('[bucle]')) {
    // Pide herramientas sin parar; cuando el servidor corta con tool_choice none, contesta.
    if (cuerpo.tool_choice === 'none') return conTexto('Corte después de varias rondas.');
    return conLlamadas(llamada('resumen_rancho', {}));
  }

  if (ultimo.role === 'tool') {
    // Segunda vuelta: responde con lo que trajo la herramienta.
    const datos = JSON.parse(ultimo.content);
    return conTexto(`Listo: ${datos.error ? `error: ${datos.error}` : `total ${datos.total ?? '-'}`}`);
  }

  if (primeraPregunta.includes('[buscar]')) return conLlamadas(llamada('buscar_animales', { corral: 'potrero del rio' }));
  if (primeraPregunta.includes('[ficha')) {
    const identificador = primeraPregunta.match(/\[ficha (\w+)\]/)?.[1] ?? '0503';
    return conLlamadas(llamada('ficha_animal', { identificador }));
  }
  if (primeraPregunta.includes('[sanidad]')) return conLlamadas(llamada('calendario_sanitario', { estado: 'vencida' }));
  return conTexto('Hola, ¿en qué te ayudo?');
}

/** La API propia de Gemini: transcribir (con systemInstruction) o leer en voz alta. */
function responderGemini(cuerpo) {
  const audio = cuerpo.contents?.[0]?.parts?.[0]?.inlineData;
  if (audio) {
    // Silencio: todas las muestras en cero después de la cabecera WAV.
    const muestras = Buffer.from(audio.data, 'base64').subarray(44);
    const hayVoz = muestras.some((byte) => byte !== 0);
    const texto = JSON.stringify({ hay_voz: hayVoz, texto: hayVoz ? '¿Cuántos animales tengo?' : '' });
    return { estado: 200, json: { candidates: [{ content: { parts: [{ text: texto }] } }] } };
  }
  // Voz: como gemini-2.5-flash-preview-tts, PCM crudo (el servidor le pone la cabecera WAV).
  const pcm = Buffer.alloc(4800, 1).toString('base64');
  return {
    estado: 200,
    json: { candidates: [{ content: { parts: [{ inlineData: { mimeType: 'audio/L16;codec=pcm;rate=24000', data: pcm } }] } }] },
  };
}

function levantarSimulado() {
  const servidor = http.createServer((peticion, respuesta) => {
    let datos = '';
    peticion.on('data', (trozo) => (datos += trozo));
    peticion.on('end', () => {
      const cuerpo = JSON.parse(datos || '{}');
      pedidos.push({
        cuerpo,
        autorizacion: peticion.headers.authorization,
        claveGoogle: peticion.headers['x-goog-api-key'],
        ruta: peticion.url,
      });
      const { estado, json } = peticion.url.includes(':generateContent') ? responderGemini(cuerpo) : responderSimulado(cuerpo);
      respuesta.writeHead(estado, { 'Content-Type': 'application/json' });
      respuesta.end(JSON.stringify(json));
    });
  });
  return new Promise((resolver, rechazar) => {
    servidor.once('error', rechazar);
    servidor.listen(PUERTO_SIMULADO, () => resolver(servidor));
  });
}

const ofrecidas = (pedido) => (pedido.cuerpo.tools ?? []).map((h) => h.function.name).sort();
/** Un WAV mono de 16 kHz: con un tono o en silencio. */
function wav(segundos, conVoz) {
  const muestras = Math.round(16000 * segundos);
  const datos = Buffer.alloc(muestras * 2);
  if (conVoz) for (let i = 0; i < muestras; i++) datos.writeInt16LE(Math.round(8000 * Math.sin(i / 8)), i * 2);
  const cabecera = Buffer.alloc(44);
  cabecera.write('RIFF', 0);
  cabecera.writeUInt32LE(36 + datos.length, 4);
  cabecera.write('WAVEfmt ', 8);
  cabecera.writeUInt32LE(16, 16);
  cabecera.writeUInt16LE(1, 20);
  cabecera.writeUInt16LE(1, 22);
  cabecera.writeUInt32LE(16000, 24);
  cabecera.writeUInt32LE(32000, 28);
  cabecera.writeUInt16LE(2, 32);
  cabecera.writeUInt16LE(16, 34);
  cabecera.write('data', 36);
  cabecera.writeUInt32LE(datos.length, 40);
  return Buffer.concat([cabecera, datos]).toString('base64');
}

const resultadoDeHerramienta = (pedido) => {
  const mensaje = [...pedido.cuerpo.messages].reverse().find((m) => m.role === 'tool');
  return mensaje ? JSON.parse(mensaje.content) : null;
};

// ── Pruebas ─────────────────────────────────────────────────────────────────

async function ejecutarPruebas() {
  console.log('================================================================');
  console.log('  FASE 5: ASISTENTE CON IA (RF-38 A RF-42)');
  console.log('  Responsable: Aaron');
  console.log('================================================================\n');

  const simulado = await levantarSimulado();
  const consultasCreadas = [];
  // Al terminar se borra solo lo que esta prueba dejó, por fecha.
  const inicio = (await pool.query('SELECT CURRENT_TIMESTAMP AS ahora')).rows[0].ahora;

  try {
    console.log('Estado y validaciones');

    let estado;
    await prueba('GET /asistente devuelve la cuota y los módulos de quien pregunta', async () => {
      const r = await pedir('/asistente', PROPIETARIO_A);
      assert.strictEqual(r.estado, 200, JSON.stringify(r.cuerpo));
      estado = r.cuerpo;
      assert.strictEqual(typeof r.cuerpo.usadas, 'number');
      assert.ok(r.cuerpo.limite > 0);
      assert.deepStrictEqual(r.cuerpo.modulos, ['animales', 'corrales', 'sanidad', 'pesajes']);
      assert.ok(!JSON.stringify(r.cuerpo).includes(process.env.ASISTENTE_CLAVE || 'x-sin-clave-x'), 'no expone la clave');
    });

    await prueba('Un colaborador de almacén no tiene módulos para consultar', async () => {
      const r = await pedir('/asistente', ALMACEN_A);
      assert.strictEqual(r.estado, 200);
      assert.deepStrictEqual(r.cuerpo.modulos, []);
    });

    await prueba('Sin rancho: 404', async () => {
      assert.strictEqual((await pedir('/asistente', SIN_RANCHO)).estado, 404);
      assert.strictEqual((await preguntar(SIN_RANCHO, 'hola')).estado, 404);
    });

    await prueba('Pregunta vacía o demasiado larga: 400', async () => {
      assert.strictEqual((await preguntar(PROPIETARIO_A, '   ')).estado, 400);
      assert.strictEqual((await preguntar(PROPIETARIO_A, 'a'.repeat(501))).estado, 400);
    });

    await prueba('Historial mal formado: 400', async () => {
      assert.strictEqual((await preguntar(PROPIETARIO_A, 'hola', { historial: 'no' })).estado, 400);
      assert.strictEqual((await preguntar(PROPIETARIO_A, 'hola', { historial: [{ rol: 'sistema', texto: 'x' }] })).estado, 400);
    });

    if (!estado?.configurado || estado.proveedor !== `localhost:${PUERTO_SIMULADO}`) {
      console.log(
        `\n  [OMITE] Las pruebas con el modelo: el servidor apunta a «${estado?.proveedor || 'ningún proveedor'}».` +
          `\n          Arráncalo con ASISTENTE_URL=http://localhost:${PUERTO_SIMULADO}/v1 y ASISTENTE_CLAVE=prueba.`,
      );
      omitidas = 16;
      return;
    }

    console.log('\nRF-38 y RF-39: responde con herramientas, solo de lectura');

    await prueba('Una pregunta simple se responde y se guarda', async () => {
      pedidos = [];
      const r = await preguntar(PROPIETARIO_A, 'Hola, ¿qué puedes hacer?');
      assert.strictEqual(r.estado, 200, JSON.stringify(r.cuerpo));
      assert.strictEqual(r.cuerpo.respuesta, 'Hola, ¿en qué te ayudo?');
      assert.strictEqual(r.cuerpo.usadas, estado.usadas + 1);
      assert.strictEqual(pedidos[0].autorizacion, 'Bearer prueba');
      assert.ok(pedidos[0].ruta.endsWith('/chat/completions'));
      const sistema = pedidos[0].cuerpo.messages[0];
      assert.strictEqual(sistema.role, 'system');
      assert.ok(sistema.content.includes('Rancho El Cerrito'));
      const guardada = await pool.query(
        `SELECT id, rancho_id FROM consultas_asistente WHERE usuario_id = $1 ORDER BY creado_en DESC LIMIT 1`,
        [PROPIETARIO_A],
      );
      consultasCreadas.push(guardada.rows[0].id);
      assert.strictEqual(guardada.rows[0].rancho_id, RANCHO_A);
    });

    await prueba('Ninguna herramienta modifica datos (RF-39)', async () => {
      const nombres = ofrecidas(pedidos[0]);
      assert.deepStrictEqual(nombres, [
        'buscar_animales',
        'calendario_sanitario',
        'comparativa_peso',
        'corrales',
        'esquemas_y_productos',
        'ficha_animal',
        'resumen_rancho',
      ]);
      assert.ok(!nombres.some((n) => /registrar|crear|editar|borrar|baja|mover/.test(n)));
    });

    await prueba('Busca animales por nombre de corral, sin tildes, y devuelve la firma de Gemini intacta', async () => {
      pedidos = [];
      const r = await preguntar(PROPIETARIO_A, '[buscar] ¿Cuántos animales hay en el Potrero del Río?');
      assert.strictEqual(r.estado, 200, JSON.stringify(r.cuerpo));
      assert.strictEqual(pedidos.length, 2);
      const datos = resultadoDeHerramienta(pedidos[1]);
      assert.strictEqual(datos.total, 2);
      assert.ok(datos.animales.every((a) => a.corral === 'Potrero del Río'));
      assert.ok(!JSON.stringify(datos).includes('d1000000'), 'sin ids internos');
      const conLlamada = pedidos[1].cuerpo.messages.find((m) => m.role === 'assistant' && m.tool_calls);
      assert.strictEqual(conLlamada.content, null);
      assert.strictEqual(conLlamada.tool_calls[0].extra_content.google.thought_signature, FIRMA);
      assert.strictEqual(r.cuerpo.respuesta, 'Listo: total 2');
      assert.deepStrictEqual(r.cuerpo.herramientas, ['buscar_animales']);
    });

    await prueba('La ficha trae pesajes con ganancia diaria y aplicaciones', async () => {
      pedidos = [];
      const r = await preguntar(PROPIETARIO_A, '[ficha 0503] ¿Cómo viene el 0503?');
      assert.strictEqual(r.estado, 200, JSON.stringify(r.cuerpo));
      const datos = resultadoDeHerramienta(pedidos[1]);
      assert.strictEqual(datos.animal.identificador, '0503');
      assert.ok(datos.pesajes.length >= 2);
      assert.ok(datos.pesajes.slice(1).every((p) => typeof p.ganancia_kg_dia === 'number'));
      assert.ok(Array.isArray(datos.aplicaciones));
    });

    console.log('\nRF-40 y RF-41: permisos y aislamiento');

    await prueba('Al colaborador de almacén solo se le ofrece el resumen', async () => {
      pedidos = [];
      const r = await preguntar(ALMACEN_A, 'Hola');
      assert.strictEqual(r.estado, 200, JSON.stringify(r.cuerpo));
      assert.deepStrictEqual(ofrecidas(pedidos[0]), ['resumen_rancho']);
      const guardada = await pool.query(
        `SELECT id FROM consultas_asistente WHERE usuario_id = $1 ORDER BY creado_en DESC LIMIT 1`,
        [ALMACEN_A],
      );
      consultasCreadas.push(guardada.rows[0].id);
    });

    await prueba('Si el modelo pide una herramienta de un módulo que no ve, recibe un error y no datos', async () => {
      pedidos = [];
      const r = await preguntar(ALMACEN_A, '[sanidad] ¿Qué vacunas están vencidas?');
      assert.strictEqual(r.estado, 200, JSON.stringify(r.cuerpo));
      const datos = resultadoDeHerramienta(pedidos[1]);
      assert.ok(datos.error, JSON.stringify(datos));
      assert.ok(!('dosis' in datos));
    });

    await prueba('El propietario de otro rancho no llega al 0503 ni a los animales de El Cerrito', async () => {
      pedidos = [];
      let r = await preguntar(PROPIETARIO_B, '[ficha 0503] ¿Y el 0503?');
      assert.strictEqual(r.estado, 200, JSON.stringify(r.cuerpo));
      assert.ok(resultadoDeHerramienta(pedidos[1]).error);

      pedidos = [];
      r = await preguntar(PROPIETARIO_B, '[ficha 0501] ¿Y el 0501?');
      const datos = resultadoDeHerramienta(pedidos[1]);
      assert.strictEqual(datos.animal.nombre, 'Blanca', 'es el 0501 de La Floresta, no Lucera');
      assert.ok(pedidos[0].cuerpo.messages[0].content.includes('Hacienda La Floresta'));
    });

    console.log('\nVoz: preguntar hablando y escuchar la respuesta');

    await prueba('Con Gemini configurado la voz está disponible', async () => {
      assert.strictEqual(estado.voz, true);
    });

    await prueba('Un audio que no es WAV, o demasiado largo: 400', async () => {
      assert.strictEqual((await pedir('/asistente/transcripciones', PROPIETARIO_A, { audio: 'hola' })).estado, 400);
      assert.strictEqual((await pedir('/asistente/transcripciones', PROPIETARIO_A, {})).estado, 400);
      const largo = await pedir('/asistente/transcripciones', PROPIETARIO_A, { audio: wav(45, true) });
      assert.strictEqual(largo.estado, 400);
    });

    await prueba('Transcribe la pregunta hablada con el modelo del asistente y no cobra la consulta', async () => {
      const antes = (await pedir('/asistente', PROPIETARIO_A)).cuerpo.usadas;
      pedidos = [];
      const r = await pedir('/asistente/transcripciones', PROPIETARIO_A, { audio: wav(2, true) });
      assert.strictEqual(r.estado, 200, JSON.stringify(r.cuerpo));
      assert.strictEqual(r.cuerpo.texto, '¿Cuántos animales tengo?');
      assert.strictEqual(pedidos.length, 1);
      assert.ok(pedidos[0].ruta.startsWith('/v1beta/models/'), pedidos[0].ruta);
      assert.ok(pedidos[0].ruta.endsWith(':generateContent'));
      assert.strictEqual(pedidos[0].claveGoogle, 'prueba');
      assert.strictEqual(pedidos[0].cuerpo.contents[0].parts[0].inlineData.mimeType, 'audio/wav');
      assert.strictEqual(pedidos[0].cuerpo.generationConfig.responseMimeType, 'application/json');
      assert.strictEqual((await pedir('/asistente', PROPIETARIO_A)).cuerpo.usadas, antes);
    });

    await prueba('Si en el audio no habla nadie, devuelve texto vacío (no inventa una pregunta)', async () => {
      const r = await pedir('/asistente/transcripciones', PROPIETARIO_A, { audio: wav(2, false) });
      assert.strictEqual(r.estado, 200, JSON.stringify(r.cuerpo));
      assert.strictEqual(r.cuerpo.texto, '');
    });

    await prueba('Lee en voz alta una respuesta propia, en WAV y sin las marcas de lista', async () => {
      const id = randomUUID();
      consultasCreadas.push(id);
      await pool.query(
        `INSERT INTO consultas_asistente (id, rancho_id, usuario_id, pregunta, respuesta)
         VALUES ($1, $2, $3, 'prueba de voz', $4)`,
        [id, RANCHO_A, PROPIETARIO_A, 'Tienes **2** vacas:\n- 0501\n- 0502'],
      );
      pedidos = [];
      const r = await pedir(`/asistente/consultas/${id}/voz`, PROPIETARIO_A);
      assert.strictEqual(r.estado, 200, JSON.stringify(r.cuerpo));
      assert.strictEqual(r.cuerpo.tipo, 'audio/wav');
      const audio = Buffer.from(r.cuerpo.audio, 'base64');
      assert.strictEqual(audio.subarray(0, 4).toString(), 'RIFF');
      assert.strictEqual(audio.readUInt32LE(24), 24000, 'frecuencia tomada del tipo que mandó Gemini');
      assert.strictEqual(audio.length, 44 + 4800);
      const leido = pedidos[0].cuerpo.contents[0].parts[0].text;
      assert.strictEqual(leido, 'Tienes 2 vacas:\n0501.\n0502.');
      assert.deepStrictEqual(pedidos[0].cuerpo.generationConfig.responseModalities, ['AUDIO']);

      // RF-41: la respuesta de otro usuario no se lee, aunque se sepa el id.
      assert.strictEqual((await pedir(`/asistente/consultas/${id}/voz`, SOCIO_A)).estado, 404);
      assert.strictEqual((await pedir(`/asistente/consultas/${id}/voz`, PROPIETARIO_B)).estado, 404);
      assert.strictEqual((await pedir('/asistente/consultas/no-es-un-id/voz', PROPIETARIO_A)).estado, 404);
    });

    await prueba('La respuesta de una pregunta trae el id con el que se pide su voz', async () => {
      const r = await preguntar(PROPIETARIO_A, 'Hola otra vez');
      assert.strictEqual(r.estado, 200, JSON.stringify(r.cuerpo));
      consultasCreadas.push(r.cuerpo.id);
      const guardada = await pool.query('SELECT usuario_id FROM consultas_asistente WHERE id = $1', [r.cuerpo.id]);
      assert.strictEqual(guardada.rows[0].usuario_id, PROPIETARIO_A);
    });

    console.log('\nLímites');

    await prueba('Corta las rondas de herramientas y obliga a contestar con texto', async () => {
      pedidos = [];
      const r = await preguntar(SOCIO_A, '[bucle] Dame un resumen');
      assert.strictEqual(r.estado, 200, JSON.stringify(r.cuerpo));
      assert.strictEqual(pedidos.length, 5);
      assert.strictEqual(pedidos[4].cuerpo.tool_choice, 'none');
      assert.strictEqual(r.cuerpo.respuesta, 'Corte después de varias rondas.');
    });

    await prueba('Si el proveedor llegó a su límite, 503 con un mensaje claro y no se cobra la consulta', async () => {
      const antes = (await pedir('/asistente', SOCIO_A)).cuerpo.usadas;
      const r = await preguntar(SOCIO_A, '[limite] hola');
      assert.strictEqual(r.estado, 503);
      assert.strictEqual(r.cuerpo.motivo, 'limite');
      assert.ok(r.cuerpo.message);
      assert.strictEqual((await pedir('/asistente', SOCIO_A)).cuerpo.usadas, antes);
    });

    await prueba('RF-42: con la cuota del mes agotada, 429 y no se llama al modelo', async () => {
      const { usadas, limite } = (await pedir('/asistente', SOCIO_A)).cuerpo;
      for (let i = usadas; i < limite; i++) {
        const id = randomUUID();
        consultasCreadas.push(id);
        await pool.query(
          `INSERT INTO consultas_asistente (id, rancho_id, usuario_id, pregunta, respuesta) VALUES ($1, $2, $3, 'relleno', 'relleno')`,
          [id, RANCHO_A, SOCIO_A],
        );
      }
      pedidos = [];
      const r = await preguntar(SOCIO_A, 'Hola');
      assert.strictEqual(r.estado, 429);
      assert.strictEqual(r.cuerpo.motivo, 'cuota');
      const hablada = await pedir('/asistente/transcripciones', SOCIO_A, { audio: wav(1, true) });
      assert.strictEqual(hablada.estado, 429, 'tampoco transcribe');
      assert.strictEqual(pedidos.length, 0);
    });
  } finally {
    await pool.query(
      `DELETE FROM consultas_asistente
        WHERE id = ANY($1::uuid[]) OR (usuario_id = ANY($2::uuid[]) AND creado_en >= $3)`,
      [consultasCreadas, [PROPIETARIO_A, SOCIO_A, ALMACEN_A, PROPIETARIO_B], inicio],
    );
    simulado.close();
  }

  console.log('\n----------------------------------------------------------------');
  console.log(`  Ejecutadas: ${exitosas + fallidas}   Pasan: ${exitosas}   Fallan: ${fallidas}   Omitidas: ${omitidas}`);
  console.log('----------------------------------------------------------------');

  await pool.end();

  if (fallidas > 0) {
    console.error('\nEl asistente no cumple sus criterios de aceptacion.');
    process.exitCode = 1;
  } else {
    console.log('\nEl asistente cumple sus criterios de aceptacion.');
  }
}

if (require.main === module) {
  ejecutarPruebas().catch((error) => {
    console.error('\nNo se pudieron correr las pruebas:', error.message);
    console.error('Revisa que la base y el servidor esten levantados y con las semillas cargadas.');
    process.exitCode = 1;
    void pool.end();
  });
}

module.exports = { ejecutarPruebas };
