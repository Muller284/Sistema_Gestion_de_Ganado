/**
 * ============================================================================
 * SISTEMA DE GESTION DE GANADO
 * Pruebas de HU-49 (Aplicacion masiva) y HU-52 (Registrar vacuna desde el
 * celular)
 * Responsable: Romina | Sprint 4
 * ============================================================================
 *
 * Contra el PostgreSQL de verdad y contra el servidor levantado.
 *
 * HU-49, criterios cubiertos:
 *   1. Se mandan los animales elegidos en el listado (sus ids).
 *   2. La confirmacion la hace la pantalla: aca se prueba que la respuesta
 *      dice cuantas se registraron, para que el aviso final diga la verdad.
 *   3. Se guarda todo en una sola operacion: o todas o ninguna.
 *   4. Los dados de baja y los de otro rancho no se cuentan.
 *
 * HU-52: el celular busca el animal por su caravana (GET
 * /sanidad/animales/buscar) y registra con la ruta de HU-48, que ya se prueba
 * en aplicaciones-sanitarias.test.js. Lo demas (48 px, acciones abajo,
 * encadenar) es de la pantalla: cliente/pruebas/sanidad-celular.test.tsx.
 *
 * Lo que crea, lo borra al terminar: no hace falta volver a sembrar.
 * ============================================================================
 */

require('../cargar-entorno').cargarEntorno();
const assert = require('assert');
const { randomUUID } = require('crypto');
const { Pool } = require('pg');

const BASE = process.env.URL_SERVIDOR || 'http://localhost:3000';

const RANCHO_A = 'a0000000-0000-4000-8000-000000000001';
const PROPIETARIO_A = 'a1000000-0000-4000-8000-000000000001'; // Carlos
const SOCIO_A = 'a1000000-0000-4000-8000-000000000002'; // Maria Rene: ve sanidad
const VETERINARIO_A = 'a1000000-0000-4000-8000-000000000003'; // Dr. Jorge: edita sanidad
const CAMPO_A = 'a1000000-0000-4000-8000-000000000004'; // Roberto: no ve sanidad
const ANIMALES_A = [
  'd1000000-0000-4000-8000-000000000001', // 0501
  'd1000000-0000-4000-8000-000000000002', // 0502
  'd1000000-0000-4000-8000-000000000003', // 0503
];
const ANIMAL_B = 'd2000000-0000-4000-8000-000000000001';
const PRODUCTO_IVERMECTINA_A = 'e1000000-0000-4000-8000-000000000003'; // 5 ml
const PRODUCTO_AFTOSA_B = 'e2000000-0000-4000-8000-000000000001';

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgres://postgres:tu_password@localhost:5432/gestion_ganado',
});

let exitosas = 0;
let fallidas = 0;
const MARCA = randomUUID().slice(0, 8);
const OBSERVACION = `Jornada ${MARCA}`;
const DE_BAJA = randomUUID();
const RECIEN_NACIDO = randomUUID();

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

async function pedir(metodo, ruta, cuerpo, usuarioId = VETERINARIO_A) {
  const respuesta = await fetch(`${BASE}${ruta}`, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', 'x-usuario-id': usuarioId },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  return { estado: respuesta.status, cuerpo: await respuesta.json().catch(() => null) };
}

function masiva(datos, usuario = VETERINARIO_A) {
  return pedir('POST', '/sanidad/aplicaciones/masiva', { observacion: OBSERVACION, ...datos }, usuario);
}

/** Las aplicaciones que dejo esta prueba (todas llevan la observacion con la marca). */
async function nuestras() {
  const resultado = await pool.query(
    'SELECT animal_id, lote_id, dosis::float AS dosis, creado_por FROM aplicaciones_sanitarias WHERE observacion = $1',
    [OBSERVACION],
  );
  return resultado.rows;
}

function sumarDias(fecha, dias) {
  const [a, m, d] = fecha.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d + dias)).toISOString().slice(0, 10);
}

