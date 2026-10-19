/**
 * ============================================================================
 * SISTEMA DE GESTION DE GANADO
 * Pruebas de HU-29: listado de animales con busqueda y filtros
 * Responsable: Brian | Sprint 2
 * ============================================================================
 *
 * HU-29  Busqueda por identificador o nombre (sin importar mayusculas) y
 *        filtros por sexo, categoria, corral y rango de fechas de
 *        nacimiento. Los filtros se combinan; uno mal formado da 400; un
 *        rancho no ve los animales de otro.
 *
 * Contra el PostgreSQL de verdad y contra el servidor levantado.
 * Lo que crea, lo borra al terminar: no hace falta volver a sembrar.
 * ============================================================================
 */

require('../cargar-entorno').cargarEntorno();
const assert = require('assert');
const { randomUUID } = require('crypto');
const { Pool } = require('pg');

const BASE = process.env.URL_SERVIDOR || 'http://localhost:3000';

const PROPIETARIO_A = 'a1000000-0000-4000-8000-000000000001'; // Carlos
const PROPIETARIO_B = 'b1000000-0000-4000-8000-000000000001'; // Fernando
const RANCHO_A = 'a0000000-0000-4000-8000-000000000001';
const RANCHO_B = 'b0000000-0000-4000-8000-000000000002';

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgres://postgres:tu_password@localhost:5432/gestion_ganado',
});

let exitosas = 0;
let fallidas = 0;
const MARCA = randomUUID().slice(0, 8);

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

/** Da de alta un animal del propietario A y devuelve la ficha. */
async function alta(datos, usuarioId = PROPIETARIO_A) {
  const { estado, cuerpo } = await pedir('POST', '/animales', datos, usuarioId);
  assert.strictEqual(estado, 201, JSON.stringify(cuerpo));
  return cuerpo.animal;
}

async function limpiar() {
  await pool.query(`DELETE FROM animales WHERE rancho_id IN ($1, $2) AND identificador LIKE $3`, [
    RANCHO_A,
    RANCHO_B,
    `%${MARCA}%`,
  ]);
  await pool.query(`DELETE FROM corrales WHERE rancho_id IN ($1, $2) AND nombre LIKE $3`, [
    RANCHO_A,
    RANCHO_B,
    `%${MARCA}%`,
  ]);
}

