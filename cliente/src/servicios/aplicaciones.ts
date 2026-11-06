import type { AplicacionSanitaria, DatosAplicacion, EsquemaElegible, OpcionesAplicacion } from './api';
import { t } from './idioma';
import { dosisValida, leerDosis, textoDosis } from './productos';

/**
 * HU-48 · Lo que el formulario de una aplicación controla antes de mandar. El
 * servidor vuelve a validar todo: esto es para que el error aparezca mientras
 * se escribe.
 */

/** Lo que se escribe, todo como texto. */
export interface FormularioAplicacion {
  producto_id: string;
  fecha: string;
  dosis: string;
  esquema_id: string;
  /** '' es «refuerzo»: el esquema ya completó su serie. */
  numero_dosis: string;
  aplicado_por: string;
  observacion: string;
}

export type ProblemaAplicacion = 'fechaFutura' | 'antesDeNacer' | 'dosisInvalida' | null;

/** Hoy y aplicado por quien la registra: es lo más común en la manga. */
export function formularioAplicacion(hoy: string, quienId: string): FormularioAplicacion {
  return {
    producto_id: '',
    fecha: hoy,
    dosis: '',
    esquema_id: '',
    numero_dosis: '',
    aplicado_por: quienId,
    observacion: '',
  };
}

/** Los esquemas que usan el producto elegido: no tiene sentido otro. */
export function esquemasDelProducto(esquemas: EsquemaElegible[], productoId: string): EsquemaElegible[] {
  return productoId ? esquemas.filter((esquema) => esquema.producto_id === productoId) : [];
}

/**
 * Al cambiar de producto, la dosis sugerida es la del catálogo y el esquema
 * se limpia si era de otro producto.
 */
export function conProducto(
  formulario: FormularioAplicacion,
  productoId: string,
  opciones: OpcionesAplicacion,
): FormularioAplicacion {
  const producto = opciones.productos.find((p) => p.id === productoId);
  const esquemas = esquemasDelProducto(opciones.esquemas, productoId);
  const sigueElEsquema = esquemas.some((esquema) => esquema.id === formulario.esquema_id);
  return {
    ...formulario,
    producto_id: productoId,
    dosis: producto?.dosis === null || producto?.dosis === undefined ? '' : String(producto.dosis),
    esquema_id: sigueElEsquema ? formulario.esquema_id : '',
    numero_dosis: sigueElEsquema ? formulario.numero_dosis : '',
  };
}

export function problemaAplicacion(
  formulario: FormularioAplicacion,
  hoy: string,
  nacimiento: string | null,
): ProblemaAplicacion {
  // Las fechas AAAA-MM-DD se comparan bien como texto.
  if (formulario.fecha && formulario.fecha > hoy) return 'fechaFutura';
  if (formulario.fecha && nacimiento && formulario.fecha < nacimiento) return 'antesDeNacer';
  const dosis = leerDosis(formulario.dosis);
  if (dosis !== null && !dosisValida(dosis)) return 'dosisInvalida';
  return null;
}

export function aDatosAplicacion(formulario: FormularioAplicacion): DatosAplicacion {
  const conEsquema = formulario.esquema_id !== '';
  return {
    producto_id: formulario.producto_id,
    fecha: formulario.fecha,
    dosis: leerDosis(formulario.dosis),
    esquema_id: conEsquema ? formulario.esquema_id : null,
    numero_dosis: conEsquema && formulario.numero_dosis !== '' ? Number(formulario.numero_dosis) : null,
    aplicado_por: formulario.aplicado_por || null,
    observacion: formulario.observacion.trim() || null,
  };
}

/** "Vacuna · 2 ml · dosis 1 de Aftosa (todo el rodeo)". */
export function detalleAplicacion(aplicacion: AplicacionSanitaria): string {
  const partes = [t(`sanidad.productos.tipos.${aplicacion.producto_tipo}`)];
  const dosis = textoDosis(aplicacion.dosis, aplicacion.unidad);
  if (dosis) partes.push(dosis);
  if (aplicacion.esquema_nombre) {
    partes.push(
      aplicacion.numero_dosis
        ? t('sanidad.aplicaciones.dosisDelEsquema', { n: aplicacion.numero_dosis, esquema: aplicacion.esquema_nombre })
        : t('sanidad.aplicaciones.refuerzoDelEsquema', { esquema: aplicacion.esquema_nombre }),
    );
  }
  return partes.join(' · ');
}
