/**
 * ============================================================================
 * SISTEMA DE GESTION DE GANADO
 * Pruebas de HU-57 (Panel del propietario), HU-58 (Panel según el rol) y
 * HU-56 (Comparativa por corral y categoría)
 * Responsable: Aaron | Sprint 4
 * ============================================================================
 *
 * Contra el PostgreSQL de verdad y contra el servidor levantado, con las
 * semillas 001 y 002 cargadas. Lo que crea, lo borra al terminar.
 *
 * HU-57  1. Existencias por categoría y por corral.
 *        2. Altas y bajas por mes.
 *        3. Cobertura de vacunación y próximos vencimientos.
 *        4. Evolución del peso promedio.
 *        5. Sin datos, cada sección viene vacía pero presente (la pantalla
 *           explica qué falta).
 * HU-58  1. El socio ve todo, sin edición.
 *        2. El colaborador ve solo sus módulos.
 *        3. El servidor no entrega datos de los módulos que no ve.
 * HU-56  1. Peso y ganancia promedio por corral y por categoría.
 *        2. Los animales por debajo del promedio de su grupo.
 *        3. Permiso de pesajes y aislamiento entre ranchos.
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
const CAMPO_A = 'a1000000-0000-4000-8000-000000000004';
const ALMACEN_A = 'a1000000-0000-4000-8000-000000000005';
const PROPIETARIO_B = 'b1000000-0000-4000-8000-000000000001';
const SIN_RANCHO = 'c1000000-0000-4000-8000-000000000001';
const LAS_LOMAS = 'cc000000-0000-4000-8000-000000000001';
const DEL_RIO = 'cc000000-0000-4000-8000-000000000002';
const NOVILLO_0503 = 'd1000000-0000-4000-8000-000000000003';
const NOVILLO_0504 = 'd1000000-0000-4000-8000-000000000004';

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgres://postgres:tu_password@localhost:5432/gestion_ganado',
});

let exitosas = 0;
let fallidas = 0;
const pesajesCreados = [];

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

async function pedir(ruta, usuarioId = PROPIETARIO_A) {
  const respuesta = await fetch(`${BASE}${ruta}`, { headers: { 'x-usuario-id': usuarioId } });
  return { estado: respuesta.status, cuerpo: await respuesta.json().catch(() => null) };
}

const panel = (usuario) => pedir('/indicadores/panel', usuario);

async function ejecutarPruebas() {
  console.log('================================================================');
  console.log('  HU-56, HU-57 Y HU-58: PANELES Y COMPARATIVA DE PESO');
  console.log('  Responsable: Aaron | Sprint 4');
  console.log('================================================================\n');

  try {
    // ---------------------------------------------------------------- HU-57
    console.log('  HU-57 · Panel del propietario');

    let carlos;
    await prueba('El propietario ve las cuatro secciones y puede editar en todas', async () => {
      const { estado, cuerpo } = await panel(PROPIETARIO_A);
      assert.strictEqual(estado, 200, JSON.stringify(cuerpo));
      carlos = cuerpo;
      assert.deepStrictEqual(cuerpo.secciones, { animales: true, corrales: true, sanidad: true, pesajes: true });
      assert.deepStrictEqual(cuerpo.editar, { animales: true, corrales: true, sanidad: true, pesajes: true });
      assert.match(cuerpo.hoy, /^\d{4}-\d{2}-\d{2}$/);
    });

    await prueba('Criterio 1: existencias por categoría y por corral, que suman lo mismo', async () => {
      const { rows } = await pool.query(
        `SELECT COUNT(*)::int AS n FROM animales WHERE rancho_id = $1 AND eliminado_en IS NULL AND estado = 'activo'`,
        [RANCHO_A],
      );
      assert.strictEqual(carlos.animales.activos, rows[0].n);
      const porCategoria = carlos.animales.por_categoria.reduce((s, f) => s + f.n, 0);
      const porCorral = carlos.corrales.por_corral.reduce((s, f) => s + f.n, 0) + carlos.corrales.sin_corral;
      assert.strictEqual(porCategoria, rows[0].n);
      assert.strictEqual(porCorral, rows[0].n);
      const lomas = carlos.corrales.por_corral.find((c) => c.id === LAS_LOMAS);
      assert.ok(lomas && lomas.n >= 4 && lomas.capacidad === 20, JSON.stringify(lomas));
      // Ordenadas de mayor a menor.
      const ns = carlos.animales.por_categoria.map((f) => f.n);
      assert.deepStrictEqual(ns, [...ns].sort((a, b) => b - a));
    });

    await prueba('Criterio 2: doce meses de altas y bajas; la venta de septiembre cuenta como baja', async () => {
      const meses = carlos.animales.movimientos;
      assert.strictEqual(meses.length, 12);
      assert.strictEqual(meses[11].mes, carlos.hoy.slice(0, 7), 'el último mes no es el actual');
      const septiembre = meses.find((m) => m.mes === '2026-09');
      if (septiembre) assert.ok(septiembre.bajas >= 1, 'no cuenta la venta del 0507');
      const marzo = meses.find((m) => m.mes === '2026-03');
      if (marzo) assert.ok(marzo.altas >= 3, 'no cuenta las altas de marzo');
    });

    await prueba('Criterio 3: la cobertura sale de la misma cuenta que el calendario', async () => {
      const s = carlos.sanidad;
      assert.ok(s.con_esquema > 0);
      assert.strictEqual(s.al_dia, s.con_esquema - s.atrasados);
      assert.strictEqual(s.cobertura, Math.round((s.al_dia / s.con_esquema) * 100));
      const avisos = await pedir('/sanidad/avisos');
      assert.strictEqual(s.vencidas, avisos.cuerpo.vencidas);
      assert.strictEqual(s.proximas, avisos.cuerpo.proximas);
      assert.ok(s.proximos.length <= 5);
      assert.ok(s.proximos.every((d) => d.estado !== 'vencida'));
      const fechas = s.proximos.map((d) => d.vence);
      assert.deepStrictEqual(fechas, [...fechas].sort());
    });

    await prueba('Criterio 4: el peso promedio de cada mes es el de los pesajes de ese mes', async () => {
      const meses = carlos.pesajes.evolucion;
      assert.strictEqual(meses.length, 12);
      for (const mes of meses.filter((m) => m.peso_promedio !== null)) {
        const { rows } = await pool.query(
          `SELECT ROUND(AVG(p.peso_kg)::numeric, 1)::float AS promedio
             FROM pesajes p JOIN animales a ON a.id = p.animal_id AND a.eliminado_en IS NULL
            WHERE p.rancho_id = $1 AND p.eliminado_en IS NULL AND to_char(p.fecha, 'YYYY-MM') = $2`,
          [RANCHO_A, mes.mes],
        );
        assert.strictEqual(mes.peso_promedio, rows[0].promedio, mes.mes);
      }
      assert.strictEqual(carlos.pesajes.meses_con_datos, meses.filter((m) => m.peso_promedio !== null).length);
    });

    await prueba('Criterio 5: un rancho nuevo trae las secciones vacías, no un error', async () => {
      const { estado, cuerpo } = await panel(PROPIETARIO_B);
      assert.strictEqual(estado, 200);
      // La Floresta no tiene corrales: la sección existe y viene vacía.
      assert.deepStrictEqual(cuerpo.corrales.por_corral, []);
      assert.ok(cuerpo.corrales.sin_corral >= 0);
    });

    await prueba('Sin rancho no hay panel', async () => {
      const { estado } = await panel(SIN_RANCHO);
      assert.strictEqual(estado, 404);
    });

    // ---------------------------------------------------------------- HU-58
    console.log('\n  HU-58 · Panel según el rol');

    await prueba('Criterio 1: la socia ve todo, sin edición', async () => {
      const { cuerpo } = await panel(SOCIO_A);
      assert.deepStrictEqual(cuerpo.secciones, { animales: true, corrales: true, sanidad: true, pesajes: true });
      assert.deepStrictEqual(cuerpo.editar, { animales: false, corrales: false, sanidad: false, pesajes: false });
      assert.strictEqual(cuerpo.animales.activos, carlos.animales.activos);
    });

    await prueba('Criterio 2 y 3: el veterinario no recibe nada de corrales', async () => {
      const { cuerpo } = await panel(VETERINARIO_A);
      assert.strictEqual(cuerpo.secciones.corrales, false);
      assert.strictEqual(cuerpo.corrales, null);
      assert.ok(cuerpo.sanidad && cuerpo.pesajes && cuerpo.animales);
      assert.strictEqual(cuerpo.editar.sanidad, true);
      assert.ok(!JSON.stringify(cuerpo).includes('Potrero'), 'se filtró el nombre de un corral');
    });

    await prueba('Criterio 2 y 3: el encargado de campo no recibe nada de sanidad', async () => {
      const { cuerpo } = await panel(CAMPO_A);
      assert.strictEqual(cuerpo.secciones.sanidad, false);
      assert.strictEqual(cuerpo.sanidad, null);
      assert.ok(cuerpo.corrales && cuerpo.pesajes);
    });

    await prueba('Criterio 2 y 3: el de almacén no recibe ninguna sección', async () => {
      const { estado, cuerpo } = await panel(ALMACEN_A);
      assert.strictEqual(estado, 200);
      for (const seccion of ['animales', 'corrales', 'sanidad', 'pesajes']) {
        assert.strictEqual(cuerpo[seccion], null, seccion);
        assert.strictEqual(cuerpo.secciones[seccion], false, seccion);
      }
    });

    await prueba('Aislamiento: el panel del rancho B no cuenta nada del rancho A', async () => {
      const { cuerpo } = await panel(PROPIETARIO_B);
      const { rows } = await pool.query(
        `SELECT COUNT(*)::int AS n FROM animales
          WHERE rancho_id = 'b0000000-0000-4000-8000-000000000002' AND eliminado_en IS NULL AND estado = 'activo'`,
      );
      assert.strictEqual(cuerpo.animales.activos, rows[0].n);
      assert.ok(!JSON.stringify(cuerpo).includes('Potrero'));
    });

    // ---------------------------------------------------------------- HU-56
    console.log('\n  HU-56 · Comparativa por corral y categoría');

    const periodo = '?desde=2026-09-01&hasta=2026-10-31';
    let comparativa;

    await prueba('Criterio 1: peso y ganancia promedio por corral, con la cuenta a mano', async () => {
      const { estado, cuerpo } = await pedir(`/indicadores/pesajes/comparativa${periodo}`);
      assert.strictEqual(estado, 200, JSON.stringify(cuerpo));
      comparativa = cuerpo;
      assert.strictEqual(cuerpo.agrupar, 'corral');
      assert.strictEqual(cuerpo.desde, '2026-09-01');
      // Potrero del Río: 0503 (378 -> 402) y 0504 (355 -> 371), del 15/09 al 30/10 = 45 días.
      const rio = cuerpo.por_corral.find((g) => g.clave === DEL_RIO);
      assert.ok(rio, 'falta el Potrero del Río');
      assert.strictEqual(rio.animales, 2);
      assert.strictEqual(rio.peso_promedio, (402 + 371) / 2);
      const esperada = Math.round(((24 / 45 + 16 / 45) / 2) * 1000) / 1000;
      assert.ok(Math.abs(rio.ganancia_promedio - esperada) < 0.002, `${rio.ganancia_promedio} vs ${esperada}`);
    });

    await prueba('Criterio 1: también por categoría', async () => {
      const novillos = comparativa.por_categoria.find((g) => g.clave === 'novillo');
      assert.ok(novillos && novillos.animales === 2);
      const { cuerpo } = await pedir(`/indicadores/pesajes/comparativa${periodo}&agrupar=categoria`);
      assert.strictEqual(cuerpo.agrupar, 'categoria');
    });

    await prueba('Criterio 2: el 0504 está por debajo del promedio de su corral, con lo que le falta', async () => {
      const animal = comparativa.bajo_promedio.find((a) => a.animal_id === NOVILLO_0504);
      assert.ok(animal, JSON.stringify(comparativa.bajo_promedio));
      assert.ok(Math.abs(animal.falta - (animal.ganancia_promedio_grupo - animal.ganancia_diaria)) < 0.002);
      assert.ok(!comparativa.bajo_promedio.some((a) => a.animal_id === NOVILLO_0503), 'el 0503 está por encima');
      const faltas = comparativa.bajo_promedio.map((a) => a.falta);
      assert.deepStrictEqual(faltas, [...faltas].sort((a, b) => b - a));
    });

    await prueba('Un animal con un solo pesaje en el período no tiene ganancia ni entra en los atrasados', async () => {
      const { cuerpo } = await pedir('/indicadores/pesajes/comparativa?desde=2026-10-01&hasta=2026-10-31');
      assert.ok(cuerpo.animales_pesados > 0);
      assert.strictEqual(cuerpo.con_ganancia, 0);
      assert.ok(cuerpo.por_corral.every((g) => g.ganancia_promedio === null));
      assert.deepStrictEqual(cuerpo.bajo_promedio, []);
    });

    await prueba('Un pesaje nuevo cambia la ganancia (y se borra al terminar)', async () => {
      const id = randomUUID();
      pesajesCreados.push(id);
      await pool.query(
        `INSERT INTO pesajes (id, rancho_id, animal_id, fecha, peso_kg) VALUES ($1, $2, $3, '2026-10-31', 500)`,
        [id, RANCHO_A, NOVILLO_0504],
      );
      const { cuerpo } = await pedir(`/indicadores/pesajes/comparativa${periodo}`);
      assert.ok(!cuerpo.bajo_promedio.some((a) => a.animal_id === NOVILLO_0504), 'con 500 kg ya no está atrasado');
    });

    await prueba('Criterio 3: sin corrales se agrupa por categoría y no salen nombres de corrales', async () => {
      const { estado, cuerpo } = await pedir(`/indicadores/pesajes/comparativa${periodo}`, VETERINARIO_A);
      assert.strictEqual(estado, 200);
      assert.strictEqual(cuerpo.con_corrales, false);
      assert.strictEqual(cuerpo.agrupar, 'categoria');
      assert.strictEqual(cuerpo.por_corral, null);
      assert.ok(!JSON.stringify(cuerpo).includes('Potrero'));
    });

    await prueba('Criterio 3: sin permiso de pesajes no hay comparativa', async () => {
      assert.strictEqual((await pedir('/indicadores/pesajes/comparativa', ALMACEN_A)).estado, 403);
      assert.strictEqual((await pedir('/indicadores/pesajes/comparativa', SOCIO_A)).estado, 200);
    });

    await prueba('Criterio 3: el rancho B no ve animales del rancho A', async () => {
      const { cuerpo } = await pedir(`/indicadores/pesajes/comparativa${periodo}`, PROPIETARIO_B);
      const todos = [...cuerpo.por_categoria, ...(cuerpo.por_corral ?? [])];
      assert.ok(todos.every((g) => g.animales <= 2));
      assert.ok(!JSON.stringify(cuerpo).includes('d1000000'), 'aparece un animal del rancho A');
    });

    await prueba('Valida las fechas y el agrupamiento', async () => {
      for (const consulta of ['?desde=2026-13-01', '?hasta=ayer', '?desde=2026-10-10&hasta=2026-10-01', '?agrupar=raza', '?desde=2026-01-01&desde=2026-02-01']) {
        const { estado } = await pedir(`/indicadores/pesajes/comparativa${consulta}`);
        assert.strictEqual(estado, 400, consulta);
      }
    });

    await prueba('Sin fechas, toma los últimos 90 días hasta hoy', async () => {
      const { cuerpo } = await pedir('/indicadores/pesajes/comparativa');
      assert.strictEqual(cuerpo.hasta, carlos.hoy);
      const dias = (Date.parse(cuerpo.hasta) - Date.parse(cuerpo.desde)) / 86400000;
      assert.strictEqual(dias, 90);
    });
  } finally {
    if (pesajesCreados.length) await pool.query('DELETE FROM pesajes WHERE id = ANY($1::uuid[])', [pesajesCreados]);
  }

  console.log('\n----------------------------------------------------------------');
  console.log(`  Ejecutadas: ${exitosas + fallidas}   Pasan: ${exitosas}   Fallan: ${fallidas}`);
  console.log('----------------------------------------------------------------');

  await pool.end();

  if (fallidas > 0) {
    console.error('\nHU-56, HU-57 y HU-58 no cumplen sus criterios de aceptacion.');
    process.exitCode = 1;
  } else {
    console.log('\nHU-56, HU-57 y HU-58 cumplen sus criterios de aceptacion.');
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
