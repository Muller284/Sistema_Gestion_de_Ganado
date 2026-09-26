import { useState } from 'react';
import {
  Alerta,
  Boton,
  CampoTexto,
  DisenoAcceso,
  Icono,
} from '../../componentes';
import { api, guardarSesion } from '../../servicios/api';

/**
 * HU-08 · Inicio de sesión.
 *
 * Criterios de aceptación:
 *   1. Si las credenciales son correctas entro al sistema.
 *   2. Si no lo son, el mensaje no revela si el error fue el correo o la contraseña.
 *   3. Las contraseñas se guardan con función de hash (scrypt), nunca en texto plano.
 */
interface Propiedades {
  /** Se invoca tras un inicio de sesión exitoso para que App actualice el estado y avance. */
  alIngresar?: () => void;
}

export function PaginaIngreso({ alIngresar }: Propiedades) {
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  async function manejarIngreso(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!correo.trim() || !contrasena) {
      setError('Por favor ingresa tu correo y contraseña.');
      return;
    }

    setEnviando(true);
    try {
      const respuesta = await api.ingresar({
        correo: correo.trim(),
        contrasena,
      });

      // HU-12: Guardar tokens de acceso y refresco
      guardarSesion(
        respuesta.token_acceso,
        respuesta.token_refresco,
        respuesta.usuario,
      );

      if (alIngresar) {
        alIngresar();
      } else {
        window.location.hash = '#/';
        window.location.reload();
      }
    } catch (err) {
      setError((err as Error).message || 'Correo o contraseña incorrectos.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <DisenoAcceso
      titulo="Bienvenido de vuelta"
      bajada="Ingresa tus credenciales para acceder a la gestión de tu rancho."
    >
      <div className="bloque-acceso">
        <h2 className="titulo-seccion">Iniciar sesión</h2>

        {error && (
          <div style={{ marginBottom: '1.25rem' }}>
            <Alerta variante="error">{error}</Alerta>
          </div>
        )}

        <form onSubmit={manejarIngreso} className="formulario-columna">
          <CampoTexto
            etiqueta="Correo electrónico"
            obligatorio
            type="email"
            autoComplete="email"
            placeholder="tu@ejemplo.com"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
          />

          <CampoTexto
            etiqueta="Contraseña"
            obligatorio
            type="password"
            autoComplete="current-password"
            placeholder="Tu contraseña"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
          />

          <Boton
            type="submit"
            variante="primario"
            bloque
            disabled={enviando}
          >
            <Icono nombre="entrar" tamano={18} />
            {enviando ? 'Ingresando…' : 'Ingresar al sistema'}
          </Boton>
        </form>

        <p className="pie c-500 centrado" style={{ marginTop: '1.5rem' }}>
          ¿No tienes una cuenta de propietario todavía?{' '}
          <a
            href="#/registro"
            className="enlace"
            style={{ fontWeight: 600 }}
          >
            Registrarse aquí
          </a>
        </p>
      </div>
    </DisenoAcceso>
  );
}
