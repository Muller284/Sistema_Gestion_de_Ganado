import { BadRequestException } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { enIdioma, t } from '../../comun/idioma';

/**
 * Lee el archivo que sube el propietario (Excel o CSV) y lo deja como filas
 * con las columnas de la plantilla (HU-40).
 *
 * HU-41 · Importación con reconocimiento de columnas (Brian)
 *   1. Acepta archivos Excel (.xlsx) y CSV (con coma o punto y coma).
 *   2. Reconoce cada columna por el nombre de su encabezado, admitiendo
 *      variantes comunes: la plantilla en español o inglés, sinónimos de
 *      uso habitual en el campo ("Caravana", "Arete", "Potrero", "DOB",
 *      "Peso (lb)"...), sin importar mayúsculas, acentos, signos ni palabras
 *      de relleno, y con tolerancia a un error de tipeo.
 *   3. Devuelve qué columna reconoció como qué campo (columnas[]), para que
 *      la pantalla lo muestre antes de continuar.
 *   4. Admite archivos de hasta MAXIMO_FILAS (5.000) filas.
 *
 * HU-42 · Confirmación manual de columnas (Brian)
 *   Las columnas que no se reconocen vuelven con campo nulo: son las únicas
 *   que la pantalla pide. Para cada una se elige un campo libre o 'ignorar'
 *   y vuelve en `asignaciones` ({ posición: campo | 'ignorar' }).
 */

export const COLUMNAS = [
  'identificador',
  'tipo_identificador',
  'nombre',
  'raza',
  'sexo',
  'categoria',
  'fecha_nacimiento',
  'origen',
  'corral',
  'peso',
] as const;

export type Columna = (typeof COLUMNAS)[number];
export type Valor = string | number | Date | null;

export interface FilaLeida {
  /** Número de fila en el archivo, contando el encabezado como la 1. */
  fila: number;
  valores: Partial<Record<Columna, Valor>>;
}

/**
 * HU-41 y HU-42 · Cómo se interpretó cada columna del archivo.
 *   plantilla  el encabezado es el de la plantilla (o la clave interna)
 *   variante   se reconoció por un sinónimo o con un error de tipeo
 *   manual     lo eligió el usuario (HU-42)
 *   ignorada   el usuario pidió no usarla (HU-42)
 *   null       no se reconoció: hay que pedírsela al usuario
 */
export type ComoSeReconocio = 'plantilla' | 'variante' | 'manual' | 'ignorada' | null;

export interface ColumnaDelArchivo {
  /** Posición en el archivo, desde 0. Es la clave de `asignaciones`. */
  posicion: number;
  /** El encabezado tal como está escrito en el archivo. */
  encabezado: string;
  campo: Columna | null;
  como: ComoSeReconocio;
}

/** Lo que la pantalla devuelve para las columnas no reconocidas: posición → campo o 'ignorar'. */
export type Asignaciones = Record<string, string>;

export const IGNORAR = 'ignorar';
export const OBLIGATORIAS: readonly Columna[] = ['identificador', 'sexo'];

export interface ArchivoLeido {
  filas: FilaLeida[];
  /** Unidad del peso que dice el encabezado; si no dice, kilos. */
  unidadPeso: 'kg' | 'lb';
  /** HU-41, criterio 3: cada columna del archivo y el campo que le tocó. */
  columnas: ColumnaDelArchivo[];
  /** Columnas obligatorias que no quedaron asignadas a ninguna columna del archivo. */
  faltan: Columna[];
}

export const MAXIMO_FILAS = 5000;
const MAXIMO_BYTES = 5 * 1024 * 1024;

