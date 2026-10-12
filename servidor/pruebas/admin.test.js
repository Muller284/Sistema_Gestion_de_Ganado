/**
 * ============================================================================
 * SISTEMA DE GESTION DE GANADO
 * Pruebas de HU-24 (Acceso total del Admin de plataforma)
 * ============================================================================
 *
 * Contra el PostgreSQL de verdad y contra el servidor levantado.
 *
 * Criterios cubiertos:
 *   1. El rol Admin existe y accede a la información de cualquier rancho.
 *   2. El Admin no puede ser creado desde la interfaz de un rancho.
 *   3. Cada acceso del Admin a un rancho queda registrado.
 *
 * Lo que crea, lo borra al terminar: no hace falta volver a sembrar.
 * ============================================================================
 */

require('../cargar-entorno').cargarEntorno();
const assert = require('assert');
const { randomUUID } = require('crypto');
const { Pool } = require('pg');

const BASE = process.env.URL_SERVIDOR || 'http://localhost:3000';

const ADMIN = 'f0000000-0000-4000-8000-000000000001';
const PROPIETARIO_A = 'a1000000-0000-4000-8000-000000000001';
const SOCIO_A = 'a1000000-0000-4000-8000-000000000002';
const PROPIETARIO_B = 'b1000000-0000-4000-8000-000000000001';
const RANCHO_A = 'a0000000-0000-4000-8000-000000000001';
const RANCHO_B = 'b0000000-0000-4000-8000-000000000002';

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgres://postgres:tu_password@localhost:5432/gestion_ganado',
});

let exitosas = 0;
let fallidas = 0;
const accesosCreados = [];
const tiposCreados = [];
const usuariosCreados = [];

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

async function pedir(ruta, { metodo = 'GET', datos, usuario = ADMIN, rancho } = {}) {
  const respuesta = await fetch(`${BASE}${ruta}`, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      'x-usuario-id': usuario,
      ...(rancho ? { 'x-rancho-soporte': rancho } : {}),
    },
    body: datos ? JSON.stringify(datos) : undefined,
  });
  const cuerpo = await respuesta.json().catch(() => null);
  return { estado: respuesta.status, cuerpo };
}

async function entrar(ranchoId, motivo = 'Prueba automatica de soporte') {
  const { estado, cuerpo } = await pedir(`/admin/ranchos/${ranchoId}/accesos`, {
    metodo: 'POST',
    datos: { motivo },
  });
  assert.strictEqual(estado, 201, JSON.stringify(cuerpo));
  accesosCreados.push(cuerpo.acceso.id);
  return cuerpo.acceso;
}

