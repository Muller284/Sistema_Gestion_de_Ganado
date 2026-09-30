/**
 * ============================================================================
 * SISTEMA DE GESTION DE GANADO
 * Pruebas de HU-16 (Guia de configuracion inicial)
 * ============================================================================
 *
 * Contra el PostgreSQL de verdad y contra el servidor levantado.
 *
 * Criterios cubiertos:
 *   1. Muestra cuatro pasos: animales, corrales, vacunas y equipo.
 *   2. Cada paso indica si está pendiente, en curso o completo.
 *   3. Puedo abandonarla y retomarla más adelante desde donde quedé.
 *   4. Los pasos de fases posteriores quedan visibles pero marcados como no
 *      disponibles todavía.
 *
 * Usa el rancho de Ariel (propietario sin rancho en las semillas): se le crea
 * uno, se prueba y se borra al terminar. Asi el rancho con equipo de las
 * semillas no se toca.
 * ============================================================================
 */

require('../cargar-entorno').cargarEntorno();
const assert = require('assert');
const { randomUUID } = require('crypto');
const { Pool } = require('pg');

const BASE = process.env.URL_SERVIDOR || 'http://localhost:3000';

const ARIEL = 'c1000000-0000-4000-8000-000000000001'; // propietario sin rancho
const PROPIETARIO_A = 'a1000000-0000-4000-8000-000000000001';
const SOCIO_A = 'a1000000-0000-4000-8000-000000000002';
const RANCHO_A = 'a0000000-0000-4000-8000-000000000001';

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
      ...(opciones.headers ?? {}),
    },
  });
  const cuerpo = await respuesta.json().catch(() => null);
  return { estado: respuesta.status, cuerpo };
}

const post = (ruta, usuarioId, cuerpo = {}) =>
  pedir(ruta, { method: 'POST', body: JSON.stringify(cuerpo) }, usuarioId);

function paso(guia, clave) {
  return guia.pasos.find((p) => p.clave === clave);
}

