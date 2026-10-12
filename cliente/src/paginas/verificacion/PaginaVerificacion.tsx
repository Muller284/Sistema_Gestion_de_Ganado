import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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
import { t, tJsx } from '../../servicios/idioma';

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

export function PaginaVerificacion({ correo = '', alConfirmar }: Propiedades) {
  // El enrutador lee el token del enlace del correo:
  //   /#/verificar?token=...
  const [parametros] = useSearchParams();
  const token = parametros.get('token') ?? '';
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
    alConfirmar?.();
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
        titulo={t('acceso.verificacion.confirmando.titulo')}
        subtitulo={t('acceso.verificacion.confirmando.subtitulo')}
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
        titulo={t('acceso.verificacion.confirmado.titulo')}
        subtitulo={t('acceso.verificacion.confirmado.subtitulo')}
        nota={t('acceso.verificacion.confirmado.nota')}
      >
        <div className="col g16">
          <Alerta variante="exito">{t('acceso.verificacion.confirmado.listo')}</Alerta>
          <Boton variante="primario" bloque onClick={entrar}>
            <Icono nombre="entrar" tamano={18} />
            {t('acceso.verificacion.confirmado.crearRancho')}
          </Boton>
        </div>
      </DisenoAcceso>
    );
  }

  return (
    <DisenoAcceso
      paso={2}
      icono="correo"
      titulo={t('acceso.verificacion.pendiente.titulo')}
      subtitulo={t('acceso.verificacion.pendiente.subtitulo')}
      nota={t('acceso.verificacion.pendiente.nota')}
    >
      <div className="col g16">
        {error && <Alerta variante="error">{error}</Alerta>}
        {aviso && <Alerta variante="exito">{aviso}</Alerta>}

        <p className="cuerpo c-600">{t('acceso.verificacion.pendiente.texto')}</p>

        <CampoTexto
          etiqueta={t('acceso.verificacion.pendiente.correo')}
          type="email"
          autoComplete="email"
          placeholder={t('acceso.comun.correoEjemplo')}
          value={correoEscrito}
          onChange={(e) => setCorreoEscrito(e.target.value)}
        />

        <Boton variante="primario" bloque onClick={reenviar} disabled={enviando}>
          <Icono nombre="enviar" tamano={18} />
          {enviando
            ? t('acceso.verificacion.pendiente.enviando')
            : t('acceso.verificacion.pendiente.reenviar')}
        </Boton>

        {enlace && (
          <Alerta variante="info">
            {tJsx('acceso.comun.enlaceDesarrollo', {
              enlace: (s) => <a href={enlace}>{s}</a>,
            })}
          </Alerta>
        )}

        <EsperaDeCorreo alConfirmar={() => alConfirmar?.()} />
      </div>
    </DisenoAcceso>
  );
}
