import type { DatosEsquema, DosisPendiente, EsquemaVacunacion, EstadoDosis, ReglaCategoria, Sexo } from './api';
import { t, tn } from './idioma';

/**
 * HU-47 y HU-50 · Cómo se cuentan en pantalla un esquema y una dosis, y lo
 * que el formulario controla antes de mandar. El servidor vuelve a validar
 * todo: esto es para que el error aparezca mientras se escribe.
 */

/** "2 dosis cada 21 días · refuerzo cada 365 días". */
export function resumenDosis(esquema: Pick<EsquemaVacunacion, 'dosis' | 'intervalo_dias' | 'refuerzo_dias'>): string {
  const serie =
    esquema.dosis === 1
      ? t('sanidad.esquemas.dosisUnica')
      : t('sanidad.esquemas.serie', { n: esquema.dosis, dias: esquema.intervalo_dias ?? 0 });
  const refuerzo = esquema.refuerzo_dias
    ? t('sanidad.esquemas.refuerzo', { n: esquema.refuerzo_dias })
    : t('sanidad.esquemas.sinRefuerzo');
  return `${serie} · ${refuerzo}`;
}

/** "Ternera, Vaquilla · solo hembras · de 3 a 8 meses". */
export function resumenPublico(
  esquema: Pick<EsquemaVacunacion, 'categorias' | 'sexo' | 'edad_minima_meses' | 'edad_maxima_meses'>,
): string {
  const partes = [
    esquema.categorias?.length
      ? esquema.categorias.map((c) => t(`animales.categorias.${c}`)).join(', ')
      : t('sanidad.esquemas.todasCategorias'),
  ];
  if (esquema.sexo) partes.push(t(`sanidad.esquemas.sexos.${esquema.sexo}`));
  const min = esquema.edad_minima_meses;
  const max = esquema.edad_maxima_meses;
  if (max !== null) {
    partes.push(min > 0 ? t('sanidad.esquemas.edad.rango', { min, max }) : t('sanidad.esquemas.edad.hasta', { n: max }));
  } else if (min > 0) {
    partes.push(t('sanidad.esquemas.edad.desde', { n: min }));
  }
  return partes.join(' · ');
}

/** "Dosis 2 de 3" o "Refuerzo". */
export function nombreDosis(dosis: Pick<DosisPendiente, 'numero_dosis' | 'dosis_total'>): string {
  return dosis.numero_dosis === null
    ? t('sanidad.dosis.refuerzo')
    : t('sanidad.dosis.numero', { n: dosis.numero_dosis, total: dosis.dosis_total });
}

/** "Venció hace 3 días", "Vence hoy", "Vence en 6 días". */
export function textoVencimiento(dias: number): string {
  if (dias === 0) return t('sanidad.vencimiento.hoy');
  return dias < 0 ? tn('sanidad.vencimiento.atrasada', -dias) : tn('sanidad.vencimiento.faltan', dias);
}

export const VARIANTE_ESTADO: Record<EstadoDosis, 'error' | 'adv' | 'info'> = {
  vencida: 'error',
  proxima: 'adv',
  programada: 'info',
};

/** Lo que se escribe en el formulario: todo texto, como lo dejan los campos. */
export interface FormularioEsquema {
  nombre: string;
  producto_id: string;
  categorias: string[];
  sexo: Sexo | '';
  edad_minima_meses: string;
  edad_maxima_meses: string;
  dosis: string;
  intervalo_dias: string;
  refuerzo_dias: string;
}

export function formularioDe(esquema?: EsquemaVacunacion): FormularioEsquema {
  const texto = (valor: number | null | undefined) => (valor === null || valor === undefined ? '' : String(valor));
  return {
    nombre: esquema?.nombre ?? '',
    producto_id: esquema?.producto_id ?? '',
    categorias: esquema?.categorias ?? [],
    sexo: esquema?.sexo ?? '',
    edad_minima_meses: esquema ? texto(esquema.edad_minima_meses) : '0',
    edad_maxima_meses: texto(esquema?.edad_maxima_meses),
    dosis: esquema ? texto(esquema.dosis) : '1',
    intervalo_dias: texto(esquema?.intervalo_dias),
    refuerzo_dias: texto(esquema?.refuerzo_dias),
  };
}

/** Qué falta o está mal, para mostrarlo junto al campo. Nulo si está bien. */
export function problemaEsquema(formulario: FormularioEsquema): 'edadesCruzadas' | 'faltaIntervalo' | null {
  const min = formulario.edad_minima_meses === '' ? 0 : Number(formulario.edad_minima_meses);
  if (formulario.edad_maxima_meses !== '' && Number(formulario.edad_maxima_meses) < min) return 'edadesCruzadas';
  if (Number(formulario.dosis) > 1 && formulario.intervalo_dias === '') return 'faltaIntervalo';
  return null;
}

export function aDatosEsquema(formulario: FormularioEsquema): DatosEsquema {
  const numero = (valor: string) => (valor.trim() === '' ? null : Number(valor));
  const dosis = numero(formulario.dosis);
  return {
    nombre: formulario.nombre,
    producto_id: formulario.producto_id,
    categorias: formulario.categorias.length ? formulario.categorias : null,
    sexo: formulario.sexo || null,
    edad_minima_meses: numero(formulario.edad_minima_meses),
    edad_maxima_meses: numero(formulario.edad_maxima_meses),
    dosis,
    // Con una sola dosis no hay intervalo.
    intervalo_dias: dosis !== null && dosis > 1 ? numero(formulario.intervalo_dias) : null,
    refuerzo_dias: numero(formulario.refuerzo_dias),
  };
}

/** Las categorías que se pueden marcar con el sexo elegido (una vaca no va en un esquema de machos). */
export function categoriasDelSexo(catalogo: string[], reglas: ReglaCategoria[], sexo: Sexo | ''): string[] {
  if (!sexo) return catalogo;
  return catalogo.filter((codigo) => {
    const regla = reglas.find((r) => r.codigo === codigo);
    return !regla || regla.sexo === sexo;
  });
}
