/**
 * ============================================================================
 * SISTEMA DE GESTION DE GANADO
 * Pruebas de HU-19: los permisos por modulo se exigen en el servidor
 * Responsable: Brian | Sprint 2
 * ============================================================================
 *
 * HU-19, criterio 3: se rechazan las operaciones sobre modulos no
 * habilitados aunque se intenten desde fuera de la interfaz. El encargado de
 * almacen no tiene el modulo importacion ni el de animales: validar e
 * importar le responden 403. La administrativa, cuyo tipo si edita
 * importacion, puede validar.
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
const SOCIO_A = 'a1000000-0000-4000-8000-000000000002'; // Maria Rene
const ALMACEN_A = 'a1000000-0000-4000-8000-000000000005'; // Gonzalo, encargado de almacen
const ADMINISTRATIVO_A = 'a1000000-0000-4000-8000-000000000006'; // Valeria, edita importacion
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
  console.log('  HU-19: PERMISOS POR MODULO EN IMPORTACION');
  console.log('  Responsable: Brian | Sprint 2');
  console.log('================================================================\n');

  try {
    const csv = `caravana,sexo\nI-${MARCA},hembra`;

    await prueba('El encargado de almacen recibe 403 al validar', async () => {
      const { estado, cuerpo } = await pedir('POST', '/importacion/validar', { csv }, ALMACEN_A);
      assert.strictEqual(estado, 403, JSON.stringify(cuerpo));
    });

    await prueba('El encargado de almacen recibe 403 al importar', async () => {
      const { estado, cuerpo } = await pedir('POST', '/importacion/ejecutar', { csv }, ALMACEN_A);
      assert.strictEqual(estado, 403, JSON.stringify(cuerpo));
    });

    await prueba('El socio sin edicion tambien recibe 403 al validar', async () => {
      const { estado } = await pedir('POST', '/importacion/validar', { csv }, SOCIO_A);
      assert.strictEqual(estado, 403);
    });

    await prueba('La administrativa, que edita importacion, si puede validar', async () => {
      const { estado, cuerpo } = await pedir('POST', '/importacion/validar', { csv }, ADMINISTRATIVO_A);
      assert.ok(estado === 200 || estado === 201, `${estado} ${JSON.stringify(cuerpo)}`);
    });

    await prueba('El encargado de almacen tampoco entra a animales (403)', async () => {
      const { estado } = await pedir('GET', '/animales', undefined, ALMACEN_A);
      assert.strictEqual(estado, 403);
    });
  } finally {
    await limpiar();
  }

  console.log('\n----------------------------------------------------------------');
  console.log(`  Ejecutadas: ${exitosas + fallidas}   Pasan: ${exitosas}   Fallan: ${fallidas}`);
  console.log('----------------------------------------------------------------');

  await pool.end();

  if (fallidas > 0) {
    console.error('\nHU-19 no se aprueba.');
    process.exitCode = 1;
  } else {
    console.log('\nHU-19 cumple sus criterios.');
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
