import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Alerta, Boton, Cargando, DisenoApp, Icono } from '../../componentes';
import {
  asistente,
  bloquesDeRespuesta,
  LARGO_PREGUNTA,
  type EstadoAsistente,
  type Trozo,
  type TurnoAsistente,
} from '../../servicios/asistente';
import { existe, idiomaActual, t } from '../../servicios/idioma';
import {
  detenerVoz,
  Grabadora,
  hayVozDelNavegador,
  leerConElNavegador,
  puedeGrabar,
  reproducir,
  SEGUNDOS_MAXIMOS,
  textoParaLeer,
} from '../../servicios/voz';
import { useContextoGanado, usuarioDe } from '../ganado/contexto';

/**
 * Fase 5 · Asistente con IA (RF-38 a RF-42).
 *   - Pregunta en lenguaje natural sobre el rancho y muestra la respuesta,
 *     con qué datos consultó para armarla.
 *   - Sugerencias según los módulos que quien pregunta puede ver (RF-40).
 *   - La cuota del mes, a la vista (RF-42).
 *   - La charla sigue: se reenvían los últimos turnos para entender «¿y el otro?».
 *   - Con Gemini se le puede hablar: el micrófono graba, Gemini pasa la voz a
 *     texto y la respuesta se escucha leída por Gemini (DECISIONES §49).
 *
 * Todo lo decide el servidor; esta pantalla solo pregunta y dibuja.
 */

interface Mensaje extends TurnoAsistente {
  /** La consulta guardada (solo las respuestas): con él se pide la voz. */
  id?: string;
  herramientas?: string[];
}

/** La respuesta que se está leyendo en voz alta. */
interface Lectura {
  id: string;
  estado: 'cargando' | 'sonando';
}

const SUGERENCIAS = ['resumen', 'animales', 'corrales', 'sanidad', 'pesajes'] as const;

