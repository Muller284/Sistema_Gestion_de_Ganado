import { useCallback, useEffect, useState } from 'react';
import { BarraDemostracion, Cargando } from './componentes';
import { PaginaRancho } from './paginas/ranchos/PaginaRancho';
import { PaginaRegistro } from './paginas/registro/PaginaRegistro';
import { PaginaSistemaDiseno } from './paginas/sistema-diseno/PaginaSistemaDiseno';
import { PaginaVerificacion } from './paginas/verificacion/PaginaVerificacion';
import { PaginaCambioContrasena } from './paginas/contrasena/PaginaCambioContrasena';
import { api, type EstadoCuenta } from './servicios/api';

/**
 * Navegacion provisional por la direccion del navegador, y el portero del
 * cliente.
 *
 * EL PORTERO
 * Antes de dejar ver cualquier pantalla se pregunta al servidor como esta la
 * cuenta (GET /usuarios/yo). Si falta confirmar el correo (HU-07) o cambiar la
 * contraseña temporal (HU-10), no se llega a ninguna otra pantalla: se muestra
 * la que resuelve eso y nada mas.
 *
 * Esto es lo que se ve; lo que vale es GuardiaCuentaLista, en el servidor.
 * Bloquear solo en el cliente no bloquea nada: cualquiera puede llamar al
 * servidor sin pasar por la pantalla.
 *
 * No se instala un enrutador: la regla del equipo es que las dependencias las
 * instala Favio. Cuando exista el inicio de sesion (HU-08) esto se reemplaza
 * por un enrutador de verdad y ninguna pantalla se entera.
 *
 *   #/                 el rancho (HU-15)
 *   #/registro         crear cuenta de propietario (HU-06)
 *   #/verificar        confirmar el correo (HU-07)
 *   #/sistema-diseno   el catalogo del sistema de diseño (HU-05)
 */

function rutaActual() {
  return window.location.hash.replace(/^#\/?/, '').split('?')[0];
}

function App() {
  const [ruta, setRuta] = useState(rutaActual());
  const [cuenta, setCuenta] = useState<EstadoCuenta | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const alCambiar = () => setRuta(rutaActual());
    window.addEventListener('hashchange', alCambiar);
    return () => window.removeEventListener('hashchange', alCambiar);
  }, []);

  // Se pregunta siempre, sin comprobar antes si hay usuario: si no lo hay, el
  // servidor responde que no y se resuelve igual.
  const preguntarPorLaCuenta = useCallback(async () => {
    const estado = await api.yo().catch(() => null);
    setCuenta(estado);
    setCargando(false);
  }, []);

  useEffect(() => {
    let vigente = true;
    void (async () => {
      const estado = await api.yo().catch(() => null);
      if (!vigente) return;
      setCuenta(estado);
      setCargando(false);
    })();
    return () => {
      vigente = false;
    };
  }, [ruta]);

  return (
    <>
      {elegirPantalla()}
      {/* Provisional. Se borra junto con HU-08. */}
      <BarraDemostracion />
    </>
  );

  function elegirPantalla() {
    // Estas tres se ven siempre: son la salida de los bloqueos y el catalogo.
    if (ruta === 'registro') return <PaginaRegistro />;
    if (ruta === 'verificar') return <PaginaVerificacion correo={cuenta?.correo} />;
    if (ruta === 'sistema-diseno') return <PaginaSistemaDiseno />;

    if (cargando) {
      return (
        <main className="pagina pagina-angosta">
          <Cargando />
        </main>
      );
    }

    // El portero.
    if (cuenta?.pendiente === 'verificar_correo') {
      return <PaginaVerificacion correo={cuenta.correo} />;
    }
    if (cuenta?.pendiente === 'cambiar_contrasena') {
      return (
        <PaginaCambioContrasena
          nombre={cuenta.nombre}
          alTerminar={() => {
            setCargando(true);
            void preguntarPorLaCuenta();
          }}
        />
      );
    }

    return <PaginaRancho />;
  }
}

export default App;
