/**
 * ============================================================================
 * SISTEMA DE GESTION DE GANADO
 * Pruebas de HU-47 (Esquemas de vacunacion)
 * Responsable: Aaron | Sprint 4
 * ============================================================================
 *
 * Contra el PostgreSQL de verdad y contra el servidor levantado.
 *
 * Criterios cubiertos:
 *   1. Un esquema dice que producto, a que animales (categorias, sexo y rango
 *      de edad), cuantas dosis, cada cuantos dias y si tiene refuerzo.
 *   2. Solo se eligen productos del catalogo del rancho (HU-46).
 *   3. Cambiar un esquema no toca las aplicaciones ya registradas; darlo de
 *      baja lo saca del listado y su historial queda.
 *
 * Ademas: los permisos del modulo sanidad (el veterinario edita, el socio
 * solo ve, almacen no entra) y el aislamiento entre ranchos (HU-03).
 *
 * Lo que crea, lo borra al terminar: no hace falta volver a sembrar.
 * ============================================================================
 */

require('../cargar-entorno').cargarEntorno();
const assert = require('assert');
const { randomUUID } = require('crypto');
const { Pool } = require('pg');

const BASE = process.env.URL_SERVIDOR || 'http://localhost:3000';

const PROPIETARIO_A = 'a1000000-0000-4000-8000-000000000001'; // Carlos
const SOCIO_A = 'a1000000-0000-4000-8000-000000000002'; // Maria Rene: ve sanidad
const VETERINARIO_A = 'a1000000-0000-4000-8000-000000000003'; // Dr. Jorge: edita sanidad
const CAMPO_A = 'a1000000-0000-4000-8000-000000000004'; // Roberto: no ve sanidad
const ALMACEN_A = 'a1000000-0000-4000-8000-000000000005'; // Gonzalo: no ve sanidad
const PROPIETARIO_B = 'b1000000-0000-4000-8000-000000000001'; // Fernando
const PRODUCTO_AFTOSA_A = 'e1000000-0000-4000-8000-000000000001';
const PRODUCTO_AFTOSA_B = 'e2000000-0000-4000-8000-000000000001';
const ESQUEMA_AFTOSA_A = 'e1000000-0000-4000-8000-000000000101';

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgres://postgres:tu_password@localhost:5432/gestion_ganado',
});

let exitosas = 0;
let fallidas = 0;
const MARCA = randomUUID().slice(0, 8);
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

