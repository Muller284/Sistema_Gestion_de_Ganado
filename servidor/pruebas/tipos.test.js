/**
 * ============================================================================
 * SISTEMA DE GESTION DE GANADO
 * Pruebas de HU-20 (Tipos de colaborador)
 * ============================================================================
 *
 * Contra el PostgreSQL de verdad y contra el servidor levantado.
 *
 * Criterios cubiertos:
 *   1. Existen cuatro tipos predefinidos: veterinario, encargado de campo,
 *      encargado de almacén y administrativo.
 *   2. Puedo crear tipos propios eligiendo los módulos, en cualquier plan.
 *   3. Cambiar los permisos de un tipo afecta a todos los colaboradores de
 *      ese tipo.
 *
 * Ademas: que el ajuste de un rancho no toque a los demas (HU-03).
 *
 * Lo que crea, lo borra al terminar: no hace falta volver a sembrar.
 * ============================================================================
 */

require('../cargar-entorno').cargarEntorno();
const assert = require('assert');
const { randomUUID } = require('crypto');
const { Pool } = require('pg');

const BASE = process.env.URL_SERVIDOR || 'http://localhost:3000';

// Cuentas de las semillas
const PROPIETARIO_A = 'a1000000-0000-4000-8000-000000000001'; // Carlos
const SOCIO_A = 'a1000000-0000-4000-8000-000000000002'; // Maria Rene
const COLABORADOR_A = 'a1000000-0000-4000-8000-000000000003'; // Dr. Jorge, veterinario
const PROPIETARIO_B = 'b1000000-0000-4000-8000-000000000001'; // Fernando
const RANCHO_A = 'a0000000-0000-4000-8000-000000000001';
const RANCHO_B = 'b0000000-0000-4000-8000-000000000002';

const VETERINARIO = '11111111-1111-4111-8111-000000000001';
const ENCARGADO_CAMPO = '11111111-1111-4111-8111-000000000002';

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgres://postgres:tu_password@localhost:5432/gestion_ganado',
});

let exitosas = 0;
let fallidas = 0;
const usuariosCreados = [];
const tiposCreados = [];

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

async function pedir(ruta, opciones = {}, usuarioId = PROPIETARIO_A) {
  const respuesta = await fetch(`${BASE}${ruta}`, {
    ...opciones,
    headers: {
      'Content-Type': 'application/json',
      ...(usuarioId ? { 'x-usuario-id': usuarioId } : {}),
      ...(opciones.headers ?? {}),
    },
  });
  const cuerpo = await respuesta.json().catch(() => null);
  return { estado: respuesta.status, cuerpo };
}

const enviar = (metodo, ruta, datos, usuarioId) =>
  pedir(ruta, { method: metodo, body: datos ? JSON.stringify(datos) : undefined }, usuarioId);

function correoNuevo(nombre) {
  return `${nombre}.${Date.now()}.${Math.floor(Math.random() * 1000)}@prueba.bo`;
}

/** Lo que la vista dice que puede una persona por su tipo: { modulo: 'ver' | 'editar' }. */
async function permisosDe(usuarioId) {
  const filas = await pool.query(
    `SELECT v.modulo_codigo, v.puede_ver, v.puede_editar
       FROM usuarios u
       JOIN permisos_tipo_vigentes v
         ON v.rancho_id = u.rancho_id AND v.tipo_colaborador_id = u.tipo_colaborador_id
      WHERE u.id = $1`,
    [usuarioId],
  );
  const permisos = {};
  for (const fila of filas.rows) {
    if (fila.puede_editar) permisos[fila.modulo_codigo] = 'editar';
    else if (fila.puede_ver) permisos[fila.modulo_codigo] = 'ver';
  }
  return permisos;
}

async function colaborador(nombre, tipoId) {
  const id = randomUUID();
  const { estado, cuerpo } = await enviar('POST', '/equipo', {
    id,
    nombre,
    correo: correoNuevo(nombre.split(' ')[0].toLowerCase()),
    rol: 'colaborador',
    tipo_colaborador_id: tipoId,
  });
  assert.strictEqual(estado, 201, JSON.stringify(cuerpo));
  usuariosCreados.push(id);
  return id;
}

async function tipoDe(ranchoUsuario, tipoId) {
  const { cuerpo } = await pedir('/equipo/tipos', {}, ranchoUsuario);
  return cuerpo.find((t) => t.id === tipoId);
}

