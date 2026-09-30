import { useCallback, useEffect, useState } from 'react';
import {
  HashRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { BarraDemostracion, Cargando } from './componentes';
import { PaginaIngreso } from './paginas/ingreso/PaginaIngreso';
import { PaginaLanding } from './paginas/landing/PaginaLanding';
import { PaginaRancho } from './paginas/ranchos/PaginaRancho';
import { PaginaRegistro } from './paginas/registro/PaginaRegistro';
import { PaginaSistemaDiseno } from './paginas/sistema-diseno/PaginaSistemaDiseno';
import { PaginaVerificacion } from './paginas/verificacion/PaginaVerificacion';
import { PaginaCambioContrasena } from './paginas/contrasena/PaginaCambioContrasena';
import { PaginaSolicitarRecuperacion } from './paginas/contrasena/PaginaSolicitarRecuperacion';
import { PaginaRestablecerContrasena } from './paginas/contrasena/PaginaRestablecerContrasena';
import { api, hayAlguienDentro, type EstadoCuenta } from './servicios/api';

/**
 * El enrutador y el portero del cliente.
 *
 * POR QUE HashRouter Y NO BrowserRouter
 * Con las direcciones normales, escribir /verificar en la barra del navegador
 * le pide ese archivo al servidor, que no existe, y da 404. Para que funcione
 * hay que configurar el servidor donde se publique. Con la almohadilla no hace
 * falta configurar nada y los enlaces de los correos ya emitidos siguen
 * sirviendo, porque son de la forma  /#/verificar?token=...
 *
 * EL PORTERO
 * Antes de dejar ver el sistema se pregunta al servidor como esta la cuenta
 * (GET /usuarios/yo). Si falta confirmar el correo (HU-07) o cambiar la
 * contraseña temporal (HU-10), no se llega a ninguna otra pantalla.
 *
 * Esto es lo que se ve; lo que vale es GuardiaCuentaLista, en el servidor.
 * Bloquear solo en el cliente no bloquea nada: cualquiera puede llamar al
 * servidor sin pasar por la pantalla.
 *
 *   /                        la landing si no hay nadie adentro; si lo hay,
 *                            el portero y el rancho (HU-15)
 *   /bienvenida              la landing siempre, aunque haya sesion
 *   /ingreso                 entrar con correo y contraseña (HU-08)
 *   /registro                crear cuenta de propietario (HU-06)
 *   /verificar               confirmar el correo (HU-07)
 *   /sistema-diseno          el catalogo del sistema de diseño (HU-05)
 *   /solicitar-recuperacion  pedir el enlace de recuperacion (HU-09)
 *   /recuperar-contrasena    poner la contraseña nueva (HU-09)
 */

function App() {
  return (
    <HashRouter>
      <Sistema />
    </HashRouter>
  );
}

function Sistema() {
  const [cuenta, setCuenta] = useState<EstadoCuenta | null>(null);
  const [cargando, setCargando] = useState(true);
  const navegar = useNavigate();
  const ubicacion = useLocation();

  // Se pregunta siempre, sin comprobar antes si hay usuario: si no lo hay, el
  // servidor responde que no y se resuelve igual.
  // Si no hay nadie adentro no se pregunta: la respuesta seria un 401 seguro
  // y la landing no necesita cuenta.
  const preguntarPorLaCuenta = useCallback(async () => {
    const estado = hayAlguienDentro() ? await api.yo().catch(() => null) : null;
    setCuenta(estado);
    setCargando(false);
  }, []);

  /**
   * El paso siguiente del alta, una vez confirmado el correo.
   *
   * Lo llaman el registro y la verificacion. Navega Y vuelve a preguntar por
   * la cuenta: sin lo segundo, el portero devolveria al usuario a la misma
   * pantalla de la que acaba de salir.
   */
  const seguirAlRancho = useCallback(() => {
    navegar('/');
    setCargando(true);
    void preguntarPorLaCuenta();
  }, [navegar, preguntarPorLaCuenta]);

  // Al cambiar de pantalla se vuelve a preguntar: entre una y otra la cuenta
  // pudo haber cambiado de estado.
  useEffect(() => {
    let vigente = true;
    void (async () => {
      const estado = hayAlguienDentro() ? await api.yo().catch(() => null) : null;
      if (!vigente) return;
      setCuenta(estado);
      setCargando(false);
    })();
    return () => {
      vigente = false;
    };
  }, [ubicacion.pathname]);

  return (
    <>
      <Routes>
        {/* Estas tres se ven siempre: son la salida de los bloqueos y el
            catalogo. */}
        <Route
          path="/registro"
          element={<PaginaRegistro alConfirmar={seguirAlRancho} />}
        />
        <Route
          path="/verificar"
          element={
            <PaginaVerificacion
              correo={cuenta?.correo}
              alConfirmar={seguirAlRancho}
            />
          }
        />
        <Route path="/sistema-diseno" element={<PaginaSistemaDiseno />} />

        {/* HU-08. Fuera del portero: es justamente la puerta de entrada. */}
        <Route
          path="/ingreso"
          element={<PaginaIngreso alIngresar={seguirAlRancho} />}
        />
        <Route path="/iniciar-sesion" element={<Navigate to="/ingreso" replace />} />

        {/* La landing. En "/" solo la ve quien no entro; aca la ve cualquiera,
            para mostrarla en una demostracion sin tener que cerrar sesion. */}
        <Route path="/bienvenida" element={<PaginaLanding />} />

        {/* HU-09. Tambien fuera del portero: quien no puede entrar es
            justamente quien necesita recuperar su contraseña. */}
        <Route
          path="/solicitar-recuperacion"
          element={<PaginaSolicitarRecuperacion />}
        />
        <Route
          path="/recuperar-contrasena"
          element={<PaginaRestablecerContrasena />}
        />

        <Route
          path="/"
          element={hayAlguienDentro() ? elPortero() : <PaginaLanding />}
        />
        {/* Cualquier otra direccion vuelve al principio. */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Provisional. Se borra junto con HU-08. */}
      <BarraDemostracion />
    </>
  );

  function elPortero() {
    if (cargando) {
      return (
        <main className="pagina pagina-angosta">
          <Cargando />
        </main>
      );
    }

    // Habia alguien guardado en el navegador pero el servidor no lo reconoce:
    // la sesion vencio o la cuenta ya no existe. Se le pide entrar de nuevo.
    if (!cuenta) {
      return <PaginaIngreso alIngresar={seguirAlRancho} />;
    }

    if (cuenta.pendiente === 'verificar_correo') {
      return (
        <PaginaVerificacion correo={cuenta.correo} alConfirmar={seguirAlRancho} />
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