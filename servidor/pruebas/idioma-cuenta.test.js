/**
 * ============================================================================
 * SISTEMA DE GESTION DE GANADO
 * Pruebas de HU-25 (Interfaz en español e inglés) contra el servidor
 * ============================================================================
 *
 *   - El servidor contesta en el idioma que pide el cliente (Accept-Language).
 *   - El idioma de la cuenta sale del país; si no tiene país propio, del país
 *     de su rancho (criterio 2).
 *   - Se puede elegir otro idioma y volver al del país (criterio 2).
 *   - Solo se aceptan idiomas que existen como archivo (criterio 3).
 *
 * Lo que cambia, lo deja como estaba.
 * ============================================================================
 */

require('../cargar-entorno').cargarEntorno();
const assert = require('assert');
const { Pool } = require('pg');

const BASE = process.env.URL_SERVIDOR || 'http://localhost:3000';

const PROPIETARIO_A = 'a1000000-0000-4000-8000-000000000001'; // Bolivia
const COLABORADOR_B = 'b1000000-0000-4000-8000-000000000004'; // sin pais propio, rancho B
const RANCHO_B = 'b0000000-0000-4000-8000-000000000002';

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

async function pedir(ruta, { metodo = 'GET', datos, usuario, idioma } = {}) {
  const respuesta = await fetch(`${BASE}${ruta}`, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      ...(usuario ? { 'x-usuario-id': usuario } : {}),
      ...(idioma ? { 'Accept-Language': idioma } : {}),
    },
    body: datos ? JSON.stringify(datos) : undefined,
  });
  const cuerpo = await respuesta.json().catch(() => null);
  return { estado: respuesta.status, cuerpo };
}

async function ejecutarPruebas() {
  console.log('================================================================');
  console.log('  HU-25 IDIOMA DE LA CUENTA Y DE LOS MENSAJES');
  console.log('================================================================\n');

  const paisDeB = (await pool.query('SELECT pais_codigo FROM ranchos WHERE id = $1', [RANCHO_B])).rows[0]
    .pais_codigo;

  try {
    await prueba('Sin Accept-Language, el servidor contesta en español', async () => {
      const { cuerpo } = await pedir('/usuarios/ingreso', {
        metodo: 'POST',
        datos: { correo: 'nadie@prueba.bo', contrasena: 'Cualquiera123' },
      });
      assert.match(cuerpo.message, /Correo o contraseña incorrectos/);
    });

    await prueba('Con Accept-Language en, contesta en inglés', async () => {
      const { cuerpo } = await pedir('/usuarios/ingreso', {
        metodo: 'POST',
        idioma: 'en-US,en;q=0.9',
        datos: { correo: 'nadie@prueba.bo', contrasena: 'Cualquiera123' },
      });
      assert.match(cuerpo.message, /incorrect/i);
    });

    await prueba('Un idioma que no existe cae en español', async () => {
      const { cuerpo } = await pedir('/usuarios/ingreso', {
        metodo: 'POST',
        idioma: 'xx',
        datos: { correo: 'nadie@prueba.bo', contrasena: 'Cualquiera123' },
      });
      assert.match(cuerpo.message, /Correo o contraseña incorrectos/);
    });

    await prueba('El idioma de la cuenta sale de su país', async () => {
      const { cuerpo } = await pedir('/usuarios/yo', { usuario: PROPIETARIO_A });
      assert.strictEqual(cuerpo.idioma, 'es');
      assert.strictEqual(cuerpo.idioma_elegido, null);
    });

    await prueba('Sin país propio, sale del país de su rancho', async () => {
      await pool.query("UPDATE ranchos SET pais_codigo = 'US' WHERE id = $1", [RANCHO_B]);
      const { cuerpo } = await pedir('/usuarios/yo', { usuario: COLABORADOR_B });
      assert.strictEqual(cuerpo.idioma, 'en');
    });

    await prueba('Se puede elegir otro idioma', async () => {
      const { estado, cuerpo } = await pedir('/usuarios/yo/perfil', {
        metodo: 'PATCH',
        usuario: PROPIETARIO_A,
        datos: { idioma: 'en' },
      });
      assert.strictEqual(estado, 200, JSON.stringify(cuerpo));
      assert.strictEqual(cuerpo.perfil.idioma, 'en');
      assert.match(cuerpo.mensaje, /English/, 'El aviso no salió en el idioma nuevo');
      const yo = await pedir('/usuarios/yo', { usuario: PROPIETARIO_A });
      assert.strictEqual(yo.cuerpo.idioma, 'en');
      assert.strictEqual(yo.cuerpo.idioma_elegido, 'en');
    });

    await prueba('Y volver al del país', async () => {
      const { cuerpo } = await pedir('/usuarios/yo/perfil', {
        metodo: 'PATCH',
        usuario: PROPIETARIO_A,
        datos: { idioma: null },
      });
      assert.strictEqual(cuerpo.perfil.idioma, 'es');
      assert.strictEqual(cuerpo.perfil.idioma_elegido, null);
    });

    await prueba('Solo se aceptan idiomas que existen', async () => {
      const { estado } = await pedir('/usuarios/yo/perfil', {
        metodo: 'PATCH',
        usuario: PROPIETARIO_A,
        datos: { idioma: 'klingon' },
      });
      assert.strictEqual(estado, 400);
    });

    await prueba('Cambiar el idioma no toca el nombre', async () => {
      const antes = await pool.query('SELECT nombre FROM usuarios WHERE id = $1', [PROPIETARIO_A]);
      await pedir('/usuarios/yo/perfil', { metodo: 'PATCH', usuario: PROPIETARIO_A, datos: { idioma: 'es' } });
      const despues = await pool.query('SELECT nombre FROM usuarios WHERE id = $1', [PROPIETARIO_A]);
      assert.strictEqual(despues.rows[0].nombre, antes.rows[0].nombre);
    });
  } finally {
    await pool.query('UPDATE ranchos SET pais_codigo = $2 WHERE id = $1', [RANCHO_B, paisDeB]);
    await pool.query('UPDATE usuarios SET idioma = NULL WHERE id = $1', [PROPIETARIO_A]);
  }

  console.log('\n----------------------------------------------------------------');
  console.log(`  Ejecutadas: ${exitosas + fallidas}   Pasan: ${exitosas}   Fallan: ${fallidas}`);
  console.log('----------------------------------------------------------------');

  await pool.end();

  if (fallidas > 0) {
    console.error('\nHU-25 no se aprueba.');
    process.exitCode = 1;
  } else {
    console.log('\nHU-25 cumple sus criterios del lado del servidor.');
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
