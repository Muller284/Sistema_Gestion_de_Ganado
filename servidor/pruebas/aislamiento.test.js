/**
 * ============================================================================
 * SISTEMA DE GESTION DE GANADO
 * Pruebas de aislamiento de datos entre ranchos (HU-03)
 * ============================================================================
 *
 * POR QUE ESTA SUITE SE REESCRIBIO
 * --------------------------------
 * La version anterior usaba un MockDbPool: una base simulada en memoria que
 * filtraba un arreglo de JavaScript. El SQL que arma RepositorioBase nunca
 * llegaba a ejecutarse, asi que la prueba comprobaba el simulador y no el
 * sistema. Lo verificamos quitando por completo el "rancho_id = $1" de la
 * consulta, es decir eliminando el aislamiento, y la suite seguia dando cinco
 * de cinco en verde.
 *
 * Esta version corre contra el PostgreSQL de verdad, con los datos que carga
 * servidor/semillas/001_datos_prueba.sql. Si alguien rompe el filtro, estas
 * pruebas se ponen en rojo.
 *
 * Requisitos para correrla:
 *   1. La base levantada (docker compose up -d postgres)
 *   2. npm run migrar
 *   3. npm run sembrar
 * ============================================================================
 */

require('../cargar-entorno').cargarEntorno();
const assert = require('assert');
const { Pool } = require('pg');
const RepositorioBase = require('../RepositorioBase');

// Identificadores fijos de las semillas
const RANCHO_A = 'a0000000-0000-4000-8000-000000000001'; // Rancho El Cerrito
const RANCHO_B = 'b0000000-0000-4000-8000-000000000002'; // Hacienda La Floresta
const PROPIETARIO_A = 'a1000000-0000-4000-8000-000000000001';
const PROPIETARIO_B = 'b1000000-0000-4000-8000-000000000001';

const TIPO_DE_PRUEBA = '99999999-9999-4999-8999-999999999999';

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgres://postgres:tu_password@localhost:5432/gestion_ganado',
});

let exitosas = 0;
let fallidas = 0;

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

async function verificarSemillas() {
  const r = await pool.query(
    'SELECT COUNT(*)::int AS n FROM ranchos WHERE id IN ($1,$2) AND eliminado_en IS NULL',
    [RANCHO_A, RANCHO_B],
  );
  if (r.rows[0].n !== 2) {
    throw new Error(
      'Faltan los datos de prueba. Corre primero: npm run migrar && npm run sembrar',
    );
  }
}

