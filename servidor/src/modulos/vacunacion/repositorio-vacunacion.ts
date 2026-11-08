import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { POOL_BD } from '../../comun/modulo-base-datos';

/**
 * HU-47, HU-50 y HU-51 · Esquemas de vacunación, calendario sanitario y avisos.
 * Como todos los repositorios, cada método recibe el rancho de quien pregunta y
 * lo pone en el WHERE (HU-03). Además, las tablas de la migración 010 no dejan
 * que un esquema apunte a un producto de otro rancho.
 */

export interface Esquema {
  id: string;
  producto_id: string;
  producto_nombre: string;
  producto_tipo: string;
  nombre: string;
  categorias: string[] | null;
  sexo: 'macho' | 'hembra' | null;
  edad_minima_meses: number;
  edad_maxima_meses: number | null;
  dosis: number;
  intervalo_dias: number | null;
  refuerzo_dias: number | null;
  /** Animales activos a los que les corresponde hoy. */
  animales: number;
  creado_en: string;
}

export interface DatosEsquema {
  producto_id: string;
  nombre: string;
  categorias: string[] | null;
  sexo: 'macho' | 'hembra' | null;
  edad_minima_meses: number;
  edad_maxima_meses: number | null;
  dosis: number;
  intervalo_dias: number | null;
  refuerzo_dias: number | null;
}

export interface ProductoElegible {
  id: string;
  nombre: string;
  tipo: string;
}

export type EstadoDosis = 'vencida' | 'proxima' | 'programada';

export interface FiltroCalendario {
  desde: string | null;
  hasta: string | null;
  productoId: string | null;
  corralId: string | null;
  estado: EstadoDosis | null;
  pagina: number;
  porPagina: number;
}

export interface Dosis {
  animal_id: string;
  identificador: string;
  animal_nombre: string | null;
  categoria_codigo: string | null;
  corral_nombre: string | null;
  esquema_id: string;
  esquema_nombre: string;
  producto_nombre: string;
  /** Qué dosis del esquema toca; nulo si es un refuerzo. */
  numero_dosis: number | null;
  dosis_total: number;
  vence: string;
  /** Días que faltan; negativo si está vencida. */
  dias: number;
  estado: EstadoDosis;
}

/** HU-59 · Un día del mes con cuántas dosis vencen, por estado. */
export interface DiaCalendario {
  fecha: string;
  vencida: number;
  proxima: number;
  programada: number;
}

/** Cuántos días antes cuenta como próxima (HU-50 y HU-51). */
export const DIAS_PROXIMA = 7;

const COLUMNAS_ESQUEMA = `
  e.id, e.producto_id, p.nombre AS producto_nombre, p.tipo AS producto_tipo, e.nombre,
  e.categorias, e.sexo, e.edad_minima_meses, e.edad_maxima_meses, e.dosis,
  e.intervalo_dias, e.refuerzo_dias, e.creado_en,
  (SELECT COUNT(*)::int FROM animales a
    WHERE a.rancho_id = e.rancho_id AND a.estado = 'activo' AND a.eliminado_en IS NULL
      AND (e.categorias IS NULL OR a.categoria_codigo = ANY(e.categorias))
      AND (e.sexo IS NULL OR a.sexo = e.sexo)) AS animales`;

/**
 * HU-50 · Qué dosis le toca a cada animal y cuándo, calculado en la base.
 *
 * Para cada animal activo y cada esquema vigente que le corresponde (categoría
 * y sexo), cuenta sus aplicaciones de ese esquema (n) y la fecha de la última:
 *   - n = 0: la primera dosis vence al cumplir la edad mínima. Si el animal no
 *     tiene fecha de nacimiento, o la cumplió antes de que existiera el
 *     esquema, vence el día que se creó el esquema: no se reclaman dosis de
 *     antes de que el esquema existiera.
 *     Si el animal ya pasó la edad máxima sin empezar, el esquema no le toca
 *     (por ejemplo, brucelosis después de los 8 meses).
 *   - 0 < n < dosis: la siguiente vence intervalo_dias después de la última.
 *   - n >= dosis: si hay refuerzo, vence refuerzo_dias después de la última;
 *     si no, el esquema está completo y no aparece.
 * El estado sale de comparar con hoy en la zona horaria del país del rancho.
 *
 * $1 rancho. El resto de los parámetros los agrega quien la usa.
 * La exporta también el panel del propietario (HU-57), para contar la
 * cobertura de vacunación con la misma cuenta que el calendario.
 */
