/**
 * La proyección de los mapas de tesela, para HU-15.
 *
 * QUÉ ES ESTO
 * Todos los mapas web (OpenStreetMap, y los demás) parten el mundo en teselas
 * cuadradas de 256 píxeles. En el nivel de acercamiento 0 el mundo entero es
 * una sola tesela; en el 1 son cuatro; en el z son 2^z por lado. La proyección
 * que usan se llama Web Mercator.
 *
 * Estas dos funciones son toda la matemática del mapa: pasar de coordenadas
 * geográficas a píxeles del mundo, y volver. El resto es arrastrar y pintar.
 *
 * Están acá, sueltas y sin React, para poder probarlas solas. La prueba está
 * en proyeccion.test.ts.
 *
 * Mercator no puede representar los polos, así que la latitud se recorta en
 * ±85.0511°, que es donde el mundo se vuelve un cuadrado exacto. Es el mismo
 * límite que usan todos los mapas web.
 */

export const LADO_TESELA = 256;
export const LATITUD_MAXIMA = 85.05112878;

export interface PuntoMundo {
  x: number;
  y: number;
}

export interface Coordenada {
  latitud: number;
  longitud: number;
}

/** Cuántos píxeles tiene el mundo entero en este nivel de acercamiento. */
export function ladoDelMundo(acercamiento: number): number {
  return LADO_TESELA * 2 ** acercamiento;
}

export function recortarLatitud(latitud: number): number {
  return Math.min(LATITUD_MAXIMA, Math.max(-LATITUD_MAXIMA, latitud));
}

/** De grados a píxeles del mundo. */
export function aPixeles(
  { latitud, longitud }: Coordenada,
  acercamiento: number,
): PuntoMundo {
  const lado = ladoDelMundo(acercamiento);
  const radianes = (recortarLatitud(latitud) * Math.PI) / 180;

  return {
    x: ((longitud + 180) / 360) * lado,
    y:
      ((1 - Math.log(Math.tan(radianes) + 1 / Math.cos(radianes)) / Math.PI) /
        2) *
      lado,
  };
}

/** De píxeles del mundo a grados. La vuelta exacta de aPixeles. */
export function aCoordenada(
  { x, y }: PuntoMundo,
  acercamiento: number,
): Coordenada {
  const lado = ladoDelMundo(acercamiento);
  const n = Math.PI - (2 * Math.PI * y) / lado;

  return {
    longitud: (x / lado) * 360 - 180,
    latitud: (180 / Math.PI) * Math.atan(Math.sinh(n)),
  };
}

/** Redondeo para guardar y mostrar: seis decimales son ~11 cm. De sobra. */
export function redondear(grados: number): number {
  return Math.round(grados * 1e6) / 1e6;
}
