/**
 * ============================================================================
 * SISTEMA DE GESTION DE GANADO
 * Pruebas de HU-23: autoria de la ficha del animal
 * Responsable: Brian | Sprint 2
 * ============================================================================
 *
 * HU-23  La ficha trae el nombre de quien la creo y de quien la modifico por
 *        ultima vez, y el momento de cada cosa. Los nombres salen del
 *        servidor, no del cliente.
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
const CAMPO_A = 'a1000000-0000-4000-8000-000000000004'; // Roberto, encargado de campo (edita animales)
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
  console.log('  HU-23: AUTORIA EN LA FICHA DEL ANIMAL');
  console.log('  Responsable: Brian | Sprint 2');
  console.log('================================================================\n');

  try {
    const nombreDe = async (id) =>
      (await pool.query('SELECT nombre FROM usuarios WHERE id = $1', [id])).rows[0].nombre;
    const propietario = await nombreDe(PROPIETARIO_A);
    const encargado = await nombreDe(CAMPO_A);
    const animal = await alta({ identificador: `U-${MARCA}`, sexo: 'macho' });

    await prueba('La ficha trae quien la creo y quien la modifico', async () => {
      const { estado, cuerpo } = await pedir('GET', `/animales/${animal.id}`);
      assert.strictEqual(estado, 200);
      assert.strictEqual(cuerpo.animal.creado_por_nombre, propietario);
      assert.strictEqual(cuerpo.animal.modificado_por_nombre, propietario);
      assert.ok(cuerpo.animal.creado_en, 'falta creado_en');
      assert.ok(cuerpo.animal.modificado_en, 'falta modificado_en');
    });

    await prueba('Si otro la edita, cambia quien modifico y no quien creo', async () => {
      const editado = await pedir('PATCH', `/animales/${animal.id}`, { sexo: 'macho', raza: 'Gyr' }, CAMPO_A);
      assert.strictEqual(editado.estado, 200, JSON.stringify(editado.cuerpo));
      const { cuerpo } = await pedir('GET', `/animales/${animal.id}`);
      assert.strictEqual(cuerpo.animal.creado_por_nombre, propietario);
      assert.strictEqual(cuerpo.animal.modificado_por_nombre, encargado);
    });

    await prueba('El listado tambien trae la autoria', async () => {
      const { cuerpo } = await pedir('GET', `/animales?busqueda=U-${MARCA}`);
      assert.strictEqual(cuerpo.length, 1);
      assert.strictEqual(cuerpo[0].creado_por_nombre, propietario);
      assert.strictEqual(cuerpo[0].modificado_por_nombre, encargado);
    });
  } finally {
    await limpiar();
  }

  console.log('\n----------------------------------------------------------------');
  console.log(`  Ejecutadas: ${exitosas + fallidas}   Pasan: ${exitosas}   Fallan: ${fallidas}`);
  console.log('----------------------------------------------------------------');

  await pool.end();

  if (fallidas > 0) {
    console.error('\nHU-23 no se aprueba.');
    process.exitCode = 1;
  } else {
    console.log('\nHU-23 cumple sus criterios.');
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
