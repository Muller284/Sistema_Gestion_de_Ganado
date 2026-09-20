/**
 * ============================================================================
 * SISTEMA DE GESTION DE GANADO
 * Pruebas del registro de propietario (HU-06)
 * ============================================================================
 *
 * Corren contra el PostgreSQL de verdad y contra el servidor levantado, no
 * contra un simulador. Es la leccion de HU-03: una prueba que no puede fallar
 * no prueba nada.
 *
 * Requisitos:
 *   1. La base levantada (docker compose up -d postgres)
 *   2. npm run migrar
 *   3. npm run sembrar
 *   4. El servidor corriendo (npm run iniciar)
 * ============================================================================
 */

require('../cargar-entorno').cargarEntorno();
const assert = require('assert');
const { Pool } = require('pg');
const { cifrarContrasena, verificarContrasena, revisarContrasena } =
  require('../dist/comun/contrasenas');

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

async function registrar(datos) {
  const respuesta = await fetch(`${BASE}/usuarios/registro`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
  });
  const cuerpo = await respuesta.json().catch(() => null);
  if (cuerpo?.usuario?.id) creados.push(cuerpo.usuario.id);
  return { estado: respuesta.status, cuerpo };
}

function correoDePrueba() {
  return `prueba.hu06.${Date.now()}.${Math.floor(Math.random() * 1000)}@ejemplo.com`;
}

