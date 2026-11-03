/**
 * ============================================================================
 * SISTEMA DE GESTION DE GANADO
 * Pruebas de HU-35: registro de animal desde el celular
 * Responsable: Aaron | Sprint 3
 * ============================================================================
 *
 * HU-35  1. El formulario móvil pide solo identificador, categoría y sexo.
 *        4. Puedo encadenar varias altas sin volver al listado.
 *
 * Los criterios 2 y 3 (48 px y acciones abajo) son de la pantalla y se
 * prueban en cliente/pruebas/alta-rapida.test.tsx. Acá se prueba que el
 * servidor acepta el alta con esos tres datos, que lo hace un colaborador
 * con permiso de edición en animales (el que está en el corral) y que varias
 * altas seguidas funcionan con las reglas de siempre.
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

const CAMPO_A = 'a1000000-0000-4000-8000-000000000004'; // Roberto, encargado de campo: edita animales
const VETERINARIO_A = 'a1000000-0000-4000-8000-000000000003'; // Jorge: solo ve animales
const SOCIO_A = 'a1000000-0000-4000-8000-000000000002';
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

/** Lo mismo que manda la pantalla de alta rápida. */
function minimo(identificador, categoria_codigo, sexo) {
  return {
    identificador,
    tipo_identificador: 'caravana',
    categoria_codigo,
    sexo,
    corral_id: null,
    nombre: null,
    raza: null,
    fecha_nacimiento: null,
    origen: null,
    peso_kg: null,
  };
}

async function alta(datos, usuarioId = CAMPO_A) {
  const respuesta = await fetch(`${BASE}/animales`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-usuario-id': usuarioId },
    body: JSON.stringify(datos),
  });
  return { estado: respuesta.status, cuerpo: await respuesta.json().catch(() => null) };
}

async function limpiar() {
  await pool.query(`DELETE FROM animales WHERE rancho_id = $1 AND identificador LIKE $2`, [
    RANCHO_A,
    `%${MARCA}%`,
  ]);
}

async function ejecutarPruebas() {
  console.log('================================================================');
  console.log('  HU-35 REGISTRO DE ANIMAL DESDE EL CELULAR');
  console.log('================================================================\n');

  try {
    await prueba('Criterio 1: con identificador, categoría y sexo alcanza', async () => {
      const { estado, cuerpo } = await alta(minimo(`M1-${MARCA}`, 'vaca', 'hembra'));
      assert.strictEqual(estado, 201, JSON.stringify(cuerpo));
      const { animal } = cuerpo;
      assert.strictEqual(animal.identificador, `M1-${MARCA}`);
      assert.strictEqual(animal.tipo_identificador, 'caravana');
      assert.strictEqual(animal.categoria_codigo, 'vaca');
      assert.strictEqual(animal.sexo, 'hembra');
      assert.strictEqual(animal.estado, 'activo');
      assert.strictEqual(animal.corral_id, null);
      assert.strictEqual(animal.peso_kg, null);
    });

    await prueba('Criterio 1: queda registrado a nombre de quien lo cargó (HU-23)', async () => {
      const { cuerpo } = await alta(minimo(`M2-${MARCA}`, 'toro', 'macho'));
      const fila = await pool.query(
        'SELECT creado_por, modificado_por FROM animales WHERE id = $1',
        [cuerpo.animal.id],
      );
      assert.strictEqual(fila.rows[0].creado_por, CAMPO_A);
      assert.strictEqual(fila.rows[0].modificado_por, CAMPO_A);
    });

    await prueba('Criterio 4: varias altas seguidas, una detrás de otra', async () => {
      for (let i = 1; i <= 5; i++) {
        const { estado, cuerpo } = await alta(minimo(`T${i}-${MARCA}`, 'ternero', 'macho'));
        assert.strictEqual(estado, 201, `alta ${i}: ${JSON.stringify(cuerpo)}`);
      }
      const total = await pool.query(
        `SELECT COUNT(*)::int AS n FROM animales WHERE rancho_id = $1 AND identificador LIKE $2`,
        [RANCHO_A, `T%-${MARCA}`],
      );
      assert.strictEqual(total.rows[0].n, 5);
    });

    await prueba('Criterio 4: en la tanda, un repetido se rechaza y la tanda sigue', async () => {
      const repetido = await alta(minimo(`T1-${MARCA}`, 'ternero', 'macho'));
      assert.strictEqual(repetido.estado, 409, JSON.stringify(repetido.cuerpo));
      const siguiente = await alta(minimo(`T6-${MARCA}`, 'ternero', 'macho'));
      assert.strictEqual(siguiente.estado, 201, JSON.stringify(siguiente.cuerpo));
    });

    await prueba('Sin sexo no se registra', async () => {
      const { estado } = await alta({ ...minimo(`S-${MARCA}`, 'vaca', 'hembra'), sexo: null });
      assert.strictEqual(estado, 400);
    });

    await prueba('Una categoría que no está en el catálogo se rechaza (HU-28)', async () => {
      const { estado } = await alta(minimo(`C-${MARCA}`, 'inventada', 'hembra'));
      assert.strictEqual(estado, 400);
    });

    await prueba('Quien solo ve animales no puede registrar (403)', async () => {
      const { estado } = await alta(minimo(`V-${MARCA}`, 'vaca', 'hembra'), VETERINARIO_A);
      assert.strictEqual(estado, 403);
    });

    await prueba('El socio no puede registrar sin que se lo habiliten (HU-21)', async () => {
      const { estado } = await alta(minimo(`P-${MARCA}`, 'vaca', 'hembra'), SOCIO_A);
      assert.strictEqual(estado, 403);
    });
  } finally {
    await limpiar();
  }

  console.log('\n----------------------------------------------------------------');
  console.log(`  Ejecutadas: ${exitosas + fallidas}   Pasan: ${exitosas}   Fallan: ${fallidas}`);
  console.log('----------------------------------------------------------------');

  await pool.end();

  if (fallidas > 0) {
    console.error('\nHU-35 no se aprueba.');
    process.exitCode = 1;
  } else {
    console.log('\nHU-35 cumple sus criterios del lado del servidor.');
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
