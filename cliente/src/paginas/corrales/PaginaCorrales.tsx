import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
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
import { api, type Animal, type CargaAnimal, type Corral, type RespuestaAsignacion } from '../../servicios/api';
import { limitePorSuperficie, revisarCorral } from '../../servicios/carga';
import { t } from '../../servicios/idioma';
import { conTransicion } from '../../servicios/transicion';
import {
  formatoSuperficie,
  superficieAGuardar,
  superficieAMostrar,
  type Regional,
} from '../../servicios/unidades';
import { nivel, puedeEliminar, useContextoGanado, usuarioDe } from '../ganado/contexto';

/**
 * HU-36 · Creación de corrales.
 *
 *   1. El nombre del corral es único dentro del rancho (lo controla el
 *      servidor; acá se muestra su mensaje).
 *   2. La capacidad es opcional; si no se carga, no hay aviso de sobrepoblación.
 *   3. El listado muestra la ocupación actual sobre la capacidad.
 *
 * HU-34: dar de baja no borra; la vista "Dados de baja" permite restaurar.
 * HU-26: la superficie se escribe y se ve en hectáreas o acres según el país.
 * HU-21 y HU-22: quien solo puede ver no encuentra los botones de cargar.
 *
 * HU-37 · Desde cada corral se le asignan animales, de a uno o de a muchos;
 *         cada asignación queda como movimiento (lo hace el servidor).
 * Pedido del docente · La capacidad no puede pasar de lo que admite la
 *         superficie (animales por hectárea según el tipo de producción del
 *         rancho), y ni la capacidad ni la superficie aceptan cero.
 * HU-38 · La barra de ocupación pasa a advertencia al superar el 100 %, el
 *         listado dice cuáles corrales están excedidos, y asignar de más
 *         avisa pero no lo impide.
 */

type Vista = 'vigentes' | 'bajas';
const NUEVO = 'nuevo';

