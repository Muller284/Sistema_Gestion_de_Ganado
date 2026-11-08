import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { POOL_BD } from '../../comun/modulo-base-datos';
import { DOSIS_PENDIENTES } from '../vacunacion/repositorio-vacunacion';

/**
 * HU-54, HU-56, HU-57 y HU-58 · Lo que cuentan los paneles y la comparativa
 * de pesajes. Solo lee: cada consulta lleva el rancho en el WHERE (HU-03).
 *
 * «Hoy» y los meses se cuentan en la zona horaria del país del rancho, como
 * en el calendario sanitario.
 */

const HOY = `
  hoy AS (
    SELECT (CURRENT_TIMESTAMP AT TIME ZONE COALESCE(pa.zona_horaria, 'UTC'))::date AS fecha,
           COALESCE(pa.zona_horaria, 'UTC') AS zona
      FROM ranchos r LEFT JOIN paises pa ON pa.codigo = r.pais_codigo
     WHERE r.id = $1
  )`;

/** Los últimos doce meses, el actual incluido, como el primer día de cada uno. */
const MESES = `
  meses AS (
    SELECT generate_series(
             date_trunc('month', h.fecha) - INTERVAL '11 months',
             date_trunc('month', h.fecha),
             INTERVAL '1 month')::date AS mes
      FROM hoy h
  )`;

export interface FilaExistencia {
  categoria_codigo: string | null;
  corral_id: string | null;
  corral_nombre: string | null;
  capacidad: number | null;
  n: number;
}

export interface Movimiento {
  mes: string;
  altas: number;
  bajas: number;
}

export interface ResumenSanidad {
  activos: number;
  esquemas: number;
  con_esquema: number;
  atrasados: number;
  vencidas: number;
  proximas: number;
  proximos: {
    animal_id: string;
    identificador: string;
    esquema_nombre: string;
    vence: string;
    dias: number;
    estado: 'proxima' | 'programada';
  }[];
}

export interface PesoDelMes {
  mes: string;
  peso_promedio: number | null;
  animales: number;
}

export interface PesoDeAnimal {
  animal_id: string;
  identificador: string;
  nombre: string | null;
  categoria_codigo: string | null;
  corral_id: string | null;
  corral_nombre: string | null;
  pesajes: number;
  fecha_inicial: string;
  fecha_final: string;
  peso_inicial: number;
  peso_final: number;
  /** Kilos por día entre el primer y el último pesaje del período; nulo con uno solo. */
  ganancia_diaria: number | null;
}

@Injectable()
export class RepositorioIndicadores {
  constructor(@Inject(POOL_BD) private readonly bd: Pool) {}

  async hoy(ranchoId: string): Promise<string> {
    const resultado = await this.bd.query(
      `WITH ${HOY} SELECT to_char(fecha, 'YYYY-MM-DD') AS hoy FROM hoy`,
      [ranchoId],
    );
    return resultado.rows[0].hoy;
  }

  /** HU-57 · Animales activos, por categoría y corral juntos (el servicio los reparte). */
  async existencias(ranchoId: string): Promise<FilaExistencia[]> {
    const resultado = await this.bd.query(
      `SELECT a.categoria_codigo, a.corral_id, c.nombre AS corral_nombre, c.capacidad, COUNT(*)::int AS n
         FROM animales a
         LEFT JOIN corrales c ON c.id = a.corral_id AND c.rancho_id = a.rancho_id
        WHERE a.rancho_id = $1 AND a.eliminado_en IS NULL AND a.estado = 'activo'
        GROUP BY a.categoria_codigo, a.corral_id, c.nombre, c.capacidad`,
      [ranchoId],
    );
    return resultado.rows;
  }

  /**
   * HU-57 · Altas y bajas de los últimos doce meses. Alta es el día en que el
   * animal se registró; baja, la venta o la muerte (cambio de estado, HU-33).
   * Una baja lógica (HU-34) corrige un error de carga: no cuenta como ninguna.
   */
  async movimientos(ranchoId: string): Promise<Movimiento[]> {
    const resultado = await this.bd.query(
      `WITH ${HOY}, ${MESES}
       SELECT to_char(m.mes, 'YYYY-MM') AS mes,
              (SELECT COUNT(*) FROM animales a, hoy h
                WHERE a.rancho_id = $1 AND a.eliminado_en IS NULL
                  AND date_trunc('month', a.creado_en AT TIME ZONE h.zona)::date = m.mes)::int AS altas,
              (SELECT COUNT(*) FROM cambios_estado_animal ce
                 JOIN animales a ON a.id = ce.animal_id AND a.eliminado_en IS NULL
                WHERE ce.rancho_id = $1 AND ce.eliminado_en IS NULL
                  AND ce.estado_nuevo IN ('vendido', 'muerto')
                  AND date_trunc('month', ce.fecha)::date = m.mes)::int AS bajas
         FROM meses m
        ORDER BY m.mes`,
      [ranchoId],
    );
    return resultado.rows;
  }

