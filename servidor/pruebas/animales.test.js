/**
 * ============================================================================
 * SISTEMA DE GESTION DE GANADO
 * Pruebas de HU-28 (ficha), HU-33 (estado), HU-34 (baja logica) y
 * HU-39 (movimientos entre corrales)
 * Responsable: Romina | Sprint 2
 * ============================================================================
 *
 * Contra el PostgreSQL de verdad y contra el servidor levantado.
 *
 * HU-28  1. El corral es opcional.
 *        2. La categoria se elige de un catalogo.
 *        3. La fecha de nacimiento no puede ser futura.
 * HU-33  1. Los estados son activo, vendido, muerto y archivado.
 *        2. El cambio registra la fecha y el motivo.
 *        3. Un animal no activo no aparece por defecto, pero se puede consultar.
 * HU-34  1. Toda baja es logica.  2. No aparece en las consultas normales.
 *        3. Se puede restaurar.
 * HU-39  1. Cada movimiento guarda origen, destino, fecha y quien.
 *        2. El historial se ve en la ficha.
 *        3. El corral actual coincide con el ultimo movimiento.
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
const CAMPO_A = 'a1000000-0000-4000-8000-000000000004'; // Roberto, encargado de campo
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

function manana() {
  const fecha = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  return fecha.toISOString().slice(0, 10);
}

async function ejecutarPruebas() {
  console.log('================================================================');
  console.log('  HU-28, HU-33, HU-34 y HU-39: FICHA, ESTADO, BAJA Y MOVIMIENTOS');
  console.log('  Responsable: Romina | Sprint 2');
  console.log('================================================================\n');

  const corralUno = (await pedir('POST', '/corrales', { nombre: `Uno ${MARCA}` })).cuerpo.corral;
  const corralDos = (await pedir('POST', '/corrales', { nombre: `Dos ${MARCA}` })).cuerpo.corral;
  let animal;

  // --- HU-28 ---------------------------------------------------------------
  await prueba('HU-28: se guarda la ficha completa (raza, sexo, categoria, nacimiento, origen)', async () => {
    const { estado, cuerpo } = await pedir('POST', '/animales', {
      identificador: `A-${MARCA}`,
      raza: 'Nelore',
      sexo: 'hembra',
      categoria_codigo: 'vaquilla',
      fecha_nacimiento: '2024-05-12',
      origen: 'nacido',
      peso_kg: 380,
    });
    assert.strictEqual(estado, 201, JSON.stringify(cuerpo));
    animal = cuerpo.animal;
    assert.strictEqual(animal.raza, 'Nelore');
    assert.strictEqual(animal.categoria_codigo, 'vaquilla');
    assert.strictEqual(animal.fecha_nacimiento, '2024-05-12');
    assert.strictEqual(animal.origen, 'nacido');
  });

  await prueba('HU-28 criterio 1: el corral es opcional', async () => {
    assert.strictEqual(animal.corral_id, null);
  });

  await prueba('HU-28 criterio 2: la categoria sale del catalogo y no se acepta texto libre', async () => {
    const catalogo = await pedir('GET', '/animales/categorias');
    assert.ok(catalogo.cuerpo.includes('vaquilla'));
    const { estado } = await pedir('POST', '/animales', {
      identificador: `B-${MARCA}`,
      sexo: 'macho',
      categoria_codigo: 'vaca lechera grande',
    });
    assert.strictEqual(estado, 400);
  });

  await prueba('HU-28 criterio 3: la fecha de nacimiento no puede ser futura', async () => {
    const { estado } = await pedir('POST', '/animales', {
      identificador: `F-${MARCA}`,
      sexo: 'macho',
      fecha_nacimiento: manana(),
    });
    assert.strictEqual(estado, 400);
  });

  await prueba('HU-28: editar la ficha guarda los cambios de verdad', async () => {
    const { estado } = await pedir('PATCH', `/animales/${animal.id}`, {
      sexo: 'hembra',
      raza: 'Brahman',
      categoria_codigo: 'vaca',
    });
    assert.strictEqual(estado, 200);
    const ficha = (await pedir('GET', `/animales/${animal.id}`)).cuerpo;
    assert.strictEqual(ficha.animal.raza, 'Brahman');
    assert.strictEqual(ficha.animal.categoria_codigo, 'vaca');
  });

  await prueba('El identificador no se repite en el rancho, pero si en otro', async () => {
    assert.strictEqual(
      (await pedir('POST', '/animales', { identificador: `A-${MARCA}`, sexo: 'macho' })).estado,
      409,
    );
    assert.strictEqual(
      (await pedir('POST', '/animales', { identificador: `A-${MARCA}`, sexo: 'macho' }, PROPIETARIO_B)).estado,
      201,
    );
  });

  // --- HU-39 ---------------------------------------------------------------
  await prueba('HU-39 criterio 1: el movimiento guarda origen, destino, fecha y quien', async () => {
    assert.strictEqual(
      (await pedir('POST', `/animales/${animal.id}/movimientos`, { corral_id: corralUno.id })).estado,
      201,
    );
    const { estado } = await pedir(
      'POST',
      `/animales/${animal.id}/movimientos`,
      { corral_id: corralDos.id },
      CAMPO_A,
    );
    assert.strictEqual(estado, 201);

    const filas = await pool.query(
      `SELECT corral_origen_id, corral_destino_id, fecha, creado_por
         FROM movimientos_corral WHERE animal_id = $1 ORDER BY fecha DESC, creado_en DESC`,
      [animal.id],
    );
    assert.strictEqual(filas.rowCount, 2);
    assert.strictEqual(filas.rows[0].corral_origen_id, corralUno.id);
    assert.strictEqual(filas.rows[0].corral_destino_id, corralDos.id);
    assert.ok(filas.rows[0].fecha);
    assert.strictEqual(filas.rows[0].creado_por, CAMPO_A);
  });

  await prueba('HU-39 criterio 2: el historial se ve en la ficha, con nombres', async () => {
    const { cuerpo } = await pedir('GET', `/animales/${animal.id}`);
    assert.strictEqual(cuerpo.movimientos.length, 2);
    assert.strictEqual(cuerpo.movimientos[0].corral_destino, `Dos ${MARCA}`);
    assert.strictEqual(cuerpo.movimientos[0].registrado_por, 'Roberto Justiniano Saucedo');
  });

  await prueba('HU-39 criterio 3: el corral actual es el destino del ultimo movimiento', async () => {
    const { cuerpo } = await pedir('GET', `/animales/${animal.id}`);
    assert.strictEqual(cuerpo.animal.corral_id, corralDos.id);
    assert.strictEqual(cuerpo.animal.corral_id, cuerpo.movimientos[0].corral_destino_id);
  });

  await prueba('HU-39: editar la ficha no cambia el corral por la puerta de atras', async () => {
    await pedir('PATCH', `/animales/${animal.id}`, { sexo: 'hembra', corral_id: corralUno.id });
    const { cuerpo } = await pedir('GET', `/animales/${animal.id}`);
    assert.strictEqual(cuerpo.animal.corral_id, corralDos.id);
  });

  await prueba('HU-39: no se mueve a un corral de otro rancho', async () => {
    const ajeno = (await pedir('POST', '/corrales', { nombre: `Ajeno ${MARCA}` }, PROPIETARIO_B)).cuerpo.corral;
    const { estado } = await pedir('POST', `/animales/${animal.id}/movimientos`, { corral_id: ajeno.id });
    assert.strictEqual(estado, 400);
  });

  // --- HU-33 ---------------------------------------------------------------
  await prueba('HU-33 criterio 1: no acepta estados fuera de los cuatro', async () => {
    const { estado } = await pedir('POST', `/animales/${animal.id}/estado`, {
      estado: 'perdido',
      motivo: 'x',
    });
    assert.strictEqual(estado, 400);
  });

  await prueba('HU-33 criterio 2: sin motivo no se cambia el estado', async () => {
    const { estado } = await pedir('POST', `/animales/${animal.id}/estado`, { estado: 'vendido' });
    assert.strictEqual(estado, 400);
  });

  await prueba('HU-33 criterio 2: el cambio registra la fecha y el motivo', async () => {
    const { estado } = await pedir('POST', `/animales/${animal.id}/estado`, {
      estado: 'vendido',
      motivo: 'Venta a feria de Montero',
      fecha: '2026-10-01',
    });
    assert.strictEqual(estado, 201);
    const { cuerpo } = await pedir('GET', `/animales/${animal.id}`);
    assert.strictEqual(cuerpo.animal.estado, 'vendido');
    assert.strictEqual(cuerpo.estados[0].estado_anterior, 'activo');
    assert.strictEqual(cuerpo.estados[0].fecha, '2026-10-01');
    assert.strictEqual(cuerpo.estados[0].motivo, 'Venta a feria de Montero');
  });

  await prueba('HU-33 criterio 3: el vendido no aparece por defecto, pero se puede consultar', async () => {
    const porDefecto = (await pedir('GET', '/animales')).cuerpo;
    assert.ok(!porDefecto.some((a) => a.id === animal.id));
    const vendidos = (await pedir('GET', '/animales?estado=vendido')).cuerpo;
    assert.ok(vendidos.some((a) => a.id === animal.id));
    const todos = (await pedir('GET', '/animales?estado=todos')).cuerpo;
    assert.ok(todos.some((a) => a.id === animal.id));
  });

  await prueba('HU-33: un vendido no cuenta en la ocupacion del corral', async () => {
    const corrales = (await pedir('GET', '/corrales')).cuerpo;
    assert.strictEqual(corrales.find((c) => c.id === corralDos.id).ocupacion, 0);
  });

  // --- HU-34 ---------------------------------------------------------------
  await prueba('HU-18: un colaborador con edicion no da de baja ni restaura (solo propietario y Admin)', async () => {
    const baja = await pedir('DELETE', `/animales/${animal.id}`, undefined, CAMPO_A);
    assert.strictEqual(baja.estado, 403);
    assert.strictEqual(baja.cuerpo.motivo, 'solo_propietario_elimina');
    const restaurar = await pedir('POST', `/animales/${animal.id}/restaurar`, undefined, CAMPO_A);
    assert.strictEqual(restaurar.estado, 403);
  });

  await prueba('HU-34 criterios 1 y 2: la baja marca la fila y la saca de las consultas', async () => {
    assert.strictEqual((await pedir('DELETE', `/animales/${animal.id}`)).estado, 200);
    const fila = await pool.query('SELECT eliminado_en FROM animales WHERE id = $1', [animal.id]);
    assert.strictEqual(fila.rowCount, 1);
    assert.ok(fila.rows[0].eliminado_en);
    const todos = (await pedir('GET', '/animales?estado=todos')).cuerpo;
    assert.ok(!todos.some((a) => a.id === animal.id));
    const conBajas = (await pedir('GET', '/animales?estado=todos&bajas=1')).cuerpo;
    assert.ok(conBajas.some((a) => a.id === animal.id));
  });

  await prueba('HU-34: dado de baja libera su identificador', async () => {
    const { estado } = await pedir('POST', '/animales', { identificador: `A-${MARCA}`, sexo: 'macho' });
    assert.strictEqual(estado, 201);
  });

  await prueba('HU-34 criterio 3: se restaura, salvo que otro vigente tenga su identificador', async () => {
    assert.strictEqual((await pedir('POST', `/animales/${animal.id}/restaurar`)).estado, 409);
    await pool.query(
      `UPDATE animales SET eliminado_en = CURRENT_TIMESTAMP
        WHERE rancho_id = $1 AND identificador = $2 AND id <> $3`,
      [RANCHO_A, `A-${MARCA}`, animal.id],
    );
    const { estado, cuerpo } = await pedir('POST', `/animales/${animal.id}/restaurar`);
    assert.strictEqual(estado, 201);
    assert.strictEqual(cuerpo.animal.eliminado_en, null);
  });

  await prueba('HU-03: un rancho no ve la ficha de otro', async () => {
    const { estado } = await pedir('GET', `/animales/${animal.id}`, undefined, PROPIETARIO_B);
    assert.strictEqual(estado, 404);
  });

  // --- Pedido del docente: la categoria corresponde al sexo y a la edad -------
  const hoyIso = new Date().toISOString().slice(0, 10);

  await prueba('HU-28: las reglas de categoria salen del servidor', async () => {
    const { estado, cuerpo } = await pedir('GET', '/animales/categorias/reglas');
    assert.strictEqual(estado, 200);
    assert.deepStrictEqual(cuerpo.find((r) => r.codigo === 'vaca'), {
      codigo: 'vaca',
      sexo: 'hembra',
      edad_minima_meses: 18,
      edad_maxima_meses: null,
    });
  });

  await prueba('HU-28: una hembra que nacio hoy no puede ser vaca, si ternera', async () => {
    const vaca = await pedir('POST', '/animales', {
      identificador: `N-${MARCA}`,
      sexo: 'hembra',
      categoria_codigo: 'vaca',
      fecha_nacimiento: hoyIso,
    });
    assert.strictEqual(vaca.estado, 400);
    assert.match(vaca.cuerpo.message, /18 meses/);
    const ternera = await pedir('POST', '/animales', {
      identificador: `N-${MARCA}`,
      sexo: 'hembra',
      categoria_codigo: 'ternera',
      fecha_nacimiento: hoyIso,
    });
    assert.strictEqual(ternera.estado, 201);
  });

  await prueba('HU-28: un macho no puede ser vaca ni vaquilla', async () => {
    const { estado, cuerpo } = await pedir('POST', '/animales', {
      identificador: `M-${MARCA}`,
      sexo: 'macho',
      categoria_codigo: 'vaquilla',
    });
    assert.strictEqual(estado, 400);
    assert.match(cuerpo.message, /macho/);
  });

  await prueba('HU-28: sin fecha de nacimiento se controla solo el sexo', async () => {
    const { estado } = await pedir('POST', '/animales', {
      identificador: `T-${MARCA}`,
      sexo: 'macho',
      categoria_codigo: 'toro',
    });
    assert.strictEqual(estado, 201);
  });

  // ------------------------------------------------------------------------
  await pool.query(`DELETE FROM animales WHERE rancho_id IN ($1, $2) AND identificador LIKE $3`, [
    RANCHO_A,
    RANCHO_B,
    `%${MARCA}%`,
  ]);
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
    console.error('\nHU-28, HU-33, HU-34 o HU-39 no se aprueban.');
    process.exitCode = 1;
  } else {
    console.log('\nHU-28, HU-33, HU-34 y HU-39 cumplen sus criterios.');
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
