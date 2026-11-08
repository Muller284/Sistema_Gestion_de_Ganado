import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Alerta,
  Cargando,
  CampoTexto,
  DisenoApp,
  EstadoVacio,
  Segmentos,
  Tarjeta,
} from '../../componentes';
import { BarrasHorizontales } from '../../componentes/Graficos';
import { indicadores, type ComparativaPesos, type GrupoPeso } from '../../servicios/indicadores';
import { t, tn } from '../../servicios/idioma';
import { textoGanancia } from '../../servicios/pesos';
import { formatoPeso, type Regional } from '../../servicios/unidades';
import { useContextoGanado, usuarioDe } from '../ganado/contexto';

/**
 * HU-56 · Comparativa por corral y categoría.
 *   1. Peso promedio y ganancia diaria promedio por corral y por categoría en
 *      el período elegido (por defecto, los últimos 90 días).
 *   2. Los animales por debajo del promedio de su grupo, con cuánto les falta.
 *   3. Respeta los permisos de pesajes y el aislamiento entre ranchos (lo
 *      controla el servidor). Quien no ve corrales compara solo por categoría.
 *
 * Es la pantalla del módulo Pesajes en el menú. El registro de pesajes está en
 * la ficha de cada animal y en la selección del listado (HU-53).
 */

type Agrupar = 'corral' | 'categoria';

