/**
 * ============================================================================
 * SISTEMA DE GESTION DE GANADO
 * Pruebas de HU-45: exportación a Excel
 * Responsable: Aaron | Sprint 3
 * ============================================================================
 *
 * HU-45  1. Puedo elegir qué exportar y en qué formato.
 *        2. La exportación respeta los filtros aplicados en el listado.
 *        3. El archivo se descarga con un nombre que incluye el rancho y la
 *           fecha.
 *
 *   GET /exportacion?que=animales,corrales,movimientos,estados&formato=xlsx|csv
 *                   &vista=&busqueda=&sexo=&categoria=&corral=&fechaDesde=&fechaHasta=
 *
 * Además: cada cosa exige poder ver su módulo (HU-21/22), un rancho no ve lo
 * de otro (HU-03) y el peso sale en la unidad del país (HU-26).
 *
 * Contra el PostgreSQL de verdad y contra el servidor levantado.
 * Lo que crea, lo borra al terminar: no hace falta volver a sembrar.
 * ============================================================================
 */

require('../cargar-entorno').cargarEntorno();
const assert = require('assert');
const { randomUUID } = require('crypto');
const { Pool } = require('pg');
const ExcelJS = require('exceljs');

const BASE = process.env.URL_SERVIDOR || 'http://localhost:3000';

const PROPIETARIO_A = 'a1000000-0000-4000-8000-000000000001'; // Carlos, Rancho El Cerrito
const VETERINARIO_A = 'a1000000-0000-4000-8000-000000000003'; // Jorge: ve animales, no corrales
const ALMACEN_A = 'a1000000-0000-4000-8000-000000000005'; // Gonzalo: solo almacén
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

async function esperarOk(promesa, estadoEsperado = 201) {
  const { estado, cuerpo } = await promesa;
  assert.strictEqual(estado, estadoEsperado, JSON.stringify(cuerpo));
  return cuerpo;
}

/** Descarga el archivo: estado, nombre (de Content-Disposition), tipo y bytes. */
async function exportar(parametros, usuarioId = PROPIETARIO_A) {
  const respuesta = await fetch(`${BASE}/exportacion?${new URLSearchParams(parametros)}`, {
    headers: usuarioId ? { 'x-usuario-id': usuarioId } : {},
  });
  const disposicion = respuesta.headers.get('content-disposition') || '';
  const coincide = /filename="([^"]+)"/.exec(disposicion);
  return {
    estado: respuesta.status,
    nombre: coincide ? decodeURIComponent(coincide[1]) : null,
    tipo: respuesta.headers.get('content-type') || '',
    bytes: Buffer.from(await respuesta.arrayBuffer()),
  };
}

async function leerLibro(bytes) {
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.load(bytes);
  return libro;
}

/** Los valores de una columna (sin el título) de una hoja. */
function columna(hoja, numero) {
  const valores = [];
  hoja.eachRow((fila, n) => {
    if (n > 1) valores.push(fila.getCell(numero).value);
  });
  return valores;
}

function lineasCsv(bytes) {
  const texto = bytes.toString('utf8');
  assert.ok(texto.startsWith('﻿'), 'el CSV debe empezar con BOM para que Excel lea los acentos');
  return texto.slice(1).trimEnd().split('\r\n');
}

function hoyEn(zona) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: zona }).format(new Date());
}

async function limpiar() {
  for (const rancho of [RANCHO_A, RANCHO_B]) {
    await pool.query(`DELETE FROM animales WHERE rancho_id = $1 AND identificador LIKE $2`, [
      rancho,
      `%${MARCA}%`,
    ]);
    await pool.query(`DELETE FROM corrales WHERE rancho_id = $1 AND nombre LIKE $2`, [rancho, `%${MARCA}%`]);
  }
}