export function PaginaCorrales() {
  const contexto = useContextoGanado();
  const [corrales, setCorrales] = useState<Corral[]>([]);
  const [vista, setVista] = useState<Vista>('vigentes');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [editando, setEditando] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [asignando, setAsignando] = useState<string | null>(null);
  const [avisoExceso, setAvisoExceso] = useState('');

  const puedeEditar = nivel(contexto, 'corrales') === 'editar';
  // HU-37: mover animales es editar animales, como hacerlo desde la ficha.
  const puedeAsignar = nivel(contexto, 'animales') === 'editar';

  // Cambiar la versión vuelve a pedir la lista.
  const [version, setVersion] = useState(0);
  const recargar = () => setVersion((previa) => previa + 1);

  useEffect(() => {
    let vigente = true;
    api
      .corrales(true)
      .then((lista) => vigente && setCorrales(lista))
      .catch((err: Error) => vigente && setError(err.message))
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [version]);

  const visibles = corrales.filter((c) => (vista === 'bajas') === Boolean(c.eliminado_en));
  const cuantosDeBaja = corrales.filter((c) => c.eliminado_en).length;
  // HU-38, criterio 3.
  const excedidos = corrales.filter((c) => !c.eliminado_en && c.sobrepoblado);

  function abrir(id: string | null) {
    conTransicion(() => {
      setEditando(id);
      setConfirmando(null);
      setAsignando(null);
      setError('');
    });
  }

  async function accion(id: string, hacer: () => Promise<{ mensaje: string }>) {
    setOcupado(id);
    setError('');
    setAviso('');
    try {
      const respuesta = await hacer();
      setAviso(respuesta.mensaje);
      setConfirmando(null);
      recargar();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setOcupado(null);
    }
  }

  function abrirAsignacion(id: string | null) {
    conTransicion(() => {
      setAsignando(id);
      setEditando(null);
      setConfirmando(null);
      setError('');
    });
  }

  /** HU-37 y HU-38: el aviso de exceso se muestra aparte, porque la asignación ya se hizo. */
  function alAsignar(respuesta: RespuestaAsignacion) {
    setAviso(respuesta.mensaje);
    setAvisoExceso(respuesta.aviso ?? '');
    abrirAsignacion(null);
    recargar();
  }

  function alGuardar(mensaje: string) {
    setAviso(mensaje);
    abrir(null);
    recargar();
  }

  return (
    <DisenoApp
      activo="corrales"
      ruta={[t('app.modulos.inicio'), t('corrales.titulo')]}
      usuario={usuarioDe(contexto)}
      rancho={contexto.rancho?.rancho?.nombre ?? null}
      rotulo={t('corrales.rotulo')}
      titulo={t('corrales.titulo')}
      acciones={
        puedeEditar &&
        editando === null && (
          <Boton variante="primario" onClick={() => abrir(NUEVO)}>
            <Icono nombre="mas" tamano={18} />
            {t('corrales.nuevo')}
          </Boton>
        )
      }
    >
      <div className="col g24">
        {(cargando || contexto.cargando) && <Cargando lineas={4} />}
        {error && <Alerta variante="error">{error}</Alerta>}
        {contexto.error && <Alerta variante="error">{contexto.error}</Alerta>}
        {aviso && <Alerta variante="exito">{aviso}</Alerta>}
        {avisoExceso && <Alerta variante="adv">{avisoExceso}</Alerta>}
        {!cargando && excedidos.length > 0 && (
          <Alerta variante="adv">
            {t('corrales.excedidos', {
              n: excedidos.length,
              nombres: excedidos.map((c) => c.nombre).join(', '),
            })}
          </Alerta>
        )}
        {!contexto.cargando && !puedeEditar && !error && (
          <Alerta variante="info">{t('corrales.soloConsulta')}</Alerta>
        )}

        {editando === NUEVO && (
          <FormularioCorral regional={contexto.regional} alGuardar={alGuardar} alCancelar={() => abrir(null)} />
        )}

        {!cargando && !error && (
          <>
            {cuantosDeBaja > 0 && (
              <Segmentos
                etiqueta={t('corrales.vistas.etiqueta')}
                valor={vista}
                alCambiar={setVista}
                opciones={[
                  { clave: 'vigentes', nombre: t('corrales.vistas.vigentes'), cantidad: corrales.length - cuantosDeBaja },
                  { clave: 'bajas', nombre: t('corrales.vistas.bajas'), cantidad: cuantosDeBaja },
                ]}
              />
            )}

            {visibles.length === 0 ? (
              <EstadoVacio
                icono="corral"
                titulo={t('corrales.vacio.titulo')}
                texto={puedeEditar ? t('corrales.vacio.texto') : t('corrales.vacio.textoConsulta')}
              />
            ) : (
              <Tarjeta>
                <ul className="ganado__lista">
                  {visibles.map((corral) =>
                    editando === corral.id ? (
                      <li key={corral.id} className="ganado__fila">
                        <FormularioCorral
                          corral={corral}
                          regional={contexto.regional}
                          alGuardar={alGuardar}
                          alCancelar={() => abrir(null)}
                        />
                      </li>
                    ) : (
                      <FilaCorral
                        key={corral.id}
                        corral={corral}
                        regional={contexto.regional}
                        asignable={puedeAsignar && editando === null && asignando === null}
                        alAsignar={() => abrirAsignacion(corral.id)}
                        editable={puedeEditar && editando === null}
                        eliminable={puedeEliminar(contexto)}
                        confirmando={confirmando === corral.id}
                        ocupado={ocupado === corral.id}
                        alEditar={() => abrir(corral.id)}
                        alPedirBaja={() => setConfirmando(corral.id)}
                        alCancelarBaja={() => setConfirmando(null)}
                        alDarDeBaja={() => accion(corral.id, () => api.bajaCorral(corral.id))}
                        alRestaurar={() => accion(corral.id, () => api.restaurarCorral(corral.id))}
                      >
                        {asignando === corral.id && (
                          <AsignarAnimales
                            corral={corral}
                            alAsignar={alAsignar}
                            alCancelar={() => abrirAsignacion(null)}
                          />
                        )}
                      </FilaCorral>
                    ),
                  )}
                </ul>
              </Tarjeta>
            )}
          </>
        )}
      </div>
    </DisenoApp>
  );
}

interface PropiedadesFila {
  corral: Corral;
  regional: Regional;
  /** HU-37: tiene edición de animales y no hay otra cosa abierta. */
  asignable: boolean;
  alAsignar: () => void;
  editable: boolean;
  /** Dar de baja y restaurar: solo el propietario y el Admin (HU-18). */
  eliminable: boolean;
  confirmando: boolean;
  ocupado: boolean;
  alEditar: () => void;
  alPedirBaja: () => void;
  alCancelarBaja: () => void;
  alDarDeBaja: () => void;
  alRestaurar: () => void;
  /** El panel de asignación, debajo de la fila. */
  children?: ReactNode;
}

function FilaCorral({
  corral,
  regional,
  asignable,
  alAsignar,
  editable,
  eliminable,
  confirmando,
  ocupado,
  alEditar,
  alPedirBaja,
  alCancelarBaja,
  alDarDeBaja,
  alRestaurar,
  children,
}: PropiedadesFila) {
  const deBaja = Boolean(corral.eliminado_en);

  return (
    <li className={deBaja ? 'ganado__fila de-baja' : 'ganado__fila'}>
      <div className="ganado__principal">
        <span className="cuerpo-m">{corral.nombre}</span>
        <span className="pie c-500">
          {corral.superficie_ha
            ? t('corrales.superficieYLimite', {
                superficie: formatoSuperficie(Number(corral.superficie_ha), regional),
                limite: corral.limite_superficie ?? 0,
              })
            : t('corrales.sinSuperficie')}
        </span>
      </div>

      {/* HU-36 criterio 3 y HU-38 criterio 1. Sin capacidad, ni barra ni aviso (HU-36 criterio 2). */}
      <div className="ganado__ocupacion">
        <span className="ganado__dato">
          {corral.capacidad === null
            ? t('corrales.ocupacionSinTope', { n: corral.ocupacion })
            : t('corrales.ocupacion', { n: corral.ocupacion, capacidad: corral.capacidad })}
        </span>
        {corral.capacidad !== null && <BarraOcupacion corral={corral} />}
      </div>
      {corral.sobrepoblado && <Insignia variante="adv">{t('corrales.sobrepoblado')}</Insignia>}
      {deBaja && <Insignia variante="archivado">{t('corrales.deBaja')}</Insignia>}

      {(editable || (asignable && !deBaja)) && (
        <div className="ganado__acciones">
          {asignable && !deBaja && !confirmando && (
            <Boton variante="secundario" onClick={alAsignar} disabled={ocupado}>
              <Icono nombre="animal" tamano={16} />
              {t('corrales.asignar.boton')}
            </Boton>
          )}
          {!editable ? null : deBaja ? (
            eliminable && (
            <Boton variante="secundario" onClick={alRestaurar} disabled={ocupado}>
              {t('corrales.restaurar')}
            </Boton>
            )
          ) : confirmando ? (
            <>
              <span className="pie c-600">{t('corrales.confirmarBaja', { nombre: corral.nombre })}</span>
              <Boton variante="secundario" onClick={alCancelarBaja} disabled={ocupado}>
                {t('comun.cancelar')}
              </Boton>
              <Boton variante="destructivo" onClick={alDarDeBaja} disabled={ocupado}>
                {t('corrales.darDeBaja')}
              </Boton>
            </>
          ) : (
            <>
              <Boton variante="fantasma" onClick={alEditar} disabled={ocupado}>
                <Icono nombre="lapiz" tamano={16} />
                {t('corrales.editar')}
              </Boton>
              {eliminable && (
                <Boton variante="fantasma" onClick={alPedirBaja} disabled={ocupado}>
                  <Icono nombre="archivar" tamano={16} />
                  {t('corrales.darDeBaja')}
                </Boton>
              )}
            </>
          )}
        </div>
      )}
      {children}
    </li>
  );
}

interface PropiedadesFormulario {
  corral?: Corral;
  regional: Regional;
  alGuardar: (mensaje: string) => void;
  alCancelar: () => void;
}

function FormularioCorral({ corral, regional, alGuardar, alCancelar }: PropiedadesFormulario) {
  const [nombre, setNombre] = useState(corral?.nombre ?? '');
  const [capacidad, setCapacidad] = useState(corral?.capacidad?.toString() ?? '');
  const [superficie, setSuperficie] = useState(
    corral?.superficie_ha
      ? String(Math.round(superficieAMostrar(Number(corral.superficie_ha), regional.superficie) * 100) / 100)
      : '',
  );
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [carga, setCarga] = useState<CargaAnimal | null>(null);

  useEffect(() => {
    let vigente = true;
    api
      .cargaCorrales()
      .then((respuesta) => vigente && setCarga(respuesta))
      .catch(() => undefined);
    return () => {
      vigente = false;
    };
  }, []);

  // HU-26: lo escrito en acres se cuenta en hectáreas.
  const superficieHa =
    superficie === '' ? null : superficieAGuardar(Number(superficie), regional.superficie);
  const limite =
    carga && superficieHa !== null && superficieHa > 0
      ? limitePorSuperficie(superficieHa, carga.animales_por_hectarea)
      : null;
  const problema = revisarCorral(capacidad, superficieHa, carga?.animales_por_hectarea ?? null);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (problema) return;
    setEnviando(true);
    setError('');
    const datos = {
      nombre,
      capacidad: capacidad === '' ? null : Number(capacidad),
      superficie_ha: superficieHa,
    };
    try {
      const respuesta = corral
        ? await api.actualizarCorral(corral.id, datos)
        : await api.crearCorral(datos);
      alGuardar(respuesta.mensaje);
    } catch (err) {
      setError((err as Error).message);
      setEnviando(false);
    }
  }

  const unidad = t(`unidades.superficie.${regional.superficie}`);

  return (
    <form className="col g16 flex1" onSubmit={enviar} noValidate>
      <Tarjeta
        titulo={corral ? t('corrales.formulario.editar', { nombre: corral.nombre }) : t('corrales.formulario.nuevo')}
        pie={
          <div className="fila g8">
            <Boton variante="secundario" onClick={alCancelar} disabled={enviando}>
              {t('comun.cancelar')}
            </Boton>
            <Boton variante="primario" type="submit" disabled={enviando || !nombre.trim() || problema !== null}>
              {enviando ? t('comun.guardando') : t('comun.guardar')}
            </Boton>
          </div>
        }
      >
        <div className="col g16">
          {error && <Alerta variante="error">{error}</Alerta>}
          <CampoTexto
            etiqueta={t('corrales.formulario.nombre')}
            obligatorio
            maxLength={100}
            placeholder={t('corrales.formulario.nombreEjemplo')}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
          <div className="par">
            <CampoTexto
              etiqueta={t('corrales.formulario.capacidad')}
              ayuda={
                limite !== null
                  ? t('corrales.formulario.capacidadLimite', { n: limite })
                  : t('corrales.formulario.capacidadAyuda')
              }
              error={
                problema === 'capacidadInvalida'
                  ? t('corrales.formulario.capacidadCero')
                  : problema === 'capacidadExcedida' && limite !== null
                    ? t('corrales.formulario.capacidadExcedida', { n: limite })
                    : undefined
              }
              type="number"
              min={1}
              max={limite ?? undefined}
              step={1}
              inputMode="numeric"
              value={capacidad}
              onChange={(e) => setCapacidad(e.target.value)}
            />
            <CampoTexto
              etiqueta={t('corrales.formulario.superficie', { unidad })}
              ayuda={
                carga
                  ? t('corrales.formulario.superficieCarga', {
                      n: String(carga.animales_por_hectarea),
                      tipo: t(`corrales.tiposProduccion.${carga.tipo_produccion}`),
                    })
                  : t('corrales.formulario.superficieAyuda')
              }
              error={problema === 'superficieInvalida' ? t('corrales.formulario.superficieCero') : undefined}
              type="number"
              min={0}
              step="any"
              inputMode="decimal"
              value={superficie}
              onChange={(e) => setSuperficie(e.target.value)}
            />
          </div>
        </div>
      </Tarjeta>
    </form>
  );
}

