/**
 * HU-54 · Ganancia diaria de peso.
 *
 * Entre cada pesaje y el anterior: la diferencia de peso dividida por los días
 * que pasaron. El primero no tiene con qué compararse. Las fechas son días
 * sueltos (AAAA-MM-DD): se cuentan en UTC para que el cambio de horario no
 * agregue ni quite un día.
 *
 * La usa la pestaña Pesajes de la ficha, y sirve igual para el registro rápido
 * desde el celular (HU-55).
 */

import { localeActual, t } from './idioma';
import { pesoAMostrar, type Regional } from './unidades';

export interface PesajeConGanancia<T> {
  pesaje: T;
  /** Kilos por día desde el pesaje anterior; nulo en el primero. */
  ganancia: number | null;
  /** Días desde el pesaje anterior; nulo en el primero. */
  dias: number | null;
}

export function diasEntre(desde: string, hasta: string): number {
  const dia = (fecha: string) => {
    const [a, m, d] = fecha.slice(0, 10).split('-').map(Number);
    return Date.UTC(a, m - 1, d) / 86_400_000;
  };
  return Math.round(dia(hasta) - dia(desde));
}

/** Kilos por día entre dos pesajes; nulo si son del mismo día. */
export function gananciaDiaria(
  anterior: { fecha: string; peso_kg: number },
  actual: { fecha: string; peso_kg: number },
): number | null {
  const dias = diasEntre(anterior.fecha, actual.fecha);
  if (dias <= 0) return null;
  return (Number(actual.peso_kg) - Number(anterior.peso_kg)) / dias;
}

/**
 * Los pesajes del más viejo al más nuevo, cada uno con su ganancia desde el
 * anterior. Acepta la lista en cualquier orden.
 */
export function conGanancias<T extends { fecha: string; peso_kg: number }>(pesajes: T[]): PesajeConGanancia<T>[] {
  const ordenados = [...pesajes].sort((a, b) => a.fecha.localeCompare(b.fecha));
  return ordenados.map((pesaje, i) => {
    if (i === 0) return { pesaje, ganancia: null, dias: null };
    const anterior = ordenados[i - 1];
    return { pesaje, ganancia: gananciaDiaria(anterior, pesaje), dias: diasEntre(anterior.fecha, pesaje.fecha) };
  });
}

/** Ganancia entre el primer y el último pesaje; nula con menos de dos días de diferencia. */
export function gananciaTotal<T extends { fecha: string; peso_kg: number }>(pesajes: T[]): number | null {
  if (pesajes.length < 2) return null;
  const ordenados = [...pesajes].sort((a, b) => a.fecha.localeCompare(b.fecha));
  return gananciaDiaria(ordenados[0], ordenados[ordenados.length - 1]);
}

/**
 * "+0,53 kg/día" o "−0,10 lb/día", en la unidad del país (HU-26) y con dos
 * decimales: con uno solo, 0,05 y 0,14 kg/día se verían casi iguales.
 */
export function textoGanancia(kgPorDia: number, regional: Pick<Regional, 'peso'>): string {
  const valor = pesoAMostrar(Math.abs(kgPorDia), regional.peso);
  const numero = new Intl.NumberFormat(localeActual(), { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valor);
  const signo = kgPorDia > 0.0049 ? '+' : kgPorDia < -0.0049 ? '−' : '';
  return `${signo}${t('evolucionPeso.porDia', { peso: `${numero} ${regional.peso}` })}`;
}
