import { useEffect, useState } from 'react';
import {
  Alerta,
  Boton,
  CampoTexto,
  Cargando,
  DisenoAcceso,
  EsperaDeCorreo,
  Icono,
} from '../../componentes';
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
 *
 * Mientras esta pendiente, la pantalla se pregunta sola si la cuenta ya quedo
 * confirmada. El correo se suele abrir en otra pestaña o en el celular, y sin
 * eso esta se quedaria esperando para siempre a que alguien la recargue.
 */

interface Propiedades {
  /** El correo de la cuenta, cuando se conoce. Evita tener que escribirlo. */
  correo?: string;
  /** Se llama cuando la cuenta queda confirmada, para que App siga sola. */
  alConfirmar?: () => void;
}

function tokenDeLaDireccion(): string {
  // El hash viene como "#/verificar?token=abc". URLSearchParams no lee el
  // hash, asi que se corta a mano lo que hay despues del signo de pregunta.
  const hash = window.location.hash;
  const signo = hash.indexOf('?');
  if (signo === -1) return '';
  return new URLSearchParams(hash.slice(signo + 1)).get('token') ?? '';
}

export function PaginaVerificacion({ correo = '', alConfirmar }: Propiedades) {
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
        if (!vigente) return;
        setEstado('confirmado');
        // Se avisa hacia arriba para que App deje de creer que falta algo.
        alConfirmar?.();
      } catch (e) {
        if (!vigente) return;
        setError((e as Error).message);
        setEstado('pendiente');
      }
    })();
    return () => {
      vigente = false;
    };
    // alConfirmar no entra como dependencia a proposito: cambia en cada
    // renderizado de App y volveria a mandar el token una y otra vez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function entrar() {
    // Quien navega es App: ademas de cambiar la direccion tiene que volver a
    // preguntar por la cuenta, porque el token que se acaba de consumir
    // cambio el estado en el servidor.
    if (alConfirmar) alConfirmar();
    else window.location.hash = '#/';
  }

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
      <DisenoAcceso
        paso={2}
        icono="correo"
        titulo="Confirmando tu correo"
        subtitulo="Un momento."
      >
        <Cargando lineas={2} />
      </DisenoAcceso>
    );
  }

  if (estado === 'confirmado') {
    return (
      <DisenoAcceso
        paso={3}
        icono="exito"
        titulo="Correo confirmado"
        subtitulo="Tu cuenta quedó activa."
        nota="Ya puedes crear tu rancho y empezar a cargar animales."
      >
        <div className="col g16">
          <Alerta variante="exito">Listo. Ya puedes usar el sistema.</Alerta>
          <Boton variante="primario" bloque onClick={entrar}>
            <Icono nombre="entrar" tamano={18} />
            Crear mi rancho
          </Boton>
        </div>
      </DisenoAcceso>
    );
  }

  return (
    <DisenoAcceso
      paso={2}
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

        <EsperaDeCorreo alConfirmar={() => alConfirmar?.()} />
      </div>
    </DisenoAcceso>
  );
}
