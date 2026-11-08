import { Alerta, Tarjeta } from '../../componentes';
import { GraficoLinea } from '../../componentes/Graficos';
import type { Pesaje } from '../../servicios/api';
import { t } from '../../servicios/idioma';
import { conGanancias, diasEntre, gananciaTotal, textoGanancia } from '../../servicios/pesos';
import { formatoFecha, formatoPeso, type Regional } from '../../servicios/unidades';

/**
 * HU-54 · Ganancia diaria y evolución del peso, en la pestaña Pesajes de la
 * ficha (la pestaña es de Brian, HU-53).
 *
 *   1. La ganancia diaria se calcula sola entre cada pesaje y el anterior:
 *      diferencia de peso dividida por los días (servicios/pesos.ts).
 *   2. La pestaña muestra la tabla con su ganancia (columna en PestanaPesajes)
 *      y este gráfico de la evolución.
 *   3. Con un solo pesaje se explica que hace falta otro.
 */
export function EvolucionPeso({ pesajes, regional }: { pesajes: Pesaje[]; regional: Regional }) {
  if (pesajes.length === 0) return null;
  if (pesajes.length === 1) return <Alerta variante="info">{t('evolucionPeso.unSolo')}</Alerta>;

  const filas = conGanancias(pesajes);
  const total = gananciaTotal(pesajes);
  const primero = filas[0].pesaje.fecha;

  return (
    <Tarjeta titulo={t('evolucionPeso.titulo')}>
      <GraficoLinea
        descripcion={t('evolucionPeso.descripcion')}
        puntos={filas.map(({ pesaje, ganancia }) => ({
          clave: pesaje.id,
          x: diasEntre(primero, pesaje.fecha),
          y: Number(pesaje.peso_kg),
          etiquetaX: formatoFecha(pesaje.fecha, regional),
          rotulo: formatoPeso(Number(pesaje.peso_kg), regional),
          ayuda:
            ganancia === null
              ? t('evolucionPeso.ayuda', {
                  fecha: formatoFecha(pesaje.fecha, regional),
                  peso: formatoPeso(Number(pesaje.peso_kg), regional),
                })
              : t('evolucionPeso.ayudaGanancia', {
                  fecha: formatoFecha(pesaje.fecha, regional),
                  peso: formatoPeso(Number(pesaje.peso_kg), regional),
                  ganancia: textoGanancia(ganancia, regional),
                }),
        }))}
        pie={
          total !== null ? (
            <p className="pie c-600 panel__nota">{t('evolucionPeso.total', { ganancia: textoGanancia(total, regional) })}</p>
          ) : undefined
        }
      />
    </Tarjeta>
  );
}
