/**
 * ============================================================================
 * SISTEMA DE GESTION DE GANADO
 * Pruebas de HU-41 y HU-42: reconocimiento y confirmacion manual de columnas
 * Responsable: Brian | Sprint 3
 * ============================================================================
 *
 * HU-41  Importacion con reconocimiento de columnas
 *   1. Acepta archivos Excel y CSV.
 *   2. Reconoce las columnas por el nombre del encabezado, admitiendo
 *      variantes comunes.
 *   3. Muestra que columna reconocio como que campo antes de continuar.
 *   4. Admite archivos de hasta 5.000 filas.
 *
 * HU-42  Confirmacion manual de columnas
 *   1. Solo se piden las columnas que no se pudieron identificar.
 *   2. Cada una se asigna con una lista desplegable de campos disponibles
 *      (el servidor acepta cualquier campo libre y rechaza uno ya tomado).
 *   3. Se puede marcar una columna para que se ignore.
 *
 * Contra el PostgreSQL de verdad y contra el servidor levantado.
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
const RANCHO_A = 'a0000000-0000-4000-8000-000000000001';

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgres://postgres:tu_password@localhost:5432/gestion_ganado',
});

let exitosas = 0;
let fallidas = 0;
const MARCA = randomUUID().slice(0, 6);
const id = (n) => `C${MARCA}-${n}`;

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
  const hoja = libro.addWorksheet('Hoja1');
  filas.forEach((fila) => hoja.addRow(fila));
  return Buffer.from(await libro.xlsx.writeBuffer()).toString('base64');
}

const csv = (texto) => Buffer.from(texto, 'utf8').toString('base64');

/** { encabezado: campo } de lo que devolvio la vista previa. */
const mapa = (columnas) => Object.fromEntries(columnas.map((c) => [c.encabezado, c.campo]));

async function cuantos(identificadores) {
  const r = await pool.query(
    `SELECT COUNT(*)::int AS n FROM animales WHERE rancho_id = $1 AND identificador = ANY($2::text[])`,
    [RANCHO_A, identificadores],
  );
  return r.rows[0].n;
}

async function limpiar() {
  await pool.query(`DELETE FROM animales WHERE rancho_id = $1 AND identificador LIKE $2`, [
    RANCHO_A,
    `C${MARCA}-%`,
  ]);
}

