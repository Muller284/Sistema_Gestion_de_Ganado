/**
 * ============================================================================
 * SISTEMA DE GESTION DE GANADO
 * Pruebas de la migracion 010: tablas de sanidad y pesajes
 * Responsable: Aaron | Sprint 4 (MT-03)
 * ============================================================================
 *
 * MT-03  1. La migracion 010 se aplica desde una base vacia y sobre una base
 *           con datos (se prueba al correr npm run migrar en las dos).
 *        2. Las semillas cargan productos, esquemas, aplicaciones y pesajes de
 *           ejemplo en los dos ranchos.
 *        3. Aislamiento sobre las tablas nuevas: cada rancho ve solo lo suyo,
 *           y la base no deja que una fila apunte a algo de otro rancho.
 *
 * Contra el PostgreSQL de verdad, con las semillas cargadas. No necesita el
 * servidor levantado. Lo que crea, lo borra al terminar.
 * ============================================================================
 */

require('../cargar-entorno').cargarEntorno();
const assert = require('assert');
const { randomUUID } = require('crypto');
const { Pool } = require('pg');
const RepositorioBase = require('../RepositorioBase');

const RANCHO_A = 'a0000000-0000-4000-8000-000000000001';
const RANCHO_B = 'b0000000-0000-4000-8000-000000000002';
const PROPIETARIO_A = 'a1000000-0000-4000-8000-000000000001';
const PROPIETARIO_B = 'b1000000-0000-4000-8000-000000000001';
const ANIMAL_A = 'd1000000-0000-4000-8000-000000000001';
const PRODUCTO_A = 'e1000000-0000-4000-8000-000000000001';
const PRODUCTO_B = 'e2000000-0000-4000-8000-000000000001';
const TABLAS = ['productos_sanitarios', 'esquemas_vacunacion', 'aplicaciones_sanitarias', 'pesajes'];

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgres://postgres:tu_password@localhost:5432/gestion_ganado',
});

let exitosas = 0;
let fallidas = 0;
const creados = [];

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

/** Espera que la base rechace el INSERT con el codigo de error dado. */
async function rechaza(sql, valores, codigo) {
  try {
    await pool.query(sql, valores);
  } catch (error) {
    assert.strictEqual(error.code, codigo, `esperaba ${codigo} y vino ${error.code}: ${error.message}`);
    return;
  }
  assert.fail('La base acepto algo que tenia que rechazar');
}

