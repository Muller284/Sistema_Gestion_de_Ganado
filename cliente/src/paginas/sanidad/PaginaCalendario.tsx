import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Alerta,
  Boton,
  Cargando,
  CampoLista,
  CampoTexto,
  DisenoApp,
  EstadoVacio,
  Insignia,
  Segmentos,
  Tarjeta,
} from '../../componentes';
import {
  api,
  type CalendarioSanitario,
  type Corral,
  type EstadoDosis,
  type ProductoSanitarioElegible,
} from '../../servicios/api';
import { t } from '../../servicios/idioma';
import { nombreDosis, textoVencimiento, VARIANTE_ESTADO } from '../../servicios/sanidad';
import { formatoFecha } from '../../servicios/unidades';
import { nivel, useContextoGanado, usuarioDe } from '../ganado/contexto';
import { PestanasSanidad } from './PestanasSanidad';

/**
 * HU-50 · Calendario sanitario en vista de lista.
 *
 *   1. Lista qué dosis le toca a cada animal y cuándo, según los esquemas
 *      vigentes (HU-47) y las aplicaciones registradas. La cuenta la hace el
 *      servidor (GET /sanidad/calendario); acá solo se muestra.
 *   2. Cada dosis dice si está vencida, próxima o programada.
 *   3. Se filtra por fechas, producto, corral y estado, y se pagina.
 *
 * HU-51: el aviso del inicio trae ?estado=vencida o ?estado=proxima, y la
 * pantalla abre con ese filtro puesto.
 */

const POR_PAGINA = 50;
const ESTADOS: EstadoDosis[] = ['vencida', 'proxima', 'programada'];
type FiltroEstado = EstadoDosis | 'todas';

interface Filtros {
  desde: string;
  hasta: string;
  producto: string;
  corral: string;
}

const SIN_FILTROS: Filtros = { desde: '', hasta: '', producto: '', corral: '' };

function estadoDeLaRuta(valor: string | null): FiltroEstado {
  return ESTADOS.includes(valor as EstadoDosis) ? (valor as EstadoDosis) : 'todas';
}

