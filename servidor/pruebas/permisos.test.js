/**
 * ============================================================================
 * SISTEMA DE GESTION DE GANADO
 * Pruebas de HU-21 (socio, criterio 3) y HU-22 (vista limitada del colaborador)
 * Responsable: Romina | Sprint 2
 * ============================================================================
 *
 * Contra el PostgreSQL de verdad y contra el servidor levantado.
 *
 * HU-21  3. Si el propietario me habilita un modulo, ahi si puedo editar.
 * HU-22  1. El menu muestra solo los modulos habilitados para mi tipo
 *           (GET /permisos/mios es lo que lo arma).
 *        2. Si intento entrar a otro modulo por direccion directa, el sistema
 *           me lo impide y me explica que rol se necesita.
 *        3. Veo el historial de los modulos que tengo habilitados, no solo el
 *           formulario de carga.
 *
 * Los criterios 1 y 2 de HU-21 los cubre socio.test.js.
 * Lo que crea, lo borra al terminar: no hace falta volver a sembrar.
 * ============================================================================
 */

require('../cargar-entorno').cargarEntorno();
const assert = require('assert');
const { randomUUID } = require('crypto');
const { Pool } = require('pg');

const BASE = process.env.URL_SERVIDOR || 'http://localhost:3000';

const PROPIETARIO_A = 'a1000000-0000-4000-8000-000000000001'; // Carlos
const SOCIO_A = 'a1000000-0000-4000-8000-000000000002'; // Maria Rene
const VETERINARIO_A = 'a1000000-0000-4000-8000-000000000003'; // Dr. Jorge: animales solo ver
const ALMACEN_A = 'a1000000-0000-4000-8000-000000000005'; // Gonzalo: solo almacen
const PROPIETARIO_B = 'b1000000-0000-4000-8000-000000000001'; // Fernando
const SOCIO_B = 'b1000000-0000-4000-8000-000000000002'; // Patricia
const RANCHO_A = 'a0000000-0000-4000-8000-000000000001';

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

