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
import { t, tJsx } from '../../servicios/idioma';

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
      setError(t('acceso.ingreso.faltanDatos'));
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
        window.location.hash = '#/rancho';
        window.location.reload();
      }
    } catch (err) {
      setError((err as Error).message || t('acceso.ingreso.incorrectos'));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <DisenoAcceso
      icono="entrar"
      titulo={t('acceso.ingreso.titulo')}
      subtitulo={t('acceso.ingreso.subtitulo')}
      nota={tJsx('acceso.ingreso.sinCuenta', {
        enlace: (s) => <Link to="/registro">{s}</Link>,
      })}
    >
      <form onSubmit={manejarIngreso} className="col g16">
        {error && <Alerta variante="error">{error}</Alerta>}

        <CampoTexto
          etiqueta={t('acceso.comun.correo')}
          obligatorio
          type="email"
          autoComplete="email"
          placeholder={t('acceso.comun.correoEjemplo')}
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
        />

        <CampoTexto
          etiqueta={t('acceso.comun.contrasena')}
          obligatorio
          type="password"
          autoComplete="current-password"
          placeholder={t('acceso.ingreso.contrasenaEjemplo')}
          value={contrasena}
          onChange={(e) => setContrasena(e.target.value)}
        />

        <Link className="pie enlace-derecha" to="/solicitar-recuperacion">
          {t('acceso.ingreso.olvido')}
        </Link>

        <Boton type="submit" variante="primario" bloque disabled={enviando}>
          <Icono nombre="entrar" tamano={18} />
          {enviando ? t('acceso.ingreso.ingresando') : t('acceso.ingreso.ingresar')}
        </Boton>
      </form>
    </DisenoAcceso>
  );
}
