/**
 * ============================================================================
 * SISTEMA DE GESTION DE GANADO
 * Pruebas de Calidad (QA) — HU-40 a HU-45: Importación de Animales y Lotes
 * Responsable: Romina | Sprint 2
 * ============================================================================
 *
 * Criterios evaluados:
 *   1. HU-40: Descarga de plantilla CSV con columnas y formato oficial.
 *   2. HU-41: Validación de formato, columnas obligatorias (caravana, sexo).
 *   3. HU-42: Detección y reporte detallado de filas con errores.
 *   4. HU-43: Detección de caravanas duplicadas (en archivo y en el rancho).
 *   5. HU-44: Ejecución con resolución de duplicados ('omitir' vs 'actualizar').
 *   6. HU-21: Restricción de permisos (el socio no puede importar animales).
 * ============================================================================
 */

require('../cargar-entorno').cargarEntorno();
const assert = require('assert');

const BASE = process.env.URL_SERVIDOR || 'http://localhost:3000';

const PROPIETARIO_ID = 'a1000000-0000-4000-8000-000000000001';
const SOCIO_ID = 'a1000000-0000-4000-8000-000000000002';

let exitosas = 0;
let fallidas = 0;

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

async function pedir(ruta, opciones = {}, usuarioId = PROPIETARIO_ID) {
  const respuesta = await fetch(`${BASE}${ruta}`, {
    ...opciones,
    headers: {
      'Content-Type': 'application/json',
      ...(usuarioId ? { 'x-usuario-id': usuarioId } : {}),
      ...(opciones.headers ?? {}),
    },
  });
  const cuerpo = await respuesta.json().catch(() => null);
  return { estado: respuesta.status, cuerpo };
}

async function ejecutarPruebas() {
  console.log('================================================================');
  console.log('  HU-40 A HU-45: IMPORTACIÓN DE ANIMALES (CSV / LOTES)');
  console.log('  Responsable: Romina | Sprint 2');
  console.log('================================================================\n');

  // HU-40: Descarga de plantilla
  await prueba('HU-40: Obtener plantilla CSV con encabezados estándar', async () => {
    const { estado, cuerpo } = await pedir('/importacion/plantilla');
    assert.strictEqual(estado, 200);
    assert.ok(cuerpo.encabezados.includes('caravana'));
    assert.ok(cuerpo.encabezados.includes('peso_actual'));
    assert.ok(cuerpo.contenidoCsv.includes('5001'));
  });

  // HU-41: Validación de archivo correcto
  await prueba('HU-41: Validar archivo CSV con animales nuevos correctos', async () => {
    const csvValido = [
      'caravana,especie,raza,sexo,fecha_nacimiento,peso_actual,corral',
      '9001,Bovino,Nelore,hembra,2024-01-10,350.0,Corral 1',
      '9002,Bovino,Brahman,macho,2024-03-15,390.5,Corral 2',
    ].join('\n');

    const { estado, cuerpo } = await pedir('/importacion/validar', {
      method: 'POST',
      body: JSON.stringify({ csv: csvValido }),
    });

    assert.strictEqual(estado, 201);
    assert.strictEqual(cuerpo.total, 2);
    assert.strictEqual(cuerpo.validas, 2);
    assert.strictEqual(cuerpo.con_errores, 0);
  });

  // HU-42: Detección de errores en filas
  await prueba('HU-42: Rechazar filas con caravana vacia o sexo invalido', async () => {
    const csvConErrores = [
      'caravana,especie,raza,sexo,fecha_nacimiento,peso_actual,corral',
      ',Bovino,Nelore,hembra,2024-01-10,350.0,Corral 1', // Sin caravana
      '9003,Bovino,Nelore,invalido,2024-01-10,350.0,Corral 1', // Sexo inválido
    ].join('\n');

    const { estado, cuerpo } = await pedir('/importacion/validar', {
      method: 'POST',
      body: JSON.stringify({ csv: csvConErrores }),
    });

    assert.strictEqual(estado, 201);
    assert.strictEqual(cuerpo.con_errores, 2);
    assert.ok(cuerpo.errores.some((e) => e.error.includes('caravana')));
    assert.ok(cuerpo.errores.some((e) => e.error.includes('sexo')));
  });

  // HU-43: Detección de duplicados
  await prueba('HU-43: Detectar caravanas duplicadas existentes en el rancho', async () => {
    // 4471 y 4120 ya existen en Rancho El Cerrito
    const csvConDuplicados = [
      'caravana,especie,raza,sexo,fecha_nacimiento,peso_actual,corral',
      '4471,Bovino,Nelore,hembra,2024-01-10,400.0,Corral 2',
      '9004,Bovino,Nelore,macho,2024-01-10,320.0,Corral 1',
    ].join('\n');

    const { estado, cuerpo } = await pedir('/importacion/validar', {
      method: 'POST',
      body: JSON.stringify({ csv: csvConDuplicados }),
    });

    assert.strictEqual(estado, 201);
    assert.strictEqual(cuerpo.duplicados, 1);
    assert.ok(cuerpo.filas_duplicadas.includes('4471'));
  });

  // HU-44: Ejecución con estrategia 'omitir'
  await prueba('HU-44: Ejecutar importacion omitiendo los duplicados', async () => {
    const csv = [
      'caravana,especie,raza,sexo,fecha_nacimiento,peso_actual,corral',
      '4471,Bovino,Nelore,hembra,2024-01-10,400.0,Corral 2', // ya existe
      '9005,Bovino,Nelore,macho,2024-01-10,310.0,Corral 1',  // nuevo
    ].join('\n');

    const { estado, cuerpo } = await pedir('/importacion/ejecutar', {
      method: 'POST',
      body: JSON.stringify({ csv, estrategia_duplicados: 'omitir' }),
    });

    assert.strictEqual(estado, 201);
    assert.strictEqual(cuerpo.exito, true);
    assert.strictEqual(cuerpo.resumen.insertados, 1);
    assert.strictEqual(cuerpo.resumen.omitidos, 1);
  });

  // HU-21: Restricción del rol socio
  await prueba('HU-21: El rol Socio no tiene permiso para importar animales (403)', async () => {
    const csv = 'caravana,sexo\n9006,hembra';
    const { estado } = await pedir(
      '/importacion/ejecutar',
      { method: 'POST', body: JSON.stringify({ csv }) },
      SOCIO_ID,
    );
    assert.strictEqual(estado, 403);
  });

  console.log('\n----------------------------------------------------------------');
  console.log(`  Ejecutadas: ${exitosas + fallidas}   Pasan: ${exitosas}   Fallan: ${fallidas}`);
  console.log('----------------------------------------------------------------');

  if (fallidas > 0) {
    console.error('\nSuite de Importación NO aprobada.');
    process.exitCode = 1;
  } else {
    console.log('\nSuite de Importación Aprobada al 100%.');
  }
}

if (require.main === module) {
  ejecutarPruebas().catch((error) => {
    console.error('Error al correr pruebas de importacion:', error);
    process.exitCode = 1;
  });
}

module.exports = { ejecutarPruebas };
