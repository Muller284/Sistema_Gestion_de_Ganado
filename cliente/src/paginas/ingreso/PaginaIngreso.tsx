import { useState } from 'react';
import { Link } from 'react-router-dom';
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
 *
 * La lógica es la de Favio. En la integración se le devolvió lo que se había
 * perdido en el camino (guardar los tokens que responde el servidor, sin lo
 * cual el ingreso no dejaba a nadie adentro) y se pasó a las clases del
 * sistema de diseño, porque las que usaba no existían en ninguna hoja.
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

      // HU-12: se guardan los tokens de acceso y de refresco.
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
      icono="entrar"
      titulo="Bienvenido de vuelta"
      subtitulo="Ingresa tus credenciales para acceder a la gestión de tu rancho."
      nota={
        <>
          ¿No tienes cuenta todavía?{' '}
          <Link to="/registro">Crea una, son 10 días gratis</Link>
        </>
      }
    >
      <form onSubmit={manejarIngreso} className="col g16">
        {error && <Alerta variante="error">{error}</Alerta>}

        <CampoTexto
          etiqueta="Correo"
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

        <Link className="pie enlace-derecha" to="/solicitar-recuperacion">
          ¿Olvidaste tu contraseña?
        </Link>

        <Boton type="submit" variante="primario" bloque disabled={enviando}>
          <Icono nombre="entrar" tamano={18} />
          {enviando ? 'Ingresando…' : 'Ingresar'}
        </Boton>
      </form>
    </DisenoAcceso>
  );
}
