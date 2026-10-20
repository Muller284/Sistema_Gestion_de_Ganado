import type {
  AsignacionesColumnas,
  ColumnaDelArchivo,
  ColumnaImportacion,
  ErrorDeFila,
  FilaRepetida,
} from './api';

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

// ---------------------------------------------------------------------------
// HU-41 y HU-42 · Columnas reconocidas y asignación manual (Brian)
// ---------------------------------------------------------------------------

/** Las que el archivo tiene que traer sí o sí. Las mismas que exige el servidor. */
export const COLUMNAS_OBLIGATORIAS: readonly ColumnaImportacion[] = ['identificador', 'sexo'];

/** HU-42, criterio 1: solo se piden las columnas que el sistema no reconoció. */
export function noReconocidas(columnas: ColumnaDelArchivo[]): ColumnaDelArchivo[] {
  return columnas.filter((columna) => columna.campo === null && columna.como !== 'ignorada');
}

/** Las que se reconocieron solas (por la plantilla o por una variante). */
export function reconocidas(columnas: ColumnaDelArchivo[]): ColumnaDelArchivo[] {
  return columnas.filter((columna) => columna.como === 'plantilla' || columna.como === 'variante');
}

/** Los campos que ya tienen columna: los reconocidos más los elegidos a mano. */
function camposOcupados(columnas: ColumnaDelArchivo[], asignaciones: AsignacionesColumnas): Set<ColumnaImportacion> {
  const ocupados = new Set<ColumnaImportacion>();
  for (const columna of reconocidas(columnas)) if (columna.campo) ocupados.add(columna.campo);
  for (const valor of Object.values(asignaciones)) if (valor && valor !== 'ignorar') ocupados.add(valor);
  return ocupados;
}

/**
 * HU-42, criterio 2: los campos que se pueden elegir para una columna en la
 * lista desplegable. Un campo ya tomado por otra columna no se ofrece; el que
 * tiene elegido esta misma columna, sí.
 */
export function camposDisponibles(
  todos: readonly ColumnaImportacion[],
  columnas: ColumnaDelArchivo[],
  asignaciones: AsignacionesColumnas,
  posicion: number,
): ColumnaImportacion[] {
  const ocupados = camposOcupados(columnas, asignaciones);
  const propio = asignaciones[String(posicion)];
  return todos.filter((campo) => !ocupados.has(campo) || campo === propio);
}

/** Obligatorias que todavía no tienen ninguna columna del archivo. */
export function obligatoriasSinAsignar(
  columnas: ColumnaDelArchivo[],
  asignaciones: AsignacionesColumnas,
): ColumnaImportacion[] {
  const ocupados = camposOcupados(columnas, asignaciones);
  return COLUMNAS_OBLIGATORIAS.filter((campo) => !ocupados.has(campo));
}

/** Columnas no reconocidas sobre las que todavía no se decidió nada (ni campo ni ignorar). */
export function sinDecidir(columnas: ColumnaDelArchivo[], asignaciones: AsignacionesColumnas): ColumnaDelArchivo[] {
  return noReconocidas(columnas).filter((columna) => !asignaciones[String(columna.posicion)]);
}

/** Se puede seguir a la vista previa cuando todo está decidido y no falta ninguna obligatoria. */
export function columnasListas(columnas: ColumnaDelArchivo[], asignaciones: AsignacionesColumnas): boolean {
  return sinDecidir(columnas, asignaciones).length === 0 && obligatoriasSinAsignar(columnas, asignaciones).length === 0;
}

/** Solo lo que corresponde a columnas no reconocidas: lo demás el servidor lo ignora igual. */
export function limpiarAsignaciones(
  columnas: ColumnaDelArchivo[],
  asignaciones: AsignacionesColumnas,
): AsignacionesColumnas {
  const validas = new Set(noReconocidas(columnas).map((columna) => String(columna.posicion)));
  return Object.fromEntries(Object.entries(asignaciones).filter(([posicion, valor]) => validas.has(posicion) && valor));
}
