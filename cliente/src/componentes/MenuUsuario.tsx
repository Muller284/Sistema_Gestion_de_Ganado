import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, soporteActual } from '../servicios/api';
import { SelectorIdioma } from './SelectorIdioma';
import { inicial } from '../servicios/texto';
import { Icono } from './Iconos';
import { existe, t } from '../servicios/idioma';

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

/** El nombre del rol en el idioma actual. Si no es un rol conocido ("—"), tal cual. */
function nombreDelRol(rol: string): string {
  return existe(`roles.${rol}`) ? t(`roles.${rol}`) : rol;
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
        aria-label={t('app.menuUsuario.cuentaDe', { nombre })}
      >
        {inicial(nombre)}
      </button>

      {abierto && (
        <div className="menu-usuario__tarjeta" role="menu">
          <div className="menu-usuario__quien">
            <span className="avatar-inicial">{inicial(nombre)}</span>
            <span>
              <strong>{nombre}</strong>
              <span className="pie c-500">{correo ?? nombreDelRol(rol)}</span>
            </span>
          </div>

          <dl className="menu-usuario__datos">
            <dt>{t('app.menuUsuario.rol')}</dt>
            <dd>{nombreDelRol(rol)}</dd>
            <dt>{t('app.menuUsuario.rancho')}</dt>
            <dd>{rancho ?? t('app.sinRancho')}</dd>
          </dl>

          {rol === 'admin_plataforma' && !soporteActual() ? (
            <Link
              className="menu-usuario__accion"
              to="/admin"
              role="menuitem"
              onClick={() => setAbierto(false)}
            >
              <Icono nombre="escudo" tamano={18} />
              {t('admin.menu')}
            </Link>
          ) : (
            <Link
              className="menu-usuario__accion"
              to="/rancho"
              role="menuitem"
              onClick={() => setAbierto(false)}
            >
              <Icono nombre="casa" tamano={18} />
              {t('app.menuUsuario.irAMiRancho')}
            </Link>
          )}

          <Link
            className="menu-usuario__accion"
            to="/perfil"
            role="menuitem"
            onClick={() => setAbierto(false)}
          >
            <Icono nombre="persona" tamano={18} />
            {t('app.miPerfil')}
          </Link>

          {/* HU-25: el idioma a mano, sin ir hasta Mi perfil. */}
          <div className="menu-usuario__idioma">
            <SelectorIdioma />
          </div>

          <button
            type="button"
            className="menu-usuario__accion"
            role="menuitem"
            disabled={saliendo}
            onClick={cerrarSesion}
          >
            <Icono nombre="salir" tamano={18} />
            {saliendo ? t('app.menuUsuario.cerrando') : t('app.menuUsuario.cerrarSesion')}
          </button>
        </div>
      )}
    </div>
  );
}
