/**
 * ============================================================================
 * SISTEMA DE GESTION DE GANADO
 * Pruebas de la raza como lista fija y la categoría obligatoria
 * Responsable: Aaron | Sprint 3
 * ============================================================================
 *
 * Ajustes pedidos antes de cerrar el Sprint 3:
 *   - La raza se elige de una lista fija (GET /animales/razas), agrupada.
 *     Se guarda el código; un texto libre se rechaza. La raza escrita a mano
 *     antes de la lista se conserva si no se cambia.
 *   - La categoría es obligatoria al registrar, al editar y al importar.
 *   - Importar acepta el nombre de la raza en los dos idiomas y los nombres
 *     de uso común (Holando, mestizo...), y la exportación muestra el nombre.
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
  console.log('  RAZA DE LISTA FIJA Y CATEGORIA OBLIGATORIA');
  console.log('================================================================\n');

  try {
    await prueba('La lista de razas viene agrupada y trae las más comunes, cruza y otra', async () => {
      const { estado, cuerpo } = await pedir('GET', '/animales/razas');
      assert.strictEqual(estado, 200, JSON.stringify(cuerpo));
      const grupos = cuerpo.map((g) => g.grupo);
      assert.deepStrictEqual(grupos, ['cebuinas', 'britanicas', 'continentales', 'lecheras', 'compuestas', 'criollas', 'otras']);
      const todas = cuerpo.flatMap((g) => g.razas);
      for (const raza of ['nelore', 'brahman', 'angus', 'holstein', 'criollo_yacumeno', 'cruza', 'otra']) {
        assert.ok(todas.includes(raza), `falta ${raza}`);
      }
      assert.strictEqual(new Set(todas).size, todas.length, 'hay razas repetidas');
    });

    let animalId;
    await prueba('Se registra con una raza de la lista y se guarda su código', async () => {
      const { estado, cuerpo } = await pedir('POST', '/animales', {
        identificador: `R1-${MARCA}`,
        sexo: 'hembra',
        categoria_codigo: 'vaca',
        raza: 'nelore',
      });
      assert.strictEqual(estado, 201, JSON.stringify(cuerpo));
      assert.strictEqual(cuerpo.animal.raza, 'nelore');
      animalId = cuerpo.animal.id;
    });

    await prueba('Una raza escrita a mano, fuera de la lista, se rechaza', async () => {
      const alta = await pedir('POST', '/animales', {
        identificador: `R2-${MARCA}`,
        sexo: 'hembra',
        categoria_codigo: 'vaca',
        raza: 'Vaca linda',
      });
      assert.strictEqual(alta.estado, 400);
      const edicion = await pedir('PATCH', `/animales/${animalId}`, { sexo: 'hembra', categoria_codigo: 'vaca', raza: 'Vaca linda' });
      assert.strictEqual(edicion.estado, 400);
    });

    await prueba('La raza de antes de la lista se conserva al editar sin cambiarla', async () => {
      await pool.query(`UPDATE animales SET raza = 'Nelore puro de pedigrí' WHERE id = $1`, [animalId]);
      const igual = await pedir('PATCH', `/animales/${animalId}`, {
        sexo: 'hembra',
        categoria_codigo: 'vaca',
        raza: 'Nelore puro de pedigrí',
        nombre: 'Lucera',
      });
      assert.strictEqual(igual.estado, 200, JSON.stringify(igual.cuerpo));
      assert.strictEqual(igual.cuerpo.animal.raza, 'Nelore puro de pedigrí');
      const cambiada = await pedir('PATCH', `/animales/${animalId}`, { sexo: 'hembra', categoria_codigo: 'vaca', raza: 'brahman' });
      assert.strictEqual(cambiada.cuerpo.animal.raza, 'brahman');
    });

    await prueba('Sin categoría no se registra ni se edita', async () => {
      const alta = await pedir('POST', '/animales', { identificador: `R3-${MARCA}`, sexo: 'macho' });
      assert.strictEqual(alta.estado, 400);
      assert.match(alta.cuerpo.message, /categoría/i);
      const edicion = await pedir('PATCH', `/animales/${animalId}`, { sexo: 'hembra' });
      assert.strictEqual(edicion.estado, 400);
    });

    await prueba('Importar: acepta nombres de raza en los dos idiomas y los de uso común', async () => {
      const archivo = csv(
        'Identificador,Sexo,Categoría,Raza\n' +
          `I1-${MARCA},hembra,vaca,Holando\n` +
          `I2-${MARCA},hembra,vaca,Brown Swiss\n` +
          `I3-${MARCA},macho,toro,Criollo Yacumeño\n` +
          `I4-${MARCA},macho,toro,mestizo\n` +
          `I5-${MARCA},macho,toro,\n`,
      );
      const { estado, cuerpo } = await pedir('POST', '/importacion/vista-previa', {
        nombre_archivo: 'razas.csv',
        contenido_base64: archivo,
      });
      assert.strictEqual(estado, 200, JSON.stringify(cuerpo));
      assert.strictEqual(cuerpo.resumen.con_error, 0, JSON.stringify(cuerpo.errores));
      assert.deepStrictEqual(
        cuerpo.vista_previa.map((f) => f.raza),
        ['holstein', 'pardo_suizo', 'criollo_yacumeno', 'cruza', null],
      );
    });

    await prueba('Importar: una raza desconocida o una fila sin categoría son errores de su fila', async () => {
      const archivo = csv(
        'Identificador,Sexo,Categoría,Raza\n' + `I6-${MARCA},hembra,vaca,Vaca linda\n` + `I7-${MARCA},hembra,,nelore\n`,
      );
      const { cuerpo } = await pedir('POST', '/importacion/vista-previa', {
        nombre_archivo: 'razas.csv',
        contenido_base64: archivo,
      });
      const porFila = Object.fromEntries(cuerpo.errores.map((e) => [e.fila, e]));
      assert.strictEqual(porFila[2].columna, 'raza');
      assert.match(porFila[2].motivo, /Vaca linda/);
      assert.strictEqual(porFila[3].columna, 'categoria');
    });

    await prueba('Importar: un archivo sin la columna Categoría se rechaza', async () => {
      const { estado, cuerpo } = await pedir('POST', '/importacion/vista-previa', {
        nombre_archivo: 'razas.csv',
        contenido_base64: csv(`Identificador,Sexo\nI8-${MARCA},hembra\n`),
      });
      assert.strictEqual(estado, 400);
      assert.match(cuerpo.message, /Categoría/);
    });

    await prueba('La exportación muestra el nombre de la raza, no su código', async () => {
      const respuesta = await fetch(`${BASE}/exportacion?que=animales&formato=csv&busqueda=R1-${MARCA}`, {
        headers: { 'x-usuario-id': PROPIETARIO_A, 'Accept-Language': 'en' },
      });
      const texto = Buffer.from(await respuesta.arrayBuffer()).toString('utf8');
      assert.ok(texto.includes(',Brahman,'), texto);
    });
  } finally {
    await pool.query(`DELETE FROM animales WHERE rancho_id = $1 AND identificador LIKE $2`, [RANCHO_A, `%${MARCA}%`]);
  }

  console.log('\n----------------------------------------------------------------');
  console.log(`  Ejecutadas: ${exitosas + fallidas}   Pasan: ${exitosas}   Fallan: ${fallidas}`);
  console.log('----------------------------------------------------------------');

  await pool.end();

  if (fallidas > 0) {
    console.error('\nLa raza y la categoría no cumplen lo pedido.');
    process.exitCode = 1;
  } else {
    console.log('\nLa raza de lista fija y la categoría obligatoria se cumplen.');
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
