import { describe, expect, it } from 'vitest';
import { limitePorSuperficie, revisarCorral } from '../src/servicios/carga';

/**
 * Pedido del docente sobre HU-36: la capacidad de un corral no puede pasar de
 * lo que admite su superficie, y no se acepta cero.
 * Carga: carne 1, leche 2 y mixto 1,5 animales por hectárea.
 */

describe('límite de animales por superficie', () => {
  it('carne: 1 ha → 1 animal, 10 ha → 10', () => {
    expect(limitePorSuperficie(1, 1)).toBe(1);
    expect(limitePorSuperficie(10, 1)).toBe(10);
  });

  it('leche: 1 ha → 2 animales', () => {
    expect(limitePorSuperficie(1, 2)).toBe(2);
  });

  it('mixto: redondea hacia abajo (3 ha → 4, no 4,5)', () => {
    expect(limitePorSuperficie(3, 1.5)).toBe(4);
  });

  it('un corral chico igual admite un animal', () => {
    expect(limitePorSuperficie(0.2, 1)).toBe(1);
  });
});

describe('controles del formulario de corrales', () => {
  it('no acepta capacidad cero, negativa ni con decimales', () => {
    expect(revisarCorral('0', null, 1)).toBe('capacidadInvalida');
    expect(revisarCorral('-3', null, 1)).toBe('capacidadInvalida');
    expect(revisarCorral('2.5', null, 1)).toBe('capacidadInvalida');
  });

  it('no acepta superficie cero', () => {
    expect(revisarCorral('', 0, 1)).toBe('superficieInvalida');
  });

  it('no deja pasar del límite de la superficie', () => {
    expect(revisarCorral('2', 1, 1)).toBe('capacidadExcedida');
    expect(revisarCorral('2', 1, 2)).toBeNull();
  });

  it('sin superficie o sin capacidad no hay límite que controlar', () => {
    expect(revisarCorral('500', null, 1)).toBeNull();
    expect(revisarCorral('', 3, 1)).toBeNull();
  });
});
