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
import { nivel, useContextoGanado, usuarioDe } from '../ganado/contexto';
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
  const [destino, setDestino] = useState('');
  const [asignando, setAsignando] = useState(false);
  const [aviso, setAviso] = useState('');
  const [avisoExceso, setAvisoExceso] = useState('');
  // Cambiar la versión vuelve a pedir la lista.
  const [version, setVersion] = useState(0);

  const puedeEditar = nivel(contexto, 'animales') === 'editar';
  // Solo los activos y vigentes se pueden asignar a un corral.
  const asignables = animales.filter((a) => a.estado === 'activo' && !a.eliminado_en);
  const seleccionando = puedeEditar && asignables.length > 0;
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
    setSeleccion((previa) => (previa.includes(id) ? previa.filter((x) => x !== id) : [...previa, id]));
  }

  /** HU-37, criterio 2. */
  async function asignar() {
    setAsignando(true);
    setError('');
    try {
      const respuesta = await api.asignarAnimales(destino, seleccion);
      setAviso(respuesta.mensaje);
      setAvisoExceso(respuesta.aviso ?? '');
      setDestino('');
      setVersion((previa) => previa + 1);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setAsignando(false);
    }
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
        puedeEditar &&
        !registrando && (
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
        )
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
              <Tarjeta>
                <div className="fila g12 centro">
                  <span className="cuerpo-m flex1">{t('animales.seleccion.cuantos', { n: seleccion.length })}</span>
                  <CampoLista
                    etiqueta={t('animales.seleccion.corral')}
                    value={destino}
                    onChange={(e) => setDestino(e.target.value)}
                  >
                    <option value="">{t('animales.campos.elegir')}</option>
                    {corrales.map((corral) => (
                      <option key={corral.id} value={corral.id}>
                        {corral.nombre}
                      </option>
                    ))}
                  </CampoLista>
                  <Boton variante="primario" onClick={asignar} disabled={asignando || !destino}>
                    {asignando ? t('comun.guardando') : t('animales.seleccion.asignar')}
                  </Boton>
                  <Boton variante="fantasma" onClick={() => setSeleccion([])} disabled={asignando}>
                    {t('animales.seleccion.quitar')}
                  </Boton>
                </div>
              </Tarjeta>
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
                        <input
                          type="checkbox"
                          checked={seleccion.length === asignables.length}
                          onChange={() =>
                            setSeleccion(seleccion.length === asignables.length ? [] : asignables.map((a) => a.id))
                          }
                        />
                        {t('animales.seleccion.todos', { n: asignables.length })}
                      </label>
                    </li>
                  )}
                  {animales.map((animal) => (
                    <li key={animal.id} className={animal.eliminado_en ? 'ganado__fila de-baja' : 'ganado__fila'}>
                      {seleccionando && (
                        <input
                          type="checkbox"
                          aria-label={t('animales.seleccion.elegir', { identificador: animal.identificador })}
                          checked={seleccion.includes(animal.id)}
                          disabled={animal.estado !== 'activo' || Boolean(animal.eliminado_en)}
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
