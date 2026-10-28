import { existe, t } from '../../servicios/idioma';

/**
 * El nombre de una raza en el idioma de la pantalla. Se guarda el código de
 * la lista fija; un animal registrado antes de la lista puede tener un texto
 * libre, y ese se muestra tal cual.
 */
export function nombreRaza(raza: string | null | undefined): string | null {
  if (!raza) return null;
  const clave = `animales.razas.${raza}`;
  return existe(clave) ? t(clave) : raza;
}
