import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Alerta,
  Boton,
  Cargando,
  Cifra,
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
  type MiembroEquipo,
  type TipoColaborador,
} from '../../servicios/api';
import { nombreTipo } from '../../servicios/permisos';
import { inicial } from '../../servicios/texto';
import { conTransicion } from '../../servicios/transicion';
import { FormularioAlta } from './FormularioAlta';

/**
 * HU-17 · El equipo del rancho: quién está, qué rol tiene y si puede entrar.
 *
 * QUIÉN VE QUÉ
 *   propietario   todo, y es el único que da de alta, suspende y reactiva.
 *   socio         la lista, sin botones (HU-21: ve todo, no toca nada).
 *   colaborador   el servidor le responde 403; se le explica por qué.
 *
 * NADA SE CONFIRMA CON window.confirm
 * Suspender pide confirmación en la misma fila. Un cuadro del navegador no
 * sigue el diseño, no se puede leer con calma y bloquea la pestaña entera.
 *
 * Al abrir la pantalla, el propietario deja el paso "equipo" de la guía de
 * configuración (HU-16) en curso: ya empezó a armarlo.
 *
 * NADA SALTA
 * Filtrar, abrir el formulario, dar de alta o suspender pasan por
 * conTransicion: las filas que se quedan se deslizan a su lugar nuevo, las
 * que salen se desvanecen y las que entran aparecen. Cada fila y cada bloque
 * lleva su view-transition-name para que el navegador sepa qué es qué.
 * Las cifras de arriba cuentan desde el valor que tenían, no desde cero.
 *
 * HU-20: los tipos de colaborador se administran en /equipo/tipos. Desde la
 * fila de un colaborador, el propietario le cambia el tipo sin salir de acá.
 */

type Filtro = 'todos' | 'socio' | 'colaborador' | 'suspendido';

const FILTROS: { clave: Filtro; nombre: string }[] = [
  { clave: 'todos', nombre: 'Todos' },
  { clave: 'socio', nombre: 'Socios' },
  { clave: 'colaborador', nombre: 'Colaboradores' },
  { clave: 'suspendido', nombre: 'Suspendidos' },
];

const NOMBRE_ROL: Record<MiembroEquipo['rol'], string> = {
  propietario: 'Propietario',
  socio: 'Socio',
  colaborador: 'Colaborador',
};

