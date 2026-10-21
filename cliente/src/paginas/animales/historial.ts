import type { FichaAnimal } from '../../servicios/api';

/**
 * HU-32 · El historial de un animal en una sola línea de tiempo.
 *
 * Junta lo que ya guarda el servidor por separado:
 *   alta        animales.creado_en y quién lo registró (HU-23)
 *   movimiento  movimientos_corral: origen, destino, fecha y quién (HU-39)
 *   estado      cambios_estado_animal: anterior, nuevo, fecha del cambio,
 *               motivo, cuándo se registró y quién (HU-33)
 *   baja        si hoy está dado de baja: animales.eliminado_en y quién lo
 *               hizo. Es modificado_por, que la baja deja puesto, y después
 *               de una baja no se puede editar la ficha (HU-34)
 *
 * Criterio 4: cada evento dice quién lo registró y cuándo. "Cuándo" es el
 * momento en que quedó guardado, no la fecha que eligió el usuario: en un
 * cambio de estado las dos pueden ser distintas, y la elegida va en el
 * detalle.
 *
 * Lo más nuevo va primero. A igual momento, el alta queda abajo: el primer
 * movimiento de un animal que se registra con corral se guarda en la misma
 * transacción que el alta.
 *
 * Es una función sin React para poder probarla sola
 * (cliente/pruebas/ficha-animal.test.tsx).
 */

export type EventoHistorial =
  | { tipo: 'alta'; clave: string; momento: string; quien: string | null }
  | {
      tipo: 'movimiento';
      clave: string;
      momento: string;
      quien: string | null;
      origen: string | null;
      destino: string | null;
    }
  | {
      tipo: 'estado';
      clave: string;
      momento: string;
      quien: string | null;
      anterior: string;
      nuevo: string;
      fecha: string;
      motivo: string;
    }
  | { tipo: 'baja'; clave: string; momento: string; quien: string | null };

/** El orden entre eventos del mismo instante: el alta siempre es el primero. */
const ORDEN_EN_EMPATE: Record<EventoHistorial['tipo'], number> = {
  baja: 0,
  estado: 1,
  movimiento: 2,
  alta: 3,
};

export function armarHistorial(ficha: FichaAnimal): EventoHistorial[] {
  const { animal } = ficha;
  const eventos: EventoHistorial[] = [
    {
      tipo: 'alta',
      clave: `alta-${animal.id}`,
      momento: animal.creado_en,
      quien: animal.creado_por_nombre,
    },
  ];

  for (const movimiento of ficha.movimientos) {
    eventos.push({
      tipo: 'movimiento',
      clave: `movimiento-${movimiento.id}`,
      momento: movimiento.fecha,
      quien: movimiento.registrado_por,
      origen: movimiento.corral_origen,
      destino: movimiento.corral_destino,
    });
  }

  for (const cambio of ficha.estados) {
    eventos.push({
      tipo: 'estado',
      clave: `estado-${cambio.id}`,
      momento: cambio.creado_en,
      quien: cambio.registrado_por,
      anterior: cambio.estado_anterior,
      nuevo: cambio.estado_nuevo,
      fecha: cambio.fecha,
      motivo: cambio.motivo,
    });
  }

  if (animal.eliminado_en) {
    eventos.push({
      tipo: 'baja',
      clave: `baja-${animal.id}`,
      momento: animal.eliminado_en,
      quien: animal.modificado_por_nombre,
    });
  }

  return eventos.sort((a, b) => {
    const diferencia = Date.parse(b.momento) - Date.parse(a.momento);
    if (diferencia !== 0) return diferencia;
    return ORDEN_EN_EMPATE[a.tipo] - ORDEN_EN_EMPATE[b.tipo];
  });
}

/**
 * La edad para el encabezado, en años y meses cumplidos. Sin fecha de
 * nacimiento no hay edad (null). hoy va como parámetro para poder probarla.
 */
export function edadEnMeses(fechaNacimiento: string | null, hoy: string): number | null {
  if (!fechaNacimiento) return null;
  const [anio, mes, dia] = fechaNacimiento.split('-').map(Number);
  const [anioHoy, mesHoy, diaHoy] = hoy.split('-').map(Number);
  if (!anio || !mes || !dia || !anioHoy || !mesHoy || !diaHoy) return null;
  let meses = (anioHoy - anio) * 12 + (mesHoy - mes);
  if (diaHoy < dia) meses -= 1;
  return Math.max(0, meses);
}
