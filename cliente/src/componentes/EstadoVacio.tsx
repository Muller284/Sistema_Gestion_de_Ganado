import type { ReactNode } from 'react';

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
  /** Por defecto es un corral. Se puede pasar otro. */
  icono?: ReactNode;
}

function IconoCorral() {
  return (
    <svg
      className="ico ico-grande"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 8h18" />
      <path d="M3 14h18" />
      <path d="M6 4v16" />
      <path d="M12 4v16" />
      <path d="M18 4v16" />
    </svg>
  );
}

export function EstadoVacio({
  titulo,
  texto,
  accion,
  icono,
}: PropiedadesEstadoVacio) {
  return (
    <div className="vacio">
      {icono ?? <IconoCorral />}
      <h3 className="h3">{titulo}</h3>
      <p className="cuerpo c-600">{texto}</p>
      {accion}
    </div>
  );
}
