import { Link } from 'react-router-dom';
import { Icono } from './Iconos';
import { t } from '../servicios/idioma';

/**
 * La marca del sistema: el ícono de caravana más el nombre.
 *
 * El ícono es una caravana de ganado, que es lo que identifica a cada animal
 * y lo que da nombre al dorado de la paleta.
 */
export function IconoMarca({ tamano = 20 }: { tamano?: number }) {
  return <Icono nombre="caravana" tamano={tamano} />;
}

export function Marca({ como = 'span' }: { como?: 'span' | 'a' }) {
  const contenido = (
    <>
      <IconoMarca />
      <span>{t('app.nombreSistema')}</span>
    </>
  );
  return como === 'a' ? (
    <Link className="acceso__marca" to="/">
      {contenido}
    </Link>
  ) : (
    <span className="acceso__marca">{contenido}</span>
  );
}