export function PaginaEquipo() {
  const [rancho, setRancho] = useState<EstadoRancho | null>(null);
  const [miembros, setMiembros] = useState<MiembroEquipo[]>([]);
  const [tipos, setTipos] = useState<TipoColaborador[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [sinPermiso, setSinPermiso] = useState('');
  const [aviso, setAviso] = useState<{ mensaje: string; detalle?: string } | null>(null);
  const [agregando, setAgregando] = useState(false);
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [cambiandoTipo, setCambiandoTipo] = useState<string | null>(null);
  const [recienLlegado, setRecienLlegado] = useState<string | null>(null);
  // Solo la primera vez que llega la lista, las filas entran escalonadas.
  const [entrando, setEntrando] = useState(true);

  const esPropietario = rancho?.usuario.rol === 'propietario';

  useEffect(() => {
    let vigente = true;
    void (async () => {
      try {
        const estado = await api.miRancho();
        if (!vigente) return;
        setRancho(estado);
        if (!estado.tieneRancho) return;

        const [lista, listaTipos] = await Promise.all([
          api.equipo(),
          api.tiposColaborador(),
        ]);
        if (!vigente) return;
        setMiembros(lista);
        setTipos(listaTipos);

        // HU-16: el propietario ya empezó a armar su equipo. Si falla no
        // importa: la guía es una ayuda, no un requisito de esta pantalla.
        if (estado.usuario.rol === 'propietario') {
          void api.visitarPaso('equipo').catch(() => undefined);
        }
      } catch (err) {
        if (!vigente) return;
        const mensaje = (err as Error).message;
        if (/propietario y los socios/.test(mensaje)) setSinPermiso(mensaje);
        else setError(mensaje);
      } finally {
        if (vigente) setCargando(false);
      }
    })();
    const fin = window.setTimeout(() => setEntrando(false), 900);
    return () => {
      vigente = false;
      window.clearTimeout(fin);
    };
  }, []);

  const cuentas = useMemo(
    () => ({
      activos: miembros.filter((m) => m.estado === 'activo').length,
      socios: miembros.filter((m) => m.rol === 'socio').length,
      colaboradores: miembros.filter((m) => m.rol === 'colaborador').length,
      suspendidos: miembros.filter((m) => m.estado === 'suspendido').length,
    }),
    [miembros],
  );

  const visibles = miembros.filter((m) => {
    if (filtro === 'todos') return true;
    if (filtro === 'suspendido') return m.estado === 'suspendido';
    return m.rol === filtro;
  });

  function alDarDeAlta(miembro: MiembroEquipo, mensaje: string, detalle: string) {
    conTransicion(() => {
      setMiembros((previos) => [...previos, miembro]);
      setAviso({ mensaje, detalle });
      setAgregando(false);
      setFiltro('todos');
      setRecienLlegado(miembro.id);
    });
  }

  function filtrar(nuevo: Filtro) {
    conTransicion(() => {
      setFiltro(nuevo);
      setConfirmando(null);
    });
  }

  function abrirFormulario(abierto: boolean) {
    conTransicion(() => setAgregando(abierto));
  }

  async function cambiarEstado(miembro: MiembroEquipo) {
    const nuevo = miembro.estado === 'activo' ? 'suspendido' : 'activo';
    setOcupado(miembro.id);
    setError('');
    try {
      const respuesta = await api.cambiarEstadoMiembro(miembro.id, nuevo);
      conTransicion(() => {
        setMiembros((previos) =>
          previos.map((m) => (m.id === miembro.id ? respuesta.miembro : m)),
        );
        setAviso({ mensaje: respuesta.mensaje });
        setConfirmando(null);
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setOcupado(null);
    }
  }

  async function restablecer(miembro: MiembroEquipo) {
    setOcupado(miembro.id);
    setError('');
    try {
      const respuesta = await api.restablecerContrasena(miembro.id);
      setAviso({ mensaje: respuesta.mensaje, detalle: respuesta.aviso });
      setMiembros((previos) =>
        previos.map((m) =>
          m.id === miembro.id ? { ...m, debe_cambiar_contrasena: true } : m,
        ),
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setOcupado(null);
    }
  }

  async function cambiarTipo(miembro: MiembroEquipo, tipoId: string) {
    setOcupado(miembro.id);
    setError('');
    try {
      const respuesta = await api.asignarTipo(miembro.id, tipoId);
      conTransicion(() => {
        setMiembros((previos) =>
          previos.map((m) =>
            m.id === miembro.id
              ? {
                  ...m,
                  tipo_colaborador_id: respuesta.tipo_colaborador_id,
                  tipo_colaborador: respuesta.tipo_colaborador,
                }
              : m,
          ),
        );
        setAviso({ mensaje: respuesta.mensaje });
        setCambiandoTipo(null);
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setOcupado(null);
    }
  }

  const usuario = rancho?.usuario ?? { nombre: 'Invitado', rol: '—' };

  return (
    <DisenoApp
      activo="equipo"
      ruta={['Equipo', NOMBRE_ROL[usuario.rol as MiembroEquipo['rol']] ?? usuario.rol]}
      usuario={usuario}
      rancho={rancho?.rancho?.nombre ?? null}
      rotulo="Tu equipo"
      titulo="Equipo"
      acciones={
        rancho?.tieneRancho && !sinPermiso && !cargando ? (
          <>
            <Link className="btn btn-secundario" to="/equipo/tipos">
              <Icono nombre="llave" tamano={18} />
              Tipos y permisos
            </Link>
            {esPropietario && !agregando && (
              <Boton variante="primario" onClick={() => abrirFormulario(true)}>
                <Icono nombre="persona-mas" tamano={18} />
                Agregar integrante
              </Boton>
            )}
          </>
        ) : undefined
      }
    >
      <div className="col g24">
        {cargando && <Cargando lineas={5} />}
        {error && <Alerta variante="error">{error}</Alerta>}
        {aviso && (
          <Alerta variante="exito">
            {aviso.mensaje}
            {aviso.detalle && <span className="equipo__aviso-detalle">{aviso.detalle}</span>}
          </Alerta>
        )}

        {!cargando && sinPermiso && (
          <EstadoVacio
            icono="equipo"
            titulo="Esta parte no es para tu rol"
            texto={sinPermiso}
          />
        )}

        {!cargando && rancho && !rancho.tieneRancho && (
          <EstadoVacio
            icono="casa"
            titulo="Primero crea tu rancho"
            texto="El equipo trabaja dentro de un rancho. Cuando lo crees, vuelve acá para sumar a tus socios y colaboradores."
            accion={
              <Link className="btn btn-primario" to="/rancho">
                Crear mi rancho
              </Link>
            }
          />
        )}

        {!cargando && !sinPermiso && rancho?.tieneRancho && (
          <>
            {agregando && (
              <div className="vt-formulario">
                <FormularioAlta
                  tipos={tipos}
                  alDarDeAlta={alDarDeAlta}
                  alCancelar={() => abrirFormulario(false)}
                />
              </div>
            )}

            <div className="rejilla-cifras vt-cifras">
              <Cifra
                rotulo="Pueden entrar"
                icono="equipo"
                valor={String(cuentas.activos)}
                detalle="Integrantes activos, contándote"
              />
              <Cifra
                rotulo="Socios"
                icono="persona-mas"
                valor={String(cuentas.socios)}
                detalle="Ven todo, sin modificar"
              />
              <Cifra
                rotulo="Colaboradores"
                icono="sanidad"
                valor={String(cuentas.colaboradores)}
                detalle="Cargan lo de su tipo"
              />
              <Cifra
                rotulo="Suspendidos"
                icono="pendiente"
                valor={String(cuentas.suspendidos)}
                detalle="No pueden entrar"
              />
            </div>

            {miembros.length <= 1 && !agregando ? (
              <EstadoVacio
                icono="equipo"
                titulo="Por ahora trabajas solo"
                texto="Suma a tus socios para que vean cómo va el rancho, y a tus colaboradores para que carguen lo de su trabajo. Cada uno entra con su propia cuenta."
                accion={
                  esPropietario ? (
                    <Boton variante="primario" onClick={() => abrirFormulario(true)}>
                      <Icono nombre="persona-mas" tamano={18} />
                      Agregar al primero
                    </Boton>
                  ) : undefined
                }
              />
            ) : (
              <div className="vt-lista">
              <Tarjeta
                titulo="Integrantes"
                accion={
                  <Segmentos
                    etiqueta="Filtrar integrantes"
                    valor={filtro}
                    alCambiar={filtrar}
                    opciones={FILTROS.map((f) => ({
                      ...f,
                      cantidad:
                        f.clave === 'todos'
                          ? miembros.length
                          : f.clave === 'suspendido'
                            ? cuentas.suspendidos
                            : f.clave === 'socio'
                              ? cuentas.socios
                              : cuentas.colaboradores,
                    }))}
                  />
                }
              >
                {visibles.length === 0 ? (
                  <p className="cuerpo c-500 centrado equipo__sin-resultados">
                    Nadie en este filtro.
                  </p>
                ) : (
                  <ul className={entrando ? 'equipo__lista entrando' : 'equipo__lista'}>
                    {visibles.map((m, indice) => (
                      <FilaMiembro
                        indice={indice}
                        key={m.id}
                        miembro={m}
                        editable={esPropietario && m.rol !== 'propietario'}
                        confirmando={confirmando === m.id}
                        cambiandoTipo={cambiandoTipo === m.id}
                        tipos={tipos}
                        ocupado={ocupado === m.id}
                        nuevo={recienLlegado === m.id}
                        alPedirSuspension={() => {
                          setCambiandoTipo(null);
                          setConfirmando(m.id);
                        }}
                        alCancelar={() => setConfirmando(null)}
                        alPedirCambioTipo={() => {
                          setConfirmando(null);
                          setCambiandoTipo(m.id);
                        }}
                        alCancelarCambioTipo={() => setCambiandoTipo(null)}
                        alCambiarTipo={(tipoId) => cambiarTipo(m, tipoId)}
                        alCambiarEstado={() => cambiarEstado(m)}
                        alRestablecer={() => restablecer(m)}
                      />
                    ))}
                  </ul>
                )}
              </Tarjeta>
              </div>
            )}

            {!esPropietario && (
              <Alerta variante="info">
                Solo el propietario puede sumar, suspender o reactivar integrantes.
              </Alerta>
            )}
          </>
        )}
      </div>
    </DisenoApp>
  );
}

function FilaMiembro({
  indice,
  miembro,
  editable,
  confirmando,
  cambiandoTipo,
  tipos,
  ocupado,
  nuevo,
  alPedirSuspension,
  alCancelar,
  alPedirCambioTipo,
  alCancelarCambioTipo,
  alCambiarTipo,
  alCambiarEstado,
  alRestablecer,
}: {
  indice: number;
  miembro: MiembroEquipo;
  editable: boolean;
  confirmando: boolean;
  cambiandoTipo: boolean;
  tipos: TipoColaborador[];
  ocupado: boolean;
  nuevo: boolean;
  alPedirSuspension: () => void;
  alCancelar: () => void;
  alPedirCambioTipo: () => void;
  alCancelarCambioTipo: () => void;
  alCambiarTipo: (tipoId: string) => void;
  alCambiarEstado: () => void;
  alRestablecer: () => void;
}) {
  const [tipoElegido, setTipoElegido] = useState(miembro.tipo_colaborador_id ?? '');
  const suspendido = miembro.estado === 'suspendido';
  const clases = ['equipo__fila', suspendido ? 'suspendido' : '', nuevo ? 'nuevo' : '']
    .filter(Boolean)
    .join(' ');

  return (
    <li
      className={clases}
      style={
        {
          // Para que la transición sepa que es la misma fila antes y después
          // de filtrar, y la deslice en lugar de borrarla y dibujarla de nuevo.
          viewTransitionName: `miembro-${miembro.id}`,
          '--orden': indice,
        } as React.CSSProperties
      }
    >
      <span className="avatar-inicial">{inicial(miembro.nombre)}</span>

      <div className="equipo__quien">
        <strong>{miembro.nombre}</strong>
        <span className="pie c-500">{miembro.correo}</span>
      </div>

      <div className="equipo__rol">
        <Insignia variante={miembro.rol === 'propietario' ? 'exito' : miembro.rol === 'socio' ? 'info' : 'neutro'}>
          {NOMBRE_ROL[miembro.rol]}
        </Insignia>
        {miembro.tipo_colaborador && (
          <span className="pie c-500">
            {nombreTipo({ id: miembro.tipo_colaborador_id, nombre: miembro.tipo_colaborador })}
          </span>
        )}
      </div>

      <div className="equipo__estado">
        {suspendido ? (
          <Insignia variante="adv">Suspendido</Insignia>
        ) : miembro.debe_cambiar_contrasena ? (
          <Insignia variante="info">Aún no entró</Insignia>
        ) : (
          <Insignia variante="activo">Activo</Insignia>
        )}
      </div>

      <div className="equipo__acciones">
        {editable && cambiandoTipo && (
          <div className="equipo__cambio-tipo" role="group" aria-label={`Cambiar el tipo de ${miembro.nombre}`}>
            <select
              aria-label="Tipo de colaborador"
              value={tipoElegido}
              onChange={(e) => setTipoElegido(e.target.value)}
              disabled={ocupado}
            >
              {tipos.map((t) => (
                <option key={t.id} value={t.id}>
                  {nombreTipo(t)}
                </option>
              ))}
            </select>
            <Boton variante="secundario" onClick={alCancelarCambioTipo} disabled={ocupado}>
              Cancelar
            </Boton>
            <Boton
              variante="primario"
              onClick={() => alCambiarTipo(tipoElegido)}
              disabled={ocupado || !tipoElegido || tipoElegido === miembro.tipo_colaborador_id}
            >
              {ocupado ? 'Guardando…' : 'Guardar'}
            </Boton>
          </div>
        )}

        {editable && !confirmando && !cambiandoTipo && (
          <>
            {miembro.rol === 'colaborador' && !suspendido && (
              <Boton
                variante="fantasma"
                onClick={() => {
                  setTipoElegido(miembro.tipo_colaborador_id ?? '');
                  alPedirCambioTipo();
                }}
                disabled={ocupado}
                title="Cambia a qué módulos entra"
              >
                <Icono nombre="lapiz" tamano={16} />
                <span className="equipo__texto-accion">Tipo</span>
              </Boton>
            )}
            {!suspendido && (
              <Boton
                variante="fantasma"
                onClick={alRestablecer}
                disabled={ocupado}
                title="Le enviamos una contraseña temporal nueva a su correo"
              >
                <Icono nombre="llave" tamano={16} />
                <span className="equipo__texto-accion">Nueva clave</span>
              </Boton>
            )}
            {suspendido ? (
              <Boton variante="secundario" onClick={alCambiarEstado} disabled={ocupado}>
                {ocupado ? 'Reactivando…' : 'Reactivar'}
              </Boton>
            ) : (
              <Boton variante="secundario" onClick={alPedirSuspension} disabled={ocupado}>
                Suspender
              </Boton>
            )}
          </>
        )}

        {editable && confirmando && (
          <div className="equipo__confirmar" role="group" aria-label={`Confirmar suspensión de ${miembro.nombre}`}>
            <span className="pie">Se cierran sus sesiones y no podrá entrar.</span>
            <Boton variante="secundario" onClick={alCancelar} disabled={ocupado}>
              Cancelar
            </Boton>
            <Boton variante="destructivo" onClick={alCambiarEstado} disabled={ocupado}>
              {ocupado ? 'Suspendiendo…' : 'Suspender'}
            </Boton>
          </div>
        )}
      </div>
    </li>
  );
}
