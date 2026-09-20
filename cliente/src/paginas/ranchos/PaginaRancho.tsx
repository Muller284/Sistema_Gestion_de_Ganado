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
 *
 * El marco es el de los mockups: menu lateral, barra superior y el contenido
 * sobre el fondo arena. Las cifras de arriba son las del panel del propietario;
 * las que dependen de modulos de la fase 2 se muestran con un guion, porque el
 * dato todavia no existe. Es la misma idea de HU-16: dejar visible lo que
 * viene, en lugar de esconderlo y que la pantalla crezca de golpe.
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

  /** Se llama despues de guardar o de dar de baja, nunca desde un efecto. */
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

  // La primera carga. No se toca el estado antes del primer await: hacerlo
  // dentro de un efecto encadena renderizados.
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
        // El identificador lo genera el cliente: es la convencion del equipo
        // y es lo que despues permite trabajar sin conexion.
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

  const rancho = estado?.rancho ?? null;
  const esPropietario = estado?.usuario.rol === 'propietario';
  const mostrarFormulario = esPropietario && (!rancho || editando);

  const usuario = estado?.usuario ?? { nombre: 'Invitado', rol: '—' };

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
                </Datos>
              </Tarjeta>

              <Tarjeta titulo="Siguientes pasos">
                <ol className="pasos">
                  <li className="hecho">
                    <Icono nombre="exito" tamano={18} />
                    <span>
                      <strong>Rancho creado.</strong>{' '}
                      <span className="c-600">Listo.</span>
                    </span>
                  </li>
                  <li>
                    <Icono nombre="pendiente" tamano={18} />
                    <span>
                      Cargar los animales · <span className="pie">fase 2</span>
                    </span>
                  </li>
                  <li>
                    <Icono nombre="pendiente" tamano={18} />
                    <span>
                      Crear los corrales · <span className="pie">fase 2</span>
                    </span>
                  </li>
                  <li>
                    <Icono nombre="pendiente" tamano={18} />
                    <span>
                      Invitar al equipo · <span className="pie">fase 2</span>
                    </span>
                  </li>
                </ol>
              </Tarjeta>
            </div>
          </>
        )}

        {!cargando && !rancho && !esPropietario && estado && (
          <EstadoVacio
            titulo="Todavía no hay rancho"
            texto="Este usuario no pertenece a ningún rancho. El propietario es quien lo crea."
          />
        )}

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
