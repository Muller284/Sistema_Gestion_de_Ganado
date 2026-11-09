import type { DatosProducto, ProductoSanitario, TipoProducto, UnidadDosis } from './api';
import { localeActual, t } from './idioma';

/**
 * HU-46 · Lo que el formulario de un producto controla antes de mandar. El
 * servidor vuelve a validar todo (nombre repetido incluido): esto es para que
 * el error aparezca mientras se escribe.
 */

export const TIPOS_PRODUCTO: TipoProducto[] = ['vacuna', 'antiparasitario', 'vitamina', 'antibiotico', 'otro'];
export const UNIDADES_DOSIS: UnidadDosis[] = ['ml', 'g', 'mg', 'dosis'];

/** Lo que se escribe, todo como texto. */
export interface FormularioProducto {
  nombre: string;
  tipo: TipoProducto | '';
  laboratorio: string;
  dosis: string;
  unidad: UnidadDosis | '';
}

export type ProblemaProducto = 'dosisInvalida' | 'dosisSinUnidad' | null;

export function formularioProducto(producto?: ProductoSanitario): FormularioProducto {
  return {
    nombre: producto?.nombre ?? '',
    tipo: producto?.tipo ?? '',
    laboratorio: producto?.laboratorio ?? '',
    dosis: producto?.dosis === null || producto?.dosis === undefined ? '' : String(producto.dosis),
    unidad: producto?.unidad ?? '',
  };
}

/** "2,5" y "2.5" son lo mismo; vacío es nulo; lo que no es número, NaN. */
export function leerDosis(texto: string): number | null {
  const limpio = texto.trim().replace(',', '.');
  return limpio === '' ? null : Number(limpio);
}

/** Mayor que cero, con dos decimales como mucho (como el servidor). */
export function dosisValida(valor: number): boolean {
  return Number.isFinite(valor) && valor > 0 && Math.abs(Math.round(valor * 100) - valor * 100) < 1e-6;
}

export function problemaProducto(formulario: FormularioProducto): ProblemaProducto {
  const dosis = leerDosis(formulario.dosis);
  if (dosis !== null && !dosisValida(dosis)) return 'dosisInvalida';
  // La dosis y su unidad van juntas, o ninguna de las dos.
  if ((dosis === null) !== (formulario.unidad === '')) return 'dosisSinUnidad';
  return null;
}

export function aDatosProducto(formulario: FormularioProducto): DatosProducto {
  return {
    nombre: formulario.nombre.trim(),
    tipo: formulario.tipo,
    laboratorio: formulario.laboratorio.trim() || null,
    dosis: leerDosis(formulario.dosis),
    unidad: formulario.unidad || null,
  };
}

/** "2,5 ml" o "2.5 ml", con los separadores del idioma. */
export function textoDosis(dosis: number | null, unidad: UnidadDosis | null): string | null {
  if (dosis === null || unidad === null) return null;
  const numero = new Intl.NumberFormat(localeActual(), { maximumFractionDigits: 2 }).format(dosis);
  return t(`sanidad.productos.unidades.${unidad}`, { n: numero });
}
