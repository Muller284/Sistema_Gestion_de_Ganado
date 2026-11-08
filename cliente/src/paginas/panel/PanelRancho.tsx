import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alerta, Cargando, EstadoVacio, Insignia, Tarjeta } from '../../componentes';
import { BarrasHorizontales, ColumnasAltasBajas, GraficoLinea } from '../../componentes/Graficos';
import { indicadores, mesCorto, mesLargo, type PanelRancho as DatosPanel } from '../../servicios/indicadores';
import { t, tn } from '../../servicios/idioma';
import { textoVencimiento, VARIANTE_ESTADO } from '../../servicios/sanidad';
import { cargarRegional, formatoFecha, formatoPeso, REGIONAL_POR_DEFECTO, type Regional } from '../../servicios/unidades';

/**
 * HU-57 · Panel del propietario, en el inicio.
 *   1. Existencias por categoría y por corral.
 *   2. Evolución del rodeo: altas y bajas por mes.
 *   3. Cobertura de vacunación (animales al día) y próximos vencimientos.
 *   4. Evolución del peso promedio.
 *   5. Sin datos suficientes, cada indicador dice qué falta cargar.
 *
 * HU-58 · El mismo panel según el rol. Lo decide el servidor
 * (GET /indicadores/panel): cada sección viene nula si quien entra no ve ese
 * módulo, y `editar` dice dónde puede hacer algo. El socio ve todo, sin los
 * botones de cargar; el colaborador, solo lo suyo.
 */
export function PanelRancho() {
  const [panel, setPanel] = useState<DatosPanel | null>(null);
  const [regional, setRegional] = useState<Regional>(REGIONAL_POR_DEFECTO);
  const [error, setError] = useState('');

  useEffect(() => {
    let vigente = true;
    indicadores
      .panel()
      .then((datos) => vigente && setPanel(datos))
      .catch((err: Error) => vigente && setError(err.message));
    // Kilos o libras y el formato de fecha del país (HU-26).
    cargarRegional()
      .then((valor) => vigente && setRegional(valor))
      .catch(() => undefined);
    return () => {
      vigente = false;
    };
  }, []);

  if (error) return <Alerta variante="error">{error}</Alerta>;
  if (!panel) return <Cargando lineas={4} />;

  const algo = Object.values(panel.secciones).some(Boolean);

  return (
    <section className="col g16" aria-labelledby="panel-titulo">
      <div className="col g4">
        <h2 id="panel-titulo" className="h3">
          {t('panel.titulo')}
        </h2>
        {algo && <p className="pie c-600">{t('panel.subtitulo', { fecha: formatoFecha(panel.hoy, regional) })}</p>}
      </div>

      {!algo ? (
        <EstadoVacio icono="info" titulo={t('panel.sinModulos.titulo')} texto={t('panel.sinModulos.texto')} />
      ) : (
        <div className="panel">
          {panel.animales && <Existencias datos={panel.animales} editar={panel.editar.animales} />}
          {panel.corrales && <PorCorral datos={panel.corrales} editar={panel.editar.corrales} />}
          {panel.animales && <Movimientos datos={panel.animales.movimientos} />}
          {panel.sanidad && <Vacunacion datos={panel.sanidad} editar={panel.editar.sanidad} regional={regional} />}
          {panel.pesajes && <Pesos datos={panel.pesajes} regional={regional} />}
        </div>
      )}
    </section>
  );
}

function nombreCategoria(codigo: string | null): string {
  return codigo ? t(`animales.categorias.${codigo}`) : t('panel.existencias.sinCategoria');
}

function Existencias({ datos, editar }: { datos: NonNullable<DatosPanel['animales']>; editar: boolean }) {
  return (
    <Tarjeta titulo={t('panel.existencias.titulo')}>
      {datos.activos === 0 ? (
        <div className="panel__vacio">
          <p className="cuerpo">{t('panel.existencias.vacio')}</p>
          {editar && (
            <Link className="btn btn-secundario" to="/animales">
              {t('panel.existencias.registrar')}
            </Link>
          )}
        </div>
      ) : (
        <>
          <p className="panel__cifra">
            <span className="panel__numero">{datos.activos}</span>
            <span className="pie c-600">{tn('panel.existencias.activos', datos.activos)}</span>
          </p>
          <BarrasHorizontales
            descripcion={t('panel.existencias.descripcion')}
            barras={datos.por_categoria.map((fila) => ({
              clave: fila.codigo ?? '-',
              etiqueta: nombreCategoria(fila.codigo),
              valor: fila.n,
            }))}
          />
        </>
      )}
    </Tarjeta>
  );
}

