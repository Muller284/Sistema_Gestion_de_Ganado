/**
 * ============================================================================
 * SISTEMA DE GESTION DE GANADO
 * Pruebas de HU-55 (Registro rapido de pesaje desde el celular)
 * Responsable: Brian | Sprint 4
 * ============================================================================
 *
 * Contra el PostgreSQL de verdad y contra el servidor levantado.
 *
 * Criterios cubiertos (lo que toca al servidor):
 *   1. Con la caravana y el peso alcanza para guardar: un solo pedido, sin
 *      buscar el animal antes. Sin fecha, es hoy.
 *   3. La respuesta trae el pesaje anterior del animal, con el que la
 *      pantalla calcula la ganancia diaria (HU-54).
 * El criterio 2 (48 px y el cursor vuelve a la caravana) es de la pantalla:
 * cliente/pruebas/pesaje-rapido.test.tsx.
 *
 * Ademas: las reglas de HU-53 siguen valiendo, los permisos del modulo
 * pesajes y el aislamiento entre ranchos (HU-03).
 *
 * Lo que crea, lo borra al terminar y deja el peso de cada ficha como estaba.
 * ============================================================================
 */

require('../cargar-entorno').cargarEntorno();
const assert = require('assert');
const { randomUUID } = require('crypto');
const { Pool } = require('pg');

const BASE = process.env.URL_SERVIDOR || 'http://localhost:3000';

const RANCHO_A = 'a0000000-0000-4000-8000-000000000001';
const PROPIETARIO_A = 'a1000000-0000-4000-8000-000000000001'; // Carlos
const SOCIO_A = 'a1000000-0000-4000-8000-000000000002'; // Maria Rene: ve pesajes
const VETERINARIO_A = 'a1000000-0000-4000-8000-000000000003'; // Dr. Jorge: edita pesajes
const CAMPO_A = 'a1000000-0000-4000-8000-000000000004'; // Roberto: edita pesajes
const ALMACEN_A = 'a1000000-0000-4000-8000-000000000005'; // Gonzalo: no ve pesajes
const PROPIETARIO_B = 'b1000000-0000-4000-8000-000000000001'; // Fernando

const NOVILLO_0503 = 'd1000000-0000-4000-8000-000000000003'; // ultimo 402 kg
const NOVILLO_0504 = 'd1000000-0000-4000-8000-000000000004'; // ultimo 371 kg
const BLANCA_B = 'd2000000-0000-4000-8000-000000000001'; // del otro rancho

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgres://postgres:tu_password@localhost:5432/gestion_ganado',
});

let exitosas = 0;
let fallidas = 0;
const MARCA = `prueba HU-55 ${randomUUID().slice(0, 8)}`;
const animalesCreados = [];

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

