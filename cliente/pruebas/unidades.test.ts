import { describe, expect, it } from 'vitest';
import {
  formatoFecha,
  formatoMomento,
  pesoAGuardar,
  pesoAMostrar,
  superficieAGuardar,
  superficieAMostrar,
  type Regional,
} from '../src/servicios/unidades';

/**
 * HU-26 · Unidades y formatos por país.
 *
 *   1. Kilos o libras y hectáreas o acres según el país.
 *   2. Se guarda en una única unidad interna y se convierte al mostrar.
 *   3. El formato de fecha y la zona horaria también siguen al país.
 */

const BOLIVIA: Regional = {
  peso: 'kg',
  superficie: 'ha',
  formatoFecha: 'DD/MM/YYYY',
  zonaHoraria: 'America/La_Paz',
};

const ESTADOS_UNIDOS: Regional = {
  peso: 'lb',
  superficie: 'acre',
  formatoFecha: 'MM/DD/YYYY',
  zonaHoraria: 'America/Chicago',
};

describe('HU-26 · criterio 1 y 2: unidades', () => {
  it('en kilos y hectáreas no convierte nada', () => {
    expect(pesoAMostrar(380, 'kg')).toBe(380);
    expect(superficieAMostrar(12.5, 'ha')).toBe(12.5);
  });

  it('muestra libras y acres a partir de kilos y hectáreas', () => {
    expect(pesoAMostrar(100, 'lb')).toBeCloseTo(220.462, 2);
    expect(superficieAMostrar(1, 'acre')).toBeCloseTo(2.471, 2);
  });

  it('lo que se escribe en libras o acres se guarda en kilos y hectáreas', () => {
    expect(pesoAGuardar(220.462, 'lb')).toBeCloseTo(100, 2);
    expect(superficieAGuardar(2.471, 'acre')).toBeCloseTo(1, 2);
  });

  it('ida y vuelta no pierde el valor', () => {
    for (const kg of [0.5, 380, 1234.56]) {
      expect(pesoAGuardar(pesoAMostrar(kg, 'lb'), 'lb')).toBeCloseTo(kg, 6);
    }
  });
});

describe('HU-26 · criterio 3: fechas y zona horaria', () => {
  it('una fecha sola sigue el formato del país', () => {
    expect(formatoFecha('2024-05-12', BOLIVIA)).toBe('12/05/2024');
    expect(formatoFecha('2024-05-12', ESTADOS_UNIDOS)).toBe('05/12/2024');
  });

  it('un momento se muestra en la zona horaria del país', () => {
    // 02:30 UTC del 13 de octubre: en La Paz (UTC-4) todavía es el 12.
    expect(formatoMomento('2026-10-13T02:30:00Z', BOLIVIA)).toBe('12/10/2026 22:30');
    // En Chicago (UTC-5 en octubre) son las 21:30 del 12.
    expect(formatoMomento('2026-10-13T02:30:00Z', ESTADOS_UNIDOS)).toBe('10/12/2026 21:30');
  });

  it('sin fecha muestra una raya', () => {
    expect(formatoFecha(null, BOLIVIA)).toBe('—');
  });
});
