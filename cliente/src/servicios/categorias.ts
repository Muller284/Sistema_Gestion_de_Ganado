import type { ReglaCategoria } from './api';

/**
 * HU-28 · Qué categorías se pueden elegir según el sexo y la edad.
 *
 * Las reglas las manda el servidor (GET /animales/categorias/reglas, tabla en
 * servidor/src/comun/categorias-animal.ts). Acá solo se filtra la lista para
 * no ofrecer «vaca» a un animal que nació hoy. El servidor lo vuelve a
 * controlar.
 */

/** Meses cumplidos entre dos fechas AAAA-MM-DD (la misma cuenta que el servidor). */
export function mesesCumplidos(nacimiento: string, hoy: string): number {
  const [an, mn, dn] = nacimiento.split('-').map(Number);
  const [ah, mh, dh] = hoy.split('-').map(Number);
  return (ah - an) * 12 + (mh - mn) - (dh < dn ? 1 : 0);
}

/**
 * Las categorías del catálogo que corresponden. Sin sexo no se filtra por
 * sexo; sin fecha, no se filtra por edad. Una categoría sin regla se ofrece
 * siempre.
 */
export function categoriasPermitidas(
  catalogo: string[],
  reglas: ReglaCategoria[],
  sexo: string,
  nacimiento: string,
  hoy: string,
): string[] {
  const meses = nacimiento ? mesesCumplidos(nacimiento, hoy) : null;
  return catalogo.filter((codigo) => {
    const regla = reglas.find((r) => r.codigo === codigo);
    if (!regla) return true;
    if (sexo && regla.sexo !== sexo) return false;
    if (meses !== null) {
      if (meses < regla.edad_minima_meses) return false;
      if (regla.edad_maxima_meses !== null && meses > regla.edad_maxima_meses) return false;
    }
    return true;
  });
}