async function ejecutarPruebas() {
  console.log('================================================================');
  console.log('  HU-49: APLICACION MASIVA  |  HU-52: VACUNA DESDE EL CELULAR');
  console.log('  Responsable: Romina | Sprint 4');
  console.log('================================================================\n');

  let hoy;

  try {
    hoy = (await pedir('GET', '/sanidad/aplicaciones/opciones')).cuerpo.hoy;
    await pool.query(
      `INSERT INTO animales (id, rancho_id, identificador, tipo_identificador, sexo, categoria_codigo, estado,
                             fecha_nacimiento, creado_por, modificado_por, eliminado_en)
       VALUES ($1, $3, $4, 'caravana', 'hembra', 'vaca', 'activo', NULL, $5, $5, CURRENT_TIMESTAMP),
              ($2, $3, $6, 'caravana', 'hembra', 'ternera', 'activo', $7, $5, $5, NULL)`,
      [DE_BAJA, RECIEN_NACIDO, RANCHO_A, `B${MARCA}`, PROPIETARIO_A, `N${MARCA}`, hoy],
    );

    await prueba('HU-49 criterios 1 y 3: registra la misma aplicacion a todos, con un lote en comun', async () => {
      const { estado, cuerpo } = await masiva({ animal_ids: ANIMALES_A, producto_id: PRODUCTO_IVERMECTINA_A, fecha: hoy });
      assert.strictEqual(estado, 201, JSON.stringify(cuerpo));
      assert.strictEqual(cuerpo.registradas, 3);
      assert.strictEqual(cuerpo.no_contados, 0);
      assert.match(cuerpo.mensaje, /Ivermectina/);

      const filas = await nuestras();
      assert.strictEqual(filas.length, 3);
      assert.deepStrictEqual(new Set(filas.map((f) => f.animal_id)), new Set(ANIMALES_A));
      assert.ok(filas.every((f) => f.lote_id === cuerpo.lote_id), 'no comparten el lote');
      assert.ok(filas.every((f) => f.dosis === 5), 'sin dosis escrita tiene que ir la del producto');
      assert.ok(filas.every((f) => f.creado_por === VETERINARIO_A));
    });

    await prueba('HU-49 criterio 4: los dados de baja, los de otro rancho y los inexistentes no se cuentan', async () => {
      await pool.query('DELETE FROM aplicaciones_sanitarias WHERE observacion = $1', [OBSERVACION]);
      const { estado, cuerpo } = await masiva({
        animal_ids: [ANIMALES_A[0], DE_BAJA, ANIMAL_B, randomUUID(), ANIMALES_A[0]],
        producto_id: PRODUCTO_IVERMECTINA_A,
        fecha: hoy,
      });
      assert.strictEqual(estado, 201, JSON.stringify(cuerpo));
      assert.strictEqual(cuerpo.registradas, 1);
      assert.strictEqual(cuerpo.no_contados, 3, 'el repetido cuenta una sola vez');
      const filas = await nuestras();
      assert.deepStrictEqual(filas.map((f) => f.animal_id), [ANIMALES_A[0]]);
    });

    await prueba('HU-49 criterio 3: si la fecha no le sirve a uno, no se registra ninguna', async () => {
      await pool.query('DELETE FROM aplicaciones_sanitarias WHERE observacion = $1', [OBSERVACION]);
      const { estado, cuerpo } = await masiva({
        animal_ids: [...ANIMALES_A, RECIEN_NACIDO],
        producto_id: PRODUCTO_IVERMECTINA_A,
        fecha: sumarDias(hoy, -1),
      });
      assert.strictEqual(estado, 400, JSON.stringify(cuerpo));
      assert.match(cuerpo.message, new RegExp(`N${MARCA}`), 'no dice cual animal es');
      assert.strictEqual((await nuestras()).length, 0, 'se guardaron algunas');
    });

    await prueba('HU-49: las mismas reglas que de a uno; con un error no se guarda ninguna', async () => {
      const casos = [
        { animal_ids: ANIMALES_A, producto_id: PRODUCTO_AFTOSA_B, fecha: hoy },
        { animal_ids: ANIMALES_A, producto_id: PRODUCTO_IVERMECTINA_A, fecha: sumarDias(hoy, 1) },
        { animal_ids: ANIMALES_A, producto_id: PRODUCTO_IVERMECTINA_A, fecha: hoy, dosis: 0 },
        { animal_ids: [], producto_id: PRODUCTO_IVERMECTINA_A, fecha: hoy },
        { animal_ids: 'todos', producto_id: PRODUCTO_IVERMECTINA_A, fecha: hoy },
        { animal_ids: [ANIMAL_B, DE_BAJA], producto_id: PRODUCTO_IVERMECTINA_A, fecha: hoy },
      ];
      for (const caso of casos) {
        const { estado, cuerpo } = await masiva(caso);
        assert.strictEqual(estado, 400, `${JSON.stringify(caso)} -> ${estado} ${JSON.stringify(cuerpo)}`);
      }
      assert.strictEqual((await nuestras()).length, 0);
    });

    await prueba('HU-49: el socio y quien no ve sanidad no la registran', async () => {
      const datos = { animal_ids: ANIMALES_A, producto_id: PRODUCTO_IVERMECTINA_A, fecha: hoy };
      assert.strictEqual((await masiva(datos, SOCIO_A)).estado, 403);
      assert.strictEqual((await masiva(datos, CAMPO_A)).estado, 403);
      assert.strictEqual((await nuestras()).length, 0);
    });

    await prueba('HU-52: busca el animal por su caravana, sin mirar mayusculas ni espacios', async () => {
      const { estado, cuerpo } = await pedir('GET', '/sanidad/animales/buscar?identificador=%200501%20');
      assert.strictEqual(estado, 200, JSON.stringify(cuerpo));
      assert.strictEqual(cuerpo.animal.id, ANIMALES_A[0]);
      assert.strictEqual(cuerpo.animal.identificador, '0501');
      assert.ok(cuerpo.animal.categoria_codigo);

      const minuscula = await pedir('GET', `/sanidad/animales/buscar?identificador=n${MARCA}`);
      assert.strictEqual(minuscula.estado, 200, JSON.stringify(minuscula.cuerpo));
      assert.strictEqual(minuscula.cuerpo.animal.id, RECIEN_NACIDO);
    });

    await prueba('HU-52: no encuentra un animal dado de baja, uno de otro rancho ni una caravana vacia', async () => {
      const deBaja = await pedir('GET', `/sanidad/animales/buscar?identificador=B${MARCA}`);
      assert.strictEqual(deBaja.estado, 404, JSON.stringify(deBaja.cuerpo));
      assert.match(deBaja.cuerpo.message, new RegExp(`B${MARCA}`));
      // 0501 tambien existe en La Floresta: el rancho B encuentra el suyo, no el de A.
      const delOtro = await pedir('GET', '/sanidad/animales/buscar?identificador=0501', undefined, 'b1000000-0000-4000-8000-000000000003');
      if (delOtro.estado === 200) assert.notStrictEqual(delOtro.cuerpo.animal.id, ANIMALES_A[0]);
      assert.strictEqual((await pedir('GET', '/sanidad/animales/buscar?identificador=9999zz')).estado, 404);
      assert.strictEqual((await pedir('GET', '/sanidad/animales/buscar?identificador=%20')).estado, 400);
      assert.strictEqual((await pedir('GET', '/sanidad/animales/buscar')).estado, 400);
    });

    await prueba('HU-52: buscar es para registrar: el socio y quien no ve sanidad no pueden', async () => {
      assert.strictEqual((await pedir('GET', '/sanidad/animales/buscar?identificador=0501', undefined, SOCIO_A)).estado, 403);
      assert.strictEqual((await pedir('GET', '/sanidad/animales/buscar?identificador=0501', undefined, CAMPO_A)).estado, 403);
    });
  } finally {
    await pool.query('DELETE FROM aplicaciones_sanitarias WHERE observacion = $1', [OBSERVACION]);
    await pool.query('DELETE FROM animales WHERE id = ANY($1::uuid[])', [[DE_BAJA, RECIEN_NACIDO]]);
  }

  console.log('\n----------------------------------------------------------------');
  console.log(`  Ejecutadas: ${exitosas + fallidas}   Pasan: ${exitosas}   Fallan: ${fallidas}`);
  console.log('----------------------------------------------------------------');

  await pool.end();

  if (fallidas > 0) {
    console.error('\nHU-49 y HU-52 no cumplen sus criterios de aceptacion.');
    process.exitCode = 1;
  } else {
    console.log('\nHU-49 y HU-52 cumplen sus criterios de aceptacion.');
  }
}

if (require.main === module) {
  ejecutarPruebas().catch((error) => {
    console.error('\nNo se pudieron correr las pruebas:', error.message);
    console.error('Revisa que la base y el servidor esten levantados y con las semillas cargadas.');
    process.exitCode = 1;
    void pool.end();
  });
}

module.exports = { ejecutarPruebas };
