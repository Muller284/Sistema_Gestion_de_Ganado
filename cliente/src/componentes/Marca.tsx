import { Icono } from './Iconos';

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
      <span>Gestión de Ganado</span>
    </>
  );
  return como === 'a' ? (
    <a className="acceso__marca" href="#/">
      {contenido}
    </a>
  ) : (
    <span className="acceso__marca">{contenido}</span>
  );
}
