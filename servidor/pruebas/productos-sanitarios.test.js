/**
 * ============================================================================
 * SISTEMA DE GESTION DE GANADO
 * Pruebas de HU-46 (Catalogo de productos sanitarios)
 * Responsable: Romina | Sprint 4
 * ============================================================================
 *
 * Contra el PostgreSQL de verdad y contra el servidor levantado.
 *
 * Criterios cubiertos:
 *   1. Cada producto tiene nombre, tipo, laboratorio opcional y dosis por
 *      animal con su unidad.
 *   2. El catalogo es propio de cada rancho y otro rancho no lo ve (HU-03).
 *   3. No se repite el nombre dentro del rancho, sin importar mayusculas ni
 *      acentos.
 *   4. Se da de baja sin borrarse, y las aplicaciones que lo usaron lo siguen
 *      mostrando.
 *   5. Solo quien edita sanidad crea, edita o da de baja productos.
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
const PROPIETARIO_B = 'b1000000-0000-4000-8000-000000000001'; // Fernando
const PRODUCTO_AFTOSA_A = 'e1000000-0000-4000-8000-000000000001'; // lo usa un esquema
const PRODUCTO_AFTOSA_B = 'e2000000-0000-4000-8000-000000000001';
const ANIMAL_A = 'd1000000-0000-4000-8000-000000000001'; // 0501, Lucera

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

async function pedir(metodo, ruta, cuerpo, usuarioId = VETERINARIO_A) {
  const respuesta = await fetch(`${BASE}${ruta}`, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', 'x-usuario-id': usuarioId },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  return { estado: respuesta.status, cuerpo: await respuesta.json().catch(() => null) };
}

/** Un producto valido; cada prueba cambia lo que necesita. */
function datos(cambios = {}) {
  return {
    nombre: `Producto ${MARCA}`,
    tipo: 'antiparasitario',
    laboratorio: 'Laboratorio de prueba',
    dosis: 2.5,
    unidad: 'ml',
    ...cambios,
  };
}

async function crear(cambios, usuario = VETERINARIO_A) {
  const respuesta = await pedir('POST', '/sanidad/productos', datos(cambios), usuario);
  if (respuesta.estado === 201) creados.push(respuesta.cuerpo.producto.id);
  return respuesta;
}

