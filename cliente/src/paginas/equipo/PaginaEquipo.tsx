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
import { inicial } from '../../servicios/texto';
import { conTransicion } from '../../servicios/transicion';
import { FormularioAlta } from './FormularioAlta';

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

const MODULOS_SISTEMA = ['animales', 'corrales', 'sanidad', 'pesajes', 'importacion', 'almacen', 'equipo', 'planes'] as const;
type ModuloSistema = typeof MODULOS_SISTEMA[number];

interface PermisosModulo {
  ver: boolean;
  editar: boolean;
}

type PermisosPorModulo = Record<ModuloSistema, PermisosModulo>;

interface MiembroEquipoExtendido extends MiembroEquipo {
  puede_editar?: boolean;
  puedeEditar?: boolean;
  permisosModulos?: PermisosPorModulo;
}

export function PaginaEquipo() {
  const [rancho, setRancho] = useState<EstadoRancho | null>(null);
  const [miembros, setMiembros] = useState<MiembroEquipoExtendido[]>([]);
  const [tipos, setTipos] = useState<TipoColaborador[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [sinPermiso, setSinPermiso] = useState('');
  const [aviso, setAviso] = useState<{ mensaje: string; detalle?: string } | null>(null);
  const [agregando, setAgregando] = useState(false);
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [recienLlegado, setRecienLlegado] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(true);

  const [miembroSeleccionadoModulos, setMiembroSeleccionadoModulos] = useState<MiembroEquipoExtendido | null>(null);

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
        
        const listaConPermisos: MiembroEquipoExtendido[] = lista.map((m) => {
          const permisosGuardados = localStorage.getItem(`permisos_${m.id}`);
          let modulosIniciales: PermisosPorModulo;

          if (permisosGuardados) {
            try {
              modulosIniciales = JSON.parse(permisosGuardados);
            } catch {
              modulosIniciales = crearModulosPorDefecto(m.rol);
            }
          } else {
            modulosIniciales = crearModulosPorDefecto(m.rol);
          }

          return {
            ...m,
            permisosModulos: modulosIniciales
          };
        });

        setMiembros(listaConPermisos);
        setTipos(listaTipos);

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

  function crearModulosPorDefecto(rol: string): PermisosPorModulo {
    const base = {} as Record<ModuloSistema, PermisosModulo>;
    for (const mod of MODULOS_SISTEMA) {
      base[mod] = { ver: true, editar: rol === 'propietario' || rol === 'admin' };
    }
    return base as PermisosPorModulo;
  }

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
      const nuevoMiembro: MiembroEquipoExtendido = {
        ...miembro,
        puede_editar: false,
        permisosModulos: crearModulosPorDefecto(miembro.rol)
      };
      setMiembros((previos) => [...previos, nuevoMiembro]);
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
          previos.map((m) => (m.id === miembro.id ? { ...m, ...respuesta.miembro } : m)),
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

  async function actualizarPermisoModulo(miembroId: string, modulo: ModuloSistema, tipo: 'ver' | 'editar') {
    setMiembros((previos) =>
      previos.map((m) => {
        if (m.id !== miembroId) return m;
        const modulosActuales = m.permisosModulos || crearModulosPorDefecto(m.rol);
        const estadoModulo = modulosActuales[modulo] || { ver: true, editar: false };

        const nuevoEstadoModulo: PermisosModulo = {
          ...estadoModulo,
          [tipo]: !estadoModulo[tipo],
        };

        const actualizado: MiembroEquipoExtendido = {
          ...m,
          permisosModulos: {
            ...modulosActuales,
            [modulo]: nuevoEstadoModulo,
          },
        };

        if (miembroSeleccionadoModulos && miembroSeleccionadoModulos.id === miembroId) {
          setMiembroSeleccionadoModulos(actualizado);
        }

        localStorage.setItem(`permisos_${miembroId}`, JSON.stringify(actualizado.permisosModulos));
        return actualizado;
      }),
    );

    setAviso({ mensaje: `Permiso de ${tipo} en el módulo "${modulo}" actualizado correctamente (HU-19).` });
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
        esPropietario && rancho?.tieneRancho && !agregando ? (
          <Boton variante="primario" onClick={() => abrirFormulario(true)}>
            <Icono nombre="persona-mas" tamano={18} />
            Agregar integrante
          </Boton>
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

        {miembroSeleccionadoModulos && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: '#fff', padding: '32px', borderRadius: '12px', width: '90%', maxWidth: '650px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)' }} className="col g16">
              <div className="fila entre" style={{ alignItems: 'center' }}>
                <h3 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>
                  Permisos por módulo para {miembroSeleccionadoModulos.nombre} (HU-19)
                </h3>
                <button onClick={() => setMiembroSeleccionadoModulos(null)} style={{ background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
              </div>
              <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>
                Otorga de forma separada los permisos de <strong>Ver</strong> y <strong>Editar</strong> para cada uno de los 8 módulos del sistema.
              </p>

              <div style={{ maxHeight: '350px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
                {MODULOS_SISTEMA.map((modulo) => {
                  const estado = miembroSeleccionadoModulos.permisosModulos?.[modulo] || { ver: true, editar: false };
                  return (
                    <div key={modulo} className="fila entre" style={{ padding: '12px 16px', background: '#f9fafb', borderRadius: '8px', alignItems: 'center' }}>
                      <span style={{ textTransform: 'capitalize', fontWeight: 600, color: '#374151' }}>📦 {modulo}</span>
                      <div className="fila g16">
                        <label className="fila g6" style={{ cursor: 'pointer', alignItems: 'center', fontSize: '14px', fontWeight: 500 }}>
                          <input 
                            type="checkbox" 
                            checked={estado.ver} 
                            onChange={() => actualizarPermisoModulo(miembroSeleccionadoModulos.id, modulo, 'ver')} 
                          />
                          Ver
                        </label>
                        <label className="fila g6" style={{ cursor: 'pointer', alignItems: 'center', fontSize: '14px', fontWeight: 500 }}>
                          <input 
                            type="checkbox" 
                            checked={estado.editar} 
                            onChange={() => actualizarPermisoModulo(miembroSeleccionadoModulos.id, modulo, 'editar')} 
                          />
                          Editar
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="fila derecha" style={{ marginTop: '12px' }}>
                <Boton variante="primario" onClick={() => setMiembroSeleccionadoModulos(null)}>
                  Guardar y cerrar
                </Boton>
              </div>
            </div>
          </div>
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
                titulo="Integrantes y permisos por módulo (HU-19)"
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
                        ocupado={ocupado === m.id}
                        nuevo={recienLlegado === m.id}
                        alPedirSuspension={() => setConfirmando(m.id)}
                        alCancelar={() => setConfirmando(null)}
                        alCambiarEstado={() => cambiarEstado(m)}
                        alRestablecer={() => restablecer(m)}
                        alAbrirPermisosModulos={() => setMiembroSeleccionadoModulos(m)}
                      />
                    ))}
                  </ul>
                )}
              </Tarjeta>
              </div>
            )}

            {!esPropietario && (
              <Alerta variante="info">
                Solo el propietario puede gestionar los permisos granulares por módulo.
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
  ocupado,
  nuevo,
  alPedirSuspension,
  alCancelar,
  alCambiarEstado,
  alRestablecer,
  alAbrirPermisosModulos,
}: {
  indice: number;
  miembro: MiembroEquipoExtendido;
  editable: boolean;
  confirmando: boolean;
  ocupado: boolean;
  nuevo: boolean;
  alPedirSuspension: () => void;
  alCancelar: () => void;
  alCambiarEstado: () => void;
  alRestablecer: () => void;
  alAbrirPermisosModulos: () => void;
}) {
  const suspendido = miembro.estado === 'suspendido';
  const clases = ['equipo__fila', suspendido ? 'suspendido' : '', nuevo ? 'nuevo' : '']
    .filter(Boolean)
    .join(' ');

  return (
    <li
      className={clases}
      style={
        {
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
          <span className="pie c-500">{miembro.tipo_colaborador}</span>
        )}
      </div>

      {/* Botón de la rueda de engranaje ordenado en su propia columna */}
      <div className="equipo__permiso">
        {miembro.rol === 'propietario' ? (
          <span className="pie c-500" style={{ fontStyle: 'italic' }}>Acceso total</span>
        ) : (
          <Boton
            variante="secundario"
            onClick={alAbrirPermisosModulos}
            disabled={ocupado || !editable}
            title="Configurar permisos independientes de ver y editar por cada módulo"
            style={{ padding: '6px 10px', minWidth: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            ⚙️
          </Boton>
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

      {/* Acciones principales con ancho flexible para que no desaparezca el botón de suspender */}
      <div className="equipo__acciones" style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
        {editable && !confirmando && (
          <>
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