/**
 * ============================================================================
 * SISTEMA DE GESTION DE GANADO
 * Pruebas de Calidad (QA) — HU-22: Restricciones de rol Colaborador
 * Responsable: Romina | Sprint 2
 * ============================================================================
 *
 * Criterios evaluados:
 *   1. El colaborador solo tiene acceso a sus datos de trabajo autorizados.
 *   2. El colaborador NO puede ver la administracion del equipo (403 Forbidden).
 *   3. El colaborador NO puede dar de alta ni suspender miembros (403 Forbidden).
 *   4. El colaborador NO puede editar ni eliminar los datos del rancho (403 Forbidden).
 * ============================================================================
 */

require('../cargar-entorno').cargarEntorno();
const assert = require('assert');
const { Pool } = require('pg');

const BASE = process.env.URL_SERVIDOR || 'http://localhost:3000';

// Colaborador de las semillas: Roberto Justiniano (Encargado de campo)
const COLABORADOR_ID = 'a1000000-0000-4000-8000-000000000004';
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

async function pedir(ruta, opciones = {}, usuarioId = COLABORADOR_ID) {
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
  console.log('  HU-22: RESTRICCIONES DE ROL COLABORADOR');
  console.log('  Responsable: Romina | Sprint 2');
  console.log('================================================================\n');

  // 1. Acceso a su propio perfil e informacion basica
  await prueba('Criterio 1: El colaborador puede consultar su propio perfil', async () => {
    const { estado, cuerpo } = await pedir('/usuarios/yo/perfil', {}, COLABORADOR_ID);
    assert.strictEqual(estado, 200);
    assert.strictEqual(cuerpo.id, COLABORADOR_ID);
    assert.strictEqual(cuerpo.rancho, 'Rancho El Cerrito');
  });

  // 2. Restricciones de administracion de equipo
  await prueba('Criterio 2: El colaborador NO puede ver el equipo del rancho (403)', async () => {
    const { estado } = await pedir('/equipo', {}, COLABORADOR_ID);
    assert.strictEqual(estado, 403, `Esperaba 403 y llego ${estado}`);
  });

  await prueba('Criterio 3: El colaborador NO puede dar de alta a otros miembros (403)', async () => {
    const { estado } = await pedir('/equipo', {
      method: 'POST',
      body: JSON.stringify({
        nombre: 'Nuevo Integrante',
        correo: `colab.alta.${Date.now()}@prueba.bo`,
        rol: 'colaborador',
        tipo_colaborador_id: '11111111-1111-4111-8111-000000000001',
      }),
    }, COLABORADOR_ID);
    assert.strictEqual(estado, 403, `Esperaba 403 y llego ${estado}`);
  });

  // 3. Restricciones sobre el rancho
  await prueba('Criterio 4: El colaborador NO puede editar datos del rancho (403)', async () => {
    const { estado } = await pedir(
      `/ranchos/${RANCHO_ID}`,
      { method: 'PATCH', body: JSON.stringify({ superficie: 999 }) },
      COLABORADOR_ID,
    );
    assert.strictEqual(estado, 403, `Esperaba 403 y llego ${estado}`);
  });

  await prueba('Criterio 4: El colaborador NO puede dar de baja el rancho (403)', async () => {
    const { estado } = await pedir(
      `/ranchos/${RANCHO_ID}`,
      { method: 'DELETE' },
      COLABORADOR_ID,
    );
    assert.strictEqual(estado, 403, `Esperaba 403 y llego ${estado}`);
  });

  console.log('\n----------------------------------------------------------------');
  console.log(`  Ejecutadas: ${exitosas + fallidas}   Pasan: ${exitosas}   Fallan: ${fallidas}`);
  console.log('----------------------------------------------------------------');

  await pool.end();
  if (fallidas > 0) {
    console.error('\nHU-22 NO aprobada.');
    process.exitCode = 1;
  } else {
    console.log('\nHU-22 Aprobada al 100%.');
  }
}

if (require.main === module) {
  ejecutarPruebas().catch((error) => {
    console.error('Error al correr pruebas de colaborador:', error);
    process.exitCode = 1;
    void pool.end();
  });
}

module.exports = { ejecutarPruebas };
