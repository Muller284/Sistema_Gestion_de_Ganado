import type { Raza } from './api';

/**
 * HU-28 · La raza se elige de una lista (pedido del docente). La lista la
 * manda el servidor (GET /animales/razas, tabla razas de la migración 009):
 * el catálogo mundial, agrupado en carne, leche y doble propósito, más las
 * razas propias del rancho, que son las que alguien escribió en «Otra».
 *
 * Si en «Otra» se escribe una raza que ya existe, el servidor la reconoce sin
 * importar mayúsculas ni acentos y la guarda como en la lista; si es nueva,
 * queda en la lista de ese rancho.
 */

export type GrupoRaza = 'carne' | 'leche' | 'doble' | 'propias';

/** El orden en que se muestran los grupos. */
const ORDEN_GRUPOS: GrupoRaza[] = ['carne', 'leche', 'doble', 'propias'];

/** El valor de la lista para «Otra». */
export const OTRA_RAZA = 'otra';

/** Sin mayúsculas, sin acentos y sin espacios de más (la misma regla que el servidor). */
export function claveDeRaza(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Las razas en sus grupos, en orden. Los grupos vacíos no aparecen. */
export function agruparRazas(razas: Raza[]): { grupo: GrupoRaza; razas: string[] }[] {
  return ORDEN_GRUPOS.map((grupo) => ({
    grupo,
    razas: razas.filter((r) => (r.grupo ?? 'propias') === grupo).map((r) => r.nombre),
  })).filter((g) => g.razas.length > 0);
}

/**
 * Cómo se muestra en el formulario una raza ya guardada: si está en la lista
 * se elige ella; si no, queda en «Otra» con el texto escrito.
 */
export function razaEnFormulario(
  raza: string | null | undefined,
  razas: Raza[],
): { opcion: string; otra: string } {
  if (!raza) return { opcion: '', otra: '' };
  const conocida = razas.find((r) => claveDeRaza(r.nombre) === claveDeRaza(raza));
  return conocida ? { opcion: conocida.nombre, otra: '' } : { opcion: OTRA_RAZA, otra: raza };
}

/** Lo que se manda: la elegida, lo escrito en «Otra», o nada. */
export function razaAGuardar(opcion: string, otra: string): string | null {
  if (opcion === OTRA_RAZA) return otra.trim() || null;
  return opcion || null;
}
