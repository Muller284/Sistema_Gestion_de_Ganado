/**
 * ============================================================================
 * SISTEMA DE GESTION DE GANADO
 * Pruebas de HU-36 (Creacion de corrales) y de la baja logica de corrales (HU-34)
 * Responsable: Romina | Sprint 2
 * ============================================================================
 *
 * Contra el PostgreSQL de verdad y contra el servidor levantado.
 *
 * Criterios cubiertos:
 *   1. El nombre del corral es unico dentro del rancho.
 *   2. La capacidad es opcional; si no se carga, no hay aviso de sobrepoblacion.
 *   3. El listado muestra la ocupacion actual sobre la capacidad.
 *
 * Ademas: otro rancho puede usar el mismo nombre (HU-03), el socio y el
 * colaborador sin permiso no crean corrales, y la baja se puede deshacer.
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
const VETERINARIO_A = 'a1000000-0000-4000-8000-000000000003'; // Dr. Jorge: no ve corrales
const CAMPO_A = 'a1000000-0000-4000-8000-000000000004'; // Roberto: edita corrales
const PROPIETARIO_B = 'b1000000-0000-4000-8000-000000000001'; // Fernando
const RANCHO_A = 'a0000000-0000-4000-8000-000000000001';
const RANCHO_B = 'b0000000-0000-4000-8000-000000000002';

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgres://postgres:tu_password@localhost:5432/gestion_ganado',
});

let exitosas = 0;
let fallidas = 0;
// Un sufijo por corrida, para no chocar con datos cargados a mano.
const MARCA = randomUUID().slice(0, 8);

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

async function pedir(metodo, ruta, cuerpo, usuarioId = PROPIETARIO_A) {
  const respuesta = await fetch(`${BASE}${ruta}`, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', 'x-usuario-id': usuarioId },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  return { estado: respuesta.status, cuerpo: await respuesta.json().catch(() => null) };
}

async function ejecutarPruebas() {
  console.log('================================================================');
  console.log('  HU-36: CREACION DE CORRALES');
  console.log('  Responsable: Romina | Sprint 2');
  console.log('================================================================\n');

  const nombre = `Corral prueba ${MARCA}`;
  let corral;

  await prueba('Se crea un corral con nombre, capacidad y superficie', async () => {
    const { estado, cuerpo } = await pedir('POST', '/corrales', {
      nombre,
      capacidad: 1,
      superficie_ha: 2.5,
    });
    assert.strictEqual(estado, 201, JSON.stringify(cuerpo));
    corral = cuerpo.corral;
    assert.strictEqual(corral.nombre, nombre);
    assert.strictEqual(corral.capacidad, 1);
    assert.strictEqual(Number(corral.superficie_ha), 2.5);
  });

  await prueba('Criterio 1: no se repite el nombre en el mismo rancho (sin importar mayusculas)', async () => {
    const { estado } = await pedir('POST', '/corrales', { nombre: nombre.toUpperCase() });
    assert.strictEqual(estado, 409);
  });

  await prueba('Criterio 1: otro rancho puede usar el mismo nombre', async () => {
    const { estado } = await pedir('POST', '/corrales', { nombre }, PROPIETARIO_B);
    assert.strictEqual(estado, 201);
  });

  await prueba('Criterio 2: sin capacidad se crea y nunca avisa sobrepoblacion', async () => {
    const { estado, cuerpo } = await pedir('POST', '/corrales', { nombre: `Sin tope ${MARCA}` });
    assert.strictEqual(estado, 201);
    assert.strictEqual(cuerpo.corral.capacidad, null);
    assert.strictEqual(cuerpo.corral.sobrepoblado, false);
  });

  await prueba('Criterio 3: el listado muestra la ocupacion y avisa al pasar la capacidad', async () => {
    for (const sufijo of ['1', '2']) {
      const alta = await pedir('POST', '/animales', {
        identificador: `C-${MARCA}-${sufijo}`,
        sexo: 'hembra',
        corral_id: corral.id,
      });
      assert.strictEqual(alta.estado, 201, JSON.stringify(alta.cuerpo));
    }
    const { cuerpo } = await pedir('GET', '/corrales');
    const fila = cuerpo.find((c) => c.id === corral.id);
    assert.strictEqual(fila.ocupacion, 2);
    assert.strictEqual(fila.capacidad, 1);
    assert.strictEqual(fila.sobrepoblado, true);
  });

  await prueba('La capacidad tiene que ser un entero positivo', async () => {
    const { estado } = await pedir('POST', '/corrales', { nombre: `Mal ${MARCA}`, capacidad: -3 });
    assert.strictEqual(estado, 400);
  });

  await prueba('El socio ve los corrales pero no los crea (HU-21)', async () => {
    assert.strictEqual((await pedir('GET', '/corrales', undefined, SOCIO_A)).estado, 200);
    const { estado, cuerpo } = await pedir('POST', '/corrales', { nombre: `S ${MARCA}` }, SOCIO_A);
    assert.strictEqual(estado, 403);
    assert.strictEqual(cuerpo.motivo, 'sin_permiso_modulo');
  });

  await prueba('Un colaborador cuyo tipo no tiene corrales no los ve (HU-22)', async () => {
    const { estado } = await pedir('GET', '/corrales', undefined, VETERINARIO_A);
    assert.strictEqual(estado, 403);
  });

  await prueba('Un colaborador con edicion de corrales si los crea (HU-22)', async () => {
    const { estado } = await pedir('POST', '/corrales', { nombre: `Campo ${MARCA}` }, CAMPO_A);
    assert.strictEqual(estado, 201);
  });

  await prueba('HU-34: con animales adentro no se da de baja', async () => {
    const { estado } = await pedir('DELETE', `/corrales/${corral.id}`);
    assert.strictEqual(estado, 409);
  });

  await prueba('HU-34: la baja marca el corral, no lo borra, y sale del listado normal', async () => {
    const vacio = (await pedir('POST', '/corrales', { nombre: `Baja ${MARCA}` })).cuerpo.corral;
    assert.strictEqual((await pedir('DELETE', `/corrales/${vacio.id}`)).estado, 200);

    const fila = await pool.query('SELECT eliminado_en FROM corrales WHERE id = $1', [vacio.id]);
    assert.strictEqual(fila.rowCount, 1);
    assert.ok(fila.rows[0].eliminado_en);

    const normales = (await pedir('GET', '/corrales')).cuerpo;
    assert.ok(!normales.some((c) => c.id === vacio.id));
    const conBajas = (await pedir('GET', '/corrales?bajas=1')).cuerpo;
    assert.ok(conBajas.some((c) => c.id === vacio.id));

    const restaurado = await pedir('POST', `/corrales/${vacio.id}/restaurar`);
    assert.strictEqual(restaurado.estado, 201);
    assert.strictEqual(restaurado.cuerpo.corral.eliminado_en, null);
  });

  await prueba('HU-03: un rancho no toca los corrales de otro', async () => {
    const { estado } = await pedir('PATCH', `/corrales/${corral.id}`, { nombre: 'Robado' }, PROPIETARIO_B);
    assert.strictEqual(estado, 404);
  });

  // ------------------------------------------------------------------------
  await pool.query(
    `DELETE FROM animales WHERE rancho_id IN ($1, $2) AND identificador LIKE $3`,
    [RANCHO_A, RANCHO_B, `%${MARCA}%`],
  );
  await pool.query(`DELETE FROM corrales WHERE rancho_id IN ($1, $2) AND nombre LIKE $3`, [
    RANCHO_A,
    RANCHO_B,
    `%${MARCA}%`,
  ]);

  console.log('\n----------------------------------------------------------------');
  console.log(`  Ejecutadas: ${exitosas + fallidas}   Pasan: ${exitosas}   Fallan: ${fallidas}`);
  console.log('----------------------------------------------------------------');

  await pool.end();

  if (fallidas > 0) {
    console.error('\nHU-36 no se aprueba.');
    process.exitCode = 1;
  } else {
    console.log('\nHU-36 cumple sus criterios.');
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
