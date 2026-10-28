import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Alerta,
  Boton,
  CampoLista,
  CampoTexto,
  Cargando,
  DisenoApp,
  EstadoVacio,
  Icono,
  Insignia,
  Segmentos,
  Tarjeta,
} from '../../componentes';
import {
  api,
  type Animal,
  type Corral,
  type EstadoAnimal,
  type FiltrosAnimales,
  type Sexo,
} from '../../servicios/api';
import { t } from '../../servicios/idioma';
import { conTransicion } from '../../servicios/transicion';
import { nivel, puedeEliminar, useContextoGanado, usuarioDe } from '../ganado/contexto';
import { AccionesMasivas, type Ambito } from './AccionesMasivas';
import { ExportarDatos } from './ExportarDatos';
import { FormularioFicha } from './FormularioFicha';

/**
 * Los animales del rancho, para llegar a cada ficha.
 *
 * HU-33, criterio 3: por defecto solo los activos; los vendidos, muertos y
 * archivados se consultan eligiendo su estado.
 * HU-34: los dados de baja tienen su propia vista y desde la ficha se
 * restauran.
 *
 * HU-29 (Brian): búsqueda por identificador o nombre y filtros por sexo,
 * categoría, corral y rango de fechas de nacimiento. Todo se filtra en el
 * servidor; la búsqueda espera ESPERA_BUSQUEDA ms sin teclear antes de pedir,
 * para no mandar un pedido por cada letra.
 *
 * HU-37, criterio 2 (Romina): quien edita animales marca varios activos y los
 * asigna juntos a un corral. Si el corral se excede, se avisa sin impedirlo
 * (HU-38).
 *
 * HU-31 (Aaron): la selección sirve para cualquier acción masiva (corral,
 * estado y, para el propietario, baja; ver AccionesMasivas.tsx). Se elige de
 * a uno, toda la página que se ve o todo el resultado del filtro: este último
 * se pide al servidor con los mismos filtros, así incluye lo que no entra en
 * la página. Se pueden elegir los vigentes de cualquier estado; los dados de
 * baja, no.
 *
 * HU-45 (Aaron): Exportar descarga lo que muestra el listado, con su pestaña
 * y sus filtros (ExportarDatos.tsx). Lo puede hacer cualquiera que lo vea.
 */

type Vista = EstadoAnimal | 'todos' | 'bajas';
const VISTAS: Vista[] = ['activo', 'vendido', 'muerto', 'archivado', 'todos', 'bajas'];
const SEXOS: Sexo[] = ['macho', 'hembra'];
const ESPERA_BUSQUEDA = 300;
const SIN_FILTROS: FiltrosAnimales = {
  busqueda: '',
  sexo: '',
  categoria: '',
  corral: '',
  fechaDesde: '',
  fechaHasta: '',
};

/** El valor que se deja de cambiar por `espera` ms. */
function useDemorado<T>(valor: T, espera: number): T {
  const [demorado, setDemorado] = useState(valor);
  useEffect(() => {
    const temporizador = setTimeout(() => setDemorado(valor), espera);
    return () => clearTimeout(temporizador);
  }, [valor, espera]);
  return demorado;
}

