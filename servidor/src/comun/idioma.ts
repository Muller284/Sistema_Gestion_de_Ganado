import { AsyncLocalStorage } from 'async_hooks';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { dirname, join } from 'path';

/**
 * HU-25 · Los mensajes del servidor en el idioma de quien pregunta.
 *
 * Los textos viven en idiomas/<codigo>.json, en la raiz del repositorio: el
 * mismo archivo que usa el cliente. El servidor usa las claves que empiezan
 * con "servidor." (respuestas y errores) y "correos." (los correos).
 *
 * DE DONDE SALE EL IDIOMA
 * El cliente manda Accept-Language en cada peticion (el idioma que tiene la
 * interfaz en ese momento). Un middleware lo guarda en un AsyncLocalStorage
 * mientras dura la peticion, asi que cualquier servicio llama a t() sin
 * tener que recibir el idioma por parametro.
 *
 * DONDE ESTA LA CARPETA
 * CARPETA_IDIOMAS si esta definida (Docker la monta en /idiomas); si no, se
 * busca subiendo desde este archivo (sirve igual desde src/ y desde dist/).
 *
 * Sumar un idioma es sumar un archivo: se leen todos los .json de la carpeta.
 */

type Arbol = { [clave: string]: string | Arbol };

export const IDIOMA_POR_DEFECTO = 'es';

function buscarCarpeta(): string | null {
  if (process.env.CARPETA_IDIOMAS && existsSync(process.env.CARPETA_IDIOMAS)) {
    return process.env.CARPETA_IDIOMAS;
  }
  let actual = __dirname;
  for (let i = 0; i < 6; i++) {
    const candidata = join(actual, 'idiomas');
    if (existsSync(join(candidata, `${IDIOMA_POR_DEFECTO}.json`))) return candidata;
    actual = dirname(actual);
  }
  return null;
}

function cargar(): Record<string, Arbol> {
  const carpeta = buscarCarpeta();
  const diccionarios: Record<string, Arbol> = {};
  if (!carpeta) {
    console.warn('[idioma] No se encontro la carpeta idiomas/. Los mensajes saldran como claves.');
    return diccionarios;
  }
  for (const archivo of readdirSync(carpeta)) {
    if (!archivo.endsWith('.json')) continue;
    const contenido = JSON.parse(readFileSync(join(carpeta, archivo), 'utf8')) as Arbol;
    const meta = contenido._idioma as Arbol | undefined;
    const codigo = typeof meta?.codigo === 'string' ? meta.codigo : archivo.replace(/\.json$/, '');
    diccionarios[codigo] = contenido;
  }
  return diccionarios;
}

const DICCIONARIOS = cargar();
const almacen = new AsyncLocalStorage<{ idioma: string }>();

export function idiomasDisponibles(): string[] {
  return Object.keys(DICCIONARIOS);
}

/** 'en-US,en;q=0.9,es;q=0.8' → el primero que tengamos, o null. */
export function elegirIdioma(valor: string | null | undefined): string | null {
  if (!valor) return null;
  for (const parte of valor.split(',')) {
    const corto = parte.trim().split(';')[0].toLowerCase().split(/[-_]/)[0];
    if (corto && DICCIONARIOS[corto]) return corto;
  }
  return null;
}

export function idiomaActual(): string {
  return almacen.getStore()?.idioma ?? IDIOMA_POR_DEFECTO;
}

/** Corre algo en un idioma dado: por ejemplo, un correo en el idioma del que lo recibe. */
export function enIdioma<T>(idioma: string | null | undefined, trabajo: () => T): T {
  return almacen.run({ idioma: elegirIdioma(idioma) ?? idiomaActual() }, trabajo);
}

/** Middleware de Express: cada peticion trabaja en el idioma que pidio. */
export function middlewareIdioma(peticion: any, _respuesta: any, siguiente: () => void) {
  const idioma = elegirIdioma(peticion.headers?.['accept-language']) ?? IDIOMA_POR_DEFECTO;
  almacen.run({ idioma }, siguiente);
}

function buscar(diccionario: Arbol | undefined, clave: string): string | null {
  let nodo: string | Arbol | undefined = diccionario;
  for (const parte of clave.split('.')) {
    if (!nodo || typeof nodo === 'string') return null;
    nodo = nodo[parte];
  }
  return typeof nodo === 'string' ? nodo : null;
}

/**
 * El texto de una clave en el idioma de la peticion. Si falta, el español;
 * si falta tambien, la clave misma (asi se nota en lugar de quedar vacio).
 */
export function t(clave: string, datos?: Record<string, string | number>): string {
  const texto =
    buscar(DICCIONARIOS[idiomaActual()], clave) ?? buscar(DICCIONARIOS[IDIOMA_POR_DEFECTO], clave);
  if (texto === null) return clave;
  if (!datos) return texto;
  return texto.replace(/\{(\w+)\}/g, (entero, nombre: string) =>
    nombre in datos ? String(datos[nombre]) : entero,
  );
}

/** Con cantidad: clave.cero (si existe), clave.uno o clave.otros. {n} es la cantidad. */
export function tn(clave: string, n: number, datos?: Record<string, string | number>): string {
  const cero = `${clave}.cero`;
  const tieneCero =
    buscar(DICCIONARIOS[idiomaActual()], cero) !== null ||
    buscar(DICCIONARIOS[IDIOMA_POR_DEFECTO], cero) !== null;
  const forma = n === 0 && tieneCero ? 'cero' : n === 1 ? 'uno' : 'otros';
  return t(`${clave}.${forma}`, { n, ...datos });
}

/** Une una lista en el idioma actual: "a, b y c" / "a, b and c". */
export function enumerarEn(partes: string[]): string {
  if (partes.length <= 1) return partes.join('');
  return t('servidor.comun.enumerar', {
    primeros: partes.slice(0, -1).join(', '),
    ultimo: partes[partes.length - 1],
  });
}