/** Sin mayúsculas, sin acentos, sin lo que va entre paréntesis y sin espacios de más. */
export function normalizar(texto: unknown): string {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/[_\s]+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * HU-41, criterio 2 · Variantes comunes de cada encabezado, además del título
 * de la plantilla en cada idioma. Se escriben ya normalizadas (minúsculas,
 * sin acentos ni signos). Sumar una variante es sumar una palabra acá.
 */
const VARIANTES: Record<Columna, string[]> = {
  identificador: [
    'id', 'identificacion', 'identificador animal', 'caravana', 'numero caravana', 'nro caravana',
    'n caravana', 'num caravana', 'arete', 'numero arete', 'nro arete', 'crotal', 'numero', 'nro',
    'num', 'n', 'codigo', 'cod', 'codigo animal', 'rp', 'hba', 'chip', 'rfid', 'tag', 'ear tag',
    'eartag', 'tag number', 'tag id', 'animal id', 'id animal', 'identifier', 'identification',
    'number', 'code',
  ],
  tipo_identificador: [
    'tipo', 'tipo id', 'tipo identificacion', 'tipo caravana', 'tipo arete', 'tipo codigo',
    'id type', 'identifier type', 'identification type', 'tag type', 'type',
  ],
  nombre: ['nombre animal', 'apodo', 'alias', 'name', 'animal name', 'nickname'],
  raza: ['raza animal', 'genetica', 'cruza', 'cruce', 'biotipo', 'breed', 'genetics'],
  sexo: ['genero', 'macho hembra', 'm h', 'h m', 'sex', 'gender', 'm f', 'f m'],
  categoria: [
    'categoria animal', 'clase', 'tipo animal', 'etapa', 'categ', 'cat', 'category', 'class',
    'stage', 'animal category',
  ],
  fecha_nacimiento: [
    'nacimiento', 'fecha nac', 'f nacimiento', 'f nac', 'fec nac', 'fnac', 'fecha nacido',
    'nacido', 'nacio', 'fecha parto', 'birth', 'birth date', 'birthdate', 'date birth', 'dob',
    'born', 'birthday', 'd o b',
  ],
  origen: ['procedencia', 'origin', 'source', 'provenance', 'nacido o comprado'],
  corral: [
    'potrero', 'lote', 'corral actual', 'ubicacion', 'piquete', 'manga', 'pen', 'paddock', 'lot',
    'location', 'current pen',
  ],
  peso: [
    'peso actual', 'peso vivo', 'peso kg', 'peso lb', 'peso kilos', 'kilos', 'kg', 'kgs', 'libras',
    'lb', 'lbs', 'weight', 'weight kg', 'weight lb', 'current weight', 'live weight', 'pounds',
  ],
};

/** Palabras que no cambian el sentido de un encabezado: "Fecha DE nacimiento", "Nombre DEL animal". */
const RELLENO = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'en', 'of', 'the']);

/**
 * El encabezado listo para comparar: como normalizar() (sin mayúsculas,
 * acentos ni lo que va entre paréntesis), pero también sin signos (".", "#",
 * "°", "/", "-", ":") y sin palabras de relleno: "Nº de Caravana" queda
 * "n caravana" y "F. Nac." queda "f nac".
 */
