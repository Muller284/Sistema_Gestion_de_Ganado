import { useEffect, useState } from 'react';
import {
  Alerta,
  Boton,
  CampoLista,
  CampoTexto,
  Cargando,
  Dato,
  Datos,
  EstadoVacio,
  Insignia,
  Tarjeta,
} from '../../componentes';
import {
  api,
  cambiarUsuario,
  usuarioActual,
  type EstadoRancho,
  type Pais,
  type Rancho,
} from '../../servicios/api';

/**
 * HU-15, Creacion del rancho. Pantalla unica con el CRUD completo.
 *
 * Revestida con el sistema de diseño de HU-05. La logica no cambio: son los
 * mismos estados, las mismas llamadas y las mismas reglas que cuando la
 * pantalla no tenia estilos. Lo unico que cambio es que ya no hay un solo
 * color ni un solo tamaño escrito a mano; todo sale de los componentes.
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

export function PaginaRancho() {
  const [estado, setEstado] = useState<EstadoRancho | null>(null);
  const [paises, setPaises] = useState<Pais[]>([]);
  const [formulario, setFormulario] = useState({ ...VACIO });
  const [editando, setEditando] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [cargando, setCargando] = useState(true);
  const [usuario, setUsuario] = useState(usuarioActual());

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

  // La primera carga y el cambio de usuario. No se toca el estado antes del
  // primer await: hacerlo dentro de un efecto encadena renderizados.
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
  }, [usuario]);

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
  const mostrarFormulario = !rancho || editando;
  const esPropietario = estado?.usuario.rol === 'propietario';

  return (
    <main className="pagina pagina-angosta">
      <header className="encabezado-pagina">
        <h1>Mi rancho</h1>
        <p className="cuerpo c-600">
          HU-15 · Creación del rancho. Una cuenta maneja un solo rancho.
        </p>
      </header>

      <div className="col g16">
        {/* Provisional: desaparece cuando existan HU-08 y HU-12. */}
        <Tarjeta
          titulo="Usuario"
          accion={<Insignia variante="adv">Provisional</Insignia>}
        >
          <div className="col g16">
            <CampoTexto
              etiqueta="Identificador del usuario"
              ayuda="Se reemplaza por el inicio de sesión cuando esté HU-08."
              mono
              value={usuario}
              onChange={(e) => {
                setCargando(true);
                cambiarUsuario(e.target.value);
                setUsuario(e.target.value);
              }}
            />
            {estado && (
              <p className="cuerpo c-600">
                {estado.usuario.nombre} — {estado.usuario.rol}
              </p>
            )}
          </div>
        </Tarjeta>

        {cargando && <Cargando />}
        {error && <Alerta variante="error">{error}</Alerta>}
        {aviso && <Alerta variante="exito">{aviso}</Alerta>}

        {!cargando && rancho && !editando && (
          <Tarjeta
            titulo={rancho.nombre}
            accion={
              <Insignia variante="exito">
                Producción de {rancho.tipo_produccion}
              </Insignia>
            }
            pie={
              esPropietario ? (
                <>
                  <Boton variante="secundario" onClick={() => setEditando(true)}>
                    Editar
                  </Boton>
                  <Boton variante="destructivo" onClick={darDeBaja}>
                    Dar de baja
                  </Boton>
                </>
              ) : undefined
            }
          >
            <Datos>
              <Dato nombre="Ubicación">
                {rancho.localidad}, {rancho.departamento} ({rancho.pais_codigo})
              </Dato>
              <Dato nombre="Superficie">{Number(rancho.superficie)} ha</Dato>
              <Dato nombre="Coordenadas">
                {rancho.latitud ? (
                  <span className="dato">
                    {Number(rancho.latitud)}, {Number(rancho.longitud)}
                  </span>
                ) : (
                  <span className="pie c-500">Sin ubicación cargada</span>
                )}
              </Dato>
            </Datos>
          </Tarjeta>
        )}

        {!cargando && !rancho && !error && !esPropietario && (
          <EstadoVacio
            titulo="Todavía no hay rancho"
            texto="Este usuario no pertenece a ningún rancho. El propietario es quien lo crea."
          />
        )}

        {!cargando && mostrarFormulario && esPropietario && (
          <Tarjeta titulo={rancho ? 'Editar rancho' : 'Crear mi rancho'}>
            <form onSubmit={guardar} className="col g16">
              <CampoTexto etiqueta="Nombre" obligatorio {...campo('nombre')} />
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
    </main>
  );
}