async function pedir(metodo, ruta, cuerpo, usuarioId = PROPIETARIO_A) {
  const respuesta = await fetch(`${BASE}${ruta}`, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', 'x-usuario-id': usuarioId },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  return { estado: respuesta.status, cuerpo: await respuesta.json().catch(() => null) };
}

/** Un esquema valido; cada prueba cambia lo que necesita. */
function datos(cambios = {}) {
  return {
    producto_id: PRODUCTO_AFTOSA_A,
    nombre: `Esquema ${MARCA}`,
    categorias: ['ternero', 'ternera'],
    sexo: null,
    edad_minima_meses: 2,
    edad_maxima_meses: 10,
    dosis: 2,
    intervalo_dias: 21,
    refuerzo_dias: 365,
    ...cambios,
  };
}

async function crear(cambios, usuario = VETERINARIO_A) {
  const respuesta = await pedir('POST', '/sanidad/esquemas', datos(cambios), usuario);
  if (respuesta.estado === 201) creados.push(respuesta.cuerpo.esquema.id);
  return respuesta;
}

async function ejecutarPruebas() {
  console.log('================================================================');
  console.log('  HU-47: ESQUEMAS DE VACUNACION');
  console.log('  Responsable: Aaron | Sprint 4');
  console.log('================================================================\n');

  let esquema;

  try {
    await prueba('El listado trae los esquemas del rancho, sus productos y las categorias', async () => {
      const { estado, cuerpo } = await pedir('GET', '/sanidad/esquemas');
      assert.strictEqual(estado, 200, JSON.stringify(cuerpo));
      const aftosa = cuerpo.esquemas.find((e) => e.id === ESQUEMA_AFTOSA_A);
      assert.ok(aftosa, 'falta el esquema de aftosa de las semillas');
      assert.strictEqual(aftosa.producto_nombre, 'Vacuna antiaftosa');
      assert.strictEqual(aftosa.refuerzo_dias, 180);
      assert.ok(aftosa.animales > 0, 'no cuenta los animales a los que les toca');
      assert.ok(cuerpo.productos.some((p) => p.id === PRODUCTO_AFTOSA_A));
      assert.ok(cuerpo.categorias.includes('ternera'));
    });

    await prueba('Criterio 1: el veterinario crea un esquema con todo lo que lo define', async () => {
      const { estado, cuerpo } = await crear({ nombre: `  Esquema   ${MARCA} ` });
      assert.strictEqual(estado, 201, JSON.stringify(cuerpo));
      esquema = cuerpo.esquema;
      assert.strictEqual(esquema.nombre, `Esquema ${MARCA}`, 'no limpio los espacios');
      assert.deepStrictEqual(esquema.categorias, ['ternero', 'ternera']);
      assert.strictEqual(esquema.sexo, null);
      assert.strictEqual(esquema.edad_minima_meses, 2);
      assert.strictEqual(esquema.edad_maxima_meses, 10);
      assert.strictEqual(esquema.dosis, 2);
      assert.strictEqual(esquema.intervalo_dias, 21);
      assert.strictEqual(esquema.refuerzo_dias, 365);
      assert.match(cuerpo.mensaje, new RegExp(MARCA));
    });

    await prueba('Sin categorias es para todas; con una sola dosis el intervalo se descarta', async () => {
      const { estado, cuerpo } = await crear({
        nombre: `Todas ${MARCA}`,
        categorias: [],
        edad_minima_meses: '',
        edad_maxima_meses: null,
        dosis: 1,
        intervalo_dias: 30,
        refuerzo_dias: null,
      });
      assert.strictEqual(estado, 201, JSON.stringify(cuerpo));
      assert.strictEqual(cuerpo.esquema.categorias, null);
      assert.strictEqual(cuerpo.esquema.edad_minima_meses, 0);
      assert.strictEqual(cuerpo.esquema.intervalo_dias, null);
      assert.strictEqual(cuerpo.esquema.refuerzo_dias, null);
    });

    await prueba('El nombre no se repite en el rancho (sin importar mayusculas), pero otro rancho puede usarlo', async () => {
      const repetido = await crear({ nombre: `ESQUEMA ${MARCA}` });
      assert.strictEqual(repetido.estado, 409);
      const otro = await crear({ producto_id: PRODUCTO_AFTOSA_B }, PROPIETARIO_B);
      assert.strictEqual(otro.estado, 201, JSON.stringify(otro.cuerpo));
    });

    await prueba('Criterio 2: no se puede usar un producto de otro rancho ni uno inventado', async () => {
      const ajeno = await crear({ nombre: `Ajeno ${MARCA}`, producto_id: PRODUCTO_AFTOSA_B });
      assert.strictEqual(ajeno.estado, 400);
      const inventado = await crear({ nombre: `Inventado ${MARCA}`, producto_id: randomUUID() });
      assert.strictEqual(inventado.estado, 400);
      const sinProducto = await crear({ nombre: `Sin producto ${MARCA}`, producto_id: '' });
      assert.strictEqual(sinProducto.estado, 400);
    });

    await prueba('Valida lo que define al esquema', async () => {
      const casos = [
        [{ nombre: '   ' }, 'sin nombre'],
        [{ nombre: 'x'.repeat(121) }, 'nombre largo'],
        [{ categorias: ['dragon'] }, 'categoria inexistente'],
        [{ categorias: 'ternera' }, 'categorias que no son lista'],
        [{ sexo: 'otro' }, 'sexo invalido'],
        [{ categorias: ['vaca'], sexo: 'macho' }, 'vaca en un esquema para machos'],
        [{ edad_minima_meses: -1 }, 'edad negativa'],
        [{ edad_minima_meses: 1.5 }, 'edad con decimales'],
        [{ edad_minima_meses: 12, edad_maxima_meses: 6 }, 'edades cruzadas'],
        [{ dosis: 0 }, 'cero dosis'],
        [{ dosis: 11 }, 'demasiadas dosis'],
        [{ dosis: 'dos' }, 'dosis que no es numero'],
        [{ dosis: 3, intervalo_dias: null }, 'varias dosis sin intervalo'],
        [{ intervalo_dias: 0 }, 'intervalo cero'],
        [{ refuerzo_dias: 0 }, 'refuerzo cero'],
        [{ refuerzo_dias: 5000 }, 'refuerzo de mas de diez anos'],
      ];
      for (const [cambios, motivo] of casos) {
        const { estado, cuerpo } = await crear({ nombre: `Invalido ${MARCA}`, ...cambios });
        assert.strictEqual(estado, 400, `${motivo}: vino ${estado} ${JSON.stringify(cuerpo)}`);
        assert.ok(cuerpo.message, `${motivo}: sin mensaje`);
      }
    });

    await prueba('El socio ve los esquemas pero no los crea; quien no tiene sanidad no entra', async () => {
      assert.strictEqual((await pedir('GET', '/sanidad/esquemas', undefined, SOCIO_A)).estado, 200);
      assert.strictEqual((await crear({ nombre: `Socio ${MARCA}` }, SOCIO_A)).estado, 403);
      assert.strictEqual((await pedir('GET', '/sanidad/esquemas', undefined, CAMPO_A)).estado, 403);
      assert.strictEqual((await pedir('GET', '/sanidad/esquemas', undefined, ALMACEN_A)).estado, 403);
    });

    await prueba('Aislamiento: el rancho B no ve ni toca los esquemas del rancho A', async () => {
      const { cuerpo } = await pedir('GET', '/sanidad/esquemas', undefined, PROPIETARIO_B);
      assert.ok(!cuerpo.esquemas.some((e) => e.id === esquema.id || e.id === ESQUEMA_AFTOSA_A));
      assert.ok(!cuerpo.productos.some((p) => p.id === PRODUCTO_AFTOSA_A));
      const cambio = await pedir('PATCH', `/sanidad/esquemas/${esquema.id}`, datos({ producto_id: PRODUCTO_AFTOSA_B }), PROPIETARIO_B);
      assert.strictEqual(cambio.estado, 404);
      const baja = await pedir('DELETE', `/sanidad/esquemas/${esquema.id}`, undefined, PROPIETARIO_B);
      assert.strictEqual(baja.estado, 404);
    });

    await prueba('Criterio 3: cambiar un esquema no toca las aplicaciones ya registradas', async () => {
      const contar = async () =>
        (await pool.query(
          `SELECT COUNT(*)::int AS n, MAX(numero_dosis) AS maxima FROM aplicaciones_sanitarias
            WHERE esquema_id = $1 AND eliminado_en IS NULL`,
          [ESQUEMA_AFTOSA_A],
        )).rows[0];
      const antes = await contar();
      const original = (await pedir('GET', '/sanidad/esquemas')).cuerpo.esquemas.find((e) => e.id === ESQUEMA_AFTOSA_A);

      const { estado, cuerpo } = await pedir(
        'PATCH',
        `/sanidad/esquemas/${ESQUEMA_AFTOSA_A}`,
        { ...original, dosis: 2, intervalo_dias: 30, refuerzo_dias: 365 },
        VETERINARIO_A,
      );
      try {
        assert.strictEqual(estado, 200, JSON.stringify(cuerpo));
        assert.strictEqual(cuerpo.esquema.dosis, 2);
        assert.strictEqual(cuerpo.esquema.refuerzo_dias, 365);
        assert.deepStrictEqual(await contar(), antes);
      } finally {
        // Lo deja como lo cargan las semillas.
        await pool.query(
          `UPDATE esquemas_vacunacion SET dosis = $2, intervalo_dias = $3, refuerzo_dias = $4 WHERE id = $1`,
          [ESQUEMA_AFTOSA_A, original.dosis, original.intervalo_dias, original.refuerzo_dias],
        );
      }
    });

    await prueba('Al editar tambien valida y no deja tomar el nombre de otro esquema', async () => {
      const otro = await crear({ nombre: `Segundo ${MARCA}` });
      assert.strictEqual(otro.estado, 201);
      const choque = await pedir('PATCH', `/sanidad/esquemas/${otro.cuerpo.esquema.id}`, datos(), VETERINARIO_A);
      assert.strictEqual(choque.estado, 409);
      const invalido = await pedir('PATCH', `/sanidad/esquemas/${esquema.id}`, datos({ dosis: 0 }), VETERINARIO_A);
      assert.strictEqual(invalido.estado, 400);
      const mismoNombre = await pedir('PATCH', `/sanidad/esquemas/${esquema.id}`, datos({ refuerzo_dias: 300 }), VETERINARIO_A);
      assert.strictEqual(mismoNombre.estado, 200, 'no deja guardar un esquema con su propio nombre');
      assert.strictEqual(mismoNombre.cuerpo.esquema.refuerzo_dias, 300);
    });

    await prueba('Criterio 3: la baja lo saca del listado, deja su historial y libera el nombre', async () => {
      const aplicacion = randomUUID();
      await pool.query(
        `INSERT INTO aplicaciones_sanitarias (id, rancho_id, animal_id, producto_id, esquema_id, numero_dosis, fecha, aplicado_por)
         VALUES ($1, 'a0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000005', $2, $3, 1, CURRENT_DATE, $4)`,
        [aplicacion, PRODUCTO_AFTOSA_A, esquema.id, VETERINARIO_A],
      );
      const { estado } = await pedir('DELETE', `/sanidad/esquemas/${esquema.id}`, undefined, VETERINARIO_A);
      assert.strictEqual(estado, 200);

      const { cuerpo } = await pedir('GET', '/sanidad/esquemas');
      assert.ok(!cuerpo.esquemas.some((e) => e.id === esquema.id), 'sigue en el listado');
      const fila = await pool.query('SELECT eliminado_en FROM esquemas_vacunacion WHERE id = $1', [esquema.id]);
      assert.ok(fila.rows[0].eliminado_en, 'la baja borro la fila en lugar de marcarla');
      const historial = await pool.query('SELECT eliminado_en FROM aplicaciones_sanitarias WHERE id = $1', [aplicacion]);
      assert.strictEqual(historial.rows[0].eliminado_en, null, 'la baja toco las aplicaciones');

      assert.strictEqual((await pedir('DELETE', `/sanidad/esquemas/${esquema.id}`, undefined, VETERINARIO_A)).estado, 404);
      assert.strictEqual((await crear({})).estado, 201, 'el nombre de un esquema dado de baja sigue ocupado');
    });

    await prueba('El socio tampoco edita ni da de baja', async () => {
      assert.strictEqual((await pedir('PATCH', `/sanidad/esquemas/${ESQUEMA_AFTOSA_A}`, datos(), SOCIO_A)).estado, 403);
      assert.strictEqual((await pedir('DELETE', `/sanidad/esquemas/${ESQUEMA_AFTOSA_A}`, undefined, SOCIO_A)).estado, 403);
    });
  } finally {
    if (creados.length) {
      await pool.query('DELETE FROM aplicaciones_sanitarias WHERE esquema_id = ANY($1::uuid[])', [creados]);
      await pool.query('DELETE FROM esquemas_vacunacion WHERE id = ANY($1::uuid[])', [creados]);
    }
  }

  console.log('\n----------------------------------------------------------------');
  console.log(`  Ejecutadas: ${exitosas + fallidas}   Pasan: ${exitosas}   Fallan: ${fallidas}`);
  console.log('----------------------------------------------------------------');

  await pool.end();

  if (fallidas > 0) {
    console.error('\nHU-47 no cumple sus criterios de aceptacion.');
    process.exitCode = 1;
  } else {
    console.log('\nHU-47 cumple sus criterios de aceptacion.');
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