async function pedir(metodo, ruta, cuerpo, usuarioId = CAMPO_A) {
  const respuesta = await fetch(`${BASE}${ruta}`, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', 'x-usuario-id': usuarioId },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  return { estado: respuesta.status, cuerpo: await respuesta.json().catch(() => null) };
}

/** Un dia AAAA-MM-DD a n dias de hoy (en UTC, con margen para cualquier zona). */
function dia(n) {
  const fecha = new Date();
  fecha.setUTCDate(fecha.getUTCDate() + n);
  return fecha.toISOString().slice(0, 10);
}

async function pesoDeFicha(id) {
  const fila = await pool.query('SELECT peso_kg::float AS peso FROM animales WHERE id = $1', [id]);
  return fila.rows[0].peso;
}

/** Un animal del rancho A creado solo para esta prueba. */
async function animalDePrueba(cambios = {}) {
  const id = randomUUID();
  const datos = { estado: 'activo', eliminado_en: null, ...cambios };
  await pool.query(
    `INSERT INTO animales (id, rancho_id, identificador, tipo_identificador, sexo, categoria_codigo,
                           estado, eliminado_en, creado_por, modificado_por)
     VALUES ($1, $2, $3, 'caravana', 'macho', 'novillo', $4, $5, $6, $6)`,
    [id, RANCHO_A, `P53-${id.slice(0, 6)}`, datos.estado, datos.eliminado_en, PROPIETARIO_A],
  );
  animalesCreados.push(id);
  return id;
}

async function ejecutarPruebas() {
  console.log('================================================================');
  console.log('  HU-55: REGISTRO RAPIDO DE PESAJE DESDE EL CELULAR');
  console.log('  Responsable: Brian | Sprint 4');
  console.log('================================================================\n');

  try {
    await prueba('Criterio 1: con la caravana y el peso alcanza; la fecha es hoy', async () => {
      const { estado, cuerpo } = await pedir('POST', '/pesajes/rapido', {
        identificador: '0503',
        peso_kg: 412,
        observacion: MARCA,
      });
      assert.strictEqual(estado, 201, JSON.stringify(cuerpo));
      assert.strictEqual(cuerpo.animal.id, NOVILLO_0503);
      assert.strictEqual(cuerpo.animal.identificador, '0503');
      assert.strictEqual(cuerpo.pesaje.peso_kg, 412);
      assert.ok(Math.abs(Date.parse(cuerpo.pesaje.fecha) - Date.parse(dia(0))) <= 86400000, 'no es de hoy');
      assert.match(cuerpo.pesaje.registrado_por, /Roberto/);
      assert.strictEqual(cuerpo.peso_actual_kg, 412, 'la ficha no tomo el peso');
      assert.strictEqual(await pesoDeFicha(NOVILLO_0503), 412);
    });

    await prueba('Criterio 3: devuelve el pesaje anterior para la ganancia diaria', async () => {
      const { cuerpo } = await pedir('POST', '/pesajes/rapido', {
        identificador: '0504',
        peso_kg: 380,
        observacion: MARCA,
      });
      // El ultimo de las semillas para 0504: 2026-10-30, 371 kg.
      assert.deepStrictEqual(cuerpo.anterior, { fecha: '2026-10-30', peso_kg: 371 });
    });

    await prueba('Criterio 3: en el primer pesaje no hay anterior', async () => {
      const nuevo = await animalDePrueba();
      const fila = await pool.query('SELECT identificador FROM animales WHERE id = $1', [nuevo]);
      const { estado, cuerpo } = await pedir('POST', '/pesajes/rapido', {
        identificador: fila.rows[0].identificador.toLowerCase(),
        peso_kg: 250,
        observacion: MARCA,
      });
      assert.strictEqual(estado, 201, JSON.stringify(cuerpo));
      assert.strictEqual(cuerpo.animal.id, nuevo, 'no encontro la caravana sin mirar mayusculas');
      assert.strictEqual(cuerpo.anterior, null);
    });

    await prueba('Encadenar: el mismo animal no se pesa dos veces el mismo dia', async () => {
      const { estado, cuerpo } = await pedir('POST', '/pesajes/rapido', { identificador: '0503', peso_kg: 413 });
      assert.strictEqual(estado, 409, JSON.stringify(cuerpo));
      assert.match(cuerpo.message, /0503/);
    });

    await prueba('Una caravana que no existe, vacia o de otro rancho dice que no la encuentra', async () => {
      const inexistente = await pedir('POST', '/pesajes/rapido', { identificador: 'NO-EXISTE-55', peso_kg: 300 });
      assert.strictEqual(inexistente.estado, 404, JSON.stringify(inexistente.cuerpo));
      assert.match(inexistente.cuerpo.message, /NO-EXISTE-55/);
      assert.strictEqual((await pedir('POST', '/pesajes/rapido', { identificador: '  ', peso_kg: 300 })).estado, 400);
      // 0501 es Lucera en El Cerrito y Blanca en La Floresta: cada rancho pesa la suya.
      const otro = await pedir('POST', '/pesajes/rapido', { identificador: '0501', peso_kg: 541, observacion: MARCA }, PROPIETARIO_B);
      assert.strictEqual(otro.estado, 201, JSON.stringify(otro.cuerpo));
      assert.strictEqual(otro.cuerpo.animal.id, BLANCA_B);
    });

    await prueba('Las reglas de HU-53 siguen: peso valido, fecha no futura, animal activo', async () => {
      assert.strictEqual((await pedir('POST', '/pesajes/rapido', { identificador: '0501', peso_kg: 0 })).estado, 400);
      assert.strictEqual(
        (await pedir('POST', '/pesajes/rapido', { identificador: '0501', peso_kg: 470, fecha: dia(2) })).estado,
        400,
      );
      const vendido = await animalDePrueba({ estado: 'vendido' });
      const fila = await pool.query('SELECT identificador FROM animales WHERE id = $1', [vendido]);
      assert.strictEqual(
        (await pedir('POST', '/pesajes/rapido', { identificador: fila.rows[0].identificador, peso_kg: 300 })).estado,
        400,
      );
    });

    await prueba('Permisos: el veterinario pesa; el socio y almacen no', async () => {
      const vet = await pedir('POST', '/pesajes/rapido', { identificador: '0502', peso_kg: 456, observacion: MARCA }, VETERINARIO_A);
      assert.strictEqual(vet.estado, 201, JSON.stringify(vet.cuerpo));
      assert.strictEqual((await pedir('POST', '/pesajes/rapido', { identificador: '0501', peso_kg: 470 }, SOCIO_A)).estado, 403);
      assert.strictEqual((await pedir('POST', '/pesajes/rapido', { identificador: '0501', peso_kg: 470 }, ALMACEN_A)).estado, 403);
    });
  } finally {
    // Lo creado se va, y cada ficha vuelve al peso de su pesaje mas nuevo.
    const tocados = await pool.query(
      `DELETE FROM pesajes WHERE observacion LIKE $1 RETURNING animal_id`,
      [`%${MARCA}%`],
    );
    const ids = [...new Set(tocados.rows.map((f) => f.animal_id))];
    if (ids.length) {
      await pool.query(
        `UPDATE animales a SET peso_kg = u.peso_kg
           FROM (SELECT DISTINCT ON (animal_id) animal_id, peso_kg FROM pesajes
                  WHERE animal_id = ANY($1::uuid[]) AND eliminado_en IS NULL
                  ORDER BY animal_id, fecha DESC, creado_en DESC) u
          WHERE a.id = u.animal_id`,
        [ids],
      );
    }
    if (animalesCreados.length) {
      await pool.query('DELETE FROM animales WHERE id = ANY($1::uuid[])', [animalesCreados]);
    }
  }

  console.log('\n----------------------------------------------------------------');
  console.log(`  Ejecutadas: ${exitosas + fallidas}   Pasan: ${exitosas}   Fallan: ${fallidas}`);
  console.log('----------------------------------------------------------------');

  await pool.end();

  if (fallidas > 0) {
    console.error('\nHU-55 no cumple sus criterios de aceptacion.');
    process.exitCode = 1;
  } else {
    console.log('\nHU-55 cumple sus criterios de aceptacion.');
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
