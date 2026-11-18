/**
 * ============================================================================
 * SISTEMA DE GESTION DE GANADO
 * Pruebas del panel del Admin de plataforma (fase 4, RF-56 a RF-62)
 * Responsable: Aaron
 * ============================================================================
 *
 * Contra el PostgreSQL de verdad y el servidor levantado, con las semillas
 * cargadas y la migración 013 aplicada.
 *
 * RF-56  Tablero con cuentas, actividad, asistente y soporte.
 * RF-57  Buscar cuentas y ver la ficha de cada una.
 *        Suspender, reactivar y mandar el enlace de contraseña, con motivo.
 * RF-60  Catálogo de razas: agregar, cambiar grupo, desactivar y reactivar.
 * RF-62  Todo lo anterior queda en el registro de auditoría.
 * RNF-04 / RNF-11  Las cuotas del asistente se cambian desde el panel.
 *
 * Solo el rol admin_plataforma llega a cualquiera de estas rutas.
 * Lo que crea o cambia, lo deja como estaba al terminar.
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
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:tu_password@localhost:5432/gestion_ganado',
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

async function pedir(ruta, { metodo = 'GET', datos, usuario = ADMIN, rancho } = {}) {
  const respuesta = await fetch(`${BASE}${ruta}`, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      'Accept-Language': 'es',
      'x-usuario-id': usuario,
      ...(rancho ? { 'x-rancho-soporte': rancho } : {}),
    },
    body: datos ? JSON.stringify(datos) : undefined,
  });
  return { estado: respuesta.status, cuerpo: await respuesta.json().catch(() => null) };
}

const MOTIVO = 'Prueba automatica del panel del Admin';

async function ejecutarPruebas() {
  console.log('================================================================');
  console.log('  FASE 4: PANEL DEL ADMIN DE PLATAFORMA (RF-56 A RF-62)');
  console.log('  Responsable: Aaron');
  console.log('================================================================\n');

  const inicio = (await pool.query('SELECT CURRENT_TIMESTAMP AS ahora')).rows[0].ahora;
  const configuracionAntes = (await pool.query('SELECT clave, valor FROM configuracion_plataforma')).rows;
  const razasCreadas = [];

  try {
    console.log('Solo el Admin');

    await prueba('Ningún otro rol llega a las rutas del panel', async () => {
      const rutas = [
        ['/admin/tablero'],
        ['/admin/cuentas'],
        [`/admin/cuentas/${RANCHO_A}`],
        ['/admin/razas'],
        ['/admin/configuracion'],
        ['/admin/auditoria'],
        [`/admin/usuarios/${SOCIO_A}/estado`, 'PATCH', { estado: 'suspendido', motivo: MOTIVO }],
        [`/admin/usuarios/${SOCIO_A}/enlace-contrasena`, 'POST', { motivo: MOTIVO }],
        ['/admin/razas', 'POST', { nombre: 'Raza de nadie', grupo: 'carne' }],
        ['/admin/configuracion', 'PUT', { asistente_consultas_mes: 1 }],
      ];
      for (const usuario of [PROPIETARIO_A, SOCIO_A]) {
        for (const [ruta, metodo, datos] of rutas) {
          const { estado } = await pedir(ruta, { usuario, metodo, datos });
          assert.strictEqual(estado, 403, `${usuario} llegó a ${metodo ?? 'GET'} ${ruta}`);
        }
      }
      const socio = await pool.query('SELECT estado FROM usuarios WHERE id = $1', [SOCIO_A]);
      assert.strictEqual(socio.rows[0].estado, 'activo');
    });

    console.log('\nRF-56: tablero');

    await prueba('El tablero trae cuentas, actividad, asistente y soporte', async () => {
      const { estado, cuerpo } = await pedir('/admin/tablero');
      assert.strictEqual(estado, 200, JSON.stringify(cuerpo));
      assert.ok(cuerpo.cuentas.ranchos >= 2);
      assert.ok(cuerpo.cuentas.usuarios >= 10);
      const porRol = Object.fromEntries(cuerpo.cuentas.por_rol.map((f) => [f.rol, f.n]));
      assert.ok(porRol.propietario >= 2 && porRol.socio >= 1 && porRol.colaborador >= 1, JSON.stringify(porRol));
      assert.ok(!('admin_plataforma' in porRol), 'el Admin no se cuenta como cliente');
      assert.strictEqual(cuerpo.cuentas.altas_por_semana.length, 12);
      assert.ok(cuerpo.cuentas.por_pais.some((p) => p.codigo === 'BO'));
      assert.ok(cuerpo.actividad.animales > 0);
      assert.ok(cuerpo.asistente.por_dia.length >= 1 && cuerpo.asistente.por_dia.length <= 31);
      assert.ok(cuerpo.asistente.por_usuario > 0);
      assert.ok('abiertos' in cuerpo.soporte);
    });

    console.log('\nRF-57: cuentas');

    await prueba('Busca cuentas sin importar mayúsculas ni tildes', async () => {
      let r = await pedir('/admin/cuentas?q=FLORESTA');
      assert.strictEqual(r.estado, 200, JSON.stringify(r.cuerpo));
      assert.deepStrictEqual(r.cuerpo.map((c) => c.id), [RANCHO_B]);
      r = await pedir(`/admin/cuentas?q=${encodeURIComponent('gutiérrez')}`);
      assert.deepStrictEqual(r.cuerpo.map((c) => c.id), [RANCHO_A]);
      r = await pedir('/admin/cuentas');
      const a = r.cuerpo.find((c) => c.id === RANCHO_A);
      assert.ok(a.integrantes >= 5 && a.animales > 0, JSON.stringify(a));
      assert.ok(!JSON.stringify(r.cuerpo).includes('contrasena'), 'no expone contraseñas');
    });

    await prueba('La ficha trae el equipo, el consumo, la actividad y los accesos de soporte', async () => {
      const { estado, cuerpo } = await pedir(`/admin/cuentas/${RANCHO_A}`);
      assert.strictEqual(estado, 200, JSON.stringify(cuerpo));
      assert.strictEqual(cuerpo.rancho.nombre, 'Rancho El Cerrito');
      assert.strictEqual(cuerpo.equipo[0].id, PROPIETARIO_A, 'el propietario va primero');
      assert.ok(cuerpo.equipo.some((m) => m.rol === 'colaborador' && m.tipo), 'los colaboradores llevan su tipo');
      assert.ok(cuerpo.consumo.animales > 0 && cuerpo.consumo.pesajes > 0);
      assert.ok(cuerpo.actividad.length > 0 && cuerpo.actividad.length <= 12);
      assert.ok(Array.isArray(cuerpo.accesos));
      assert.ok(!JSON.stringify(cuerpo).includes('contrasena_hash'));
      assert.strictEqual((await pedir(`/admin/cuentas/${randomUUID()}`)).estado, 404);
      assert.strictEqual((await pedir('/admin/cuentas/no-es-un-id')).estado, 404);
    });

    await prueba('Suspender pide motivo, cierra las sesiones y deja a la persona afuera', async () => {
      assert.strictEqual(
        (await pedir(`/admin/usuarios/${SOCIO_A}/estado`, { metodo: 'PATCH', datos: { estado: 'suspendido' } })).estado,
        400,
      );
      const sesion = randomUUID();
      await pool.query(
        `INSERT INTO sesiones (id, usuario_id, token_refresco_hash, expira_en)
         VALUES ($1, $2, 'prueba-panel-admin', CURRENT_TIMESTAMP + INTERVAL '1 day')`,
        [sesion, SOCIO_A],
      );
      const r = await pedir(`/admin/usuarios/${SOCIO_A}/estado`, {
        metodo: 'PATCH',
        datos: { estado: 'suspendido', motivo: MOTIVO },
      });
      assert.strictEqual(r.estado, 200, JSON.stringify(r.cuerpo));
      const fila = await pool.query('SELECT estado FROM usuarios WHERE id = $1', [SOCIO_A]);
      assert.strictEqual(fila.rows[0].estado, 'suspendido');
      const cerrada = await pool.query('SELECT revocada_en FROM sesiones WHERE id = $1', [sesion]);
      assert.ok(cerrada.rows[0].revocada_en, 'la sesión sigue abierta');
      assert.notStrictEqual((await pedir('/ranchos/mio', { usuario: SOCIO_A })).estado, 200, 'sigue entrando');
      await pool.query('DELETE FROM sesiones WHERE id = $1', [sesion]);
    });

    await prueba('Reactivar le devuelve el acceso', async () => {
      const r = await pedir(`/admin/usuarios/${SOCIO_A}/estado`, {
        metodo: 'PATCH',
        datos: { estado: 'activo', motivo: MOTIVO },
      });
      assert.strictEqual(r.estado, 200, JSON.stringify(r.cuerpo));
      assert.strictEqual((await pedir('/ranchos/mio', { usuario: SOCIO_A })).estado, 200);
    });

    await prueba('Un Admin no se suspende desde el panel', async () => {
      const r = await pedir(`/admin/usuarios/${ADMIN}/estado`, {
        metodo: 'PATCH',
        datos: { estado: 'suspendido', motivo: MOTIVO },
      });
      assert.strictEqual(r.estado, 403);
    });

    await prueba('El enlace de contraseña va al correo de la persona: el Admin no ve ni la clave ni el enlace', async () => {
      const r = await pedir(`/admin/usuarios/${PROPIETARIO_B}/enlace-contrasena`, {
        metodo: 'POST',
        datos: { motivo: MOTIVO },
      });
      assert.strictEqual(r.estado, 200, JSON.stringify(r.cuerpo));
      assert.ok(!/token|recuperar-contrasena/.test(JSON.stringify(r.cuerpo)));
      const tokens = await pool.query(
        `SELECT COUNT(*)::int AS n FROM tokens
          WHERE usuario_id = $1 AND tipo = 'recuperacion_contrasena' AND creado_en >= $2`,
        [PROPIETARIO_B, inicio],
      );
      assert.strictEqual(tokens.rows[0].n, 1);
    });

    console.log('\nRF-60: catálogo de razas');

    await prueba('Agrega una raza al catálogo y absorbe la que un rancho ya había escrito igual', async () => {
      const propia = randomUUID();
      await pool.query(
        `INSERT INTO razas (id, rancho_id, nombre, clave) VALUES ($1, $2, 'raza de prueba panel', 'raza de prueba panel')`,
        [propia, RANCHO_A],
      );
      razasCreadas.push(propia);
      let r = await pedir('/admin/razas');
      assert.ok(r.cuerpo.de_ranchos.some((z) => z.nombre === 'raza de prueba panel'));

      r = await pedir('/admin/razas', { metodo: 'POST', datos: { nombre: '  Raza de  Prueba Panel ', grupo: 'leche' } });
      assert.strictEqual(r.estado, 201, JSON.stringify(r.cuerpo));
      razasCreadas.push(r.cuerpo.id);
      const absorbida = await pool.query('SELECT eliminado_en FROM razas WHERE id = $1', [propia]);
      assert.ok(absorbida.rows[0].eliminado_en, 'la del rancho sigue apareciendo');

      const lista = await pedir('/animales/razas', { usuario: PROPIETARIO_A });
      const iguales = (lista.cuerpo ?? []).filter((z) => z.nombre.toLowerCase() === 'raza de prueba panel');
      assert.strictEqual(iguales.length, 1, JSON.stringify(iguales));
      assert.strictEqual(iguales[0].grupo, 'leche');
    });

    await prueba('No se repite, aunque se escriba con otras mayúsculas o tildes', async () => {
      const r = await pedir('/admin/razas', { metodo: 'POST', datos: { nombre: 'RAZA DE PRUEBA PÁNEL', grupo: 'carne' } });
      assert.strictEqual(r.estado, 409);
      assert.strictEqual((await pedir('/admin/razas', { metodo: 'POST', datos: { nombre: 'Otra', grupo: 'cerdo' } })).estado, 400);
    });

    await prueba('Cambia el grupo, la desactiva y la vuelve a activar', async () => {
      const id = razasCreadas[1];
      let r = await pedir(`/admin/razas/${id}`, { metodo: 'PATCH', datos: { grupo: 'doble' } });
      assert.strictEqual(r.estado, 200, JSON.stringify(r.cuerpo));
      r = await pedir(`/admin/razas/${id}`, { metodo: 'PATCH', datos: { activa: false } });
      assert.strictEqual(r.estado, 200);
      let lista = await pedir('/animales/razas', { usuario: PROPIETARIO_A });
      assert.ok(!lista.cuerpo.some((z) => z.nombre === 'Raza de Prueba Panel'), 'se sigue ofreciendo');
      r = await pedir(`/admin/razas/${id}`, { metodo: 'PATCH', datos: { activa: true } });
      assert.strictEqual(r.estado, 200);
      lista = await pedir('/animales/razas', { usuario: PROPIETARIO_A });
      assert.ok(lista.cuerpo.some((z) => z.nombre === 'Raza de Prueba Panel' && z.grupo === 'doble'));
    });

    console.log('\nRNF-04 y RNF-11: cuotas del asistente');

    await prueba('Valida los valores', async () => {
      for (const valor of [0, -3, 1.5, 'diez', 1_000_000]) {
        const r = await pedir('/admin/configuracion', { metodo: 'PUT', datos: { asistente_consultas_mes: valor } });
        assert.strictEqual(r.estado, 400, `aceptó ${valor}`);
      }
    });

    await prueba('La cuota por usuario rige en el asistente apenas se guarda', async () => {
      const r = await pedir('/admin/configuracion', { metodo: 'PUT', datos: { asistente_consultas_mes: 7 } });
      assert.strictEqual(r.estado, 200, JSON.stringify(r.cuerpo));
      assert.strictEqual(r.cuerpo.asistente_consultas_mes, 7);
      const asistente = await pedir('/asistente', { usuario: PROPIETARIO_A });
      assert.strictEqual(asistente.cuerpo.limite, 7);
      await pedir('/admin/configuracion', { metodo: 'PUT', datos: { asistente_consultas_mes: null } });
      assert.strictEqual((await pedir('/asistente', { usuario: PROPIETARIO_A })).cuerpo.limite, r.cuerpo.por_defecto.asistente_consultas_mes);
    });

    await prueba('Con el tope de la plataforma alcanzado, nadie más pregunta (429 «tope»)', async () => {
      const usadas = (
        await pool.query(
          `SELECT COUNT(*)::int AS n FROM consultas_asistente
            WHERE eliminado_en IS NULL AND creado_en >= date_trunc('month', CURRENT_TIMESTAMP)`,
        )
      ).rows[0].n;
      const id = randomUUID();
      await pool.query(
        `INSERT INTO consultas_asistente (id, rancho_id, usuario_id, pregunta, respuesta) VALUES ($1, $2, $3, 'relleno', 'relleno')`,
        [id, RANCHO_B, PROPIETARIO_B],
      );
      await pedir('/admin/configuracion', { metodo: 'PUT', datos: { asistente_tope_mensual: usadas + 1 } });
      const r = await pedir('/asistente/preguntas', { usuario: PROPIETARIO_A, metodo: 'POST', datos: { pregunta: 'hola' } });
      await pedir('/admin/configuracion', { metodo: 'PUT', datos: { asistente_tope_mensual: null } });
      await pool.query('DELETE FROM consultas_asistente WHERE id = $1', [id]);
      if (r.estado === 503) return; // Servidor sin proveedor configurado: no llega a mirar la cuota.
      assert.strictEqual(r.estado, 429, JSON.stringify(r.cuerpo));
      assert.strictEqual(r.cuerpo.motivo, 'tope');
    });

    console.log('\nRF-62: auditoría');

    await prueba('Cada acción quedó anotada, con quién, sobre quién y el motivo', async () => {
      const acceso = await pedir(`/admin/ranchos/${RANCHO_B}/accesos`, { metodo: 'POST', datos: { motivo: MOTIVO } });
      assert.strictEqual(acceso.estado, 201);
      await pedir(`/admin/accesos/${acceso.cuerpo.acceso.id}/salida`, { metodo: 'POST' });
      await pool.query('DELETE FROM accesos_admin WHERE id = $1', [acceso.cuerpo.acceso.id]);

      const { estado, cuerpo } = await pedir('/admin/auditoria');
      assert.strictEqual(estado, 200, JSON.stringify(cuerpo));
      const nuevas = cuerpo.filter((e) => new Date(e.creado_en) >= new Date(inicio));
      const acciones = nuevas.map((e) => e.accion);
      for (const accion of [
        'cuenta_suspendida',
        'cuenta_reactivada',
        'contrasena_enlace',
        'raza_creada',
        'raza_editada',
        'raza_desactivada',
        'raza_reactivada',
        'configuracion',
        'soporte_entrada',
        'soporte_salida',
      ]) {
        assert.ok(acciones.includes(accion), `falta ${accion}`);
      }
      const suspension = nuevas.find((e) => e.accion === 'cuenta_suspendida');
      assert.strictEqual(suspension.admin, 'Soporte Central Plataforma Ganado');
      assert.strictEqual(suspension.rancho, 'Rancho El Cerrito');
      assert.strictEqual(suspension.detalle.motivo, MOTIVO);
      const config = nuevas.find((e) => e.accion === 'configuracion' && e.detalle.despues === 7);
      assert.strictEqual(config.detalle.antes, null);
    });

    await prueba('Se filtra por tipo y por rancho', async () => {
      let r = await pedir('/admin/auditoria?tipo=cuentas');
      assert.ok(r.cuerpo.length > 0 && r.cuerpo.every((e) => e.accion.startsWith('cuenta_')));
      r = await pedir(`/admin/auditoria?rancho=${RANCHO_B}`);
      assert.ok(r.cuerpo.length > 0 && r.cuerpo.every((e) => e.rancho_id === RANCHO_B));
    });
  } finally {
    await pool.query("UPDATE usuarios SET estado = 'activo' WHERE id = $1", [SOCIO_A]);
    for (const { clave, valor } of configuracionAntes) {
      await pool.query('UPDATE configuracion_plataforma SET valor = $2 WHERE clave = $1', [clave, valor]);
    }
    await pool.query(`DELETE FROM tokens WHERE usuario_id = $1 AND creado_en >= $2`, [PROPIETARIO_B, inicio]);
    if (razasCreadas.length) await pool.query('DELETE FROM razas WHERE id = ANY($1::uuid[])', [razasCreadas]);
    await pool.query('DELETE FROM registro_auditoria WHERE admin_id = $1 AND creado_en >= $2', [ADMIN, inicio]);
  }

  console.log('\n----------------------------------------------------------------');
  console.log(`  Ejecutadas: ${exitosas + fallidas}   Pasan: ${exitosas}   Fallan: ${fallidas}`);
  console.log('----------------------------------------------------------------');

  await pool.end();

  if (fallidas > 0) {
    console.error('\nEl panel del Admin no cumple sus criterios de aceptacion.');
    process.exitCode = 1;
  } else {
    console.log('\nEl panel del Admin cumple sus criterios de aceptacion.');
  }
}

if (require.main === module) {
  ejecutarPruebas().catch((error) => {
    console.error('\nNo se pudieron correr las pruebas:', error.message);
    console.error('Revisa que la base y el servidor esten levantados y con la migracion 013 aplicada.');
    process.exitCode = 1;
    void pool.end();
  });
}

module.exports = { ejecutarPruebas };