export function normalizarEncabezado(texto: unknown): string {
  const base = normalizar(texto)
    .replace(/[º°#.:/\\|\-]+/g, ' ')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const palabras = base.split(' ').filter((palabra) => palabra && !RELLENO.has(palabra));
  // Si todo era relleno, se queda lo que había.
  return palabras.length > 0 ? palabras.join(' ') : base;
}

interface Diccionario {
  /** Encabezado normalizado → columna y si es el de la plantilla o una variante. */
  nombres: Map<string, { columna: Columna; como: 'plantilla' | 'variante' }>;
}

/** Cada nombre posible de cada columna: la clave interna, el título en cada idioma y sus variantes. */
function diccionario(): Diccionario {
  const nombres: Diccionario['nombres'] = new Map();
  const sumar = (texto: string, columna: Columna, como: 'plantilla' | 'variante') => {
    const clave = normalizarEncabezado(texto);
    if (clave && !nombres.has(clave)) nombres.set(clave, { columna, como });
  };
  for (const columna of COLUMNAS) {
    sumar(columna, columna, 'plantilla');
    for (const idioma of ['es', 'en']) {
      const titulo = enIdioma(idioma, () =>
        t(`servidor.importacion.columnas.${columna}`, { unidad: '' }),
      );
      sumar(titulo, columna, 'plantilla');
    }
  }
  for (const columna of COLUMNAS) {
    for (const variante of VARIANTES[columna]) sumar(variante, columna, 'variante');
  }
  return { nombres };
}

/** Distancia de edición (Levenshtein) con tope: si pasa de `tope`, devuelve tope + 1. */
function distancia(a: string, b: string, tope: number): number {
  if (Math.abs(a.length - b.length) > tope) return tope + 1;
  let previa = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const actual = [i];
    let minimo = i;
    for (let j = 1; j <= b.length; j++) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1;
      actual[j] = Math.min(previa[j] + 1, actual[j - 1] + 1, previa[j - 1] + costo);
      minimo = Math.min(minimo, actual[j]);
    }
    if (minimo > tope) return tope + 1;
    previa = actual;
  }
  return previa[b.length];
}

/**
 * HU-41, criterio 2 · El campo que corresponde a un encabezado, o null.
 *   1. Igual a un nombre conocido (plantilla o variante).
 *   2. Sin la unidad de peso pegada ("Peso_kg", "Weight lbs").
 *   3. Con un error de tipeo (1 letra; 2 si el nombre es largo), siempre
 *      que no haya dos campos igual de cerca: ante la duda, se pregunta.
 */
export function reconocer(
  encabezado: unknown,
  dic: Diccionario = diccionario(),
): { columna: Columna; como: 'plantilla' | 'variante' } | null {
  const clave = normalizarEncabezado(encabezado);
  if (!clave) return null;
  const exacto = dic.nombres.get(clave);
  if (exacto) return exacto;

  const sinUnidad = clave.replace(/\b(kg|kgs|kilos|lb|lbs|libras|pounds)\b/g, '').replace(/\s+/g, ' ').trim();
  if (sinUnidad && sinUnidad !== clave) {
    const encontrado = dic.nombres.get(sinUnidad);
    if (encontrado?.columna === 'peso') return { columna: 'peso', como: 'variante' };
  }

  if (clave.length < 4) return null;
  const tope = clave.length >= 9 ? 2 : 1;
  let mejor: { columna: Columna; d: number } | null = null;
  let empate = false;
  for (const [nombre, { columna }] of dic.nombres) {
    if (nombre.length < 4) continue;
    const d = distancia(clave, nombre, tope);
    if (d > tope) continue;
    if (!mejor || d < mejor.d) {
      mejor = { columna, d };
      empate = false;
    } else if (d === mejor.d && columna !== mejor.columna) {
      empate = true;
    }
  }
  return mejor && !empate ? { columna: mejor.columna, como: 'variante' } : null;
}