async function ejecutarPruebas() {
  console.log('================================================================');
  console.log('  HU-45 EXPORTACION A EXCEL');
  console.log('================================================================\n');

  const paisB = (await pool.query('SELECT pais_codigo FROM ranchos WHERE id = $1', [RANCHO_B])).rows[0].pais_codigo;

  try {
    // Rancho A: un corral con dos hembras y un macho suelto; una hembra se vende.
    const corral = (await esperarOk(pedir('POST', '/corrales', { nombre: `Exp ${MARCA}`, capacidad: 10 }))).corral;
    const alta = async (identificador, sexo, extra = {}, usuarioId = PROPIETARIO_A) =>
      (
        await esperarOk(
          pedir('POST', '/animales', { identificador, sexo, categoria_codigo: sexo === 'macho' ? 'toro' : 'vaca', ...extra }, usuarioId),
        )
      ).animal;
    const h1 = await alta(`EH1-${MARCA}`, 'hembra', { corral_id: corral.id, peso_kg: 400, fecha_nacimiento: '2023-03-15' });
    const h2 = await alta(`EH2-${MARCA}`, 'hembra', { corral_id: corral.id });
    await alta(`EM1-${MARCA}`, 'macho');
    await esperarOk(
      pedir('POST', `/animales/${h2.id}/estado`, { estado: 'vendido', motivo: `Venta ${MARCA}`, fecha: '2026-10-05' }),
    );
    // Rancho B tiene uno con la misma marca: nunca debe aparecer en lo de A.
    await alta(`EB1-${MARCA}`, 'hembra', { peso_kg: 100, fecha_nacimiento: '2024-01-31' }, PROPIETARIO_B);

    const { nombre: nombreRancho } = (await pool.query('SELECT nombre FROM ranchos WHERE id = $1', [RANCHO_A])).rows[0];
    const slug = nombreRancho
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    await prueba('Criterio 1 y 3: Excel con una hoja por cada cosa elegida y nombre con rancho y fecha', async () => {
      const archivo = await exportar({ que: 'animales,corrales,movimientos,estados', formato: 'xlsx', vista: 'todos', busqueda: MARCA });
      assert.strictEqual(archivo.estado, 200, archivo.bytes.toString());
      assert.ok(archivo.tipo.includes('spreadsheetml'), archivo.tipo);
      assert.match(archivo.nombre, new RegExp(`^[a-z]+_${slug}_${hoyEn('America/La_Paz')}\\.xlsx$`));
      const libro = await leerLibro(archivo.bytes);
      assert.strictEqual(libro.worksheets.length, 4);
    });

    await prueba('Criterio 1: se puede elegir solo una parte', async () => {
      const archivo = await exportar({ que: 'corrales', formato: 'xlsx' });
      const libro = await leerLibro(archivo.bytes);
      assert.strictEqual(libro.worksheets.length, 1);
      assert.ok(columna(libro.worksheets[0], 1).includes(`Exp ${MARCA}`));
    });

    await prueba('Criterio 1 y 3: CSV de una sola cosa, con su nombre, BOM y una fila por animal', async () => {
      const archivo = await exportar({ que: 'animales', formato: 'csv', vista: 'todos', busqueda: MARCA });
      assert.strictEqual(archivo.estado, 200);
      assert.ok(archivo.tipo.startsWith('text/csv'), archivo.tipo);
      assert.match(archivo.nombre, new RegExp(`^[a-z]+_${slug}_${hoyEn('America/La_Paz')}\\.csv$`));
      const lineas = lineasCsv(archivo.bytes);
      assert.strictEqual(lineas.length, 4, lineas.join('\n'));
      const fila = lineas.find((linea) => linea.startsWith(`EH1-${MARCA},`));
      assert.ok(fila, 'falta EH1');
      assert.ok(fila.includes('15/03/2023'), 'la fecha sale en el formato del país (DD/MM/YYYY)');
      assert.ok(fila.includes(`Exp ${MARCA}`), 'sale el corral');
      assert.ok(fila.includes(',400,'), 'sale el peso en kg');
    });

    await prueba('Criterio 1: CSV con más de una cosa se rechaza; formato o cosa desconocidos también', async () => {
      for (const parametros of [
        { que: 'animales,corrales', formato: 'csv' },
        { que: 'animales', formato: 'pdf' },
        { que: 'vacunas', formato: 'xlsx' },
      ]) {
        const archivo = await exportar(parametros);
        assert.strictEqual(archivo.estado, 400, JSON.stringify(parametros));
      }
    });

    await prueba('Criterio 2: respeta la pestaña elegida (activos por defecto, vendidos)', async () => {
      const activos = lineasCsv((await exportar({ que: 'animales', formato: 'csv', busqueda: MARCA })).bytes);
      assert.strictEqual(activos.length, 3);
      assert.ok(!activos.some((linea) => linea.startsWith(`EH2-${MARCA}`)));
      const vendidos = lineasCsv((await exportar({ que: 'animales', formato: 'csv', vista: 'vendido', busqueda: MARCA })).bytes);
      assert.strictEqual(vendidos.length, 2);
      assert.ok(vendidos[1].startsWith(`EH2-${MARCA}`));
    });

    await prueba('Criterio 2: respeta sexo y corral', async () => {
      const hembras = lineasCsv((await exportar({ que: 'animales', formato: 'csv', vista: 'todos', busqueda: MARCA, sexo: 'hembra' })).bytes);
      assert.strictEqual(hembras.length, 3);
      const delCorral = lineasCsv((await exportar({ que: 'animales', formato: 'csv', vista: 'todos', busqueda: MARCA, corral: corral.id })).bytes);
      assert.strictEqual(delCorral.length, 3);
      assert.ok(!delCorral.some((linea) => linea.startsWith(`EM1-${MARCA}`)));
    });

    await prueba('Criterio 2: movimientos y cambios de estado salen solo de los animales filtrados', async () => {
      const movimientos = lineasCsv((await exportar({ que: 'movimientos', formato: 'csv', vista: 'todos', busqueda: `EH1-${MARCA}` })).bytes);
      assert.strictEqual(movimientos.length, 2, movimientos.join('\n'));
      assert.ok(movimientos[1].includes(`EH1-${MARCA}`));
      const estados = lineasCsv((await exportar({ que: 'estados', formato: 'csv', vista: 'todos', busqueda: MARCA })).bytes);
      assert.strictEqual(estados.length, 2, estados.join('\n'));
      assert.ok(estados[1].includes(`EH2-${MARCA}`) && estados[1].includes(`Venta ${MARCA}`));
      assert.ok(estados[1].startsWith('05/10/2026'));
    });

    await prueba('Criterio 2: la pestaña de bajas exporta solo los dados de baja', async () => {
      await esperarOk(pedir('DELETE', `/animales/${h1.id}`), 200);
      const bajas = lineasCsv((await exportar({ que: 'animales', formato: 'csv', vista: 'bajas', busqueda: MARCA })).bytes);
      assert.strictEqual(bajas.length, 2);
      assert.ok(bajas[1].startsWith(`EH1-${MARCA}`));
      const activos = lineasCsv((await exportar({ que: 'animales', formato: 'csv', busqueda: MARCA })).bytes);
      assert.ok(!activos.some((linea) => linea.startsWith(`EH1-${MARCA}`)));
      await esperarOk(pedir('POST', `/animales/${h1.id}/restaurar`), 201);
    });

    await prueba('Los filtros inválidos se rechazan igual que en el listado', async () => {
      for (const parametros of [{ vista: 'perdidos' }, { sexo: 'otro' }, { fechaDesde: '2026-13-40' }]) {
        const archivo = await exportar({ que: 'animales', formato: 'csv', ...parametros });
        assert.strictEqual(archivo.estado, 400, JSON.stringify(parametros));
      }
    });

    await prueba('Otro rancho no ve nada de este (HU-03)', async () => {
      const lineas = lineasCsv((await exportar({ que: 'animales', formato: 'csv', vista: 'todos', busqueda: MARCA }, PROPIETARIO_B)).bytes);
      assert.strictEqual(lineas.length, 2);
      assert.ok(lineas[1].startsWith(`EB1-${MARCA}`));
    });

    await prueba('En un rancho de EE. UU. el peso sale en lb y la fecha como MM/DD/YYYY (HU-26)', async () => {
      await pool.query(`UPDATE ranchos SET pais_codigo = 'US' WHERE id = $1`, [RANCHO_B]);
      const archivo = await exportar({ que: 'animales', formato: 'csv', vista: 'todos', busqueda: MARCA }, PROPIETARIO_B);
      const [titulos, fila] = lineasCsv(archivo.bytes);
      assert.ok(/lb/i.test(titulos), titulos);
      assert.ok(fila.includes(',220.5,'), fila);
      assert.ok(fila.includes('01/31/2024'), fila);
      assert.match(archivo.nombre, new RegExp(`_${hoyEn('America/Chicago')}\\.csv$`));
    });

    await prueba('Exportar exige ver cada módulo: el veterinario exporta animales pero no corrales (HU-22)', async () => {
      assert.strictEqual((await exportar({ que: 'animales', formato: 'xlsx' }, VETERINARIO_A)).estado, 200);
      assert.strictEqual((await exportar({ que: 'animales,corrales', formato: 'xlsx' }, VETERINARIO_A)).estado, 403);
      assert.strictEqual((await exportar({ que: 'animales', formato: 'xlsx' }, ALMACEN_A)).estado, 403);
    });

    await prueba('Sin sesión no se exporta', async () => {
      assert.strictEqual((await exportar({ que: 'animales' }, null)).estado, 401);
    });
  } finally {
    await pool.query('UPDATE ranchos SET pais_codigo = $2 WHERE id = $1', [RANCHO_B, paisB]);
    await limpiar();
  }

  console.log('\n----------------------------------------------------------------');
  console.log(`  Ejecutadas: ${exitosas + fallidas}   Pasan: ${exitosas}   Fallan: ${fallidas}`);
  console.log('----------------------------------------------------------------');

  await pool.end();

  if (fallidas > 0) {
    console.error('\nHU-45 no se aprueba.');
    process.exitCode = 1;
  } else {
    console.log('\nHU-45 cumple sus criterios del lado del servidor.');
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
