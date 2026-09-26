/**
 * ============================================================================
 * SISTEMA DE GESTION DE GANADO
 * Pruebas de HU-08 (Inicio de sesión) y HU-12 (Manejo de sesión y cierre)
 * Responsable: Favio | Módulo: M1 (Autenticación y acceso)
 * ============================================================================
 *
 * Criterios cubiertos:
 * HU-08:
 *   1. Si las credenciales son correctas entra al sistema.
 *   2. Si no lo son, el mensaje no revela si el error fue correo o contraseña.
 *   3. Las contraseñas se guardan con función de hash (scrypt), nunca en texto plano.
 *
 * HU-12:
 *   1. La sesión expira tras 30 días sin actividad.
 *   2. El cierre de sesión manual invalida la sesión de inmediato.
 *   3. La sesión usa un token firmado de vida corta más un token de refresco revocable.
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
const creados = [];

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

async function pedir(ruta, opciones = {}, authHeader) {
  const respuesta = await fetch(`${BASE}${ruta}`, {
    ...opciones,
    headers: {
      'Content-Type': 'application/json',
      ...(authHeader ? { Authorization: `Bearer ${authHeader}` } : {}),
      ...(opciones.headers ?? {}),
    },
  });
  const cuerpo = await respuesta.json().catch(() => null);
  return { estado: respuesta.status, cuerpo };
}

async function ejecutarPruebas() {
  console.log('================================================================');
  console.log('  HU-08 INICIO DE SESIÓN · HU-12 MANEJO DE SESIÓN Y CIERRE');
  console.log('================================================================\n');

  // Preparar usuario de prueba
  const correoPrueba = `favio.auth.${Date.now()}@ejemplo.com`;
  const contrasenaPrueba = 'Ganado2026';
  let usuarioId = null;

  const resRegistro = await pedir('/usuarios/registro', {
    method: 'POST',
    body: JSON.stringify({
      nombre: 'Favio Tester',
      correo: correoPrueba,
      contrasena: contrasenaPrueba,
      pais_codigo: 'BO',
    }),
  });

  if (resRegistro.estado === 201) {
    usuarioId = resRegistro.cuerpo.usuario.id;
    creados.push(usuarioId);
  } else {
    console.error('No se pudo crear el usuario de prueba para HU-08/HU-12:', resRegistro.cuerpo);
    return;
  }

  // ==========================================================================
  // HU-08: Inicio de sesión
  // ==========================================================================
  console.log('  HU-08: Inicio de sesión');

  await prueba(
    'Criterio 2: Correo inexistente da error genérico sin revelar motivo',
    async () => {
      const { estado, cuerpo } = await pedir('/usuarios/ingreso', {
        method: 'POST',
        body: JSON.stringify({
          correo: 'no_existo@ejemplo.com',
          contrasena: 'Cualquiera123',
        }),
      });
      assert.strictEqual(estado, 401);
      assert.strictEqual(cuerpo.message, 'Correo o contraseña incorrectos.');
    },
  );

  await prueba(
    'Criterio 2: Contraseña incorrecta da el mismo error genérico',
    async () => {
      const { estado, cuerpo } = await pedir('/usuarios/ingreso', {
        method: 'POST',
        body: JSON.stringify({
          correo: correoPrueba,
          contrasena: 'ClaveEquivocada1',
        }),
      });
      assert.strictEqual(estado, 401);
      assert.strictEqual(cuerpo.message, 'Correo o contraseña incorrectos.');
    },
  );

  await prueba(
    'Criterio 3: La contraseña se guarda con función de hash (scrypt), nunca en texto plano',
    async () => {
      const res = await pool.query(
        'SELECT contrasena_hash FROM usuarios WHERE id = $1',
        [usuarioId],
      );
      const hash = res.rows[0]?.contrasena_hash;
      assert.ok(hash, 'No se encontró la fila en usuarios');
      assert.ok(
        hash.startsWith('scrypt$'),
        `El hash no usa el algoritmo scrypt: ${hash}`,
      );
      assert.ok(
        !hash.includes(contrasenaPrueba),
        'La contraseña se encuentra en texto plano dentro del hash',
      );
    },
  );

  let tokensIngreso = null;

  await prueba(
    'Criterio 1: Credenciales correctas permiten entrar al sistema y devuelven tokens',
    async () => {
      const { estado, cuerpo } = await pedir('/usuarios/ingreso', {
        method: 'POST',
        body: JSON.stringify({
          correo: correoPrueba,
          contrasena: contrasenaPrueba,
        }),
      });
      assert.strictEqual(estado, 201);
      assert.ok(cuerpo.token_acceso, 'Falta token_acceso');
      assert.ok(cuerpo.token_refresco, 'Falta token_refresco');
      assert.ok(cuerpo.expira_en, 'Falta expira_en');
      assert.strictEqual(cuerpo.usuario.correo, correoPrueba);
      tokensIngreso = cuerpo;
    },
  );

  // ==========================================================================
  // HU-12: Manejo de sesión
  // ==========================================================================
  console.log('\n  HU-12: Manejo de sesión');

  await prueba(
    'Criterio 3: El token firmado de vida corta permite consumir endpoints protegidos',
    async () => {
      const { estado, cuerpo } = await pedir(
        '/usuarios/yo',
        { method: 'GET' },
        tokensIngreso.token_acceso,
      );
      assert.strictEqual(estado, 200);
      assert.strictEqual(cuerpo.correo, correoPrueba);
      assert.strictEqual(cuerpo.id, usuarioId);
    },
  );

  await prueba(
    'Criterio 1: La sesión registrada en la base de datos expira en ~30 días',
    async () => {
      const res = await pool.query(
        'SELECT expira_en, creado_en FROM sesiones WHERE usuario_id = $1 AND revocada_en IS NULL ORDER BY creado_en DESC LIMIT 1',
        [usuarioId],
      );
      assert.ok(res.rows[0], 'No se encontró registro en tabla sesiones');
      const expiraEn = new Date(res.rows[0].expira_en).getTime();
      const creadoEn = new Date(res.rows[0].creado_en).getTime();
      const dias = (expiraEn - creadoEn) / (1000 * 60 * 60 * 24);
      assert.ok(
        Math.round(dias) === 30,
        `Se esperaba expiración a 30 días pero fue de ${dias} días`,
      );
    },
  );

  let nuevosTokens = null;

  await prueba(
    'Criterio 3: El token de refresco permite renovar la sesión y obtener un nuevo token de acceso',
    async () => {
      const { estado, cuerpo } = await pedir('/usuarios/refresco', {
        method: 'POST',
        body: JSON.stringify({
          token_refresco: tokensIngreso.token_refresco,
        }),
      });
      assert.strictEqual(estado, 201);
      assert.ok(cuerpo.token_acceso, 'No devolvió nuevo token_acceso');
      assert.strictEqual(cuerpo.token_refresco, tokensIngreso.token_refresco);
      nuevosTokens = cuerpo;
    },
  );

  await prueba(
    'Criterio 2: Cierre de sesión manual invalida la sesión de inmediato',
    async () => {
      const { estado, cuerpo } = await pedir('/usuarios/cierre', {
        method: 'POST',
        body: JSON.stringify({
          token_refresco: nuevosTokens.token_refresco,
        }),
      });
      assert.strictEqual(estado, 201);
      assert.strictEqual(cuerpo.mensaje, 'Sesión cerrada correctamente.');

      // Verificar en la BD que revocada_en tiene marca de tiempo
      const res = await pool.query(
        'SELECT revocada_en FROM sesiones WHERE usuario_id = $1 ORDER BY creado_en DESC LIMIT 1',
        [usuarioId],
      );
      assert.ok(
        res.rows[0]?.revocada_en,
        'La sesión no tiene marca revocada_en en la base de datos',
      );
    },
  );

  await prueba(
    'Criterio 2: Tras el cierre de sesión, el token de refresco es rechazado',
    async () => {
      const { estado, cuerpo } = await pedir('/usuarios/refresco', {
        method: 'POST',
        body: JSON.stringify({
          token_refresco: nuevosTokens.token_refresco,
        }),
      });
      assert.strictEqual(estado, 401);
      assert.ok(
        cuerpo.message.includes('revocada'),
        `Mensaje inesperado: ${cuerpo.message}`,
      );
    },
  );

  // Limpieza de datos de prueba
  if (usuarioId) {
    await pool.query('DELETE FROM sesiones WHERE usuario_id = $1', [usuarioId]);
    await pool.query('DELETE FROM tokens WHERE usuario_id = $1', [usuarioId]);
    await pool.query('DELETE FROM usuarios WHERE id = $1', [usuarioId]);
  }

  await pool.end();

  console.log('\n----------------------------------------------------------------');
  console.log(`Resultado: ${exitosas} pasaron, ${fallidas} fallaron.`);
  console.log('----------------------------------------------------------------\n');
  if (fallidas > 0) process.exitCode = 1;
}

ejecutarPruebas().catch((e) => {
  console.error('Error fatal corriendo pruebas:', e);
  process.exit(1);
});
