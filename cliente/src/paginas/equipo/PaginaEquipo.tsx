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
import { t } from '../../servicios/idioma';
import { nombreRol, nombreTipo } from '../../servicios/permisos';
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

// El nombre de cada filtro está en equipo.filtros.<clave>; se traduce al dibujar.
const FILTROS: Filtro[] = ['todos', 'socio', 'colaborador', 'suspendido'];

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
        // El colaborador no ve el equipo (403). El mensaje llega traducido
        // del servidor, así que se decide por el rol y no por el texto.
        if (rol === 'colaborador') setSinPermiso(mensaje);
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

  const usuario = rancho?.usuario ?? { nombre: t('equipo.invitado'), rol: '—' };

  return (
    <DisenoApp
      activo="equipo"
      ruta={[t('equipo.titulo'), nombreRol(usuario.rol)]}
      usuario={usuario}
      rancho={rancho?.rancho?.nombre ?? null}
      rotulo={t('equipo.rotulo')}
      titulo={t('equipo.titulo')}
      acciones={
        rancho?.tieneRancho && !sinPermiso && !cargando ? (
          <>
            <Link className="btn btn-secundario" to="/equipo/tipos">
              <Icono nombre="llave" tamano={18} />
              {t('equipo.acciones.tipos')}
            </Link>
            {esPropietario && !agregando && (
              <Boton variante="primario" onClick={() => abrirFormulario(true)}>
                <Icono nombre="persona-mas" tamano={18} />
                {t('equipo.acciones.agregar')}
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
            titulo={t('equipo.sinPermiso')}
            texto={sinPermiso}
          />
        )}

        {!cargando && rancho && !rancho.tieneRancho && (
          <EstadoVacio
            icono="casa"
            titulo={t('equipo.sinRancho.titulo')}
            texto={t('equipo.sinRancho.texto')}
            accion={
              <Link className="btn btn-primario" to="/rancho">
                {t('equipo.sinRancho.accion')}
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
                rotulo={t('equipo.cifras.activos.rotulo')}
                icono="equipo"
                valor={String(cuentas.activos)}
                detalle={t('equipo.cifras.activos.detalle')}
              />
              <Cifra
                rotulo={t('equipo.cifras.socios.rotulo')}
                icono="persona-mas"
                valor={String(cuentas.socios)}
                detalle={t('equipo.cifras.socios.detalle')}
              />
              <Cifra
                rotulo={t('equipo.cifras.colaboradores.rotulo')}
                icono="sanidad"
                valor={String(cuentas.colaboradores)}
                detalle={t('equipo.cifras.colaboradores.detalle')}
              />
              <Cifra
                rotulo={t('equipo.cifras.suspendidos.rotulo')}
                icono="pendiente"
                valor={String(cuentas.suspendidos)}
                detalle={t('equipo.cifras.suspendidos.detalle')}
              />
            </div>

            {miembros.length <= 1 && !agregando ? (
              <EstadoVacio
                icono="equipo"
                titulo={t('equipo.vacio.titulo')}
                texto={t('equipo.vacio.texto')}
                accion={
                  esPropietario ? (
                    <Boton variante="primario" onClick={() => abrirFormulario(true)}>
                      <Icono nombre="persona-mas" tamano={18} />
                      {t('equipo.vacio.accion')}
                    </Boton>
                  ) : undefined
                }
              />
            ) : (
              <div className="vt-lista">
              <Tarjeta
                titulo={t('equipo.lista.titulo')}
                accion={
                  <Segmentos
                    etiqueta={t('equipo.lista.filtrar')}
                    valor={filtro}
                    alCambiar={filtrar}
                    opciones={FILTROS.map((clave) => ({
                      clave,
                      nombre: t(`equipo.filtros.${clave}`),
                      cantidad:
                        clave === 'todos'
                          ? miembros.length
                          : clave === 'suspendido'
                            ? cuentas.suspendidos
                            : clave === 'socio'
                              ? cuentas.socios
                              : cuentas.colaboradores,
                    }))}
                  />
                }
              >
                {visibles.length === 0 ? (
                  <p className="cuerpo c-500 centrado equipo__sin-resultados">
                    {t('equipo.lista.sinResultados')}
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
                {t('equipo.soloPropietario')}
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
          {nombreRol(miembro.rol)}
        </Insignia>
        {miembro.tipo_colaborador && (
          <span className="pie c-500">
            {nombreTipo({ id: miembro.tipo_colaborador_id, nombre: miembro.tipo_colaborador })}
          </span>
        )}
      </div>

      <div className="equipo__estado">
        {suspendido ? (
          <Insignia variante="adv">{t('equipo.estados.suspendido')}</Insignia>
        ) : miembro.debe_cambiar_contrasena ? (
          <Insignia variante="info">{t('equipo.estados.sinEntrar')}</Insignia>
        ) : (
          <Insignia variante="activo">{t('equipo.estados.activo')}</Insignia>
        )}
      </div>

      <div className="equipo__acciones">
        {editable && cambiandoTipo && (
          <div className="equipo__cambio-tipo" role="group" aria-label={t('equipo.cambioTipo.grupo', { nombre: miembro.nombre })}>
            <select
              aria-label={t('equipo.cambioTipo.lista')}
              value={tipoElegido}
              onChange={(e) => setTipoElegido(e.target.value)}
              disabled={ocupado}
            >
              {tipos.map((tipo) => (
                <option key={tipo.id} value={tipo.id}>
                  {nombreTipo(tipo)}
                </option>
              ))}
            </select>
            <Boton variante="secundario" onClick={alCancelarCambioTipo} disabled={ocupado}>
              {t('comun.cancelar')}
            </Boton>
            <Boton
              variante="primario"
              onClick={() => alCambiarTipo(tipoElegido)}
              disabled={ocupado || !tipoElegido || tipoElegido === miembro.tipo_colaborador_id}
            >
              {ocupado ? t('comun.guardando') : t('comun.guardar')}
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
                title={t('equipo.fila.tipoAyuda')}
              >
                <Icono nombre="lapiz" tamano={16} />
                <span className="equipo__texto-accion">{t('equipo.fila.tipo')}</span>
              </Boton>
            )}
            {!suspendido && (
              <Boton
                variante="fantasma"
                onClick={alRestablecer}
                disabled={ocupado}
                title={t('equipo.fila.claveAyuda')}
              >
                <Icono nombre="llave" tamano={16} />
                <span className="equipo__texto-accion">{t('equipo.fila.clave')}</span>
              </Boton>
            )}
            {suspendido ? (
              <Boton variante="secundario" onClick={alCambiarEstado} disabled={ocupado}>
                {ocupado ? t('equipo.fila.reactivando') : t('equipo.fila.reactivar')}
              </Boton>
            ) : (
              <Boton variante="secundario" onClick={alPedirSuspension} disabled={ocupado}>
                {t('equipo.fila.suspender')}
              </Boton>
            )}
          </>
        )}

        {editable && confirmando && (
          <div className="equipo__confirmar" role="group" aria-label={t('equipo.confirmar.grupo', { nombre: miembro.nombre })}>
            <span className="pie">{t('equipo.confirmar.texto')}</span>
            <Boton variante="secundario" onClick={alCancelar} disabled={ocupado}>
              {t('comun.cancelar')}
            </Boton>
            <Boton variante="destructivo" onClick={alCambiarEstado} disabled={ocupado}>
              {ocupado ? t('equipo.fila.suspendiendo') : t('equipo.fila.suspender')}
            </Boton>
          </div>
        )}
      </div>
    </li>
  );
}
