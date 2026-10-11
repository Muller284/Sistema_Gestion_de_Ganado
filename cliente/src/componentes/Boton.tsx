import type { ButtonHTMLAttributes, ReactNode } from 'react';

/**
 * HU-05 · Boton.
 *
 * Las cinco variantes del sistema de diseño:
 *   primario     la accion que la pantalla quiere que se haga. Una por pantalla.
 *   secundario   acciones de apoyo: editar, volver.
 *   fantasma     acciones de poco peso: cancelar, un enlace dentro de una lista.
 *   destructivo  dar de baja, expulsar.
 *   plan         SOLO planes y suscripcion. Es el unico boton con el dorado.
 *
 * movil sube el alto a 52 px, que es lo que exige el inventario de pantallas
 * para lo tocable.
 */

type VarianteBoton =
  | 'primario'
  | 'secundario'
  | 'fantasma'
  | 'destructivo'
  | 'plan';

interface PropiedadesBoton extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: VarianteBoton;
  bloque?: boolean;
  movil?: boolean;
  children: ReactNode;
}

export function Boton({
  variante = 'secundario',
  bloque = false,
  movil = false,
  className,
  type = 'button',
  children,
  ...resto
}: PropiedadesBoton) {
  const clases = ['btn', `btn-${variante}`];
  if (bloque) clases.push('btn-bloque');
  if (movil) clases.push('btn-movil');
  if (className) clases.push(className);

  return (
    <button type={type} className={clases.join(' ')} {...resto}>
      {children}
    </button>
  );
}
