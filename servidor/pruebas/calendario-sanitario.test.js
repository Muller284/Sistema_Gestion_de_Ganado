/**
 * ============================================================================
 * SISTEMA DE GESTION DE GANADO
 * Pruebas de HU-50 (Calendario sanitario en lista) y HU-51 (Avisos de vencimientos)
 * Responsable: Aaron | Sprint 4
 * ============================================================================
 *
 * Contra el PostgreSQL de verdad y contra el servidor levantado.
 *
 * HU-50  1. Lista que dosis le toca a cada animal y cuando, segun los esquemas
 *           vigentes (HU-47) y las aplicaciones registradas.
 *        2. Cada dosis dice si esta vencida, proxima (en los proximos 7 dias)
 *           o programada.
 *        3. Se filtra por fechas, producto, corral y estado, y se pagina.
 *        4. Responde rapido con un rodeo grande (2000 animales en menos de 2 s).
 * HU-51  1. Los avisos cuentan las dosis vencidas y las proximas.
 *        2. Los ve quien tiene acceso a sanidad.
 *
 * Las fechas se arman alrededor de "hoy" en la zona horaria del rancho, asi la
 * prueba da lo mismo cualquier dia que se corra. Todo lo que crea usa un
 * producto propio, y se filtra por ese producto para no depender de las
 * semillas. Lo que crea, lo borra al terminar.
 * ============================================================================
 */

require('../cargar-entorno').cargarEntorno();
const assert = require('assert');
const { randomUUID } = require('crypto');
const { Pool } = require('pg');

const BASE = process.env.URL_SERVIDOR || 'http://localhost:3000';

const RANCHO_A = 'a0000000-0000-4000-8000-000000000001';
const PROPIETARIO_A = 'a1000000-0000-4000-8000-000000000001';
const SOCIO_A = 'a1000000-0000-4000-8000-000000000002';
const VETERINARIO_A = 'a1000000-0000-4000-8000-000000000003';
const ALMACEN_A = 'a1000000-0000-4000-8000-000000000005';
const PROPIETARIO_B = 'b1000000-0000-4000-8000-000000000001';

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgres://postgres:tu_password@localhost:5432/gestion_ganado',
});

let exitosas = 0;
let fallidas = 0;
const MARCA = randomUUID().slice(0, 8);
const PRODUCTO = randomUUID();
const CORRAL = randomUUID();
const animalesCreados = [];
const esquemasCreados = [];

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

