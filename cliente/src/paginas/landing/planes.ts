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

export type Periodo = 'mes' | 'anio';
export type ClaveFranja = 'A' | 'B' | 'C';

export interface Franja {
  clave: ClaveFranja;
  nombre: string;
  multiplicador: number;
  /** Códigos de país (ISO 3166) de la franja, para adivinar la del visitante. */
  paises: string[];
}

export const FRANJAS: Franja[] = [
  {
    clave: 'A',
    nombre: 'Estados Unidos, Canadá, Europa y Oceanía',
    multiplicador: 1,
    paises: ['US', 'CA', 'ES', 'FR', 'DE', 'IT', 'GB', 'PT', 'NL', 'AU', 'NZ'],
  },
  {
    clave: 'B',
    nombre: 'Argentina, Brasil, Chile, Uruguay, México y Colombia',
    multiplicador: 0.6,
    paises: ['AR', 'BR', 'CL', 'UY', 'MX', 'CO'],
  },
  {
    clave: 'C',
    nombre: 'Bolivia, Paraguay, Perú y Centroamérica',
    multiplicador: 0.4,
    paises: ['BO', 'PY', 'PE', 'GT', 'HN', 'SV', 'NI', 'CR', 'PA'],
  },
];

export interface Plan {
  clave: string;
  nombre: string;
  para: string;
  /** Precio en USD de la franja A. El anual ya trae el 20 % de descuento. */
  mensual: number;
  anual: number;
  destacado?: boolean;
  incluye: string[];
}

export const PLANES: Plan[] = [
  {
    clave: 'gratis',
    nombre: 'Gratis',
    para: 'Para empezar a ordenar un rodeo chico.',
    mensual: 0,
    anual: 0,
    incluye: [
      '2 socios y 3 colaboradores',
      'Hasta 50 animales y 3 corrales',
      'Asistente: 10 preguntas al mes',
      'Importa hasta 100 filas al mes',
      'Historial de los últimos 12 meses',
      'App sin conexión',
    ],
  },
  {
    clave: 'productor',
    nombre: 'Productor',
    para: 'Para el productor familiar con un equipo chico.',
    mensual: 15,
    anual: 144,
    incluye: [
      '5 socios y 8 colaboradores',
      'Hasta 400 animales y 20 corrales',
      'Asistente: 150 preguntas al mes',
      'Importa y exporta a Excel',
      'Historial completo',
      'Soporte por correo',
    ],
  },
  {
    clave: 'profesional',
    nombre: 'Profesional',
    para: 'Para el rancho que ya trabaja con capataz y veterinario.',
    mensual: 39,
    anual: 374,
    destacado: true,
    incluye: [
      '12 socios y 25 colaboradores',
      'Hasta 2.000 animales y 100 corrales',
      'Asistente: 600 preguntas al mes',
      'Importa y exporta a Excel',
      'Historial completo',
      'Soporte prioritario',
    ],
  },
  {
    clave: 'empresa',
    nombre: 'Empresa',
    para: 'Para la empresa agropecuaria con varios equipos.',
    mensual: 89,
    anual: 854,
    incluye: [
      '30 socios y 60 colaboradores',
      'Animales y corrales sin límite',
      'Asistente sin límite para los dueños',
      'Importa y exporta a Excel',
      'Historial completo',
      'Canal de soporte propio',
    ],
  },
];

const FORMATO = new Intl.NumberFormat('es', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** 23.4 se escribe "23,40": con centavos, siempre los dos. */
function dinero(valor: number): string {
  const redondeado = Math.round(valor * 100) / 100;
  return Number.isInteger(redondeado)
    ? FORMATO.format(redondeado)
    : redondeado.toLocaleString('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function precioDelPlan(
  plan: Plan,
  periodo: Periodo,
  clave: ClaveFranja,
): { monto: string; detalle: string; gratis: boolean } {
  if (plan.mensual === 0) {
    return { monto: '0', detalle: 'Sin vencimiento y sin tarjeta.', gratis: true };
  }

  const multiplicador = FRANJAS.find((f) => f.clave === clave)?.multiplicador ?? 1;
  const mensual = plan.mensual * multiplicador;
  const anual = plan.anual * multiplicador;

  return periodo === 'mes'
    ? {
        monto: dinero(mensual),
        detalle: `O USD ${dinero(anual)} pagando el año entero.`,
        gratis: false,
      }
    : {
        monto: dinero(anual),
        detalle: `Equivale a USD ${dinero(anual / 12)} por mes.`,
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
