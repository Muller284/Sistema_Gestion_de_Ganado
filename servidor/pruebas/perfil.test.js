/**
 * ============================================================================
 * SISTEMA DE GESTION DE GANADO
 * Pruebas de "Mi perfil" (GET y PATCH /usuarios/yo/perfil)
 * ============================================================================
 *
 * Contra el PostgreSQL de verdad y contra el servidor levantado. Deja el
 * nombre de Carlos como estaba y borra la cuenta que crea.
 * ============================================================================
 */

require('../cargar-entorno').cargarEntorno();
const assert = require('assert');
const { randomUUID } = require('crypto');
const { Pool } = require('pg');

const BASE = process.env.URL_SERVIDOR || 'http://localhost:3000';
const CARLOS = 'a1000000-0000-4000-8000-000000000001';

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

async function pedir(ruta, opciones = {}, usuarioId) {
  const respuesta = await fetch(`${BASE}${ruta}`, {
    ...opciones,
    headers: {
      'Content-Type': 'application/json',
      ...(usuarioId ? { 'x-usuario-id': usuarioId } : {}),
    },
  });
  const cuerpo = await respuesta.json().catch(() => null);
  return { estado: respuesta.status, cuerpo };
}

const cambiarNombre = (nombre, usuarioId = CARLOS) =>
  pedir('/usuarios/yo/perfil', { method: 'PATCH', body: JSON.stringify({ nombre }) }, usuarioId);

async function ejecutarPruebas() {
  console.log('================================================================');
  console.log('  MI PERFIL');
  console.log('================================================================\n');

  const original = (await pool.query('SELECT nombre FROM usuarios WHERE id = $1', [CARLOS])).rows[0].nombre;
  const nuevo = randomUUID();

  try {
    await prueba('Devuelve mis datos con el rancho y el pais, sin el hash', async () => {
      const { estado, cuerpo } = await pedir('/usuarios/yo/perfil', {}, CARLOS);
      assert.strictEqual(estado, 200, JSON.stringify(cuerpo));
      assert.strictEqual(cuerpo.id, CARLOS);
      assert.strictEqual(cuerpo.rancho, 'Rancho El Cerrito');
      assert.ok(!('contrasena_hash' in cuerpo), 'Devuelve el hash');
    });

    await prueba('Cambia el nombre y queda como autor del cambio', async () => {
      const { estado, cuerpo } = await cambiarNombre('  Carlos G. Mendoza  ');
      assert.strictEqual(estado, 200, JSON.stringify(cuerpo));
      assert.strictEqual(cuerpo.perfil.nombre, 'Carlos G. Mendoza');
      const fila = await pool.query('SELECT modificado_por FROM usuarios WHERE id = $1', [CARLOS]);
      assert.strictEqual(fila.rows[0].modificado_por, CARLOS);
    });

    await prueba('Un nombre vacio o demasiado largo se rechaza', async () => {
      assert.strictEqual((await cambiarNombre('   ')).estado, 400);
      assert.strictEqual((await cambiarNombre('x'.repeat(151))).estado, 400);
    });

    await prueba('El correo no se cambia por aca', async () => {
      await pedir(
        '/usuarios/yo/perfil',
        { method: 'PATCH', body: JSON.stringify({ nombre: 'Carlos', correo: 'otro@correo.bo' }) },
        CARLOS,
      );
      const fila = await pool.query('SELECT correo FROM usuarios WHERE id = $1', [CARLOS]);
      assert.strictEqual(fila.rows[0].correo, 'carlos.gutierrez@elcerrito.bo');
    });

    await prueba('Con el correo sin confirmar no se edita nada', async () => {
      const registro = await pedir('/usuarios/registro', {
        method: 'POST',
        body: JSON.stringify({
          id: nuevo,
          nombre: 'Sin Confirmar',
          correo: `perfil.${Date.now()}@prueba.bo`,
          contrasena: 'Ganado2026',
          pais_codigo: 'BO',
        }),
      });
      assert.strictEqual(registro.estado, 201, JSON.stringify(registro.cuerpo));
      const { estado } = await cambiarNombre('Otro nombre', nuevo);
      assert.strictEqual(estado, 403);
    });
  } finally {
    await pool.query('UPDATE usuarios SET nombre = $2 WHERE id = $1', [CARLOS, original]);
    await pool.query('DELETE FROM tokens WHERE usuario_id = $1', [nuevo]);
    await pool.query('DELETE FROM usuarios WHERE id = $1', [nuevo]);
  }

  console.log('\n----------------------------------------------------------------');
  console.log(`  Ejecutadas: ${exitosas + fallidas}   Pasan: ${exitosas}   Fallan: ${fallidas}`);
  console.log('----------------------------------------------------------------');

  await pool.end();
  if (fallidas > 0) {
    console.error('\nMi perfil no se aprueba.');
    process.exitCode = 1;
  } else {
    console.log('\nMi perfil funciona.');
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