export const DOSIS_PENDIENTES = `
  WITH hoy AS (
    SELECT (CURRENT_TIMESTAMP AT TIME ZONE COALESCE(pa.zona_horaria, 'UTC'))::date AS fecha,
           COALESCE(pa.zona_horaria, 'UTC') AS zona
      FROM ranchos r LEFT JOIN paises pa ON pa.codigo = r.pais_codigo
     WHERE r.id = $1
  ),
  aplicadas AS (
    SELECT animal_id, esquema_id, COUNT(*)::int AS n, MAX(fecha) AS ultima
      FROM aplicaciones_sanitarias
     WHERE rancho_id = $1 AND eliminado_en IS NULL AND esquema_id IS NOT NULL
     GROUP BY animal_id, esquema_id
  ),
  pares AS (
    SELECT a.id AS animal_id, a.identificador, a.nombre AS animal_nombre, a.categoria_codigo,
           a.corral_id, a.fecha_nacimiento,
           e.id AS esquema_id, e.nombre AS esquema_nombre, e.producto_id, e.dosis, e.intervalo_dias,
           e.refuerzo_dias, e.edad_minima_meses, e.edad_maxima_meses, (e.creado_en AT TIME ZONE h.zona)::date AS esquema_desde,
           COALESCE(ap.n, 0) AS n, ap.ultima, h.fecha AS hoy
      FROM animales a
      JOIN esquemas_vacunacion e
        ON e.rancho_id = a.rancho_id AND e.eliminado_en IS NULL
       AND (e.categorias IS NULL OR a.categoria_codigo = ANY(e.categorias))
       AND (e.sexo IS NULL OR e.sexo = a.sexo)
      LEFT JOIN aplicadas ap ON ap.animal_id = a.id AND ap.esquema_id = e.id
     CROSS JOIN hoy h
     WHERE a.rancho_id = $1 AND a.eliminado_en IS NULL AND a.estado = 'activo'
  ),
  calculadas AS (
    SELECT pares.*,
           CASE
             WHEN n = 0 THEN GREATEST(
               COALESCE((fecha_nacimiento + make_interval(months => edad_minima_meses))::date, esquema_desde),
               esquema_desde)
             WHEN n < dosis THEN ultima + intervalo_dias
             WHEN refuerzo_dias IS NOT NULL THEN ultima + refuerzo_dias
           END AS vence,
           CASE WHEN n < dosis THEN n + 1 END AS numero_dosis
      FROM pares
     WHERE NOT (
       n = 0 AND edad_maxima_meses IS NOT NULL AND fecha_nacimiento IS NOT NULL
       AND (EXTRACT(YEAR FROM age(hoy, fecha_nacimiento)) * 12 + EXTRACT(MONTH FROM age(hoy, fecha_nacimiento)))
           > edad_maxima_meses
     )
  ),
  dosis AS (
    SELECT c.*, (c.vence - c.hoy) AS dias,
           CASE
             WHEN c.vence < c.hoy THEN 'vencida'
             WHEN c.vence <= c.hoy + ${DIAS_PROXIMA} THEN 'proxima'
             ELSE 'programada'
           END AS estado
      FROM calculadas c
     WHERE c.vence IS NOT NULL
  )`;

@Injectable()
export class RepositorioVacunacion {
  constructor(@Inject(POOL_BD) private readonly bd: Pool) {}

  async esquemas(ranchoId: string): Promise<Esquema[]> {
    const resultado = await this.bd.query(
      `SELECT ${COLUMNAS_ESQUEMA}
         FROM esquemas_vacunacion e JOIN productos_sanitarios p ON p.id = e.producto_id
        WHERE e.rancho_id = $1 AND e.eliminado_en IS NULL
        ORDER BY LOWER(e.nombre)`,
      [ranchoId],
    );
    return resultado.rows;
  }

  async esquema(id: string, ranchoId: string): Promise<Esquema | null> {
    const resultado = await this.bd.query(
      `SELECT ${COLUMNAS_ESQUEMA}
         FROM esquemas_vacunacion e JOIN productos_sanitarios p ON p.id = e.producto_id
        WHERE e.id::text = $1 AND e.rancho_id = $2 AND e.eliminado_en IS NULL`,
      [id, ranchoId],
    );
    return resultado.rows[0] ?? null;
  }

