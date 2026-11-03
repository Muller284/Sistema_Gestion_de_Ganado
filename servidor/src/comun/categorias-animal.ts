/**
 * HU-28 · Qué categoría puede tener un animal según su sexo y su edad.
 *
 * Pedido del docente: si el animal nació hoy no puede ser «vaca» ni «toro», y
 * una hembra no puede ser «novillo». La edad sale de la fecha de nacimiento;
 * sin fecha, se controla solo el sexo.
 *
 *   ternero  macho   hasta 12 meses     ternera   hembra  hasta 12 meses
 *   torito   macho   de 8 a 30 meses    vaquilla  hembra  de 8 a 36 meses
 *   novillo  macho   desde 8 meses      vaca      hembra  desde 18 meses
 *   toro     macho   desde 18 meses
 *   buey     macho   desde 30 meses
 *
 * Los rangos se pisan a propósito: un animal de 10 meses puede seguir
 * anotado como ternero o ya como torito. Si el equipo fija otros límites, se
 * cambian SOLO acá: el servidor valida con esta tabla y la pantalla la pide por
 * GET /animales/categorias/reglas.
 */

import { t } from './idioma';

export interface ReglaCategoria {
  codigo: string;
  sexo: 'macho' | 'hembra';
  /** Edad mínima en meses cumplidos. */
  edad_minima_meses: number;
  /** Edad máxima en meses cumplidos; nulo es sin tope. */
  edad_maxima_meses: number | null;
}

export const REGLAS_CATEGORIAS: ReglaCategoria[] = [
  { codigo: 'ternero', sexo: 'macho', edad_minima_meses: 0, edad_maxima_meses: 12 },
  { codigo: 'ternera', sexo: 'hembra', edad_minima_meses: 0, edad_maxima_meses: 12 },
  { codigo: 'torito', sexo: 'macho', edad_minima_meses: 8, edad_maxima_meses: 30 },
  { codigo: 'vaquilla', sexo: 'hembra', edad_minima_meses: 8, edad_maxima_meses: 36 },
  { codigo: 'novillo', sexo: 'macho', edad_minima_meses: 8, edad_maxima_meses: null },
  { codigo: 'vaca', sexo: 'hembra', edad_minima_meses: 18, edad_maxima_meses: null },
  { codigo: 'toro', sexo: 'macho', edad_minima_meses: 18, edad_maxima_meses: null },
  { codigo: 'buey', sexo: 'macho', edad_minima_meses: 30, edad_maxima_meses: null },
];

/** Meses cumplidos entre dos fechas AAAA-MM-DD. */
export function mesesCumplidos(nacimiento: string, hoy: string): number {
  const [an, mn, dn] = nacimiento.split('-').map(Number);
  const [ah, mh, dh] = hoy.split('-').map(Number);
  return (ah - an) * 12 + (mh - mn) - (dh < dn ? 1 : 0);
}

/**
 * Por qué la categoría no corresponde, o nulo si corresponde.
 * Una categoría que no está en la tabla no se controla acá (la valida el catálogo).
 */
export function problemaDeCategoria(
  codigo: string,
  sexo: string,
  nacimiento: string | null,
  hoy: string,
): { motivo: 'sexo' } | { motivo: 'edad'; regla: ReglaCategoria } | null {
  const regla = REGLAS_CATEGORIAS.find((r) => r.codigo === codigo);
  if (!regla) return null;
  if (regla.sexo !== sexo) return { motivo: 'sexo' };
  if (nacimiento) {
    const meses = mesesCumplidos(nacimiento, hoy);
    if (meses < regla.edad_minima_meses) return { motivo: 'edad', regla };
    if (regla.edad_maxima_meses !== null && meses > regla.edad_maxima_meses) return { motivo: 'edad', regla };
  }
  return null;
}

/** El mensaje para el usuario, en su idioma. */
export function mensajeDeCategoria(
  problema: NonNullable<ReturnType<typeof problemaDeCategoria>>,
  codigo: string,
  sexo: string,
): string {
  const categoria = t(`animales.categorias.${codigo}`);
  if (problema.motivo === 'sexo') {
    return t('servidor.animales.categoriaSexo', { categoria, sexo: t(`animales.sexos.${sexo}`).toLowerCase() });
  }
  const { edad_minima_meses: min, edad_maxima_meses: max } = problema.regla;
  const rango =
    max === null
      ? t('servidor.animales.rangos.desde', { min })
      : min === 0
        ? t('servidor.animales.rangos.hasta', { max })
        : t('servidor.animales.rangos.entre', { min, max });
  return t('servidor.animales.categoriaEdad', { categoria, rango });
}
