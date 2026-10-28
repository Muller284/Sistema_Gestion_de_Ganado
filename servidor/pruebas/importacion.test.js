/**
 * ============================================================================
 * SISTEMA DE GESTION DE GANADO
 * Pruebas de HU-40 (plantilla), HU-43 (vista previa e informe de errores) y
 * HU-44 (deteccion de duplicados)
 * Responsable: Romina | Sprint 3
 * ============================================================================
 *
 * Contra el PostgreSQL de verdad y contra el servidor levantado, con archivos
 * Excel y CSV armados en la prueba.
 *
 * HU-40  1. La plantilla trae las columnas con sus nombres y una fila de ejemplo.
 *        2. Esta en espanol e ingles.
 *        3. Usarla es opcional (otro orden de columnas, CSV, el otro idioma).
 * HU-43  1. La vista previa muestra las primeras filas tal como quedarian.
 *        2. El resumen dice cuantas se cargan, cuantas tienen error y cuantas
 *           estan repetidas.
 *        3. Cada error dice numero de fila y motivo.
 *        4. Nada se carga hasta confirmar.
 * HU-44  1. Duplicado por identificador dentro del rancho.
 *        2. Duplicado dentro del propio archivo.
 *        3. Se elige omitir los repetidos o actualizar los existentes.
 *
 * Ademas: solo importa quien tiene edicion en el modulo importacion.
 * Lo que crea, lo borra al terminar: no hace falta volver a sembrar.
 * ============================================================================
 */

require('../cargar-entorno').cargarEntorno();
const assert = require('assert');
const { randomUUID } = require('crypto');
const ExcelJS = require('exceljs');
const { Pool } = require('pg');

const BASE = process.env.URL_SERVIDOR || 'http://localhost:3000';

const PROPIETARIO_A = 'a1000000-0000-4000-8000-000000000001'; // Carlos
const SOCIO_A = 'a1000000-0000-4000-8000-000000000002'; // Maria Rene
const VETERINARIO_A = 'a1000000-0000-4000-8000-000000000003'; // sin importacion
const ADMINISTRATIVA_A = 'a1000000-0000-4000-8000-000000000006'; // importacion: editar
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
const MARCA = randomUUID().slice(0, 6);
const id = (n) => `I${MARCA}-${n}`;

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

