import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Alerta,
  Boton,
  Cargando,
  CampoTexto,
  DisenoApp,
  EstadoVacio,
  Icono,
  Insignia,
  Segmentos,
  Tarjeta,
} from '../../componentes';
import {
  api,
  type EstadoRancho,
  type NivelPermiso,
  type RespuestaTipo,
  type TipoColaborador,
} from '../../servicios/api';
import { localeActual, t, tJsx, tn } from '../../servicios/idioma';
import {
  cuantosColaboradores,
  detalleModulo,
  nombreModulo,
  nombreNivel,
  nombreTipo,
} from '../../servicios/permisos';
import { conTransicion } from '../../servicios/transicion';

/**
 * HU-20 · Tipos de colaborador.
 *
 * Cada colaborador tiene un tipo y el tipo decide a qué módulos entra y en
 * cuáles carga datos. Acá el propietario:
 *   - ve los cuatro predefinidos y los suyos, con lo que puede cada uno;
 *   - crea tipos propios eligiendo los módulos (criterio 2);
 *   - cambia los permisos de cualquiera, sabiendo a cuántos alcanza el
 *     cambio antes de guardarlo (criterio 3);
 *   - devuelve un predefinido a los permisos de fábrica, o elimina uno
 *     propio que nadie usa.
 *
 * El socio ve todo y no toca nada (HU-21).
 *
 * Editar no abre otra pantalla: la tarjeta del tipo se convierte en el
 * editor, con una transición, y vuelve a ser tarjeta al guardar.
 */

const NIVELES: NivelPermiso[] = ['ninguno', 'ver', 'editar'];
const NUEVO = 'nuevo';