async function ejecutarPruebas() {
  console.log('================================================================');
  console.log('  REGISTRO DE PROPIETARIO (HU-06)');
  console.log('================================================================\n');

  // --------------------------------------------------------------------------
  // Cifrado de contraseñas, sin tocar el servidor
  // --------------------------------------------------------------------------
  await prueba('La contraseña se guarda cifrada y se puede verificar', async () => {
    const guardado = await cifrarContrasena('Ganado2026');
    assert.ok(!guardado.includes('Ganado2026'), 'la contraseña quedo en claro');
    assert.ok(guardado.startsWith('scrypt$'), 'formato inesperado');
    assert.strictEqual(await verificarContrasena('Ganado2026', guardado), true);
    assert.strictEqual(await verificarContrasena('Ganado2027', guardado), false);
  });

  await prueba('Dos cuentas con la misma contraseña dan hashes distintos', async () => {
    const uno = await cifrarContrasena('Ganado2026');
    const otro = await cifrarContrasena('Ganado2026');
    assert.notStrictEqual(uno, otro, 'falta la sal por usuario');
  });

  await prueba('Las tres reglas de la contraseña estan puestas', async () => {
    assert.strictEqual(revisarContrasena('Ganado2026').length, 0);
    assert.strictEqual(revisarContrasena('Gan26').length, 1); // corta
    assert.strictEqual(revisarContrasena('ganado2026').length, 1); // sin mayuscula
    assert.strictEqual(revisarContrasena('Ganadoxyz').length, 1); // sin numero
  });

  // --------------------------------------------------------------------------
  // Contra el servidor
  // --------------------------------------------------------------------------
  const correo = correoDePrueba();

  await prueba('Un registro valido crea la cuenta como propietario', async () => {
    const { estado, cuerpo } = await registrar({
      nombre: 'Marcela Vargas Rojas',
      correo,
      contrasena: 'Ganado2026',
      pais_codigo: 'BO',
    });
    assert.strictEqual(estado, 201, `se esperaba 201 y llego ${estado}`);
    assert.strictEqual(cuerpo.usuario.rol, 'propietario');
    assert.strictEqual(cuerpo.usuario.rancho_id, null, 'nace sin rancho');
    assert.strictEqual(cuerpo.usuario.correo_verificado, false, 'falta HU-07');
    assert.strictEqual(cuerpo.usuario.pais_codigo, 'BO');
  });

  await prueba('La respuesta no devuelve la contraseña, ni siquiera cifrada', async () => {
    const { cuerpo } = await registrar({
      nombre: 'Julio Camacho Vega',
      correo: correoDePrueba(),
      contrasena: 'Ganado2026',
      pais_codigo: 'BO',
    });
    const texto = JSON.stringify(cuerpo);
    assert.ok(!texto.includes('Ganado2026'), 'devolvio la contraseña');
    assert.ok(!texto.includes('scrypt$'), 'devolvio el hash');
    assert.ok(!texto.includes('contrasena_hash'), 'devolvio el campo del hash');
  });

  await prueba('En la base queda cifrada, nunca en texto plano', async () => {
    const fila = await pool.query(
      'SELECT contrasena_hash FROM usuarios WHERE LOWER(correo) = LOWER($1)',
      [correo],
    );
    assert.strictEqual(fila.rowCount, 1, 'no se guardo la cuenta');
    assert.notStrictEqual(fila.rows[0].contrasena_hash, 'Ganado2026');
    assert.ok(fila.rows[0].contrasena_hash.startsWith('scrypt$'));
  });

  await prueba('No se permite registrar dos veces el mismo correo', async () => {
    const { estado } = await registrar({
      nombre: 'Otra persona',
      correo: correo.toUpperCase(), // tambien en mayusculas
      contrasena: 'Ganado2026',
      pais_codigo: 'BO',
    });
    assert.strictEqual(estado, 409, `se esperaba 409 y llego ${estado}`);
  });

  await prueba('Una contraseña que no cumple las reglas se rechaza', async () => {
    for (const mala of ['corta1A', 'ganado2026', 'GanadoGanado']) {
      const { estado } = await registrar({
        nombre: 'Persona',
        correo: correoDePrueba(),
        contrasena: mala,
        pais_codigo: 'BO',
      });
      assert.strictEqual(estado, 400, `"${mala}" deberia rechazarse y dio ${estado}`);
    }
  });

  await prueba('Faltando un dato obligatorio se rechaza', async () => {
    const { estado } = await registrar({
      correo: correoDePrueba(),
      contrasena: 'Ganado2026',
      pais_codigo: 'BO',
    });
    assert.strictEqual(estado, 400, 'acepto un registro sin nombre');
  });

  await prueba('Un pais que no existe se rechaza', async () => {
    const { estado } = await registrar({
      nombre: 'Persona',
      correo: correoDePrueba(),
      contrasena: 'Ganado2026',
      pais_codigo: 'ZZ',
    });
    assert.strictEqual(estado, 400, 'acepto un pais inexistente');
  });

  await prueba('No se puede registrar un admin ni un socio desde el registro', async () => {
    const { cuerpo } = await registrar({
      nombre: 'Intento de escalada',
      correo: correoDePrueba(),
      contrasena: 'Ganado2026',
      pais_codigo: 'BO',
      rol: 'admin_plataforma',
      rancho_id: 'a0000000-0000-4000-8000-000000000001',
    });
    assert.strictEqual(cuerpo.usuario.rol, 'propietario', 'se acepto el rol enviado');
    assert.strictEqual(cuerpo.usuario.rancho_id, null, 'se acepto el rancho enviado');
  });

  // Limpieza: las cuentas de prueba no quedan en la base. Primero los tokens
  // de verificacion que emite HU-07 al registrarse, porque apuntan al usuario.
  if (creados.length > 0) {
    await pool.query('DELETE FROM tokens WHERE usuario_id = ANY($1::uuid[])', [creados]);
    await pool.query('DELETE FROM usuarios WHERE id = ANY($1::uuid[])', [creados]);
  }

  console.log('\n----------------------------------------------------------------');
  console.log(`  Ejecutadas: ${exitosas + fallidas}   Pasan: ${exitosas}   Fallan: ${fallidas}`);
  console.log('----------------------------------------------------------------');

  await pool.end();

  if (fallidas > 0) {
    console.error('\nHU-06 no se aprueba.');
    process.exitCode = 1;
  } else {
    console.log('\nEl registro de propietario cumple sus cuatro criterios.');
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
