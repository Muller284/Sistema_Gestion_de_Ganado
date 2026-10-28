import { BadRequestException } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { enIdioma, t } from '../../comun/idioma';

/**
 * Lee el archivo que sube el propietario (Excel o CSV) y lo deja como filas
 * con las columnas de la plantilla (HU-40).
 *
 * Reconoce los encabezados de la plantilla en español y en inglés, sin
 * importar mayúsculas, acentos ni la unidad entre paréntesis. Reconocer
 * columnas con OTROS nombres es HU-41 (Brian): cuando llegue, se suma acá
 * y el resto de la importación no cambia.
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

export interface ArchivoLeido {
  filas: FilaLeida[];
  /** Unidad del peso que dice el encabezado; si no dice, kilos. */
  unidadPeso: 'kg' | 'lb';
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

/** Cada nombre posible de cada columna: la clave interna y el título en cada idioma. */
function nombresDeColumnas(): Map<string, Columna> {
  const nombres = new Map<string, Columna>();
  for (const columna of COLUMNAS) {
    nombres.set(normalizar(columna), columna);
    for (const idioma of ['es', 'en']) {
      const titulo = enIdioma(idioma, () =>
        t(`servidor.importacion.columnas.${columna}`, { unidad: '' }),
      );
      nombres.set(normalizar(titulo), columna);
    }
  }
  return nombres;
}

export async function leerArchivo(nombreArchivo: unknown, base64: unknown): Promise<ArchivoLeido> {
  if (typeof base64 !== 'string' || !base64) {
    throw new BadRequestException(t('servidor.importacion.sinContenido'));
  }
  const datos = Buffer.from(base64, 'base64');
  if (datos.length === 0) throw new BadRequestException(t('servidor.importacion.sinContenido'));
  if (datos.length > MAXIMO_BYTES) throw new BadRequestException(t('servidor.importacion.muyGrande'));

  const nombre = String(nombreArchivo ?? '').toLowerCase();
  const tabla = nombre.endsWith('.csv') ? leerCsv(datos) : await leerExcel(datos);
  return armarFilas(tabla);
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

function armarFilas(tabla: Tabla): ArchivoLeido {
  const encabezado = tabla[0];
  if (vacia(encabezado)) throw new BadRequestException(t('servidor.importacion.sinFilas'));

  const nombres = nombresDeColumnas();
  const posiciones = new Map<Columna, number>();
  let unidadPeso: 'kg' | 'lb' = 'kg';
  encabezado.forEach((titulo, posicion) => {
    const columna = nombres.get(normalizar(titulo));
    if (columna && !posiciones.has(columna)) posiciones.set(columna, posicion);
    if (columna === 'peso' && /\(\s*lb/i.test(String(titulo))) unidadPeso = 'lb';
  });

  const faltan = (['identificador', 'sexo', 'categoria'] as Columna[]).filter((columna) => !posiciones.has(columna));
  if (faltan.length > 0) {
    throw new BadRequestException(
      t('servidor.importacion.faltanColumnas', {
        columnas: faltan.map((c) => t(`servidor.importacion.columnas.${c}`, { unidad: '' }).trim()).join(', '),
      }),
    );
  }

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
  if (filas.length > MAXIMO_FILAS) {
    throw new BadRequestException(t('servidor.importacion.demasiadasFilas', { n: MAXIMO_FILAS }));
  }
  return { filas, unidadPeso };
}