export function PaginaTipos() {
  const [rancho, setRancho] = useState<EstadoRancho | null>(null);
  const [tipos, setTipos] = useState<TipoColaborador[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [sinPermiso, setSinPermiso] = useState('');
  const [aviso, setAviso] = useState('');
  const [editando, setEditando] = useState<string | null>(null);
  const [borrando, setBorrando] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);

  // HU-24: el Admin que entró a dar soporte puede lo mismo que el propietario.
  const esPropietario =
    rancho?.usuario.rol === 'propietario' || Boolean(rancho?.usuario.soporte);

  useEffect(() => {
    let vigente = true;
    let rol = '';
    void (async () => {
      try {
        const estado = await api.miRancho();
        if (!vigente) return;
        setRancho(estado);
        rol = estado.usuario.rol;
        if (!estado.tieneRancho) return;
        const lista = await api.tiposColaborador();
        if (vigente) setTipos(lista);
      } catch (err) {
        if (!vigente) return;
        const mensaje = (err as Error).message;
        // El colaborador no ve los tipos (403). El mensaje llega traducido
        // del servidor, así que se decide por el rol y no por el texto.
        if (rol === 'colaborador') setSinPermiso(mensaje);
        else setError(mensaje);
      } finally {
        if (vigente) setCargando(false);
      }
    })();
    return () => {
      vigente = false;
    };
  }, []);

  const predefinidos = tipos.filter((tp) => tp.es_predefinido);
  const propios = tipos.filter((tp) => !tp.es_predefinido);

  function abrir(id: string | null) {
    conTransicion(() => {
      setEditando(id);
      setBorrando(null);
      setError('');
    });
  }

  function alGuardar(respuesta: RespuestaTipo) {
    conTransicion(() => {
      setTipos((previos) => {
        const existe = previos.some((tp) => tp.id === respuesta.tipo.id);
        const lista = existe
          ? previos.map((tp) => (tp.id === respuesta.tipo.id ? respuesta.tipo : tp))
          : [...previos, respuesta.tipo];
        return ordenar(lista);
      });
      setAviso(respuesta.mensaje);
      setEditando(null);
    });
  }

  async function restablecer(tipo: TipoColaborador) {
    setOcupado(tipo.id);
    setError('');
    try {
      alGuardar(await api.restablecerTipo(tipo.id));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setOcupado(null);
    }
  }

  async function eliminar(tipo: TipoColaborador) {
    setOcupado(tipo.id);
    setError('');
    try {
      const respuesta = await api.eliminarTipo(tipo.id);
      conTransicion(() => {
        setTipos((previos) => previos.filter((tp) => tp.id !== tipo.id));
        setAviso(respuesta.mensaje);
        setBorrando(null);
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setOcupado(null);
    }
  }

  const usuario = rancho?.usuario ?? { nombre: t('equipo.invitado'), rol: '—' };

  function tarjeta(tipo: TipoColaborador) {
    if (editando === tipo.id) {
      return (
        <EditorTipo key={tipo.id} tipo={tipo} alGuardar={alGuardar} alCancelar={() => abrir(null)} />
      );
    }
    return (
      <TarjetaTipo
        key={tipo.id}
        tipo={tipo}
        editable={esPropietario && editando === null}
        borrando={borrando === tipo.id}
        ocupado={ocupado === tipo.id}
        alEditar={() => abrir(tipo.id)}
        alRestablecer={() => restablecer(tipo)}
        alPedirBorrado={() => conTransicion(() => setBorrando(tipo.id))}
        alCancelarBorrado={() => conTransicion(() => setBorrando(null))}
        alEliminar={() => eliminar(tipo)}
      />
    );
  }

  return (
    <DisenoApp
      activo="equipo"
      ruta={[t('equipo.titulo'), t('tipos.titulo')]}
      usuario={usuario}
      rancho={rancho?.rancho?.nombre ?? null}
      rotulo={t('equipo.rotulo')}
      titulo={t('tipos.titulo')}
      acciones={
        <>
          <Link className="btn btn-secundario" to="/equipo">
            <Icono nombre="equipo" tamano={18} />
            {t('tipos.acciones.integrantes')}
          </Link>
          {esPropietario && editando === null && rancho?.tieneRancho && (
            <Boton variante="primario" onClick={() => abrir(NUEVO)}>
              <Icono nombre="mas" tamano={18} />
              {t('tipos.acciones.nuevo')}
            </Boton>
          )}
        </>
      }
    >
      <div className="col g24">
        {cargando && <Cargando lineas={5} />}
        {error && <Alerta variante="error">{error}</Alerta>}
        {aviso && <Alerta variante="exito">{aviso}</Alerta>}

        {!cargando && sinPermiso && (
          <EstadoVacio icono="equipo" titulo={t('equipo.sinPermiso')} texto={sinPermiso} />
        )}

        {!cargando && rancho && !rancho.tieneRancho && (
          <EstadoVacio
            icono="casa"
            titulo={t('equipo.sinRancho.titulo')}
            texto={t('tipos.sinRancho')}
            accion={
              <Link className="btn btn-primario" to="/rancho">
                {t('equipo.sinRancho.accion')}
              </Link>
            }
          />
        )}

        {!cargando && !sinPermiso && rancho?.tieneRancho && (
          <>
            <p className="cuerpo c-600 tipos__intro">
              {tJsx('tipos.intro', { b: (s) => <strong>{s}</strong> })}
            </p>

            {editando === NUEVO && (
              <EditorTipo tipo={null} alGuardar={alGuardar} alCancelar={() => abrir(null)} />
            )}

            <section className="col g12">
              <h2 className="h3">{t('tipos.propios.titulo')}</h2>
              {propios.length === 0 ? (
                <div className="tipos__vacio">
                  <Icono nombre="equipo" tamano={20} />
                  <span className="cuerpo c-500">
                    {t('tipos.propios.vacio')}
                  </span>
                  {esPropietario && editando === null && (
                    <Boton variante="secundario" onClick={() => abrir(NUEVO)}>
                      {t('tipos.propios.crear')}
                    </Boton>
                  )}
                </div>
              ) : (
                <div className="tipos__rejilla">{propios.map(tarjeta)}</div>
              )}
            </section>

            <section className="col g12">
              <h2 className="h3">{t('tipos.deFabrica.titulo')}</h2>
              <p className="pie c-500 tipos__nota">
                {t('tipos.deFabrica.nota')}
              </p>
              <div className="tipos__rejilla">{predefinidos.map(tarjeta)}</div>
            </section>

            {!esPropietario && (
              <Alerta variante="info">
                {t('tipos.soloPropietario')}
              </Alerta>
            )}
          </>
        )}
      </div>
    </DisenoApp>
  );
}

// ----------------------------------------------------------------------------

function TarjetaTipo({
  tipo,
  editable,
  borrando,
  ocupado,
  alEditar,
  alRestablecer,
  alPedirBorrado,
  alCancelarBorrado,
  alEliminar,
}: {
  tipo: TipoColaborador;
  editable: boolean;
  borrando: boolean;
  ocupado: boolean;
  alEditar: () => void;
  alRestablecer: () => void;
  alPedirBorrado: () => void;
  alCancelarBorrado: () => void;
  alEliminar: () => void;
}) {
  const conAcceso = tipo.permisos.filter((p) => p.nivel !== 'ninguno');
  const sinAcceso = tipo.permisos.filter((p) => p.nivel === 'ninguno');

  const pie = editable ? (
    borrando ? (
      <div className="tipos__confirmar" role="group" aria-label={t('tipos.tarjeta.confirmarGrupo', { nombre: nombreTipo(tipo) })}>
        <span className="pie">{t('tipos.tarjeta.confirmar', { nombre: nombreTipo(tipo) })}</span>
        <Boton variante="secundario" onClick={alCancelarBorrado} disabled={ocupado}>
          {t('comun.cancelar')}
        </Boton>
        <Boton variante="destructivo" onClick={alEliminar} disabled={ocupado}>
          {ocupado ? t('tipos.tarjeta.eliminando') : t('tipos.tarjeta.eliminar')}
        </Boton>
      </div>
    ) : (
      <div className="tipos__botones">
        {tipo.ajustado && (
          <Boton variante="fantasma" onClick={alRestablecer} disabled={ocupado}>
            {ocupado ? t('tipos.tarjeta.restableciendo') : t('tipos.tarjeta.restablecer')}
          </Boton>
        )}
        {!tipo.es_predefinido && (
          <Boton
            variante="fantasma"
            onClick={alPedirBorrado}
            disabled={ocupado || tipo.colaboradores > 0}
            title={
              tipo.colaboradores > 0
                ? t('tipos.tarjeta.enUso')
                : undefined
            }
          >
            <Icono nombre="archivar" tamano={16} />
            {t('tipos.tarjeta.eliminar')}
          </Boton>
        )}
        <Boton variante="secundario" onClick={alEditar} disabled={ocupado}>
          <Icono nombre="lapiz" tamano={16} />
          {t('tipos.tarjeta.editar')}
        </Boton>
      </div>
    )
  ) : undefined;

  return (
    <div className="tipos__tarjeta" style={{ viewTransitionName: `tipo-${tipo.id}` }}>
      <Tarjeta
        titulo={nombreTipo(tipo)}
        accion={
          tipo.es_predefinido ? (
            tipo.ajustado ? (
              <Insignia variante="adv">{t('tipos.insignias.ajustado')}</Insignia>
            ) : (
              <Insignia variante="neutro">{t('tipos.insignias.predefinido')}</Insignia>
            )
          ) : (
            <Insignia variante="info">{t('tipos.insignias.propio')}</Insignia>
          )
        }
        pie={pie}
      >
        <p className="pie c-500 tipos__cuantos">
          <Icono nombre="equipo" tamano={14} />
          {cuantosColaboradores(tipo.colaboradores)}
        </p>
        <ul className="tipos__permisos">
          {conAcceso.map((p) => (
            <li key={p.modulo}>
              <span>{nombreModulo(p.modulo, p.nombre)}</span>
              <span className={`nivel nivel-${p.nivel}`}>{nombreNivel(p.nivel)}</span>
            </li>
          ))}
        </ul>
        {sinAcceso.length > 0 && (
          <p className="pie c-500 tipos__sin">
            {t('tipos.tarjeta.sinAcceso', {
              modulos: sinAcceso.map((p) => nombreModulo(p.modulo, p.nombre)).join(', '),
            })}
          </p>
        )}
      </Tarjeta>
    </div>
  );
}

// ----------------------------------------------------------------------------

/** El mismo editor sirve para crear (tipo nulo) y para cambiar uno existente. */
function EditorTipo({
  tipo,
  alGuardar,
  alCancelar,
}: {
  tipo: TipoColaborador | null;
  alGuardar: (respuesta: RespuestaTipo) => void;
  alCancelar: () => void;
}) {
  const [modulos, setModulos] = useState<{ codigo: string; nombre: string }[]>(
    tipo?.permisos.map((p) => ({ codigo: p.modulo, nombre: p.nombre })) ?? [],
  );
  const [nombre, setNombre] = useState(tipo ? nombreTipo(tipo) : '');
  const [niveles, setNiveles] = useState<Record<string, NivelPermiso>>(() =>
    Object.fromEntries((tipo?.permisos ?? []).map((p) => [p.modulo, p.nivel])),
  );
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  // Un tipo nuevo todavía no trae los módulos: se piden una vez.
  useEffect(() => {
    if (tipo) return;
    let vigente = true;
    api
      .modulosConPermisos()
      .then((lista) => vigente && setModulos(lista))
      .catch((err) => vigente && setError((err as Error).message));
    return () => {
      vigente = false;
    };
  }, [tipo]);

  const predefinido = tipo?.es_predefinido ?? false;
  const conAcceso = Object.values(niveles).filter((n) => n !== 'ninguno').length;
  const alcance = tipo?.colaboradores ?? 0;

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!predefinido && !nombre.trim()) {
      setError(t('tipos.editor.faltaNombre'));
      return;
    }
    if (conAcceso === 0) {
      setError(t('tipos.editor.faltaModulo'));
      return;
    }
    setEnviando(true);
    try {
      const datos = { nombre: predefinido ? undefined : nombre.trim(), permisos: niveles };
      alGuardar(
        tipo
          ? await api.actualizarTipo(tipo.id, datos)
          : await api.crearTipo({ ...datos, id: crypto.randomUUID() }),
      );
    } catch (err) {
      setError((err as Error).message);
      setEnviando(false);
    }
  }

  return (
    <div
      className="tipos__editor"
      style={{ viewTransitionName: tipo ? `tipo-${tipo.id}` : 'tipo-nuevo' }}
    >
      <Tarjeta
        titulo={
          tipo ? t('tipos.editor.tituloPermisos', { nombre: nombreTipo(tipo) }) : t('tipos.editor.tituloNuevo')
        }
      >
        <form className="col g16" onSubmit={guardar}>
          {error && <Alerta variante="error">{error}</Alerta>}

          <CampoTexto
            etiqueta={t('tipos.editor.nombre')}
            obligatorio={!predefinido}
            maxLength={100}
            placeholder={t('tipos.editor.nombreEjemplo')}
            value={nombre}
            disabled={predefinido}
            ayuda={
              predefinido
                ? t('tipos.editor.nombrePredefinido')
                : undefined
            }
            onChange={(e) => setNombre(e.target.value)}
          />

          <fieldset className="tipos__matriz">
            <legend className="etiqueta">{t('tipos.editor.matriz')}</legend>
            {modulos.length === 0 && <Cargando lineas={3} />}
            {modulos.map((m) => (
              <div className="tipos__modulo" key={m.codigo}>
                <div className="tipos__modulo-texto">
                  <strong>{nombreModulo(m.codigo, m.nombre)}</strong>
                  <span className="pie c-500">{detalleModulo(m.codigo)}</span>
                </div>
                <Segmentos
                  etiqueta={t('tipos.editor.permisoEn', { modulo: nombreModulo(m.codigo, m.nombre) })}
                  valor={niveles[m.codigo] ?? 'ninguno'}
                  alCambiar={(nivel) => setNiveles((previos) => ({ ...previos, [m.codigo]: nivel }))}
                  opciones={NIVELES.map((n) => ({ clave: n, nombre: nombreNivel(n) }))}
                />
              </div>
            ))}
          </fieldset>

          <p className="pie c-500 tipos__ayuda">
            <Icono nombre="info" tamano={14} />
            {t('tipos.editor.ayuda')}
          </p>

          {alcance > 0 && (
            <Alerta variante="adv">
              {tn('tipos.editor.alcance', alcance)}
            </Alerta>
          )}

          <div className="fila g8 tipos__botones">
            <Boton type="button" variante="secundario" onClick={alCancelar} disabled={enviando}>
              {t('comun.cancelar')}
            </Boton>
            <Boton type="submit" variante="primario" disabled={enviando}>
              <Icono nombre="exito" tamano={18} />
              {enviando
                ? t('comun.guardando')
                : tipo
                  ? t('tipos.editor.guardar')
                  : t('tipos.editor.crear')}
            </Boton>
          </div>
        </form>
      </Tarjeta>
    </div>
  );
}

function ordenar(tipos: TipoColaborador[]): TipoColaborador[] {
  return [...tipos].sort((a, b) =>
    a.es_predefinido === b.es_predefinido
      ? nombreTipo(a).localeCompare(nombreTipo(b), localeActual())
      : a.es_predefinido
        ? -1
        : 1,
  );
}
