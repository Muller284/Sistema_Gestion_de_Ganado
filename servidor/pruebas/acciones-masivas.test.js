/**
 * ============================================================================
 * SISTEMA DE GESTION DE GANADO
 * Pruebas de HU-31: acciones masivas sobre animales
 * Responsable: Aaron | Sprint 3
 * ============================================================================
 *
 * HU-31  1. Puedo seleccionar animales individualmente, toda la página o todo
 *           el resultado del filtro.
 *        2. Aparece una barra con las acciones disponibles y la cantidad
 *           seleccionada.
 *        3. Toda acción masiva pide confirmación indicando cuántos animales
 *           afecta.
 *
 * Elegir, la barra y la confirmación son de la pantalla y se prueban en
 * cliente/pruebas/acciones-masivas.test.tsx. Acá se prueba lo que hace el
 * servidor con la selección cuando se confirma:
 *
 *   POST /masivo/animales/estado   cambia el estado de todos en un solo paso
 *   POST /masivo/animales/baja     da de baja a todos (solo propietario/Admin)
 *
 * y que respeta las mismas reglas que las acciones de a uno: permisos por
 * rol (HU-18), aislamiento entre ranchos (HU-03) e historial con autor (HU-32).
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
const CAMPO_A = 'a1000000-0000-4000-8000-000000000004'; // Roberto: edita animales, no elimina
const VETERINARIO_A = 'a1000000-0000-4000-8000-000000000003'; // Jorge: solo ve animales
const PROPIETARIO_B = 'b1000000-0000-4000-8000-000000000001';
const RANCHO_A = 'a0000000-0000-4000-8000-000000000001';
const RANCHO_B = 'b0000000-0000-4000-8000-000000000002';

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

async function crearAnimal(identificador, usuarioId = PROPIETARIO_A) {
  const { estado, cuerpo } = await pedir(
    'POST',
    '/animales',
    { identificador, sexo: 'hembra', categoria_codigo: 'vaca' },
    usuarioId,
  );
  assert.strictEqual(estado, 201, JSON.stringify(cuerpo));
  return cuerpo.animal.id;
}

async function estadoDe(id) {
  const resultado = await pool.query('SELECT estado, eliminado_en FROM animales WHERE id = $1', [id]);
  return resultado.rows[0];
}

async function limpiar() {
  for (const rancho of [RANCHO_A, RANCHO_B]) {
    await pool.query(`DELETE FROM animales WHERE rancho_id = $1 AND identificador LIKE $2`, [
      rancho,
      `%${MARCA}%`,
    ]);
  }
}

async function ejecutarPruebas() {
  console.log('================================================================');
  console.log('  HU-31 ACCIONES MASIVAS');
  console.log('================================================================\n');

  try {
    const ids = [];
    for (let i = 1; i <= 5; i++) ids.push(await crearAnimal(`M${i}-${MARCA}`));
    const ajeno = await crearAnimal(`B-${MARCA}`, PROPIETARIO_B);
    const inexistente = randomUUID();

    await prueba('Cambiar el estado de varios animales de una vez', async () => {
      const { estado, cuerpo } = await pedir(
        'POST',
        '/masivo/animales/estado',
        { animal_ids: ids.slice(0, 4), estado: 'vendido', motivo: `Venta ${MARCA}`, fecha: '2026-10-20' },
        CAMPO_A,
      );
      assert.strictEqual(estado, 200, JSON.stringify(cuerpo));
      assert.strictEqual(cuerpo.cambiados, 4);
      assert.strictEqual(cuerpo.ya_estaban, 0);
      assert.strictEqual(cuerpo.no_encontrados, 0);
      assert.ok(cuerpo.mensaje, 'falta el mensaje');
      for (const id of ids.slice(0, 4)) assert.strictEqual((await estadoDe(id)).estado, 'vendido');
      assert.strictEqual((await estadoDe(ids[4])).estado, 'activo');
    });

    await prueba('Cada cambio masivo queda en el historial del animal con su autor (HU-32)', async () => {
      const { cuerpo } = await pedir('GET', `/animales/${ids[0]}`);
      assert.strictEqual(cuerpo.estados.length, 1);
      const [cambio] = cuerpo.estados;
      assert.strictEqual(cambio.estado_anterior, 'activo');
      assert.strictEqual(cambio.estado_nuevo, 'vendido');
      assert.strictEqual(cambio.fecha, '2026-10-20');
      assert.strictEqual(cambio.motivo, `Venta ${MARCA}`);
      const roberto = await pool.query('SELECT nombre FROM usuarios WHERE id = $1', [CAMPO_A]);
      assert.strictEqual(cambio.registrado_por, roberto.rows[0].nombre);
    });

    await prueba('Los que ya estaban en ese estado, los de otro rancho y los que no existen se cuentan aparte', async () => {
      const { estado, cuerpo } = await pedir('POST', '/masivo/animales/estado', {
        animal_ids: [ids[0], ids[4], ajeno, inexistente],
        estado: 'vendido',
        motivo: `Venta ${MARCA}`,
      });
      assert.strictEqual(estado, 200, JSON.stringify(cuerpo));
      assert.strictEqual(cuerpo.cambiados, 1);
      assert.strictEqual(cuerpo.ya_estaban, 1);
      assert.strictEqual(cuerpo.no_encontrados, 2);
    });

    await prueba('Otro rancho no puede tocar animales ajenos (HU-03)', async () => {
      assert.strictEqual((await estadoDe(ajeno)).estado, 'activo');
      const { cuerpo } = await pedir(
        'POST',
        '/masivo/animales/estado',
        { animal_ids: [ids[4]], estado: 'muerto', motivo: 'x' },
        PROPIETARIO_B,
      );
      assert.strictEqual(cuerpo.cambiados, 0);
      assert.strictEqual((await estadoDe(ids[4])).estado, 'vendido');
    });

    await prueba('Quien solo ve animales no puede cambiar estados en masa (HU-18)', async () => {
      const { estado } = await pedir(
        'POST',
        '/masivo/animales/estado',
        { animal_ids: [ids[4]], estado: 'activo', motivo: 'x' },
        VETERINARIO_A,
      );
      assert.strictEqual(estado, 403);
    });

    await prueba('Se exigen estado, motivo, fecha no futura y al menos un animal', async () => {
      const base = { animal_ids: [ids[4]], estado: 'activo', motivo: 'Vuelve' };
      const casos = [
        { ...base, estado: 'perdido' },
        { ...base, motivo: '   ' },
        { ...base, fecha: '2999-01-01' },
        { ...base, animal_ids: [] },
        { ...base, animal_ids: 'no-es-lista' },
      ];
      for (const caso of casos) {
        const { estado, cuerpo } = await pedir('POST', '/masivo/animales/estado', caso);
        assert.strictEqual(estado, 400, `${JSON.stringify(caso)} → ${JSON.stringify(cuerpo)}`);
      }
    });

    await prueba('Dar de baja en masa: el encargado de campo no puede (HU-18, criterio 3)', async () => {
      const { estado } = await pedir('POST', '/masivo/animales/baja', { animal_ids: ids.slice(0, 2) }, CAMPO_A);
      assert.strictEqual(estado, 403);
      assert.strictEqual((await estadoDe(ids[0])).eliminado_en, null);
    });

    await prueba('Dar de baja en masa: el propietario sí, y los ajenos no se tocan', async () => {
      const { estado, cuerpo } = await pedir('POST', '/masivo/animales/baja', {
        animal_ids: [ids[0], ids[1], ajeno],
      });
      assert.strictEqual(estado, 200, JSON.stringify(cuerpo));
      assert.strictEqual(cuerpo.dados_de_baja, 2);
      assert.strictEqual(cuerpo.no_encontrados, 1);
      assert.ok((await estadoDe(ids[0])).eliminado_en);
      assert.ok((await estadoDe(ids[1])).eliminado_en);
      assert.strictEqual((await estadoDe(ajeno)).eliminado_en, null);
    });

    await prueba('Un animal ya dado de baja no vuelve a contarse ni cambia de estado', async () => {
      const baja = await pedir('POST', '/masivo/animales/baja', { animal_ids: [ids[0]] });
      assert.strictEqual(baja.cuerpo.dados_de_baja, 0);
      const cambio = await pedir('POST', '/masivo/animales/estado', {
        animal_ids: [ids[0]],
        estado: 'activo',
        motivo: 'x',
      });
      assert.strictEqual(cambio.cuerpo.cambiados, 0);
      assert.strictEqual(cambio.cuerpo.no_encontrados, 1);
    });

    await prueba('Sin sesión no hay acciones masivas', async () => {
      const respuesta = await fetch(`${BASE}/masivo/animales/baja`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ animal_ids: [ids[2]] }),
      });
      assert.strictEqual(respuesta.status, 401);
    });
  } finally {
    await limpiar();
  }

  console.log('\n----------------------------------------------------------------');
  console.log(`  Ejecutadas: ${exitosas + fallidas}   Pasan: ${exitosas}   Fallan: ${fallidas}`);
  console.log('----------------------------------------------------------------');

  await pool.end();

  if (fallidas > 0) {
    console.error('\nHU-31 no se aprueba.');
    process.exitCode = 1;
  } else {
    console.log('\nHU-31 cumple sus criterios del lado del servidor.');
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
