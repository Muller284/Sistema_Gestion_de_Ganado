import { useEffect, useState } from 'react';
import { Alerta, Boton, Cargando, Icono, Tarjeta } from '../../componentes';
import { api, type DosisPendiente } from '../../servicios/api';
import { localeActual, t, tn } from '../../servicios/idioma';
import { armarSemanas, indicadores, type MesSanitario } from '../../servicios/indicadores';
import { formatoFecha, type Regional } from '../../servicios/unidades';
import { FilaDosis } from './PaginaCalendario';

/**
 * HU-59 · Calendario sanitario en vista mensual.
 *   1. Cada día muestra cuántas dosis tocan, con el color de la más urgente:
 *      vencida, próxima o programada (el mismo cálculo que la lista, HU-50).
 *   2. Al tocar un día se ve la lista de ese día.
 *   3. Se pasa al mes anterior y al siguiente.
 *
 * El mes lo cuenta el servidor (GET /sanidad/calendario/mes); la lista del día
 * es la de siempre con desde y hasta en ese día.
 */

const POR_DIA = 200;

interface Propiedades {
  producto: string;
  corral: string;
  regional: Regional;
}

export function CalendarioMensual({ producto, corral, regional }: Propiedades) {
  // Sin mes elegido, el servidor devuelve el de hoy en el rancho.
  const [mes, setMes] = useState<string | null>(null);
  const [datos, setDatos] = useState<MesSanitario | null>(null);
  const [error, setError] = useState('');
  const [dia, setDia] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    indicadores
      .calendarioMes({ mes: mes ?? undefined, producto, corral })
      .then((respuesta) => {
        if (!vigente) return;
        setDatos(respuesta);
        setError('');
      })
      .catch((err: Error) => vigente && setError(err.message));
    return () => {
      vigente = false;
    };
  }, [mes, producto, corral]);

  function mover(meses: number) {
    if (!datos) return;
    const [a, m] = datos.mes.split('-').map(Number);
    const destino = new Date(Date.UTC(a, m - 1 + meses, 1));
    setMes(`${destino.getUTCFullYear()}-${String(destino.getUTCMonth() + 1).padStart(2, '0')}`);
    setDia(null);
  }

  if (error) return <Alerta variante="error">{error}</Alerta>;
  if (!datos) return <Cargando lineas={5} />;

  const [anio, numeroMes] = datos.mes.split('-').map(Number);
  const nombreMes = new Intl.DateTimeFormat(localeActual(), { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(Date.UTC(anio, numeroMes - 1, 1)),
  );
  // "Noviembre de 2026": mayúscula solo al principio.
  const titulo = nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1);
  const porFecha = new Map(datos.dias.map((d) => [d.fecha, d]));
  const celdas = armarSemanas(datos.desde, datos.hasta);
  const hayDosis = datos.dias.length > 0;

  return (
    <div className="col g16">
      <Tarjeta>
        <div className="mes__cabecera">
          <Boton variante="secundario" onClick={() => mover(-1)} aria-label={t('calendarioMensual.anterior')}>
            <Icono nombre="flecha" tamano={16} className="mes__flecha-atras" />
          </Boton>
          <span className="mes__titulo" aria-live="polite">
            {titulo}
          </span>
          <Boton variante="secundario" onClick={() => mover(1)} aria-label={t('calendarioMensual.siguiente')}>
            <Icono nombre="flecha" tamano={16} />
          </Boton>
        </div>

        <div className="mes__rejilla" role="grid" aria-label={titulo}>
          {nombresDeDias().map((nombre) => (
            <span key={nombre} className="mes__dia-semana" role="columnheader">
              {nombre}
            </span>
          ))}
          {celdas.map((fecha, i) => {
            if (!fecha) return <span key={`vacio-${i}`} className="mes__dia fuera" aria-hidden="true" />;
            const cuenta = porFecha.get(fecha);
            const total = cuenta ? cuenta.vencida + cuenta.proxima + cuenta.programada : 0;
            const urgencia = !cuenta ? null : cuenta.vencida ? 'vencida' : cuenta.proxima ? 'proxima' : 'programada';
            const clases = ['mes__dia', fecha === datos.hoy ? 'hoy' : '', fecha === dia ? 'elegido' : '']
              .filter(Boolean)
              .join(' ');
            const detalle = total
              ? `${tn('calendarioMensual.dosis', total)} · ${t(`sanidad.estados.${urgencia}`)}`
              : tn('calendarioMensual.dosis', 0);
            return (
              <button
                key={fecha}
                type="button"
                role="gridcell"
                className={clases}
                disabled={total === 0}
                aria-pressed={fecha === dia}
                aria-label={t('calendarioMensual.dia', { fecha: formatoFecha(fecha, regional), detalle })}
                onClick={() => setDia(fecha === dia ? null : fecha)}
              >
                <span className="mes__numero">{Number(fecha.slice(8))}</span>
                {total > 0 && (
                  <span className={`mes__cuenta ${urgencia}`} aria-hidden="true">
                    <span className="mes__palabra">{tn('calendarioMensual.dosis', total)}</span>
                    <span className="mes__corto">{total}</span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <p className="pie c-600 panel__nota">
          {hayDosis ? t('calendarioMensual.leyenda') : t('calendarioMensual.sinDosisMes')}
        </p>
      </Tarjeta>

      {hayDosis && !dia && <p className="pie c-600">{t('calendarioMensual.elegirDia')}</p>}
      {dia && <DosisDelDia fecha={dia} producto={producto} corral={corral} regional={regional} />}
    </div>
  );
}

function DosisDelDia({ fecha, producto, corral, regional }: { fecha: string } & Propiedades) {
  const [dosis, setDosis] = useState<DosisPendiente[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let vigente = true;
    api
      .calendarioSanitario({ desde: fecha, hasta: fecha, producto, corral, pagina: 1, porPagina: POR_DIA })
      .then((respuesta) => vigente && setDosis(respuesta.dosis))
      .catch((err: Error) => vigente && setError(err.message));
    return () => {
      vigente = false;
    };
  }, [fecha, producto, corral]);

  return (
    <Tarjeta titulo={t('calendarioMensual.delDia', { fecha: formatoFecha(fecha, regional) })}>
      {error && <Alerta variante="error">{error}</Alerta>}
      {!error && dosis === null && <Cargando lineas={3} />}
      {dosis && (
        <ul className="ganado__lista">
          {dosis.map((fila) => (
            <FilaDosis key={`${fila.animal_id}-${fila.esquema_id}`} fila={fila} regional={regional} />
          ))}
        </ul>
      )}
    </Tarjeta>
  );
}

/** "lun", "mar"… en el idioma de la interfaz, de lunes a domingo. */
function nombresDeDias(): string[] {
  const formato = new Intl.DateTimeFormat(localeActual(), { weekday: 'short', timeZone: 'UTC' });
  // El 5 de enero de 2026 fue lunes.
  return Array.from({ length: 7 }, (_, i) => formato.format(new Date(Date.UTC(2026, 0, 5 + i))).replace('.', ''));
}
