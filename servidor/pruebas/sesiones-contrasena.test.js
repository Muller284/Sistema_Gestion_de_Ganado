/**
 * ============================================================================
 * SISTEMA DE GESTION DE GANADO
 * Pruebas de HU-09, criterio 3: al cambiar la contraseña se cierran las
 * sesiones abiertas.
 * Responsable: Brian | Sprint 2
 * ============================================================================
 *
 * Contra el PostgreSQL de verdad y contra el servidor levantado. Los tres
 * caminos que cambian una contraseña tienen que dejar inservible el token de
 * refresco viejo (401):
 *   1. Recuperar la contraseña con el enlace del correo.
 *   2. Cambiarla uno mismo desde Mi perfil.
 *   3. Que el propietario la restablezca.
 *
 * El enlace de recuperacion solo viaja por correo, asi que la prueba guarda
 * un token propio en la tabla tokens con la misma huella SHA-256 que usa
 * RepositorioToken.
 *
 * Lo que crea, lo borra al terminar.
 * ============================================================================
 */

require('../cargar-entorno').cargarEntorno();
const assert = require('assert');
const { createHash, randomBytes, randomUUID } = require('crypto');
const { Pool } = require('pg');

const BASE = process.env.URL_SERVIDOR || 'http://localhost:3000';
const PROPIETARIO_A = 'a1000000-0000-4000-8000-000000000001';
const RANCHO_A = 'a0000000-0000-4000-8000-000000000001';
const TIPO_CAMPO = '11111111-1111-4111-8111-000000000002';

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

async function pedir(ruta, cuerpo, cabeceras = {}) {
  const respuesta = await fetch(`${BASE}${ruta}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...cabeceras },
    body: JSON.stringify(cuerpo ?? {}),
  });
  return { estado: respuesta.status, cuerpo: await respuesta.json().catch(() => null) };
}

async function ingresar(correo, contrasena) {
  const { estado, cuerpo } = await pedir('/usuarios/ingreso', { correo, contrasena });
  assert.ok(estado === 200 || estado === 201, `no pudo entrar: ${JSON.stringify(cuerpo)}`);
  assert.ok(cuerpo.token_refresco, 'el ingreso no devolvio token_refresco');
  return cuerpo;
}

async function refrescar(tokenRefresco) {
  return (await pedir('/usuarios/refresco', { token_refresco: tokenRefresco })).estado;
}

async function ejecutarPruebas() {
  console.log('================================================================');
  console.log('  HU-09: AL CAMBIAR LA CONTRASEÑA SE CIERRAN LAS SESIONES');
  console.log('  Responsable: Brian | Sprint 2');
  console.log('================================================================\n');

  const correo = `brian.sesiones.${Date.now()}@ejemplo.com`;
  let clave = 'Ganado2026';
  const registro = await pedir('/usuarios/registro', {
    nombre: 'Prueba Sesiones',
    correo,
    contrasena: clave,
    pais_codigo: 'BO',
  });
  if (registro.estado !== 201) {
    throw new Error(`No se pudo crear el usuario de prueba: ${JSON.stringify(registro.cuerpo)}`);
  }
  const usuarioId = registro.cuerpo.usuario.id;
  await pool.query('UPDATE usuarios SET correo_verificado = TRUE WHERE id = $1', [usuarioId]);

  try {
    await prueba('Antes de cambiar nada, el token de refresco sirve', async () => {
      const sesion = await ingresar(correo, clave);
      assert.strictEqual(await refrescar(sesion.token_refresco), 201);
    });

    await prueba('Criterio 3, al recuperarla: el refresco viejo responde 401', async () => {
      const sesion = await ingresar(correo, clave);
      const token = randomBytes(32).toString('base64url');
      await pool.query(
        `INSERT INTO tokens (id, usuario_id, tipo, token_hash, expira_en, creado_por, modificado_por)
         VALUES ($1, $2, 'recuperacion_contrasena', $3, CURRENT_TIMESTAMP + INTERVAL '1 hour', $2, $2)`,
        [randomUUID(), usuarioId, createHash('sha256').update(token).digest('hex')],
      );
      const nueva = 'Recuperada2026';
      const { estado, cuerpo } = await pedir('/usuarios/recuperacion-contrasena/ejecutar', {
        token,
        contrasena_nueva: nueva,
      });
      assert.ok(estado === 200 || estado === 201, JSON.stringify(cuerpo));
      clave = nueva;
      assert.strictEqual(await refrescar(sesion.token_refresco), 401);
    });

    await prueba('Criterio 3, al cambiarla uno mismo: el refresco viejo responde 401', async () => {
      const sesion = await ingresar(correo, clave);
      const nueva = 'Cambiada2026';
      const { estado, cuerpo } = await pedir(
        '/usuarios/mi-contrasena',
        { contrasena_actual: clave, contrasena_nueva: nueva },
        { Authorization: `Bearer ${sesion.token_acceso}` },
      );
      assert.ok(estado === 200 || estado === 201, JSON.stringify(cuerpo));
      clave = nueva;
      assert.strictEqual(await refrescar(sesion.token_refresco), 401);
    });

    await prueba('Con la clave nueva se vuelve a entrar sin problema', async () => {
      const sesion = await ingresar(correo, clave);
      assert.strictEqual(await refrescar(sesion.token_refresco), 201);
    });

    await prueba('Criterio 3, cuando el propietario la restablece: el refresco viejo responde 401', async () => {
      await pool.query(
        `UPDATE usuarios SET rancho_id = $2, rol = 'colaborador', tipo_colaborador_id = $3 WHERE id = $1`,
        [usuarioId, RANCHO_A, TIPO_CAMPO],
      );
      const sesion = await ingresar(correo, clave);
      const { estado, cuerpo } = await pedir(
        `/usuarios/${usuarioId}/restablecer-contrasena`,
        {},
        { 'x-usuario-id': PROPIETARIO_A },
      );
      assert.ok(estado === 200 || estado === 201, JSON.stringify(cuerpo));
      assert.strictEqual(await refrescar(sesion.token_refresco), 401);
    });
  } finally {
    await pool.query('DELETE FROM sesiones WHERE usuario_id = $1', [usuarioId]);
    await pool.query('DELETE FROM tokens WHERE usuario_id = $1', [usuarioId]);
    await pool.query('DELETE FROM usuarios WHERE id = $1', [usuarioId]);
  }

  console.log('\n----------------------------------------------------------------');
  console.log(`  Ejecutadas: ${exitosas + fallidas}   Pasan: ${exitosas}   Fallan: ${fallidas}`);
  console.log('----------------------------------------------------------------');

  await pool.end();

  if (fallidas > 0) {
    console.error('\nHU-09 no se aprueba.');
    process.exitCode = 1;
  } else {
    console.log('\nHU-09 cierra las sesiones en los tres casos.');
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