async function pedir(metodo, ruta, cuerpo, usuarioId = PROPIETARIO_A, idioma = 'es') {
  const respuesta = await fetch(`${BASE}${ruta}`, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', 'x-usuario-id': usuarioId, 'Accept-Language': idioma },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  return { estado: respuesta.status, cuerpo: await respuesta.json().catch(() => null) };
}

async function excel(filas) {
  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet('Animales');
  filas.forEach((fila) => hoja.addRow(fila));
  return Buffer.from(await libro.xlsx.writeBuffer()).toString('base64');
}

const csv = (texto) => Buffer.from(texto, 'utf8').toString('base64');

const ENCABEZADO = ['Identificador', 'Sexo', 'Categoría', 'Fecha de nacimiento', 'Peso (kg)', 'Corral'];

async function cuantos(identificadores) {
  const r = await pool.query(
    `SELECT COUNT(*)::int AS n FROM animales WHERE rancho_id = $1 AND identificador = ANY($2::text[])`,
    [RANCHO_A, identificadores],
  );
  return r.rows[0].n;
}

async function ejecutarPruebas() {
  console.log('================================================================');
  console.log('  HU-40, HU-43 Y HU-44: IMPORTACION DE ANIMALES');
  console.log('  Responsable: Romina | Sprint 3');
  console.log('================================================================\n');

  const corral = (await pedir('POST', '/corrales', { nombre: `Import ${MARCA}` })).cuerpo.corral;

  // --- HU-40 ---------------------------------------------------------------
  for (const [idioma, titulos] of [
    ['es', ['Identificador', 'Sexo', 'Peso (kg)']],
    ['en', ['Identifier', 'Sex', 'Weight (kg)']],
  ]) {
    await prueba(`HU-40 criterios 1 y 2: plantilla en ${idioma} con columnas y fila de ejemplo`, async () => {
      const respuesta = await fetch(`${BASE}/importacion/plantilla`, {
        headers: { 'x-usuario-id': PROPIETARIO_A, 'Accept-Language': idioma },
      });
      assert.strictEqual(respuesta.status, 200);
      assert.match(respuesta.headers.get('content-type'), /spreadsheetml/);
      const libro = new ExcelJS.Workbook();
      await libro.xlsx.load(await respuesta.arrayBuffer());
      const hoja = libro.worksheets[0];
      const encabezado = hoja.getRow(1).values.slice(1);
      for (const titulo of titulos) assert.ok(encabezado.includes(titulo), `falta ${titulo}`);
      assert.strictEqual(String(hoja.getRow(2).getCell(1).value), '4471');
      assert.ok(hoja.getRow(3).values.length === 0 || hoja.getRow(3).values.every((v) => !v));
    });
  }

  await prueba('HU-40 criterio 3: la plantilla se puede usar tal cual (en ingles) o no usarla', async () => {
    const respuesta = await fetch(`${BASE}/importacion/plantilla`, {
      headers: { 'x-usuario-id': PROPIETARIO_A, 'Accept-Language': 'en' },
    });
    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load(await respuesta.arrayBuffer());
    const hoja = libro.worksheets[0];
    hoja.getRow(2).getCell(1).value = id('plantilla');
    hoja.getRow(2).getCell(9).value = null; // el corral de ejemplo no existe en el rancho
    const base64 = Buffer.from(await libro.xlsx.writeBuffer()).toString('base64');
    const { estado, cuerpo } = await pedir('POST', '/importacion/vista-previa', {
      nombre_archivo: 'plantilla.xlsx',
      contenido_base64: base64,
    });
    assert.strictEqual(estado, 200, JSON.stringify(cuerpo));
    assert.strictEqual(cuerpo.resumen.cargan, 1);
    assert.strictEqual(cuerpo.vista_previa[0].categoria_codigo, 'vaquilla');
    assert.strictEqual(cuerpo.vista_previa[0].sexo, 'hembra');
  });

  // --- HU-43 ---------------------------------------------------------------
  const archivo = await excel([
    ['Peso (kg)', 'Sexo', 'Identificador', 'Categoría', 'Fecha de nacimiento', 'Corral'],
    [380, 'Hembra', id(1), 'Vaca', new Date(Date.UTC(2024, 4, 12)), corral.nombre],
    [null, 'macho', id(2), 'novillo', '10/02/2024', null],
    [null, 'xx', id(3), null, null, null],
    [null, 'hembra', null, null, null, null],
    [null, 'hembra', id(4), null, '31/02/2024', null],
    [null, 'hembra', id(1), null, null, null],
  ]);
  let informe;

  await prueba('HU-43 criterio 4: la vista previa no guarda nada', async () => {
    const { estado, cuerpo } = await pedir('POST', '/importacion/vista-previa', {
      nombre_archivo: 'animales.xlsx',
      contenido_base64: archivo,
    });
    assert.strictEqual(estado, 200, JSON.stringify(cuerpo));
    informe = cuerpo;
    assert.strictEqual(await cuantos([id(1), id(2), id(3), id(4)]), 0);
  });

  await prueba('HU-43 criterio 1: las primeras filas tal como quedarian', async () => {
    const primera = informe.vista_previa[0];
    assert.strictEqual(primera.identificador, id(1));
    assert.strictEqual(primera.sexo, 'hembra');
    assert.strictEqual(primera.categoria_codigo, 'vaca');
    assert.strictEqual(primera.fecha_nacimiento, '2024-05-12');
    assert.strictEqual(primera.corral, corral.nombre);
    assert.strictEqual(primera.peso_kg, 380);
    assert.strictEqual(informe.vista_previa[1].fecha_nacimiento, '2024-02-10');
  });

  await prueba('HU-43 criterio 2: cuantas se cargan, cuantas con error y cuantas repetidas', async () => {
    assert.deepStrictEqual(
      {
        total: informe.resumen.total,
        cargan: informe.resumen.cargan,
        con_error: informe.resumen.con_error,
        repetidas: informe.resumen.repetidas,
      },
      { total: 6, cargan: 2, con_error: 3, repetidas: 1 },
    );
  });

  await prueba('HU-43 criterio 3: cada error dice la fila y el motivo', async () => {
    const porFila = Object.fromEntries(informe.errores.map((e) => [e.fila, e]));
    assert.strictEqual(porFila[4].columna, 'sexo');
    assert.match(porFila[4].motivo, /xx/);
    assert.strictEqual(porFila[5].columna, 'identificador');
    assert.strictEqual(porFila[6].columna, 'fecha_nacimiento');
  });

  await prueba('HU-43: confirmar carga las validas, con su corral y su primer movimiento', async () => {
    const { estado, cuerpo } = await pedir('POST', '/importacion/confirmar', {
      nombre_archivo: 'animales.xlsx',
      contenido_base64: archivo,
    });
    assert.strictEqual(estado, 201, JSON.stringify(cuerpo));
    assert.strictEqual(cuerpo.resumen.insertados, 2);
    assert.strictEqual(await cuantos([id(1), id(2), id(3), id(4)]), 2);
    const fila = await pool.query(
      `SELECT a.corral_id, a.creado_por, (SELECT COUNT(*)::int FROM movimientos_corral m WHERE m.animal_id = a.id) AS movimientos
         FROM animales a WHERE a.rancho_id = $1 AND a.identificador = $2`,
      [RANCHO_A, id(1)],
    );
    assert.strictEqual(fila.rows[0].corral_id, corral.id);
    assert.strictEqual(fila.rows[0].movimientos, 1);
    assert.strictEqual(fila.rows[0].creado_por, PROPIETARIO_A);
  });

  // --- HU-44 ---------------------------------------------------------------
  const segundo = csv(
    `${ENCABEZADO.join(';')}\n${id(1)};hembra;vaquilla;;410;\n${id(5)};macho;;;;\n${id(5)};macho;;;;\n`,
  );

  await prueba('HU-44 criterios 1 y 2: repetido contra el rancho y dentro del archivo (CSV)', async () => {
    const { cuerpo } = await pedir('POST', '/importacion/vista-previa', {
      nombre_archivo: 'segundo.csv',
      contenido_base64: segundo,
    });
    assert.deepStrictEqual(
      cuerpo.repetidas.map((r) => [r.identificador, r.en]),
      [[id(1), 'rancho'], [id(5), 'archivo']],
    );
    assert.strictEqual(cuerpo.resumen.cargan, 1);
  });

  await prueba('HU-44 criterio 3: omitir deja el existente como estaba', async () => {
    const { estado } = await pedir('POST', '/importacion/confirmar', {
      nombre_archivo: 'segundo.csv',
      contenido_base64: segundo,
      estrategia: 'omitir',
    });
    assert.strictEqual(estado, 201);
    const fila = await pool.query(
      `SELECT peso_kg::float AS peso, categoria_codigo FROM animales WHERE rancho_id = $1 AND identificador = $2`,
      [RANCHO_A, id(1)],
    );
    assert.strictEqual(fila.rows[0].peso, 380);
    assert.strictEqual(fila.rows[0].categoria_codigo, 'vaca');
    assert.strictEqual(await cuantos([id(5)]), 1);
  });

  await prueba('HU-44 criterio 3: actualizar pisa los datos del existente y no lo duplica', async () => {
    const { cuerpo } = await pedir('POST', '/importacion/confirmar', {
      nombre_archivo: 'segundo.csv',
      contenido_base64: segundo,
      estrategia: 'actualizar',
    });
    assert.strictEqual(cuerpo.resumen.actualizados, 2);
    const fila = await pool.query(
      `SELECT peso_kg::float AS peso, categoria_codigo, corral_id FROM animales WHERE rancho_id = $1 AND identificador = $2`,
      [RANCHO_A, id(1)],
    );
    assert.strictEqual(fila.rows[0].peso, 410);
    assert.strictEqual(fila.rows[0].categoria_codigo, 'vaquilla');
    assert.strictEqual(fila.rows[0].corral_id, corral.id, 'un corral vacio no saca al animal');
    assert.strictEqual(await cuantos([id(1), id(5)]), 2);
  });

  await prueba('HU-44: otro rancho puede tener el mismo identificador', async () => {
    const { cuerpo } = await pedir(
      'POST',
      '/importacion/vista-previa',
      { nombre_archivo: 'segundo.csv', contenido_base64: segundo },
      PROPIETARIO_B,
    );
    assert.strictEqual(cuerpo.resumen.existentes, 0);
  });

  await prueba('HU-28: la raza del archivo se reconoce sin importar mayusculas ni acentos', async () => {
    const { cuerpo } = await pedir('POST', '/importacion/vista-previa', {
      nombre_archivo: 'razas.csv',
      contenido_base64: csv(`Identificador;Sexo;Raza
${id('raza')};macho;NELÓRE
`),
    });
    assert.strictEqual(cuerpo.vista_previa[0].raza, 'Nelore');
  });

  // --- Permisos y archivos invalidos -----------------------------------------
  await prueba('El socio y el colaborador sin el modulo no importan; con edicion, si', async () => {
    const cuerpo = { nombre_archivo: 'segundo.csv', contenido_base64: segundo };
    assert.strictEqual((await pedir('POST', '/importacion/vista-previa', cuerpo, SOCIO_A)).estado, 403);
    assert.strictEqual((await pedir('POST', '/importacion/vista-previa', cuerpo, VETERINARIO_A)).estado, 403);
    assert.strictEqual((await pedir('POST', '/importacion/vista-previa', cuerpo, ADMINISTRATIVA_A)).estado, 200);
  });

  await prueba('Un archivo sin las columnas obligatorias se rechaza diciendo cuales faltan', async () => {
    const { estado, cuerpo } = await pedir('POST', '/importacion/vista-previa', {
      nombre_archivo: 'mal.csv',
      contenido_base64: csv('Nombre,Raza\nLucera,Nelore\n'),
    });
    assert.strictEqual(estado, 400);
    assert.match(cuerpo.message, /Identificador/);
  });

  // ------------------------------------------------------------------------
  await pool.query(`DELETE FROM animales WHERE rancho_id IN ($1, $2) AND identificador LIKE $3`, [
    RANCHO_A,
    RANCHO_B,
    `I${MARCA}-%`,
  ]);
  await pool.query(`DELETE FROM corrales WHERE id = $1`, [corral.id]);

  console.log('\n----------------------------------------------------------------');
  console.log(`  Ejecutadas: ${exitosas + fallidas}   Pasan: ${exitosas}   Fallan: ${fallidas}`);
  console.log('----------------------------------------------------------------');

  await pool.end();

  if (fallidas > 0) {
    console.error('\nHU-40, HU-43 o HU-44 no se aprueban.');
    process.exitCode = 1;
  } else {
    console.log('\nHU-40, HU-43 y HU-44 cumplen sus criterios.');
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