/** El peso viene en libras si el encabezado lo dice: "Peso (lb)", "Weight lbs", "Libras". */
function pesoEnLibras(encabezado: unknown): boolean {
  return /\b(lb|lbs|libras?|pounds?)\b/i.test(normalizar(String(encabezado ?? '').replace(/[()]/g, ' ')))
    || /\(\s*lb/i.test(String(encabezado ?? ''));
}

export async function leerArchivo(
  nombreArchivo: unknown,
  base64: unknown,
  asignaciones?: unknown,
): Promise<ArchivoLeido> {
  if (typeof base64 !== 'string' || !base64) {
    throw new BadRequestException(t('servidor.importacion.sinContenido'));
  }
  const datos = Buffer.from(base64, 'base64');
  if (datos.length === 0) throw new BadRequestException(t('servidor.importacion.sinContenido'));
  if (datos.length > MAXIMO_BYTES) throw new BadRequestException(t('servidor.importacion.muyGrande'));

  // HU-41, criterio 1: Excel o CSV. Se decide por la extensión.
  const nombre = String(nombreArchivo ?? '').toLowerCase();
  if (!nombre.endsWith('.csv') && !nombre.endsWith('.xlsx')) {
    throw new BadRequestException(t('servidor.importacion.extensionInvalida'));
  }
  const tabla = nombre.endsWith('.csv') ? leerCsv(datos) : await leerExcel(datos);
  return armarFilas(tabla, validarAsignaciones(asignaciones));
}

/** Celdas en crudo: la primera fila es el encabezado. */
type Tabla = Valor[][];

async function leerExcel(datos: Buffer): Promise<Tabla> {
  const libro = new ExcelJS.Workbook();
  try {
    await libro.xlsx.load(datos as unknown as ArrayBuffer);
  } catch {
    throw new BadRequestException(t('servidor.importacion.formatoInvalido'));
  }
  const hoja = libro.worksheets[0];
  if (!hoja) throw new BadRequestException(t('servidor.importacion.sinFilas'));

  const tabla: Tabla = [];
  hoja.eachRow({ includeEmpty: true }, (fila, numero) => {
    const celdas: Valor[] = [];
    fila.eachCell({ includeEmpty: true }, (celda, columna) => {
      celdas[columna - 1] = valorDeCelda(celda.value);
    });
    tabla[numero - 1] = celdas;
  });
  return tabla;
}

function valorDeCelda(valor: ExcelJS.CellValue): Valor {
  if (valor === null || valor === undefined) return null;
  if (valor instanceof Date || typeof valor === 'number' || typeof valor === 'string') return valor;
  if (typeof valor === 'boolean') return String(valor);
  if (typeof valor === 'object') {
    // Fórmulas, texto con formato e hipervínculos: interesa lo que se ve.
    if ('result' in valor) return valorDeCelda(valor.result as ExcelJS.CellValue);
    if ('richText' in valor) return valor.richText.map((parte) => parte.text).join('');
    if ('text' in valor) return String(valor.text);
  }
  return String(valor);
}

/** CSV con coma o punto y coma (Excel en español guarda con punto y coma) y comillas. */
function leerCsv(datos: Buffer): Tabla {
  const texto = datos.toString('utf8').replace(/^﻿/, '');
  const primera = texto.split(/\r?\n/, 1)[0] ?? '';
  const separador = (primera.match(/;/g)?.length ?? 0) > (primera.match(/,/g)?.length ?? 0) ? ';' : ',';

  const tabla: Tabla = [];
  let fila: Valor[] = [];
  let campo = '';
  let entreComillas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (entreComillas) {
      if (c === '"' && texto[i + 1] === '"') {
        campo += '"';
        i++;
      } else if (c === '"') {
        entreComillas = false;
      } else {
        campo += c;
      }
    } else if (c === '"') {
      entreComillas = true;
    } else if (c === separador) {
      fila.push(campo);
      campo = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i++;
      fila.push(campo);
      tabla.push(fila);
      fila = [];
      campo = '';
    } else {
      campo += c;
    }
  }
  if (campo !== '' || fila.length > 0) {
    fila.push(campo);
    tabla.push(fila);
  }
  return tabla;
}

function vacia(fila: Valor[] | undefined): boolean {
  return !fila || fila.every((celda) => celda === null || String(celda).trim() === '');
}

/** HU-42 · { posición: campo | 'ignorar' }. Lo que no sea eso es un 400, no se adivina. */
function validarAsignaciones(asignaciones: unknown): Map<number, Columna | typeof IGNORAR> {
  const resultado = new Map<number, Columna | typeof IGNORAR>();
  if (asignaciones === undefined || asignaciones === null) return resultado;
  if (typeof asignaciones !== 'object' || Array.isArray(asignaciones)) {
    throw new BadRequestException(t('servidor.importacion.asignacionInvalida'));
  }
  for (const [posicion, campo] of Object.entries(asignaciones as Record<string, unknown>)) {
    const numero = Number(posicion);
    if (!Number.isInteger(numero) || numero < 0) {
      throw new BadRequestException(t('servidor.importacion.asignacionInvalida'));
    }
    if (campo === '' || campo === null || campo === undefined) continue;
    if (campo !== IGNORAR && !COLUMNAS.includes(campo as Columna)) {
      throw new BadRequestException(t('servidor.importacion.asignacionInvalida'));
    }
    resultado.set(numero, campo as Columna | typeof IGNORAR);
  }
  return resultado;
}

