/**
 * Los planes, los precios y las franjas regionales que muestra la landing.
 *
 * Son los de la Propuesta v4, secciones 11 y 12. Están acá, aparte, para que
 * cambiar un número sea tocar una línea y no buscarlo dentro de la pantalla.
 *
 * PROVISIONAL HASTA LA FASE 4
 * La propuesta dice que los planes y las franjas son datos que se administran
 * desde el panel del Admin. Cuando existan esas tablas y su servicio, este
 * archivo se reemplaza por una llamada al servidor y la pantalla no cambia.
 */

import { localeActual, t } from '../../servicios/idioma';

export type Periodo = 'mes' | 'anio';
export type ClaveFranja = 'A' | 'B' | 'C';

export interface Franja {
  clave: ClaveFranja;
  multiplicador: number;
  /** Códigos de país (ISO 3166) de la franja, para adivinar la del visitante. */
  paises: string[];
}

export const FRANJAS: Franja[] = [
  {
    clave: 'A',
    multiplicador: 1,
    paises: ['US', 'CA', 'ES', 'FR', 'DE', 'IT', 'GB', 'PT', 'NL', 'AU', 'NZ'],
  },
  {
    clave: 'B',
    multiplicador: 0.6,
    paises: ['AR', 'BR', 'CL', 'UY', 'MX', 'CO'],
  },
  {
    clave: 'C',
    multiplicador: 0.4,
    paises: ['BO', 'PY', 'PE', 'GT', 'HN', 'SV', 'NI', 'CR', 'PA'],
  },
];

/**
 * Los textos de cada plan (nombre, para quién es y lo que incluye) están en el
 * archivo de idioma, bajo landing.planes.lista.<clave>. Acá van solo las
 * claves; se traducen al dibujar con nombreDelPlan, paraQuienEs y loQueIncluye.
 */
export interface Plan {
  clave: string;
  /** Precio en USD de la franja A. El anual ya trae el 20 % de descuento. */
  mensual: number;
  anual: number;
  destacado?: boolean;
  /** Claves de landing.planes.lista.<clave>.incluye, en el orden en que se muestran. */
  incluye: string[];
}

export const PLANES: Plan[] = [
  {
    clave: 'gratis',
    mensual: 0,
    anual: 0,
    incluye: [
      'equipo',
      'limites',
      'asistente',
      'importa',
      'historial',
      'sinConexion',
    ],
  },
  {
    clave: 'productor',
    mensual: 15,
    anual: 144,
    incluye: [
      'equipo',
      'limites',
      'asistente',
      'excel',
      'historial',
      'soporte',
    ],
  },
  {
    clave: 'profesional',
    mensual: 39,
    anual: 374,
    destacado: true,
    incluye: [
      'equipo',
      'limites',
      'asistente',
      'excel',
      'historial',
      'soporte',
    ],
  },
  {
    clave: 'empresa',
    mensual: 89,
    anual: 854,
    incluye: [
      'equipo',
      'limites',
      'asistente',
      'excel',
      'historial',
      'soporte',
    ],
  },
];

/** El nombre de la región de precios, en el idioma actual. */
export function nombreDeFranja(franja: Franja): string {
  return t(`landing.planes.franjas.${franja.clave}`);
}

export function nombreDelPlan(plan: Plan): string {
  return t(`landing.planes.lista.${plan.clave}.nombre`);
}

export function paraQuienEs(plan: Plan): string {
  return t(`landing.planes.lista.${plan.clave}.para`);
}

/** Las líneas de "qué incluye", ya traducidas, con su clave para usar de key. */
export function loQueIncluye(plan: Plan): { clave: string; texto: string }[] {
  return plan.incluye.map((clave) => ({
    clave,
    texto: t(`landing.planes.lista.${plan.clave}.incluye.${clave}`),
  }));
}

/**
 * 23.4 se escribe "23,40" (o "23.40" en inglés): con centavos, siempre los
 * dos. El formato sigue al idioma actual, por eso se arma en cada llamada.
 */
function dinero(valor: number): string {
  const redondeado = Math.round(valor * 100) / 100;
  return Number.isInteger(redondeado)
    ? redondeado.toLocaleString(localeActual(), { minimumFractionDigits: 0, maximumFractionDigits: 2 })
    : redondeado.toLocaleString(localeActual(), { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function precioDelPlan(
  plan: Plan,
  periodo: Periodo,
  clave: ClaveFranja,
): { monto: string; detalle: string; gratis: boolean } {
  if (plan.mensual === 0) {
    return { monto: '0', detalle: t('landing.planes.detalleGratis'), gratis: true };
  }

  const multiplicador = FRANJAS.find((f) => f.clave === clave)?.multiplicador ?? 1;
  const mensual = plan.mensual * multiplicador;
  const anual = plan.anual * multiplicador;

  return periodo === 'mes'
    ? {
        monto: dinero(mensual),
        detalle: t('landing.planes.detalleMensual', { monto: dinero(anual) }),
        gratis: false,
      }
    : {
        monto: dinero(anual),
        detalle: t('landing.planes.detalleAnual', { monto: dinero(anual / 12) }),
        gratis: false,
      };
}

/**
 * La franja del visitante según el idioma del navegador (es-BO → C). Es solo
 * un punto de partida: la persona la puede cambiar en la lista, y el precio
 * que se cobra de verdad sale del país que elige al registrarse (HU-14).
 */
export function franjaDelNavegador(): ClaveFranja {
  const idiomas = typeof navigator === 'undefined' ? [] : navigator.languages ?? [];
  for (const idioma of idiomas) {
    const region = idioma.split('-')[1]?.toUpperCase();
    if (!region) continue;
    const franja = FRANJAS.find((f) => f.paises.includes(region));
    if (franja) return franja.clave;
  }
  return 'A';
}