async function ejecutarPruebas() {
  console.log('================================================================');
  console.log('  MIGRACION 010: SANIDAD Y PESAJES');
  console.log('================================================================\n');

  try {
    await prueba('Criterio 2: las semillas cargan sanidad y pesajes en los dos ranchos', async () => {
      for (const tabla of TABLAS) {
        const r = await pool.query(
          `SELECT rancho_id, COUNT(*)::int AS n FROM ${tabla} WHERE rancho_id IN ($1, $2) GROUP BY rancho_id`,
          [RANCHO_A, RANCHO_B],
        );
        const porRancho = Object.fromEntries(r.rows.map((f) => [f.rancho_id, f.n]));
        assert.ok(porRancho[RANCHO_A] > 0, `${tabla}: el rancho A no tiene datos`);
        assert.ok(porRancho[RANCHO_B] > 0, `${tabla}: el rancho B no tiene datos`);
      }
    });

    await prueba('Criterio 2: hay una aplicacion masiva (filas con el mismo lote)', async () => {
      const r = await pool.query(
        `SELECT lote_id, COUNT(*)::int AS n FROM aplicaciones_sanitarias
          WHERE rancho_id = $1 AND lote_id IS NOT NULL GROUP BY lote_id`,
        [RANCHO_A],
      );
      assert.ok(r.rows.some((f) => f.n > 1));
    });

    await prueba('Criterio 2: el peso de la ficha es el del ultimo pesaje', async () => {
      const r = await pool.query(
        `SELECT a.identificador, a.peso_kg::float AS ficha,
                (SELECT p.peso_kg::float FROM pesajes p WHERE p.animal_id = a.id ORDER BY p.fecha DESC LIMIT 1) AS ultimo
           FROM animales a WHERE a.rancho_id = $1 AND a.id::text LIKE 'd1%'`,
        [RANCHO_A],
      );
      assert.ok(r.rows.length > 0);
      for (const fila of r.rows) assert.strictEqual(fila.ficha, fila.ultimo, fila.identificador);
    });

    for (const [rancho, propietario, nombre] of [
      [RANCHO_A, PROPIETARIO_A, 'A'],
      [RANCHO_B, PROPIETARIO_B, 'B'],
    ]) {
      await prueba(`Criterio 3: el rancho ${nombre} solo ve lo suyo en las cuatro tablas nuevas`, async () => {
        const repositorio = new RepositorioBase(pool, rancho, propietario);
        for (const tabla of TABLAS) {
          const filas = await repositorio.consultar(tabla);
          assert.ok(filas.length > 0, `${tabla} vacia`);
          assert.ok(filas.every((f) => f.rancho_id === rancho), `${tabla} devolvio filas de otro rancho`);
        }
      });
    }

    await prueba('Criterio 3: una aplicacion del rancho B no puede apuntar a un animal del rancho A', async () => {
      await rechaza(
        `INSERT INTO aplicaciones_sanitarias (id, rancho_id, animal_id, producto_id, fecha, aplicado_por)
         VALUES ($1, $2, $3, $4, CURRENT_DATE, $5)`,
        [randomUUID(), RANCHO_B, ANIMAL_A, PRODUCTO_B, PROPIETARIO_B],
        '23503',
      );
    });

    await prueba('Criterio 3: un esquema del rancho B no puede usar un producto del rancho A', async () => {
      await rechaza(
        `INSERT INTO esquemas_vacunacion (id, rancho_id, producto_id, nombre, dosis)
         VALUES ($1, $2, $3, 'Ajeno', 1)`,
        [randomUUID(), RANCHO_B, PRODUCTO_A],
        '23503',
      );
    });

    await prueba('Criterio 3: un pesaje del rancho B no puede ser de un animal del rancho A', async () => {
      await rechaza(
        `INSERT INTO pesajes (id, rancho_id, animal_id, fecha, peso_kg) VALUES ($1, $2, $3, CURRENT_DATE, 300)`,
        [randomUUID(), RANCHO_B, ANIMAL_A],
        '23503',
      );
    });

    await prueba('Un esquema de varias dosis exige el intervalo entre dosis', async () => {
      await rechaza(
        `INSERT INTO esquemas_vacunacion (id, rancho_id, producto_id, nombre, dosis)
         VALUES ($1, $2, $3, 'Sin intervalo', 2)`,
        [randomUUID(), RANCHO_A, PRODUCTO_A],
        '23514',
      );
    });

    await prueba('Un animal no tiene dos pesajes vigentes el mismo dia; dado de baja, se libera', async () => {
      const id = randomUUID();
      creados.push(id);
      await pool.query(
        `INSERT INTO pesajes (id, rancho_id, animal_id, fecha, peso_kg) VALUES ($1, $2, $3, '2026-01-02', 400)`,
        [id, RANCHO_A, ANIMAL_A],
      );
      await rechaza(
        `INSERT INTO pesajes (id, rancho_id, animal_id, fecha, peso_kg) VALUES ($1, $2, $3, '2026-01-02', 401)`,
        [randomUUID(), RANCHO_A, ANIMAL_A],
        '23505',
      );
      await pool.query('UPDATE pesajes SET eliminado_en = CURRENT_TIMESTAMP WHERE id = $1', [id]);
      const otro = randomUUID();
      creados.push(otro);
      await pool.query(
        `INSERT INTO pesajes (id, rancho_id, animal_id, fecha, peso_kg) VALUES ($1, $2, $3, '2026-01-02', 401)`,
        [otro, RANCHO_A, ANIMAL_A],
      );
    });

    await prueba('El nombre de un producto no se repite en el rancho (por su clave)', async () => {
      await rechaza(
        `INSERT INTO productos_sanitarios (id, rancho_id, nombre, clave, tipo)
         VALUES ($1, $2, 'VACUNA ANTIAFTOSA', 'vacuna antiaftosa', 'vacuna')`,
        [randomUUID(), RANCHO_A],
        '23505',
      );
    });
  } finally {
    if (creados.length) await pool.query('DELETE FROM pesajes WHERE id = ANY($1::uuid[])', [creados]);
  }

  console.log('\n----------------------------------------------------------------');
  console.log(`  Ejecutadas: ${exitosas + fallidas}   Pasan: ${exitosas}   Fallan: ${fallidas}`);
  console.log('----------------------------------------------------------------');

  await pool.end();

  if (fallidas > 0) {
    console.error('\nLa migracion 010 no cumple sus criterios.');
    process.exitCode = 1;
  } else {
    console.log('\nLa migracion 010 cumple sus criterios.');
  }
}

if (require.main === module) {
  ejecutarPruebas().catch((error) => {
    console.error('\nNo se pudieron correr las pruebas:', error.message);
    console.error('Revisa que la base este levantada y con las semillas cargadas.');
    process.exitCode = 1;
    void pool.end();
  });
}

module.exports = { ejecutarPruebas };
