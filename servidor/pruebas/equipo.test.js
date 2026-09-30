/**
 * ============================================================================
 * SISTEMA DE GESTION DE GANADO
 * Pruebas de HU-17 (Alta de socios y colaboradores)
 * ============================================================================
 *
 * Contra el PostgreSQL de verdad y contra el servidor levantado.
 *
 * Criterios cubiertos:
 *   1. Cargo nombre, correo, rol y, si es colaborador, su tipo.
 *   2. El sistema genera una contraseña temporal.
 *   3. Si el correo ya pertenece a otro rancho, el sistema rechaza el alta.
 *   4. Puedo suspender y reactivar a cualquier miembro de mi equipo.
 *
 * Lo que crea, lo borra al terminar: no hace falta volver a sembrar.
 * ============================================================================
 */

require('../cargar-entorno').cargarEntorno();
const assert = require('assert');
const { randomUUID } = require('crypto');
const { Pool } = require('pg');

const BASE = process.env.URL_SERVIDOR || 'http://localhost:3000';

// Cuentas de las semillas
const PROPIETARIO_A = 'a1000000-0000-4000-8000-000000000001'; // Carlos
const SOCIO_A = 'a1000000-0000-4000-8000-000000000002'; // Maria Rene
const COLABORADOR_A = 'a1000000-0000-4000-8000-000000000003'; // Dr. Jorge
const PROPIETARIO_B = 'b1000000-0000-4000-8000-000000000001'; // Fernando
const CORREO_DE_B = 'patricia.villarroel@lafloresta.bo';
const VETERINARIO = '11111111-1111-4111-8111-000000000001';

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

function alta(datos, usuarioId = PROPIETARIO_A) {
  return pedir('/equipo', { method: 'POST', body: JSON.stringify(datos) }, usuarioId);
}

function correoNuevo(nombre) {
  return `${nombre}.${Date.now()}.${Math.floor(Math.random() * 1000)}@prueba.bo`;
}