async function ejecutarPruebas() {
  console.log('================================================================');
  console.log('  HU-46: CATALOGO DE PRODUCTOS SANITARIOS');
  console.log('  Responsable: Romina | Sprint 4');
  console.log('================================================================\n');

  let producto;

  try {
    await prueba('El catalogo trae los productos del rancho, con cuantos esquemas los usan', async () => {
      const { estado, cuerpo } = await pedir('GET', '/sanidad/productos');
      assert.strictEqual(estado, 200, JSON.stringify(cuerpo));
      const aftosa = cuerpo.productos.find((p) => p.id === PRODUCTO_AFTOSA_A);
      assert.ok(aftosa, 'falta la vacuna antiaftosa de las semillas');
      assert.strictEqual(aftosa.tipo, 'vacuna');
      assert.strictEqual(aftosa.dosis, 2);
      assert.strictEqual(aftosa.unidad, 'ml');
      assert.ok(aftosa.esquemas > 0, 'no cuenta los esquemas que lo usan');
    });

    await prueba('Criterio 1: el veterinario crea un producto con nombre, tipo, laboratorio y dosis', async () => {
      const { estado, cuerpo } = await crear({ nombre: `  Producto   ${MARCA} ` });
      assert.strictEqual(estado, 201, JSON.stringify(cuerpo));
      producto = cuerpo.producto;
      assert.strictEqual(producto.nombre, `Producto ${MARCA}`, 'no limpio los espacios');
      assert.strictEqual(producto.tipo, 'antiparasitario');
      assert.strictEqual(producto.laboratorio, 'Laboratorio de prueba');
      assert.strictEqual(producto.dosis, 2.5);
      assert.strictEqual(producto.unidad, 'ml');
      assert.strictEqual(producto.esquemas, 0);
      assert.match(cuerpo.mensaje, new RegExp(MARCA));
    });

    await prueba('Criterio 1: el laboratorio y la dosis son opcionales; la dosis acepta coma', async () => {
      const sinNada = await crear({ nombre: `Sin dosis ${MARCA}`, laboratorio: '', dosis: null, unidad: null });
      assert.strictEqual(sinNada.estado, 201, JSON.stringify(sinNada.cuerpo));
      assert.strictEqual(sinNada.cuerpo.producto.laboratorio, null);
      assert.strictEqual(sinNada.cuerpo.producto.dosis, null);
      const conComa = await crear({ nombre: `Con coma ${MARCA}`, dosis: '1,5', unidad: 'g' });
      assert.strictEqual(conComa.estado, 201, JSON.stringify(conComa.cuerpo));
      assert.strictEqual(conComa.cuerpo.producto.dosis, 1.5);
    });

    await prueba('Criterio 1: lo que no cumple se rechaza con 400', async () => {
      const casos = [
        { nombre: '   ' },
        { nombre: 'x'.repeat(121) },
        { tipo: 'jarabe' },
        { tipo: undefined },
        { dosis: 2, unidad: null },
        { dosis: null, unidad: 'ml' },
        { dosis: 0 },
        { dosis: -1 },
        { dosis: 1.555 },
        { dosis: 'mucho' },
        { unidad: 'litros' },
        { laboratorio: 'x'.repeat(121) },
      ];
      for (const caso of casos) {
        const { estado, cuerpo } = await crear({ nombre: `Malo ${MARCA}`, ...caso });
        assert.strictEqual(estado, 400, `${JSON.stringify(caso)} -> ${estado} ${JSON.stringify(cuerpo)}`);
      }
    });

    await prueba('Criterio 3: no se repite el nombre, sin importar mayusculas ni acentos', async () => {
      const igual = await crear({ nombre: `PRÓDUCTO  ${MARCA.toUpperCase()}` });
      assert.strictEqual(igual.estado, 409, JSON.stringify(igual.cuerpo));
      const deLasSemillas = await crear({ nombre: 'vacuna ANTIAFTÓSA' });
      assert.strictEqual(deLasSemillas.estado, 409);
    });

    await prueba('Criterio 2: otro rancho no ve el producto, no lo toca y puede usar el mismo nombre', async () => {
      const { cuerpo } = await pedir('GET', '/sanidad/productos', undefined, PROPIETARIO_B);
      assert.ok(!cuerpo.productos.some((p) => p.id === producto.id), 'el rancho B ve el producto de A');
      assert.ok(cuerpo.productos.some((p) => p.id === PRODUCTO_AFTOSA_B));
      const propios = await pedir('GET', '/sanidad/productos');
      assert.ok(!propios.cuerpo.productos.some((p) => p.id === PRODUCTO_AFTOSA_B), 'el rancho A ve el producto de B');

      assert.strictEqual((await pedir('PATCH', `/sanidad/productos/${producto.id}`, datos(), PROPIETARIO_B)).estado, 404);
      assert.strictEqual((await pedir('DELETE', `/sanidad/productos/${producto.id}`, undefined, PROPIETARIO_B)).estado, 404);

      const mismoNombre = await crear({}, PROPIETARIO_B);
      assert.strictEqual(mismoNombre.estado, 201, JSON.stringify(mismoNombre.cuerpo));
    });

    await prueba('Editar cambia los datos, y no deja usar el nombre de otro producto', async () => {
      const { estado, cuerpo } = await pedir(
        'PATCH',
        `/sanidad/productos/${producto.id}`,
        datos({ tipo: 'vitamina', laboratorio: null, dosis: 10, unidad: 'mg' }),
      );
      assert.strictEqual(estado, 200, JSON.stringify(cuerpo));
      assert.strictEqual(cuerpo.producto.tipo, 'vitamina');
      assert.strictEqual(cuerpo.producto.laboratorio, null);
      assert.strictEqual(cuerpo.producto.dosis, 10);
      assert.strictEqual(cuerpo.producto.unidad, 'mg');

      const ocupado = await pedir('PATCH', `/sanidad/productos/${producto.id}`, datos({ nombre: `sin dosis ${MARCA}` }));
      assert.strictEqual(ocupado.estado, 409);
    });

    await prueba('Criterio 5: el socio ve el catalogo pero no lo cambia; quien no ve sanidad, ni lo ve', async () => {
      assert.strictEqual((await pedir('GET', '/sanidad/productos', undefined, SOCIO_A)).estado, 200);
      assert.strictEqual((await crear({ nombre: `Socio ${MARCA}` }, SOCIO_A)).estado, 403);
      assert.strictEqual((await pedir('PATCH', `/sanidad/productos/${producto.id}`, datos(), SOCIO_A)).estado, 403);
      assert.strictEqual((await pedir('DELETE', `/sanidad/productos/${producto.id}`, undefined, SOCIO_A)).estado, 403);
      assert.strictEqual((await pedir('GET', '/sanidad/productos', undefined, CAMPO_A)).estado, 403);
      assert.strictEqual((await crear({ nombre: `Campo ${MARCA}` }, CAMPO_A)).estado, 403);
    });

    await prueba('Un producto que usa un esquema vigente no se puede dar de baja', async () => {
      const { estado, cuerpo } = await pedir('DELETE', `/sanidad/productos/${PRODUCTO_AFTOSA_A}`, undefined, PROPIETARIO_A);
      assert.strictEqual(estado, 409, JSON.stringify(cuerpo));
      const sigue = await pedir('GET', '/sanidad/productos');
      assert.ok(sigue.cuerpo.productos.some((p) => p.id === PRODUCTO_AFTOSA_A));
    });

    await prueba('Criterio 4: dado de baja sale del catalogo y la aplicacion lo sigue mostrando', async () => {
      const hoy = (await pedir('GET', '/sanidad/aplicaciones/opciones')).cuerpo.hoy;
      const aplicada = await pedir('POST', `/sanidad/animales/${ANIMAL_A}/aplicaciones`, {
        producto_id: producto.id,
        fecha: hoy,
      });
      assert.strictEqual(aplicada.estado, 201, JSON.stringify(aplicada.cuerpo));

      const baja = await pedir('DELETE', `/sanidad/productos/${producto.id}`);
      assert.strictEqual(baja.estado, 200, JSON.stringify(baja.cuerpo));

      const catalogo = await pedir('GET', '/sanidad/productos');
      assert.ok(!catalogo.cuerpo.productos.some((p) => p.id === producto.id), 'sigue en el catalogo');

      const fila = await pool.query('SELECT eliminado_en FROM productos_sanitarios WHERE id = $1', [producto.id]);
      assert.ok(fila.rows[0]?.eliminado_en, 'se borro de verdad en vez de darse de baja');

      const { cuerpo } = await pedir('GET', `/sanidad/animales/${ANIMAL_A}/aplicaciones`);
      const vista = cuerpo.aplicaciones.find((a) => a.id === aplicada.cuerpo.aplicacion.id);
      assert.ok(vista, 'la aplicacion desaparecio con el producto');
      assert.strictEqual(vista.producto_nombre, `Producto ${MARCA}`);
      assert.strictEqual(vista.producto_dado_de_baja, true);

      assert.strictEqual((await pedir('PATCH', `/sanidad/productos/${producto.id}`, datos())).estado, 404);
      assert.strictEqual((await crear({})).estado, 201, 'el nombre de un producto dado de baja sigue ocupado');
    });
  } finally {
    if (creados.length) {
      await pool.query('DELETE FROM aplicaciones_sanitarias WHERE producto_id = ANY($1::uuid[])', [creados]);
      await pool.query('DELETE FROM productos_sanitarios WHERE id = ANY($1::uuid[])', [creados]);
    }
  }

  console.log('\n----------------------------------------------------------------');
  console.log(`  Ejecutadas: ${exitosas + fallidas}   Pasan: ${exitosas}   Fallan: ${fallidas}`);
  console.log('----------------------------------------------------------------');

  await pool.end();

  if (fallidas > 0) {
    console.error('\nHU-46 no cumple sus criterios de aceptacion.');
    process.exitCode = 1;
  } else {
    console.log('\nHU-46 cumple sus criterios de aceptacion.');
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
