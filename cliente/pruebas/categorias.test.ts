import { describe, expect, it } from 'vitest';
import type { ReglaCategoria } from '../src/servicios/api';
import { categoriasPermitidas, mesesCumplidos } from '../src/servicios/categorias';

/**
 * HU-28 · La categoría tiene que corresponder al sexo y a la edad (pedido del
 * docente): si nació hoy no puede ser vaca ni toro.
 */

const REGLAS: ReglaCategoria[] = [
  { codigo: 'ternero', sexo: 'macho', edad_minima_meses: 0, edad_maxima_meses: 12 },
  { codigo: 'ternera', sexo: 'hembra', edad_minima_meses: 0, edad_maxima_meses: 12 },
  { codigo: 'torito', sexo: 'macho', edad_minima_meses: 8, edad_maxima_meses: 30 },
  { codigo: 'vaquilla', sexo: 'hembra', edad_minima_meses: 8, edad_maxima_meses: 36 },
  { codigo: 'novillo', sexo: 'macho', edad_minima_meses: 8, edad_maxima_meses: null },
  { codigo: 'vaca', sexo: 'hembra', edad_minima_meses: 18, edad_maxima_meses: null },
  { codigo: 'toro', sexo: 'macho', edad_minima_meses: 18, edad_maxima_meses: null },
  { codigo: 'buey', sexo: 'macho', edad_minima_meses: 30, edad_maxima_meses: null },
];
const CATALOGO = REGLAS.map((r) => r.codigo);
const HOY = '2026-10-28';

describe('categorías según sexo y edad', () => {
  it('una hembra que nació hoy solo puede ser ternera', () => {
    expect(categoriasPermitidas(CATALOGO, REGLAS, 'hembra', HOY, HOY)).toEqual(['ternera']);
  });

  it('un macho que nació hoy solo puede ser ternero', () => {
    expect(categoriasPermitidas(CATALOGO, REGLAS, 'macho', HOY, HOY)).toEqual(['ternero']);
  });

  it('una hembra de 3 años puede ser vaquilla o vaca, no ternera', () => {
    expect(categoriasPermitidas(CATALOGO, REGLAS, 'hembra', '2023-10-01', HOY)).toEqual(['vaquilla', 'vaca']);
  });

  it('sin fecha se filtra solo por sexo', () => {
    expect(categoriasPermitidas(CATALOGO, REGLAS, 'hembra', '', HOY)).toEqual(['ternera', 'vaquilla', 'vaca']);
  });

  it('sin sexo ni fecha se ofrece todo el catálogo', () => {
    expect(categoriasPermitidas(CATALOGO, REGLAS, '', '', HOY)).toEqual(CATALOGO);
  });

  it('cuenta los meses cumplidos, no los del calendario', () => {
    expect(mesesCumplidos('2026-01-31', '2026-02-28')).toBe(0);
    expect(mesesCumplidos('2024-10-28', HOY)).toBe(24);
  });
});
