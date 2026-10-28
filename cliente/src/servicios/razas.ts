/**
 * HU-28 · La raza se elige de una lista (pedido del docente: son pocas y así
 * no se escriben de mil maneras). Si no está, se elige «Otra» y se escribe.
 *
 * Son las razas bovinas más comunes en Bolivia, de carne, de leche y doble
 * propósito, en orden alfabético. Se guardan con estos nombres: son nombres
 * propios y no se traducen. Para sumar una, se agrega acá.
 */
export const RAZAS = [
  'Angus',
  'Braford',
  'Brahman',
  'Brangus',
  'Charolais',
  'Criollo',
  'Girolando',
  'Guzerá',
  'Gyr',
  'Hereford',
  'Holstein',
  'Indubrasil',
  'Jersey',
  'Limousin',
  'Mestizo',
  'Nelore',
  'Pardo Suizo',
  'Senepol',
  'Simmental',
  'Tabapuã',
] as const;

/** El valor de la lista para «Otra». */
export const OTRA_RAZA = 'otra';

/**
 * Cómo se muestra en el formulario una raza ya guardada: si está en la lista
 * se elige ella; si no, queda en «Otra» con el texto escrito.
 */
export function razaEnFormulario(raza: string | null | undefined): { opcion: string; otra: string } {
  if (!raza) return { opcion: '', otra: '' };
  const conocida = RAZAS.find((r) => r.toLowerCase() === raza.trim().toLowerCase());
  return conocida ? { opcion: conocida, otra: '' } : { opcion: OTRA_RAZA, otra: raza };
}

/** Lo que se guarda: la elegida, lo escrito en «Otra», o nada. */
export function razaAGuardar(opcion: string, otra: string): string | null {
  if (opcion === OTRA_RAZA) return otra.trim() || null;
  return opcion || null;
}
