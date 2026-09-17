import { useEffect, useState } from 'react';
import { PaginaRancho } from './paginas/ranchos/PaginaRancho';
import { PaginaSistemaDiseno } from './paginas/sistema-diseno/PaginaSistemaDiseno';

/**
 * Navegacion provisional por la direccion del navegador.
 *
 * No se instala un enrutador todavia: la regla del equipo es que las
 * dependencias las instala Favio, y con dos pantallas no hace falta. Cuando
 * existan las pantallas de acceso, esto se reemplaza por un enrutador de
 * verdad y ninguna pantalla se entera.
 *
 *   #/               el rancho (HU-15)
 *   #/sistema-diseno el catalogo del sistema de diseño (HU-05)
 */

function rutaActual() {
  return window.location.hash.replace(/^#\/?/, '');
}

function App() {
  const [ruta, setRuta] = useState(rutaActual());

  useEffect(() => {
    const alCambiar = () => setRuta(rutaActual());
    window.addEventListener('hashchange', alCambiar);
    return () => window.removeEventListener('hashchange', alCambiar);
  }, []);

  return (
    <>
      <nav className="barra-nav">
        <a href="#/">Mi rancho</a>
        <a href="#/sistema-diseno">Sistema de diseño</a>
      </nav>
      {ruta === 'sistema-diseno' ? <PaginaSistemaDiseno /> : <PaginaRancho />}
    </>
  );
}

export default App;
