/**
 * ============================================================================
 * SISTEMA DE GESTION DE GANADO
 * Pruebas de HU-18, criterio 1: un usuario recién creado no hace nada
 * Responsable: Aaron | Sprint 3
 * ============================================================================
 *
 * Decisión del equipo (27/10): un usuario no puede crear, editar ni eliminar
 * nada cuando recién es creado; cuando ya tiene su rol asignado puede hacer lo
 * que su rol le permite.
 *
 * Cómo lo cumple el sistema, sin una bandera nueva:
 *   - Al darlo de alta (HU-17) queda con contraseña temporal y la obligación
 *     de cambiarla. Mientras no la cambie, GuardiaCuentaLista le cierra todo
 *     lo que no sea su propia cuenta (HU-10): no crea, no edita, no elimina.
 *   - Un colaborador no se puede crear sin tipo, y el tipo es su rol: al
 *     terminar de entrar ya tiene asignado lo que puede ver y editar.
 *   - Después actúa según su rol: un encargado de campo crea animales, pero
 *     dar de baja sigue siendo solo del propietario y del Admin (criterio 3).
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
const RANCHO_A = 'a0000000-0000-4000-8000-000000000001';
const ENCARGADO_DE_CAMPO = '11111111-1111-4111-8111-000000000002';

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

function bloqueado({ estado, cuerpo }) {
  assert.strictEqual(estado, 403, JSON.stringify(cuerpo));
  assert.strictEqual(cuerpo.motivo, 'debe_cambiar_contrasena', JSON.stringify(cuerpo));
}

async function ejecutarPruebas() {
  console.log('================================================================');
  console.log('  HU-18 CRITERIO 1: UN USUARIO RECIEN CREADO');
  console.log('================================================================\n');

  const nuevo = randomUUID();
  try {
    const alta = await pedir('POST', '/equipo', {
      id: nuevo,
      nombre: `Nuevo ${MARCA}`,
      correo: `nuevo.${MARCA}@prueba.bo`,
      rol: 'colaborador',
      tipo_colaborador_id: ENCARGADO_DE_CAMPO,
    });
    assert.strictEqual(alta.estado, 201, JSON.stringify(alta.cuerpo));

    // Un animal del rancho, para probar editar y eliminar.
    const existente = await pedir('POST', '/animales', {
      identificador: `N1-${MARCA}`,
      sexo: 'hembra',
      categoria_codigo: 'vaca',
    });
    assert.strictEqual(existente.estado, 201, JSON.stringify(existente.cuerpo));
    const animalId = existente.cuerpo.animal.id;

    await prueba('Recién creado: no puede crear', async () => {
      bloqueado(
        await pedir('POST', '/animales', { identificador: `N2-${MARCA}`, sexo: 'macho' }, nuevo),
      );
      bloqueado(await pedir('POST', '/corrales', { nombre: `Corral ${MARCA}` }, nuevo));
    });

    await prueba('Recién creado: no puede editar', async () => {
      bloqueado(
        await pedir(
          'POST',
          `/animales/${animalId}/estado`,
          { estado: 'vendido', motivo: 'x' },
          nuevo,
        ),
      );
      bloqueado(
        await pedir(
          'POST',
          '/masivo/animales/estado',
          { animal_ids: [animalId], estado: 'vendido', motivo: 'x' },
          nuevo,
        ),
      );
    });

    await prueba('Recién creado: no puede eliminar', async () => {
      bloqueado(await pedir('DELETE', `/animales/${animalId}`, undefined, nuevo));
    });

    await prueba('Recién creado: nada cambió en el rancho', async () => {
      const filas = await pool.query(
        `SELECT estado, eliminado_en FROM animales WHERE rancho_id = $1 AND identificador LIKE $2`,
        [RANCHO_A, `%${MARCA}%`],
      );
      assert.strictEqual(filas.rowCount, 1);
      assert.strictEqual(filas.rows[0].estado, 'activo');
      assert.strictEqual(filas.rows[0].eliminado_en, null);
    });

    // Cambia su contraseña temporal (HU-10): queda con su rol asignado.
    await pool.query('UPDATE usuarios SET debe_cambiar_contrasena = FALSE WHERE id = $1', [nuevo]);

    await prueba('Con su rol asignado: hace lo que su tipo permite (crea y edita animales)', async () => {
      const creado = await pedir(
        'POST',
        '/animales',
        { identificador: `N2-${MARCA}`, sexo: 'macho', categoria_codigo: 'toro' },
        nuevo,
      );
      assert.strictEqual(creado.estado, 201, JSON.stringify(creado.cuerpo));
      const editado = await pedir(
        'POST',
        `/animales/${animalId}/estado`,
        { estado: 'vendido', motivo: `Venta ${MARCA}` },
        nuevo,
      );
      assert.strictEqual(editado.estado, 201, JSON.stringify(editado.cuerpo));
    });

    await prueba('Con su rol asignado: lo que su rol no permite sigue cerrado (dar de baja)', async () => {
      const { estado } = await pedir('DELETE', `/animales/${animalId}`, undefined, nuevo);
      assert.strictEqual(estado, 403);
    });
  } finally {
    await pool.query(`DELETE FROM animales WHERE rancho_id = $1 AND identificador LIKE $2`, [
      RANCHO_A,
      `%${MARCA}%`,
    ]);
    await pool.query(`DELETE FROM corrales WHERE rancho_id = $1 AND nombre LIKE $2`, [RANCHO_A, `%${MARCA}%`]);
    await pool.query('DELETE FROM sesiones WHERE usuario_id = $1', [nuevo]);
    await pool.query('DELETE FROM tokens WHERE usuario_id = $1', [nuevo]);
    await pool.query('DELETE FROM usuarios WHERE id = $1', [nuevo]);
  }

  console.log('\n----------------------------------------------------------------');
  console.log(`  Ejecutadas: ${exitosas + fallidas}   Pasan: ${exitosas}   Fallan: ${fallidas}`);
  console.log('----------------------------------------------------------------');

  await pool.end();

  if (fallidas > 0) {
    console.error('\nHU-18 criterio 1 no se cumple.');
    process.exitCode = 1;
  } else {
    console.log('\nHU-18 criterio 1 se cumple.');
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
