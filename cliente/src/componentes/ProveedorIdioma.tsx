import { Fragment, useEffect, type ReactNode } from 'react';
import { useIdioma } from '../servicios/idioma';

/**
 * HU-25. Envuelve la aplicación. Cuando cambia el idioma, vuelve a montar lo
 * de adentro para que todo se dibuje con los textos nuevos, y avisa al
 * navegador (lang) para que lectores de pantalla y correctores lo sepan.
 */
export function ProveedorIdioma({ children }: { children: ReactNode }) {
  const { idioma } = useIdioma();
  useEffect(() => {
    document.documentElement.lang = idioma;
  }, [idioma]);
  return <Fragment key={idioma}>{children}</Fragment>;
}