async function pedir(metodo, ruta, cuerpo, usuarioId = PROPIETARIO_A) {
  const respuesta = await fetch(`${BASE}${ruta}`, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', 'x-usuario-id': usuarioId },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  return { estado: respuesta.status, cuerpo: await respuesta.json().catch(() => null) };
}

/** Fecha AAAA-MM-DD calculada en la base, con la misma cuenta que el servidor. */
async function fecha(sql, valores) {
  return (await pool.query(`SELECT (${sql})::date::text AS f`, valores)).rows[0].f;
}

async function animal({ identificador, sexo, categoria, nacimiento, corral = null, estado = 'activo' }) {
  const id = randomUUID();
  animalesCreados.push(id);
  await pool.query(
    `INSERT INTO animales (id, rancho_id, identificador, tipo_identificador, sexo, categoria_codigo,
                           fecha_nacimiento, origen, estado, corral_id, creado_por, modificado_por)
     VALUES ($1, $2, $3, 'caravana', $4, $5, $6, 'nacido', $7, $8, $9, $9)`,
    [id, RANCHO_A, `${identificador}-${MARCA}`, sexo, categoria, nacimiento, estado, corral, PROPIETARIO_A],
  );
  return id;
}

async function esquema(cambios, desde = '2020-01-01') {
  const { estado, cuerpo } = await pedir(
    'POST',
    '/sanidad/esquemas',
    {
      producto_id: PRODUCTO,
      categorias: null,
      sexo: null,
      edad_minima_meses: 0,
      edad_maxima_meses: null,
      dosis: 1,
      intervalo_dias: null,
      refuerzo_dias: null,
      ...cambios,
      nombre: `${cambios.nombre} ${MARCA}`,
    },
    VETERINARIO_A,
  );
  assert.strictEqual(estado, 201, JSON.stringify(cuerpo));
  esquemasCreados.push(cuerpo.esquema.id);
  // Como si el esquema existiera desde antes: asi se reclaman las dosis atrasadas.
  if (desde) await pool.query('UPDATE esquemas_vacunacion SET creado_en = $2 WHERE id = $1', [cuerpo.esquema.id, desde]);
  return cuerpo.esquema.id;
}

async function aplicar(animalId, esquemaId, numero, dia) {
  await pool.query(
    `INSERT INTO aplicaciones_sanitarias (id, rancho_id, animal_id, producto_id, esquema_id, numero_dosis, fecha, aplicado_por)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [randomUUID(), RANCHO_A, animalId, PRODUCTO, esquemaId, numero, dia, VETERINARIO_A],
  );
}

async function calendario(consulta = '', usuario = PROPIETARIO_A) {
  const pagina = consulta.includes('porPagina=') ? '' : '&porPagina=200';
  return pedir('GET', `/sanidad/calendario?producto=${PRODUCTO}${pagina}${consulta}`, undefined, usuario);
}

async function ejecutarPruebas() {
  console.log('================================================================');
  console.log('  HU-50 Y HU-51: CALENDARIO SANITARIO Y AVISOS');
  console.log('  Responsable: Aaron | Sprint 4');
  console.log('================================================================\n');

  try {
    // ------------------------------------------------------------------ datos
    const hoy = await fecha(
      `SELECT (CURRENT_TIMESTAMP AT TIME ZONE p.zona_horaria)::date
         FROM ranchos r JOIN paises p ON p.codigo = r.pais_codigo WHERE r.id = $1`,
      [RANCHO_A],
    );
    const dias = (n) => fecha('$1::date + $2::int', [hoy, n]);
    const mesesAtras = (n) => fecha('$1::date - make_interval(months => $2)', [hoy, n]);
    const masMeses = (base, n) => fecha('$1::date + make_interval(months => $2)', [base, n]);

    await pool.query(
      `INSERT INTO productos_sanitarios (id, rancho_id, nombre, clave, tipo)
       VALUES ($1, $2, $3, $4, 'vacuna')`,
      [PRODUCTO, RANCHO_A, `Producto ${MARCA}`, `producto ${MARCA}`],
    );
    await pool.query('INSERT INTO corrales (id, rancho_id, nombre) VALUES ($1, $2, $3)', [CORRAL, RANCHO_A, `Corral ${MARCA}`]);

    const nacioHaceUnMes = await mesesAtras(1);
    const nacioHaceSeisMeses = await mesesAtras(6);
    const chica = await animal({ identificador: 'X1', sexo: 'hembra', categoria: 'ternera', nacimiento: nacioHaceUnMes });
    const atrasado = await animal({ identificador: 'X2', sexo: 'macho', categoria: 'ternero', nacimiento: nacioHaceSeisMeses });
    const enSerie = await animal({ identificador: 'X3', sexo: 'hembra', categoria: 'vaquilla', nacimiento: await mesesAtras(12), corral: CORRAL });
    const adulta = await animal({ identificador: 'X4', sexo: 'hembra', categoria: 'vaca', nacimiento: '2020-02-10' });
    const grande = await animal({ identificador: 'X5', sexo: 'hembra', categoria: 'ternera', nacimiento: await mesesAtras(10) });
    const vendida = await animal({ identificador: 'X6', sexo: 'hembra', categoria: 'vaca', nacimiento: '2019-05-01', estado: 'vendido' });
    const buey = await animal({ identificador: 'X7', sexo: 'macho', categoria: 'buey', nacimiento: '2018-01-01' });
    const novillo = await animal({ identificador: 'X8', sexo: 'macho', categoria: 'novillo', nacimiento: '2023-03-01' });

    // Serie de tres dosis cada 21 dias desde los 2 meses, y refuerzo anual.
    const serie = await esquema({ nombre: 'Serie', edad_minima_meses: 2, dosis: 3, intervalo_dias: 21, refuerzo_dias: 365, categorias: ['ternero', 'ternera', 'vaquilla', 'vaca'] });
    await aplicar(enSerie, serie, 1, await dias(-15));
    for (const [n, d] of [[1, -442], [2, -421], [3, -400]]) await aplicar(adulta, serie, n, await dias(d));
    // Terneras de 3 a 8 meses, una dosis.
    const terneras = await esquema({ nombre: 'Terneras', categorias: ['ternera'], sexo: 'hembra', edad_minima_meses: 3, edad_maxima_meses: 8 });
    // Recien creado: no reclama dosis de antes de que existiera.
    const nuevo = await esquema({ nombre: 'Nuevo', categorias: ['buey'] }, null);
    // Una dosis sin refuerzo, ya aplicada: completo.
    const completo = await esquema({ nombre: 'Completo', categorias: ['novillo'] });
    await aplicar(novillo, completo, 1, await dias(-30));

    const fila = (dosis, animalId, esquemaId) => dosis.find((d) => d.animal_id === animalId && d.esquema_id === esquemaId);

    // ------------------------------------------------------------- HU-50
    console.log('  HU-50 · Calendario sanitario');

    let todas;
    await prueba('Criterio 1: la primera dosis vence al cumplir la edad minima', async () => {
      const { estado, cuerpo } = await calendario();
      assert.strictEqual(estado, 200, JSON.stringify(cuerpo));
      todas = cuerpo.dosis;

      const futura = fila(todas, chica, serie);
      assert.ok(futura, 'falta la primera dosis de la ternera de un mes');
      assert.strictEqual(futura.vence, await masMeses(nacioHaceUnMes, 2));
      assert.strictEqual(futura.numero_dosis, 1);
      assert.strictEqual(futura.dosis_total, 3);
      assert.strictEqual(futura.estado, 'programada');

      const vieja = fila(todas, atrasado, serie);
      assert.strictEqual(vieja.vence, await masMeses(nacioHaceSeisMeses, 2));
      assert.strictEqual(vieja.estado, 'vencida');
      assert.ok(vieja.dias < 0, 'una vencida tiene dias negativos');
    });

    await prueba('Criterio 1: la siguiente dosis de la serie vence intervalo_dias despues de la ultima', async () => {
      const segunda = fila(todas, enSerie, serie);
      assert.strictEqual(segunda.numero_dosis, 2);
      assert.strictEqual(segunda.vence, await dias(6));
      assert.strictEqual(segunda.dias, 6);
      assert.strictEqual(segunda.estado, 'proxima');
      assert.strictEqual(segunda.corral_nombre, `Corral ${MARCA}`);
    });

    await prueba('Criterio 1: con la serie completa toca el refuerzo, refuerzo_dias despues de la ultima', async () => {
      const refuerzo = fila(todas, adulta, serie);
      assert.strictEqual(refuerzo.numero_dosis, null, 'un refuerzo no tiene numero de dosis');
      assert.strictEqual(refuerzo.vence, await dias(-35));
      assert.strictEqual(refuerzo.estado, 'vencida');
    });

    await prueba('Criterio 1: respeta categoria, sexo y edad maxima', async () => {
      assert.ok(fila(todas, chica, terneras), 'a la ternera de un mes le toca');
      assert.strictEqual(fila(todas, chica, terneras).vence, await masMeses(nacioHaceUnMes, 3));
      assert.ok(!fila(todas, grande, terneras), 'la ternera de 10 meses ya paso la edad maxima sin empezar');
      assert.ok(!fila(todas, atrasado, terneras), 'un macho no entra en un esquema de hembras');
      assert.ok(!todas.some((d) => d.animal_id === buey && d.esquema_id === serie), 'un buey no esta en las categorias de la serie');
    });

    await prueba('Criterio 1: un esquema nuevo no reclama dosis de antes de existir', async () => {
      const deHoy = fila(todas, buey, nuevo);
      assert.ok(deHoy, 'falta la dosis del esquema nuevo');
      assert.ok(deHoy.vence >= hoy, `reclamo una dosis del ${deHoy.vence}`);
      assert.strictEqual(deHoy.estado, 'proxima');
    });

    await prueba('Criterio 1: un esquema completo sin refuerzo y un animal vendido no aparecen', async () => {
      assert.ok(!fila(todas, novillo, completo), 'aparece un esquema completo');
      // Los novillos de las semillas no lo tienen aplicado: a ellos si les toca.
      assert.ok(todas.some((d) => d.esquema_id === completo), 'el esquema no aparece para nadie');
      assert.ok(!todas.some((d) => d.animal_id === vendida), 'aparece un animal vendido');
    });

    await prueba('Criterio 2: el resumen cuenta cada estado y viene ordenado por vencimiento', async () => {
      const { cuerpo } = await calendario();
      const contar = (e) => cuerpo.dosis.filter((d) => d.estado === e).length;
      assert.deepStrictEqual(cuerpo.resumen, {
        vencida: contar('vencida'),
        proxima: contar('proxima'),
        programada: contar('programada'),
      });
      assert.strictEqual(cuerpo.total, cuerpo.dosis.length);
      assert.strictEqual(cuerpo.dias_proxima, 7);
      const fechas = cuerpo.dosis.map((d) => d.vence);
      assert.deepStrictEqual(fechas, [...fechas].sort());
    });

    await prueba('Criterio 3: filtra por estado, sin cambiar el resumen', async () => {
      const { cuerpo } = await calendario('&estado=vencida');
      assert.ok(cuerpo.dosis.length > 0);
      assert.ok(cuerpo.dosis.every((d) => d.estado === 'vencida'));
      assert.strictEqual(cuerpo.total, cuerpo.resumen.vencida);
    });

    await prueba('Criterio 3: filtra por rango de fechas y por corral', async () => {
      const desde = await dias(0);
      const hasta = await dias(10);
      const { cuerpo } = await calendario(`&desde=${desde}&hasta=${hasta}`);
      assert.ok(cuerpo.dosis.length > 0);
      assert.ok(cuerpo.dosis.every((d) => d.vence >= desde && d.vence <= hasta));

      const delCorral = await calendario(`&corral=${CORRAL}`);
      assert.deepStrictEqual(delCorral.cuerpo.dosis.map((d) => d.animal_id), [enSerie]);
    });

    await prueba('Criterio 3: pagina sin perder ni repetir dosis', async () => {
      const total = todas.length;
      const vistas = [];
      for (let pagina = 1; pagina <= Math.ceil(total / 2); pagina++) {
        const { cuerpo } = await calendario(`&porPagina=2&pagina=${pagina}`);
        assert.strictEqual(cuerpo.total, total);
        vistas.push(...cuerpo.dosis.map((d) => `${d.animal_id}/${d.esquema_id}`));
      }
      assert.strictEqual(vistas.length, total);
      assert.strictEqual(new Set(vistas).size, total);
    });

    await prueba('Criterio 3: rechaza filtros mal armados', async () => {
      for (const consulta of [
        '&desde=2026-13-01',
        '&hasta=ayer',
        '&desde=2026-05-10&hasta=2026-05-01',
        '&estado=urgente',
        '&pagina=0',
        '&porPagina=500',
        '&estado=vencida&estado=proxima',
        '&porPagina=10&porPagina=20',
      ]) {
        const { estado } = await calendario(consulta);
        assert.strictEqual(estado, 400, consulta);
      }
    });

    await prueba('Un esquema dado de baja sale del calendario', async () => {
      await pedir('DELETE', `/sanidad/esquemas/${nuevo}`, undefined, VETERINARIO_A);
      const { cuerpo } = await calendario();
      assert.ok(!cuerpo.dosis.some((d) => d.esquema_id === nuevo));
    });

    await prueba('Aislamiento: el rancho B no ve las dosis del rancho A', async () => {
      const { estado, cuerpo } = await calendario('', PROPIETARIO_B);
      assert.strictEqual(estado, 200);
      assert.strictEqual(cuerpo.total, 0);
      const general = await pedir('GET', '/sanidad/calendario?porPagina=200', undefined, PROPIETARIO_B);
      assert.ok(!general.cuerpo.dosis.some((d) => animalesCreados.includes(d.animal_id)));
    });

    await prueba('Permisos: el socio y el veterinario lo ven; almacen no', async () => {
      assert.strictEqual((await calendario('', SOCIO_A)).estado, 200);
      assert.strictEqual((await calendario('', VETERINARIO_A)).estado, 200);
      assert.strictEqual((await calendario('', ALMACEN_A)).estado, 403);
    });

    // ------------------------------------------------------------- HU-51
    console.log('\n  HU-51 · Avisos de vencimientos');

    await prueba('Criterio 1: los avisos cuentan lo mismo que el calendario de todo el rancho', async () => {
      const avisos = await pedir('GET', '/sanidad/avisos');
      assert.strictEqual(avisos.estado, 200, JSON.stringify(avisos.cuerpo));
      const general = await pedir('GET', '/sanidad/calendario?porPagina=1');
      assert.strictEqual(avisos.cuerpo.vencidas, general.cuerpo.resumen.vencida);
      assert.strictEqual(avisos.cuerpo.proximas, general.cuerpo.resumen.proxima);
      assert.strictEqual(avisos.cuerpo.dias_proxima, 7);
      assert.ok(avisos.cuerpo.vencidas >= 2, 'no cuenta las vencidas de esta prueba');
    });

    await prueba('Criterio 1: registrar la dosis atrasada baja el aviso', async () => {
      const antes = (await pedir('GET', '/sanidad/avisos')).cuerpo.vencidas;
      await aplicar(atrasado, serie, 1, hoy);
      const despues = (await pedir('GET', '/sanidad/avisos')).cuerpo.vencidas;
      assert.strictEqual(despues, antes - 1);
      const siguiente = fila((await calendario()).cuerpo.dosis, atrasado, serie);
      assert.strictEqual(siguiente.numero_dosis, 2);
      assert.strictEqual(siguiente.vence, await dias(21));
    });

    await prueba('Criterio 2: los ve quien tiene sanidad; los demas no', async () => {
      assert.strictEqual((await pedir('GET', '/sanidad/avisos', undefined, VETERINARIO_A)).estado, 200);
      assert.strictEqual((await pedir('GET', '/sanidad/avisos', undefined, SOCIO_A)).estado, 200);
      assert.strictEqual((await pedir('GET', '/sanidad/avisos', undefined, ALMACEN_A)).estado, 403);
    });

    // ------------------------------------------------------------- rendimiento
    console.log('\n  HU-50 · Rodeo grande');

    await prueba('Criterio 4: con 2000 animales mas responde en menos de 2 segundos', async () => {
      const ids = Array.from({ length: 2000 }, () => randomUUID());
      animalesCreados.push(...ids);
      await pool.query(
        `INSERT INTO animales (id, rancho_id, identificador, tipo_identificador, sexo, categoria_codigo,
                               fecha_nacimiento, origen, estado, creado_por, modificado_por)
         SELECT id, $2, 'R-' || $3 || '-' || ord, 'caravana', 'hembra', 'vaca', DATE '2021-01-01', 'nacido', 'activo', $4, $4
           FROM unnest($1::uuid[]) WITH ORDINALITY AS t(id, ord)`,
        [ids, RANCHO_A, MARCA, PROPIETARIO_A],
      );
      const inicio = Date.now();
      const { estado, cuerpo } = await pedir('GET', '/sanidad/calendario?porPagina=50');
      const demora = Date.now() - inicio;
      assert.strictEqual(estado, 200);
      assert.ok(cuerpo.total >= 2000, `solo ${cuerpo.total} dosis`);
      assert.ok(demora < 2000, `tardo ${demora} ms`);
      const inicioAvisos = Date.now();
      await pedir('GET', '/sanidad/avisos');
      assert.ok(Date.now() - inicioAvisos < 2000, 'los avisos tardan demasiado');
      console.log(`          (calendario en ${demora} ms con ${cuerpo.total} dosis)`);
    });
  } finally {
    if (animalesCreados.length) await pool.query('DELETE FROM animales WHERE id = ANY($1::uuid[])', [animalesCreados]);
    if (esquemasCreados.length) await pool.query('DELETE FROM esquemas_vacunacion WHERE id = ANY($1::uuid[])', [esquemasCreados]);
    await pool.query('DELETE FROM productos_sanitarios WHERE id = $1', [PRODUCTO]);
    await pool.query('DELETE FROM corrales WHERE id = $1', [CORRAL]);
  }

  console.log('\n----------------------------------------------------------------');
  console.log(`  Ejecutadas: ${exitosas + fallidas}   Pasan: ${exitosas}   Fallan: ${fallidas}`);
  console.log('----------------------------------------------------------------');

  await pool.end();

  if (fallidas > 0) {
    console.error('\nHU-50 y HU-51 no cumplen sus criterios de aceptacion.');
    process.exitCode = 1;
  } else {
    console.log('\nHU-50 y HU-51 cumplen sus criterios de aceptacion.');
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
