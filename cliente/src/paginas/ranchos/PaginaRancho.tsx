import { useEffect, useState } from 'react';
import {
  Alerta,
  Boton,
  CampoLista,
  CampoTexto,
  Cargando,
  Cifra,
  Dato,
  Datos,
  DisenoApp,
  EstadoVacio,
  Icono,
  Insignia,
  PasosDeAlta,
  Tarjeta,
} from '../../componentes';
import {
  api,
  type EstadoRancho,
  type Pais,
  type Rancho,
} from '../../servicios/api';

/**
 * HU-15, Creacion del rancho. La pantalla principal del propietario.
 */

const VACIO = {
  nombre: '',
  departamento: '',
  localidad: '',
  superficie: '',
  tipo_produccion: 'carne',
  pais_codigo: 'BO',
  latitud: '',
  longitud: '',
};

const TIPOS: Record<string, string> = {
  carne: 'Carne',
  leche: 'Leche',
  mixto: 'Mixto',
};

export function PaginaRancho() {
  const [estado, setEstado] = useState<EstadoRancho | null>(null);
  const [paises, setPaises] = useState<Pais[]>([]);
  const [formulario, setFormulario] = useState({ ...VACIO });
  const [editando, setEditando] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [cargando, setCargando] = useState(true);

  // Estados para el formulario de invitar colaborador (HU-13)
  const [correoColaborador, setCorreoColaborador] = useState('');
  const [enviandoInvitacion, setEnviandoInvitacion] = useState(false);
  const [errorInvitacion, setErrorInvitacion] = useState('');
  const [exitoInvitacion, setExitoInvitacion] = useState('');

  /** Lo que se le pide al servidor para dibujar la pantalla. */
  async function pedirDatos() {
    const [datos, listaPaises] = await Promise.all([api.miRancho(), api.paises()]);
    return { datos, listaPaises };
  }

  function aplicarDatos({
    datos,
    listaPaises,
  }: Awaited<ReturnType<typeof pedirDatos>>) {
    setEstado(datos);
    setPaises(listaPaises);
    if (datos.rancho) volcarEnFormulario(datos.rancho);
  }

  async function recargar() {
    setCargando(true);
    setError('');
    try {
      aplicarDatos(await pedirDatos());
    } catch (e) {
      setError((e as Error).message);
      setEstado(null);
    } finally {
      setCargando(false);
    }
  }

  function volcarEnFormulario(rancho: Rancho) {
    setFormulario({
      nombre: rancho.nombre,
      departamento: rancho.departamento,
      localidad: rancho.localidad,
      superficie: String(Number(rancho.superficie)),
      tipo_produccion: rancho.tipo_produccion,
      pais_codigo: rancho.pais_codigo,
      latitud: rancho.latitud ? String(Number(rancho.latitud)) : '',
      longitud: rancho.longitud ? String(Number(rancho.longitud)) : '',
    });
  }

  useEffect(() => {
    let vigente = true;
    void (async () => {
      try {
        const resultado = await pedirDatos();
        if (!vigente) return;
        setError('');
        aplicarDatos(resultado);
      } catch (e) {
        if (!vigente) return;
        setError((e as Error).message);
        setEstado(null);
      } finally {
        if (vigente) setCargando(false);
      }
    })();
    return () => {
      vigente = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function campo(nombre: keyof typeof VACIO) {
    return {
      value: formulario[nombre],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setFormulario({ ...formulario, [nombre]: e.target.value }),
    };
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setAviso('');
    const datos: Record<string, unknown> = {
      ...formulario,
      superficie: Number(formulario.superficie),
      latitud: formulario.latitud === '' ? null : Number(formulario.latitud),
      longitud: formulario.longitud === '' ? null : Number(formulario.longitud),
    };
    try {
      if (estado?.rancho) {
        await api.actualizar(estado.rancho.id, datos);
        setAviso('Rancho actualizado.');
      } else {
        datos.id = crypto.randomUUID();
        await api.crear(datos);
        setAviso('Rancho creado.');
      }
      setEditando(false);
      await recargar();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function darDeBaja() {
    if (!estado?.rancho) return;
    if (!confirm(`¿Dar de baja "${estado.rancho.nombre}"? La información no se borra.`)) return;
    setError('');
    setAviso('');
    try {
      await api.darDeBaja(estado.rancho.id);
      setAviso('Rancho dado de baja. El registro sigue en la base de datos.');
      setFormulario({ ...VACIO });
      await recargar();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  // HU-13: Función para invitar/agregar a un colaborador
  async function agregarColaborador(e: React.FormEvent) {
    e.preventDefault();
    setErrorInvitacion('');
    setExitoInvitacion('');

    if (!correoColaborador) {
      setErrorInvitacion('Ingresa el correo del colaborador.');
      return;
    }

    setEnviandoInvitacion(true);
    try {
      const respuesta = await api.agregarColaborador({ correo: correoColaborador });
      setExitoInvitacion(respuesta.mensaje);
      setCorreoColaborador(''); // Limpiamos el campo
    } catch (err) {
      // Aquí se mostrará el mensaje de conflicto si el correo ya pertenece a otro rancho
      setErrorInvitacion((err as Error).message);
    } finally {
      setEnviandoInvitacion(false);
    }
  }

  const rancho = estado?.rancho ?? null;
  const esPropietario = estado?.usuario.rol === 'propietario';
  const mostrarFormulario = esPropietario && (!rancho || editando);
  const usuario = estado?.usuario ?? { nombre: 'Invitado', rol: '—' };

  // HU-14: Obtenemos los metadatos del país seleccionado actualmente
  const datosPaisActual = paises.find((p) => p.codigo === rancho?.pais_codigo);

  return (
    <DisenoApp
      ruta={['Mi rancho', capitalizar(usuario.rol)]}
      usuario={usuario}
      rancho={rancho?.nombre ?? null}
      rotulo="Resumen del rancho"
      titulo={rancho ? rancho.nombre : 'Mi rancho'}
      acciones={
        rancho && !editando && esPropietario ? (
          <>
            <Boton variante="secundario" onClick={() => setEditando(true)}>
              <Icono nombre="lapiz" tamano={18} />
              Editar
            </Boton>
            <Boton variante="destructivo" onClick={darDeBaja}>
              <Icono nombre="archivar" tamano={18} />
              Dar de baja
            </Boton>
          </>
        ) : undefined
      }
    >
      <div className="col g24">
        {cargando && <Cargando />}
        {error && <Alerta variante="error">{error}</Alerta>}
        {aviso && <Alerta variante="exito">{aviso}</Alerta>}

        {!cargando && rancho && !editando && (
          <>
            <div className="rejilla-cifras">
              <Cifra
                rotulo="Superficie"
                icono="regla"
                valor={`${Number(rancho.superficie)} ha`}
                detalle={`${rancho.localidad}, ${rancho.departamento}`}
              />
              <Cifra
                rotulo="Tipo de producción"
                icono="produccion"
                valor={TIPOS[rancho.tipo_produccion] ?? rancho.tipo_produccion}
                detalle={`País ${rancho.pais_codigo}`}
              />
              <Cifra
                rotulo="Existencias totales"
                icono="animal"
                valor="—"
                detalle="Llega en la fase 2"
              />
              <Cifra
                rotulo="Corrales"
                icono="corral"
                valor="—"
                detalle="Llega en la fase 2"
              />
            </div>

            <div className="par">
              <Tarjeta
                titulo="Datos del rancho"
                accion={
                  <Insignia variante="exito">
                    Producción de {rancho.tipo_produccion}
                  </Insignia>
                }
              >
                <Datos>
                  <Dato nombre="Departamento">{rancho.departamento}</Dato>
                  <Dato nombre="Localidad">{rancho.localidad}</Dato>
                  <Dato nombre="Superficie">{Number(rancho.superficie)} ha</Dato>
                  <Dato nombre="Coordenadas">
                    {rancho.latitud ? (
                      <span className="dato fila centro g6">
                        <Icono nombre="ubicacion" tamano={16} />
                        {Number(rancho.latitud)}, {Number(rancho.longitud)}
                      </span>
                    ) : (
                      <span className="c-500">Sin ubicación cargada</span>
                    )}
                  </Dato>
                  
                  {/* HU-14: Mostramos la configuración regional */}
                  <Dato nombre="Moneda e Idioma">
                    {datosPaisActual ? `${datosPaisActual.moneda} (${datosPaisActual.idioma})` : '—'}
                  </Dato>
                  <Dato nombre="Unidades">
                    {datosPaisActual ? `Peso: ${datosPaisActual.unidad_peso} · Superficie: ${datosPaisActual.unidad_superficie}` : '—'}
                  </Dato>
                  <Dato nombre="Zona Horaria y Fecha">
                    {datosPaisActual ? `${datosPaisActual.zona_horaria} (${datosPaisActual.formato_fecha})` : '—'}
                  </Dato>
                  <Dato nombre="Franja de Precio">
                    {datosPaisActual?.franja_precio ?? '—'}
                  </Dato>

                  {/* HU-23: Auditoría y autoría de datos */}
                  <Dato nombre="Auditoría">
                    <div className="texto-secundario">
                      Creado el {rancho.creado_en ? new Date(rancho.creado_en).toLocaleString() : '—'}
                      <br />
                      Última modificación el {rancho.modificado_en ? new Date(rancho.modificado_en).toLocaleString() : '—'}
                    </div>
                  </Dato>
                </Datos>
              </Tarjeta>

              <div className="col g16">
                <Tarjeta titulo="Tu recorrido">
                  <ol className="pasos">
                    <Paso hecho>Cuenta creada</Paso>
                    <Paso hecho>Correo confirmado</Paso>
                    <Paso hecho>Rancho creado</Paso>
                    <Paso fase={2}>Cargar los animales</Paso>
                    <Paso fase={2}>Crear los corrales</Paso>
                    <Paso fase={2}>Invitar al equipo</Paso>
                  </ol>
                </Tarjeta>

                {/* Formulario Provisional HU-13 para invitar equipo */}
                {esPropietario && (
                  <Tarjeta titulo="Invitar al equipo (HU-13)">
                    <p className="texto-secundario pie mb16">
                      Prueba dar de alta a un colaborador. Si su correo ya existe en otro rancho, el sistema lo rechazará.
                    </p>
                    {errorInvitacion && <Alerta variante="error">{errorInvitacion}</Alerta>}
                    {exitoInvitacion && <Alerta variante="exito">{exitoInvitacion}</Alerta>}
                    
                    <form onSubmit={agregarColaborador} className="fila centro g8 mt8">
                      <div style={{ flex: 1 }}>
                        <CampoTexto
                          etiqueta=""
                          placeholder="ejemplo@correo.com"
                          type="email"
                          value={correoColaborador}
                          onChange={(e) => setCorreoColaborador(e.target.value)}
                        />
                      </div>
                      <Boton type="submit" variante="primario" disabled={enviandoInvitacion}>
                        {enviandoInvitacion ? 'Enviando...' : 'Invitar'}
                      </Boton>
                    </form>
                  </Tarjeta>
                )}
              </div>
            </div>
          </>
        )}

        {!cargando && !rancho && !esPropietario && estado && (
          <EstadoVacio
            titulo="Todavía no hay rancho"
            texto="Este usuario no pertenece a ningún rancho. El propietario es quien lo crea."
          />
        )}

        {!cargando && mostrarFormulario && !rancho && <PasosDeAlta actual={3} />}

        {!cargando && mostrarFormulario && (
          <Tarjeta titulo={rancho ? 'Editar rancho' : 'Crear mi rancho'}>
            <form onSubmit={guardar} className="col g16">
              <CampoTexto
                etiqueta="Nombre"
                obligatorio
                placeholder="Ej. Rancho El Cerrito"
                {...campo('nombre')}
              />
              <div className="par">
                <CampoTexto etiqueta="Departamento" obligatorio {...campo('departamento')} />
                <CampoTexto etiqueta="Localidad" obligatorio {...campo('localidad')} />
              </div>
              <div className="par">
                <CampoTexto
                  etiqueta="Superficie"
                  ayuda="En hectáreas."
                  obligatorio
                  type="number"
                  step="0.01"
                  min="0.01"
                  {...campo('superficie')}
                />
                <CampoLista etiqueta="Tipo de producción" obligatorio {...campo('tipo_produccion')}>
                  <option value="carne">Carne</option>
                  <option value="leche">Leche</option>
                  <option value="mixto">Mixto</option>
                </CampoLista>
              </div>
              <CampoLista etiqueta="País" obligatorio {...campo('pais_codigo')}>
                {paises.map((p) => (
                  <option key={p.codigo} value={p.codigo}>
                    {p.nombre}
                  </option>
                ))}
              </CampoLista>
              <div className="par">
                <CampoTexto
                  etiqueta="Latitud"
                  ayuda="Opcional. Si cargas una, carga las dos."
                  {...campo('latitud')}
                />
                <CampoTexto etiqueta="Longitud" ayuda="Opcional." {...campo('longitud')} />
              </div>
              <div className="fila centro g8">
                <Boton type="submit" variante="primario">
                  <Icono nombre={rancho ? 'exito' : 'mas'} tamano={18} />
                  {rancho ? 'Guardar cambios' : 'Crear rancho'}
                </Boton>
                {rancho && (
                  <Boton
                    variante="fantasma"
                    onClick={() => {
                      setEditando(false);
                      volcarEnFormulario(rancho);
                    }}
                  >
                    Cancelar
                  </Boton>
                )}
              </div>
            </form>
          </Tarjeta>
        )}

        {!cargando && !esPropietario && rancho && (
          <Alerta variante="info">
            Solo el propietario puede crear o editar el rancho.
          </Alerta>
        )}
      </div>
    </DisenoApp>
  );
}

function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/**
 * Una linea del recorrido. Lo hecho lleva tilde; lo que falta, el circulo
 * punteado y la fase en la que llega.
 */
function Paso({
  hecho = false,
  fase,
  children,
}: {
  hecho?: boolean;
  fase?: number;
  children: React.ReactNode;
}) {
  return (
    <li className={hecho ? 'hecho' : undefined}>
      <Icono nombre={hecho ? 'exito' : 'pendiente'} tamano={18} />
      <span>
        {children}
        {fase && <span className="pie"> · fase {fase}</span>}
      </span>
    </li>
  );
}