function titulo(columna: Columna): string {
  return t(`servidor.importacion.columnas.${columna}`, { unidad: '' }).replace(/\(\s*\)/, '').trim();
}

function armarFilas(tabla: Tabla, asignaciones: Map<number, Columna | typeof IGNORAR>): ArchivoLeido {
  const encabezado = tabla[0];
  if (vacia(encabezado)) throw new BadRequestException(t('servidor.importacion.sinFilas'));

  // HU-41: primero lo que se reconoce solo. Si dos columnas parecen el mismo
  // campo, se queda la primera y la otra se pregunta (HU-42).
  const dic = diccionario();
  const columnas: ColumnaDelArchivo[] = [];
  const posiciones = new Map<Columna, number>();
  let unidadPeso: 'kg' | 'lb' = 'kg';
  encabezado.forEach((celda, posicion) => {
    const textoEncabezado = celda === null || celda === undefined ? '' : String(celda).trim();
    if (!textoEncabezado) return;
    const reconocida = reconocer(textoEncabezado, dic);
    if (reconocida && !posiciones.has(reconocida.columna)) {
      posiciones.set(reconocida.columna, posicion);
      columnas.push({ posicion, encabezado: textoEncabezado, campo: reconocida.columna, como: reconocida.como });
    } else {
      columnas.push({ posicion, encabezado: textoEncabezado, campo: null, como: null });
    }
  });

  // HU-42: lo que eligió el usuario, solo para las que no se reconocieron.
  for (const columna of columnas) {
    if (columna.campo !== null) continue;
    const elegida = asignaciones.get(columna.posicion);
    if (!elegida) continue;
    if (elegida === IGNORAR) {
      columna.como = 'ignorada';
      continue;
    }
    const ocupada = posiciones.get(elegida);
    if (ocupada !== undefined) {
      const otra = columnas.find((c) => c.posicion === ocupada);
      throw new BadRequestException(
        t('servidor.importacion.campoYaAsignado', {
          campo: titulo(elegida),
          columna: otra?.encabezado ?? '',
        }),
      );
    }
    posiciones.set(elegida, columna.posicion);
    columna.campo = elegida;
    columna.como = 'manual';
  }

  const columnaPeso = columnas.find((c) => c.campo === 'peso');
  if (columnaPeso && pesoEnLibras(columnaPeso.encabezado)) unidadPeso = 'lb';

  const faltan = OBLIGATORIAS.filter((columna) => !posiciones.has(columna));

  const filas: FilaLeida[] = [];
  for (let i = 1; i < tabla.length; i++) {
    if (vacia(tabla[i])) continue;
    const valores: FilaLeida['valores'] = {};
    for (const [columna, posicion] of posiciones) {
      const valor = tabla[i][posicion] ?? null;
      valores[columna] = typeof valor === 'string' ? valor.trim() || null : valor;
    }
    filas.push({ fila: i + 1, valores });
  }

  if (filas.length === 0) throw new BadRequestException(t('servidor.importacion.sinFilas'));
  // HU-41, criterio 4.
  if (filas.length > MAXIMO_FILAS) {
    throw new BadRequestException(t('servidor.importacion.demasiadasFilas', { n: MAXIMO_FILAS }));
  }
  return { filas, unidadPeso, columnas, faltan };
}

/** Los títulos de las columnas que faltan, para el mensaje de error. */
export function titulosDe(columnas: readonly Columna[]): string {
  return columnas.map(titulo).join(', ');
}
