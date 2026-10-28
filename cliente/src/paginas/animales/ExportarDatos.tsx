import { useState } from 'react';
import { Alerta, Boton, Segmentos, Tarjeta } from '../../componentes';
import {
  api,
  type ConjuntoExportacion,
  type EstadoAnimal,
  type FiltrosAnimales,
  type FormatoExportacion,
} from '../../servicios/api';
import { t } from '../../servicios/idioma';

/**
 * HU-45 · Exportar los datos del rancho.
 *
 *   1. Se elige qué exportar (animales, corrales, movimientos entre corrales
 *      y cambios de estado) y en qué formato: Excel, con una hoja por cada
 *      cosa, o CSV, que es una sola tabla y por eso permite elegir una sola.
 *   2. Los animales, sus movimientos y sus cambios de estado salen con la
 *      pestaña y los filtros que tiene el listado en ese momento: es lo mismo
 *      que se está viendo.
 *   3. El nombre del archivo, con el rancho y la fecha, lo pone el servidor.
 *
 * Exportar es leer: lo puede hacer quien puede ver cada módulo. Corrales
 * aparece desactivado si no puede verlos.
 */

const CONJUNTOS: ConjuntoExportacion[] = ['animales', 'corrales', 'movimientos', 'estados'];
const FORMATOS: FormatoExportacion[] = ['xlsx', 'csv'];

interface Propiedades {
  vista: EstadoAnimal | 'todos' | 'bajas';
  filtros: FiltrosAnimales;
  hayFiltros: boolean;
  puedeVerCorrales: boolean;
  alCerrar: () => void;
}

export function ExportarDatos({ vista, filtros, hayFiltros, puedeVerCorrales, alCerrar }: Propiedades) {
  const [formato, setFormato] = useState<FormatoExportacion>('xlsx');
  const [elegidos, setElegidos] = useState<ConjuntoExportacion[]>(['animales']);
  const [descargando, setDescargando] = useState(false);
  const [error, setError] = useState('');

  function cambiarFormato(nuevo: FormatoExportacion) {
    setFormato(nuevo);
    // CSV es una sola tabla: queda la primera de las elegidas.
    if (nuevo === 'csv' && elegidos.length > 1) setElegidos([elegidos[0]]);
  }

  function alternar(conjunto: ConjuntoExportacion) {
    if (formato === 'csv') {
      setElegidos([conjunto]);
      return;
    }
    setElegidos((previos) =>
      previos.includes(conjunto) ? previos.filter((c) => c !== conjunto) : [...previos, conjunto],
    );
  }

  async function descargar() {
    setDescargando(true);
    setError('');
    try {
      await api.exportar({
        que: CONJUNTOS.filter((c) => elegidos.includes(c)),
        formato,
        vista,
        filtros,
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDescargando(false);
    }
  }

  return (
    <Tarjeta
      titulo={t('exportacion.titulo')}
      accion={
        <Boton variante="fantasma" onClick={alCerrar}>
          {t('comun.cerrar')}
        </Boton>
      }
      pie={
        <Boton variante="primario" onClick={descargar} disabled={descargando || elegidos.length === 0}>
          {descargando ? t('exportacion.descargando') : t('exportacion.descargar')}
        </Boton>
      }
    >
      <div className="col g16">
        {error && <Alerta variante="error">{error}</Alerta>}

        <Segmentos
          etiqueta={t('exportacion.formato')}
          valor={formato}
          alCambiar={cambiarFormato}
          opciones={FORMATOS.map((clave) => ({ clave, nombre: t(`exportacion.formatos.${clave}`) }))}
        />

        <fieldset className="exportacion__que">
          <legend className="etiqueta c-700">
            {formato === 'csv' ? t('exportacion.queUno') : t('exportacion.que')}
          </legend>
          {CONJUNTOS.map((conjunto) => {
            const deshabilitado = conjunto === 'corrales' && !puedeVerCorrales;
            return (
              <label key={conjunto} className="ganado__casilla">
                <input
                  type={formato === 'csv' ? 'radio' : 'checkbox'}
                  name="exportar-que"
                  checked={elegidos.includes(conjunto)}
                  disabled={deshabilitado}
                  onChange={() => alternar(conjunto)}
                />
                {t(`exportacion.conjuntos.${conjunto}`)}
              </label>
            );
          })}
        </fieldset>

        <p className="pie c-600">
          {t('exportacion.filtrosAplicados', { vista: t(`animales.vistas.${vista}`) })}{' '}
          {hayFiltros ? t('exportacion.conFiltros') : t('exportacion.sinFiltros')}
        </p>
      </div>
    </Tarjeta>
  );
}
