import { useCallback, useEffect, useState } from 'react';
import { BarraDemostracion, Cargando } from './componentes';
import { PaginaRancho } from './paginas/ranchos/PaginaRancho';
import { PaginaRegistro } from './paginas/registro/PaginaRegistro';
import { PaginaIngreso } from './paginas/ingreso/PaginaIngreso';
import { PaginaSistemaDiseno } from './paginas/sistema-diseno/PaginaSistemaDiseno';
import { PaginaVerificacion } from './paginas/verificacion/PaginaVerificacion';
import { PaginaCambioContrasena } from './paginas/contrasena/PaginaCambioContrasena';
import { api, type EstadoCuenta } from './servicios/api';

/**
 * Navegación y portero del cliente.
 *
 * Rutas soportadas:
 *   #/                 el rancho (HU-15)
 *   #/ingreso          inicio de sesión (HU-08)
 *   #/registro         crear cuenta de propietario (HU-06)
 *   #/verificar        confirmar el correo (HU-07)
 *   #/sistema-diseno   catálogo del sistema de diseño (HU-05)
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

  const preguntarPorLaCuenta = useCallback(async () => {
    const estado = await api.yo().catch(() => null);
    setCuenta(estado);
    setCargando(false);
  }, []);

  const seguirAlRancho = useCallback(() => {
    window.location.hash = '#/';
    setCargando(true);
    void preguntarPorLaCuenta();
  }, [preguntarPorLaCuenta]);

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
      {/* Barra de demostración para alternar roles sin desconectarse */}
      <BarraDemostracion />
    </>
  );

  function elegirPantalla() {
    // Rutas públicas directas
    if (ruta === 'ingreso' || ruta === 'iniciar-sesion') {
      return <PaginaIngreso alIngresar={seguirAlRancho} />;
    }
    if (ruta === 'registro') {
      return <PaginaRegistro alConfirmar={seguirAlRancho} />;
    }
    if (ruta === 'verificar') {
      return (
        <PaginaVerificacion
          correo={cuenta?.correo}
          alConfirmar={seguirAlRancho}
        />
      );
    }
    if (ruta === 'sistema-diseno') return <PaginaSistemaDiseno />;

    if (cargando) {
      return (
        <main className="pagina pagina-angosta">
          <Cargando />
        </main>
      );
    }

    // Si no hay cuenta autenticada ni usuario demo seleccionado, ir a inicio de sesión
    if (!cuenta) {
      return <PaginaIngreso alIngresar={seguirAlRancho} />;
    }

    // El portero de seguridad
    if (cuenta.pendiente === 'verificar_correo') {
      return (
        <PaginaVerificacion
          correo={cuenta.correo}
          alConfirmar={seguirAlRancho}
        />
      );
    }
    if (cuenta.pendiente === 'cambiar_contrasena') {
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
