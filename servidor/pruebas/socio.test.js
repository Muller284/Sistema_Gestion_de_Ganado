/**
 * ============================================================================
 * SISTEMA DE GESTION DE GANADO
 * Pruebas de Calidad (QA) — HU-21: Restricciones de rol Socio (Solo lectura)
 * Responsable: Romina | Sprint 2
 * ============================================================================
 *
 * Criterios evaluados:
 *   1. El socio puede consultar el rancho y su equipo (ve todo).
 *   2. El socio NO puede dar de alta a ningun integrante (403 Forbidden).
 *   3. El socio NO puede suspender ni reactivar a ningun miembro (403 Forbidden).
 *   4. El socio NO puede restablecer contraseñas de otros usuarios (403 Forbidden).
 *   5. El socio NO puede editar los datos del rancho (403 Forbidden).
 * ============================================================================
 */

require('../cargar-entorno').cargarEntorno();
const assert = require('assert');
const { Pool } = require('pg');

const BASE = process.env.URL_SERVIDOR || 'http://localhost:3000';

// Socio de las semillas: Maria Rene Aguilera (Rancho El Cerrito)
const SOCIO_ID = 'a1000000-0000-4000-8000-000000000002';
const PROPIETARIO_ID = 'a1000000-0000-4000-8000-000000000001';
const RANCHO_ID = 'a0000000-0000-4000-8000-000000000001';

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgres://ganado_usuario:1234@localhost:5432/gestion_ganado',
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

async function pedir(ruta, opciones = {}, usuarioId = SOCIO_ID) {
  const respuesta = await fetch(`${BASE}${ruta}`, {
    ...opciones,
    headers: {
      'Content-Type': 'application/json',
      ...(usuarioId ? { 'x-usuario-id': usuarioId } : {}),
      ...(opciones.headers ?? {}),
    },
  });
  const cuerpo = await respuesta.json().catch(() => null);
  return { estado: respuesta.status, cuerpo };
}

async function ejecutarPruebas() {
  console.log('================================================================');
  console.log('  HU-21: RESTRICCIONES DE ROL SOCIO (SOLO LECTURA)');
  console.log('  Responsable: Romina | Sprint 2');
  console.log('================================================================\n');

  // 1. Lectura permitida
  await prueba('Criterio 1: El socio puede consultar los datos de su rancho', async () => {
    const { estado, cuerpo } = await pedir('/ranchos/mio', {}, SOCIO_ID);
    assert.strictEqual(estado, 200);
    assert.strictEqual(cuerpo.tieneRancho, true);
    assert.strictEqual(cuerpo.rancho.id, RANCHO_ID);
  });

  await prueba('Criterio 1: El socio puede ver la lista del equipo', async () => {
    const { estado, cuerpo } = await pedir('/equipo', {}, SOCIO_ID);
    assert.strictEqual(estado, 200);
    // Desde HU-20, GET /equipo devuelve la lista directa, sin envolver en { miembros }.
    assert.ok(Array.isArray(cuerpo));
    assert.ok(cuerpo.length >= 2);
  });

  // 2. Modificaciones denegadas
  await prueba('Criterio 2: El socio NO puede dar de alta a un integrante (403)', async () => {
    const { estado } = await pedir('/equipo', {
      method: 'POST',
      body: JSON.stringify({
        nombre: 'Nuevo Intento',
        correo: `intento.socio.${Date.now()}@prueba.bo`,
        rol: 'colaborador',
        tipo_colaborador_id: '11111111-1111-4111-8111-000000000001',
      }),
    }, SOCIO_ID);
    assert.strictEqual(estado, 403, `Esperaba 403 y llego ${estado}`);
  });

  await prueba('Criterio 3: El socio NO puede suspender a otro miembro (403)', async () => {
    const { estado } = await pedir(
      `/equipo/${PROPIETARIO_ID}/estado`,
      { method: 'PATCH', body: JSON.stringify({ estado: 'suspendido' }) },
      SOCIO_ID,
    );
    assert.strictEqual(estado, 403, `Esperaba 403 y llego ${estado}`);
  });

  await prueba('Criterio 4: El socio NO puede restablecer contraseñas de otros (403)', async () => {
    const { estado } = await pedir(
      `/usuarios/${PROPIETARIO_ID}/restablecer-contrasena`,
      { method: 'POST' },
      SOCIO_ID,
    );
    assert.strictEqual(estado, 403, `Esperaba 403 y llego ${estado}`);
  });

  await prueba('Criterio 5: El socio NO puede modificar los datos del rancho (403)', async () => {
    const { estado } = await pedir(
      `/ranchos/${RANCHO_ID}`,
      { method: 'PATCH', body: JSON.stringify({ nombre: 'Intento de Cambio' }) },
      SOCIO_ID,
    );
    assert.strictEqual(estado, 403, `Esperaba 403 y llego ${estado}`);
  });

  console.log('\n----------------------------------------------------------------');
  console.log(`  Ejecutadas: ${exitosas + fallidas}   Pasan: ${exitosas}   Fallan: ${fallidas}`);
  console.log('----------------------------------------------------------------');

  await pool.end();
  if (fallidas > 0) {
    console.error('\nHU-21 NO aprobada.');
    process.exitCode = 1;
  } else {
    console.log('\nHU-21 Aprobada al 100%.');
  }
}

if (require.main === module) {
  ejecutarPruebas().catch((error) => {
    console.error('Error al correr pruebas de socio:', error);
    process.exitCode = 1;
    void pool.end();
  });
}

module.exports = { ejecutarPruebas };
