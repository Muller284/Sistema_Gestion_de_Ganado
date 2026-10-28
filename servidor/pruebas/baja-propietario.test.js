/**
 * ============================================================================
 * SISTEMA DE GESTION DE GANADO
 * Pruebas de HU-18: solo el propietario da de baja y restaura animales
 * Responsable: Brian | Sprint 2
 * ============================================================================
 *
 * HU-18  Un colaborador con permiso de edicion en animales (el encargado de
 *        campo) puede editar la ficha, pero no darla de baja ni restaurarla.
 *        El propietario si. El mensaje del 403 habla de bajas, no de los
 *        permisos de los socios.
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
  const { estado, cuerpo } = await pedir('POST', '/animales', { categoria_codigo: datos.sexo === 'macho' ? 'toro' : 'vaca', ...datos }, usuarioId);
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
  console.log('  HU-18: BAJAS Y RESTAURACIONES SOLO DEL PROPIETARIO');
  console.log('  Responsable: Brian | Sprint 2');
  console.log('================================================================\n');

  try {
    const animal = await alta({ identificador: `B-${MARCA}`, sexo: 'hembra' });

    await prueba('El colaborador con edicion puede editar la ficha', async () => {
      const { estado, cuerpo } = await pedir(
        'PATCH',
        `/animales/${animal.id}`,
        { sexo: 'hembra', categoria_codigo: 'vaca', raza: 'nelore' },
        CAMPO_A,
      );
      assert.strictEqual(estado, 200, JSON.stringify(cuerpo));
    });

    await prueba('El colaborador con edicion no puede dar de baja (403)', async () => {
      const { estado, cuerpo } = await pedir('DELETE', `/animales/${animal.id}`, undefined, CAMPO_A);
      assert.strictEqual(estado, 403, JSON.stringify(cuerpo));
      const fila = await pool.query('SELECT eliminado_en FROM animales WHERE id = $1', [animal.id]);
      assert.strictEqual(fila.rows[0].eliminado_en, null, 'lo dio de baja igual');
    });

    await prueba('El mensaje del 403 habla de la baja, no de los permisos de los socios', async () => {
      const { cuerpo } = await pedir('DELETE', `/animales/${animal.id}`, undefined, CAMPO_A);
      const texto = JSON.stringify(cuerpo).toLowerCase();
      assert.ok(!texto.includes('permisos de los socios'), texto);
      assert.ok(texto.includes('dar de baja'), texto);
      // La clave es servidor.permisos.soloPropietarioElimina (exigirEliminar, de Romina).
      assert.strictEqual(cuerpo.motivo, 'solo_propietario_elimina', texto);
    });

    await prueba('El propietario si puede dar de baja', async () => {
      assert.strictEqual((await pedir('DELETE', `/animales/${animal.id}`)).estado, 200);
    });

    await prueba('El colaborador con edicion no puede restaurar (403)', async () => {
      const { estado } = await pedir('POST', `/animales/${animal.id}/restaurar`, undefined, CAMPO_A);
      assert.strictEqual(estado, 403);
      const fila = await pool.query('SELECT eliminado_en FROM animales WHERE id = $1', [animal.id]);
      assert.ok(fila.rows[0].eliminado_en, 'lo restauro igual');
    });

    await prueba('El propietario si puede restaurar', async () => {
      const { estado, cuerpo } = await pedir('POST', `/animales/${animal.id}/restaurar`);
      assert.strictEqual(estado, 201, JSON.stringify(cuerpo));
      assert.strictEqual(cuerpo.animal.eliminado_en, null);
    });
  } finally {
    await limpiar();
  }

  console.log('\n----------------------------------------------------------------');
  console.log(`  Ejecutadas: ${exitosas + fallidas}   Pasan: ${exitosas}   Fallan: ${fallidas}`);
  console.log('----------------------------------------------------------------');

  await pool.end();

  if (fallidas > 0) {
    console.error('\nHU-18 no se aprueba.');
    process.exitCode = 1;
  } else {
    console.log('\nHU-18 cumple sus criterios.');
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
