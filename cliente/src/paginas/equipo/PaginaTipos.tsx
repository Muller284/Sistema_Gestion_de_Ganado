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
import {
  DETALLE_MODULO,
  NOMBRE_NIVEL,
  cuantosColaboradores,
  nombreModulo,
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

  const esPropietario = rancho?.usuario.rol === 'propietario';

  useEffect(() => {
    let vigente = true;
    void (async () => {
      try {
        const estado = await api.miRancho();
        if (!vigente) return;
        setRancho(estado);
        if (!estado.tieneRancho) return;
        const lista = await api.tiposColaborador();
        if (vigente) setTipos(lista);
      } catch (err) {
        if (!vigente) return;
        const mensaje = (err as Error).message;
        if (/propietario y los socios/.test(mensaje)) setSinPermiso(mensaje);
        else setError(mensaje);
      } finally {
        if (vigente) setCargando(false);
      }
    })();
    return () => {
      vigente = false;
    };
  }, []);

  const predefinidos = tipos.filter((t) => t.es_predefinido);
  const propios = tipos.filter((t) => !t.es_predefinido);

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
        const existe = previos.some((t) => t.id === respuesta.tipo.id);
        const lista = existe
          ? previos.map((t) => (t.id === respuesta.tipo.id ? respuesta.tipo : t))
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
        setTipos((previos) => previos.filter((t) => t.id !== tipo.id));
        setAviso(respuesta.mensaje);
        setBorrando(null);
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setOcupado(null);
    }
  }

  const usuario = rancho?.usuario ?? { nombre: 'Invitado', rol: '—' };

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
      ruta={['Equipo', 'Tipos de colaborador']}
      usuario={usuario}
      rancho={rancho?.rancho?.nombre ?? null}
      rotulo="Tu equipo"
      titulo="Tipos de colaborador"
      acciones={
        <>
          <Link className="btn btn-secundario" to="/equipo">
            <Icono nombre="equipo" tamano={18} />
            Integrantes
          </Link>
          {esPropietario && editando === null && rancho?.tieneRancho && (
            <Boton variante="primario" onClick={() => abrir(NUEVO)}>
              <Icono nombre="mas" tamano={18} />
              Nuevo tipo
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
          <EstadoVacio icono="equipo" titulo="Esta parte no es para tu rol" texto={sinPermiso} />
        )}

        {!cargando && rancho && !rancho.tieneRancho && (
          <EstadoVacio
            icono="casa"
            titulo="Primero crea tu rancho"
            texto="Los tipos de colaborador son de cada rancho. Cuando lo crees, vuelve acá."
            accion={
              <Link className="btn btn-primario" to="/rancho">
                Crear mi rancho
              </Link>
            }
          />
        )}

        {!cargando && !sinPermiso && rancho?.tieneRancho && (
          <>
            <p className="cuerpo c-600 tipos__intro">
              Cada colaborador tiene un tipo, y el tipo decide qué módulos ve y en cuáles puede
              cargar datos. <strong>Si cambias un tipo, cambia para todos los que lo tienen.</strong>
            </p>

            {editando === NUEVO && (
              <EditorTipo tipo={null} alGuardar={alGuardar} alCancelar={() => abrir(null)} />
            )}

            <section className="col g12">
              <h2 className="h3">De tu rancho</h2>
              {propios.length === 0 ? (
                <div className="tipos__vacio">
                  <Icono nombre="equipo" tamano={20} />
                  <span className="cuerpo c-500">
                    Todavía no creaste tipos propios. Si ninguno de los cuatro de abajo encaja con
                    alguien de tu equipo, arma uno a su medida.
                  </span>
                  {esPropietario && editando === null && (
                    <Boton variante="secundario" onClick={() => abrir(NUEVO)}>
                      Crear un tipo
                    </Boton>
                  )}
                </div>
              ) : (
                <div className="tipos__rejilla">{propios.map(tarjeta)}</div>
              )}
            </section>

            <section className="col g12">
              <h2 className="h3">Predefinidos</h2>
              <p className="pie c-500 tipos__nota">
                Vienen con el sistema. Puedes ajustar sus permisos: el cambio vale solo en tu
                rancho, y siempre puedes volver a los de fábrica.
              </p>
              <div className="tipos__rejilla">{predefinidos.map(tarjeta)}</div>
            </section>

            {!esPropietario && (
              <Alerta variante="info">
                Solo el propietario puede crear tipos o cambiar sus permisos.
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
      <div className="tipos__confirmar" role="group" aria-label={`Confirmar eliminación de ${tipo.nombre}`}>
        <span className="pie">¿Eliminar «{tipo.nombre}»?</span>
        <Boton variante="secundario" onClick={alCancelarBorrado} disabled={ocupado}>
          Cancelar
        </Boton>
        <Boton variante="destructivo" onClick={alEliminar} disabled={ocupado}>
          {ocupado ? 'Eliminando…' : 'Eliminar'}
        </Boton>
      </div>
    ) : (
      <div className="tipos__botones">
        {tipo.ajustado && (
          <Boton variante="fantasma" onClick={alRestablecer} disabled={ocupado}>
            {ocupado ? 'Restableciendo…' : 'Volver a los de fábrica'}
          </Boton>
        )}
        {!tipo.es_predefinido && (
          <Boton
            variante="fantasma"
            onClick={alPedirBorrado}
            disabled={ocupado || tipo.colaboradores > 0}
            title={
              tipo.colaboradores > 0
                ? 'Lo tiene alguien de tu equipo: cámbiale el tipo antes de eliminarlo'
                : undefined
            }
          >
            <Icono nombre="archivar" tamano={16} />
            Eliminar
          </Boton>
        )}
        <Boton variante="secundario" onClick={alEditar} disabled={ocupado}>
          <Icono nombre="lapiz" tamano={16} />
          Editar permisos
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
              <Insignia variante="adv">Ajustado</Insignia>
            ) : (
              <Insignia variante="neutro">Predefinido</Insignia>
            )
          ) : (
            <Insignia variante="info">Propio</Insignia>
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
              <span className={`nivel nivel-${p.nivel}`}>{NOMBRE_NIVEL[p.nivel]}</span>
            </li>
          ))}
        </ul>
        {sinAcceso.length > 0 && (
          <p className="pie c-500 tipos__sin">
            Sin acceso a {sinAcceso.map((p) => nombreModulo(p.modulo, p.nombre)).join(', ')}.
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
      setError('Ponle un nombre al tipo.');
      return;
    }
    if (conAcceso === 0) {
      setError('Elige al menos un módulo que este tipo pueda ver.');
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
      <Tarjeta titulo={tipo ? `Permisos de ${nombreTipo(tipo)}` : 'Nuevo tipo de colaborador'}>
        <form className="col g16" onSubmit={guardar}>
          {error && <Alerta variante="error">{error}</Alerta>}

          <CampoTexto
            etiqueta="Nombre del tipo"
            obligatorio={!predefinido}
            maxLength={100}
            placeholder="Por ejemplo: Ordeñador, Tractorista, Contador"
            value={nombre}
            disabled={predefinido}
            ayuda={
              predefinido
                ? 'Los predefinidos no cambian de nombre. Si necesitas otro, crea un tipo propio.'
                : undefined
            }
            onChange={(e) => setNombre(e.target.value)}
          />

          <fieldset className="tipos__matriz">
            <legend className="etiqueta">Qué puede en cada módulo</legend>
            {modulos.length === 0 && <Cargando lineas={3} />}
            {modulos.map((m) => (
              <div className="tipos__modulo" key={m.codigo}>
                <div className="tipos__modulo-texto">
                  <strong>{nombreModulo(m.codigo, m.nombre)}</strong>
                  <span className="pie c-500">{DETALLE_MODULO[m.codigo]}</span>
                </div>
                <Segmentos
                  etiqueta={`Permiso en ${nombreModulo(m.codigo, m.nombre)}`}
                  valor={niveles[m.codigo] ?? 'ninguno'}
                  alCambiar={(nivel) => setNiveles((previos) => ({ ...previos, [m.codigo]: nivel }))}
                  opciones={NIVELES.map((n) => ({ clave: n, nombre: NOMBRE_NIVEL[n] }))}
                />
              </div>
            ))}
          </fieldset>

          <p className="pie c-500 tipos__ayuda">
            <Icono nombre="info" tamano={14} />
            «Edita» incluye ver. Sin acceso, el módulo ni siquiera aparece en su menú.
          </p>

          {alcance > 0 && (
            <Alerta variante="adv">
              {alcance === 1
                ? 'Un colaborador tiene este tipo: el cambio le llega en cuanto guardes.'
                : `${alcance} colaboradores tienen este tipo: el cambio les llega a todos en cuanto guardes.`}
            </Alerta>
          )}

          <div className="fila g8 tipos__botones">
            <Boton type="button" variante="secundario" onClick={alCancelar} disabled={enviando}>
              Cancelar
            </Boton>
            <Boton type="submit" variante="primario" disabled={enviando}>
              <Icono nombre="exito" tamano={18} />
              {enviando ? 'Guardando…' : tipo ? 'Guardar permisos' : 'Crear tipo'}
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
      ? a.nombre.localeCompare(b.nombre, 'es')
      : a.es_predefinido
        ? -1
        : 1,
  );
}
