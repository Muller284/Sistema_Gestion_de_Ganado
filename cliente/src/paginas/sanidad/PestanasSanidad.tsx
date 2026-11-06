import { NavLink } from 'react-router-dom';
import { t } from '../../servicios/idioma';

/**
 * Las secciones del módulo de sanidad. El calendario (HU-50) y los esquemas
 * (HU-47) son de este sprint; el catálogo de productos (HU-46) y las
 * aplicaciones (HU-48 y HU-49) se suman como una pestaña más en PESTANAS.
 */
const PESTANAS = [
  { ruta: '/sanidad', clave: 'sanidad.pestanas.calendario' },
  { ruta: '/sanidad/esquemas', clave: 'sanidad.pestanas.esquemas' },
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