async function ejecutarPruebas() {
  console.log('================================================================');
  console.log('  HU-24 ACCESO TOTAL DEL ADMIN DE PLATAFORMA');
  console.log('================================================================\n');

  const admin = await pool.query('SELECT rol, rancho_id FROM usuarios WHERE id = $1', [ADMIN]);
  assert.strictEqual(admin.rows[0]?.rol, 'admin_plataforma', 'Falta el Admin de las semillas');

  // ------------------------------------------------------------------------
  console.log('  Criterio 1 · Accede a cualquier rancho');

  await prueba('El Admin existe y no pertenece a ningun rancho', async () => {
    assert.strictEqual(admin.rows[0].rancho_id, null);
  });

  await prueba('El Admin ve la lista de todos los ranchos', async () => {
    const { estado, cuerpo } = await pedir('/admin/ranchos');
    assert.strictEqual(estado, 200, JSON.stringify(cuerpo));
    const ids = cuerpo.map((r) => r.id);
    assert.ok(ids.includes(RANCHO_A) && ids.includes(RANCHO_B), 'Faltan ranchos en la lista');
    assert.ok(cuerpo.every((r) => r.propietario), 'Falta el propietario');
  });

  await prueba('Nadie mas ve esa lista', async () => {
    for (const usuario of [PROPIETARIO_A, SOCIO_A]) {
      const { estado } = await pedir('/admin/ranchos', { usuario });
      assert.strictEqual(estado, 403, `${usuario} vio la lista`);
    }
  });

  let accesoA = null;

  await prueba('Entrando a un rancho, ve su informacion como el propietario', async () => {
    accesoA = await entrar(RANCHO_A);
    const equipo = await pedir('/equipo', { rancho: RANCHO_A });
    assert.strictEqual(equipo.estado, 200, JSON.stringify(equipo.cuerpo));
    assert.ok(equipo.cuerpo.some((m) => m.id === PROPIETARIO_A), 'No ve al equipo del rancho');

    const mio = await pedir('/ranchos/mio', { rancho: RANCHO_A });
    assert.strictEqual(mio.estado, 200);
    assert.strictEqual(mio.cuerpo.rancho.id, RANCHO_A);
    assert.strictEqual(mio.cuerpo.usuario.soporte, true);
  });

  await prueba('Adentro puede lo mismo que el propietario (crear un tipo)', async () => {
    const id = randomUUID();
    const { estado, cuerpo } = await pedir('/equipo/tipos', {
      metodo: 'POST',
      rancho: RANCHO_A,
      datos: { id, nombre: `Soporte ${Date.now()}`, permisos: { animales: 'ver' } },
    });
    assert.strictEqual(estado, 201, JSON.stringify(cuerpo));
    tiposCreados.push(id);
    const fila = await pool.query('SELECT creado_por, rancho_id FROM tipos_colaborador WHERE id = $1', [id]);
    assert.strictEqual(fila.rows[0].rancho_id, RANCHO_A);
    assert.strictEqual(fila.rows[0].creado_por, ADMIN, 'La autoria no quedo a nombre del Admin');
  });

  await prueba('Con el acceso de un rancho no entra a otro', async () => {
    const { estado, cuerpo } = await pedir('/equipo', { rancho: RANCHO_B });
    assert.strictEqual(estado, 403);
    assert.strictEqual(cuerpo.motivo, 'soporte_vencido');
  });

  await prueba('Sin entrar no ve nada de adentro', async () => {
    assert.strictEqual((await pedir('/equipo')).estado, 403);
  });

  await prueba('La cabecera de soporte no le sirve a nadie mas', async () => {
    // El propietario de B mandando la cabecera de A sigue viendo solo B.
    const { estado, cuerpo } = await pedir('/equipo', { usuario: PROPIETARIO_B, rancho: RANCHO_A });
    assert.strictEqual(estado, 200);
    assert.ok(!cuerpo.some((m) => m.id === PROPIETARIO_A), 'Vio el equipo de otro rancho');
  });

  // ------------------------------------------------------------------------
  console.log('\n  Criterio 2 · No se crea desde un rancho');

  await prueba('El alta del equipo rechaza el rol de Admin', async () => {
    const { estado } = await pedir('/equipo', {
      metodo: 'POST',
      usuario: PROPIETARIO_A,
      datos: { nombre: 'Falso Admin', correo: `admin.${Date.now()}@prueba.bo`, rol: 'admin_plataforma' },
    });
    assert.strictEqual(estado, 400);
  });

  await prueba('Ni siquiera el Admin en soporte puede dar de alta a otro Admin', async () => {
    const { estado } = await pedir('/equipo', {
      metodo: 'POST',
      rancho: RANCHO_A,
      datos: { nombre: 'Otro Admin', correo: `admin2.${Date.now()}@prueba.bo`, rol: 'admin_plataforma' },
    });
    assert.strictEqual(estado, 400);
  });

  await prueba('El registro siempre crea un propietario, aunque pida otro rol', async () => {
    const id = randomUUID();
    const { estado, cuerpo } = await pedir('/usuarios/registro', {
      metodo: 'POST',
      usuario: undefined,
      datos: {
        id,
        nombre: 'Quiere Ser Admin',
        correo: `quiere.admin.${Date.now()}@prueba.bo`,
        contrasena: 'Segura2026',
        pais_codigo: 'BO',
        rol: 'admin_plataforma',
      },
    });
    assert.strictEqual(estado, 201, JSON.stringify(cuerpo));
    usuariosCreados.push(id);
    const fila = await pool.query('SELECT rol FROM usuarios WHERE id = $1', [id]);
    assert.strictEqual(fila.rows[0].rol, 'propietario');
  });

  // ------------------------------------------------------------------------
  console.log('\n  Criterio 3 · Cada acceso queda registrado');

  await prueba('La entrada queda con quien, donde, por que y cuando', async () => {
    const fila = await pool.query('SELECT * FROM accesos_admin WHERE id = $1', [accesoA.id]);
    const acceso = fila.rows[0];
    assert.strictEqual(acceso.admin_id, ADMIN);
    assert.strictEqual(acceso.rancho_id, RANCHO_A);
    assert.strictEqual(acceso.motivo, 'Prueba automatica de soporte');
    assert.ok(acceso.entrado_en);
    assert.strictEqual(acceso.salido_en, null);
  });

  await prueba('Sin motivo, o con uno de una palabra, no se entra', async () => {
    for (const motivo of ['', 'revisar']) {
      const { estado } = await pedir(`/admin/ranchos/${RANCHO_A}/accesos`, {
        metodo: 'POST',
        datos: { motivo },
      });
      assert.strictEqual(estado, 400, `«${motivo}» se acepto`);
    }
  });

  await prueba('Un rancho que no existe responde 404', async () => {
    const { estado } = await pedir(`/admin/ranchos/${randomUUID()}/accesos`, {
      metodo: 'POST',
      datos: { motivo: 'Un motivo suficientemente largo' },
    });
    assert.strictEqual(estado, 404);
  });

  await prueba('El registro muestra la entrada, y el propietario la ve en su rancho', async () => {
    const registro = await pedir('/admin/accesos');
    assert.strictEqual(registro.estado, 200);
    assert.ok(registro.cuerpo.some((a) => a.id === accesoA.id && a.estado === 'abierto'));

    const deA = await pedir('/admin/accesos/de-mi-rancho', { usuario: PROPIETARIO_A });
    assert.strictEqual(deA.estado, 200, JSON.stringify(deA.cuerpo));
    assert.ok(deA.cuerpo.some((a) => a.id === accesoA.id));

    const deB = await pedir('/admin/accesos/de-mi-rancho', { usuario: PROPIETARIO_B });
    assert.ok(!deB.cuerpo.some((a) => a.id === accesoA.id), 'El propietario de B vio los accesos de A');

    assert.strictEqual((await pedir('/admin/accesos/de-mi-rancho', { usuario: SOCIO_A })).estado, 403);
  });

  await prueba('Al salir el acceso se cierra y ya no sirve', async () => {
    const { estado } = await pedir(`/admin/accesos/${accesoA.id}/salida`, { metodo: 'POST' });
    assert.strictEqual(estado, 201);
    const fila = await pool.query('SELECT salido_en FROM accesos_admin WHERE id = $1', [accesoA.id]);
    assert.ok(fila.rows[0].salido_en, 'No quedo la hora de salida');
    assert.strictEqual((await pedir('/equipo', { rancho: RANCHO_A })).estado, 403);
  });

  await prueba('Un acceso de mas de ocho horas vence solo', async () => {
    const acceso = await entrar(RANCHO_B, 'Revisar un problema con el alta');
    assert.strictEqual((await pedir('/equipo', { rancho: RANCHO_B })).estado, 200);
    await pool.query(
      "UPDATE accesos_admin SET entrado_en = CURRENT_TIMESTAMP - INTERVAL '9 hours' WHERE id = $1",
      [acceso.id],
    );
    assert.strictEqual((await pedir('/equipo', { rancho: RANCHO_B })).estado, 403);
    const registro = await pedir('/admin/accesos');
    assert.strictEqual(registro.cuerpo.find((a) => a.id === acceso.id).estado, 'vencido');
  });

  await prueba('Entrar de nuevo al mismo rancho cierra el acceso anterior', async () => {
    const primero = await entrar(RANCHO_A, 'Primera entrada de la prueba');
    const segundo = await entrar(RANCHO_A, 'Segunda entrada de la prueba');
    const filas = await pool.query(
      'SELECT id, salido_en FROM accesos_admin WHERE id = ANY($1::uuid[])',
      [[primero.id, segundo.id]],
    );
    const porId = Object.fromEntries(filas.rows.map((f) => [f.id, f.salido_en]));
    assert.ok(porId[primero.id], 'El primero sigue abierto');
    assert.strictEqual(porId[segundo.id], null);
  });

  // ------------------------------------------------------------------------
  if (tiposCreados.length) {
    await pool.query('DELETE FROM permisos_tipo WHERE tipo_colaborador_id = ANY($1::uuid[])', [tiposCreados]);
    await pool.query('DELETE FROM tipos_colaborador WHERE id = ANY($1::uuid[])', [tiposCreados]);
  }
  if (usuariosCreados.length) {
    await pool.query('DELETE FROM tokens WHERE usuario_id = ANY($1::uuid[])', [usuariosCreados]);
    await pool.query('DELETE FROM usuarios WHERE id = ANY($1::uuid[])', [usuariosCreados]);
  }
  await pool.query('DELETE FROM accesos_admin WHERE id = ANY($1::uuid[])', [accesosCreados]);

  console.log('\n----------------------------------------------------------------');
  console.log(`  Ejecutadas: ${exitosas + fallidas}   Pasan: ${exitosas}   Fallan: ${fallidas}`);
  console.log('----------------------------------------------------------------');

  await pool.end();

  if (fallidas > 0) {
    console.error('\nHU-24 no se aprueba.');
    process.exitCode = 1;
  } else {
    console.log('\nHU-24 cumple sus criterios.');
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
