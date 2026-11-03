import type { Raza } from './api';

/**
 * HU-28 · La raza se elige de una lista (pedido del docente). La lista la
 * manda el servidor (GET /animales/razas, tabla razas de la migración 009):
 * el catálogo mundial, agrupado en carne, leche y doble propósito, más las
 * razas propias del rancho.
 *
 * El campo es un buscador: lo escrito filtra la lista por cualquier parte del
 * nombre, sin importar mayúsculas ni acentos. Si lo escrito no está, se
 * guarda como raza nueva (lo que antes era «Otra») y el servidor la deja en
 * la lista de ese rancho.
 */

export type GrupoRaza = 'carne' | 'leche' | 'doble' | 'propias';

/** El orden en que se muestran los grupos. */
const ORDEN_GRUPOS: GrupoRaza[] = ['carne', 'leche', 'doble', 'propias'];

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

/** Las razas que contienen lo escrito, agrupadas. Sin texto, todas. */
export function buscarRazas(razas: Raza[], texto: string): { grupo: GrupoRaza; razas: string[] }[] {
  const buscada = claveDeRaza(texto);
  return agruparRazas(razas.filter((r) => claveDeRaza(r.nombre).includes(buscada)));
}

/** La raza de la lista que es lo escrito (aunque cambien mayúsculas o acentos). */
export function razaConocida(razas: Raza[], texto: string): Raza | undefined {
  const clave = claveDeRaza(texto);
  return clave ? razas.find((r) => claveDeRaza(r.nombre) === clave) : undefined;
}

/** Lo escrito no está en la lista: se guardará como raza nueva del rancho. */
export function esRazaNueva(razas: Raza[], texto: string): boolean {
  return claveDeRaza(texto) !== '' && !razaConocida(razas, texto);
}

/** Lo que se manda: el nombre de la lista si la conoce, si no lo escrito, o nada. */
export function razaAGuardar(razas: Raza[], texto: string): string | null {
  return razaConocida(razas, texto)?.nombre ?? (texto.replace(/\s+/g, ' ').trim() || null);
}
