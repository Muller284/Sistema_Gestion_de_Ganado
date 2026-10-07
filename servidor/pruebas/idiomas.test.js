/**
 * ============================================================================
 * SISTEMA DE GESTION DE GANADO
 * Pruebas de HU-25 del lado del servidor
 * ============================================================================
 *
 * No necesita la base ni el servidor levantado. Revisa que:
 *   1. Cada clave que el servidor pide con t() o tn() exista en idiomas/es.json.
 *   2. Todos los idiomas tengan las claves "servidor.*" y "correos.*" del español.
 *   3. Ningun mensaje de excepcion quede escrito directo en el codigo.
 * ============================================================================
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..', '..');
const CARPETA_IDIOMAS = path.join(RAIZ, 'idiomas');
const FUENTES = path.join(__dirname, '..', 'src');

let exitosas = 0;
let fallidas = 0;

function prueba(nombre, cuerpo) {
  try {
    cuerpo();
    console.log(`  [PASA]  ${nombre}`);
    exitosas++;
  } catch (error) {
    console.error(`  [FALLA] ${nombre}`);
    console.error(`          ${error.message.split('\n').slice(0, 12).join('\n          ')}`);
    fallidas++;
  }
}

function hojas(arbol, prefijo = '', resultado = new Map()) {
  for (const [clave, valor] of Object.entries(arbol)) {
    const ruta = prefijo ? `${prefijo}.${clave}` : clave;
    if (typeof valor === 'string') resultado.set(ruta, valor);
    else hojas(valor, ruta, resultado);
  }
  return resultado;
}

function archivos(carpeta) {
  return fs.readdirSync(carpeta).flatMap((nombre) => {
    const ruta = path.join(carpeta, nombre);
    if (fs.statSync(ruta).isDirectory()) return archivos(ruta);
    return nombre.endsWith('.ts') ? [ruta] : [];
  });
}

const idiomas = Object.fromEntries(
  fs
    .readdirSync(CARPETA_IDIOMAS)
    .filter((f) => f.endsWith('.json'))
    .map((f) => [
      f.replace('.json', ''),
      hojas(JSON.parse(fs.readFileSync(path.join(CARPETA_IDIOMAS, f), 'utf8'))),
    ]),
);
const espanol = idiomas.es;
const sinComentarios = (codigo) =>
  codigo.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

console.log('================================================================');
console.log('  HU-25 IDIOMAS DEL SERVIDOR');
console.log('================================================================\n');

prueba('Cada clave que pide el servidor existe en español', () => {
  const faltan = [];
  for (const archivo of archivos(FUENTES)) {
    const codigo = sinComentarios(fs.readFileSync(archivo, 'utf8'));
    for (const m of codigo.matchAll(/\bt\(\s*'([\w.]+)'/g)) {
      if (!espanol.has(m[1])) faltan.push(`${path.relative(RAIZ, archivo)}: ${m[1]}`);
    }
    for (const m of codigo.matchAll(/\btn\(\s*'([\w.]+)'/g)) {
      for (const forma of ['uno', 'otros']) {
        if (!espanol.has(`${m[1]}.${forma}`)) faltan.push(`${path.relative(RAIZ, archivo)}: ${m[1]}.${forma}`);
      }
    }
  }
  assert.deepStrictEqual(faltan, []);
});

for (const [codigo, textos] of Object.entries(idiomas)) {
  if (codigo === 'es') continue;
  prueba(`${codigo} tiene todos los mensajes y correos del español`, () => {
    const faltan = [...espanol.keys()]
      .filter((c) => c.startsWith('servidor.') || c.startsWith('correos.'))
      .filter((c) => !textos.has(c));
    assert.deepStrictEqual(faltan, []);
  });
}

prueba('Ninguna excepcion lleva el texto escrito en el codigo', () => {
  const hallazgos = [];
  for (const archivo of archivos(FUENTES)) {
    const codigo = sinComentarios(fs.readFileSync(archivo, 'utf8'));
    for (const m of codigo.matchAll(/Exception\(\s*(['`])/g)) {
      hallazgos.push(`${path.relative(RAIZ, archivo)}: ${codigo.slice(m.index, m.index + 70)}`);
    }
    for (const m of codigo.matchAll(/\b(message|mensaje|aviso):\s*(['`])/g)) {
      hallazgos.push(`${path.relative(RAIZ, archivo)}: ${codigo.slice(m.index, m.index + 70)}`);
    }
  }
  assert.deepStrictEqual(hallazgos, []);
});

console.log('\n----------------------------------------------------------------');
console.log(`  Ejecutadas: ${exitosas + fallidas}   Pasan: ${exitosas}   Fallan: ${fallidas}`);
console.log('----------------------------------------------------------------');
if (fallidas > 0) {
  console.error('\nHU-25 no se aprueba del lado del servidor.');
  process.exitCode = 1;
} else {
  console.log('\nLos mensajes del servidor estan en los archivos de idioma.');
}
