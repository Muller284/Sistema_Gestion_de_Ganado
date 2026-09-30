import { useLayoutEffect, useRef } from 'react';

/**
 * Un filtro de pocas opciones, como pestañas chicas: "Todos · Socios · …".
 *
 * La marca de la opción elegida se DESLIZA hasta la nueva en lugar de saltar.
 * Para eso se mide el botón elegido y se mueve una sola pieza de fondo, con
 * transform, que es lo que el navegador anima sin esfuerzo.
 *
 * Es un grupo de botones con aria-pressed y no un <select>: las opciones se
 * ven todas de una vez, que es la gracia de un filtro así.
 */

export interface OpcionSegmento<T extends string> {
  clave: T;
  nombre: string;
  /** Si está, se muestra al lado del nombre: "Socios 2". */
  cantidad?: number;
}

interface Propiedades<T extends string> {
  opciones: OpcionSegmento<T>[];
  valor: T;
  alCambiar: (valor: T) => void;
  etiqueta: string;
}

export function Segmentos<T extends string>({ opciones, valor, alCambiar, etiqueta }: Propiedades<T>) {
  const caja = useRef<HTMLDivElement>(null);
  const marca = useRef<HTMLSpanElement>(null);

  // Se mide antes de que el navegador pinte, para que la marca nunca aparezca
  // un cuadro en el lugar equivocado. También al cambiar el tamaño de la
  // ventana, porque los botones pueden pasar a otra línea. Se escribe directo
  // en el estilo y no en el estado: es solo posición, React no necesita saberla.
  useLayoutEffect(() => {
    const medir = () => {
      const elegido = caja.current?.querySelector<HTMLButtonElement>('button[aria-pressed="true"]');
      const pieza = marca.current;
      if (!elegido || !pieza) return;
      pieza.style.transform = `translate(${elegido.offsetLeft}px, ${elegido.offsetTop}px)`;
      pieza.style.width = `${elegido.offsetWidth}px`;
      pieza.style.height = `${elegido.offsetHeight}px`;
      pieza.style.opacity = '1';
    };
    medir();
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, [valor, opciones]);

  return (
    <div className="segmentos" role="group" aria-label={etiqueta} ref={caja}>
      <span className="segmentos__marca" aria-hidden="true" ref={marca} />
      {opciones.map((opcion) => (
        <button
          key={opcion.clave}
          type="button"
          aria-pressed={opcion.clave === valor}
          className={opcion.clave === valor ? 'activo' : undefined}
          onClick={() => opcion.clave !== valor && alCambiar(opcion.clave)}
        >
          {opcion.nombre}
          {opcion.cantidad !== undefined && (
            <span className="segmentos__cantidad">{opcion.cantidad}</span>
          )}
        </button>
      ))}
    </div>
  );
}
