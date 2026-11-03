/**
 * HU-28 · La clave de una raza: sin mayúsculas, sin acentos y sin espacios de
 * más. Con ella «nelore», «NELORE» y «Nelóre» son la misma raza.
 *
 * Es la misma regla que usa la migración 009 para la columna razas.clave: si
 * se cambia acá, hay que cambiarla allá.
 */
export function claveDeRaza(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** El nombre limpio para guardar una raza nueva: sin espacios de más. */
export function nombreDeRaza(nombre: string): string {
  return nombre.replace(/\s+/g, ' ').trim();
}
