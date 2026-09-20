import type { ReactNode } from 'react';
import { Icono, type NombreIcono } from './Iconos';

/**
 * HU-05 · Aviso.
 *
 * El error y la confirmacion de una accion. No esta en la lista de los cinco
 * componentes del criterio, pero el archivo de estilos ya traia las clases
 * .aviso y toda pantalla lo necesita: sin el, cada uno termina pintando su
 * propio rojo a mano, que es justo lo que HU-05 impide.
 *
 * Cada variante lleva su icono. No es adorno: el color solo no alcanza para
 * quien no distingue el rojo del verde, y la forma del icono si se distingue.
 * Por eso mismo el icono nunca va solo, siempre acompaña al texto.
 *
 * Los avisos de error se anuncian solos a los lectores de pantalla.
 */

type VarianteAlerta = 'exito' | 'error' | 'adv' | 'info' | 'plan';

const ICONOS: Record<VarianteAlerta, NombreIcono> = {
  exito: 'exito',
  error: 'error',
  adv: 'advertencia',
  info: 'info',
  plan: 'plan',
};

interface PropiedadesAlerta {
  variante: VarianteAlerta;
  children: ReactNode;
}

export function Alerta({ variante, children }: PropiedadesAlerta) {
  const urgente = variante === 'error';

  return (
    <div className={`aviso aviso-${variante}`} role={urgente ? 'alert' : 'status'}>
      <Icono nombre={ICONOS[variante]} />
      <p>{children}</p>
    </div>
  );
}
