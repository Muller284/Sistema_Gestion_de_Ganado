import { describe, it, expect } from 'vitest';
import {
  aCoordenada,
  aPixeles,
  ladoDelMundo,
  recortarLatitud,
  redondear,
  LATITUD_MAXIMA,
} from './proyeccion';

/**
 * HU-15 · La matemática del mapa.
 *
 * El mapa se puede ver y no es fácil equivocarse sin notarlo, pero la
 * conversión entre grados y píxeles sí: un signo cambiado pone el rancho en
 * el hemisferio contrario y la pantalla se ve igual de bien. Por eso se prueba
 * sola, sin navegador.
 */

describe('proyección Web Mercator', () => {
  it('el mundo entero mide 256 píxeles en el nivel 0 y se duplica en cada nivel', () => {
    expect(ladoDelMundo(0)).toBe(256);
    expect(ladoDelMundo(1)).toBe(512);
    expect(ladoDelMundo(10)).toBe(262144);
  });

  it('el punto cero cae justo en el centro del mundo', () => {
    const centro = aPixeles({ latitud: 0, longitud: 0 }, 0);
    expect(centro.x).toBeCloseTo(128, 6);
    expect(centro.y).toBeCloseTo(128, 6);
  });

  it('las esquinas del mundo son las esquinas de la tesela', () => {
    const noroeste = aPixeles(
      { latitud: LATITUD_MAXIMA, longitud: -180 },
      0,
    );
    expect(noroeste.x).toBeCloseTo(0, 6);
    expect(noroeste.y).toBeCloseTo(0, 6);

    const sureste = aPixeles({ latitud: -LATITUD_MAXIMA, longitud: 180 }, 0);
    expect(sureste.x).toBeCloseTo(256, 6);
    expect(sureste.y).toBeCloseTo(256, 6);
  });

  it('ir y volver devuelve la misma coordenada', () => {
    // El Cerrito, Warnes, Santa Cruz: las coordenadas de las semillas.
    const original = { latitud: -17.5147, longitud: -63.1661 };

    for (const acercamiento of [3, 8, 13, 18]) {
      const vuelta = aCoordenada(aPixeles(original, acercamiento), acercamiento);
      expect(vuelta.latitud).toBeCloseTo(original.latitud, 6);
      expect(vuelta.longitud).toBeCloseTo(original.longitud, 6);
    }
  });

  it('el hemisferio sur queda abajo y el oeste a la izquierda', () => {
    const centro = aPixeles({ latitud: 0, longitud: 0 }, 10);
    const sur = aPixeles({ latitud: -17.4, longitud: 0 }, 10);
    const oeste = aPixeles({ latitud: 0, longitud: -63.2 }, 10);

    // En píxeles de pantalla, "abajo" es y mayor.
    expect(sur.y).toBeGreaterThan(centro.y);
    expect(oeste.x).toBeLessThan(centro.x);
  });

  it('las latitudes imposibles se recortan en lugar de romper el cálculo', () => {
    expect(recortarLatitud(95)).toBe(LATITUD_MAXIMA);
    expect(recortarLatitud(-95)).toBe(-LATITUD_MAXIMA);
    expect(recortarLatitud(-17.5)).toBe(-17.5);

    const polo = aPixeles({ latitud: 90, longitud: 0 }, 5);
    expect(Number.isFinite(polo.y)).toBe(true);
  });

  it('se redondea a seis decimales', () => {
    expect(redondear(-17.51473829)).toBe(-17.514738);
    expect(redondear(0)).toBe(0);
  });
});