async function ejecutarPruebas() {
  console.log('================================================================');
  console.log('  HU-17 ALTA DE SOCIOS Y COLABORADORES');
  console.log('================================================================\n');

  // Si la semilla de Patricia cambia, la prueba del criterio 3 lo dice.
  const patricia = await pool.query('SELECT 1 FROM usuarios WHERE correo = $1', [CORREO_DE_B]);
  assert.strictEqual(patricia.rowCount, 1, `Falta la semilla ${CORREO_DE_B}`);

  // ------------------------------------------------------------------------
  console.log('  Criterio 1 · Nombre, correo, rol y tipo');

  let colaboradorId = null;

  await prueba('Un colaborador se crea con su tipo, en el rancho del propietario', async () => {
    const id = randomUUID();
    const { estado, cuerpo } = await alta({
      id,
      nombre: 'Ana Colaboradora',
      correo: correoNuevo('ana'),
      rol: 'colaborador',
      tipo_colaborador_id: VETERINARIO,
    });
    assert.strictEqual(estado, 201, JSON.stringify(cuerpo));
    creados.push(id);
    colaboradorId = id;
    assert.strictEqual(cuerpo.miembro.rol, 'colaborador');
    assert.strictEqual(cuerpo.miembro.tipo_colaborador, 'Veterinario');

    const fila = await pool.query('SELECT rancho_id, creado_por FROM usuarios WHERE id = $1', [id]);
    assert.strictEqual(fila.rows[0].rancho_id, 'a0000000-0000-4000-8000-000000000001');
    assert.strictEqual(fila.rows[0].creado_por, PROPIETARIO_A, 'Tiene que quedar quien lo dio de alta');
  });

  await prueba('Un socio se crea sin tipo', async () => {
    const id = randomUUID();
    const { estado, cuerpo } = await alta({
      id,
      nombre: 'Bruno Socio',
      correo: correoNuevo('bruno'),
      rol: 'socio',
    });
    assert.strictEqual(estado, 201, JSON.stringify(cuerpo));
    creados.push(id);
    assert.strictEqual(cuerpo.miembro.tipo_colaborador_id, null);
  });

  await prueba('Un colaborador sin tipo se rechaza', async () => {
    const { estado, cuerpo } = await alta({
      nombre: 'Sin Tipo',
      correo: correoNuevo('sintipo'),
      rol: 'colaborador',
    });
    assert.strictEqual(estado, 400);
    assert.match(cuerpo.message, /tipo de colaborador/);
  });

  await prueba('No se puede dar de alta a otro propietario ni a un Admin', async () => {
    for (const rol of ['propietario', 'admin_plataforma']) {
      const { estado } = await alta({ nombre: 'X', correo: correoNuevo('x'), rol });
      assert.strictEqual(estado, 400, `El rol ${rol} se acepto`);
    }
  });

  await prueba('Un tipo de colaborador propio de otro rancho no se acepta', async () => {
    const tipoDeB = randomUUID();
    await pool.query(
      `INSERT INTO tipos_colaborador (id, rancho_id, nombre, es_predefinido)
       VALUES ($1, 'b0000000-0000-4000-8000-000000000002', 'Tipo de B', FALSE)`,
      [tipoDeB],
    );
    try {
      const { estado } = await alta({
        nombre: 'Con tipo ajeno',
        correo: correoNuevo('ajeno'),
        rol: 'colaborador',
        tipo_colaborador_id: tipoDeB,
      });
      assert.strictEqual(estado, 400);
    } finally {
      await pool.query('DELETE FROM tipos_colaborador WHERE id = $1', [tipoDeB]);
    }
  });

  // ------------------------------------------------------------------------
  console.log('\n  Criterio 2 · Contraseña temporal');

  await prueba('Queda una contraseña temporal cifrada y la obligacion de cambiarla', async () => {
    const fila = await pool.query(
      'SELECT contrasena_hash, debe_cambiar_contrasena, correo_verificado FROM usuarios WHERE id = $1',
      [colaboradorId],
    );
    const usuario = fila.rows[0];
    assert.ok(usuario.contrasena_hash.startsWith('scrypt$'), 'No se guardo cifrada con scrypt');
    assert.strictEqual(usuario.debe_cambiar_contrasena, true, 'HU-10 no lo va a obligar a cambiarla');
    assert.strictEqual(usuario.correo_verificado, true);
  });

  await prueba('La respuesta no le muestra la contraseña al propietario', async () => {
    const correo = correoNuevo('secreto');
    const id = randomUUID();
    const { cuerpo } = await alta({ id, nombre: 'Secreto', correo, rol: 'socio' });
    creados.push(id);
    const texto = JSON.stringify(cuerpo).toLowerCase();
    assert.ok(!texto.includes('contrasena_hash'), 'Devuelve el hash');
    assert.ok(!/contraseña temporal: /i.test(texto), 'Devuelve la clave');
    assert.ok(!('contrasena' in cuerpo) && !('contrasena_temporal' in cuerpo));
  });

  // ------------------------------------------------------------------------
  console.log('\n  Criterio 3 · Un correo, un solo rancho');

  await prueba('Un correo de otro rancho se rechaza y el mensaje explica el motivo', async () => {
    const { estado, cuerpo } = await alta({
      nombre: 'Patricia',
      correo: CORREO_DE_B.toUpperCase(),
      rol: 'socio',
    });
    assert.strictEqual(estado, 409);
    assert.match(cuerpo.message, /otro rancho/);
  });

  await prueba('Un correo que ya es del equipo tiene su propio mensaje', async () => {
    const correo = (await pool.query('SELECT correo FROM usuarios WHERE id = $1', [SOCIO_A])).rows[0].correo;
    const { estado, cuerpo } = await alta({ nombre: 'Maria', correo, rol: 'socio' });
    assert.strictEqual(estado, 409);
    assert.match(cuerpo.message, /ya es parte de tu equipo/);
  });

  // ------------------------------------------------------------------------
  console.log('\n  Criterio 4 · Suspender y reactivar');

  await prueba('Suspender le cierra las sesiones y le impide entrar', async () => {
    // Una sesion abierta, como si hubiera entrado.
    const sesion = randomUUID();
    await pool.query(
      `INSERT INTO sesiones (id, usuario_id, token_refresco_hash, expira_en)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP + INTERVAL '30 days')`,
      [sesion, colaboradorId, `prueba-${sesion}`],
    );

    const { estado, cuerpo } = await pedir(
      `/equipo/${colaboradorId}/estado`,
      { method: 'PATCH', body: JSON.stringify({ estado: 'suspendido' }) },
      PROPIETARIO_A,
    );
    assert.strictEqual(estado, 200, JSON.stringify(cuerpo));
    assert.strictEqual(cuerpo.miembro.estado, 'suspendido');

    const revocada = await pool.query('SELECT revocada_en FROM sesiones WHERE id = $1', [sesion]);
    assert.ok(revocada.rows[0].revocada_en, 'La sesion quedo abierta');

    const yo = await pedir('/usuarios/yo', {}, colaboradorId);
    assert.strictEqual(yo.estado, 401, 'Un suspendido sigue siendo reconocido');
  });

  await prueba('Reactivar le devuelve el acceso', async () => {
    const { estado, cuerpo } = await pedir(
      `/equipo/${colaboradorId}/estado`,
      { method: 'PATCH', body: JSON.stringify({ estado: 'activo' }) },
      PROPIETARIO_A,
    );
    assert.strictEqual(estado, 200);
    assert.strictEqual(cuerpo.miembro.estado, 'activo');
    const yo = await pedir('/usuarios/yo', {}, colaboradorId);
    assert.strictEqual(yo.estado, 200);
  });

  await prueba('El propietario no se puede suspender', async () => {
    const { estado } = await pedir(
      `/equipo/${PROPIETARIO_A}/estado`,
      { method: 'PATCH', body: JSON.stringify({ estado: 'suspendido' }) },
      PROPIETARIO_A,
    );
    assert.strictEqual(estado, 400);
  });

  // ------------------------------------------------------------------------
  console.log('\n  Aislamiento y roles');

  await prueba('Un propietario no puede suspender a alguien de otro rancho', async () => {
    const { estado } = await pedir(
      `/equipo/${colaboradorId}/estado`,
      { method: 'PATCH', body: JSON.stringify({ estado: 'suspendido' }) },
      PROPIETARIO_B,
    );
    assert.strictEqual(estado, 404);
    const fila = await pool.query('SELECT estado FROM usuarios WHERE id = $1', [colaboradorId]);
    assert.strictEqual(fila.rows[0].estado, 'activo');
  });

  await prueba('Cada propietario ve solo a su equipo', async () => {
    const { cuerpo } = await pedir('/equipo', {}, PROPIETARIO_B);
    assert.ok(Array.isArray(cuerpo));
    assert.ok(!cuerpo.some((m) => m.id === colaboradorId), 'B ve a alguien de A');
    assert.ok(cuerpo.every((m) => m.id.startsWith('b1')), 'B ve gente de otro rancho');
  });

  await prueba('El socio ve el equipo pero no puede dar de alta', async () => {
    const lista = await pedir('/equipo', {}, SOCIO_A);
    assert.strictEqual(lista.estado, 200);
    const { estado } = await alta({ nombre: 'X', correo: correoNuevo('x'), rol: 'socio' }, SOCIO_A);
    assert.strictEqual(estado, 403);
  });

  await prueba('Un colaborador no ve el equipo', async () => {
    const { estado } = await pedir('/equipo', {}, COLABORADOR_A);
    assert.strictEqual(estado, 403);
  });

  // ------------------------------------------------------------------------
  if (creados.length > 0) {
    await pool.query('DELETE FROM sesiones WHERE usuario_id = ANY($1::uuid[])', [creados]);
    await pool.query('DELETE FROM tokens WHERE usuario_id = ANY($1::uuid[])', [creados]);
    await pool.query('DELETE FROM usuarios WHERE id = ANY($1::uuid[])', [creados]);
  }

  console.log('\n----------------------------------------------------------------');
  console.log(`  Ejecutadas: ${exitosas + fallidas}   Pasan: ${exitosas}   Fallan: ${fallidas}`);
  console.log('----------------------------------------------------------------');

  await pool.end();

  if (fallidas > 0) {
    console.error('\nHU-17 no se aprueba.');
    process.exitCode = 1;
  } else {
    console.log('\nHU-17 cumple sus criterios.');
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
