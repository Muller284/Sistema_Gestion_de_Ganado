/**
 * ============================================================================
 * SISTEMA DE GESTION DE GANADO
 * Pruebas de HU-48 (Registro de aplicacion individual)
 * Responsable: Romina | Sprint 4
 * ============================================================================
 *
 * Contra el PostgreSQL de verdad y contra el servidor levantado.
 *
 * Criterios cubiertos:
 *   1. Se elige el producto, la fecha (no futura), la dosis y, si
 *      corresponde, a que dosis del esquema equivale.
 *   2. Queda quien la aplico: por defecto quien la registra, o la persona del
 *      rancho que se elija.
 *   3. La aplicacion aparece en la pestana Sanidad de la ficha (GET
 *      /sanidad/animales/:id/aplicaciones, con quien la registro y cuando,
 *      que es de lo que el historial arma su linea) y cuenta para el
 *      calendario (HU-50).
 *   4. No se puede registrar en un animal dado de baja.
 *
 * Ademas: los permisos del modulo sanidad y el aislamiento entre ranchos.
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
const PROPIETARIO_B = 'b1000000-0000-4000-8000-000000000001'; // Fernando
const ANIMAL_A = 'd1000000-0000-4000-8000-000000000001'; // 0501, nacio el 2021-03-14
const ANIMAL_B = 'd2000000-0000-4000-8000-000000000001';
const PRODUCTO_AFTOSA_A = 'e1000000-0000-4000-8000-000000000001';
const PRODUCTO_IVERMECTINA_A = 'e1000000-0000-4000-8000-000000000003'; // 5 ml
const PRODUCTO_AFTOSA_B = 'e2000000-0000-4000-8000-000000000001';
const ESQUEMA_AFTOSA_A = 'e1000000-0000-4000-8000-000000000101'; // una dosis y refuerzo

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgres://postgres:tu_password@localhost:5432/gestion_ganado',
});

let exitosas = 0;
let fallidas = 0;
const MARCA = randomUUID().slice(0, 8);
const aplicaciones = [];
const ANIMAL_DE_BAJA = randomUUID();

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

async function aplicar(datos, animal = ANIMAL_A, usuario = VETERINARIO_A) {
  const respuesta = await pedir('POST', `/sanidad/animales/${animal}/aplicaciones`, datos, usuario);
  if (respuesta.estado === 201) aplicaciones.push(respuesta.cuerpo.aplicacion.id);
  return respuesta;
}

/** AAAA-MM-DD sumandole dias, sin saltos de zona horaria. */
function sumarDias(fecha, dias) {
  const [a, m, d] = fecha.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d + dias)).toISOString().slice(0, 10);
}

