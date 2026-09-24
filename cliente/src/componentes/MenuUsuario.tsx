import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { inicial } from '../servicios/texto';
import { Icono } from './Iconos';

/**
 * El círculo con la inicial, arriba a la derecha, ahora es un botón de verdad.
 *
 * QUÉ ABRE Y QUÉ NO
 * Abre una tarjeta con quién eres, tu rol y tu rancho, y un atajo al panel.
 * NO tiene cerrar sesión: eso es HU-12 y es de Favio. Aparece apagado y con su
 * historia, igual que los módulos del menú lateral que llegan en otra fase.
 * Poner un botón que no cierra nada sería peor que no ponerlo.
 *
 * Se cierra con Escape, al hacer clic afuera y al elegir algo, que es lo que
 * cualquiera espera de un menú.
 */

interface Propiedades {
  nombre: string;
  rol: string;
  rancho?: string | null;
  correo?: string;
}

export function MenuUsuario({ nombre, rol, rancho, correo }: Propiedades) {
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;

    function alTeclear(evento: KeyboardEvent) {
      if (evento.key === 'Escape') setAbierto(false);
    }
    function alTocarAfuera(evento: MouseEvent) {
      if (!caja.current?.contains(evento.target as Node)) setAbierto(false);
    }

    document.addEventListener('keydown', alTeclear);
    document.addEventListener('mousedown', alTocarAfuera);
    return () => {
      document.removeEventListener('keydown', alTeclear);
      document.removeEventListener('mousedown', alTocarAfuera);
    };
  }, [abierto]);

  return (
    <div className="menu-usuario" ref={caja}>
      <button
        type="button"
        className="avatar-inicial avatar-boton"
        onClick={() => setAbierto((previo) => !previo)}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-label={`Cuenta de ${nombre}`}
      >
        {inicial(nombre)}
      </button>

      {abierto && (
        <div className="menu-usuario__tarjeta" role="menu">
          <div className="menu-usuario__quien">
            <span className="avatar-inicial">{inicial(nombre)}</span>
            <span>
              <strong>{nombre}</strong>
              <span className="pie c-500">{correo ?? rol}</span>
            </span>
          </div>

          <dl className="menu-usuario__datos">
            <dt>Rol</dt>
            <dd>{rol}</dd>
            <dt>Rancho</dt>
            <dd>{rancho ?? 'Sin rancho todavía'}</dd>
          </dl>

          <Link
            className="menu-usuario__accion"
            to="/"
            role="menuitem"
            onClick={() => setAbierto(false)}
          >
            <Icono nombre="casa" tamano={18} />
            Ir a mi rancho
          </Link>

          <span
            className="menu-usuario__accion desactivado"
            aria-disabled="true"
            title="Llega con el manejo de sesión (HU-12)"
          >
            <Icono nombre="entrar" tamano={18} />
            Cerrar sesión
            <span className="pie">HU-12</span>
          </span>
        </div>
      )}
    </div>
  );
}
