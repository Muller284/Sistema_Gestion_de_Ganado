import type { ReactNode } from 'react';
import { Icono, type NombreIcono } from './Iconos';

/**
 * HU-05 · Estado vacio.
 *
 * Lo que se ve cuando todavia no hay datos. El inventario de pantallas lo
 * define asi: icono, titulo, explicacion corta y un boton que resuelva el
 * vacio. Una pantalla vacia sin explicacion parece un error del sistema.
 */

interface PropiedadesEstadoVacio {
  titulo: string;
  texto: string;
  /** El boton que resuelve el vacio. Opcional: a veces no hay nada que hacer. */
  accion?: ReactNode;
  /** Por defecto es un corral. Se puede pasar otro de los del sistema. */
  icono?: NombreIcono;
}

export function EstadoVacio({
  titulo,
  texto,
  accion,
  icono = 'corral',
}: PropiedadesEstadoVacio) {
  return (
    <div className="vacio">
      <Icono nombre={icono} tamano={48} className="ico-grande" />
      <h3 className="h3">{titulo}</h3>
      <p className="cuerpo c-600">{texto}</p>
      {accion}
    </div>
  );
}
