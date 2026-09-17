import type { ReactNode } from 'react';

/**
 * HU-05 · Aviso.
 *
 * El error y la confirmacion de una accion. No esta en la lista de los cinco
 * componentes del criterio, pero el archivo de estilos ya traia las clases
 * .aviso y toda pantalla lo necesita: sin el, cada uno termina pintando su
 * propio rojo a mano, que es justo lo que HU-05 impide.
 *
 * Los avisos de error se anuncian solos a los lectores de pantalla.
 */

type VarianteAlerta = 'exito' | 'error' | 'adv' | 'info' | 'plan';

interface PropiedadesAlerta {
  variante: VarianteAlerta;
  children: ReactNode;
}

export function Alerta({ variante, children }: PropiedadesAlerta) {
  const urgente = variante === 'error';

  return (
    <div className={`aviso aviso-${variante}`} role={urgente ? 'alert' : 'status'}>
      <p>{children}</p>
    </div>
  );
}