export function PaginaAsistente() {
  const contexto = useContextoGanado();
  const [estado, setEstado] = useState<EstadoAsistente | null>(null);
  const [errorEstado, setErrorEstado] = useState('');
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [pregunta, setPregunta] = useState('');
  const [pensando, setPensando] = useState(false);
  const [error, setError] = useState('');
  const [grabando, setGrabando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const [transcribiendo, setTranscribiendo] = useState(false);
  const [lectura, setLectura] = useState<Lectura | null>(null);
  const [aviso, setAviso] = useState('');
  const fin = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLTextAreaElement>(null);
  const grabadora = useRef<Grabadora | null>(null);
  const terminar = useRef<() => Promise<void>>(async () => {});
  // Cada respuesta se le pide a Gemini una sola vez: escucharla de nuevo no gasta.
  const audios = useRef(new Map<string, { tipo: string; audio: string }>());

  useEffect(() => {
    let vigente = true;
    asistente
      .estado()
      .then((respuesta) => vigente && setEstado(respuesta))
      .catch((err: Error) => vigente && setErrorEstado(err.message));
    return () => {
      vigente = false;
    };
  }, []);

  // Al salir de la pantalla: se suelta el micrófono y se calla.
  useEffect(
    () => () => {
      grabadora.current?.cancelar();
      detenerVoz();
    },
    [],
  );

  // La última burbuja siempre a la vista.
  useEffect(() => {
    fin.current?.scrollIntoView?.({ block: 'end', behavior: 'smooth' });
  }, [mensajes, pensando, transcribiendo]);

  // El reloj de la grabación; a los 30 segundos se corta sola.
  useEffect(() => {
    if (!grabando) return;
    const inicio = Date.now();
    const reloj = window.setInterval(() => {
      const transcurridos = Math.floor((Date.now() - inicio) / 1000);
      setSegundos(transcurridos);
      if (transcurridos >= SEGUNDOS_MAXIMOS) void terminar.current();
    }, 250);
    return () => window.clearInterval(reloj);
  }, [grabando]);

  const sinCuota = estado ? estado.usadas >= estado.limite : false;
  const deshabilitado = !estado?.configurado || sinCuota || pensando || transcribiendo;
  const conVoz = Boolean(estado?.voz) && puedeGrabar();

  async function enviar(texto: string, leerRespuesta = false) {
    const limpia = texto.trim();
    // Sin mirar «transcribiendo»: la pregunta hablada llega justo al terminar de transcribir.
    if (!limpia || !estado?.configurado || sinCuota || pensando) return;
    const historial: TurnoAsistente[] = mensajes.map(({ rol, texto: contenido }) => ({ rol, texto: contenido }));
    setMensajes((previos) => [...previos, { rol: 'usuario', texto: limpia }]);
    setPregunta('');
    setError('');
    setPensando(true);
    try {
      const respuesta = await asistente.preguntar(limpia, historial);
      const nuevo: Mensaje = {
        rol: 'asistente',
        id: respuesta.id,
        texto: respuesta.respuesta,
        herramientas: respuesta.herramientas,
      };
      setMensajes((previos) => [...previos, nuevo]);
      setEstado((previo) => (previo ? { ...previo, usadas: respuesta.usadas, limite: respuesta.limite } : previo));
      // Si preguntó hablando, la respuesta también se escucha.
      if (leerRespuesta) void escuchar(nuevo);
    } catch (err) {
      setError((err as Error).message);
      // La pregunta vuelve al campo para reintentar sin escribirla de nuevo.
      setMensajes((previos) => previos.slice(0, -1));
      setPregunta(limpia);
    } finally {
      setPensando(false);
      campo.current?.focus();
    }
  }

  function alEnviar(evento: FormEvent) {
    evento.preventDefault();
    void enviar(pregunta);
  }

  // Enter envía; Shift+Enter baja de línea.
  function alTeclear(evento: KeyboardEvent<HTMLTextAreaElement>) {
    if (evento.key === 'Enter' && !evento.shiftKey) {
      evento.preventDefault();
      void enviar(pregunta);
    }
  }

  // ── Voz ──────────────────────────────────────────────────────────────────

  async function empezarGrabacion() {
    detenerVoz();
    setLectura(null);
    setError('');
    setAviso('');
    const nuevaGrabadora = new Grabadora();
    try {
      await nuevaGrabadora.empezar();
    } catch (err) {
      const nombre = (err as DOMException)?.name;
      setError(
        nombre === 'NotAllowedError' || nombre === 'SecurityError'
          ? t('asistente.voz.sinPermiso')
          : nombre === 'NotFoundError'
            ? t('asistente.voz.sinMicrofono')
            : (err as Error).message,
      );
      return;
    }
    grabadora.current = nuevaGrabadora;
    setSegundos(0);
    setGrabando(true);
  }

  async function terminarGrabacion() {
    const actual = grabadora.current;
    grabadora.current = null;
    setGrabando(false);
    if (!actual) return;
    setTranscribiendo(true);
    let texto = '';
    try {
      const grabacion = await actual.terminar();
      if (grabacion.hayVoz && grabacion.segundos >= 0.5) {
        texto = (await asistente.transcribir(grabacion.audio)).texto.trim();
      }
      if (!texto) setError(t('asistente.voz.noSeEscucho'));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setTranscribiendo(false);
    }
    if (texto) await enviar(texto, true);
  }

  // El reloj lo usa con la versión más nueva de terminarGrabacion.
  useEffect(() => {
    terminar.current = terminarGrabacion;
  });

  async function escuchar(mensaje: Mensaje) {
    if (!mensaje.id) return;
    if (lectura?.id === mensaje.id) {
      detenerVoz();
      setLectura(null);
      return;
    }
    const id = mensaje.id;
    setAviso('');
    setLectura({ id, estado: 'cargando' });
    try {
      let audio = audios.current.get(id);
      if (!audio) {
        audio = await asistente.voz(id);
        audios.current.set(id, audio);
      }
      setLectura((previa) => (previa?.id === id ? { id, estado: 'sonando' } : previa));
      await reproducir(audio.audio, audio.tipo);
    } catch (err) {
      // Gemini no pudo (por ejemplo, su límite gratuito del día): la voz del navegador.
      if (hayVozDelNavegador()) {
        setAviso(t('asistente.voz.respaldo'));
        setLectura((previa) => (previa?.id === id ? { id, estado: 'sonando' } : previa));
        await leerConElNavegador(textoParaLeer(mensaje.texto), idiomaActual());
      } else {
        setError((err as Error).message);
      }
    } finally {
      setLectura((previa) => (previa?.id === id ? null : previa));
    }
  }

  function nueva() {
    detenerVoz();
    setLectura(null);
    setAviso('');
    setMensajes([]);
    setError('');
    setPregunta('');
    campo.current?.focus();
  }

  const sugerencias = estado
    ? SUGERENCIAS.filter((s) => s === 'resumen' || estado.modulos.includes(s)).map((s) => t(`asistente.ejemplos.${s}`))
    : [];

  return (
    <DisenoApp
      activo="asistente"
      ruta={[t('app.modulos.inicio'), t('app.modulos.asistente')]}
      usuario={usuarioDe(contexto)}
      rancho={contexto.rancho?.rancho?.nombre ?? null}
      rotulo={t('asistente.rotulo')}
      titulo={t('asistente.titulo')}
      acciones={
        mensajes.length > 0 ? (
          <Boton variante="secundario" onClick={nueva} disabled={pensando || transcribiendo || grabando}>
            <Icono nombre="mas" tamano={16} />
            {t('asistente.nueva')}
          </Boton>
        ) : undefined
      }
    >
      <div className="asistente">
        <p className="asistente__intro">{t('asistente.intro')}</p>

        {errorEstado && <Alerta variante="error">{errorEstado}</Alerta>}
        {!estado && !errorEstado && <Cargando lineas={3} />}
        {estado && !estado.configurado && <Alerta variante="adv">{t('asistente.sinConfigurar')}</Alerta>}
        {estado?.configurado && sinCuota && (
          <Alerta variante="adv">{t('asistente.sinCuota', { n: estado.limite })}</Alerta>
        )}

        {estado && (
          <section className="asistente__charla" aria-live="polite" aria-busy={pensando}>
            {mensajes.length === 0 && (
              <div className="asistente__vacio">
                <span className="asistente__icono" aria-hidden="true">
                  <Icono nombre="asistente" tamano={22} />
                </span>
                <p className="asistente__sugerir">{t('asistente.sugerencias')}</p>
                <div className="asistente__sugerencias">
                  {sugerencias.map((texto) => (
                    <button key={texto} type="button" disabled={deshabilitado} onClick={() => void enviar(texto)}>
                      {texto}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {mensajes.map((mensaje, i) => (
              <Burbuja
                key={i}
                mensaje={mensaje}
                lectura={conVoz && mensaje.id ? (lectura?.id === mensaje.id ? lectura.estado : 'quieta') : null}
                onEscuchar={() => void escuchar(mensaje)}
              />
            ))}

            {grabando && (
              <div className="asistente__burbuja asistente__burbuja--pregunta asistente__grabando">
                <p>{t('asistente.voz.grabando')}</p>
              </div>
            )}

            {(pensando || transcribiendo) && (
              <div className="asistente__burbuja asistente__burbuja--respuesta asistente__pensando">
                <span className="asistente__autor">
                  <Icono nombre="asistente" tamano={14} />
                  {t('asistente.asistente')}
                </span>
                <p>{transcribiendo ? t('asistente.voz.transcribiendo') : t('asistente.pensando')}</p>
              </div>
            )}
            <div ref={fin} />
          </section>
        )}

        {error && <Alerta variante="error">{error}</Alerta>}
        {aviso && <Alerta variante="info">{aviso}</Alerta>}

        {estado && (
          <form className="asistente__formulario" onSubmit={alEnviar}>
            <label className="solo-lectores" htmlFor="pregunta-asistente">
              {t('asistente.campo')}
            </label>
            <textarea
              id="pregunta-asistente"
              ref={campo}
              rows={2}
              maxLength={LARGO_PREGUNTA}
              value={pregunta}
              placeholder={t('asistente.ejemplo')}
              onChange={(evento) => setPregunta(evento.target.value)}
              onKeyDown={alTeclear}
              disabled={!estado.configurado || sinCuota}
            />
            <div className="asistente__pie">
              <span className="pie c-600">
                {t('asistente.cuota', { usadas: estado.usadas, limite: estado.limite })}
                {pregunta.length > LARGO_PREGUNTA - 100 &&
                  ` · ${t('asistente.largo', { n: pregunta.length, max: LARGO_PREGUNTA })}`}
              </span>
              <div className="asistente__botones">
                {conVoz && (
                  <Boton
                    variante={grabando ? 'destructivo' : 'secundario'}
                    className="asistente__microfono"
                    onClick={() => void (grabando ? terminarGrabacion() : empezarGrabacion())}
                    disabled={!grabando && deshabilitado}
                    aria-pressed={grabando}
                    title={t('asistente.voz.ayuda', { n: SEGUNDOS_MAXIMOS })}
                  >
                    <Icono nombre={grabando ? 'detener' : 'microfono'} tamano={16} />
                    {grabando ? t('asistente.voz.detener', { tiempo: reloj(segundos) }) : t('asistente.voz.hablar')}
                  </Boton>
                )}
                <Boton variante="primario" type="submit" disabled={deshabilitado || grabando || !pregunta.trim()}>
                  <Icono nombre="enviar" tamano={16} />
                  {t('asistente.enviar')}
                </Boton>
              </div>
            </div>
          </form>
        )}

        <p className="pie c-600 asistente__aviso">{t('asistente.aviso')}</p>
      </div>
    </DisenoApp>
  );
}

function reloj(segundos: number): string {
  return `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, '0')}`;
}

/** lectura: null sin voz; 'quieta', 'cargando' o 'sonando' con voz. */
function Burbuja({
  mensaje,
  lectura,
  onEscuchar,
}: {
  mensaje: Mensaje;
  lectura: 'quieta' | 'cargando' | 'sonando' | null;
  onEscuchar: () => void;
}) {
  if (mensaje.rol === 'usuario') {
    return (
      <div className="asistente__burbuja asistente__burbuja--pregunta">
        <p>{mensaje.texto}</p>
      </div>
    );
  }
  const consultadas = (mensaje.herramientas ?? [])
    .map((h) => (existe(`asistente.herramientas.${h}`) ? t(`asistente.herramientas.${h}`) : null))
    .filter(Boolean);
  return (
    <div className="asistente__burbuja asistente__burbuja--respuesta">
      <span className="asistente__autor">
        <Icono nombre="asistente" tamano={14} />
        {t('asistente.asistente')}
      </span>
      {bloquesDeRespuesta(mensaje.texto).map((bloque, i) =>
        bloque.tipo === 'lista' ? (
          <ul key={i}>
            {bloque.items.map((item, j) => (
              <li key={j}>
                <Trozos trozos={item} />
              </li>
            ))}
          </ul>
        ) : (
          <p key={i}>
            <Trozos trozos={bloque.trozos} />
          </p>
        ),
      )}
      {consultadas.length > 0 && (
        <span className="asistente__fuentes">{t('asistente.consulto', { lista: consultadas.join(', ') })}</span>
      )}
      {lectura && (
        <button
          type="button"
          className="asistente__escuchar"
          onClick={onEscuchar}
          disabled={lectura === 'cargando'}
          aria-pressed={lectura === 'sonando'}
        >
          <Icono nombre={lectura === 'sonando' ? 'detener' : 'altavoz'} tamano={14} />
          {lectura === 'cargando'
            ? t('asistente.voz.cargando')
            : lectura === 'sonando'
              ? t('asistente.voz.callar')
              : t('asistente.voz.escuchar')}
        </button>
      )}
    </div>
  );
}

function Trozos({ trozos }: { trozos: Trozo[] }) {
  return (
    <>
      {trozos.map((trozo, i) => (trozo.tipo === 'negrita' ? <strong key={i}>{trozo.texto}</strong> : <span key={i}>{trozo.texto}</span>))}
    </>
  );
}
