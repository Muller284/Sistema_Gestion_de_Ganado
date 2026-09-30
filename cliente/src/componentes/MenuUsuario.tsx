import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../servicios/api';
import { inicial } from '../servicios/texto';
import { Icono } from './Iconos';

/**
 * El círculo con la inicial, arriba a la derecha, ahora es un botón de verdad.
 *
 * QUÉ ABRE Y QUÉ NO
 * Abre una tarjeta con quién eres, tu rol y tu rancho, un atajo al panel y el
 * cierre de sesión. El cierre es el de HU-12 (Favio): api.cerrarSesion revoca
 * el token de refresco en el servidor y limpia el navegador. Antes estaba
 * apagado esperando esa historia; en la integración se conectó acá en lugar
 * del botón suelto que traía la barra superior, para no tener dos lugares
 * distintos que hacen lo mismo.
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
  const [saliendo, setSaliendo] = useState(false);
  const navegar = useNavigate();
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

  async function cerrarSesion() {
    setSaliendo(true);
    // Aunque el servidor no conteste, api.cerrarSesion limpia el navegador en
    // su finally: la sesión local se cierra siempre.
    await api.cerrarSesion().catch(() => undefined);
    setAbierto(false);
    navegar('/ingreso');
  }

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

          <button
            type="button"
            className="menu-usuario__accion"
            role="menuitem"
            disabled={saliendo}
            onClick={cerrarSesion}
          >
            <Icono nombre="salir" tamano={18} />
            {saliendo ? 'Cerrando…' : 'Cerrar sesión'}
          </button>
        </div>
      )}
    </div>
  );
}
