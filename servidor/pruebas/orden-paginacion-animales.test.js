/**
 * ============================================================================
 * SISTEMA DE GESTION DE GANADO
 * Pruebas de HU-30: orden y paginacion del listado de animales
 * Responsable: Brian | Sprint 3
 * ============================================================================
 *
 * HU-30  Ordenar el listado por cualquier columna y recorrerlo por paginas.
 *   1. El orden y la paginacion se resuelven en la base de datos, no en el
 *      navegador: el servidor devuelve solo la pagina pedida y el total.
 *   2. Con 2.000 animales activos el listado carga en menos de dos segundos.
 *   3. El filtro y el orden se mantienen al cambiar de pagina.
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

const PROPIETARIO_A = 'a1000000-0000-4000-8000-000000000001'; // Carlos
const PROPIETARIO_B = 'b1000000-0000-4000-8000-000000000001'; // Fernando
const RANCHO_A = 'a0000000-0000-4000-8000-000000000001';

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgres://postgres:tu_password@localhost:5432/gestion_ganado',
});

let exitosas = 0;
let fallidas = 0;
const MARCA = randomUUID().slice(0, 6);
const CANTIDAD = 2000;
const LIMITE_MS = 2000;

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

async function pedir(ruta, usuarioId = PROPIETARIO_A) {
  const respuesta = await fetch(`${BASE}${ruta}`, {
    headers: { 'Content-Type': 'application/json', 'x-usuario-id': usuarioId },
  });
  return { estado: respuesta.status, cuerpo: await respuesta.json().catch(() => null) };
}

/** Los animales de esta corrida: busqueda=MARCA filtra solo los nuestros. */
const pagina = (extra = '') => `/animales?busqueda=${MARCA}&pagina=1&porPagina=25${extra}`;

/**
 * 2.000 animales activos de una sola vez, por SQL. Identificadores con ceros
 * a la izquierda (P<marca>-0001) para que el orden de texto sea el numerico.
 * Peso, nacimiento y sexo varian para poder ordenar por ellos; uno de cada
 * diez no tiene peso, para ver que los nulos quedan al final.
 */
async function sembrar() {
  await pool.query(
    `INSERT INTO animales (id, rancho_id, identificador, tipo_identificador, nombre, sexo,
                           fecha_nacimiento, peso_kg, creado_por, modificado_por)
     SELECT gen_random_uuid(), $1, 'P' || $2 || '-' || LPAD(n::text, 4, '0'), 'caravana',
            'Animal ' || n,
            CASE WHEN n % 2 = 0 THEN 'hembra' ELSE 'macho' END,
            DATE '2020-01-01' + (n % 1500),
            CASE WHEN n % 10 = 0 THEN NULL ELSE 100 + (n * 7) % 500 END,
            $3, $3
       FROM generate_series(1, $4) AS n`,
    [RANCHO_A, MARCA, PROPIETARIO_A, CANTIDAD],
  );
  await pool.query('ANALYZE animales');
}

async function limpiar() {
  await pool.query(`DELETE FROM animales WHERE rancho_id = $1 AND identificador LIKE $2`, [
    RANCHO_A,
    `P${MARCA}-%`,
  ]);
}

