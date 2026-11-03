/**
 * Carga animal en la pantalla de corrales (pedido del docente sobre HU-36).
 *
 * Cuántos animales caben por hectárea lo decide el servidor según el tipo de
 * producción del rancho (GET /corrales/carga, servidor/src/comun/carga-animal.ts).
 * Acá solo se hace la misma cuenta para mostrar el límite mientras se escribe
 * y no dejar guardar de más. El servidor lo vuelve a controlar.
 */

/** El máximo de animales para una superficie en hectáreas. Nunca menos de 1. */
export function limitePorSuperficie(superficieHa: number, animalesPorHectarea: number): number {
  return Math.max(1, Math.floor(superficieHa * animalesPorHectarea + 1e-9));
}

export type ErrorCorral = 'capacidadInvalida' | 'superficieInvalida' | 'capacidadExcedida' | null;

/**
 * Lo que está mal en lo escrito, o nulo si se puede guardar. Vacío es "no se
 * cargó"; cero, negativo o con decimales en la capacidad, no.
 */
export function revisarCorral(
  capacidad: string,
  superficieHa: number | null,
  animalesPorHectarea: number | null,
): ErrorCorral {
  if (capacidad !== '') {
    const numero = Number(capacidad);
    if (!Number.isInteger(numero) || numero <= 0) return 'capacidadInvalida';
  }
  if (superficieHa !== null && !(superficieHa > 0)) return 'superficieInvalida';
  if (capacidad !== '' && superficieHa !== null && animalesPorHectarea !== null) {
    if (Number(capacidad) > limitePorSuperficie(superficieHa, animalesPorHectarea)) {
      return 'capacidadExcedida';
    }
  }
  return null;
}
