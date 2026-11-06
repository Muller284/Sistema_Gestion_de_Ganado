import { useState, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  Alerta,
  Boton,
  CampoLista,
  Cargando,
  Cifra,
  DisenoApp,
  Icono,
  Insignia,
  Segmentos,
  Tarjeta,
} from '../../componentes';
import {
  api,
  guardarArchivo,
  type ArchivoAImportar,
  type AsignacionesColumnas,
  type ColumnaDelArchivo,
  type ColumnaImportacion,
  type EstrategiaDuplicados,
  type FilaPrevia,
  type InformeImportacion,
  type ResultadoImportacion,
} from '../../servicios/api';
import { t } from '../../servicios/idioma';
import {
  ARCHIVOS_ACEPTADOS,
  COLUMNAS_OBLIGATORIAS,
  aBase64,
  camposDisponibles,
  columnasListas,
  informeDeErrores,
  limpiarAsignaciones,
  noReconocidas,
  obligatoriasSinAsignar,
  reconocidas,
  sinDecidir,
} from '../../servicios/importacion';
import { formatoFecha, formatoPeso, type Regional } from '../../servicios/unidades';
import { nivel, useContextoGanado, usuarioDe } from '../ganado/contexto';

/**
 * Importación de animales desde Excel o CSV.
 *
 * HU-40  La plantilla se descarga en el idioma de la interfaz. Es opcional:
 *        sirve cualquier archivo con esos encabezados.
 * HU-43  Al subir el archivo se ve, sin guardar nada: las primeras filas tal
 *        como quedarían, el resumen (se cargan, con error, repetidas) y el
 *        detalle de errores por fila, que se puede descargar. Recién al
 *        confirmar se guarda.
 * HU-44  Las repetidas (en el archivo o ya en el rancho) se listan, y se elige
 *        omitirlas o actualizar las existentes; la vista previa se rehace.
 * HU-41  (Brian) Antes de la vista previa se muestra qué columna del archivo se
 *        reconoció como qué campo, por el nombre del encabezado y sus variantes.
 * HU-42  (Brian) Solo se piden las columnas que no se reconocieron: cada una se
 *        asigna con una lista de los campos libres o se marca para ignorarla.
 *
 * Importar exige edición en el módulo Importación: el resto ve el aviso.
 */
