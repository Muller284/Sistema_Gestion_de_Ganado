/**
 * ============================================================================
 * SISTEMA DE GESTION DE GANADO
 * Pruebas de HU-32: ficha e historial del animal
 * Responsable: Aaron | Sprint 3
 * ============================================================================
 *
 * HU-32  4. El historial muestra quién registró cada evento y cuándo.
 *
 * Los criterios 1 a 3 (encabezado, pestañas y estados vacíos de sanidad y
 * pesajes) son de la pantalla y se prueban en cliente/pruebas/
 * ficha-animal.test.tsx. Acá se prueba que GET /animales/:id trae, para cada
 * evento, el autor y el momento en que quedó guardado, que es de lo que la
 * pantalla arma la línea de tiempo.
 *
 * Contra el PostgreSQL de verdad y contra el servidor levantado.
 * Lo que crea, lo borra al terminar: no hace falta volver a sembrar.
 * ============================================================================
 */

require('../cargar-entorno').cargarEntorno();
const assert = require('assert');
const { randomUUID } = require('crypto');
const { Pool } = require('pg');

const BASE = process.env.URL_SERVIDOR || 'http://localhost:3000';

const PROPIETARIO_A = 'a1000000-0000-4000-8000-000000000001'; // Carlos Gutierrez Mendoza
const CAMPO_A = 'a1000000-0000-4000-8000-000000000004'; // Roberto, encargado de campo: edita animales
const VETERINARIO_A = 'a1000000-0000-4000-8000-000000000003'; // Jorge: solo ve animales
const PROPIETARIO_B = 'b1000000-0000-4000-8000-000000000001';
const RANCHO_A = 'a0000000-0000-4000-8000-000000000001';

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgres://postgres:tu_password@localhost:5432/gestion_ganado',
});

let exitosas = 0;
let fallidas = 0;
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

async function esperarOk(promesa, estadoEsperado = 201) {
  const { estado, cuerpo } = await promesa;
  assert.strictEqual(estado, estadoEsperado, JSON.stringify(cuerpo));
  return cuerpo;
}

async function nombreDe(usuarioId) {
  const resultado = await pool.query('SELECT nombre FROM usuarios WHERE id = $1', [usuarioId]);
  return resultado.rows[0].nombre;
}

function esMomento(valor) {
  return typeof valor === 'string' && !Number.isNaN(Date.parse(valor));
}

async function limpiar() {
  await pool.query(`DELETE FROM animales WHERE rancho_id = $1 AND identificador LIKE $2`, [
    RANCHO_A,
    `%${MARCA}%`,
  ]);
  await pool.query(`DELETE FROM corrales WHERE rancho_id = $1 AND nombre LIKE $2`, [
    RANCHO_A,
    `%${MARCA}%`,
  ]);
}

async function ejecutarPruebas() {
  console.log('================================================================');
  console.log('  HU-32 FICHA E HISTORIAL DEL ANIMAL');
  console.log('================================================================\n');

  const carlos = await nombreDe(PROPIETARIO_A);
  const roberto = await nombreDe(CAMPO_A);

  try {
    // Un animal con historia: lo da de alta el propietario en un corral, el
    // encargado de campo lo mueve y después cambia su estado.
    const norte = (await esperarOk(pedir('POST', '/corrales', { nombre: `Norte ${MARCA}` }))).corral;
    const sur = (await esperarOk(pedir('POST', '/corrales', { nombre: `Sur ${MARCA}` }))).corral;
    const { animal } = await esperarOk(
      pedir('POST', '/animales', {
        identificador: `H-${MARCA}`,
        sexo: 'hembra',
        categoria_codigo: 'vaca',
        corral_id: norte.id,
      }),
    );
    await esperarOk(pedir('POST', `/animales/${animal.id}/movimientos`, { corral_id: sur.id }, CAMPO_A));
    await esperarOk(
      pedir(
        'POST',
        `/animales/${animal.id}/estado`,
        { estado: 'vendido', motivo: `Venta ${MARCA}`, fecha: '2026-10-01' },
        CAMPO_A,
      ),
    );

    const { cuerpo: ficha } = await pedir('GET', `/animales/${animal.id}`);

    await prueba('Criterio 4: el alta dice quién la registró y cuándo', async () => {
      assert.strictEqual(ficha.animal.creado_por_nombre, carlos);
      assert.ok(esMomento(ficha.animal.creado_en), 'falta creado_en');
    });

    await prueba('Criterio 4: cada movimiento dice quién lo registró y cuándo', async () => {
      assert.strictEqual(ficha.movimientos.length, 2);
      const [segundo, primero] = ficha.movimientos;
      assert.strictEqual(primero.corral_origen, null);
      assert.strictEqual(primero.corral_destino, `Norte ${MARCA}`);
      assert.strictEqual(primero.registrado_por, carlos);
      assert.strictEqual(segundo.corral_origen, `Norte ${MARCA}`);
      assert.strictEqual(segundo.corral_destino, `Sur ${MARCA}`);
      assert.strictEqual(segundo.registrado_por, roberto);
      for (const movimiento of ficha.movimientos) assert.ok(esMomento(movimiento.fecha));
    });

    await prueba('Criterio 4: el cambio de estado trae el día elegido y cuándo se guardó', async () => {
      assert.strictEqual(ficha.estados.length, 1);
      const [cambio] = ficha.estados;
      assert.strictEqual(cambio.estado_anterior, 'activo');
      assert.strictEqual(cambio.estado_nuevo, 'vendido');
      assert.strictEqual(cambio.fecha, '2026-10-01');
      assert.strictEqual(cambio.motivo, `Venta ${MARCA}`);
      assert.strictEqual(cambio.registrado_por, roberto);
      assert.ok(esMomento(cambio.creado_en), 'falta creado_en del cambio');
    });

    await prueba('Criterio 4: la baja deja quién la hizo y cuándo', async () => {
      await esperarOk(pedir('DELETE', `/animales/${animal.id}`), 200);
      const { cuerpo } = await pedir('GET', `/animales/${animal.id}`);
      assert.ok(esMomento(cuerpo.animal.eliminado_en), 'falta eliminado_en');
      assert.strictEqual(cuerpo.animal.modificado_por_nombre, carlos);
      await esperarOk(pedir('POST', `/animales/${animal.id}/restaurar`), 201);
    });

    await prueba('Quien solo ve animales también ve la ficha y su historial (HU-22)', async () => {
      const { estado, cuerpo } = await pedir('GET', `/animales/${animal.id}`, undefined, VETERINARIO_A);
      assert.strictEqual(estado, 200, JSON.stringify(cuerpo));
      assert.strictEqual(cuerpo.movimientos.length, 2);
      assert.strictEqual(cuerpo.estados.length, 1);
    });

    await prueba('Otro rancho no ve la ficha ni su historial (HU-03)', async () => {
      const { estado } = await pedir('GET', `/animales/${animal.id}`, undefined, PROPIETARIO_B);
      assert.strictEqual(estado, 404);
    });
  } finally {
    await limpiar();
  }

  console.log('\n----------------------------------------------------------------');
  console.log(`  Ejecutadas: ${exitosas + fallidas}   Pasan: ${exitosas}   Fallan: ${fallidas}`);
  console.log('----------------------------------------------------------------');

  await pool.end();

  if (fallidas > 0) {
    console.error('\nHU-32 no se aprueba.');
    process.exitCode = 1;
  } else {
    console.log('\nHU-32 cumple sus criterios del lado del servidor.');
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