async function ejecutarPruebas() {
  console.log('================================================================');
  console.log('  HU-48: REGISTRO DE APLICACION INDIVIDUAL');
  console.log('  Responsable: Romina | Sprint 4');
  console.log('================================================================\n');

  let hoy;

  try {
    await prueba('Las opciones traen productos, esquemas, quienes pudieron aplicar y la fecha de hoy', async () => {
      const { estado, cuerpo } = await pedir('GET', '/sanidad/aplicaciones/opciones');
      assert.strictEqual(estado, 200, JSON.stringify(cuerpo));
      hoy = cuerpo.hoy;
      assert.match(hoy, /^\d{4}-\d{2}-\d{2}$/);
      assert.ok(cuerpo.productos.some((p) => p.id === PRODUCTO_IVERMECTINA_A));
      assert.ok(!cuerpo.productos.some((p) => p.id === PRODUCTO_AFTOSA_B), 've productos del otro rancho');
      assert.ok(cuerpo.esquemas.some((e) => e.id === ESQUEMA_AFTOSA_A && e.producto_id === PRODUCTO_AFTOSA_A));
      assert.ok(cuerpo.integrantes.some((p) => p.id === CAMPO_A), 'falta el encargado de campo');
      assert.ok(!cuerpo.integrantes.some((p) => p.id === PROPIETARIO_B), 'aparece gente del otro rancho');
    });

    await prueba('Criterios 1 y 2: sin dosis ni quien, usa la del producto y queda quien la registra', async () => {
      const { estado, cuerpo } = await aplicar({
        producto_id: PRODUCTO_IVERMECTINA_A,
        fecha: hoy,
        observacion: `  Desparasitacion   ${MARCA} `,
      });
      assert.strictEqual(estado, 201, JSON.stringify(cuerpo));
      const aplicacion = cuerpo.aplicacion;
      assert.strictEqual(aplicacion.fecha, hoy);
      assert.strictEqual(aplicacion.dosis, 5);
      assert.strictEqual(aplicacion.unidad, 'ml');
      assert.strictEqual(aplicacion.aplicado_por, VETERINARIO_A);
      assert.ok(aplicacion.aplicado_por_nombre, 'falta el nombre de quien la aplico');
      assert.strictEqual(aplicacion.observacion, `Desparasitacion ${MARCA}`);
      assert.strictEqual(aplicacion.esquema_id, null);
      assert.match(cuerpo.mensaje, /0501/);
    });

    await prueba('Criterio 2: se puede elegir otra persona del rancho, no una de otro rancho', async () => {
      const otra = await aplicar({ producto_id: PRODUCTO_IVERMECTINA_A, fecha: hoy, dosis: '4,5', aplicado_por: CAMPO_A });
      assert.strictEqual(otra.estado, 201, JSON.stringify(otra.cuerpo));
      assert.strictEqual(otra.cuerpo.aplicacion.aplicado_por, CAMPO_A);
      assert.strictEqual(otra.cuerpo.aplicacion.dosis, 4.5);
      const fila = await pool.query('SELECT creado_por FROM aplicaciones_sanitarias WHERE id = $1', [
        otra.cuerpo.aplicacion.id,
      ]);
      assert.strictEqual(fila.rows[0].creado_por, VETERINARIO_A, 'la autoria tiene que ser de quien la registra');

      const ajena = await aplicar({ producto_id: PRODUCTO_IVERMECTINA_A, fecha: hoy, aplicado_por: PROPIETARIO_B });
      assert.strictEqual(ajena.estado, 400, JSON.stringify(ajena.cuerpo));
    });

    await prueba('Criterio 1: la fecha no puede ser futura, ni anterior al nacimiento, ni invalida', async () => {
      const casos = [sumarDias(hoy, 1), '2021-03-13', '2026-02-30', '06/11/2026', '', undefined];
      for (const fecha of casos) {
        const { estado, cuerpo } = await aplicar({ producto_id: PRODUCTO_IVERMECTINA_A, fecha });
        assert.strictEqual(estado, 400, `${fecha} -> ${estado} ${JSON.stringify(cuerpo)}`);
      }
      const ayer = await aplicar({ producto_id: PRODUCTO_IVERMECTINA_A, fecha: sumarDias(hoy, -1) });
      assert.strictEqual(ayer.estado, 201, 'una fecha pasada tiene que valer');
    });

    await prueba('Criterio 1: el producto tiene que ser del catalogo del rancho y la dosis valida', async () => {
      const casos = [
        { producto_id: PRODUCTO_AFTOSA_B },
        { producto_id: randomUUID() },
        { producto_id: '' },
        { producto_id: PRODUCTO_IVERMECTINA_A, dosis: 0 },
        { producto_id: PRODUCTO_IVERMECTINA_A, dosis: 1.555 },
        { producto_id: PRODUCTO_IVERMECTINA_A, observacion: 'x'.repeat(501) },
      ];
      for (const caso of casos) {
        const { estado, cuerpo } = await aplicar({ fecha: hoy, ...caso });
        assert.strictEqual(estado, 400, `${JSON.stringify(caso)} -> ${estado} ${JSON.stringify(cuerpo)}`);
      }
    });

    await prueba('Criterio 1: a que dosis del esquema equivale, y el calendario la cuenta', async () => {
      const antes = await pedir('GET', `/sanidad/calendario?porPagina=200`);
      const pendienteAntes = antes.cuerpo.dosis.find((d) => d.animal_id === ANIMAL_A && d.esquema_id === ESQUEMA_AFTOSA_A);

      const { estado, cuerpo } = await aplicar({
        producto_id: PRODUCTO_AFTOSA_A,
        fecha: hoy,
        esquema_id: ESQUEMA_AFTOSA_A,
        numero_dosis: null,
      });
      assert.strictEqual(estado, 201, JSON.stringify(cuerpo));
      assert.strictEqual(cuerpo.aplicacion.esquema_id, ESQUEMA_AFTOSA_A);
      assert.ok(cuerpo.aplicacion.esquema_nombre);
      assert.strictEqual(cuerpo.aplicacion.numero_dosis, null, 'sin numero es un refuerzo');

      const despues = await pedir('GET', `/sanidad/calendario?porPagina=200`);
      const pendiente = despues.cuerpo.dosis.find((d) => d.animal_id === ANIMAL_A && d.esquema_id === ESQUEMA_AFTOSA_A);
      assert.ok(pendiente, 'el esquema tiene refuerzo: tiene que seguir en el calendario');
      assert.ok(pendiente.vence > hoy, `la proxima dosis tendria que ser despues de hoy (${pendiente.vence})`);
      if (pendienteAntes) assert.ok(pendiente.vence >= pendienteAntes.vence);
    });

    await prueba('Criterio 1: el esquema tiene que ser del producto y el numero de dosis existir', async () => {
      const casos = [
        { producto_id: PRODUCTO_IVERMECTINA_A, esquema_id: ESQUEMA_AFTOSA_A },
        { producto_id: PRODUCTO_AFTOSA_A, esquema_id: ESQUEMA_AFTOSA_A, numero_dosis: 2 },
        { producto_id: PRODUCTO_AFTOSA_A, esquema_id: ESQUEMA_AFTOSA_A, numero_dosis: 0 },
        { producto_id: PRODUCTO_AFTOSA_A, esquema_id: randomUUID() },
        { producto_id: PRODUCTO_AFTOSA_A, numero_dosis: 1 },
      ];
      for (const caso of casos) {
        const { estado, cuerpo } = await aplicar({ fecha: hoy, ...caso });
        assert.strictEqual(estado, 400, `${JSON.stringify(caso)} -> ${estado} ${JSON.stringify(cuerpo)}`);
      }
      const primera = await aplicar({ producto_id: PRODUCTO_AFTOSA_A, fecha: hoy, esquema_id: ESQUEMA_AFTOSA_A, numero_dosis: 1 });
      assert.strictEqual(primera.estado, 201, JSON.stringify(primera.cuerpo));
      assert.strictEqual(primera.cuerpo.aplicacion.numero_dosis, 1);
    });

    await prueba('Criterio 3: la pestana Sanidad las lista, lo mas nuevo primero, con quien la registro', async () => {
      const { estado, cuerpo } = await pedir('GET', `/sanidad/animales/${ANIMAL_A}/aplicaciones`, undefined, SOCIO_A);
      assert.strictEqual(estado, 200, JSON.stringify(cuerpo));
      const nuestras = cuerpo.aplicaciones.filter((a) => aplicaciones.includes(a.id));
      assert.strictEqual(nuestras.length, aplicaciones.length);
      for (const aplicacion of nuestras) {
        assert.ok(aplicacion.registrado_por, 'falta quien la registro');
        assert.ok(aplicacion.creado_en, 'falta cuando se registro');
        assert.ok(aplicacion.producto_nombre);
      }
      const fechas = cuerpo.aplicaciones.map((a) => a.fecha);
      assert.deepStrictEqual(fechas, [...fechas].sort().reverse(), 'no estan ordenadas de la mas nueva a la mas vieja');
    });

    await prueba('Criterio 4: no se registra en un animal dado de baja', async () => {
      await pool.query(
        `INSERT INTO animales (id, rancho_id, identificador, tipo_identificador, sexo, categoria_codigo, estado,
                               creado_por, modificado_por, eliminado_en)
         VALUES ($1, $2, $3, 'caravana', 'hembra', 'vaca', 'activo', $4, $4, CURRENT_TIMESTAMP)`,
        [ANIMAL_DE_BAJA, RANCHO_A, `B${MARCA}`, PROPIETARIO_A],
      );
      const { estado, cuerpo } = await aplicar({ producto_id: PRODUCTO_IVERMECTINA_A, fecha: hoy }, ANIMAL_DE_BAJA);
      assert.strictEqual(estado, 400, JSON.stringify(cuerpo));
      assert.match(cuerpo.message, new RegExp(`B${MARCA}`));
    });

    await prueba('Aislamiento: el animal de otro rancho no existe para este', async () => {
      assert.strictEqual((await aplicar({ producto_id: PRODUCTO_IVERMECTINA_A, fecha: hoy }, ANIMAL_B)).estado, 404);
      assert.strictEqual((await pedir('GET', `/sanidad/animales/${ANIMAL_B}/aplicaciones`)).estado, 404);
      assert.strictEqual((await pedir('GET', `/sanidad/animales/${randomUUID()}/aplicaciones`)).estado, 404);
    });

    await prueba('Permisos: el socio ve pero no registra; quien no ve sanidad no entra', async () => {
      assert.strictEqual((await aplicar({ producto_id: PRODUCTO_IVERMECTINA_A, fecha: hoy }, ANIMAL_A, SOCIO_A)).estado, 403);
      assert.strictEqual((await pedir('GET', '/sanidad/aplicaciones/opciones', undefined, SOCIO_A)).estado, 403);
      assert.strictEqual((await pedir('GET', `/sanidad/animales/${ANIMAL_A}/aplicaciones`, undefined, CAMPO_A)).estado, 403);
      assert.strictEqual((await aplicar({ producto_id: PRODUCTO_IVERMECTINA_A, fecha: hoy }, ANIMAL_A, CAMPO_A)).estado, 403);
      const propietario = await aplicar({ producto_id: PRODUCTO_IVERMECTINA_A, fecha: hoy }, ANIMAL_A, PROPIETARIO_A);
      assert.strictEqual(propietario.estado, 201, 'el propietario puede todo');
    });
  } finally {
    if (aplicaciones.length) {
      await pool.query('DELETE FROM aplicaciones_sanitarias WHERE id = ANY($1::uuid[])', [aplicaciones]);
    }
    await pool.query('DELETE FROM animales WHERE id = $1', [ANIMAL_DE_BAJA]);
  }

  console.log('\n----------------------------------------------------------------');
  console.log(`  Ejecutadas: ${exitosas + fallidas}   Pasan: ${exitosas}   Fallan: ${fallidas}`);
  console.log('----------------------------------------------------------------');

  await pool.end();

  if (fallidas > 0) {
    console.error('\nHU-48 no cumple sus criterios de aceptacion.');
    process.exitCode = 1;
  } else {
    console.log('\nHU-48 cumple sus criterios de aceptacion.');
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
