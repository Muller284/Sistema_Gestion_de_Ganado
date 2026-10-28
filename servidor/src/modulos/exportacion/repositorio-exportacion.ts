import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { POOL_BD } from '../../comun/modulo-base-datos';

/**
 * HU-45 · Lo que se exporta, leído de la base.
 *
 * Criterio 2: "la exportación respeta los filtros aplicados en el listado".
 * El filtro de animales es el mismo de GET /animales (HU-29 y HU-33/34):
 * vista (un estado, todos o las bajas), búsqueda por identificador o
 * nombre, sexo, categoría, corral y rango de fechas de nacimiento. Los
 * movimientos y los cambios de estado se exportan de esos mismos animales.
 *
 * El WHERE repite a propósito el de RepositorioAnimales.listar en lugar de
 * llamarlo: el listado va a cambiar con la paginación (HU-30) y la
 * exportación siempre necesita todo, sin páginas. Si se agrega un filtro al
 * listado, hay que agregarlo acá (lo comprueba pruebas/exportacion.test.js).
 */

export type ModoBajas = 'no' | 'solo';

export interface CriterioAnimales {
  estados: string[] | null;
  bajas: ModoBajas;
  busqueda: string | null;
  sexo: string | null;
  categoria: string | null;
  corral: string | null;
  fechaDesde: string | null;
  fechaHasta: string | null;
}

export interface ContextoExportacion {
  rancho: string;
  formatoFecha: string;
  unidadPeso: 'kg' | 'lb';
  unidadSuperficie: 'ha' | 'acre';
  zonaHoraria: string;
}

/** Los animales del filtro, como subconsulta reutilizable. Usa $1 a $9. */
const ANIMALES_DEL_FILTRO = `
  SELECT a.id
    FROM animales a
   WHERE a.rancho_id = $1
     AND ($2::varchar[] IS NULL OR a.estado = ANY($2::varchar[]))
     AND (CASE WHEN $3::text = 'solo' THEN a.eliminado_en IS NOT NULL ELSE a.eliminado_en IS NULL END)
     AND ($4::text IS NULL
          OR a.identificador ILIKE '%' || $4::text || '%'
          OR a.nombre ILIKE '%' || $4::text || '%')
     AND ($5::varchar IS NULL OR a.sexo = $5::varchar)
     AND ($6::varchar IS NULL OR a.categoria_codigo = $6::varchar)
     AND ($7::text IS NULL OR a.corral_id::text = $7::text)
     AND ($8::date IS NULL OR a.fecha_nacimiento >= $8::date)
     AND ($9::date IS NULL OR a.fecha_nacimiento <= $9::date)`;

function parametros(ranchoId: string, criterio: CriterioAnimales) {
  return [
    ranchoId,
    criterio.estados,
    criterio.bajas,
    criterio.busqueda ? criterio.busqueda.replace(/[\\%_]/g, (c) => `\\${c}`) : null,
    criterio.sexo,
    criterio.categoria,
    criterio.corral,
    criterio.fechaDesde,
    criterio.fechaHasta,
  ];
}

@Injectable()
export class RepositorioExportacion {
  constructor(@Inject(POOL_BD) private readonly bd: Pool) {}

  /** El nombre del rancho y cómo muestra unidades y fechas su país (HU-26). */
  async contexto(ranchoId: string): Promise<ContextoExportacion> {
    const resultado = await this.bd.query(
      `SELECT r.nombre, p.formato_fecha, p.unidad_peso, p.unidad_superficie, p.zona_horaria
         FROM ranchos r
         LEFT JOIN paises p ON p.codigo = r.pais_codigo
        WHERE r.id = $1`,
      [ranchoId],
    );
    const fila = resultado.rows[0] ?? {};
    return {
      rancho: fila.nombre ?? '',
      formatoFecha: fila.formato_fecha ?? 'DD/MM/YYYY',
      unidadPeso: fila.unidad_peso === 'lb' ? 'lb' : 'kg',
      unidadSuperficie: fila.unidad_superficie === 'acre' ? 'acre' : 'ha',
      zonaHoraria: fila.zona_horaria ?? 'America/La_Paz',
    };
  }

  async animales(ranchoId: string, criterio: CriterioAnimales) {
    const resultado = await this.bd.query(
      `SELECT a.identificador, a.tipo_identificador, a.nombre, a.raza, a.sexo,
              a.categoria_codigo, TO_CHAR(a.fecha_nacimiento, 'YYYY-MM-DD') AS fecha_nacimiento,
              a.origen, c.nombre AS corral, a.peso_kg::float AS peso_kg, a.estado,
              a.eliminado_en, a.creado_en, uc.nombre AS creado_por
         FROM animales a
         LEFT JOIN corrales c ON c.id = a.corral_id
         LEFT JOIN usuarios uc ON uc.id = a.creado_por
        WHERE a.id IN (${ANIMALES_DEL_FILTRO})
        ORDER BY a.identificador`,
      parametros(ranchoId, criterio),
    );
    return resultado.rows;
  }

  async movimientos(ranchoId: string, criterio: CriterioAnimales) {
    const resultado = await this.bd.query(
      `SELECT m.fecha, a.identificador, co.nombre AS origen, cd.nombre AS destino,
              u.nombre AS registrado_por
         FROM movimientos_corral m
         JOIN animales a ON a.id = m.animal_id
         LEFT JOIN corrales co ON co.id = m.corral_origen_id
         LEFT JOIN corrales cd ON cd.id = m.corral_destino_id
         LEFT JOIN usuarios u ON u.id = m.creado_por
        WHERE m.rancho_id = $1 AND m.eliminado_en IS NULL
          AND m.animal_id IN (${ANIMALES_DEL_FILTRO})
        ORDER BY m.fecha, a.identificador`,
      parametros(ranchoId, criterio),
    );
    return resultado.rows;
  }

  async estados(ranchoId: string, criterio: CriterioAnimales) {
    const resultado = await this.bd.query(
      `SELECT TO_CHAR(e.fecha, 'YYYY-MM-DD') AS fecha, a.identificador, e.estado_anterior,
              e.estado_nuevo, e.motivo, u.nombre AS registrado_por, e.creado_en
         FROM cambios_estado_animal e
         JOIN animales a ON a.id = e.animal_id
         LEFT JOIN usuarios u ON u.id = e.creado_por
        WHERE e.rancho_id = $1 AND e.eliminado_en IS NULL
          AND e.animal_id IN (${ANIMALES_DEL_FILTRO})
        ORDER BY e.creado_en, a.identificador`,
      parametros(ranchoId, criterio),
    );
    return resultado.rows;
  }

  /** Los corrales vigentes con cuántos animales activos tienen hoy (HU-36). */
  async corrales(ranchoId: string) {
    const resultado = await this.bd.query(
      `SELECT c.nombre, c.capacidad, c.superficie_ha::float AS superficie_ha,
              COUNT(a.id) FILTER (WHERE a.estado = 'activo' AND a.eliminado_en IS NULL)::int AS ocupacion
         FROM corrales c
         LEFT JOIN animales a ON a.corral_id = c.id
        WHERE c.rancho_id = $1 AND c.eliminado_en IS NULL
        GROUP BY c.id
        ORDER BY c.nombre`,
      [ranchoId],
    );
    return resultado.rows;
  }
}