  /** Los productos vigentes del rancho, para elegir en el formulario (los carga HU-46). */
  async productos(ranchoId: string): Promise<ProductoElegible[]> {
    const resultado = await this.bd.query(
      `SELECT id, nombre, tipo FROM productos_sanitarios
        WHERE rancho_id = $1 AND eliminado_en IS NULL
        ORDER BY LOWER(nombre)`,
      [ranchoId],
    );
    return resultado.rows;
  }

  async productoVigente(id: string, ranchoId: string): Promise<boolean> {
    const resultado = await this.bd.query(
      `SELECT 1 FROM productos_sanitarios WHERE id::text = $1 AND rancho_id = $2 AND eliminado_en IS NULL`,
      [id, ranchoId],
    );
    return (resultado.rowCount ?? 0) > 0;
  }

  async categorias(): Promise<string[]> {
    const resultado = await this.bd.query(
      `SELECT codigo FROM categorias_animal WHERE eliminado_en IS NULL ORDER BY orden`,
    );
    return resultado.rows.map((fila) => fila.codigo);
  }

  /** El nombre no se repite entre los esquemas vigentes del rancho (sin mirar mayúsculas). */
  async nombreOcupado(nombre: string, ranchoId: string, salvoId: string | null): Promise<boolean> {
    const resultado = await this.bd.query(
      `SELECT 1 FROM esquemas_vacunacion
        WHERE rancho_id = $1 AND eliminado_en IS NULL AND LOWER(nombre) = LOWER($2)
          AND ($3::uuid IS NULL OR id <> $3::uuid)`,
      [ranchoId, nombre, salvoId],
    );
    return (resultado.rowCount ?? 0) > 0;
  }

  async crear(id: string, ranchoId: string, datos: DatosEsquema, autorId: string): Promise<void> {
    await this.bd.query(
      `INSERT INTO esquemas_vacunacion
              (id, rancho_id, producto_id, nombre, categorias, sexo, edad_minima_meses, edad_maxima_meses,
               dosis, intervalo_dias, refuerzo_dias, creado_por, modificado_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12)`,
      [
        id, ranchoId, datos.producto_id, datos.nombre, datos.categorias, datos.sexo,
        datos.edad_minima_meses, datos.edad_maxima_meses, datos.dosis, datos.intervalo_dias,
        datos.refuerzo_dias, autorId,
      ],
    );
  }

  /** HU-47, criterio 3: solo cambia el esquema; las aplicaciones ya registradas quedan como están. */
  async actualizar(id: string, ranchoId: string, datos: DatosEsquema, autorId: string): Promise<void> {
    await this.bd.query(
      `UPDATE esquemas_vacunacion
          SET producto_id = $3, nombre = $4, categorias = $5, sexo = $6, edad_minima_meses = $7,
              edad_maxima_meses = $8, dosis = $9, intervalo_dias = $10, refuerzo_dias = $11,
              modificado_por = $12
        WHERE id = $1 AND rancho_id = $2 AND eliminado_en IS NULL`,
      [
        id, ranchoId, datos.producto_id, datos.nombre, datos.categorias, datos.sexo,
        datos.edad_minima_meses, datos.edad_maxima_meses, datos.dosis, datos.intervalo_dias,
        datos.refuerzo_dias, autorId,
      ],
    );
  }

  async darDeBaja(id: string, ranchoId: string, autorId: string): Promise<boolean> {
    const resultado = await this.bd.query(
      `UPDATE esquemas_vacunacion SET eliminado_en = CURRENT_TIMESTAMP, modificado_por = $3
        WHERE id::text = $1 AND rancho_id = $2 AND eliminado_en IS NULL`,
      [id, ranchoId, autorId],
    );
    return (resultado.rowCount ?? 0) > 0;
  }

