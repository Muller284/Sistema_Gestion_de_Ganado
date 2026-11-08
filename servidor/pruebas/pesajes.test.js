/**
 * ============================================================================
 * SISTEMA DE GESTION DE GANADO
 * Pruebas de HU-53 (Registro de pesaje individual y masivo)
 * Responsable: Brian | Sprint 4
 * ============================================================================
 *
 * Contra el PostgreSQL de verdad y contra el servidor levantado.
 *
 * Criterios cubiertos:
 *   1. El peso se guarda en kilos (HU-26) y la fecha no puede ser futura.
 *   2. En el masivo se eligen los animales y cada uno tiene su peso; se
 *      guarda todo o nada.
 *   3. El ultimo pesaje pasa a ser el peso actual de la ficha.
 *   4. Cada pesaje dice quien lo registro.
 *
 * Ademas: los permisos del modulo pesajes (campo y veterinario editan, el
 * socio solo ve, almacen no entra), el aislamiento entre ranchos (HU-03), un
 * pesaje por animal y por dia, y que no se pesan animales dados de baja ni
 * que no esten activos.
 *
 * Lo que crea, lo borra al terminar y deja el peso de cada ficha como estaba:
 * no hace falta volver a sembrar.
 * ============================================================================
 */

require('../cargar-entorno').cargarEntorno();
const assert = require('assert');
const { randomUUID } = require('crypto');
const { Pool } = require('pg');

const BASE = process.env.URL_SERVIDOR || 'http://localhost:3000';

const RANCHO_A = 'a0000000-0000-4000-8000-000000000001';
const PROPIETARIO_A = 'a1000000-0000-4000-8000-000000000001'; // Carlos
const SOCIO_A = 'a1000000-0000-4000-8000-000000000002'; // Maria Rene: ve pesajes
const VETERINARIO_A = 'a1000000-0000-4000-8000-000000000003'; // Dr. Jorge: edita pesajes
const CAMPO_A = 'a1000000-0000-4000-8000-000000000004'; // Roberto: edita pesajes
const ALMACEN_A = 'a1000000-0000-4000-8000-000000000005'; // Gonzalo: no ve pesajes
const PROPIETARIO_B = 'b1000000-0000-4000-8000-000000000001'; // Fernando

const LUCERA = 'd1000000-0000-4000-8000-000000000001'; // 0501, ultimo pesaje 2026-10-30, 468 kg
const NOVILLO_0503 = 'd1000000-0000-4000-8000-000000000003'; // ultimo 402 kg
const NOVILLO_0504 = 'd1000000-0000-4000-8000-000000000004'; // ultimo 371 kg
const CHISPA = 'd1000000-0000-4000-8000-000000000005'; // ternera nacida el 2026-06-05
const BLANCA_B = 'd2000000-0000-4000-8000-000000000001'; // del otro rancho

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgres://postgres:tu_password@localhost:5432/gestion_ganado',
});

let exitosas = 0;
let fallidas = 0;
const MARCA = `prueba HU-53 ${randomUUID().slice(0, 8)}`;
const animalesCreados = [];

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

