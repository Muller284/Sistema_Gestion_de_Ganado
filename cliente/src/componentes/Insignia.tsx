import type { ReactNode } from 'react';

/**
 * HU-05 · Insignia.
 *
 * Etiqueta corta de estado. Nunca lleva una accion adentro.
 *
 * Las variantes de dominio son las del animal (activo, vendido, muerto,
 * archivado) y estan tal cual en los mockups. Las semanticas son las mismas
 * pero con nombre general, porque una insignia que dice "Sin verificar" no es
 * un animal archivado.
 *
 * La variante plan es el UNICO lugar del sistema donde aparece el dorado
 * caravana, y solo para planes, suscripcion y limites de plan. Es una regla
 * del inventario de pantallas y se revisa en la revision cruzada.
 */

type VarianteInsignia =
  | 'neutro'
  | 'exito'
  | 'info'
  | 'adv'
  | 'error'
  | 'plan'
  | 'activo'
  | 'vendido'
  | 'muerto'
  | 'archivado';

interface PropiedadesInsignia {
  variante?: VarianteInsignia;
  children: ReactNode;
}

export function Insignia({ variante = 'neutro', children }: PropiedadesInsignia) {
  return <span className={`insignia ins-${variante}`}>{children}</span>;
}
