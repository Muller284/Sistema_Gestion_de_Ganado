import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * HU-25 · Que los textos de verdad estén en los archivos de idioma.
 *
 *   1. Todos los idiomas tienen las mismas claves que el español, con los
 *      mismos {datos} adentro y las mismas <marcas>.
 *   2. Cada clave que el código pide con t(), tn() o tJsx() existe.
 *   3. No quedan textos escritos directo en las pantallas (criterio 1).
 *
 * Si se suma un idioma (criterio 3), estas pruebas lo revisan solas.
 */

type Arbol = { [clave: string]: string | Arbol };

const RAIZ = join(__dirname, '..', '..');
const CARPETA_IDIOMAS = join(RAIZ, 'idiomas');
const CARPETA_FUENTES = join(RAIZ, 'cliente', 'src');

function hojas(arbol: Arbol, prefijo = ''): Map<string, string> {
  const resultado = new Map<string, string>();
  for (const [clave, valor] of Object.entries(arbol)) {
    const ruta = prefijo ? `${prefijo}.${clave}` : clave;
    if (typeof valor === 'string') resultado.set(ruta, valor);
    else for (const [r, v] of hojas(valor, ruta)) resultado.set(r, v);
  }
  return resultado;
}

const idiomas = Object.fromEntries(
  readdirSync(CARPETA_IDIOMAS)
    .filter((archivo) => archivo.endsWith('.json'))
    .map((archivo) => [
      archivo.replace('.json', ''),
      hojas(JSON.parse(readFileSync(join(CARPETA_IDIOMAS, archivo), 'utf8'))),
    ]),
);
const espanol = idiomas.es;

function fuentes(carpeta: string): string[] {
  return readdirSync(carpeta).flatMap((nombre) => {
    const ruta = join(carpeta, nombre);
    if (statSync(ruta).isDirectory()) return fuentes(ruta);
    return /\.tsx?$/.test(nombre) && !/\.test\.tsx?$/.test(nombre) ? [ruta] : [];
  });
}

const marcas = (texto: string) =>
  [...texto.matchAll(/\{(\w+)\}|<(\w+)>/g)].map((m) => m[0]).sort().join(' ');

describe('HU-25 · archivos de idioma', () => {
  it('hay al menos español e inglés', () => {
    expect(Object.keys(idiomas)).toEqual(expect.arrayContaining(['es', 'en']));
  });

  for (const [codigo, textos] of Object.entries(idiomas)) {
    if (codigo === 'es') continue;

    it(`${codigo} tiene exactamente las claves del español`, () => {
      const faltan = [...espanol.keys()].filter((clave) => !textos.has(clave));
      const sobran = [...textos.keys()].filter((clave) => !espanol.has(clave));
      expect({ faltan, sobran }).toEqual({ faltan: [], sobran: [] });
    });

    it(`${codigo} usa los mismos {datos} y <marcas> que el español`, () => {
      const distintos = [...espanol.entries()]
        .filter(([clave, texto]) => textos.has(clave) && marcas(texto) !== marcas(textos.get(clave)!))
        .map(([clave]) => clave);
      expect(distintos).toEqual([]);
    });

    it(`${codigo} no tiene textos vacíos`, () => {
      expect([...textos.entries()].filter(([, v]) => !v.trim()).map(([k]) => k)).toEqual([]);
    });
  }

  it('cada clave que pide el código existe', () => {
    const faltan: string[] = [];
    for (const archivo of fuentes(CARPETA_FUENTES)) {
      const codigo = readFileSync(archivo, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
      for (const m of codigo.matchAll(/\b(t|tJsx)\(\s*'([\w.]+)'/g)) {
        if (!espanol.has(m[2])) faltan.push(`${archivo.replace(RAIZ, '')}: ${m[2]}`);
      }
      for (const m of codigo.matchAll(/\btn\(\s*'([\w.]+)'/g)) {
        for (const forma of ['uno', 'otros']) {
          if (!espanol.has(`${m[1]}.${forma}`)) faltan.push(`${archivo.replace(RAIZ, '')}: ${m[1]}.${forma}`);
        }
      }
    }
    expect(faltan).toEqual([]);
  });
});

/**
 * Lo que se permite escrito en el código: datos de ejemplo del catálogo del
 * sistema de diseño, nombres propios y créditos que no se traducen.
 */
const PERMITIDOS = [
  /OpenStreetMap/,
  /^Gesti[oó]n de Ganado$/,
  // Código de moneda: es igual en todos los idiomas.
  /^USD$/,
  // Un tipo genérico de TypeScript que el patrón confunde con texto.
  /^Promise$/,
];

const ATRIBUTOS_DE_TEXTO =
  /\b(placeholder|title|aria-label|alt|etiqueta|ayuda|titulo|texto|rotulo|detalle|label)="([^"]*[A-Za-zÁÉÍÓÚáéíóúñÑ]{2,}[^"]*)"/g;

describe('HU-25 · sin textos escritos en las pantallas', () => {
  const pantallas = fuentes(CARPETA_FUENTES).filter(
    (ruta) => ruta.endsWith('.tsx') && !ruta.includes('sistema-diseno'),
  );

  it('ningún texto entre etiquetas JSX', () => {
    const hallazgos: string[] = [];
    for (const archivo of pantallas) {
      const codigo = readFileSync(archivo, 'utf8')
        // Sin comentarios: ahí sí se escribe en español.
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '');
      for (const m of codigo.matchAll(/>([^<>{}]*[A-Za-zÁÉÍÓÚáéíóúñÑ]{2,}[^<>{}]*)</g)) {
        const texto = m[1].trim();
        // Expresiones de TypeScript que el patrón confunde con texto (a => b < c).
        if (/[=;()]|&&|\?\s|=>/.test(m[1]) || !texto) continue;
        if (PERMITIDOS.some((p) => p.test(texto))) continue;
        hallazgos.push(`${archivo.replace(RAIZ, '')}: «${texto}»`);
      }
    }
    expect(hallazgos).toEqual([]);
  });

  it('ningún texto en atributos que se leen', () => {
    const hallazgos: string[] = [];
    for (const archivo of pantallas) {
      const codigo = readFileSync(archivo, 'utf8');
      for (const m of codigo.matchAll(ATRIBUTOS_DE_TEXTO)) {
        if (PERMITIDOS.some((p) => p.test(m[2]))) continue;
        hallazgos.push(`${archivo.replace(RAIZ, '')}: ${m[1]}="${m[2]}"`);
      }
    }
    expect(hallazgos).toEqual([]);
  });
});