async function ejecutarPruebas() {
  console.log('================================================================');
  console.log('  HU-30: ORDEN Y PAGINACION DEL LISTADO DE ANIMALES');
  console.log('  Responsable: Brian | Sprint 3');
  console.log('================================================================\n');

  await sembrar();

  await prueba('HU-30 criterio 1: la base devuelve solo la pagina pedida y el total', async () => {
    const { estado, cuerpo } = await pedir(pagina());
    assert.strictEqual(estado, 200, JSON.stringify(cuerpo));
    assert.strictEqual(cuerpo.animales.length, 25);
    assert.strictEqual(cuerpo.total, CANTIDAD);
    assert.strictEqual(cuerpo.paginas, CANTIDAD / 25);
    assert.strictEqual(cuerpo.pagina, 1);
    assert.strictEqual(cuerpo.por_pagina, 25);
    assert.strictEqual(cuerpo.animales[0].identificador, `P${MARCA}-0001`);
  });

  await prueba('HU-30 criterio 1: la ultima pagina trae lo que queda', async () => {
    const { cuerpo } = await pedir(`/animales?busqueda=${MARCA}&pagina=27&porPagina=75`);
    assert.strictEqual(cuerpo.paginas, 27);
    assert.strictEqual(cuerpo.animales.length, CANTIDAD - 26 * 75);
    const fuera = await pedir(`/animales?busqueda=${MARCA}&pagina=99&porPagina=75`);
    assert.strictEqual(fuera.cuerpo.animales.length, 0);
    assert.strictEqual(fuera.cuerpo.total, CANTIDAD);
  });

  await prueba('HU-30: se ordena por cualquier columna, en los dos sentidos', async () => {
    const desc = await pedir(pagina('&orden=identificador&direccion=desc'));
    assert.strictEqual(desc.cuerpo.animales[0].identificador, `P${MARCA}-${CANTIDAD}`);
    assert.strictEqual(desc.cuerpo.orden, 'identificador');
    assert.strictEqual(desc.cuerpo.direccion, 'desc');

    const porPeso = await pedir(pagina('&orden=peso&direccion=desc&porPagina=100'));
    const pesos = porPeso.cuerpo.animales.map((a) => a.peso_kg);
    assert.deepStrictEqual(pesos, [...pesos].sort((a, b) => b - a));

    const porNacimiento = await pedir(pagina('&orden=nacimiento'));
    const fechas = porNacimiento.cuerpo.animales.map((a) => a.fecha_nacimiento);
    assert.deepStrictEqual(fechas, [...fechas].sort());

    for (const orden of ['nombre', 'sexo', 'categoria', 'corral', 'estado', 'creado']) {
      const { estado, cuerpo } = await pedir(pagina(`&orden=${orden}`));
      assert.strictEqual(estado, 200, `${orden}: ${JSON.stringify(cuerpo)}`);
      assert.strictEqual(cuerpo.animales.length, 25, orden);
    }
  });

  await prueba('HU-30: los que no tienen el dato quedan al final, en los dos sentidos', async () => {
    for (const direccion of ['asc', 'desc']) {
      const { cuerpo } = await pedir(
        `/animales?busqueda=${MARCA}&orden=peso&direccion=${direccion}&pagina=20&porPagina=100`,
      );
      assert.ok(cuerpo.animales.every((a) => a.peso_kg === null), direccion);
    }
  });

  await prueba('HU-30: las paginas no se pisan ni se saltean animales', async () => {
    const vistos = new Set();
    for (let n = 1; n <= 20; n++) {
      const { cuerpo } = await pedir(`/animales?busqueda=${MARCA}&orden=sexo&pagina=${n}&porPagina=100`);
      for (const animal of cuerpo.animales) vistos.add(animal.id);
    }
    assert.strictEqual(vistos.size, CANTIDAD);
  });

  await prueba('HU-30 criterio 2: con 2.000 animales activos carga en menos de 2 segundos', async () => {
    // Sin la busqueda: el listado real del rancho, con todos sus activos.
    for (const ruta of [
      '/animales?pagina=1&porPagina=25',
      '/animales?pagina=40&porPagina=25&orden=peso&direccion=desc',
      '/animales?pagina=1&porPagina=100&orden=nacimiento',
    ]) {
      const inicio = Date.now();
      const { estado, cuerpo } = await pedir(ruta);
      const demora = Date.now() - inicio;
      assert.strictEqual(estado, 200);
      assert.ok(cuerpo.total >= CANTIDAD, `total ${cuerpo.total}`);
      assert.ok(demora < LIMITE_MS, `${ruta} tardo ${demora} ms`);
      console.log(`          ${ruta}: ${demora} ms`);
    }
  });

  await prueba('HU-30 criterio 3: filtro y orden se mantienen al cambiar de pagina', async () => {
    const filtro = `&busqueda=${MARCA}&sexo=hembra&orden=identificador&direccion=desc&porPagina=50`;
    const primera = await pedir(`/animales?pagina=1${filtro}`);
    const segunda = await pedir(`/animales?pagina=2${filtro}`);
    assert.strictEqual(primera.cuerpo.total, CANTIDAD / 2);
    assert.strictEqual(segunda.cuerpo.total, CANTIDAD / 2);
    assert.ok(segunda.cuerpo.animales.every((a) => a.sexo === 'hembra'));
    assert.strictEqual(segunda.cuerpo.orden, 'identificador');
    assert.strictEqual(segunda.cuerpo.direccion, 'desc');
    const ultimaDeLaPrimera = primera.cuerpo.animales.at(-1).identificador;
    const primeraDeLaSegunda = segunda.cuerpo.animales[0].identificador;
    assert.ok(ultimaDeLaPrimera > primeraDeLaSegunda, `${ultimaDeLaPrimera} / ${primeraDeLaSegunda}`);
    const ids = new Set(primera.cuerpo.animales.map((a) => a.id));
    assert.ok(segunda.cuerpo.animales.every((a) => !ids.has(a.id)));
  });

  await prueba('HU-30: un orden o una pagina mal formados son un 400, nunca SQL', async () => {
    for (const extra of [
      '&orden=contrasena',
      '&orden=identificador;DROP TABLE animales',
      '&direccion=arriba',
      '&porPagina=1000',
      '&porPagina=0',
    ]) {
      const { estado } = await pedir(pagina(extra));
      assert.strictEqual(estado, 400, extra);
    }
    const { estado } = await pedir(`/animales?pagina=0&porPagina=25`);
    assert.strictEqual(estado, 400);
    const sigue = await pool.query(`SELECT COUNT(*)::int AS n FROM animales WHERE identificador LIKE $1`, [
      `P${MARCA}-%`,
    ]);
    assert.strictEqual(sigue.rows[0].n, CANTIDAD);
  });

  await prueba('HU-30 y HU-34: la vista de bajas se pagina solo con las bajas', async () => {
    await pool.query(
      `UPDATE animales SET eliminado_en = CURRENT_TIMESTAMP
        WHERE rancho_id = $1 AND identificador IN ($2, $3, $4)`,
      [RANCHO_A, `P${MARCA}-0001`, `P${MARCA}-0002`, `P${MARCA}-0003`],
    );
    const { cuerpo } = await pedir(`/animales?estado=todos&bajas=solo&busqueda=${MARCA}&pagina=1&porPagina=25`);
    assert.strictEqual(cuerpo.total, 3);
    assert.ok(cuerpo.animales.every((a) => a.eliminado_en));
    const vigentes = await pedir(pagina());
    assert.strictEqual(vigentes.cuerpo.total, CANTIDAD - 3);
  });

  await prueba('Sin pagina el listado responde la lista entera, como antes', async () => {
    const { estado, cuerpo } = await pedir(`/animales?busqueda=${MARCA}&sexo=macho`);
    assert.strictEqual(estado, 200);
    assert.ok(Array.isArray(cuerpo));
    assert.strictEqual(cuerpo.length, CANTIDAD / 2 - 2);
  });

  await prueba('Otro rancho no ve ni cuenta estos animales', async () => {
    const { cuerpo } = await pedir(`/animales?busqueda=${MARCA}&pagina=1&porPagina=25`, PROPIETARIO_B);
    assert.strictEqual(cuerpo.total, 0);
    assert.strictEqual(cuerpo.animales.length, 0);
  });

  // ------------------------------------------------------------------------
  await limpiar();

  console.log('\n----------------------------------------------------------------');
  console.log(`  Ejecutadas: ${exitosas + fallidas}   Pasan: ${exitosas}   Fallan: ${fallidas}`);
  console.log('----------------------------------------------------------------');

  await pool.end();

  if (fallidas > 0) {
    console.error('\nHU-30 no se aprueba.');
    process.exitCode = 1;
  } else {
    console.log('\nHU-30 cumple sus criterios.');
  }
}

if (require.main === module) {
  ejecutarPruebas().catch(async (error) => {
    console.error('\nNo se pudieron correr las pruebas:', error.message);
    console.error('Revisa que el servidor este corriendo en', BASE);
    process.exitCode = 1;
    await limpiar().catch(() => undefined);
    void pool.end();
  });
}

module.exports = { ejecutarPruebas };