async function ejecutarPruebas() {
  console.log('================================================================');
  console.log('  HU-20 TIPOS DE COLABORADOR');
  console.log('================================================================\n');

  // ------------------------------------------------------------------------
  console.log('  Criterio 1 · Los cuatro predefinidos');

  await prueba('Cada rancho ve los cuatro tipos predefinidos', async () => {
    for (const propietario of [PROPIETARIO_A, PROPIETARIO_B]) {
      const { estado, cuerpo } = await pedir('/equipo/tipos', {}, propietario);
      assert.strictEqual(estado, 200, JSON.stringify(cuerpo));
      const nombres = cuerpo.filter((t) => t.es_predefinido).map((t) => t.nombre).sort();
      assert.deepStrictEqual(nombres, [
        'Administrativo',
        'Encargado de almacen',
        'Encargado de campo',
        'Veterinario',
      ]);
    }
  });

  await prueba('Cada tipo trae los ocho modulos con su nivel', async () => {
    const veterinario = await tipoDe(PROPIETARIO_A, VETERINARIO);
    assert.strictEqual(veterinario.permisos.length, 8);
    const nivel = Object.fromEntries(veterinario.permisos.map((p) => [p.modulo, p.nivel]));
    assert.strictEqual(nivel.sanidad, 'editar');
    assert.strictEqual(nivel.animales, 'ver');
    assert.strictEqual(nivel.almacen, 'ninguno');
    assert.strictEqual(veterinario.ajustado, false);
  });

  await prueba('El socio ve los tipos; el colaborador no', async () => {
    assert.strictEqual((await pedir('/equipo/tipos', {}, SOCIO_A)).estado, 200);
    assert.strictEqual((await pedir('/equipo/tipos', {}, COLABORADOR_A)).estado, 403);
  });

  // ------------------------------------------------------------------------
  console.log('\n  Criterio 2 · Tipos propios eligiendo los módulos');

  const tipoPropio = randomUUID();

  await prueba('El propietario crea un tipo propio con los modulos que elige', async () => {
    const { estado, cuerpo } = await enviar('POST', '/equipo/tipos', {
      id: tipoPropio,
      nombre: 'Ordeñador',
      permisos: { animales: 'editar', pesajes: 'ver' },
    });
    assert.strictEqual(estado, 201, JSON.stringify(cuerpo));
    tiposCreados.push(tipoPropio);
    assert.strictEqual(cuerpo.tipo.nombre, 'Ordeñador');
    assert.strictEqual(cuerpo.tipo.es_predefinido, false);
    const nivel = Object.fromEntries(cuerpo.tipo.permisos.map((p) => [p.modulo, p.nivel]));
    assert.deepStrictEqual(
      [nivel.animales, nivel.pesajes, nivel.corrales],
      ['editar', 'ver', 'ninguno'],
    );
  });

  await prueba('Se guarda una fila por modulo, en su rancho', async () => {
    const filas = await pool.query(
      `SELECT rancho_id FROM permisos_tipo
        WHERE tipo_colaborador_id = $1 AND eliminado_en IS NULL`,
      [tipoPropio],
    );
    assert.strictEqual(filas.rowCount, 8);
    assert.ok(filas.rows.every((f) => f.rancho_id === RANCHO_A));
  });

  await prueba('El tipo propio no lo ve otro rancho', async () => {
    assert.strictEqual(await tipoDe(PROPIETARIO_B, tipoPropio), undefined);
  });

  await prueba('Un tipo propio se puede asignar al dar de alta', async () => {
    await colaborador('Rosa Ordeñadora', tipoPropio);
  });

  await prueba('No se repite el nombre de un tipo, ni de un predefinido', async () => {
    for (const nombre of ['ordeñador', 'VETERINARIO']) {
      const { estado } = await enviar('POST', '/equipo/tipos', {
        nombre,
        permisos: { animales: 'ver' },
      });
      assert.strictEqual(estado, 409, `«${nombre}» se acepto`);
    }
  });

  await prueba('Otro rancho puede usar el mismo nombre', async () => {
    const id = randomUUID();
    const { estado, cuerpo } = await enviar(
      'POST',
      '/equipo/tipos',
      { id, nombre: 'Ordeñador', permisos: { animales: 'ver' } },
      PROPIETARIO_B,
    );
    assert.strictEqual(estado, 201, JSON.stringify(cuerpo));
    tiposCreados.push(id);
  });

  await prueba('Un tipo sin ningun modulo, o con datos que no existen, se rechaza', async () => {
    const casos = [
      { nombre: 'Sin nada', permisos: {} },
      { nombre: 'Sin nada', permisos: { animales: 'ninguno' } },
      { nombre: 'Raro', permisos: { cocina: 'ver' } },
      { nombre: 'Raro', permisos: { animales: 'borrar' } },
      { nombre: '', permisos: { animales: 'ver' } },
      { nombre: 'Sin permisos' },
    ];
    for (const caso of casos) {
      const { estado } = await enviar('POST', '/equipo/tipos', caso);
      assert.strictEqual(estado, 400, JSON.stringify(caso));
    }
  });

  await prueba('Solo el propietario crea tipos', async () => {
    const { estado } = await enviar(
      'POST',
      '/equipo/tipos',
      { nombre: 'Del socio', permisos: { animales: 'ver' } },
      SOCIO_A,
    );
    assert.strictEqual(estado, 403);
  });

  // ------------------------------------------------------------------------
  console.log('\n  Criterio 3 · Cambiar un tipo cambia a todos los que lo tienen');

  await prueba('Cambiar un tipo propio alcanza a todos sus colaboradores', async () => {
    const segunda = await colaborador('Juana Ordeñadora', tipoPropio);
    const primera = usuariosCreados[0];

    const { estado, cuerpo } = await enviar('PUT', `/equipo/tipos/${tipoPropio}`, {
      nombre: 'Ordeñador de turno',
      permisos: { animales: 'ver', corrales: 'editar' },
    });
    assert.strictEqual(estado, 200, JSON.stringify(cuerpo));
    assert.strictEqual(cuerpo.afectados, 2);
    assert.match(cuerpo.mensaje, /2 colaboradores/);

    for (const id of [primera, segunda]) {
      assert.deepStrictEqual(await permisosDe(id), { animales: 'ver', corrales: 'editar' });
    }
  });

  await prueba('Lo anterior queda dado de baja, no borrado', async () => {
    const filas = await pool.query(
      `SELECT COUNT(*) FILTER (WHERE eliminado_en IS NULL)::int AS vigentes,
              COUNT(*) FILTER (WHERE eliminado_en IS NOT NULL)::int AS de_baja
         FROM permisos_tipo WHERE tipo_colaborador_id = $1`,
      [tipoPropio],
    );
    assert.deepStrictEqual(filas.rows[0], { vigentes: 8, de_baja: 8 });
  });

  await prueba('Ajustar un predefinido cambia a sus colaboradores del rancho', async () => {
    const antes = await permisosDe(COLABORADOR_A);
    assert.strictEqual(antes.sanidad, 'editar');

    const { estado, cuerpo } = await enviar('PUT', `/equipo/tipos/${VETERINARIO}`, {
      permisos: { animales: 'editar', sanidad: 'editar', pesajes: 'editar', corrales: 'ver' },
    });
    assert.strictEqual(estado, 200, JSON.stringify(cuerpo));
    assert.ok(cuerpo.afectados >= 1);
    assert.strictEqual(cuerpo.tipo.ajustado, true);

    const despues = await permisosDe(COLABORADOR_A);
    assert.deepStrictEqual(despues, {
      animales: 'editar',
      corrales: 'ver',
      sanidad: 'editar',
      pesajes: 'editar',
    });
  });

  await prueba('El ajuste de un rancho no toca al veterinario de otro rancho', async () => {
    const deB = await tipoDe(PROPIETARIO_B, VETERINARIO);
    assert.strictEqual(deB.ajustado, false);
    const nivel = Object.fromEntries(deB.permisos.map((p) => [p.modulo, p.nivel]));
    assert.strictEqual(nivel.animales, 'ver');
    assert.strictEqual(nivel.corrales, 'ninguno');

    const porDefecto = await pool.query(
      `SELECT COUNT(*)::int AS filas FROM permisos_tipo
        WHERE tipo_colaborador_id = $1 AND rancho_id IS NULL AND eliminado_en IS NULL`,
      [VETERINARIO],
    );
    assert.strictEqual(porDefecto.rows[0].filas, 3, 'Se tocaron los permisos de fabrica');
  });

  await prueba('Restablecer devuelve el predefinido a los permisos de fabrica', async () => {
    const { estado, cuerpo } = await enviar('POST', `/equipo/tipos/${VETERINARIO}/restablecer`);
    assert.strictEqual(estado, 201, JSON.stringify(cuerpo));
    assert.strictEqual(cuerpo.tipo.ajustado, false);
    assert.deepStrictEqual(await permisosDe(COLABORADOR_A), {
      animales: 'ver',
      sanidad: 'editar',
      pesajes: 'editar',
    });
  });

  await prueba('Un predefinido no cambia de nombre', async () => {
    const { estado } = await enviar('PUT', `/equipo/tipos/${VETERINARIO}`, {
      nombre: 'Doctor',
      permisos: { sanidad: 'editar' },
    });
    assert.strictEqual(estado, 400);
  });

  await prueba('Un propietario no puede tocar el tipo propio de otro rancho', async () => {
    const { estado } = await enviar(
      'PUT',
      `/equipo/tipos/${tipoPropio}`,
      { permisos: { animales: 'editar' } },
      PROPIETARIO_B,
    );
    assert.strictEqual(estado, 404);
  });

  await prueba('El socio no puede cambiar permisos', async () => {
    const { estado } = await enviar(
      'PUT',
      `/equipo/tipos/${VETERINARIO}`,
      { permisos: { animales: 'editar' } },
      SOCIO_A,
    );
    assert.strictEqual(estado, 403);
  });

  // ------------------------------------------------------------------------
  console.log('\n  Asignar y eliminar');

  await prueba('Un tipo que alguien usa no se elimina', async () => {
    const { estado, cuerpo } = await enviar('DELETE', `/equipo/tipos/${tipoPropio}`);
    assert.strictEqual(estado, 409);
    assert.match(cuerpo.message, /2 colaboradores/);
  });

  await prueba('Se le cambia el tipo a un colaborador', async () => {
    for (const id of usuariosCreados) {
      const { estado, cuerpo } = await enviar('PATCH', `/equipo/${id}/tipo`, {
        tipo_colaborador_id: ENCARGADO_CAMPO,
      });
      assert.strictEqual(estado, 200, JSON.stringify(cuerpo));
      assert.strictEqual(cuerpo.tipo_colaborador, 'Encargado de campo');
    }
    assert.strictEqual((await permisosDe(usuariosCreados[0])).corrales, 'editar');
  });

  await prueba('No se le asigna tipo a un socio ni un tipo de otro rancho', async () => {
    const aSocio = await enviar('PATCH', `/equipo/${SOCIO_A}/tipo`, {
      tipo_colaborador_id: VETERINARIO,
    });
    assert.strictEqual(aSocio.estado, 400);
    const ajeno = await enviar('PATCH', `/equipo/${usuariosCreados[0]}/tipo`, {
      tipo_colaborador_id: tiposCreados[1],
    });
    assert.strictEqual(ajeno.estado, 400);
  });

  await prueba('Sin colaboradores, el tipo propio se elimina (baja logica)', async () => {
    const { estado, cuerpo } = await enviar('DELETE', `/equipo/tipos/${tipoPropio}`);
    assert.strictEqual(estado, 200, JSON.stringify(cuerpo));
    const fila = await pool.query('SELECT eliminado_en FROM tipos_colaborador WHERE id = $1', [
      tipoPropio,
    ]);
    assert.ok(fila.rows[0].eliminado_en, 'Se borro de verdad o no se dio de baja');
    assert.strictEqual(await tipoDe(PROPIETARIO_A, tipoPropio), undefined);
  });

  await prueba('Los predefinidos no se eliminan', async () => {
    const { estado } = await enviar('DELETE', `/equipo/tipos/${VETERINARIO}`);
    assert.strictEqual(estado, 400);
  });

  // ------------------------------------------------------------------------
  await pool.query('DELETE FROM sesiones WHERE usuario_id = ANY($1::uuid[])', [usuariosCreados]);
  await pool.query('DELETE FROM tokens WHERE usuario_id = ANY($1::uuid[])', [usuariosCreados]);
  await pool.query('DELETE FROM usuarios WHERE id = ANY($1::uuid[])', [usuariosCreados]);
  await pool.query(
    `DELETE FROM permisos_tipo
      WHERE tipo_colaborador_id = ANY($1::uuid[])
         OR (rancho_id IN ($2, $3) AND tipo_colaborador_id = $4)`,
    [tiposCreados, RANCHO_A, RANCHO_B, VETERINARIO],
  );
  await pool.query('DELETE FROM tipos_colaborador WHERE id = ANY($1::uuid[])', [tiposCreados]);

  console.log('\n----------------------------------------------------------------');
  console.log(`  Ejecutadas: ${exitosas + fallidas}   Pasan: ${exitosas}   Fallan: ${fallidas}`);
  console.log('----------------------------------------------------------------');

  await pool.end();

  if (fallidas > 0) {
    console.error('\nHU-20 no se aprueba.');
    process.exitCode = 1;
  } else {
    console.log('\nHU-20 cumple sus criterios.');
  }
}

if (require.main === module) {
  ejecutarPruebas().catch((error) => {
    console.error('\nNo se pudieron correr las pruebas:', error.message);
    console.error('Revisa que el servidor este corriendo en', BASE);
    process.exitCode = 1;
    void pool.end();
  });
}

module.exports = { ejecutarPruebas };