function PorCorral({ datos, editar }: { datos: NonNullable<DatosPanel['corrales']>; editar: boolean }) {
  return (
    <Tarjeta titulo={t('panel.corrales.titulo')}>
      {datos.por_corral.length === 0 ? (
        <div className="panel__vacio">
          <p className="cuerpo">{t('panel.corrales.vacio')}</p>
          {editar && (
            <Link className="btn btn-secundario" to="/corrales">
              {t('panel.corrales.crear')}
            </Link>
          )}
        </div>
      ) : (
        <BarrasHorizontales
          descripcion={t('panel.corrales.descripcion')}
          barras={datos.por_corral.map((corral) => ({
            clave: corral.id,
            etiqueta: corral.nombre,
            valor: corral.n,
            tope: corral.capacidad,
            rotulo:
              corral.capacidad === null
                ? t('panel.corrales.sinTope', { n: corral.n })
                : t('panel.corrales.ocupacion', { n: corral.n, capacidad: corral.capacidad }),
            ayuda:
              corral.capacidad === null
                ? t('panel.corrales.ayudaSinTope', { nombre: corral.nombre, n: corral.n })
                : t('panel.corrales.ayuda', { nombre: corral.nombre, n: corral.n, capacidad: corral.capacidad }),
          }))}
        />
      )}
      {datos.sin_corral > 0 && <p className="pie c-600 panel__nota">{tn('panel.corrales.sinCorral', datos.sin_corral)}</p>}
    </Tarjeta>
  );
}

function Movimientos({ datos }: { datos: NonNullable<DatosPanel['animales']>['movimientos'] }) {
  const altas = datos.reduce((suma, mes) => suma + mes.altas, 0);
  const bajas = datos.reduce((suma, mes) => suma + mes.bajas, 0);
  return (
    <Tarjeta titulo={t('panel.movimientos.titulo')}>
      {altas + bajas === 0 ? (
        <p className="cuerpo c-600">{t('panel.movimientos.vacio')}</p>
      ) : (
        <>
          <p className="pie c-600 panel__antes">{t('panel.movimientos.resumen', { altas, bajas })}</p>
          <ColumnasAltasBajas
            descripcion={t('panel.movimientos.descripcion')}
            leyenda={{ altas: t('panel.movimientos.altas'), bajas: t('panel.movimientos.bajas') }}
            meses={datos.map((mes) => ({
              clave: mes.mes,
              etiqueta: mesCorto(mes.mes),
              ayuda: t('panel.movimientos.ayuda', { mes: mesLargo(mes.mes), altas: mes.altas, bajas: mes.bajas }),
              altas: mes.altas,
              bajas: mes.bajas,
            }))}
          />
        </>
      )}
    </Tarjeta>
  );
}

