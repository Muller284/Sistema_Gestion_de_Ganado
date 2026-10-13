import { useEffect, useState, type ChangeEvent } from 'react';
import {
  Alerta,
  Boton,
  Campo,
  Cargando,
  Dato,
  Datos,
  DisenoApp,
  Icono,
  Segmentos,
  Tarjeta,
} from '../../componentes';
import {
  api,
  type EstadoRancho,
  type EstrategiaDuplicados,
  type ResultadoImportacion,
  type ValidacionImportacion,
} from '../../servicios/api';
import { t } from '../../servicios/idioma';

/**
 * HU-40 a HU-45 · Importación de ganado por CSV.
 *
 * Tres pasos en la misma pantalla: bajar la plantilla, subir el archivo y
 * revisar lo que el servidor validó antes de confirmar. Si hay caravanas que
 * ya existen en el rancho, se elige si se omiten o se actualizan.
 *
 * El socio ve la pantalla pero no puede importar (HU-21). El servidor también
 * lo rechaza: esto es comodidad, no seguridad.
 */
export function PaginaImportacion() {
  const [rancho, setRancho] = useState<EstadoRancho | null>(null);
  const [cargando, setCargando] = useState(true);
  const [csv, setCsv] = useState('');
  const [validacion, setValidacion] = useState<ValidacionImportacion | null>(null);
  const [estrategia, setEstrategia] = useState<EstrategiaDuplicados>('omitir');
  const [resultado, setResultado] = useState<ResultadoImportacion | null>(null);
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    let vigente = true;
    api
      .miRancho()
      .then((estado) => vigente && setRancho(estado))
      .catch((err: Error) => vigente && setError(err.message))
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, []);

  const usuario = rancho?.usuario ?? { nombre: t('equipo.invitado'), rol: '—' };
  const esSocio = rancho?.usuario.rol === 'socio';

  async function descargarPlantilla() {
    setError('');
    try {
      const plantilla = await api.plantillaImportacion();
      const blob = new Blob([plantilla.contenidoCsv], { type: 'text/csv;charset=utf-8;' });
      const enlace = document.createElement('a');
      enlace.href = URL.createObjectURL(blob);
      enlace.download = 'plantilla_ganado.csv';
      enlace.click();
      URL.revokeObjectURL(enlace.href);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function alElegirArchivo(evento: ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0];
    if (!archivo) return;
    setError('');
    setValidacion(null);
    setOcupado(true);
    try {
      const texto = await archivo.text();
      setCsv(texto);
      setValidacion(await api.validarImportacion(texto));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setOcupado(false);
    }
  }

  async function importar() {
    setError('');
    setOcupado(true);
    try {
      setResultado(await api.ejecutarImportacion(csv, estrategia));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setOcupado(false);
    }
  }

  function reiniciar() {
    setCsv('');
    setValidacion(null);
    setResultado(null);
    setEstrategia('omitir');
  }

  return (
    <DisenoApp
      activo="importacion"
      ruta={[t('app.modulos.inicio'), t('importacion.titulo')]}
      usuario={usuario}
      rancho={rancho?.rancho?.nombre ?? null}
      rotulo={t('importacion.rotulo')}
      titulo={t('importacion.titulo')}
    >
      <div className="col g24">
        {cargando && <Cargando lineas={4} />}
        {error && <Alerta variante="error">{error}</Alerta>}
        {!cargando && esSocio && <Alerta variante="info">{t('importacion.soloConsulta')}</Alerta>}

        {!cargando && !esSocio && resultado && (
          <Tarjeta
            titulo={t('importacion.resultado.titulo')}
            pie={
              <Boton variante="secundario" onClick={reiniciar}>
                {t('importacion.resultado.otra')}
              </Boton>
            }
          >
            <Alerta variante="exito">{resultado.mensaje}</Alerta>
            <Datos>
              <Dato nombre={t('importacion.resultado.insertados')}>{resultado.resumen.insertados}</Dato>
              <Dato nombre={t('importacion.resultado.actualizados')}>{resultado.resumen.actualizados}</Dato>
              <Dato nombre={t('importacion.resultado.omitidos')}>{resultado.resumen.omitidos}</Dato>
            </Datos>
          </Tarjeta>
        )}

        {!cargando && !esSocio && !resultado && (
          <>
            <Tarjeta titulo={t('importacion.plantilla.titulo')}>
              <p className="cuerpo c-600">{t('importacion.plantilla.texto')}</p>
              <Boton variante="secundario" onClick={descargarPlantilla}>
                <Icono nombre="descargar" tamano={18} />
                {t('importacion.plantilla.boton')}
              </Boton>
            </Tarjeta>

            <Tarjeta titulo={t('importacion.archivo.titulo')}>
              <Campo etiqueta={t('importacion.archivo.etiqueta')}>
                {(id) => (
                  <input id={id} type="file" accept=".csv,text/csv" onChange={alElegirArchivo} disabled={ocupado} />
                )}
              </Campo>
            </Tarjeta>

            {validacion && (
              <Tarjeta
                titulo={t('importacion.validacion.titulo')}
                pie={
                  <Boton
                    variante="primario"
                    onClick={importar}
                    disabled={ocupado || validacion.con_errores > 0 || validacion.validas === 0}
                  >
                    {t('importacion.validacion.confirmar')}
                  </Boton>
                }
              >
                <div className="col g16">
                  <Alerta variante={validacion.validas > 0 ? 'exito' : 'adv'}>
                    {t('importacion.validacion.validas', {
                      cantidad: validacion.validas,
                      total: validacion.total,
                    })}
                  </Alerta>

                  {validacion.con_errores > 0 && (
                    <Alerta variante="error">
                      {t('importacion.validacion.errores', { cantidad: validacion.con_errores })}
                    </Alerta>
                  )}
                  {validacion.errores.length > 0 && (
                    <Datos>
                      {validacion.errores.map((fila) => (
                        <Dato key={fila.fila} nombre={t('importacion.validacion.fila', { fila: fila.fila })}>
                          {fila.error}
                        </Dato>
                      ))}
                    </Datos>
                  )}

                  {validacion.filas_duplicadas.length > 0 && (
                    <>
                      <Alerta variante="adv">
                        {t('importacion.validacion.duplicados', {
                          caravanas: validacion.filas_duplicadas.join(', '),
                        })}
                      </Alerta>
                      <Segmentos
                        etiqueta={t('importacion.validacion.duplicados', {
                          caravanas: validacion.filas_duplicadas.join(', '),
                        })}
                        valor={estrategia}
                        alCambiar={setEstrategia}
                        opciones={[
                          { clave: 'omitir', nombre: t('importacion.validacion.omitir') },
                          { clave: 'actualizar', nombre: t('importacion.validacion.actualizar') },
                        ]}
                      />
                    </>
                  )}
                </div>
              </Tarjeta>
            )}
          </>
        )}
      </div>
    </DisenoApp>
  );
}
