import { pedir, type EstadoDosis } from './api';
import { localeActual } from './idioma';

/**
 * HU-56, HU-57, HU-58 y HU-59 · Las llamadas de los paneles, la comparativa
 * de pesajes y el calendario mensual. Viven aparte de api.ts para no pisar lo
 * que agregan los demás módulos; usan el mismo pedir().
 */
export const indicadores = {
  panel: () => pedir<PanelRancho>('/indicadores/panel'),
  comparativa: (filtro: FiltroComparativa) => {
    const parametros = new URLSearchParams();
    for (const [clave, valor] of Object.entries(filtro)) if (valor) parametros.set(clave, valor);
    return pedir<ComparativaPesos>(`/indicadores/pesajes/comparativa?${parametros.toString()}`);
  },
  calendarioMes: (filtro: { mes?: string; producto?: string; corral?: string }) => {
    const parametros = new URLSearchParams();
    for (const [clave, valor] of Object.entries(filtro)) if (valor) parametros.set(clave, valor);
    return pedir<MesSanitario>(`/sanidad/calendario/mes?${parametros.toString()}`);
  },
};

type Seccion = 'animales' | 'corrales' | 'sanidad' | 'pesajes';

/** HU-57 y HU-58. Cada sección es nula si quien pregunta no ve ese módulo. */
export interface PanelRancho {
  hoy: string;
  secciones: Record<Seccion, boolean>;
  editar: Record<Seccion, boolean>;
  animales: {
    activos: number;
    por_categoria: { codigo: string | null; n: number }[];
    movimientos: { mes: string; altas: number; bajas: number }[];
  } | null;
  corrales: {
    por_corral: { id: string; nombre: string; capacidad: number | null; n: number }[];
    sin_corral: number;
  } | null;
  sanidad: {
    activos: number;
    esquemas: number;
    con_esquema: number;
    al_dia: number;
    atrasados: number;
    /** Porcentaje de animales al día, entre los que tienen algún esquema. Nulo si ninguno tiene. */
    cobertura: number | null;
    vencidas: number;
    proximas: number;
    dias_proxima: number;
    proximos: {
      animal_id: string;
      identificador: string;
      esquema_nombre: string;
      vence: string;
      dias: number;
      estado: EstadoDosis;
    }[];
  } | null;
  pesajes: {
    evolucion: { mes: string; peso_promedio: number | null; animales: number }[];
    meses_con_datos: number;
  } | null;
}

/** HU-56. */
export interface FiltroComparativa {
  desde?: string;
  hasta?: string;
  agrupar?: 'corral' | 'categoria';
}

export interface GrupoPeso {
  clave: string | null;
  nombre: string | null;
  animales: number;
  peso_promedio: number;
  ganancia_promedio: number | null;
}

export interface AnimalBajoPromedio {
  animal_id: string;
  identificador: string;
  nombre: string | null;
  categoria_codigo: string | null;
  corral_nombre: string | null;
  peso_final: number;
  ganancia_diaria: number;
  grupo: string | null;
  ganancia_promedio_grupo: number;
  /** Kilos por día que le faltan para llegar al promedio de su grupo. */
  falta: number;
}

export interface ComparativaPesos {
  desde: string;
  hasta: string;
  agrupar: 'corral' | 'categoria';
  /** Sin permiso de corrales se agrupa solo por categoría. */
  con_corrales: boolean;
  animales_pesados: number;
  con_ganancia: number;
  por_corral: GrupoPeso[] | null;
  por_categoria: GrupoPeso[];
  bajo_promedio: AnimalBajoPromedio[];
}

/** HU-59. */
export interface MesSanitario {
  mes: string;
  desde: string;
  hasta: string;
  hoy: string;
  dias: { fecha: string; vencida: number; proxima: number; programada: number }[];
  dias_proxima: number;
}

/** Los días del mes acomodados en semanas de lunes a domingo; null en los huecos. */
export function armarSemanas(desde: string, hasta: string): (string | null)[] {
  const [a, m] = desde.split('-').map(Number);
  const ultimo = Number(hasta.slice(8));
  // getUTCDay: 0 es domingo. La semana empieza el lunes.
  const corrimiento = (new Date(Date.UTC(a, m - 1, 1)).getUTCDay() + 6) % 7;
  const celdas: (string | null)[] = Array(corrimiento).fill(null);
  for (let d = 1; d <= ultimo; d++) celdas.push(`${desde.slice(0, 8)}${String(d).padStart(2, '0')}`);
  while (celdas.length % 7) celdas.push(null);
  return celdas;
}


/** "noviembre de 2026" para una clave AAAA-MM, en el idioma de la interfaz. */
export function mesLargo(clave: string): string {
  const [a, m] = clave.split('-').map(Number);
  return new Intl.DateTimeFormat(localeActual(), { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(Date.UTC(a, m - 1, 1)),
  );
}

/** "nov" para una clave AAAA-MM. */
export function mesCorto(clave: string): string {
  const [a, m] = clave.split('-').map(Number);
  return new Intl.DateTimeFormat(localeActual(), { month: 'short', timeZone: 'UTC' })
    .format(new Date(Date.UTC(a, m - 1, 1)))
    .replace('.', '');
}