export function PaginaCalendario() {
  const contexto = useContextoGanado();
  const [parametros, setParametros] = useSearchParams();
  const estado = estadoDeLaRuta(parametros.get('estado'));
  const [filtros, setFiltros] = useState<Filtros>(SIN_FILTROS);
  const [pagina, setPagina] = useState(1);
  const [calendario, setCalendario] = useState<CalendarioSanitario | null>(null);
  const [productos, setProductos] = useState<ProductoSanitarioElegible[]>([]);
  const [hayEsquemas, setHayEsquemas] = useState(true);
  const [corrales, setCorrales] = useState<Corral[] | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  // Los productos y los corrales, para los filtros. Los corrales son de otro
  // módulo: quien no los ve (el veterinario, por ejemplo) se queda sin ese filtro.
  useEffect(() => {
    let vigente = true;
    api
      .esquemasVacunacion()
      .then((lista) => {
        if (!vigente) return;
        setProductos(lista.productos);
        setHayEsquemas(lista.esquemas.length > 0);
      })
      .catch(() => undefined);
    api
      .corrales()
      .then((lista) => vigente && setCorrales(lista))
      .catch(() => vigente && setCorrales(null));
    return () => {
      vigente = false;
    };
  }, []);

  useEffect(() => {
    let vigente = true;
    api
      .calendarioSanitario({
        ...filtros,
        estado: estado === 'todas' ? '' : estado,
        pagina,
        porPagina: POR_PAGINA,
      })
      .then((respuesta) => {
        if (!vigente) return;
        setCalendario(respuesta);
        setError('');
      })
      .catch((err: Error) => vigente && setError(err.message))
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [filtros, estado, pagina]);

  /** Cada cambio vuelve a pedir el calendario: se marca como cargando acá, no en el efecto. */
  function irAPagina(numero: number) {
    setCargando(true);
    setPagina(numero);
  }

  function cambiarFiltro(clave: keyof Filtros, valor: string) {
    irAPagina(1);
    setFiltros((previos) => ({ ...previos, [clave]: valor }));
  }

  function cambiarEstado(nuevo: FiltroEstado) {
    irAPagina(1);
    setParametros(nuevo === 'todas' ? {} : { estado: nuevo }, { replace: true });
  }

  const hayFiltros = Object.values(filtros).some(Boolean);
  const resumen = calendario?.resumen ?? { vencida: 0, proxima: 0, programada: 0 };
  const total = calendario?.total ?? 0;
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const dosis = calendario?.dosis ?? [];
  const soloConsulta = nivel(contexto, 'sanidad') === 'ver';

  return (
    <DisenoApp
      activo="sanidad"
      ruta={[t('app.modulos.inicio'), t('sanidad.titulo')]}
      usuario={usuarioDe(contexto)}
      rancho={contexto.rancho?.rancho?.nombre ?? null}
      rotulo={t('sanidad.rotulo')}
      titulo={t('sanidad.calendario.titulo')}
    >
      <div className="col g24">
        <PestanasSanidad />
        {contexto.error && <Alerta variante="error">{contexto.error}</Alerta>}
        {error && <Alerta variante="error">{error}</Alerta>}
        {!contexto.cargando && soloConsulta && <Alerta variante="info">{t('sanidad.soloConsulta')}</Alerta>}
        <p className="pie c-600">{t('sanidad.calendario.ayuda', { n: calendario?.dias_proxima ?? 7 })}</p>

        <Segmentos
          etiqueta={t('sanidad.calendario.estado')}
          valor={estado}
          alCambiar={cambiarEstado}
          opciones={[
            {
              clave: 'todas' as FiltroEstado,
              nombre: t('sanidad.calendario.todas'),
              cantidad: resumen.vencida + resumen.proxima + resumen.programada,
            },
            ...ESTADOS.map((clave) => ({ clave, nombre: t(`sanidad.estados.${clave}`), cantidad: resumen[clave] })),
          ]}
        />

        <Tarjeta titulo={t('sanidad.calendario.filtros.titulo')}>
          <div className="ganado__filtros sanidad__filtros">
            <CampoTexto
              etiqueta={t('sanidad.calendario.filtros.desde')}
              type="date"
              value={filtros.desde}
              max={filtros.hasta || undefined}
              onChange={(evento) => cambiarFiltro('desde', evento.target.value)}
            />
            <CampoTexto
              etiqueta={t('sanidad.calendario.filtros.hasta')}
              type="date"
              value={filtros.hasta}
              min={filtros.desde || undefined}
              onChange={(evento) => cambiarFiltro('hasta', evento.target.value)}
            />
            <CampoLista
              etiqueta={t('sanidad.calendario.filtros.producto')}
              value={filtros.producto}
              onChange={(evento) => cambiarFiltro('producto', evento.target.value)}
            >
              <option value="">{t('sanidad.calendario.filtros.todosProductos')}</option>
              {productos.map((producto) => (
                <option key={producto.id} value={producto.id}>
                  {producto.nombre}
                </option>
              ))}
            </CampoLista>
            {corrales && (
              <CampoLista
                etiqueta={t('sanidad.calendario.filtros.corral')}
                value={filtros.corral}
                onChange={(evento) => cambiarFiltro('corral', evento.target.value)}
              >
                <option value="">{t('sanidad.calendario.filtros.todosCorrales')}</option>
                {corrales.map((corral) => (
                  <option key={corral.id} value={corral.id}>
                    {corral.nombre}
                  </option>
                ))}
              </CampoLista>
            )}
          </div>
          {hayFiltros && (
            <div className="ganado__acciones">
              <Boton
                variante="fantasma"
                onClick={() => {
                  irAPagina(1);
                  setFiltros(SIN_FILTROS);
                }}
              >
                {t('sanidad.calendario.filtros.limpiar')}
              </Boton>
            </div>
          )}
        </Tarjeta>

        {cargando && !calendario && <Cargando lineas={5} />}

        {calendario && !error && dosis.length === 0 && (
          <EstadoVacio
            icono="sanidad"
            titulo={t('sanidad.calendario.vacio.titulo')}
            texto={hayEsquemas ? t('sanidad.calendario.vacio.texto') : t('sanidad.calendario.vacio.sinEsquemas')}
            accion={
              !hayEsquemas && nivel(contexto, 'sanidad') === 'editar' ? (
                <Link className="btn btn-primario" to="/sanidad/esquemas">
                  {t('sanidad.calendario.vacio.irEsquemas')}
                </Link>
              ) : undefined
            }
          />
        )}

        {dosis.length > 0 && (
          <Tarjeta>
            <ul className="ganado__lista" aria-busy={cargando}>
              {dosis.map((fila) => (
                <li key={`${fila.animal_id}-${fila.esquema_id}`} className="ganado__fila sanidad__dosis">
                  <div className="ganado__principal">
                    <span className="dato">{fila.identificador}</span>
                    <span className="pie c-500">
                      {[
                        fila.animal_nombre,
                        fila.categoria_codigo && t(`animales.categorias.${fila.categoria_codigo}`),
                        fila.corral_nombre ?? t('animales.sinCorral'),
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </div>
                  <div className="sanidad__esquema">
                    <span className="cuerpo-m">{fila.esquema_nombre}</span>
                    <span className="pie c-500">
                      {fila.producto_nombre} · {nombreDosis(fila)}
                    </span>
                  </div>
                  <div className="sanidad__vence">
                    <span className="cuerpo-m">{formatoFecha(fila.vence, contexto.regional)}</span>
                    <span className="pie c-500">{textoVencimiento(fila.dias)}</span>
                  </div>
                  <Insignia variante={VARIANTE_ESTADO[fila.estado]}>{t(`sanidad.estados.${fila.estado}`)}</Insignia>
                  <div className="ganado__acciones">
                    <Link className="btn btn-fantasma" to={`/animales/${fila.animal_id}`}>
                      {t('sanidad.calendario.verFicha')}
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </Tarjeta>
        )}

        {total > POR_PAGINA && (
          <div className="sanidad__paginas">
            <span className="pie c-600">
              {t('sanidad.calendario.mostrando', {
                desde: (pagina - 1) * POR_PAGINA + 1,
                hasta: Math.min(pagina * POR_PAGINA, total),
                total,
              })}
            </span>
            <div className="fila g8">
              <Boton variante="secundario" disabled={pagina <= 1 || cargando} onClick={() => irAPagina(pagina - 1)}>
                {t('sanidad.calendario.anterior')}
              </Boton>
              <Boton
                variante="secundario"
                disabled={pagina >= paginas || cargando}
                onClick={() => irAPagina(pagina + 1)}
              >
                {t('sanidad.calendario.siguiente')}
              </Boton>
            </div>
          </div>
        )}
      </div>
    </DisenoApp>
  );
}
