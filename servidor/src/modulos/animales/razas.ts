/**
 * El catálogo de razas bovinas (raza como lista fija, Sprint 3).
 *
 * Se guarda el código y cada pantalla muestra el nombre en su idioma
 * (animales.razas.<código> en idiomas/). Las razas son las más comunes en
 * los países del sistema, sobre todo en Bolivia, donde el Nelore y sus
 * cruzas son la mayoría del hato de carne, y en Estados Unidos. Están
 * agrupadas como las agrupa la zootecnia: cebuinas, británicas,
 * continentales, lecheras, compuestas y criollas.
 *
 * "cruza" es para el animal mestizo y "otra" para una raza que no está en la
 * lista: un rancho real siempre tiene alguno de los dos.
 *
 * Los animales registrados antes de la lista pueden tener un texto libre en
 * raza. Se siguen mostrando tal cual y se pueden editar sin tocar la raza;
 * solo al cambiarla hay que elegir una de la lista.
 */
export const GRUPOS_RAZAS = {
  cebuinas: ['nelore', 'nelore_mocho', 'brahman', 'gyr', 'guzera', 'indubrasil', 'tabapua', 'sindi'],
  britanicas: ['angus', 'red_angus', 'hereford', 'shorthorn', 'devon'],
  continentales: ['charolais', 'limousin', 'simmental', 'braunvieh', 'gelbvieh', 'chianina', 'blonde'],
  lecheras: ['holstein', 'jersey', 'pardo_suizo', 'girolando', 'guernsey', 'ayrshire', 'normando'],
  compuestas: [
    'brangus',
    'braford',
    'santa_gertrudis',
    'simbrah',
    'senepol',
    'beefmaster',
    'bonsmara',
    'canchim',
    'charbray',
  ],
  criollas: [
    'criollo',
    'criollo_yacumeno',
    'criollo_saavedreno',
    'criollo_chaqueno',
    'criollo_argentino',
    'romosinuano',
    'blanco_orejinegro',
    'caracu',
    'texas_longhorn',
  ],
  otras: ['cruza', 'otra'],
} as const;

export type GrupoRaza = keyof typeof GRUPOS_RAZAS;

export const RAZAS: readonly string[] = Object.values(GRUPOS_RAZAS).flat();

export function esRaza(valor: string): boolean {
  return RAZAS.includes(valor);
}

/** Para GET /animales/razas: los grupos en orden, cada uno con sus códigos. */
export function catalogoRazas(): { grupo: GrupoRaza; razas: string[] }[] {
  return (Object.keys(GRUPOS_RAZAS) as GrupoRaza[]).map((grupo) => ({
    grupo,
    razas: [...GRUPOS_RAZAS[grupo]],
  }));
}
