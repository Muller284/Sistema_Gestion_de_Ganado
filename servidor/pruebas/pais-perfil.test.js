/**
 * ============================================================================
 * SISTEMA DE GESTION DE GANADO
 * Pruebas de HU-14, criterio 2: el pais se cambia despues desde Mi perfil
 * Responsable: Brian | Sprint 2
 * ============================================================================
 *
 * Contra el PostgreSQL de verdad y contra el servidor levantado.
 *   - El pais se cambia con PATCH /usuarios/yo/perfil { pais_codigo }.
 *   - Un pais que no existe se rechaza (400).
 *   - El idioma sigue al pais: al pasar a Estados Unidos queda en ingles,
 *     aunque antes se hubiera elegido otro (HU-25).
 *   - Si en el mismo pedido se elige un idioma, ese es el que queda.
 *   - Un pais_codigo vacio no borra el pais.
 *
 * Usa un usuario propio, creado y borrado por la prueba.
 * ============================================================================
 */

require('../cargar-entorno').cargarEntorno();
const assert = require('assert');
const { Pool } = require('pg');

const BASE = process.env.URL_SERVIDOR || 'http://localhost:3000';

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

async function pedir(metodo, ruta, cuerpo, usuarioId) {
  const respuesta = await fetch(`${BASE}${ruta}`, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      ...(usuarioId ? { 'x-usuario-id': usuarioId } : {}),
    },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  return { estado: respuesta.status, cuerpo: await respuesta.json().catch(() => null) };
}

async function ejecutarPruebas() {
  console.log('================================================================');
  console.log('  HU-14: CAMBIAR EL PAIS DESDE MI PERFIL');
  console.log('  Responsable: Brian | Sprint 2');
  console.log('================================================================\n');

  const registro = await pedir('POST', '/usuarios/registro', {
    nombre: 'Prueba Pais',
    correo: `brian.pais.${Date.now()}@ejemplo.com`,
    contrasena: 'Ganado2026',
    pais_codigo: 'BO',
  });
  if (registro.estado !== 201) {
    throw new Error(`No se pudo crear el usuario de prueba: ${JSON.stringify(registro.cuerpo)}`);
  }
  const yo = registro.cuerpo.usuario.id;
  await pool.query('UPDATE usuarios SET correo_verificado = TRUE WHERE id = $1', [yo]);
  const cambiar = (datos) => pedir('PATCH', '/usuarios/yo/perfil', datos, yo);

  try {
    await prueba('Empieza en Bolivia y en español', async () => {
      const { cuerpo } = await pedir('GET', '/usuarios/yo/perfil', undefined, yo);
      assert.strictEqual(cuerpo.pais_codigo, 'BO');
      assert.strictEqual(cuerpo.idioma, 'es');
    });

    await prueba('Criterio 2: el pais se cambia desde Mi perfil', async () => {
      const { estado, cuerpo } = await cambiar({ pais_codigo: 'py' });
      assert.strictEqual(estado, 200, JSON.stringify(cuerpo));
      assert.strictEqual(cuerpo.perfil.pais_codigo, 'PY');
      const fila = await pool.query('SELECT pais_codigo, modificado_por FROM usuarios WHERE id = $1', [yo]);
      assert.strictEqual(fila.rows[0].pais_codigo, 'PY');
      assert.strictEqual(fila.rows[0].modificado_por, yo);
    });

    await prueba('Un pais que no existe se rechaza y no cambia nada', async () => {
      const { estado } = await cambiar({ pais_codigo: 'ZZ' });
      assert.strictEqual(estado, 400);
      const fila = await pool.query('SELECT pais_codigo FROM usuarios WHERE id = $1', [yo]);
      assert.strictEqual(fila.rows[0].pais_codigo, 'PY');
    });

    await prueba('El idioma sigue al pais: en Estados Unidos queda en ingles', async () => {
      // Aunque antes haya elegido un idioma a mano.
      await cambiar({ idioma: 'es' });
      const { estado, cuerpo } = await cambiar({ pais_codigo: 'US' });
      assert.strictEqual(estado, 200, JSON.stringify(cuerpo));
      assert.strictEqual(cuerpo.perfil.idioma, 'en');
      assert.strictEqual(cuerpo.perfil.idioma_elegido, null);
    });

    await prueba('Si en el mismo pedido se elige idioma, ese es el que queda', async () => {
      const { cuerpo } = await cambiar({ pais_codigo: 'US', idioma: 'es' });
      assert.strictEqual(cuerpo.perfil.pais_codigo, 'US');
      assert.strictEqual(cuerpo.perfil.idioma, 'es');
    });

    await prueba('Al volver a un pais de habla hispana, vuelve el español', async () => {
      const { cuerpo } = await cambiar({ pais_codigo: 'BO' });
      assert.strictEqual(cuerpo.perfil.idioma, 'es');
    });

    await prueba('Mandar pais_codigo vacio no borra el pais', async () => {
      await cambiar({ nombre: 'Prueba Pais', pais_codigo: '' });
      await cambiar({ pais_codigo: '   ' });
      const fila = await pool.query('SELECT pais_codigo FROM usuarios WHERE id = $1', [yo]);
      assert.strictEqual(fila.rows[0].pais_codigo, 'BO');
    });

    await prueba('Solo un pais_codigo vacio no es un cambio (400)', async () => {
      assert.strictEqual((await cambiar({ pais_codigo: '' })).estado, 400);
    });
  } finally {
    await pool.query('DELETE FROM tokens WHERE usuario_id = $1', [yo]);
    await pool.query('DELETE FROM usuarios WHERE id = $1', [yo]);
  }

  console.log('\n----------------------------------------------------------------');
  console.log(`  Ejecutadas: ${exitosas + fallidas}   Pasan: ${exitosas}   Fallan: ${fallidas}`);
  console.log('----------------------------------------------------------------');

  await pool.end();

  if (fallidas > 0) {
    console.error('\nHU-14 no se aprueba.');
    process.exitCode = 1;
  } else {
    console.log('\nHU-14 permite cambiar el pais desde Mi perfil.');
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