/** HU-38, criterio 1: la barra pasa a advertencia al superar el 100 %. */
function BarraOcupacion({ corral }: { corral: Corral }) {
  const capacidad = corral.capacidad ?? 0;
  const lleno = capacidad > 0 ? Math.min(100, Math.round((corral.ocupacion / capacidad) * 100)) : 0;
  return (
    <div
      className={corral.sobrepoblado ? 'ganado__barra excedida' : 'ganado__barra'}
      role="meter"
      aria-valuemin={0}
      aria-valuemax={capacidad}
      aria-valuenow={corral.ocupacion}
      aria-label={t('corrales.barra', { n: corral.ocupacion, capacidad })}
    >
      <span style={{ width: `${lleno}%` }} />
    </div>
  );
}

interface PropiedadesAsignar {
  corral: Corral;
  alAsignar: (respuesta: RespuestaAsignacion) => void;
  alCancelar: () => void;
}

/**
 * HU-37, criterio 1: asignar desde el corral. Muestra los animales activos
 * que todavía no están en él; se marcan uno o muchos y se asignan juntos.
 */
function AsignarAnimales({ corral, alAsignar, alCancelar }: PropiedadesAsignar) {
  const [animales, setAnimales] = useState<Animal[] | null>(null);
  const [elegidos, setElegidos] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let vigente = true;
    api
      .animales('activo')
      .then((lista) => vigente && setAnimales(lista.filter((a) => a.corral_id !== corral.id)))
      .catch((err: Error) => vigente && setError(err.message));
    return () => {
      vigente = false;
    };
  }, [corral.id]);

  const todos = animales ?? [];
  const todosElegidos = todos.length > 0 && elegidos.length === todos.length;

  function alternar(id: string) {
    setElegidos((previos) => (previos.includes(id) ? previos.filter((x) => x !== id) : [...previos, id]));
  }

  async function asignar() {
    setEnviando(true);
    setError('');
    try {
      alAsignar(await api.asignarAnimales(corral.id, elegidos));
    } catch (err) {
      setError((err as Error).message);
      setEnviando(false);
    }
  }

  return (
    <div className="ganado__panel">
      <Tarjeta
        titulo={t('corrales.asignar.titulo', { nombre: corral.nombre })}
        pie={
          <div className="fila g8">
            <Boton variante="secundario" onClick={alCancelar} disabled={enviando}>
              {t('comun.cancelar')}
            </Boton>
            <Boton variante="primario" onClick={asignar} disabled={enviando || elegidos.length === 0}>
              {enviando ? t('comun.guardando') : t('corrales.asignar.confirmar', { n: elegidos.length })}
            </Boton>
          </div>
        }
      >
        <div className="col g12">
          {error && <Alerta variante="error">{error}</Alerta>}
          {animales === null && !error && <Cargando lineas={3} />}
          {animales !== null && todos.length === 0 && (
            <p className="cuerpo c-600">{t('corrales.asignar.vacio')}</p>
          )}
          {todos.length > 0 && (
            <>
              <label className="ganado__casilla">
                <input
                  type="checkbox"
                  checked={todosElegidos}
                  onChange={() => setElegidos(todosElegidos ? [] : todos.map((a) => a.id))}
                />
                {t('corrales.asignar.todos', { n: todos.length })}
              </label>
              <ul className="ganado__eleccion">
                {todos.map((animal) => (
                  <li key={animal.id}>
                    <label className="ganado__casilla">
                      <input
                        type="checkbox"
                        checked={elegidos.includes(animal.id)}
                        onChange={() => alternar(animal.id)}
                      />
                      <span className="dato">{animal.identificador}</span>
                      <span className="pie c-500">
                        {animal.corral_nombre ?? t('animales.sinCorral')}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </Tarjeta>
    </div>
  );
}
