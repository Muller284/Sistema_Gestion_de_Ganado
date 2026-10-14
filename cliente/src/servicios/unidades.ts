import { api } from './api';
import { localeActual } from './idioma';

/**
 * HU-26 · Unidades y formatos por país.
 *
 *   1. Se muestran kilos o libras y hectáreas o acres según el país.
 *   2. El valor se guarda siempre en una única unidad interna (kilos y
 *      hectáreas) y se convierte al mostrarlo.
 *   3. El formato de fecha y la zona horaria también siguen al país.
 *
 * La configuración sale de la tabla paises (unidad_peso, unidad_superficie,
 * formato_fecha, zona_horaria) del país del rancho. Las pantallas no
 * convierten a mano: piden a este archivo.
 */

export type UnidadPeso = 'kg' | 'lb';
export type UnidadSuperficie = 'ha' | 'acre';

export interface Regional {
  peso: UnidadPeso;
  superficie: UnidadSuperficie;
  /** Como en la tabla paises: DD/MM/YYYY o MM/DD/YYYY. */
  formatoFecha: string;
  zonaHoraria: string;
}

/** Lo de Bolivia: el país de la mayoría de los ranchos y el de las semillas. */
export const REGIONAL_POR_DEFECTO: Regional = {
  peso: 'kg',
  superficie: 'ha',
  formatoFecha: 'DD/MM/YYYY',
  zonaHoraria: 'America/La_Paz',
};

const KG_POR_LIBRA = 0.45359237;
const HA_POR_ACRE = 0.40468564224;

/** De la unidad interna a la del país. */
export function pesoAMostrar(kg: number, unidad: UnidadPeso): number {
  return unidad === 'lb' ? kg / KG_POR_LIBRA : kg;
}

/** De lo que escribió la persona a la unidad interna. */
export function pesoAGuardar(valor: number, unidad: UnidadPeso): number {
  return unidad === 'lb' ? valor * KG_POR_LIBRA : valor;
}

export function superficieAMostrar(ha: number, unidad: UnidadSuperficie): number {
  return unidad === 'acre' ? ha / HA_POR_ACRE : ha;
}

export function superficieAGuardar(valor: number, unidad: UnidadSuperficie): number {
  return unidad === 'acre' ? valor * HA_POR_ACRE : valor;
}

/** "1.234,5 kg" o "2,721.6 lb", con los separadores del idioma. */
export function formatoPeso(kg: number, regional: Regional): string {
  return `${redondeado(pesoAMostrar(kg, regional.peso))} ${regional.peso}`;
}

export function formatoSuperficie(ha: number, regional: Regional): string {
  const unidad = regional.superficie === 'acre' ? 'ac' : 'ha';
  return `${redondeado(superficieAMostrar(ha, regional.superficie))} ${unidad}`;
}

function redondeado(valor: number): string {
  return new Intl.NumberFormat(localeActual(), { maximumFractionDigits: 1 }).format(valor);
}

/**
 * Una fecha sola (AAAA-MM-DD, sin hora) en el formato del país. No pasa por
 * la zona horaria: el 12 de mayo es el 12 de mayo en cualquier lado.
 */
export function formatoFecha(iso: string | null, regional: Regional): string {
  if (!iso) return '—';
  const [anio, mes, dia] = iso.slice(0, 10).split('-');
  return regional.formatoFecha
    .replace('YYYY', anio)
    .replace('MM', mes)
    .replace('DD', dia);
}

/** Un momento (con hora) en la zona horaria y el formato del país. */
export function formatoMomento(iso: string, regional: Regional): string {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: regional.zonaHoraria,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso));
  const parte = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? '';
  const fecha = formatoFecha(`${parte('year')}-${parte('month')}-${parte('day')}`, regional);
  return `${fecha} ${parte('hour')}:${parte('minute')}`;
}

/** Hoy en la zona del país, como AAAA-MM-DD (para el máximo de los campos de fecha). */
export function hoyEn(regional: Regional): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: regional.zonaHoraria }).format(new Date());
}

let paises: ReturnType<typeof api.paises> | null = null;

/**
 * La configuración del país del rancho de quien entró. La lista de países se
 * pide una sola vez; el rancho, cada vez, porque la barra de demostración
 * cambia de usuario sin recargar.
 */
export async function cargarRegional(): Promise<Regional> {
  try {
    const estado = await api.miRancho();
    const codigo = estado.rancho?.pais_codigo;
    if (!codigo) return REGIONAL_POR_DEFECTO;
    if (!paises) paises = api.paises();
    const pais = (await paises).find((p) => p.codigo === codigo);
    if (!pais) return REGIONAL_POR_DEFECTO;
    return {
      peso: pais.unidad_peso === 'lb' ? 'lb' : 'kg',
      superficie: pais.unidad_superficie === 'acre' ? 'acre' : 'ha',
      formatoFecha: pais.formato_fecha ?? REGIONAL_POR_DEFECTO.formatoFecha,
      zonaHoraria: pais.zona_horaria ?? REGIONAL_POR_DEFECTO.zonaHoraria,
    };
  } catch {
    paises = null;
    return REGIONAL_POR_DEFECTO;
  }
}