export function PaginaImportacion() {
  const contexto = useContextoGanado();
  const [archivo, setArchivo] = useState<ArchivoAImportar | null>(null);
  const [estrategia, setEstrategia] = useState<EstrategiaDuplicados>('omitir');
  const [informe, setInforme] = useState<InformeImportacion | null>(null);
  const [resultado, setResultado] = useState<ResultadoImportacion | null>(null);
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);
  // HU-41/HU-42: las columnas tal como se leyeron (sin asignar nada) y lo elegido a mano.
  const [columnas, setColumnas] = useState<ColumnaDelArchivo[]>([]);
  const [asignaciones, setAsignaciones] = useState<AsignacionesColumnas>({});
  const [fase, setFase] = useState<'columnas' | 'vista'>('columnas');

  const puedeImportar = nivel(contexto, 'importacion') === 'editar';

  async function descargarPlantilla() {
    setError('');
    try {
      await api.descargarPlantilla();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function revisar(
    nuevo: ArchivoAImportar,
    conEstrategia: EstrategiaDuplicados,
    conAsignaciones: AsignacionesColumnas,
  ): Promise<InformeImportacion | null> {
    setError('');
    setOcupado(true);
    try {
      const respuesta = await api.vistaPreviaImportacion(nuevo, conEstrategia, conAsignaciones);
      setInforme(respuesta);
      return respuesta;
    } catch (err) {
      setError((err as Error).message);
      return null;
    } finally {
      setOcupado(false);
    }
  }

  async function alElegirArchivo(evento: ChangeEvent<HTMLInputElement>) {
    const elegido = evento.target.files?.[0];
    evento.target.value = '';
    if (!elegido) return;
    const nuevo = { nombre_archivo: elegido.name, contenido_base64: await aBase64(elegido) };
    setArchivo(nuevo);
    setResultado(null);
    setInforme(null);
    setAsignaciones({});
    setFase('columnas');
    // HU-41: la primera lectura dice qué se reconoció solo.
    const respuesta = await revisar(nuevo, estrategia, {});
    setColumnas(respuesta?.columnas ?? []);
  }

  /** HU-42: elegir un campo, o 'ignorar', para una columna no reconocida. */
  function asignar(posicion: number, valor: ColumnaImportacion | 'ignorar' | '') {
    setAsignaciones((previas) => {
      const nuevas = { ...previas };
      if (valor) nuevas[String(posicion)] = valor;
      else delete nuevas[String(posicion)];
      return nuevas;
    });
  }

  /** HU-41, criterio 3: recién después de ver las columnas se sigue a la vista previa. */
  async function continuar() {
    if (!archivo) return;
    const respuesta = await revisar(archivo, estrategia, limpiarAsignaciones(columnas, asignaciones));
    if (respuesta?.listo) setFase('vista');
  }

  /** HU-44, criterio 3: cambia qué se hace con los repetidos y la vista previa se rehace. */
  async function cambiarEstrategia(nueva: EstrategiaDuplicados) {
    setEstrategia(nueva);
    if (archivo) await revisar(archivo, nueva, limpiarAsignaciones(columnas, asignaciones));
  }

  async function confirmar() {
    if (!archivo) return;
    setError('');
    setOcupado(true);
    try {
      setResultado(
        await api.confirmarImportacion(archivo, estrategia, limpiarAsignaciones(columnas, asignaciones)),
      );
      setInforme(null);
      setArchivo(null);
      setColumnas([]);
      setAsignaciones({});
      setFase('columnas');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setOcupado(false);
    }
  }

  function descargarInforme() {
    if (!informe) return;
    const csv = informeDeErrores(informe.errores, informe.repetidas, {
      fila: t('importacion.informe.fila'),
      identificador: t('importacion.informe.identificador'),
      motivo: t('importacion.informe.motivo'),
      repetidaEnArchivo: t('importacion.repetidas.enArchivo'),
      repetidaEnRancho: t('importacion.repetidas.enRancho'),
    });
    guardarArchivo(new Blob([csv], { type: 'text/csv;charset=utf-8' }), t('importacion.informe.archivo'));
  }

  return (
    <DisenoApp
      activo="importacion"
      ruta={[t('app.modulos.inicio'), t('importacion.titulo')]}
      usuario={usuarioDe(contexto)}
      rancho={contexto.rancho?.rancho?.nombre ?? null}
      rotulo={t('importacion.rotulo')}
      titulo={t('importacion.titulo')}
    >
      <div className="col g24">
        {contexto.cargando && <Cargando lineas={4} />}
        {contexto.error && <Alerta variante="error">{contexto.error}</Alerta>}
        {error && <Alerta variante="error">{error}</Alerta>}
        {!contexto.cargando && !puedeImportar && (
          <Alerta variante="info">{t('importacion.soloConsulta')}</Alerta>
        )}

        {resultado && (
          <Tarjeta
            titulo={t('importacion.resultado.titulo')}
            pie={
              <div className="fila g8">
                <Boton variante="secundario" onClick={() => setResultado(null)}>
                  {t('importacion.resultado.otra')}
                </Boton>
                <Link className="btn btn-primario" to="/animales">
                  {t('importacion.resultado.verAnimales')}
                </Link>
              </div>
            }
          >
            <Alerta variante="exito">{resultado.mensaje}</Alerta>
          </Tarjeta>
        )}

        {!contexto.cargando && puedeImportar && !resultado && (
          <>
            <Tarjeta titulo={t('importacion.plantilla.titulo')}>
              <div className="col g12">
                <p className="cuerpo c-600">{t('importacion.plantilla.texto')}</p>
                <div>
                  <Boton variante="secundario" onClick={descargarPlantilla}>
                    <Icono nombre="descargar" tamano={18} />
                    {t('importacion.plantilla.boton')}
                  </Boton>
                </div>
              </div>
            </Tarjeta>

            <Tarjeta titulo={t('importacion.archivo.titulo')}>
              {/* El control nativo se oculta: el botón es su etiqueta, con el mismo
                  estilo que "Descargar plantilla" y el texto en el idioma de la interfaz. */}
              <div className="col g12">
                <p className="cuerpo c-600">{t('importacion.archivo.etiqueta')}</p>
                <div className="selector-archivo">
                  <input
                    id="archivo-importacion"
                    className="selector-archivo__control"
                    type="file"
                    accept={ARCHIVOS_ACEPTADOS}
                    onChange={alElegirArchivo}
                    disabled={ocupado}
                  />
                  <label
                    htmlFor="archivo-importacion"
                    className={ocupado ? 'btn btn-secundario selector-archivo__boton desactivado' : 'btn btn-secundario selector-archivo__boton'}
                  >
                    <Icono nombre="planilla" tamano={18} />
                    {archivo ? t('importacion.archivo.cambiar') : t('importacion.archivo.elegir')}
                  </label>
                  <span className={archivo ? 'pie dato' : 'pie c-500'}>
                    {archivo ? archivo.nombre_archivo : t('importacion.archivo.ninguno')}
                  </span>
                </div>
                <p className="pie c-500">{t('importacion.archivo.ayuda')}</p>
              </div>
            </Tarjeta>

            {ocupado && !informe && <Cargando lineas={3} />}

            {informe && archivo && fase === 'columnas' && columnas.length > 0 && (
              <Columnas
                columnas={columnas}
                campos={informe.campos}
                asignaciones={asignaciones}
                nombreArchivo={archivo.nombre_archivo}
                ocupado={ocupado}
                alAsignar={asignar}
                alContinuar={continuar}
              />
            )}

            {informe && archivo && fase === 'vista' && (
              <ResumenColumnas columnas={informe.columnas} alRevisar={() => setFase('columnas')} />
            )}

            {informe && archivo && fase === 'vista' && (
              <Informe
                informe={informe}
                nombreArchivo={archivo.nombre_archivo}
                estrategia={estrategia}
                regional={contexto.regional}
                ocupado={ocupado}
                alCambiarEstrategia={cambiarEstrategia}
                alDescargarInforme={descargarInforme}
                alConfirmar={confirmar}
              />
            )}
          </>
        )}
      </div>
    </DisenoApp>
  );
}

interface PropiedadesInforme {
  informe: InformeImportacion;
  nombreArchivo: string;
  estrategia: EstrategiaDuplicados;
  regional: Regional;
  ocupado: boolean;
  alCambiarEstrategia: (estrategia: EstrategiaDuplicados) => void;
  alDescargarInforme: () => void;
  alConfirmar: () => void;
}

function Informe({
  informe,
  nombreArchivo,
  estrategia,
  regional,
  ocupado,
  alCambiarEstrategia,
  alDescargarInforme,
  alConfirmar,
}: PropiedadesInforme) {
  const { resumen } = informe;

  return (
    <>
      {/* HU-43, criterio 2. */}
      <div className="rejilla-cifras">
        <Cifra rotulo={t('importacion.resumen.total')} valor={String(resumen.total)} icono="planilla" />
        <Cifra rotulo={t('importacion.resumen.cargan')} valor={String(resumen.cargan)} icono="exito" />
        <Cifra rotulo={t('importacion.resumen.conError')} valor={String(resumen.con_error)} icono="error" />
        <Cifra rotulo={t('importacion.resumen.repetidas')} valor={String(resumen.repetidas)} icono="advertencia" />
      </div>

      {/* HU-43, criterio 1. */}
      <Tarjeta
        titulo={t('importacion.vistaPrevia.titulo')}
        accion={<span className="pie c-500">{nombreArchivo}</span>}
      >
        {informe.vista_previa.length === 0 ? (
          <p className="cuerpo c-600">{t('importacion.vistaPrevia.vacia')}</p>
        ) : (
          <VistaPrevia filas={informe.vista_previa} regional={regional} />
        )}
      </Tarjeta>

      {/* HU-44. */}
      {informe.repetidas.length > 0 && (
        <Tarjeta titulo={t('importacion.repetidas.titulo', { n: informe.repetidas.length })}>
          <div className="col g16">
            {resumen.existentes > 0 && (
              <Segmentos
                etiqueta={t('importacion.repetidas.pregunta')}
                valor={estrategia}
                alCambiar={alCambiarEstrategia}
                opciones={[
                  { clave: 'omitir', nombre: t('importacion.repetidas.omitir') },
                  { clave: 'actualizar', nombre: t('importacion.repetidas.actualizar') },
                ]}
              />
            )}
            <ul className="ganado__historial">
              {informe.repetidas.map((repetida) => (
                <li key={repetida.fila}>
                  <span className="dato">{t('importacion.informe.filaN', { n: repetida.fila })}</span>
                  <span className="dato flex1">{repetida.identificador}</span>
                  <span className="pie c-600">
                    {repetida.en === 'archivo'
                      ? t('importacion.repetidas.enArchivo')
                      : estrategia === 'actualizar'
                        ? t('importacion.repetidas.seActualiza')
                        : t('importacion.repetidas.enRancho')}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Tarjeta>
      )}

      {/* HU-43, criterio 3. */}
      {informe.errores.length > 0 && (
        <Tarjeta
          titulo={t('importacion.errores.titulo', { n: informe.errores.length })}
          accion={
            <Boton variante="fantasma" onClick={alDescargarInforme}>
              <Icono nombre="descargar" tamano={16} />
              {t('importacion.errores.descargar')}
            </Boton>
          }
        >
          <ul className="ganado__historial">
            {informe.errores.map((error) => (
              <li key={error.fila}>
                <span className="dato">{t('importacion.informe.filaN', { n: error.fila })}</span>
                <span className="flex1">{error.motivo}</span>
                {error.identificador && <span className="dato c-500">{error.identificador}</span>}
              </li>
            ))}
          </ul>
        </Tarjeta>
      )}

      {/* HU-43, criterio 4: nada se guarda hasta acá. */}
      <Tarjeta>
        <div className="fila g16 centro entre">
          <p className="cuerpo c-600">
            {resumen.cargan > 0
              ? t('importacion.confirmar.texto', { n: resumen.cargan })
              : t('importacion.confirmar.nada')}
          </p>
          <Boton variante="primario" onClick={alConfirmar} disabled={ocupado || resumen.cargan === 0}>
            {ocupado ? t('comun.guardando') : t('importacion.confirmar.boton', { n: resumen.cargan })}
          </Boton>
        </div>
      </Tarjeta>
    </>
  );
}

/** El nombre visible de un campo de la importación. */
function nombreCampo(campo: ColumnaImportacion): string {
  return t(`importacion.columnas.campos.${campo}`);
}

interface PropiedadesColumnas {
  columnas: ColumnaDelArchivo[];
  campos: ColumnaImportacion[];
  asignaciones: AsignacionesColumnas;
  nombreArchivo: string;
  ocupado: boolean;
  alAsignar: (posicion: number, valor: ColumnaImportacion | 'ignorar' | '') => void;
  alContinuar: () => void;
}

/**
 * HU-41, criterio 3: qué columna se reconoció como qué campo.
 * HU-42: las no reconocidas, con su lista desplegable y la opción de ignorarlas.
 */
function Columnas({
  columnas,
  campos,
  asignaciones,
  nombreArchivo,
  ocupado,
  alAsignar,
  alContinuar,
}: PropiedadesColumnas) {
  const vistas = reconocidas(columnas);
  const pedir = noReconocidas(columnas);
  const faltan = obligatoriasSinAsignar(columnas, asignaciones);
  const pendientes = sinDecidir(columnas, asignaciones);
  const listas = columnasListas(columnas, asignaciones);

  return (
    <Tarjeta titulo={t('importacion.columnas.titulo')} accion={<span className="pie c-500">{nombreArchivo}</span>}>
      <div className="col g16">
        <p className="cuerpo c-600">{t('importacion.columnas.texto')}</p>

        {vistas.length > 0 && (
          <div className="col g8">
            <span className="cuerpo-m">{t('importacion.columnas.reconocidas', { n: vistas.length })}</span>
            <ul className="ganado__historial">
              {vistas.map((columna) => (
                <li key={columna.posicion}>
                  <span className="dato flex1">{columna.encabezado}</span>
                  <Icono nombre="flecha" tamano={16} />
                  <span className="cuerpo-m">{columna.campo && nombreCampo(columna.campo)}</span>
                  <Insignia variante={columna.como === 'plantilla' ? 'exito' : 'info'}>
                    {t(`importacion.columnas.${columna.como}`)}
                  </Insignia>
                </li>
              ))}
            </ul>
          </div>
        )}

        {pedir.length > 0 && (
          <div className="col g8">
            <span className="cuerpo-m">{t('importacion.columnas.sinReconocer', { n: pedir.length })}</span>
            <p className="pie c-600">{t('importacion.columnas.sinReconocerTexto')}</p>
            <ul className="importacion__columnas">
              {pedir.map((columna) => {
                const elegido = asignaciones[String(columna.posicion)] ?? '';
                const ignorada = elegido === 'ignorar';
                return (
                  <li key={columna.posicion} className="importacion__columna">
                    <CampoLista
                      etiqueta={columna.encabezado}
                      value={ignorada ? '' : elegido}
                      disabled={ignorada || ocupado}
                      onChange={(evento) => alAsignar(columna.posicion, evento.target.value as ColumnaImportacion | '')}
                    >
                      <option value="">{t('importacion.columnas.elegirCampo')}</option>
                      {camposDisponibles(campos, columnas, asignaciones, columna.posicion).map((campo) => (
                        <option key={campo} value={campo}>
                          {COLUMNAS_OBLIGATORIAS.includes(campo)
                            ? `${nombreCampo(campo)} (${t('importacion.columnas.obligatorio')})`
                            : nombreCampo(campo)}
                        </option>
                      ))}
                    </CampoLista>
                    <label className="ganado__casilla">
                      <input
                        type="checkbox"
                        checked={ignorada}
                        disabled={ocupado}
                        onChange={(evento) => alAsignar(columna.posicion, evento.target.checked ? 'ignorar' : '')}
                      />
                      {t('importacion.columnas.ignorar')}
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {faltan.length > 0 && (
          <Alerta variante="adv">
            {t('importacion.columnas.faltan', { campos: faltan.map(nombreCampo).join(', ') })}
          </Alerta>
        )}
        {pendientes.length > 0 && faltan.length === 0 && (
          <Alerta variante="info">{t('importacion.columnas.pendientes', { n: pendientes.length })}</Alerta>
        )}

        <div>
          <Boton variante="primario" onClick={alContinuar} disabled={!listas || ocupado}>
            {ocupado ? t('comun.cargando') : t('importacion.columnas.continuar')}
          </Boton>
        </div>
      </div>
    </Tarjeta>
  );
}

/** HU-41, criterio 3: el mapeo sigue a la vista mientras se revisa el resultado. */
function ResumenColumnas({ columnas, alRevisar }: { columnas: ColumnaDelArchivo[]; alRevisar: () => void }) {
  return (
    <Tarjeta
      titulo={t('importacion.columnas.titulo')}
      accion={
        <Boton variante="fantasma" onClick={alRevisar}>
          {t('importacion.columnas.cambiar')}
        </Boton>
      }
    >
      <div className="importacion__resumen-columnas">
        {columnas.map((columna) => (
          <span key={columna.posicion} className="pie">
            <span className="dato">{columna.encabezado}</span>
            {' → '}
            {columna.campo ? nombreCampo(columna.campo) : t('importacion.columnas.ignorada')}
          </span>
        ))}
      </div>
    </Tarjeta>
  );
}

function VistaPrevia({ filas, regional }: { filas: FilaPrevia[]; regional: Regional }) {
  const raya = '—';
  return (
    <div className="ganado__tabla-contenedor">
      <table className="ganado__tabla">
        <thead>
          <tr>
            <th>{t('importacion.informe.fila')}</th>
            <th>{t('animales.campos.identificador')}</th>
            <th>{t('animales.campos.nombre')}</th>
            <th>{t('animales.campos.sexo')}</th>
            <th>{t('animales.campos.categoria')}</th>
            <th>{t('animales.campos.nacimiento')}</th>
            <th>{t('animales.campos.corral')}</th>
            <th>{t('animales.campos.pesoActual')}</th>
            <th>{t('importacion.vistaPrevia.accion')}</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((fila) => (
            <tr key={fila.fila}>
              <td className="dato">{fila.fila}</td>
              <td className="dato">{fila.identificador}</td>
              <td>{fila.nombre ?? raya}</td>
              <td>{t(`animales.sexos.${fila.sexo}`)}</td>
              <td>{fila.categoria_codigo ? t(`animales.categorias.${fila.categoria_codigo}`) : raya}</td>
              <td>{formatoFecha(fila.fecha_nacimiento, regional)}</td>
              <td>{fila.corral ?? raya}</td>
              <td>{fila.peso_kg ? formatoPeso(fila.peso_kg, regional) : raya}</td>
              <td>
                <Insignia variante={fila.accion === 'nueva' ? 'exito' : 'info'}>
                  {t(`importacion.vistaPrevia.${fila.accion}`)}
                </Insignia>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
