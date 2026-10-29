/**
 * ============================================================================
 * SISTEMA DE GESTION DE GANADO
 * Pruebas de la categoría obligatoria
 * Responsable: Aaron | Sprint 3
 * ============================================================================
 *
 * Ajuste pedido antes de cerrar el Sprint 3: la categoría es obligatoria al
 * registrar, al editar y al importar (la columna Categoría también). Que
 * corresponda al sexo y a la edad lo prueba Romina en animales.test.js.
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

const PROPIETARIO_A = 'a1000000-0000-4000-8000-000000000001';
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

async function pedir(metodo, ruta, cuerpo, usuarioId = PROPIETARIO_A, idioma = 'es') {
  const respuesta = await fetch(`${BASE}${ruta}`, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', 'x-usuario-id': usuarioId, 'Accept-Language': idioma },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  return { estado: respuesta.status, cuerpo: await respuesta.json().catch(() => null) };
}

function csv(texto) {
  return Buffer.from(texto, 'utf8').toString('base64');
}

async function ejecutarPruebas() {
  console.log('================================================================');
  console.log('  CATEGORIA OBLIGATORIA');
  console.log('================================================================\n');

  try {
    let animalId;
    await prueba('Con categoría se registra', async () => {
      const { estado, cuerpo } = await pedir('POST', '/animales', {
        identificador: `R1-${MARCA}`,
        sexo: 'hembra',
        categoria_codigo: 'vaca',
      });
      assert.strictEqual(estado, 201, JSON.stringify(cuerpo));
      animalId = cuerpo.animal.id;
    });

    await prueba('Sin categoría no se registra ni se edita', async () => {
      const alta = await pedir('POST', '/animales', { identificador: `R3-${MARCA}`, sexo: 'macho' });
      assert.strictEqual(alta.estado, 400);
      assert.match(alta.cuerpo.message, /categoría/i);
      const edicion = await pedir('PATCH', `/animales/${animalId}`, { sexo: 'hembra' });
      assert.strictEqual(edicion.estado, 400);
    });

    await prueba('Importar: una fila sin categoría es un error de su fila', async () => {
      const archivo = csv('Identificador,Sexo,Categoría\n' + `I1-${MARCA},hembra,vaca\n` + `I2-${MARCA},hembra,\n`);
      const { cuerpo } = await pedir('POST', '/importacion/vista-previa', {
        nombre_archivo: 'categorias.csv',
        contenido_base64: archivo,
      });
      assert.strictEqual(cuerpo.resumen.cargan, 1, JSON.stringify(cuerpo));
      const porFila = Object.fromEntries(cuerpo.errores.map((e) => [e.fila, e]));
      assert.strictEqual(porFila[3].columna, 'categoria');
    });

    await prueba('Importar: un archivo sin la columna Categoría se rechaza', async () => {
      const { estado, cuerpo } = await pedir('POST', '/importacion/vista-previa', {
        nombre_archivo: 'categorias.csv',
        contenido_base64: csv(`Identificador,Sexo\nI8-${MARCA},hembra\n`),
      });
      assert.strictEqual(estado, 400);
      assert.match(cuerpo.message, /Categoría/);
    });
  } finally {
    await pool.query(`DELETE FROM animales WHERE rancho_id = $1 AND identificador LIKE $2`, [RANCHO_A, `%${MARCA}%`]);
  }

  console.log('\n----------------------------------------------------------------');
  console.log(`  Ejecutadas: ${exitosas + fallidas}   Pasan: ${exitosas}   Fallan: ${fallidas}`);
  console.log('----------------------------------------------------------------');

  await pool.end();

  if (fallidas > 0) {
    console.error('\nLa categoría obligatoria no se cumple.');
    process.exitCode = 1;
  } else {
    console.log('\nLa categoría obligatoria se cumple.');
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
