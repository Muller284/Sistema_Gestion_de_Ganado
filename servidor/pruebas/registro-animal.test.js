/**
 * ============================================================================
 * SISTEMA DE GESTION DE GANADO
 * Pruebas de HU-27: registro de un animal con su identificador
 * Responsable: Brian | Sprint 2
 * ============================================================================
 *
 * HU-27  1. El identificador puede ser caravana, numero interno o RFID.
 *        2. No se repite entre los animales vigentes del mismo rancho.
 *        3. Otro rancho si puede usar el mismo identificador.
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
  console.log('  HU-27: REGISTRO DE ANIMAL CON IDENTIFICADOR');
  console.log('  Responsable: Brian | Sprint 2');
  console.log('================================================================\n');

  try {
    for (const tipo of ['caravana', 'interno', 'rfid']) {
      await prueba(`Criterio 1: se registra con identificador de tipo ${tipo}`, async () => {
        const animal = await alta({
          identificador: `R-${tipo}-${MARCA}`,
          tipo_identificador: tipo,
          sexo: 'macho',
        });
        assert.strictEqual(animal.tipo_identificador, tipo);
        assert.strictEqual(animal.identificador, `R-${tipo}-${MARCA}`);
      });
    }

    await prueba('Criterio 1: un tipo de identificador fuera de los tres se rechaza', async () => {
      const { estado } = await pedir('POST', '/animales', {
        identificador: `R-x-${MARCA}`,
        tipo_identificador: 'tatuaje',
        sexo: 'macho',
      });
      assert.strictEqual(estado, 400);
    });

    await prueba('Sin identificador no se registra', async () => {
      const { estado } = await pedir('POST', '/animales', { identificador: '   ', sexo: 'macho' });
      assert.strictEqual(estado, 400);
    });

    await prueba('Criterio 2: el mismo identificador en el mismo rancho da 409', async () => {
      const { estado, cuerpo } = await pedir('POST', '/animales', {
        identificador: `R-caravana-${MARCA}`,
        tipo_identificador: 'interno',
        sexo: 'hembra',
      });
      assert.strictEqual(estado, 409, JSON.stringify(cuerpo));
    });

    await prueba('Criterio 3: otro rancho puede usar el mismo identificador', async () => {
      const animal = await alta({ identificador: `R-caravana-${MARCA}`, sexo: 'hembra' }, PROPIETARIO_B);
      assert.strictEqual(animal.identificador, `R-caravana-${MARCA}`);
    });
  } finally {
    await limpiar();
  }

  console.log('\n----------------------------------------------------------------');
  console.log(`  Ejecutadas: ${exitosas + fallidas}   Pasan: ${exitosas}   Fallan: ${fallidas}`);
  console.log('----------------------------------------------------------------');

  await pool.end();

  if (fallidas > 0) {
    console.error('\nHU-27 no se aprueba.');
    process.exitCode = 1;
  } else {
    console.log('\nHU-27 cumple sus criterios.');
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