async function ejecutarPruebas() {
  console.log('================================================================');
  console.log('  HU-41 Y HU-42: COLUMNAS DE LA IMPORTACION');
  console.log('  Responsable: Brian | Sprint 3');
  console.log('================================================================\n');

  // --- HU-41 ---------------------------------------------------------------
  await prueba('HU-41 criterio 1: acepta Excel (.xlsx)', async () => {
    const { estado, cuerpo } = await pedir('POST', '/importacion/vista-previa', {
      nombre_archivo: 'hato.xlsx',
      contenido_base64: await excel([
        ['Caravana', 'Sexo'],
        [id('x1'), 'Hembra'],
      ]),
    });
    assert.strictEqual(estado, 200, JSON.stringify(cuerpo));
    assert.strictEqual(cuerpo.listo, true);
    assert.strictEqual(cuerpo.resumen.cargan, 1);
  });

  await prueba('HU-41 criterio 1: acepta CSV con coma y con punto y coma', async () => {
    for (const texto of [`Caravana,Sexo\n${id('c1')},M\n`, `Caravana;Sexo\n${id('c2')};H\n`]) {
      const { estado, cuerpo } = await pedir('POST', '/importacion/vista-previa', {
        nombre_archivo: 'hato.csv',
        contenido_base64: csv(texto),
      });
      assert.strictEqual(estado, 200, JSON.stringify(cuerpo));
      assert.strictEqual(cuerpo.resumen.cargan, 1);
    }
  });

  await prueba('HU-41 criterio 1: otro tipo de archivo se rechaza con un mensaje claro', async () => {
    const { estado, cuerpo } = await pedir('POST', '/importacion/vista-previa', {
      nombre_archivo: 'hato.txt',
      contenido_base64: csv('Caravana,Sexo\n1,M\n'),
    });
    assert.strictEqual(estado, 400);
    assert.match(cuerpo.message, /xlsx/i);
  });

  await prueba('HU-41 criterio 2: reconoce variantes comunes en espanol', async () => {
    const { estado, cuerpo } = await pedir('POST', '/importacion/vista-previa', {
      nombre_archivo: 'variantes.csv',
      contenido_base64: csv(
        'Nº Caravana;Género;Genética;F. Nac.;Libras;Clase;Procedencia;Apodo\n' +
          `${id('v1')};Hembra;Nelore;12/05/2024;838;Vaquilla;Nacido;Lucera\n`,
      ),
    });
    assert.strictEqual(estado, 200, JSON.stringify(cuerpo));
    assert.deepStrictEqual(mapa(cuerpo.columnas), {
      'Nº Caravana': 'identificador',
      Género: 'sexo',
      Genética: 'raza',
      'F. Nac.': 'fecha_nacimiento',
      Libras: 'peso',
      Clase: 'categoria',
      Procedencia: 'origen',
      Apodo: 'nombre',
    });
    assert.ok(cuerpo.columnas.every((c) => c.como === 'variante'), JSON.stringify(cuerpo.columnas));
    const fila = cuerpo.vista_previa[0];
    assert.strictEqual(fila.fecha_nacimiento, '2024-05-12');
    // 838 lb son 380,1 kg: el peso se guarda siempre en kilos (HU-26).
    assert.ok(Math.abs(fila.peso_kg - 380.11) < 0.05, String(fila.peso_kg));
  });

  await prueba('HU-41 criterio 2: reconoce variantes en ingles y sin importar mayusculas ni signos', async () => {
    const { estado, cuerpo } = await pedir('POST', '/importacion/vista-previa', {
      nombre_archivo: 'english.csv',
      contenido_base64: csv(`EAR_TAG,sex,BREED,D.O.B,Weight kg,Paddock\n${id('e1')},female,Angus,2024-03-01,410,\n`),
    });
    assert.strictEqual(estado, 200, JSON.stringify(cuerpo));
    assert.deepStrictEqual(mapa(cuerpo.columnas), {
      EAR_TAG: 'identificador',
      sex: 'sexo',
      BREED: 'raza',
      'D.O.B': 'fecha_nacimiento',
      'Weight kg': 'peso',
      Paddock: 'corral',
    });
    assert.strictEqual(cuerpo.vista_previa[0].peso_kg, 410);
  });

  await prueba('HU-41 criterio 2: tolera un error de tipeo en el encabezado', async () => {
    const { cuerpo } = await pedir('POST', '/importacion/vista-previa', {
      nombre_archivo: 'tipeo.csv',
      contenido_base64: csv(`Identificdor,Sexo,Categria\n${id('t1')},macho,novillo\n`),
    });
    assert.strictEqual(mapa(cuerpo.columnas).Identificdor, 'identificador');
    assert.strictEqual(mapa(cuerpo.columnas).Categria, 'categoria');
    assert.strictEqual(cuerpo.vista_previa[0].categoria_codigo, 'novillo');
  });

  await prueba('HU-41 criterio 3: dice que columna tomo como que campo, y como la reconocio', async () => {
    const { cuerpo } = await pedir('POST', '/importacion/vista-previa', {
      nombre_archivo: 'mixto.csv',
      contenido_base64: csv(`Identificador,Arete,Sexo,Observaciones\n${id('m1')},99,hembra,mansa\n`),
    });
    assert.deepStrictEqual(
      cuerpo.columnas.map((c) => [c.posicion, c.encabezado, c.campo, c.como]),
      [
        [0, 'Identificador', 'identificador', 'plantilla'],
        // "Arete" tambien parece un identificador, pero ese campo ya lo tiene la primera: se pregunta.
        [1, 'Arete', null, null],
        [2, 'Sexo', 'sexo', 'plantilla'],
        [3, 'Observaciones', null, null],
      ],
    );
    assert.ok(Array.isArray(cuerpo.campos) && cuerpo.campos.includes('raza'));
  });

  await prueba('HU-41 criterio 4: admite 5.000 filas y rechaza 5.001', async () => {
    const filas = (n) =>
      ['Caravana,Sexo', ...Array.from({ length: n }, (_, i) => `${id(`g${i}`)},${i % 2 ? 'M' : 'H'}`)].join('\n');
    const cinco = await pedir('POST', '/importacion/vista-previa', {
      nombre_archivo: 'grande.csv',
      contenido_base64: csv(filas(5000)),
    });
    assert.strictEqual(cinco.estado, 200, JSON.stringify(cinco.cuerpo).slice(0, 300));
    assert.strictEqual(cinco.cuerpo.resumen.total, 5000);
    assert.strictEqual(cinco.cuerpo.resumen.cargan, 5000);
    const masDe = await pedir('POST', '/importacion/vista-previa', {
      nombre_archivo: 'grande.csv',
      contenido_base64: csv(filas(5001)),
    });
    assert.strictEqual(masDe.estado, 400);
    assert.match(masDe.cuerpo.message, /5000|5\.000/);
  });

  await prueba('HU-41 criterio 4: un Excel de 5.000 filas se confirma completo', async () => {
    const filas = [['Arete', 'Género', 'Raza']];
    for (let i = 0; i < 5000; i++) filas.push([id(`x${i}`), i % 2 ? 'Macho' : 'Hembra', 'Brahman']);
    const { estado, cuerpo } = await pedir('POST', '/importacion/confirmar', {
      nombre_archivo: 'grande.xlsx',
      contenido_base64: await excel(filas),
    });
    assert.strictEqual(estado, 201, JSON.stringify(cuerpo).slice(0, 300));
    assert.strictEqual(cuerpo.resumen.insertados, 5000);
    assert.strictEqual(await cuantos([id('x0'), id('x4999')]), 2);
  });

  // --- HU-42 ---------------------------------------------------------------
  const desconocido = csv(
    'Animal;Sexo;Color;Observaciones\n' +
      `${id('d1')};hembra;Nelore;mansa\n` +
      `${id('d2')};macho;Gir;arisco\n`,
  );
  const archivo = { nombre_archivo: 'desconocido.csv', contenido_base64: desconocido };

  await prueba('HU-42 criterio 1: solo se piden las columnas que no se identificaron', async () => {
    const { estado, cuerpo } = await pedir('POST', '/importacion/vista-previa', archivo);
    assert.strictEqual(estado, 200, JSON.stringify(cuerpo));
    const sinReconocer = cuerpo.columnas.filter((c) => c.campo === null).map((c) => c.encabezado);
    assert.deepStrictEqual(sinReconocer, ['Animal', 'Color', 'Observaciones']);
    assert.strictEqual(mapa(cuerpo.columnas).Sexo, 'sexo');
    // Falta el identificador: hasta asignarlo no se valida ninguna fila.
    assert.strictEqual(cuerpo.listo, false);
    assert.deepStrictEqual(cuerpo.faltan, ['identificador']);
    assert.strictEqual(cuerpo.resumen.total, 2);
    assert.strictEqual(cuerpo.vista_previa.length, 0);
  });

  await prueba('HU-42 criterios 2 y 3: asignar a mano e ignorar una columna', async () => {
    const { estado, cuerpo } = await pedir('POST', '/importacion/vista-previa', {
      ...archivo,
      asignaciones: { 0: 'identificador', 2: 'raza', 3: 'ignorar' },
    });
    assert.strictEqual(estado, 200, JSON.stringify(cuerpo));
    assert.strictEqual(cuerpo.listo, true);
    assert.deepStrictEqual(
      cuerpo.columnas.map((c) => [c.encabezado, c.campo, c.como]),
      [
        ['Animal', 'identificador', 'manual'],
        ['Sexo', 'sexo', 'plantilla'],
        ['Color', 'raza', 'manual'],
        ['Observaciones', null, 'ignorada'],
      ],
    );
    assert.strictEqual(cuerpo.resumen.cargan, 2);
    assert.strictEqual(cuerpo.vista_previa[0].identificador, id('d1'));
    assert.strictEqual(cuerpo.vista_previa[0].raza, 'Nelore');
  });

  await prueba('HU-42 criterio 2: un campo que ya tiene columna no se puede volver a elegir', async () => {
    const { estado, cuerpo } = await pedir('POST', '/importacion/vista-previa', {
      ...archivo,
      asignaciones: { 0: 'identificador', 2: 'sexo' },
    });
    assert.strictEqual(estado, 400);
    assert.match(cuerpo.message, /Sexo/);
  });

  await prueba('HU-42 criterio 2: un campo que no existe se rechaza', async () => {
    const { estado } = await pedir('POST', '/importacion/vista-previa', {
      ...archivo,
      asignaciones: { 0: 'contrasena' },
    });
    assert.strictEqual(estado, 400);
  });

  await prueba('HU-42: confirmar usa la asignacion y no carga lo ignorado', async () => {
    const sinAsignar = await pedir('POST', '/importacion/confirmar', archivo);
    assert.strictEqual(sinAsignar.estado, 400);
    assert.strictEqual(await cuantos([id('d1'), id('d2')]), 0);

    const { estado, cuerpo } = await pedir('POST', '/importacion/confirmar', {
      ...archivo,
      asignaciones: { 0: 'identificador', 2: 'ignorar', 3: 'ignorar' },
    });
    assert.strictEqual(estado, 201, JSON.stringify(cuerpo));
    assert.strictEqual(cuerpo.resumen.insertados, 2);
    const r = await pool.query(
      `SELECT identificador, sexo, raza FROM animales WHERE rancho_id = $1 AND identificador = ANY($2::text[])
        ORDER BY identificador`,
      [RANCHO_A, [id('d1'), id('d2')]],
    );
    assert.deepStrictEqual(r.rows, [
      { identificador: id('d1'), sexo: 'hembra', raza: null },
      { identificador: id('d2'), sexo: 'macho', raza: null },
    ]);
  });

  // ------------------------------------------------------------------------
  await limpiar();

  console.log('\n----------------------------------------------------------------');
  console.log(`  Ejecutadas: ${exitosas + fallidas}   Pasan: ${exitosas}   Fallan: ${fallidas}`);
  console.log('----------------------------------------------------------------');

  await pool.end();

  if (fallidas > 0) {
    console.error('\nHU-41 o HU-42 no se aprueban.');
    process.exitCode = 1;
  } else {
    console.log('\nHU-41 y HU-42 cumplen sus criterios.');
  }
}

if (require.main === module) {
  ejecutarPruebas().catch(async (error) => {
    console.error('\nNo se pudieron correr las pruebas:', error.message);
    console.error('Revisa que el servidor este corriendo en', BASE);
    process.exitCode = 1;
    await limpiar().catch(() => undefined);
    void pool.end();
  });
}

module.exports = { ejecutarPruebas };