async function ejecutarPruebas() {
  console.log('================================================================');
  console.log('  HU-21 (criterio 3) y HU-22: PERMISOS POR MODULO');
  console.log('  Responsable: Romina | Sprint 2');
  console.log('================================================================\n');

  const animal = (
    await pedir('POST', '/animales', { identificador: `P-${MARCA}`, sexo: 'macho', categoria_codigo: 'toro' })
  ).cuerpo.animal;

  // --- HU-22 ---------------------------------------------------------------
  await prueba('HU-22 criterio 1: el colaborador recibe solo los modulos de su tipo', async () => {
    const { estado, cuerpo } = await pedir('GET', '/permisos/mios', undefined, VETERINARIO_A);
    assert.strictEqual(estado, 200);
    assert.strictEqual(cuerpo.animales, 'ver');
    assert.strictEqual(cuerpo.sanidad, 'editar');
    assert.strictEqual(cuerpo.corrales, 'ninguno');
    assert.strictEqual(cuerpo.equipo, 'ninguno');
  });

  await prueba('HU-22 criterio 1: otro tipo, otros modulos', async () => {
    const { cuerpo } = await pedir('GET', '/permisos/mios', undefined, ALMACEN_A);
    assert.strictEqual(cuerpo.almacen, 'editar');
    assert.strictEqual(cuerpo.animales, 'ninguno');
  });

  await prueba('HU-22 criterio 2: entrar a un modulo ajeno da 403 y explica quien puede', async () => {
    const { estado, cuerpo } = await pedir('GET', '/corrales', undefined, VETERINARIO_A);
    assert.strictEqual(estado, 403);
    assert.strictEqual(cuerpo.motivo, 'sin_permiso_modulo');
    assert.strictEqual(cuerpo.necesita, 'ver');
    assert.match(cuerpo.message, /propietario/i);
  });

  await prueba('HU-22 criterio 2: con solo ver, cargar datos tambien da 403 y lo explica', async () => {
    const { estado, cuerpo } = await pedir(
      'POST',
      '/animales',
      { identificador: `V-${MARCA}`, sexo: 'macho', categoria_codigo: 'toro' },
      VETERINARIO_A,
    );
    assert.strictEqual(estado, 403);
    assert.strictEqual(cuerpo.necesita, 'editar');
    assert.match(cuerpo.message, /edición/);
  });

  await prueba('HU-22 criterio 3: con solo ver, consulta el listado y la ficha con su historial', async () => {
    const lista = await pedir('GET', '/animales', undefined, VETERINARIO_A);
    assert.strictEqual(lista.estado, 200);
    assert.ok(lista.cuerpo.some((a) => a.id === animal.id));
    const ficha = await pedir('GET', `/animales/${animal.id}`, undefined, VETERINARIO_A);
    assert.strictEqual(ficha.estado, 200);
    assert.ok(Array.isArray(ficha.cuerpo.movimientos));
    assert.ok(Array.isArray(ficha.cuerpo.estados));
  });

  // --- HU-21 criterio 3 -----------------------------------------------------
  await prueba('HU-21: el socio arranca viendo todo y sin editar nada', async () => {
    const { cuerpo } = await pedir('GET', '/permisos/mios', undefined, SOCIO_A);
    assert.ok(Object.values(cuerpo).every((nivel) => nivel === 'ver'));
    const { estado } = await pedir('PATCH', `/animales/${animal.id}`, { sexo: 'macho', categoria_codigo: 'toro', raza: 'X' }, SOCIO_A);
    assert.strictEqual(estado, 403);
  });

  await prueba('HU-21: solo el propietario habilita modulos al socio', async () => {
    const { estado } = await pedir('PUT', `/permisos/socios/${SOCIO_A}`, { modulos: ['animales'] }, SOCIO_A);
    assert.strictEqual(estado, 403);
  });

  await prueba('HU-21 criterio 3: habilitado animales, el socio edita animales y nada mas', async () => {
    const guardado = await pedir('PUT', `/permisos/socios/${SOCIO_A}`, { modulos: ['animales'] });
    assert.strictEqual(guardado.estado, 200, JSON.stringify(guardado.cuerpo));
    assert.deepStrictEqual(guardado.cuerpo.modulos, ['animales']);

    const { cuerpo } = await pedir('GET', '/permisos/mios', undefined, SOCIO_A);
    assert.strictEqual(cuerpo.animales, 'editar');
    assert.strictEqual(cuerpo.corrales, 'ver');

    const edita = await pedir('PATCH', `/animales/${animal.id}`, { sexo: 'macho', categoria_codigo: 'toro', raza: 'Gyr' }, SOCIO_A);
    assert.strictEqual(edita.estado, 200);
    const corral = await pedir('POST', '/corrales', { nombre: `Socio ${MARCA}` }, SOCIO_A);
    assert.strictEqual(corral.estado, 403);
  });

  await prueba('HU-21 criterio 3: quitarle el modulo le saca la edicion (baja logica)', async () => {
    await pedir('PUT', `/permisos/socios/${SOCIO_A}`, { modulos: [] });
    const { cuerpo } = await pedir('GET', '/permisos/mios', undefined, SOCIO_A);
    assert.strictEqual(cuerpo.animales, 'ver');
    const filas = await pool.query(
      `SELECT eliminado_en FROM permisos_usuario WHERE usuario_id = $1 AND modulo_codigo = 'animales'`,
      [SOCIO_A],
    );
    assert.ok(filas.rowCount >= 1);
    assert.ok(filas.rows.every((fila) => fila.eliminado_en));
  });

  await prueba('HU-03: un propietario no toca los permisos de un socio de otro rancho', async () => {
    const { estado } = await pedir('PUT', `/permisos/socios/${SOCIO_B}`, { modulos: ['animales'] });
    assert.strictEqual(estado, 404);
    const ajeno = await pedir('PUT', `/permisos/socios/${SOCIO_A}`, { modulos: ['animales'] }, PROPIETARIO_B);
    assert.strictEqual(ajeno.estado, 404);
  });

  // ------------------------------------------------------------------------
  await pool.query('DELETE FROM permisos_usuario WHERE usuario_id = $1', [SOCIO_A]);
  await pool.query(`DELETE FROM animales WHERE rancho_id = $1 AND identificador LIKE $2`, [
    RANCHO_A,
    `%${MARCA}%`,
  ]);

  console.log('\n----------------------------------------------------------------');
  console.log(`  Ejecutadas: ${exitosas + fallidas}   Pasan: ${exitosas}   Fallan: ${fallidas}`);
  console.log('----------------------------------------------------------------');

  await pool.end();

  if (fallidas > 0) {
    console.error('\nHU-21 o HU-22 no se aprueban.');
    process.exitCode = 1;
  } else {
    console.log('\nHU-21 y HU-22 cumplen sus criterios.');
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
