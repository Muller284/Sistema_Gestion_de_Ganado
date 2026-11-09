import { NavLink } from 'react-router-dom';
import { t } from '../../servicios/idioma';

/**
 * Las secciones del módulo de sanidad: el calendario (HU-50), los esquemas
 * (HU-47), el catálogo de productos (HU-46) y el registro desde el celular
 * (HU-52). Las aplicaciones también se registran desde la ficha de cada
 * animal (HU-48) y desde el listado, de a muchos (HU-49).
 */
const PESTANAS = [
  { ruta: '/sanidad', clave: 'sanidad.pestanas.calendario' },
  { ruta: '/sanidad/esquemas', clave: 'sanidad.pestanas.esquemas' },
  { ruta: '/sanidad/productos', clave: 'sanidad.pestanas.productos' },
  { ruta: '/sanidad/registro-rapido', clave: 'sanidad.pestanas.rapido' },
];

export function PestanasSanidad() {
  return (
    <nav className="sanidad__pestanas" aria-label={t('sanidad.pestanas.etiqueta')}>
      {PESTANAS.map((pestana) => (
        <NavLink
          key={pestana.ruta}
          to={pestana.ruta}
          end
          className={({ isActive }) => (isActive ? 'sanidad__pestana activa' : 'sanidad__pestana')}
        >
          {t(pestana.clave)}
        </NavLink>
      ))}
    </nav>
  );
}