async function pedir(metodo, ruta, cuerpo, usuarioId = CAMPO_A) {
  const respuesta = await fetch(`${BASE}${ruta}`, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', 'x-usuario-id': usuarioId },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  return { estado: respuesta.status, cuerpo: await respuesta.json().catch(() => null) };
}

/** Un dia AAAA-MM-DD a n dias de hoy (en UTC, con margen para cualquier zona). */
function dia(n) {
  const fecha = new Date();
  fecha.setUTCDate(fecha.getUTCDate() + n);
  return fecha.toISOString().slice(0, 10);
}

async function pesoDeFicha(id) {
  const fila = await pool.query('SELECT peso_kg::float AS peso FROM animales WHERE id = $1', [id]);
  return fila.rows[0].peso;
}

/** Un animal del rancho A creado solo para esta prueba. */
async function animalDePrueba(cambios = {}) {
  const id = randomUUID();
  const datos = { estado: 'activo', eliminado_en: null, ...cambios };
  await pool.query(
    `INSERT INTO animales (id, rancho_id, identificador, tipo_identificador, sexo, categoria_codigo,
                           estado, eliminado_en, creado_por, modificado_por)
     VALUES ($1, $2, $3, 'caravana', 'macho', 'novillo', $4, $5, $6, $6)`,
    [id, RANCHO_A, `P53-${id.slice(0, 6)}`, datos.estado, datos.eliminado_en, PROPIETARIO_A],
  );
  animalesCreados.push(id);
  return id;
}

async function ejecutarPruebas() {
  console.log('================================================================');
  console.log('  HU-53: REGISTRO DE PESAJE INDIVIDUAL Y MASIVO');
  console.log('  Responsable: Brian | Sprint 4');
  console.log('================================================================\n');

  try {
    await prueba('La pestana Pesajes trae los pesajes del animal, del mas nuevo al mas viejo', async () => {
      const { estado, cuerpo } = await pedir('GET', `/pesajes/animales/${LUCERA}`, undefined, SOCIO_A);
      assert.strictEqual(estado, 200, JSON.stringify(cuerpo));
      assert.strictEqual(cuerpo.animal.identificador, '0501');
      assert.ok(cuerpo.pesajes.length >= 3, 'faltan los pesajes de las semillas');
      assert.deepStrictEqual(
        cuerpo.pesajes.slice(-3).map((p) => p.fecha),
        ['2026-10-30', '2026-09-15', '2026-08-01'],
      );
      assert.strictEqual(typeof cuerpo.pesajes[0].peso_kg, 'number');
    });

    await prueba('Criterio 4: cada pesaje dice quien lo registro', async () => {
      const { cuerpo } = await pedir('GET', `/pesajes/animales/${LUCERA}`, undefined, SOCIO_A);
      const semilla = cuerpo.pesajes.find((p) => p.fecha === '2026-10-30');
      assert.match(semilla.registrado_por, /Roberto/);
    });

    await prueba('Criterio 1 y 3: el encargado de campo pesa y la ficha toma ese peso', async () => {
      const { estado, cuerpo } = await pedir('POST', '/pesajes', {
        animal_id: NOVILLO_0503,
        fecha: dia(-1),
        peso_kg: '410.456',
        observacion: `  ${MARCA}  `,
      });
      assert.strictEqual(estado, 201, JSON.stringify(cuerpo));
      assert.strictEqual(cuerpo.pesaje.peso_kg, 410.46, 'no redondeo a dos decimales');
      assert.strictEqual(cuerpo.pesaje.fecha, dia(-1));
      assert.strictEqual(cuerpo.pesaje.observacion, MARCA, 'no limpio los espacios');
      assert.match(cuerpo.pesaje.registrado_por, /Roberto/);
      assert.strictEqual(cuerpo.peso_actual_kg, 410.46);
      assert.strictEqual(await pesoDeFicha(NOVILLO_0503), 410.46, 'la ficha no tomo el ultimo peso');
      assert.match(cuerpo.mensaje, /0503/);
    });

    await prueba('Criterio 3: un pesaje atrasado no le cambia el peso actual a la ficha', async () => {
      const { estado, cuerpo } = await pedir('POST', '/pesajes', {
        animal_id: NOVILLO_0504,
        fecha: '2026-07-01',
        peso_kg: 300,
        observacion: MARCA,
      }, VETERINARIO_A);
      assert.strictEqual(estado, 201, JSON.stringify(cuerpo));
      assert.strictEqual(cuerpo.peso_actual_kg, 371);
      assert.strictEqual(await pesoDeFicha(NOVILLO_0504), 371);
    });

    await prueba('Criterio 1: la fecha no puede ser futura ni invalida; sin fecha es hoy', async () => {
      const futura = await pedir('POST', '/pesajes', { animal_id: LUCERA, fecha: dia(2), peso_kg: 470 });
      assert.strictEqual(futura.estado, 400, JSON.stringify(futura.cuerpo));
      const mala = await pedir('POST', '/pesajes', { animal_id: LUCERA, fecha: '2026-02-31', peso_kg: 470 });
      assert.strictEqual(mala.estado, 400);
      const hoy = await pedir('POST', '/pesajes', { animal_id: LUCERA, peso_kg: 470, observacion: MARCA });
      assert.strictEqual(hoy.estado, 201, JSON.stringify(hoy.cuerpo));
      assert.ok(Math.abs(Date.parse(hoy.cuerpo.pesaje.fecha) - Date.parse(dia(0))) <= 86400000);
    });

    await prueba('El peso tiene que ser mayor que cero y razonable (en kilos)', async () => {
      for (const peso_kg of [0, -5, 'abc', '', null, 3500]) {
        const { estado } = await pedir('POST', '/pesajes', { animal_id: LUCERA, fecha: '2026-11-01', peso_kg });
        assert.strictEqual(estado, 400, `acepto ${JSON.stringify(peso_kg)}`);
      }
    });

    await prueba('Un pesaje por animal y por dia', async () => {
      const { estado, cuerpo } = await pedir('POST', '/pesajes', {
        animal_id: NOVILLO_0503,
        fecha: dia(-1),
        peso_kg: 411,
      });
      assert.strictEqual(estado, 409, JSON.stringify(cuerpo));
      assert.match(cuerpo.message, /0503/);
    });

    await prueba('No se pesa antes del nacimiento', async () => {
      const { estado } = await pedir('POST', '/pesajes', { animal_id: CHISPA, fecha: '2026-05-01', peso_kg: 30 });
      assert.strictEqual(estado, 400);
    });

    await prueba('No se pesa un animal dado de baja ni uno que no esta activo', async () => {
      const baja = await animalDePrueba({ eliminado_en: new Date().toISOString() });
      const vendido = await animalDePrueba({ estado: 'vendido' });
      assert.strictEqual((await pedir('POST', '/pesajes', { animal_id: baja, peso_kg: 300 })).estado, 400);
      assert.strictEqual((await pedir('POST', '/pesajes', { animal_id: vendido, peso_kg: 300 })).estado, 400);
      const filas = await pool.query('SELECT COUNT(*)::int AS n FROM pesajes WHERE animal_id = ANY($1::uuid[])', [
        [baja, vendido],
      ]);
      assert.strictEqual(filas.rows[0].n, 0);
    });

    await prueba('Permisos: el socio ve pero no pesa; almacen no entra', async () => {
      assert.strictEqual((await pedir('POST', '/pesajes', { animal_id: LUCERA, peso_kg: 470 }, SOCIO_A)).estado, 403);
      assert.strictEqual((await pedir('GET', `/pesajes/animales/${LUCERA}`, undefined, ALMACEN_A)).estado, 403);
      assert.strictEqual((await pedir('POST', '/pesajes', { animal_id: LUCERA, peso_kg: 470 }, ALMACEN_A)).estado, 403);
    });

    await prueba('Aislamiento: otro rancho no ve ni pesa mis animales', async () => {
      assert.strictEqual((await pedir('GET', `/pesajes/animales/${LUCERA}`, undefined, PROPIETARIO_B)).estado, 404);
      assert.strictEqual(
        (await pedir('POST', '/pesajes', { animal_id: LUCERA, peso_kg: 470 }, PROPIETARIO_B)).estado,
        404,
      );
      assert.strictEqual((await pedir('GET', `/pesajes/animales/${BLANCA_B}`)).estado, 404);
    });

    await prueba('Criterio 2: el masivo trae solo los animales que se pueden pesar', async () => {
      const baja = await animalDePrueba({ eliminado_en: new Date().toISOString() });
      const { estado, cuerpo } = await pedir('POST', '/pesajes/masivo/animales', {
        animal_ids: [LUCERA, NOVILLO_0504, BLANCA_B, baja, LUCERA],
      });
      assert.strictEqual(estado, 200, JSON.stringify(cuerpo));
      assert.deepStrictEqual(cuerpo.animales.map((a) => a.identificador), ['0501', '0504']);
      assert.strictEqual(cuerpo.no_pesables, 2, 'tenia que contar el del otro rancho y el dado de baja');
      assert.strictEqual(cuerpo.animales[0].peso_kg !== undefined, true);
    });

    await prueba('Criterio 2: el masivo guarda un peso por animal, con la misma fecha y lote', async () => {
      const { estado, cuerpo } = await pedir('POST', '/pesajes/masivo', {
        fecha: '2026-11-02',
        observacion: MARCA,
        pesajes: [
          { animal_id: NOVILLO_0504, peso_kg: 380 },
          { animal_id: CHISPA, peso_kg: '125.5' },
        ],
      });
      assert.strictEqual(estado, 201, JSON.stringify(cuerpo));
      assert.strictEqual(cuerpo.registrados, 2);
      const filas = await pool.query(
        `SELECT animal_id::text, peso_kg::float AS peso, lote_id::text, creado_por::text
           FROM pesajes WHERE lote_id = $1 ORDER BY peso`,
        [cuerpo.lote_id],
      );
      assert.deepStrictEqual(filas.rows.map((f) => f.peso), [125.5, 380]);
      assert.ok(filas.rows.every((f) => f.creado_por === CAMPO_A));
      assert.strictEqual(await pesoDeFicha(NOVILLO_0504), 380);
      assert.strictEqual(await pesoDeFicha(CHISPA), 125.5);
    });

    await prueba('Criterio 2: si uno falla, no se guarda ninguno', async () => {
      const antes = await pool.query('SELECT COUNT(*)::int AS n FROM pesajes');
      const unoMalo = await pedir('POST', '/pesajes/masivo', {
        fecha: '2026-11-03',
        observacion: MARCA,
        pesajes: [
          { animal_id: NOVILLO_0504, peso_kg: 382 },
          { animal_id: CHISPA, peso_kg: 0 },
        ],
      });
      assert.strictEqual(unoMalo.estado, 400, JSON.stringify(unoMalo.cuerpo));
      const otroRancho = await pedir('POST', '/pesajes/masivo', {
        fecha: '2026-11-03',
        pesajes: [
          { animal_id: NOVILLO_0504, peso_kg: 382 },
          { animal_id: BLANCA_B, peso_kg: 540 },
        ],
      });
      assert.strictEqual(otroRancho.estado, 400, JSON.stringify(otroRancho.cuerpo));
      const repetido = await pedir('POST', '/pesajes/masivo', {
        fecha: '2026-11-02',
        pesajes: [
          { animal_id: LUCERA, peso_kg: 469 },
          { animal_id: NOVILLO_0504, peso_kg: 381 },
        ],
      });
      assert.strictEqual(repetido.estado, 409, JSON.stringify(repetido.cuerpo));
      assert.match(repetido.cuerpo.message, /0504/);
      const despues = await pool.query('SELECT COUNT(*)::int AS n FROM pesajes');
      assert.strictEqual(despues.rows[0].n, antes.rows[0].n, 'guardo una parte');
      assert.strictEqual(await pesoDeFicha(NOVILLO_0504), 380);
    });

    await prueba('El masivo rechaza listas vacias, repetidos y el socio', async () => {
      assert.strictEqual((await pedir('POST', '/pesajes/masivo', { pesajes: [] })).estado, 400);
      assert.strictEqual(
        (await pedir('POST', '/pesajes/masivo', {
          pesajes: [
            { animal_id: LUCERA, peso_kg: 1 },
            { animal_id: LUCERA, peso_kg: 2 },
          ],
        })).estado,
        400,
      );
      assert.strictEqual(
        (await pedir('POST', '/pesajes/masivo', { pesajes: [{ animal_id: LUCERA, peso_kg: 470 }] }, SOCIO_A)).estado,
        403,
      );
      assert.strictEqual(
        (await pedir('POST', '/pesajes/masivo/animales', { animal_ids: [LUCERA] }, SOCIO_A)).estado,
        403,
      );
    });
  } finally {
    // Lo creado se va, y cada ficha vuelve al peso de su pesaje mas nuevo.
    const tocados = await pool.query(
      `DELETE FROM pesajes WHERE observacion LIKE $1 RETURNING animal_id`,
      [`%${MARCA}%`],
    );
    const ids = [...new Set(tocados.rows.map((f) => f.animal_id))];
    if (ids.length) {
      await pool.query(
        `UPDATE animales a SET peso_kg = u.peso_kg
           FROM (SELECT DISTINCT ON (animal_id) animal_id, peso_kg FROM pesajes
                  WHERE animal_id = ANY($1::uuid[]) AND eliminado_en IS NULL
                  ORDER BY animal_id, fecha DESC, creado_en DESC) u
          WHERE a.id = u.animal_id`,
        [ids],
      );
    }
    if (animalesCreados.length) {
      await pool.query('DELETE FROM animales WHERE id = ANY($1::uuid[])', [animalesCreados]);
    }
  }

  console.log('\n----------------------------------------------------------------');
  console.log(`  Ejecutadas: ${exitosas + fallidas}   Pasan: ${exitosas}   Fallan: ${fallidas}`);
  console.log('----------------------------------------------------------------');

  await pool.end();

  if (fallidas > 0) {
    console.error('\nHU-53 no cumple sus criterios de aceptacion.');
    process.exitCode = 1;
  } else {
    console.log('\nHU-53 cumple sus criterios de aceptacion.');
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
