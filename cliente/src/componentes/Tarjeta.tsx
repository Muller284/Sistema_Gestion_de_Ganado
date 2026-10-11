import type { ReactNode } from 'react';

/**
 * HU-05 · Tarjeta.
 *
 * La caja en la que vive todo el contenido del sistema. Si no lleva titulo ni
 * pie es la tarjeta simple de los mockups; si los lleva, se divide en
 * cabecera, contenido y pie.
 */

interface PropiedadesTarjeta {
  titulo?: string;
  /** Va a la derecha del titulo: una insignia, un boton chico. */
  accion?: ReactNode;
  /** Va al pie, separado por una linea. Normalmente los botones. */
  pie?: ReactNode;
  children: ReactNode;
}

export function Tarjeta({ titulo, accion, pie, children }: PropiedadesTarjeta) {
  const conPartes = Boolean(titulo || accion || pie);

  if (!conPartes) {
    return <section className="tarjeta-borde">{children}</section>;
  }

  return (
    <section className="tarjeta-borde tarjeta-partes">
      {(titulo || accion) && (
        <header className="cabecera">
          {titulo && <h2 className="h3">{titulo}</h2>}
          {accion}
        </header>
      )}
      <div className="contenido">{children}</div>
      {pie && <footer className="pie-tarjeta">{pie}</footer>}
    </section>
  );
}

/** Lista de dato y valor para las fichas. */
export function Datos({ children }: { children: ReactNode }) {
  return <dl className="datos">{children}</dl>;
}

export function Dato({
  nombre,
  children,
}: {
  nombre: string;
  children: ReactNode;
}) {
  return (
    <>
      <dt>{nombre}</dt>
      <dd>{children}</dd>
    </>
  );
}
