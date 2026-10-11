/**
 * ============================================================================
 * SISTEMA DE GESTION DE GANADO
 * Pruebas de HU-07 (verificacion de correo) y HU-10 (cambio obligatorio)
 * ============================================================================
 *
 * Contra el PostgreSQL de verdad y contra el servidor levantado.
 *
 * Requisitos:
 *   1. docker compose up -d postgres
 *   2. npm run migrar && npm run sembrar
 *   3. El servidor corriendo (npm run iniciar)
 * ============================================================================
 */

require('../cargar-entorno').cargarEntorno();
const assert = require('assert');
const { Pool } = require('pg');

const BASE = process.env.URL_SERVIDOR || 'http://localhost:3000';

// Cuentas de las semillas
const PROPIETARIO_A = 'a1000000-0000-4000-8000-000000000001'; // verificado y al dia
const SIN_VERIFICAR = 'c1000000-0000-4000-8000-000000000002'; // Lucia, HU-07
const CON_TEMPORAL = 'c1000000-0000-4000-8000-000000000003'; // Ruben, HU-10
const CORREO_SIN_VERIFICAR = 'lucia.mendez@correo.bo';
const CLAVE_TEMPORAL = 'Temporal2026';

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

async function pedir(ruta, opciones = {}, usuarioId) {
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

function tokenDelEnlace(enlace) {
  return new URL(enlace).hash.split('token=')[1];
}

async function ejecutarPruebas() {
  console.log('================================================================');
  console.log('  HU-07 VERIFICACION DE CORREO · HU-10 CAMBIO DE CONTRASEÑA');
  console.log('================================================================\n');

  // ==========================================================================
  // HU-07
  // ==========================================================================
  console.log('  HU-07');

  let enlaceDeLucia = null;

  await prueba('El registro emite un enlace de verificacion', async () => {
    const correo = `hu07.${Date.now()}@ejemplo.com`;
    const { estado, cuerpo } = await pedir('/usuarios/registro', {
      method: 'POST',
      body: JSON.stringify({
        nombre: 'Persona de prueba',
        correo,
        contrasena: 'Ganado2026',
        pais_codigo: 'BO',
      }),
    });
    assert.strictEqual(estado, 201);
    creados.push(cuerpo.usuario.id);
    assert.strictEqual(cuerpo.usuario.correo_verificado, false, 'nace sin verificar');
    assert.ok(cuerpo.enlace_verificacion, 'no devolvio el enlace');
    assert.ok(cuerpo.enlace_verificacion.includes('#/verificar?token='));
  });

  await prueba('El token se guarda solo como huella, nunca en claro', async () => {
    const correo = `hu07.huella.${Date.now()}@ejemplo.com`;
    const { cuerpo } = await pedir('/usuarios/registro', {
      method: 'POST',
      body: JSON.stringify({
        nombre: 'Persona de prueba',
        correo,
        contrasena: 'Ganado2026',
        pais_codigo: 'BO',
      }),
    });
    creados.push(cuerpo.usuario.id);
    const token = tokenDelEnlace(cuerpo.enlace_verificacion);

    const fila = await pool.query(
      'SELECT token_hash, expira_en FROM tokens WHERE usuario_id = $1 AND tipo = $2',
      [cuerpo.usuario.id, 'verificacion_correo'],
    );
    assert.strictEqual(fila.rowCount, 1);
    assert.notStrictEqual(fila.rows[0].token_hash, token, 'guardo el token en claro');
    assert.strictEqual(fila.rows[0].token_hash.length, 64, 'no parece un SHA-256');

    // Cuarto criterio: vence a las 24 horas.
    const horas = (new Date(fila.rows[0].expira_en) - Date.now()) / 3600000;
    assert.ok(horas > 23.5 && horas < 24.5, `vence en ${horas.toFixed(1)} horas`);
  });

  await prueba('Sin confirmar el correo no se puede usar el sistema', async () => {
    const { estado, cuerpo } = await pedir('/ranchos/mio', {}, SIN_VERIFICAR);
    assert.strictEqual(estado, 403, `se esperaba 403 y llego ${estado}`);
    assert.strictEqual(cuerpo.motivo, 'correo_sin_verificar');
  });

  await prueba('Se puede pedir el reenvio del enlace', async () => {
    const { estado, cuerpo } = await pedir('/usuarios/verificacion/reenvio', {
      method: 'POST',
      body: JSON.stringify({ correo: CORREO_SIN_VERIFICAR }),
    });
    assert.strictEqual(estado, 201);
    assert.ok(cuerpo.enlace, 'no devolvio el enlace nuevo');
    enlaceDeLucia = cuerpo.enlace;
  });

  await prueba('El reenvio no revela si el correo existe', async () => {
    const existe = await pedir('/usuarios/verificacion/reenvio', {
      method: 'POST',
      body: JSON.stringify({ correo: CORREO_SIN_VERIFICAR }),
    });
    const noExiste = await pedir('/usuarios/verificacion/reenvio', {
      method: 'POST',
      body: JSON.stringify({ correo: 'nadie.de.aqui@ejemplo.com' }),
    });
    assert.strictEqual(existe.estado, noExiste.estado);
    assert.strictEqual(existe.cuerpo.mensaje, noExiste.cuerpo.mensaje);
    enlaceDeLucia = existe.cuerpo.enlace;
  });

  await prueba('El enlace viejo deja de servir cuando se pide uno nuevo', async () => {
    const correo = `hu07.reenvio.${Date.now()}@ejemplo.com`;
    const registro = await pedir('/usuarios/registro', {
      method: 'POST',
      body: JSON.stringify({
        nombre: 'Persona de prueba',
        correo,
        contrasena: 'Ganado2026',
        pais_codigo: 'BO',
      }),
    });
    creados.push(registro.cuerpo.usuario.id);
    const viejo = tokenDelEnlace(registro.cuerpo.enlace_verificacion);

    await pedir('/usuarios/verificacion/reenvio', {
      method: 'POST',
      body: JSON.stringify({ correo }),
    });

    const { estado } = await pedir('/usuarios/verificacion', {
      method: 'POST',
      body: JSON.stringify({ token: viejo }),
    });
    assert.strictEqual(estado, 400, 'el enlace viejo siguio sirviendo');
  });

  await prueba('Un token inventado se rechaza', async () => {
    const { estado } = await pedir('/usuarios/verificacion', {
      method: 'POST',
      body: JSON.stringify({ token: 'esto-no-es-un-token' }),
    });
    assert.strictEqual(estado, 400);
  });

  await prueba('Con el enlace bueno la cuenta queda confirmada', async () => {
    const { estado } = await pedir('/usuarios/verificacion', {
      method: 'POST',
      body: JSON.stringify({ token: tokenDelEnlace(enlaceDeLucia) }),
    });
    assert.strictEqual(estado, 201, `se esperaba 201 y llego ${estado}`);

    const fila = await pool.query(
      'SELECT correo_verificado FROM usuarios WHERE id = $1',
      [SIN_VERIFICAR],
    );
    assert.strictEqual(fila.rows[0].correo_verificado, true);
  });

  await prueba('El mismo enlace no sirve dos veces', async () => {
    const { estado } = await pedir('/usuarios/verificacion', {
      method: 'POST',
      body: JSON.stringify({ token: tokenDelEnlace(enlaceDeLucia) }),
    });
    assert.strictEqual(estado, 400, 'el enlace se pudo usar de nuevo');
  });

  await prueba('Ya confirmada, la cuenta puede usar el sistema', async () => {
    const { estado } = await pedir('/ranchos/mio', {}, SIN_VERIFICAR);
    assert.strictEqual(estado, 200, `se esperaba 200 y llego ${estado}`);
  });

  // ==========================================================================
  // HU-10
  // ==========================================================================
  console.log('\n  HU-10');

  await prueba('Con contraseña temporal no se llega a ninguna otra pantalla', async () => {
    const { estado, cuerpo } = await pedir('/ranchos/mio', {}, CON_TEMPORAL);
    assert.strictEqual(estado, 403, `se esperaba 403 y llego ${estado}`);
    assert.strictEqual(cuerpo.motivo, 'debe_cambiar_contrasena');
  });

  await prueba('El cliente sabe que tiene pendiente el cambio', async () => {
    const { cuerpo } = await pedir('/usuarios/yo', {}, CON_TEMPORAL);
    assert.strictEqual(cuerpo.pendiente, 'cambiar_contrasena');
    assert.strictEqual(cuerpo.debe_cambiar_contrasena, true);
  });

  await prueba('La contraseña nueva no puede ser igual a la temporal', async () => {
    const { estado } = await pedir(
      '/usuarios/mi-contrasena',
      {
        method: 'POST',
        body: JSON.stringify({
          contrasena_actual: CLAVE_TEMPORAL,
          contrasena_nueva: CLAVE_TEMPORAL,
        }),
      },
      CON_TEMPORAL,
    );
    assert.strictEqual(estado, 400, 'acepto la misma contraseña');
  });

  await prueba('Sin la contraseña actual correcta no se cambia', async () => {
    const { estado } = await pedir(
      '/usuarios/mi-contrasena',
      {
        method: 'POST',
        body: JSON.stringify({
          contrasena_actual: 'NoEsLaSuya9',
          contrasena_nueva: 'Cerrito2026',
        }),
      },
      CON_TEMPORAL,
    );
    assert.strictEqual(estado, 401, `se esperaba 401 y llego ${estado}`);
  });

  await prueba('La contraseña nueva tiene que cumplir las tres reglas', async () => {
    const { estado } = await pedir(
      '/usuarios/mi-contrasena',
      {
        method: 'POST',
        body: JSON.stringify({
          contrasena_actual: CLAVE_TEMPORAL,
          contrasena_nueva: 'corta',
        }),
      },
      CON_TEMPORAL,
    );
    assert.strictEqual(estado, 400);
  });

  await prueba('Cambiada la contraseña, el sistema se abre', async () => {
    const cambio = await pedir(
      '/usuarios/mi-contrasena',
      {
        method: 'POST',
        body: JSON.stringify({
          contrasena_actual: CLAVE_TEMPORAL,
          contrasena_nueva: 'Cerrito2026',
        }),
      },
      CON_TEMPORAL,
    );
    assert.strictEqual(cambio.estado, 201, `se esperaba 201 y llego ${cambio.estado}`);

    const despues = await pedir('/ranchos/mio', {}, CON_TEMPORAL);
    assert.strictEqual(despues.estado, 200, 'sigue bloqueado despues de cambiarla');
  });

  await prueba('El propietario puede forzar un restablecimiento', async () => {
    const { estado, cuerpo } = await pedir(
      `/usuarios/${CON_TEMPORAL}/restablecer-contrasena`,
      { method: 'POST' },
      PROPIETARIO_A,
    );
    assert.strictEqual(estado, 201, `se esperaba 201 y llego ${estado}`);

    // El criterio: el propietario NUNCA ve la contraseña.
    const texto = JSON.stringify(cuerpo);
    assert.ok(!/contrasena_temporal|"clave"|"contrasena"/.test(texto),
      'la respuesta trae la contraseña');
    assert.ok(!texto.includes('scrypt$'), 'la respuesta trae el hash');

    const fila = await pool.query(
      'SELECT debe_cambiar_contrasena FROM usuarios WHERE id = $1',
      [CON_TEMPORAL],
    );
    assert.strictEqual(fila.rows[0].debe_cambiar_contrasena, true,
      'no quedo obligado a cambiarla');
  });

  await prueba('Un socio no puede restablecer contraseñas', async () => {
    const { estado } = await pedir(
      `/usuarios/${CON_TEMPORAL}/restablecer-contrasena`,
      { method: 'POST' },
      'a1000000-0000-4000-8000-000000000002', // socia del mismo rancho
    );
    assert.strictEqual(estado, 403, `se esperaba 403 y llego ${estado}`);
  });

  await prueba('Un propietario no puede tocar a alguien de otro rancho', async () => {
    const { estado } = await pedir(
      `/usuarios/${CON_TEMPORAL}/restablecer-contrasena`,
      { method: 'POST' },
      'b1000000-0000-4000-8000-000000000001', // propietario del rancho B
    );
    assert.strictEqual(estado, 404, `se esperaba 404 y llego ${estado}`);
  });

  // Limpieza
  if (creados.length > 0) {
    await pool.query('DELETE FROM tokens WHERE usuario_id = ANY($1::uuid[])', [creados]);
    await pool.query('DELETE FROM usuarios WHERE id = ANY($1::uuid[])', [creados]);
  }

  console.log('\n----------------------------------------------------------------');
  console.log(`  Ejecutadas: ${exitosas + fallidas}   Pasan: ${exitosas}   Fallan: ${fallidas}`);
  console.log('----------------------------------------------------------------');

  await pool.end();

  if (fallidas > 0) {
    console.error('\nHU-07 o HU-10 no se aprueban.');
    process.exitCode = 1;
  } else {
    console.log('\nHU-07 y HU-10 cumplen sus criterios.');
    console.log('Nota: las semillas quedan modificadas. Corre npm run sembrar antes de repetir.');
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