async function ejecutarPruebas() {
  console.log('================================================================');
  console.log('  HU-29: LISTADO CON BUSQUEDA Y FILTROS');
  console.log('  Responsable: Brian | Sprint 2');
  console.log('================================================================\n');

  try {
    const corral = (await pedir('POST', '/corrales', { nombre: `Filtro ${MARCA}` })).cuerpo.corral;
    const lucero = await alta({
      identificador: `F1-${MARCA}`,
      nombre: `Lucero ${MARCA}`,
      sexo: 'hembra',
      categoria_codigo: 'vaquilla',
      fecha_nacimiento: '2024-03-10',
      corral_id: corral.id,
    });
    const toro = await alta({
      identificador: `F2-${MARCA}`,
      sexo: 'macho',
      categoria_codigo: 'toro',
      fecha_nacimiento: '2022-01-05',
    });
    const novillo = await alta({
      identificador: `F3-${MARCA}`,
      sexo: 'macho',
      categoria_codigo: 'novillo',
      fecha_nacimiento: '2023-07-20',
      corral_id: corral.id,
    });

    /** Los identificadores de esta prueba que devuelve el listado, ordenados. */
    async function listar(consulta, usuarioId = PROPIETARIO_A) {
      const { estado, cuerpo } = await pedir('GET', `/animales?${consulta}`, undefined, usuarioId);
      assert.strictEqual(estado, 200, JSON.stringify(cuerpo));
      return cuerpo
        .filter((a) => a.identificador.includes(MARCA))
        .map((a) => a.identificador)
        .sort();
    }
    const ids = (...animales) => animales.map((a) => a.identificador).sort();

    await prueba('Sin filtros trae los tres', async () => {
      assert.deepStrictEqual(await listar(''), ids(lucero, toro, novillo));
    });

    await prueba('Busca por parte del identificador', async () => {
      assert.deepStrictEqual(await listar(`busqueda=F2-${MARCA}`), ids(toro));
    });

    await prueba('Busca por nombre sin importar mayusculas', async () => {
      const busqueda = encodeURIComponent(`LUCERO ${MARCA}`.toUpperCase());
      assert.deepStrictEqual(await listar(`busqueda=${busqueda}`), ids(lucero));
    });

    await prueba('Un % en la busqueda no funciona como comodin', async () => {
      assert.deepStrictEqual(await listar(`busqueda=${encodeURIComponent('%')}`), []);
    });

    await prueba('Filtra por sexo', async () => {
      assert.deepStrictEqual(await listar('sexo=macho'), ids(toro, novillo));
    });

    await prueba('Filtra por categoria', async () => {
      assert.deepStrictEqual(await listar('categoria=vaquilla'), ids(lucero));
    });

    await prueba('Filtra por corral', async () => {
      assert.deepStrictEqual(await listar(`corral=${corral.id}`), ids(lucero, novillo));
    });

    await prueba('Rango de fechas: desde', async () => {
      assert.deepStrictEqual(await listar('fechaDesde=2023-01-01'), ids(lucero, novillo));
    });

    await prueba('Rango de fechas: hasta', async () => {
      assert.deepStrictEqual(await listar('fechaHasta=2023-12-31'), ids(toro, novillo));
    });

    await prueba('Rango de fechas: desde y hasta, con los extremos incluidos', async () => {
      assert.deepStrictEqual(await listar('fechaDesde=2023-07-20&fechaHasta=2024-03-10'), ids(lucero, novillo));
      assert.deepStrictEqual(await listar('fechaDesde=2023-01-01&fechaHasta=2023-12-31'), ids(novillo));
    });

    await prueba('Los filtros se combinan', async () => {
      assert.deepStrictEqual(await listar(`sexo=macho&corral=${corral.id}`), ids(novillo));
      assert.deepStrictEqual(await listar(`busqueda=${MARCA}&sexo=hembra&categoria=toro`), []);
    });

    await prueba('Los filtros respetan la vista por estado (HU-33)', async () => {
      await pedir('POST', `/animales/${toro.id}/estado`, { estado: 'vendido', motivo: 'Feria' });
      assert.deepStrictEqual(await listar('sexo=macho'), ids(novillo));
      assert.deepStrictEqual(await listar('estado=todos&sexo=macho'), ids(toro, novillo));
    });

    await prueba('Una fecha mal formada da 400', async () => {
      assert.strictEqual((await pedir('GET', '/animales?fechaDesde=2024-02-31')).estado, 400);
      assert.strictEqual((await pedir('GET', '/animales?fechaHasta=ayer')).estado, 400);
    });

    await prueba('Desde posterior a hasta da 400', async () => {
      assert.strictEqual((await pedir('GET', '/animales?fechaDesde=2025-01-01&fechaHasta=2024-01-01')).estado, 400);
    });

    await prueba('Un sexo fuera de macho o hembra da 400', async () => {
      assert.strictEqual((await pedir('GET', '/animales?sexo=otro')).estado, 400);
    });

    await prueba('HU-03: otro rancho no encuentra estos animales', async () => {
      assert.deepStrictEqual(await listar(`busqueda=${MARCA}`, PROPIETARIO_B), []);
    });
  } finally {
    await limpiar();
  }

  console.log('\n----------------------------------------------------------------');
  console.log(`  Ejecutadas: ${exitosas + fallidas}   Pasan: ${exitosas}   Fallan: ${fallidas}`);
  console.log('----------------------------------------------------------------');

  await pool.end();

  if (fallidas > 0) {
    console.error('\nHU-29 no se aprueba.');
    process.exitCode = 1;
  } else {
    console.log('\nHU-29 cumple sus criterios.');
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