export function PaginaComparativa() {
  const contexto = useContextoGanado();
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [agrupar, setAgrupar] = useState<Agrupar>('corral');
  const [datos, setDatos] = useState<ComparativaPesos | null>(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let vigente = true;
    indicadores
      .comparativa({ desde, hasta, agrupar })
      .then((respuesta) => {
        if (!vigente) return;
        setDatos(respuesta);
        setError('');
        // Sin filtros elegidos, se muestran las fechas que usó el servidor.
        if (!desde) setDesde(respuesta.desde);
        if (!hasta) setHasta(respuesta.hasta);
      })
      .catch((err: Error) => vigente && setError(err.message))
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [desde, hasta, agrupar]);

  function cambiar(accion: () => void) {
    setCargando(true);
    accion();
  }

  const grupos = datos ? (datos.agrupar === 'corral' ? datos.por_corral ?? [] : datos.por_categoria) : [];

  return (
    <DisenoApp
      activo="pesajes"
      ruta={[t('app.modulos.inicio'), t('app.modulos.pesajes')]}
      usuario={usuarioDe(contexto)}
      rancho={contexto.rancho?.rancho?.nombre ?? null}
      rotulo={t('comparativa.rotulo')}
      titulo={t('comparativa.titulo')}
    >
      <div className="col g24">
        <p className="cuerpo c-600">{t('comparativa.intro')}</p>
        {contexto.error && <Alerta variante="error">{contexto.error}</Alerta>}
        {error && <Alerta variante="error">{error}</Alerta>}

        <Tarjeta>
          <div className="comparativa__filtros">
            <CampoTexto
              etiqueta={t('comparativa.desde')}
              type="date"
              value={desde}
              max={hasta || undefined}
              onChange={(e) => e.target.value && cambiar(() => setDesde(e.target.value))}
            />
            <CampoTexto
              etiqueta={t('comparativa.hasta')}
              type="date"
              value={hasta}
              min={desde || undefined}
              onChange={(e) => e.target.value && cambiar(() => setHasta(e.target.value))}
            />
            {datos?.con_corrales !== false && (
              <div className="col g6">
                <span className="etiqueta-campo">{t('comparativa.agrupar')}</span>
                <Segmentos
                  etiqueta={t('comparativa.agrupar')}
                  valor={agrupar}
                  alCambiar={(valor) => cambiar(() => setAgrupar(valor))}
                  opciones={[
                    { clave: 'corral' as Agrupar, nombre: t('comparativa.porCorral') },
                    { clave: 'categoria' as Agrupar, nombre: t('comparativa.porCategoria') },
                  ]}
                />
              </div>
            )}
          </div>
          {datos?.con_corrales === false && <p className="pie c-600 panel__nota">{t('comparativa.soloCategoria')}</p>}
        </Tarjeta>

        {cargando && !datos && <Cargando lineas={4} />}

        {datos && !error && datos.animales_pesados === 0 && (
          <EstadoVacio icono="balanza" titulo={t('comparativa.vacio.titulo')} texto={t('comparativa.vacio.texto')} />
        )}

        {datos && !error && datos.animales_pesados > 0 && (
          <>
            <p className="pie c-600">
              {tn('comparativa.resumen', datos.animales_pesados)} {t('comparativa.conGanancia', { n: datos.con_ganancia })}
            </p>
            {datos.con_ganancia === 0 && <Alerta variante="info">{t('comparativa.sinGanancia')}</Alerta>}

            <div className="panel">
              <Tarjeta titulo={t('comparativa.grupos')}>
                <TablaGrupos grupos={grupos} agrupar={datos.agrupar} regional={contexto.regional} />
              </Tarjeta>
              {datos.con_ganancia > 0 && (
                <Tarjeta titulo={t('comparativa.grafico')}>
                  <BarrasHorizontales
                    descripcion={t('comparativa.grafico')}
                    barras={grupos
                      .filter((g) => g.ganancia_promedio !== null)
                      .map((g) => ({
                        clave: String(g.clave),
                        etiqueta: nombreGrupo(g, datos.agrupar),
                        valor: Math.max(0, g.ganancia_promedio!),
                        rotulo: textoGanancia(g.ganancia_promedio!, contexto.regional),
                      }))}
                  />
                </Tarjeta>
              )}
            </div>

            {datos.con_ganancia > 0 && (
              <Tarjeta titulo={t('comparativa.bajoPromedio.titulo')}>
                {datos.bajo_promedio.length === 0 ? (
                  <p className="cuerpo c-600">{t('comparativa.bajoPromedio.ninguno')}</p>
                ) : (
                  <>
                    <p className="pie c-600 panel__antes">{t('comparativa.bajoPromedio.intro')}</p>
                    <ul className="ganado__lista">
                      {datos.bajo_promedio.map((animal) => (
                        <li key={animal.animal_id} className="ganado__fila">
                          <div className="ganado__principal">
                            <Link className="dato" to={`/animales/${animal.animal_id}`}>
                              {animal.identificador}
                            </Link>
                            <span className="pie c-500">
                              {[
                                animal.nombre,
                                animal.categoria_codigo && t(`animales.categorias.${animal.categoria_codigo}`),
                                animal.corral_nombre,
                              ]
                                .filter(Boolean)
                                .join(' · ')}
                            </span>
                          </div>
                          <span className="ganado__dato">
                            {t('comparativa.bajoPromedio.gana', {
                              ganancia: textoGanancia(animal.ganancia_diaria, contexto.regional),
                            })}
                          </span>
                          <span className="ganado__dato">
                            {t('comparativa.bajoPromedio.promedio', {
                              ganancia: textoGanancia(animal.ganancia_promedio_grupo, contexto.regional),
                            })}
                          </span>
                          <span className="pesajes__ganancia negativa dato">
                            {t('comparativa.bajoPromedio.falta', {
                              falta: textoGanancia(animal.falta, contexto.regional).replace('+', ''),
                            })}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </Tarjeta>
            )}
          </>
        )}
      </div>
    </DisenoApp>
  );
}

function nombreGrupo(grupo: GrupoPeso, agrupar: Agrupar): string {
  if (agrupar === 'corral') return grupo.nombre ?? t('comparativa.sinCorral');
  return grupo.clave ? t(`animales.categorias.${grupo.clave}`) : t('comparativa.sinCategoria');
}

function TablaGrupos({ grupos, agrupar, regional }: { grupos: GrupoPeso[]; agrupar: Agrupar; regional: Regional }) {
  return (
    <div className="ganado__tabla-contenedor">
      <table className="ganado__tabla">
        <thead>
          <tr>
            <th scope="col">{t('comparativa.columnas.grupo')}</th>
            <th scope="col">{t('comparativa.columnas.animales')}</th>
            <th scope="col">{t('comparativa.columnas.peso')}</th>
            <th scope="col">{t('comparativa.columnas.ganancia')}</th>
          </tr>
        </thead>
        <tbody>
          {grupos.map((grupo) => (
            <tr key={String(grupo.clave)}>
              <td>{nombreGrupo(grupo, agrupar)}</td>
              <td className="dato">{grupo.animales}</td>
              <td className="dato">{formatoPeso(grupo.peso_promedio, regional)}</td>
              <td className="dato">
                {grupo.ganancia_promedio === null
                  ? t('comparativa.sinDato')
                  : textoGanancia(grupo.ganancia_promedio, regional)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