export function PaginaListaAnimales() {
  const contexto = useContextoGanado();
  const navegar = useNavigate();
  const [animales, setAnimales] = useState<Animal[]>([]);
  const [vista, setVista] = useState<Vista>('activo');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [registrando, setRegistrando] = useState(false);
  const [filtros, setFiltros] = useState<FiltrosAnimales>(SIN_FILTROS);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [seleccion, setSeleccion] = useState<string[]>([]);
  const [corrales, setCorrales] = useState<Corral[]>([]);
  const [aviso, setAviso] = useState('');
  const [avisoExceso, setAvisoExceso] = useState('');
  // HU-31: cómo se llegó a la selección, para que la barra lo diga.
  const [ambito, setAmbito] = useState<Ambito>('sueltos');
  const [eligiendoFiltro, setEligiendoFiltro] = useState(false);
  // HU-45: el panel de exportación.
  const [exportando, setExportando] = useState(false);
  // Cambiar la versión vuelve a pedir la lista.
  const [version, setVersion] = useState(0);

  const puedeEditar = nivel(contexto, 'animales') === 'editar';
  // HU-31: se eligen los vigentes de cualquier estado; los dados de baja, no.
  const seleccionables = animales.filter((a) => !a.eliminado_en);
  const seleccionando = puedeEditar && seleccionables.length > 0;
  const paginaElegida = seleccionables.length > 0 && seleccionables.every((a) => seleccion.includes(a.id));
  // Solo la búsqueda se escribe letra por letra; las listas y fechas van directo.
  const busqueda = useDemorado(filtros.busqueda ?? '', ESPERA_BUSQUEDA);
  const { sexo, categoria, corral, fechaDesde, fechaHasta } = filtros;
  const hayFiltros = Object.values(filtros).some(Boolean);

  // El catálogo de categorías del filtro se pide una vez. Si falla, queda vacío.
  useEffect(() => {
    let vigente = true;
    api
      .categoriasAnimal()
      .then((lista) => vigente && setCategorias(lista))
      .catch(() => undefined);
    return () => {
      vigente = false;
    };
  }, []);

  // Los corrales sirven al filtro (todos) y a la asignación (HU-37). Después
  // de asignar se vuelven a pedir, porque cambia la ocupación.
  useEffect(() => {
    let vigente = true;
    api
      .corrales()
      .then((lista) => vigente && setCorrales(lista))
      .catch(() => undefined);
    return () => {
      vigente = false;
    };
  }, [version]);

  useEffect(() => {
    let vigente = true;
    const pedidos: FiltrosAnimales = { busqueda, sexo, categoria, corral, fechaDesde, fechaHasta };
    const pedido =
      vista === 'bajas'
        ? api.animales('todos', true, pedidos).then((lista) => lista.filter((a) => a.eliminado_en))
        : api.animales(vista, false, pedidos);
    pedido
      .then((lista) => {
        if (vigente) {
          setAnimales(lista);
          setSeleccion([]);
          setError('');
        }
      })
      .catch((err: Error) => vigente && setError(err.message))
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [vista, version, busqueda, sexo, categoria, corral, fechaDesde, fechaHasta]);

  function cambiarFiltro(clave: keyof FiltrosAnimales, valor: string) {
    setFiltros((previos) => ({ ...previos, [clave]: valor }));
  }

  function alternar(id: string) {
    setAmbito('sueltos');
    setSeleccion((previa) => (previa.includes(id) ? previa.filter((x) => x !== id) : [...previa, id]));
  }

  /** HU-31, criterio 1: toda la página que se ve, o nada si ya estaba entera. */
  function alternarPagina() {
    setAmbito('pagina');
    setSeleccion(paginaElegida ? [] : seleccionables.map((a) => a.id));
  }

  /**
   * HU-31, criterio 1: todo el resultado del filtro. Se pide la lista
   * completa, sin página, con la misma pestaña y los mismos filtros.
   */
  async function elegirTodoElFiltro() {
    setEligiendoFiltro(true);
    setError('');
    try {
      const pedidos: FiltrosAnimales = { busqueda, sexo, categoria, corral, fechaDesde, fechaHasta };
      const todos = await api.animales(vista === 'bajas' ? 'todos' : vista, false, pedidos);
      setSeleccion(todos.filter((a) => !a.eliminado_en).map((a) => a.id));
      setAmbito('filtro');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setEligiendoFiltro(false);
    }
  }

  /** HU-31: después de una acción masiva se vuelve a pedir la lista. */
  function alTerminarAccion(mensaje: string, avisoDeExceso?: string | null) {
    setAviso(mensaje);
    setAvisoExceso(avisoDeExceso ?? '');
    setVersion((previa) => previa + 1);
  }

  function alRegistrar(animal: Animal) {
    navegar(`/animales/${animal.id}`);
  }

  return (
    <DisenoApp
      activo="animales"
      ruta={[t('app.modulos.inicio'), t('animales.titulo')]}
      usuario={usuarioDe(contexto)}
      rancho={contexto.rancho?.rancho?.nombre ?? null}
      rotulo={t('animales.rotulo')}
      titulo={t('animales.titulo')}
      acciones={
        <>
          {/* HU-45: exportar es leer, así que no depende de poder editar. */}
          <Boton variante="secundario" onClick={() => conTransicion(() => setExportando((previo) => !previo))}>
            <Icono nombre="descargar" tamano={18} />
            {t('exportacion.boton')}
          </Boton>
          {puedeEditar && !registrando && (
            <>
              {/* HU-35: el alta mínima, pensada para el celular. */}
              <Link className="btn btn-secundario" to="/animales/alta-rapida">
                <Icono nombre="caravana" tamano={18} />
                {t('animales.altaRapida.boton')}
              </Link>
              <Boton variante="primario" onClick={() => conTransicion(() => setRegistrando(true))}>
                <Icono nombre="mas" tamano={18} />
                {t('animales.nuevo')}
              </Boton>
            </>
          )}
        </>
      }
    >
      <div className="col g24">
        {(cargando || contexto.cargando) && <Cargando lineas={5} />}
        {error && <Alerta variante="error">{error}</Alerta>}
        {aviso && <Alerta variante="exito">{aviso}</Alerta>}
        {avisoExceso && <Alerta variante="adv">{avisoExceso}</Alerta>}
        {!contexto.cargando && !puedeEditar && !error && (
          <Alerta variante="info">{t('animales.soloConsulta')}</Alerta>
        )}

        {exportando && (
          <ExportarDatos
            vista={vista}
            filtros={{ busqueda, sexo, categoria, corral, fechaDesde, fechaHasta }}
            hayFiltros={hayFiltros}
            puedeVerCorrales={nivel(contexto, 'corrales') !== 'ninguno'}
            alCerrar={() => conTransicion(() => setExportando(false))}
          />
        )}

        {registrando && (
          <FormularioFicha
            regional={contexto.regional}
            alGuardar={alRegistrar}
            alCancelar={() => conTransicion(() => setRegistrando(false))}
          />
        )}

        {/* Los filtros quedan a la vista aunque uno dé error, para poder corregirlo. */}
        {!cargando && (
          <>
            <Segmentos
              etiqueta={t('animales.vistas.etiqueta')}
              valor={vista}
              alCambiar={(nueva) => {
                setCargando(true);
                setVista(nueva);
              }}
              opciones={VISTAS.map((clave) => ({ clave, nombre: t(`animales.vistas.${clave}`) }))}
            />

            <Tarjeta titulo={t('animales.filtros.titulo')}>
              <div className="ganado__filtros">
                <CampoTexto
                  etiqueta={t('animales.buscar')}
                  placeholder={t('animales.placeholderBusqueda')}
                  type="search"
                  value={filtros.busqueda}
                  onChange={(evento) => cambiarFiltro('busqueda', evento.target.value)}
                />
                <CampoLista
                  etiqueta={t('animales.sexoFiltro')}
                  value={filtros.sexo}
                  onChange={(evento) => cambiarFiltro('sexo', evento.target.value)}
                >
                  <option value="">{t('animales.todosSexos')}</option>
                  {SEXOS.map((clave) => (
                    <option key={clave} value={clave}>
                      {t(`animales.sexos.${clave}`)}
                    </option>
                  ))}
                </CampoLista>
                <CampoLista
                  etiqueta={t('animales.campos.categoria')}
                  value={filtros.categoria}
                  onChange={(evento) => cambiarFiltro('categoria', evento.target.value)}
                >
                  <option value="">{t('animales.filtros.todasCategorias')}</option>
                  {categorias.map((codigo) => (
                    <option key={codigo} value={codigo}>
                      {t(`animales.categorias.${codigo}`)}
                    </option>
                  ))}
                </CampoLista>
                <CampoLista
                  etiqueta={t('animales.campos.corral')}
                  value={filtros.corral}
                  onChange={(evento) => cambiarFiltro('corral', evento.target.value)}
                >
                  <option value="">{t('animales.filtros.todosCorrales')}</option>
                  {corrales.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </CampoLista>
                <CampoTexto
                  etiqueta={t('animales.filtros.nacidoDesde')}
                  type="date"
                  value={filtros.fechaDesde}
                  max={filtros.fechaHasta || undefined}
                  onChange={(evento) => cambiarFiltro('fechaDesde', evento.target.value)}
                />
                <CampoTexto
                  etiqueta={t('animales.filtros.nacidoHasta')}
                  type="date"
                  value={filtros.fechaHasta}
                  min={filtros.fechaDesde || undefined}
                  onChange={(evento) => cambiarFiltro('fechaHasta', evento.target.value)}
                />
              </div>
              {hayFiltros && (
                <div className="ganado__acciones">
                  <Boton variante="fantasma" onClick={() => setFiltros(SIN_FILTROS)}>
                    {t('animales.filtros.limpiar')}
                  </Boton>
                </div>
              )}
            </Tarjeta>

            {seleccion.length > 0 && (
              <AccionesMasivas
                seleccion={seleccion}
                ambito={ambito}
                corrales={corrales}
                puedeEliminar={puedeEliminar(contexto)}
                regional={contexto.regional}
                alQuitar={() => setSeleccion([])}
                alTerminar={alTerminarAccion}
              />
            )}

            {error ? null : animales.length === 0 ? (
              <EstadoVacio
                icono="animal"
                titulo={t('animales.vacio.titulo')}
                texto={
                  hayFiltros
                    ? t('animales.vacio.textoFiltros')
                    : vista === 'activo' && puedeEditar
                      ? t('animales.vacio.texto')
                      : t('animales.vacio.textoVista')
                }
              />
            ) : (
              <Tarjeta>
                <ul className="ganado__lista">
                  {seleccionando && (
                    <li className="ganado__fila">
                      <label className="ganado__casilla">
                        <input type="checkbox" checked={paginaElegida} onChange={alternarPagina} />
                        {t('animales.masivo.elegirPagina', { n: seleccionables.length })}
                      </label>
                      <div className="ganado__acciones">
                        <Boton variante="fantasma" onClick={elegirTodoElFiltro} disabled={eligiendoFiltro}>
                          {eligiendoFiltro ? t('comun.cargando') : t('animales.masivo.elegirFiltro')}
                        </Boton>
                      </div>
                    </li>
                  )}
                  {animales.map((animal) => (
                    <li key={animal.id} className={animal.eliminado_en ? 'ganado__fila de-baja' : 'ganado__fila'}>
                      {seleccionando && (
                        <input
                          type="checkbox"
                          aria-label={t('animales.seleccion.elegir', { identificador: animal.identificador })}
                          checked={seleccion.includes(animal.id)}
                          disabled={Boolean(animal.eliminado_en)}
                          onChange={() => alternar(animal.id)}
                        />
                      )}
                      <div className="ganado__principal">
                        <span className="dato">{animal.identificador}</span>
                        <span className="pie c-500">
                          {[
                            animal.nombre,
                            animal.categoria_codigo && t(`animales.categorias.${animal.categoria_codigo}`),
                            t(`animales.sexos.${animal.sexo}`),
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </div>
                      <span className="ganado__dato">{animal.corral_nombre ?? t('animales.sinCorral')}</span>
                      <Insignia variante={animal.estado}>{t(`animales.estados.${animal.estado}`)}</Insignia>
                      {animal.eliminado_en && <Insignia variante="archivado">{t('animales.deBaja')}</Insignia>}
                      <div className="ganado__acciones">
                        <Link className="btn btn-fantasma" to={`/animales/${animal.id}`}>
                          {t('animales.verFicha')}
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              </Tarjeta>
            )}
          </>
        )}
      </div>
    </DisenoApp>
  );
}