function Vacunacion({
  datos,
  editar,
  regional,
}: {
  datos: NonNullable<DatosPanel['sanidad']>;
  editar: boolean;
  regional: Regional;
}) {
  if (datos.esquemas === 0 || datos.cobertura === null) {
    return (
      <Tarjeta titulo={t('panel.sanidad.titulo')}>
        <div className="panel__vacio">
          <p className="cuerpo">{datos.esquemas === 0 ? t('panel.sanidad.sinEsquemas') : t('panel.sanidad.sinAnimales')}</p>
          {editar && (
            <Link className="btn btn-secundario" to="/sanidad/esquemas">
              {t('panel.sanidad.definir')}
            </Link>
          )}
        </div>
      </Tarjeta>
    );
  }

  return (
    <Tarjeta
      titulo={t('panel.sanidad.titulo')}
      accion={
        <Link className="btn btn-fantasma" to="/sanidad">
          {t('panel.sanidad.verCalendario')}
        </Link>
      }
    >
      <p className="panel__cifra">
        <span className="panel__numero">{t('panel.sanidad.cobertura', { n: datos.cobertura })}</span>
      </p>
      <BarrasHorizontales
        descripcion={t('panel.sanidad.detalleCobertura', { al_dia: datos.al_dia, total: datos.con_esquema })}
        barras={[
          {
            clave: 'cobertura',
            etiqueta: t('panel.sanidad.alDia'),
            valor: datos.al_dia,
            tope: datos.con_esquema,
            rotulo: `${datos.al_dia}/${datos.con_esquema}`,
          },
        ]}
      />
      <p className="pie c-600 panel__nota">{t('panel.sanidad.detalleCobertura', { al_dia: datos.al_dia, total: datos.con_esquema })}</p>
      <div className="panel__insignias">
        <Link to="/sanidad?estado=vencida" className="panel__enlace">
          <Insignia variante={datos.vencidas > 0 ? 'error' : 'exito'}>{tn('panel.sanidad.vencidas', datos.vencidas)}</Insignia>
        </Link>
        <Link to="/sanidad?estado=proxima" className="panel__enlace">
          <Insignia variante={datos.proximas > 0 ? 'adv' : 'neutro'}>
            {tn('panel.sanidad.proximas', datos.proximas, { dias: datos.dias_proxima })}
          </Insignia>
        </Link>
      </div>
      <h3 className="etiqueta c-700 panel__subtitulo">{t('panel.sanidad.proximos')}</h3>
      {datos.proximos.length === 0 ? (
        <p className="pie c-600 panel__nota">{t('panel.sanidad.nadaPendiente')}</p>
      ) : (
        <ul className="panel__lista">
          {datos.proximos.map((dosis) => (
            <li key={`${dosis.animal_id}-${dosis.esquema_nombre}`}>
              <Link className="dato" to={`/animales/${dosis.animal_id}`}>
                {dosis.identificador}
              </Link>
              <span className="flex1">{dosis.esquema_nombre}</span>
              <span className="c-600">{formatoFecha(dosis.vence, regional)}</span>
              <Insignia variante={VARIANTE_ESTADO[dosis.estado]}>{textoVencimiento(dosis.dias)}</Insignia>
            </li>
          ))}
        </ul>
      )}
    </Tarjeta>
  );
}

function Pesos({ datos, regional }: { datos: NonNullable<DatosPanel['pesajes']>; regional: Regional }) {
  const conDatos = datos.evolucion.filter((mes) => mes.peso_promedio !== null);
  const ultimo = conDatos[conDatos.length - 1];
  const anterior = conDatos[conDatos.length - 2];

  // Desde el primer mes con pesajes: los meses vacíos de antes no dicen nada.
  const primero = datos.evolucion.findIndex((mes) => mes.peso_promedio !== null);
  const meses = primero < 0 ? [] : datos.evolucion.slice(primero);

  return (
    <Tarjeta
      titulo={t('panel.pesos.titulo')}
      accion={
        <Link className="btn btn-fantasma" to="/pesajes">
          {t('panel.pesos.verComparativa')}
        </Link>
      }
    >
      {conDatos.length === 0 ? (
        <p className="cuerpo c-600">{t('panel.pesos.vacio')}</p>
      ) : (
        <>
          <p className="panel__cifra">
            <span className="panel__numero">{formatoPeso(ultimo.peso_promedio!, regional)}</span>
            <span className="pie c-600">
              {t('panel.pesos.ultimo', { peso: formatoPeso(ultimo.peso_promedio!, regional), mes: mesLargo(ultimo.mes) })}
            </span>
            {anterior && (
              <span className="pie c-600">
                {t('panel.pesos.cambio', {
                  signo: ultimo.peso_promedio! >= anterior.peso_promedio! ? '+' : '−',
                  peso: formatoPeso(Math.abs(ultimo.peso_promedio! - anterior.peso_promedio!), regional),
                  mes: mesLargo(anterior.mes),
                })}
              </span>
            )}
          </p>
          {conDatos.length === 1 ? (
            <p className="pie c-600">{t('panel.pesos.unMes')}</p>
          ) : (
            <GraficoLinea
              descripcion={t('panel.pesos.descripcion')}
              puntos={meses.map((mes, i) => ({
                clave: mes.mes,
                x: i,
                y: mes.peso_promedio,
                etiquetaX: mesCorto(mes.mes),
                rotulo: mes.peso_promedio === null ? '' : formatoPeso(mes.peso_promedio, regional),
                ayuda:
                  mes.peso_promedio === null
                    ? mesLargo(mes.mes)
                    : t('panel.pesos.ayuda', {
                        mes: mesLargo(mes.mes),
                        peso: formatoPeso(mes.peso_promedio, regional),
                        n: mes.animales,
                      }),
              }))}
            />
          )}
        </>
      )}
    </Tarjeta>
  );
}