async function ejecutarPruebas() {
  console.log('================================================================');
  console.log('  HU-16 GUIA DE CONFIGURACION INICIAL');
  console.log('================================================================\n');

  // Un rancho recien creado para Ariel, sin equipo ni pasos.
  const ranchoId = randomUUID();
  const creado = await post('/ranchos', ARIEL, {
    id: ranchoId,
    nombre: 'Rancho de la guia',
    departamento: 'Cochabamba',
    localidad: 'Sacaba',
    superficie: 120,
    tipo_produccion: 'leche',
    pais_codigo: 'BO',
  });
  assert.strictEqual(creado.estado, 201, `No se pudo crear el rancho: ${JSON.stringify(creado.cuerpo)}`);

  try {
    // ----------------------------------------------------------------------
    console.log('  Criterios 1 y 4 · Los cuatro pasos y los no disponibles');

    await prueba('Muestra cuatro pasos, en el orden de la historia', async () => {
      const { estado, cuerpo } = await pedir('/guia', {}, ARIEL);
      assert.strictEqual(estado, 200, JSON.stringify(cuerpo));
      assert.deepStrictEqual(
        cuerpo.pasos.map((p) => p.clave),
        ['animales', 'corrales', 'vacunas', 'equipo'],
      );
      assert.strictEqual(cuerpo.total, 4);
    });

    await prueba('Los pasos de fases posteriores se ven, marcados como no disponibles', async () => {
      const { cuerpo } = await pedir('/guia', {}, ARIEL);
      for (const clave of ['animales', 'corrales', 'vacunas']) {
        const p = paso(cuerpo, clave);
        assert.strictEqual(p.disponible, false, `${clave} figura disponible`);
        assert.ok(p.fase > 1, `${clave} no dice en que fase llega`);
        assert.strictEqual(p.ruta, null, `${clave} lleva a una pantalla que no existe`);
      }
      assert.strictEqual(paso(cuerpo, 'equipo').disponible, true);
    });

    await prueba('Un paso no disponible no se puede marcar', async () => {
      const { estado, cuerpo } = await post('/guia/pasos/animales/completar', ARIEL);
      assert.strictEqual(estado, 400);
      assert.match(cuerpo.message, /fase 2/);
    });

    await prueba('Un paso que no existe da 404', async () => {
      const { estado } = await post('/guia/pasos/cosechas/visita', ARIEL);
      assert.strictEqual(estado, 404);
    });

    // ----------------------------------------------------------------------
    console.log('\n  Criterio 2 · Pendiente, en curso o completo');

    await prueba('En un rancho nuevo todo empieza pendiente y en cero', async () => {
      const { cuerpo } = await pedir('/guia', {}, ARIEL);
      assert.ok(cuerpo.pasos.every((p) => p.estado === 'pendiente'));
      assert.strictEqual(cuerpo.completos, 0);
      assert.strictEqual(cuerpo.siguiente, 'equipo');
    });

    await prueba('Abrir un paso lo deja en curso', async () => {
      const { cuerpo } = await post('/guia/pasos/equipo/visita', ARIEL);
      assert.strictEqual(paso(cuerpo, 'equipo').estado, 'en_curso');
    });

    await prueba('Darlo por terminado lo deja completo y suma al progreso', async () => {
      const { cuerpo } = await post('/guia/pasos/equipo/completar', ARIEL);
      assert.strictEqual(paso(cuerpo, 'equipo').estado, 'completo');
      assert.strictEqual(cuerpo.completos, 1);
    });

    await prueba('Reabrirlo lo devuelve a en curso', async () => {
      const { cuerpo } = await post('/guia/pasos/equipo/reabrir', ARIEL);
      assert.strictEqual(paso(cuerpo, 'equipo').estado, 'en_curso');
      assert.strictEqual(cuerpo.completos, 0);
    });

    await prueba('Un paso con datos esta en curso aunque nunca se haya abierto', async () => {
      // El rancho A de las semillas ya tiene equipo y nadie abrio la guia.
      await pool.query('DELETE FROM pasos_guia WHERE rancho_id = $1', [RANCHO_A]);
      const { cuerpo } = await pedir('/guia', {}, PROPIETARIO_A);
      const equipo = paso(cuerpo, 'equipo');
      assert.ok(equipo.datos > 0);
      assert.strictEqual(equipo.estado, 'en_curso');
    });

    // ----------------------------------------------------------------------
    console.log('\n  Criterio 3 · Abandonarla y retomarla');

    await prueba('Ponerla en pausa no borra el progreso', async () => {
      await post('/guia/pasos/equipo/completar', ARIEL);
      const { cuerpo } = await post('/guia/pausa', ARIEL, { pausada: true });
      assert.strictEqual(cuerpo.pausada, true);
      assert.strictEqual(paso(cuerpo, 'equipo').estado, 'completo');
    });

    await prueba('La pausa queda guardada: sigue asi al volver a pedirla', async () => {
      const { cuerpo } = await pedir('/guia', {}, ARIEL);
      assert.strictEqual(cuerpo.pausada, true);
      assert.strictEqual(cuerpo.completos, 1);
    });

    await prueba('Al retomarla sigue desde donde quedo', async () => {
      await post('/guia/pasos/equipo/reabrir', ARIEL);
      const { cuerpo } = await post('/guia/pausa', ARIEL, { pausada: false });
      assert.strictEqual(cuerpo.pausada, false);
      assert.strictEqual(cuerpo.siguiente, 'equipo');
      assert.strictEqual(paso(cuerpo, 'equipo').estado, 'en_curso');
    });

    // ----------------------------------------------------------------------
    console.log('\n  Aislamiento y roles');

    await prueba('Cada rancho tiene su propia guia', async () => {
      const deA = await pedir('/guia', {}, PROPIETARIO_A);
      const deAriel = await pedir('/guia', {}, ARIEL);
      assert.notStrictEqual(paso(deA.cuerpo, 'equipo').datos, paso(deAriel.cuerpo, 'equipo').datos);
      const filas = await pool.query('SELECT rancho_id FROM pasos_guia WHERE rancho_id = $1', [ranchoId]);
      assert.ok(filas.rowCount > 0);
    });

    await prueba('El socio la puede ver pero no la puede cambiar', async () => {
      const ver = await pedir('/guia', {}, SOCIO_A);
      assert.strictEqual(ver.estado, 200);
      const cambiar = await post('/guia/pasos/equipo/completar', SOCIO_A);
      assert.strictEqual(cambiar.estado, 403);
    });
  } finally {
    // Borrar el rancho de prueba se lleva sus pasos (ON DELETE CASCADE).
    await pool.query('UPDATE usuarios SET rancho_id = NULL WHERE id = $1', [ARIEL]);
    await pool.query('DELETE FROM ranchos WHERE id = $1', [ranchoId]);
    await pool.query('DELETE FROM pasos_guia WHERE rancho_id = $1', [RANCHO_A]);
  }

  console.log('\n----------------------------------------------------------------');
  console.log(`  Ejecutadas: ${exitosas + fallidas}   Pasan: ${exitosas}   Fallan: ${fallidas}`);
  console.log('----------------------------------------------------------------');

  await pool.end();

  if (fallidas > 0) {
    console.error('\nHU-16 no se aprueba.');
    process.exitCode = 1;
  } else {
    console.log('\nHU-16 cumple sus criterios.');
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
