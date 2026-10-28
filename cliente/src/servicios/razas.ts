/**
 * HU-28 · La raza se elige de una lista (pedido del docente: son pocas y así
 * no se escriben de mil maneras). Si no está, se elige «Otra» y se escribe.
 *
 * Son las razas bovinas más difundidas en el mundo, agrupadas por propósito
 * para encontrarlas rápido. El sistema no es solo para Bolivia, así que van
 * las de América, Europa, África, India y Oceanía. Se guardan con estos
 * nombres, que son nombres propios y no se traducen. Para sumar una, se
 * agrega en su grupo.
 */

export type GrupoRaza = 'carne' | 'leche' | 'doble';

export const GRUPOS_RAZAS: { grupo: GrupoRaza; razas: string[] }[] = [
  {
    grupo: 'carne',
    razas: [
      'Angus',
      'Azul Belga',
      'Beefmaster',
      'Bonsmara',
      'Braford',
      'Brahman',
      'Brangus',
      'Charolais',
      'Chianina',
      'Droughtmaster',
      'Galloway',
      'Hereford',
      'Highland',
      'Indubrasil',
      'Limousin',
      'Marchigiana',
      'Murray Grey',
      'Nelore',
      'Piamontesa',
      'Red Angus',
      'Romosinuano',
      'Rubia de Aquitania',
      'Santa Gertrudis',
      'Senepol',
      'Shorthorn',
      'Simbrah',
      'Tabapuã',
      'Wagyu',
    ],
  },
  {
    grupo: 'leche',
    razas: [
      'Ayrshire',
      'Girolando',
      'Guernsey',
      'Holstein',
      'Jersey',
      'Montbéliarde',
      'Pardo Suizo',
      'Red Sindhi',
      'Sahiwal',
    ],
  },
  {
    grupo: 'doble',
    razas: ['Criollo', 'Fleckvieh', 'Guzerá', 'Gyr', 'Mestizo', 'Normando', 'Red Poll', 'Simmental'],
  },
];

/** Todas, en una sola lista. */
export const RAZAS: string[] = GRUPOS_RAZAS.flatMap((g) => g.razas);

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
