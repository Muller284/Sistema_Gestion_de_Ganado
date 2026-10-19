import type { ErrorDeFila, FilaRepetida } from './api';

/**
 * HU-43 · Lo que la pantalla de importación necesita y no depende de React:
 * leer el archivo elegido y armar el informe de errores para descargar.
 */

/** Los tipos de archivo que acepta el servidor. */
export const ARCHIVOS_ACEPTADOS =
  '.xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv';

/** El contenido del archivo en base64, que es como viaja al servidor. */
export async function aBase64(archivo: Blob): Promise<string> {
  const bytes = new Uint8Array(await archivo.arrayBuffer());
  let binario = '';
  const tramo = 0x8000;
  for (let i = 0; i < bytes.length; i += tramo) {
    binario += String.fromCharCode(...bytes.subarray(i, i + tramo));
  }
  return btoa(binario);
}

export interface TitulosInforme {
  fila: string;
  identificador: string;
  motivo: string;
  /** El motivo de una fila repetida, según dónde estaba repetida. */
  repetidaEnArchivo: string;
  repetidaEnRancho: string;
}

/** Marca de orden de bytes: sin ella Excel abre el CSV sin los acentos. */
const BOM = String.fromCharCode(0xfeff);
/** Excel espera fin de linea de Windows. */
const SALTO = String.fromCharCode(13, 10);

/** Una celda de CSV: entre comillas si hace falta, con las comillas duplicadas. */
function celda(valor: string | number | null): string {
  const texto = valor === null ? '' : String(valor);
  return /[",;\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

/**
 * HU-43, criterio 3: el detalle de errores con número de fila y motivo, para
 * descargar. Suma las repetidas, que tampoco se cargan (o se actualizan).
 * Lleva BOM para que Excel lo abra con los acentos bien.
 */
export function informeDeErrores(
  errores: ErrorDeFila[],
  repetidas: FilaRepetida[],
  titulos: TitulosInforme,
): string {
  const filas: (string | number | null)[][] = [
    ...errores.map((e) => [e.fila, e.identificador, e.motivo]),
    ...repetidas.map((r) => [
      r.fila,
      r.identificador,
      r.en === 'archivo' ? titulos.repetidaEnArchivo : titulos.repetidaEnRancho,
    ]),
  ].sort((a, b) => Number(a[0]) - Number(b[0]));
  const lineas = [[titulos.fila, titulos.identificador, titulos.motivo], ...filas].map((fila) =>
    fila.map(celda).join(','),
  );
  return `${BOM}${lineas.join(SALTO)}${SALTO}`;
}