  /** HU-50 · Una página de dosis pendientes, el total filtrado y el resumen por estado. */
  async calendario(ranchoId: string, filtro: FiltroCalendario) {
    const condiciones = [
      '($2::date IS NULL OR d.vence >= $2::date)',
      '($3::date IS NULL OR d.vence <= $3::date)',
      '($4::text IS NULL OR d.producto_id::text = $4)',
      '($5::text IS NULL OR d.corral_id::text = $5)',
    ];
    const parametros = [ranchoId, filtro.desde, filtro.hasta, filtro.productoId, filtro.corralId];
    const resultado = await this.bd.query(
      `${DOSIS_PENDIENTES},
       filtradas AS (SELECT d.* FROM dosis d WHERE ${condiciones.join(' AND ')})
       SELECT
         (SELECT json_build_object(
             'vencida', COUNT(*) FILTER (WHERE estado = 'vencida'),
             'proxima', COUNT(*) FILTER (WHERE estado = 'proxima'),
             'programada', COUNT(*) FILTER (WHERE estado = 'programada'))
            FROM filtradas) AS resumen,
         (SELECT COUNT(*)::int FROM filtradas WHERE $6::text IS NULL OR estado = $6) AS total,
         (SELECT COALESCE(json_agg(fila ORDER BY fila.vence, fila.identificador, fila.esquema_nombre), '[]'::json)
            FROM (
              SELECT f.animal_id, f.identificador, f.animal_nombre, f.categoria_codigo,
                     co.nombre AS corral_nombre, f.esquema_id, f.esquema_nombre,
                     p.nombre AS producto_nombre, f.numero_dosis, f.dosis AS dosis_total,
                     to_char(f.vence, 'YYYY-MM-DD') AS vence, f.dias, f.estado
                FROM filtradas f
                JOIN productos_sanitarios p ON p.id = f.producto_id
                LEFT JOIN corrales co ON co.id = f.corral_id
               WHERE $6::text IS NULL OR f.estado = $6
               ORDER BY f.vence, f.identificador, f.esquema_nombre
               LIMIT $7 OFFSET $8
            ) AS fila) AS dosis`,
      [...parametros, filtro.estado, filtro.porPagina, (filtro.pagina - 1) * filtro.porPagina],
    );
    const fila = resultado.rows[0];
    return {
      resumen: fila.resumen as Record<EstadoDosis, number>,
      total: fila.total as number,
      dosis: fila.dosis as Dosis[],
    };
  }

  /**
   * HU-59 · Cuántas dosis vencen cada día entre dos fechas, por estado, para la
   * vista mensual. Mismos filtros de producto y corral que la lista.
   */
  async porDia(
    ranchoId: string,
    desde: string,
    hasta: string,
    productoId: string | null,
    corralId: string | null,
  ): Promise<{ hoy: string; dias: DiaCalendario[] }> {
    const resultado = await this.bd.query(
      `${DOSIS_PENDIENTES}
       SELECT (SELECT to_char(fecha, 'YYYY-MM-DD') FROM hoy) AS hoy,
              COALESCE((
                SELECT json_agg(dia ORDER BY dia.fecha)
                  FROM (
                    SELECT to_char(d.vence, 'YYYY-MM-DD') AS fecha,
                           COUNT(*) FILTER (WHERE d.estado = 'vencida')::int AS vencida,
                           COUNT(*) FILTER (WHERE d.estado = 'proxima')::int AS proxima,
                           COUNT(*) FILTER (WHERE d.estado = 'programada')::int AS programada
                      FROM dosis d
                     WHERE d.vence BETWEEN $2::date AND $3::date
                       AND ($4::text IS NULL OR d.producto_id::text = $4)
                       AND ($5::text IS NULL OR d.corral_id::text = $5)
                     GROUP BY d.vence
                  ) AS dia), '[]'::json) AS dias`,
      [ranchoId, desde, hasta, productoId, corralId],
    );
    return resultado.rows[0];
  }

  /** La fecha de hoy en la zona horaria del país del rancho, AAAA-MM-DD. */
  async hoy(ranchoId: string): Promise<string> {
    const resultado = await this.bd.query(
      `SELECT to_char((CURRENT_TIMESTAMP AT TIME ZONE COALESCE(pa.zona_horaria, 'UTC'))::date, 'YYYY-MM-DD') AS hoy
         FROM ranchos r LEFT JOIN paises pa ON pa.codigo = r.pais_codigo
        WHERE r.id = $1`,
      [ranchoId],
    );
    return resultado.rows[0]?.hoy;
  }

  /** HU-51 · Cuántas dosis están vencidas y cuántas vencen en los próximos días. */
  async avisos(ranchoId: string): Promise<{ vencidas: number; proximas: number }> {
    const resultado = await this.bd.query(
      `${DOSIS_PENDIENTES}
       SELECT COUNT(*) FILTER (WHERE estado = 'vencida')::int AS vencidas,
              COUNT(*) FILTER (WHERE estado = 'proxima')::int AS proximas
         FROM dosis`,
      [ranchoId],
    );
    return resultado.rows[0];
  }
}