  /**
   * HU-57 · Cobertura de vacunación con la cuenta del calendario (HU-50).
   * Un animal está al día si le corresponde algún esquema y no tiene ninguna
   * dosis vencida.
   */
  async sanidad(ranchoId: string): Promise<ResumenSanidad> {
    const resultado = await this.bd.query(
      `${DOSIS_PENDIENTES}
       SELECT
         (SELECT COUNT(*)::int FROM animales
           WHERE rancho_id = $1 AND eliminado_en IS NULL AND estado = 'activo') AS activos,
         (SELECT COUNT(*)::int FROM esquemas_vacunacion
           WHERE rancho_id = $1 AND eliminado_en IS NULL) AS esquemas,
         (SELECT COUNT(DISTINCT animal_id)::int FROM calculadas) AS con_esquema,
         (SELECT COUNT(DISTINCT animal_id)::int FROM dosis WHERE estado = 'vencida') AS atrasados,
         (SELECT COUNT(*)::int FROM dosis WHERE estado = 'vencida') AS vencidas,
         (SELECT COUNT(*)::int FROM dosis WHERE estado = 'proxima') AS proximas,
         (SELECT COALESCE(json_agg(x ORDER BY x.vence, x.identificador), '[]'::json)
            FROM (SELECT d.animal_id, d.identificador, d.esquema_nombre,
                         to_char(d.vence, 'YYYY-MM-DD') AS vence, d.dias, d.estado
                    FROM dosis d
                   WHERE d.estado <> 'vencida'
                   ORDER BY d.vence, d.identificador
                   LIMIT 5) AS x) AS proximos`,
      [ranchoId],
    );
    return resultado.rows[0];
  }

  /** HU-57 · Peso promedio de lo pesado cada mes, en los últimos doce. */
  async pesoPorMes(ranchoId: string): Promise<PesoDelMes[]> {
    const resultado = await this.bd.query(
      `WITH ${HOY}, ${MESES},
       pesados AS (
         SELECT date_trunc('month', p.fecha)::date AS mes, p.animal_id, p.peso_kg
           FROM pesajes p
           JOIN animales a ON a.id = p.animal_id AND a.eliminado_en IS NULL
          WHERE p.rancho_id = $1 AND p.eliminado_en IS NULL
       )
       SELECT to_char(m.mes, 'YYYY-MM') AS mes,
              ROUND(AVG(pe.peso_kg)::numeric, 1)::float AS peso_promedio,
              COUNT(DISTINCT pe.animal_id)::int AS animales
         FROM meses m
         LEFT JOIN pesados pe ON pe.mes = m.mes
        GROUP BY m.mes
        ORDER BY m.mes`,
      [ranchoId],
    );
    return resultado.rows;
  }

  /**
   * HU-56 · Para cada animal activo pesado en el período: el primer y el último
   * pesaje del período y la ganancia diaria entre los dos.
   */
  async pesosEnPeriodo(ranchoId: string, desde: string, hasta: string): Promise<PesoDeAnimal[]> {
    const resultado = await this.bd.query(
      `WITH en_periodo AS (
         SELECT p.animal_id, p.fecha, p.peso_kg,
                ROW_NUMBER() OVER (PARTITION BY p.animal_id ORDER BY p.fecha) AS desde_el_principio,
                ROW_NUMBER() OVER (PARTITION BY p.animal_id ORDER BY p.fecha DESC) AS desde_el_final
           FROM pesajes p
          WHERE p.rancho_id = $1 AND p.eliminado_en IS NULL
            AND p.fecha BETWEEN $2::date AND $3::date
       ),
       por_animal AS (
         SELECT a.id AS animal_id, a.identificador, a.nombre, a.categoria_codigo, a.corral_id,
                c.nombre AS corral_nombre,
                COUNT(*)::int AS pesajes,
                MIN(e.fecha) AS inicial, MAX(e.fecha) AS final,
                MAX(e.peso_kg) FILTER (WHERE e.desde_el_principio = 1) AS peso_inicial,
                MAX(e.peso_kg) FILTER (WHERE e.desde_el_final = 1) AS peso_final
           FROM en_periodo e
           JOIN animales a ON a.id = e.animal_id AND a.rancho_id = $1
                          AND a.eliminado_en IS NULL AND a.estado = 'activo'
           LEFT JOIN corrales c ON c.id = a.corral_id AND c.rancho_id = a.rancho_id
          GROUP BY a.id, c.nombre
       )
       SELECT animal_id, identificador, nombre, categoria_codigo, corral_id, corral_nombre, pesajes,
              to_char(inicial, 'YYYY-MM-DD') AS fecha_inicial, to_char(final, 'YYYY-MM-DD') AS fecha_final,
              peso_inicial::float, peso_final::float,
              CASE WHEN final > inicial
                   THEN ROUND(((peso_final - peso_inicial) / (final - inicial))::numeric, 3)::float
              END AS ganancia_diaria
         FROM por_animal
        ORDER BY identificador`,
      [ranchoId, desde, hasta],
    );
    return resultado.rows;
  }
}