async function ejecutarPruebas() {
  console.log('================================================================');
  console.log('  AISLAMIENTO DE DATOS ENTRE RANCHOS (HU-03)');
  console.log('  Contra la base de datos real, no contra un simulador.');
  console.log('================================================================\n');

  await verificarSemillas();

  // --------------------------------------------------------------------------
  await prueba(
    'No se puede construir un repositorio sin indicar el rancho',
    async () => {
      assert.throws(() => new RepositorioBase(pool, null, PROPIETARIO_A));
      assert.throws(() => new RepositorioBase(pool, undefined, PROPIETARIO_A));
      assert.throws(() => new RepositorioBase(pool, '', PROPIETARIO_A));
    },
  );

  // --------------------------------------------------------------------------
  await prueba(
    'El rancho A solo ve sus propios usuarios',
    async () => {
      const repositorio = new RepositorioBase(pool, RANCHO_A, PROPIETARIO_A);
      const usuarios = await repositorio.consultar('usuarios');

      assert.ok(usuarios.length > 0, 'el rancho A deberia tener usuarios');
      const ajenos = usuarios.filter((u) => u.rancho_id !== RANCHO_A);
      assert.strictEqual(
        ajenos.length,
        0,
        `se filtraron ${ajenos.length} usuarios de otro rancho`,
      );
    },
  );

  // --------------------------------------------------------------------------
  await prueba(
    'El rancho A no puede leer al propietario del rancho B ni pidiendolo por su identificador',
    async () => {
      const repositorio = new RepositorioBase(pool, RANCHO_A, PROPIETARIO_A);
      const filas = await repositorio.consultar('usuarios', 'AND id = $2', [
        PROPIETARIO_B,
      ]);
      assert.strictEqual(filas.length, 0, 'devolvio datos de un rancho ajeno');
    },
  );

  // --------------------------------------------------------------------------
  await prueba('El aislamiento funciona igual en el sentido contrario', async () => {
    const repositorio = new RepositorioBase(pool, RANCHO_B, PROPIETARIO_B);
    const usuarios = await repositorio.consultar('usuarios');

    assert.ok(usuarios.length > 0, 'el rancho B deberia tener usuarios');
    const ajenos = usuarios.filter((u) => u.rancho_id !== RANCHO_B);
    assert.strictEqual(ajenos.length, 0, 'el rancho B vio usuarios del rancho A');
  });

  // --------------------------------------------------------------------------
  await prueba(
    'Los tipos de colaborador propios de un rancho no se ven desde el otro',
    async () => {
      const repositorioA = new RepositorioBase(pool, RANCHO_A, PROPIETARIO_A);
      const repositorioB = new RepositorioBase(pool, RANCHO_B, PROPIETARIO_B);

      await pool.query('DELETE FROM tipos_colaborador WHERE id = $1', [TIPO_DE_PRUEBA]);
      await repositorioA.insertar('tipos_colaborador', {
        id: TIPO_DE_PRUEBA,
        nombre: 'Tipo propio del rancho A',
        es_predefinido: false,
      });

      const desdeA = await repositorioA.consultar('tipos_colaborador', 'AND id = $2', [
        TIPO_DE_PRUEBA,
      ]);
      const desdeB = await repositorioB.consultar('tipos_colaborador', 'AND id = $2', [
        TIPO_DE_PRUEBA,
      ]);

      assert.strictEqual(desdeA.length, 1, 'el rancho A deberia ver su propio tipo');
      assert.strictEqual(desdeB.length, 0, 'el rancho B no deberia ver el tipo del A');
    },
  );

  // --------------------------------------------------------------------------
  await prueba(
    'Al insertar se fuerza el rancho y se registra el autor en la fila guardada',
    async () => {
      const repositorio = new RepositorioBase(pool, RANCHO_A, PROPIETARIO_A);
      await pool.query('DELETE FROM tipos_colaborador WHERE id = $1', [TIPO_DE_PRUEBA]);

      // Intento de suplantacion: el dato viene marcado con el rancho B.
      const guardada = await repositorio.insertar('tipos_colaborador', {
        id: TIPO_DE_PRUEBA,
        nombre: 'Intento de infiltracion',
        es_predefinido: false,
        rancho_id: RANCHO_B,
      });

      // Se comprueba la fila que quedo en la base, no el objeto que se envio.
      assert.strictEqual(
        guardada.rancho_id,
        RANCHO_A,
        'la fila guardada quedo con el rancho ajeno',
      );
      assert.strictEqual(
        guardada.creado_por,
        PROPIETARIO_A,
        'no quedo registrado el autor (HU-23)',
      );
    },
  );

  // --------------------------------------------------------------------------
  await prueba(
    'Un registro dado de baja deja de aparecer en las consultas',
    async () => {
      const repositorio = new RepositorioBase(pool, RANCHO_A, PROPIETARIO_A);
      const antes = await repositorio.consultar('tipos_colaborador', 'AND id = $2', [
        TIPO_DE_PRUEBA,
      ]);
      assert.strictEqual(antes.length, 1, 'el registro deberia existir antes de la baja');

      await pool.query(
        'UPDATE tipos_colaborador SET eliminado_en = CURRENT_TIMESTAMP WHERE id = $1',
        [TIPO_DE_PRUEBA],
      );

      const despues = await repositorio.consultar('tipos_colaborador', 'AND id = $2', [
        TIPO_DE_PRUEBA,
      ]);
      assert.strictEqual(despues.length, 0, 'un registro dado de baja sigue apareciendo');

      const enLaBase = await pool.query(
        'SELECT 1 FROM tipos_colaborador WHERE id = $1',
        [TIPO_DE_PRUEBA],
      );
      assert.strictEqual(
        enLaBase.rowCount,
        1,
        'la baja borro la fila en lugar de marcarla',
      );
    },
  );

  // --------------------------------------------------------------------------
  await prueba(
    'Un propietario sin rancho todavia no puede leer datos de ningun rancho',
    async () => {
      // rancho_id nulo significa "ningun rancho", nunca "todos los ranchos".
      assert.throws(() => new RepositorioBase(pool, null, PROPIETARIO_A));
    },
  );

  // Limpieza
  await pool.query('DELETE FROM tipos_colaborador WHERE id = $1', [TIPO_DE_PRUEBA]);

  console.log('\n----------------------------------------------------------------');
  console.log(`  Ejecutadas: ${exitosas + fallidas}   Pasan: ${exitosas}   Fallan: ${fallidas}`);
  console.log('----------------------------------------------------------------');

  await pool.end();

  if (fallidas > 0) {
    console.error('\nHay fallos de aislamiento. HU-03 no se aprueba.');
    process.exitCode = 1;
  } else {
    console.log('\nEl aislamiento entre ranchos se cumple sobre la base real.');
  }
}

if (require.main === module) {
  ejecutarPruebas().catch((error) => {
    console.error('\nNo se pudieron correr las pruebas:', error.message);
    process.exitCode = 1;
    void pool.end();
  });
}

module.exports = { ejecutarPruebas };
