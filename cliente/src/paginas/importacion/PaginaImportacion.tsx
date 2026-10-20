import { useState, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  Alerta,
  Boton,
  Campo,
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
  type EstrategiaDuplicados,
  type FilaPrevia,
  type InformeImportacion,
  type ResultadoImportacion,
} from '../../servicios/api';
import { t } from '../../servicios/idioma';
import { ARCHIVOS_ACEPTADOS, aBase64, informeDeErrores } from '../../servicios/importacion';
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

  const puedeImportar = nivel(contexto, 'importacion') === 'editar';

  async function descargarPlantilla() {
    setError('');
    try {
      await api.descargarPlantilla();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function revisar(nuevo: ArchivoAImportar, conEstrategia: EstrategiaDuplicados) {
    setError('');
    setOcupado(true);
    try {
      setInforme(await api.vistaPreviaImportacion(nuevo, conEstrategia));
    } catch (err) {
      setInforme(null);
      setError((err as Error).message);
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
    await revisar(nuevo, estrategia);
  }

  /** HU-44, criterio 3: cambia qué se hace con los repetidos y la vista previa se rehace. */
  async function cambiarEstrategia(nueva: EstrategiaDuplicados) {
    setEstrategia(nueva);
    if (archivo) await revisar(archivo, nueva);
  }

  async function confirmar() {
    if (!archivo) return;
    setError('');
    setOcupado(true);
    try {
      setResultado(await api.confirmarImportacion(archivo, estrategia));
      setInforme(null);
      setArchivo(null);
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
              <Campo etiqueta={t('importacion.archivo.etiqueta')} ayuda={t('importacion.archivo.ayuda')}>
                {(id) => (
                  <input
                    id={id}
                    type="file"
                    accept={ARCHIVOS_ACEPTADOS}
                    onChange={alElegirArchivo}
                    disabled={ocupado}
                  />
                )}
              </Campo>
            </Tarjeta>

            {ocupado && !informe && <Cargando lineas={3} />}

            {informe && archivo && (
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
