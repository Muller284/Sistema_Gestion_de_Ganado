import { useEffect, useState } from 'react';
import { Alerta, Boton, CampoTexto, Cargando, DisenoAcceso, Icono } from '../../componentes';
import { api } from '../../servicios/api';

/**
 * HU-07 · Verificación de correo.
 *
 * La misma pantalla resuelve las tres situaciones, porque son el mismo momento
 * visto desde distintos lados:
 *
 *   confirmando   se abrio el enlace del correo y se esta comprobando
 *   confirmado    quedo lista
 *   pendiente     todavia no confirmo, o el enlace vencio: se ofrece el reenvio
 *
 * El enlace del correo apunta a  #/verificar?token=...  y esta pantalla manda
 * el token al servidor por POST. Asi el token no queda escrito en los
 * registros de acceso de los servidores por los que pasa la peticion.
 */

interface Propiedades {
  /** El correo de la cuenta, cuando se conoce. Evita tener que escribirlo. */
  correo?: string;
}

function tokenDeLaDireccion(): string {
  // El hash viene como "#/verificar?token=abc". URLSearchParams no lee el
  // hash, asi que se corta a mano lo que hay despues del signo de pregunta.
  const hash = window.location.hash;
  const signo = hash.indexOf('?');
  if (signo === -1) return '';
  return new URLSearchParams(hash.slice(signo + 1)).get('token') ?? '';
}

export function PaginaVerificacion({ correo = '' }: Propiedades) {
  const token = tokenDeLaDireccion();
  const [estado, setEstado] = useState<'confirmando' | 'confirmado' | 'pendiente'>(
    token ? 'confirmando' : 'pendiente',
  );
  const [error, setError] = useState('');
  const [correoEscrito, setCorreoEscrito] = useState(correo);
  const [aviso, setAviso] = useState('');
  const [enlace, setEnlace] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!token) return;
    let vigente = true;
    void (async () => {
      try {
        await api.verificarCorreo(token);
        if (vigente) setEstado('confirmado');
      } catch (e) {
        if (!vigente) return;
        setError((e as Error).message);
        setEstado('pendiente');
      }
    })();
    return () => {
      vigente = false;
    };
  }, [token]);

  async function reenviar() {
    setError('');
    setAviso('');
    setEnlace(null);
    setEnviando(true);
    try {
      const respuesta = await api.reenviarVerificacion(correoEscrito);
      setAviso(respuesta.mensaje);
      setEnlace(respuesta.enlace);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  if (estado === 'confirmando') {
    return (
      <DisenoAcceso icono="correo" titulo="Confirmando tu correo" subtitulo="Un momento.">
        <Cargando lineas={2} />
      </DisenoAcceso>
    );
  }

  if (estado === 'confirmado') {
    return (
      <DisenoAcceso
        icono="exito"
        titulo="Correo confirmado"
        subtitulo="Tu cuenta quedó activa."
        nota="Ya puedes crear tu rancho y empezar a cargar animales."
      >
        <div className="col g16">
          <Alerta variante="exito">Listo. Ya puedes usar el sistema.</Alerta>
          <a className="btn btn-primario btn-bloque" href="#/">
            <Icono nombre="entrar" tamano={18} />
            Entrar
          </a>
        </div>
      </DisenoAcceso>
    );
  }

  return (
    <DisenoAcceso
      icono="correo"
      titulo="Confirma tu correo"
      subtitulo="Sin confirmarlo no se puede entrar al sistema."
      nota="El enlace vence a las 24 horas. Pedir uno nuevo deja el anterior sin efecto."
    >
      <div className="col g16">
        {error && <Alerta variante="error">{error}</Alerta>}
        {aviso && <Alerta variante="exito">{aviso}</Alerta>}

        <p className="cuerpo c-600">
          Te enviamos un enlace de confirmación. Si ya venció o no llegó, pide
          uno nuevo.
        </p>

        <CampoTexto
          etiqueta="Correo de tu cuenta"
          type="email"
          autoComplete="email"
          placeholder="tu@ejemplo.com"
          value={correoEscrito}
          onChange={(e) => setCorreoEscrito(e.target.value)}
        />

        <Boton variante="primario" bloque onClick={reenviar} disabled={enviando}>
          <Icono nombre="enviar" tamano={18} />
          {enviando ? 'Enviando…' : 'Reenviar el enlace'}
        </Boton>

        {enlace && (
          <Alerta variante="info">
            En desarrollo el correo se escribe en la consola del servidor. Este
            es el enlace: <a href={enlace}>ábrelo aquí</a>.
          </Alerta>
        )}
      </div>
    </DisenoAcceso>
  );
}
