/**
 * Carga animal: cuántos animales caben, como máximo, en una superficie.
 *
 * Pedido del docente sobre HU-36: la capacidad de un corral no puede ser
 * mayor que lo que admite su superficie. La carga depende del tipo de
 * producción del rancho (lo elige el propietario al crearlo, HU-15):
 *
 *   carne   1 animal por hectárea    pasto natural, la carga habitual en Bolivia
 *   leche   2 animales por hectárea  pasto mejorado y suplemento: más intensivo
 *   mixto   1,5 animales por hectárea
 *
 * Si el equipo o el docente fijan otros valores, se cambian SOLO acá: el
 * servidor valida con esta tabla y la pantalla la pide por GET /corrales/carga.
 */

export type TipoProduccion = 'carne' | 'leche' | 'mixto';

export const ANIMALES_POR_HECTAREA: Record<TipoProduccion, number> = {
  carne: 1,
  leche: 2,
  mixto: 1.5,
};

export function cargaPorHectarea(tipo: string | null | undefined): number {
  return ANIMALES_POR_HECTAREA[tipo as TipoProduccion] ?? ANIMALES_POR_HECTAREA.carne;
}

/**
 * El máximo de animales para una superficie en hectáreas. Nunca menos de 1:
 * un corral chico igual puede tener un animal.
 */
export function limitePorSuperficie(superficieHa: number, tipo: string | null | undefined): number {
  return Math.max(1, Math.floor(superficieHa * cargaPorHectarea(tipo) + 1e-9));
}
