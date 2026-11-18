import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { POOL_BD } from '../../comun/modulo-base-datos';
import { HORAS_DE_SOPORTE } from '../../comun/repositorio-usuario-actual';

/**
 * Fase 4 · Lo que lee y cambia el panel del Admin de plataforma (RF-56 a
 * RF-62). Como RepositorioAdmin, lee sin filtrar por rancho: el Admin opera
 * la plataforma entera. Por eso cada método lo llama ServicioPanelAdmin
 * después de comprobar el rol.
 *
 * Del interior de los ranchos solo trae cantidades y fechas, y en la ficha
 * de una cuenta la actividad reciente (qué se registró, quién y cuándo). Las
 * preguntas al asistente no se muestran: solo cuántas hubo.
 */

/**
 * La última vez que cada usuario hizo algo: entró (sesiones) o registró algo.
 * En la demostración se entra sin sesión (x-usuario-id), así que contar solo
 * las sesiones dejaría a todos como inactivos.
 */
const HUELLAS = `
  huellas AS (
    SELECT usuario_id AS usuario, COALESCE(ultimo_uso_en, creado_en) AS en FROM sesiones
    UNION ALL SELECT usuario_id, creado_en FROM consultas_asistente
    UNION ALL SELECT modificado_por, modificado_en FROM animales
    UNION ALL SELECT creado_por, creado_en FROM pesajes
    UNION ALL SELECT creado_por, creado_en FROM aplicaciones_sanitarias
    UNION ALL SELECT creado_por, creado_en FROM movimientos_corral
  ),
  ultima AS (
    SELECT usuario, MAX(en) AS en FROM huellas WHERE usuario IS NOT NULL GROUP BY usuario
  )`;

/** Sin mayúsculas ni tildes, para buscar «Floresta» con «floresta» y «Gutiérrez» con «gutierrez». */
const PLANO = (expresion: string) => `translate(lower(${expresion}), 'áéíóúüñ', 'aeiouun')`;

export interface CuentaResumen {
  id: string;
  nombre: string;
  departamento: string;
  localidad: string;
  pais_codigo: string;
  pais: string | null;
  creado_en: string;
  propietario_id: string;
  propietario: string;
  propietario_correo: string;
  propietario_estado: 'activo' | 'suspendido';
  integrantes: number;
  animales: number;
  consultas_mes: number;
  ultima_actividad: string | null;
  acceso_abierto: string | null;
}

export interface MiembroCuenta {
  id: string;
  nombre: string;
  correo: string;
  rol: string;
  tipo: string | null;
  estado: 'activo' | 'suspendido';
  correo_verificado: boolean;
  debe_cambiar_contrasena: boolean;
  creado_en: string;
  ultima_actividad: string | null;
}

export interface RazaCatalogo {
  id: string;
  nombre: string;
  grupo: 'carne' | 'leche' | 'doble';
  activa: boolean;
  animales: number;
}

export interface EntradaAuditoria {
  id: string;
  admin: string;
  accion: string;
  rancho_id: string | null;
  rancho: string | null;
  usuario: string | null;
  objeto: string | null;
  detalle: Record<string, unknown>;
  creado_en: string;
}

@Injectable()
export class RepositorioPanelAdmin {
  constructor(@Inject(POOL_BD) private readonly bd: Pool) {}

  // ── Tablero (RF-56) ────────────────────────────────────────────────────────

  async cifras() {
    const r = await this.bd.query(
      `WITH ${HUELLAS}
       SELECT
         (SELECT COUNT(*) FROM ranchos WHERE eliminado_en IS NULL)::int AS ranchos,
         (SELECT COUNT(*) FROM ranchos WHERE eliminado_en IS NULL
             AND creado_en >= CURRENT_TIMESTAMP - INTERVAL '30 days')::int AS ranchos_nuevos,
         (SELECT COUNT(*) FROM usuarios WHERE eliminado_en IS NULL AND rol <> 'admin_plataforma')::int AS usuarios,
         (SELECT COUNT(*) FROM usuarios WHERE eliminado_en IS NULL AND rol <> 'admin_plataforma'
             AND creado_en >= CURRENT_TIMESTAMP - INTERVAL '30 days')::int AS usuarios_nuevos,
         (SELECT COUNT(*) FROM usuarios u JOIN ultima ON ultima.usuario = u.id
           WHERE u.eliminado_en IS NULL AND u.rol <> 'admin_plataforma'
             AND ultima.en >= CURRENT_TIMESTAMP - INTERVAL '30 days')::int AS activos,
         (SELECT COUNT(*) FROM usuarios WHERE eliminado_en IS NULL AND rol <> 'admin_plataforma'
             AND estado = 'suspendido')::int AS suspendidos,
         (SELECT COUNT(*) FROM usuarios WHERE eliminado_en IS NULL AND rol <> 'admin_plataforma'
             AND NOT correo_verificado)::int AS sin_verificar,
         (SELECT COUNT(*) FROM animales WHERE eliminado_en IS NULL AND estado = 'activo')::int AS animales,
         (SELECT COUNT(*) FROM corrales WHERE eliminado_en IS NULL)::int AS corrales,
         (SELECT COUNT(*) FROM aplicaciones_sanitarias WHERE eliminado_en IS NULL
             AND creado_en >= CURRENT_TIMESTAMP - INTERVAL '30 days')::int AS aplicaciones_30,
         (SELECT COUNT(*) FROM pesajes WHERE eliminado_en IS NULL
             AND creado_en >= CURRENT_TIMESTAMP - INTERVAL '30 days')::int AS pesajes_30,
         (SELECT COUNT(*) FROM consultas_asistente WHERE eliminado_en IS NULL
             AND creado_en >= date_trunc('month', CURRENT_TIMESTAMP))::int AS consultas_mes,
         (SELECT COUNT(DISTINCT usuario_id) FROM consultas_asistente WHERE eliminado_en IS NULL
             AND creado_en >= date_trunc('month', CURRENT_TIMESTAMP))::int AS consultaron_mes,
         (SELECT COUNT(*) FROM accesos_admin WHERE eliminado_en IS NULL AND salido_en IS NULL
             AND entrado_en > CURRENT_TIMESTAMP - make_interval(hours => $1))::int AS soporte_abiertos,
         (SELECT COUNT(*) FROM accesos_admin WHERE eliminado_en IS NULL
             AND entrado_en >= CURRENT_TIMESTAMP - INTERVAL '30 days')::int AS soporte_30`,
      [HORAS_DE_SOPORTE],
    );
    return r.rows[0];
  }

  async usuariosPorRol(): Promise<{ rol: string; n: number }[]> {
    const r = await this.bd.query(
      `SELECT rol, COUNT(*)::int AS n FROM usuarios
        WHERE eliminado_en IS NULL AND rol <> 'admin_plataforma'
        GROUP BY rol ORDER BY n DESC`,
    );
    return r.rows;
  }

  async ranchosPorPais(): Promise<{ codigo: string; pais: string | null; n: number }[]> {
    const r = await this.bd.query(
      `SELECT r.pais_codigo AS codigo, p.nombre AS pais, COUNT(*)::int AS n
         FROM ranchos r LEFT JOIN paises p ON p.codigo = r.pais_codigo
        WHERE r.eliminado_en IS NULL
        GROUP BY r.pais_codigo, p.nombre ORDER BY n DESC, p.nombre`,
    );
    return r.rows;
  }

  /** Ranchos y usuarios nuevos por semana, las últimas 12 (las vacías también). */
  async altasPorSemana(): Promise<{ semana: string; ranchos: number; usuarios: number }[]> {
    const r = await this.bd.query(
      `SELECT to_char(s.semana, 'YYYY-MM-DD') AS semana,
              (SELECT COUNT(*) FROM ranchos WHERE eliminado_en IS NULL
                 AND date_trunc('week', creado_en) = s.semana)::int AS ranchos,
              (SELECT COUNT(*) FROM usuarios WHERE eliminado_en IS NULL AND rol <> 'admin_plataforma'
                 AND date_trunc('week', creado_en) = s.semana)::int AS usuarios
         FROM generate_series(date_trunc('week', CURRENT_TIMESTAMP) - INTERVAL '11 weeks',
                              date_trunc('week', CURRENT_TIMESTAMP), INTERVAL '1 week') AS s(semana)
        ORDER BY s.semana`,
    );
    return r.rows;
  }

  /** Consultas al asistente por día, en lo que va del mes. */
  async consultasPorDia(): Promise<{ dia: number; n: number }[]> {
    const r = await this.bd.query(
      `SELECT EXTRACT(DAY FROM d.dia)::int AS dia,
              (SELECT COUNT(*) FROM consultas_asistente WHERE eliminado_en IS NULL
                 AND date_trunc('day', creado_en) = d.dia)::int AS n
         FROM generate_series(date_trunc('month', CURRENT_TIMESTAMP),
                              date_trunc('day', CURRENT_TIMESTAMP), INTERVAL '1 day') AS d(dia)
        ORDER BY d.dia`,
    );
    return r.rows;
  }

  // ── Cuentas (RF-57) ────────────────────────────────────────────────────────

  async cuentas(adminId: string, busqueda: string): Promise<CuentaResumen[]> {
    const r = await this.bd.query(
      `WITH ${HUELLAS}
       SELECT r.id, r.nombre, r.departamento, r.localidad, r.pais_codigo, p.nombre AS pais, r.creado_en,
              d.id AS propietario_id, d.nombre AS propietario, d.correo AS propietario_correo,
              d.estado AS propietario_estado,
              (SELECT COUNT(*) FROM usuarios u
                WHERE u.rancho_id = r.id AND u.eliminado_en IS NULL)::int AS integrantes,
              (SELECT COUNT(*) FROM animales a
                WHERE a.rancho_id = r.id AND a.eliminado_en IS NULL AND a.estado = 'activo')::int AS animales,
              (SELECT COUNT(*) FROM consultas_asistente c
                WHERE c.rancho_id = r.id AND c.eliminado_en IS NULL
                  AND c.creado_en >= date_trunc('month', CURRENT_TIMESTAMP))::int AS consultas_mes,
              (SELECT MAX(ultima.en) FROM ultima JOIN usuarios u ON u.id = ultima.usuario
                WHERE u.rancho_id = r.id) AS ultima_actividad,
              (SELECT a.id FROM accesos_admin a
                WHERE a.rancho_id = r.id AND a.admin_id = $1
                  AND a.salido_en IS NULL AND a.eliminado_en IS NULL
                  AND a.entrado_en > CURRENT_TIMESTAMP - make_interval(hours => $2)
                ORDER BY a.entrado_en DESC LIMIT 1) AS acceso_abierto
         FROM ranchos r
         JOIN usuarios d ON d.id = r.propietario_id
         LEFT JOIN paises p ON p.codigo = r.pais_codigo
        WHERE r.eliminado_en IS NULL
          AND ($3 = '' OR ${PLANO(
            "concat_ws(' ', r.nombre, r.localidad, r.departamento, p.nombre, d.nombre, d.correo)",
          )} LIKE '%' || ${PLANO('$3')} || '%')
        ORDER BY r.nombre`,
      [adminId, HORAS_DE_SOPORTE, busqueda],
    );
    return r.rows;
  }

  async cuenta(ranchoId: string) {
    const r = await this.bd.query(
      `SELECT r.id, r.nombre, r.departamento, r.localidad, r.superficie, r.tipo_produccion,
              r.pais_codigo, p.nombre AS pais, r.creado_en,
              d.id AS propietario_id, d.nombre AS propietario, d.correo AS propietario_correo
         FROM ranchos r
         JOIN usuarios d ON d.id = r.propietario_id
         LEFT JOIN paises p ON p.codigo = r.pais_codigo
        WHERE r.id = $1 AND r.eliminado_en IS NULL`,
      [ranchoId],
    );
    return r.rows[0] ?? null;
  }

  async equipo(ranchoId: string): Promise<MiembroCuenta[]> {
    const r = await this.bd.query(
      `WITH ${HUELLAS}
       SELECT u.id, u.nombre, u.correo, u.rol, t.nombre AS tipo, u.estado, u.correo_verificado,
              u.debe_cambiar_contrasena, u.creado_en, ultima.en AS ultima_actividad
         FROM usuarios u
         LEFT JOIN tipos_colaborador t ON t.id = u.tipo_colaborador_id
         LEFT JOIN ultima ON ultima.usuario = u.id
        WHERE u.rancho_id = $1 AND u.eliminado_en IS NULL
        ORDER BY CASE u.rol WHEN 'propietario' THEN 0 WHEN 'socio' THEN 1 ELSE 2 END, u.nombre`,
      [ranchoId],
    );
    return r.rows;
  }

  async consumo(ranchoId: string) {
    const r = await this.bd.query(
      `SELECT
         (SELECT COUNT(*) FROM animales WHERE rancho_id = $1 AND eliminado_en IS NULL AND estado = 'activo')::int AS animales,
         (SELECT COUNT(*) FROM animales WHERE rancho_id = $1 AND eliminado_en IS NULL)::int AS animales_historicos,
         (SELECT COUNT(*) FROM corrales WHERE rancho_id = $1 AND eliminado_en IS NULL)::int AS corrales,
         (SELECT COUNT(*) FROM productos_sanitarios WHERE rancho_id = $1 AND eliminado_en IS NULL)::int AS productos,
         (SELECT COUNT(*) FROM aplicaciones_sanitarias WHERE rancho_id = $1 AND eliminado_en IS NULL)::int AS aplicaciones,
         (SELECT COUNT(*) FROM pesajes WHERE rancho_id = $1 AND eliminado_en IS NULL)::int AS pesajes,
         (SELECT COUNT(*) FROM consultas_asistente WHERE rancho_id = $1 AND eliminado_en IS NULL
             AND creado_en >= date_trunc('month', CURRENT_TIMESTAMP))::int AS consultas_mes,
         (SELECT COUNT(*) FROM consultas_asistente WHERE rancho_id = $1 AND eliminado_en IS NULL)::int AS consultas_total`,
      [ranchoId],
    );
    return r.rows[0];
  }

  /** Lo último que se registró en el rancho: qué, sobre qué animal, quién y cuándo. */
  async actividad(ranchoId: string, cuantas = 12) {
    const r = await this.bd.query(
      `SELECT tipo, en, quien, animal FROM (
         SELECT 'animal' AS tipo, a.creado_en AS en, u.nombre AS quien, a.identificador AS animal
           FROM animales a LEFT JOIN usuarios u ON u.id = a.creado_por
          WHERE a.rancho_id = $1 AND a.eliminado_en IS NULL
         UNION ALL
         SELECT 'pesaje', p.creado_en, u.nombre, an.identificador
           FROM pesajes p JOIN animales an ON an.id = p.animal_id LEFT JOIN usuarios u ON u.id = p.creado_por
          WHERE p.rancho_id = $1 AND p.eliminado_en IS NULL
         UNION ALL
         SELECT 'aplicacion', s.creado_en, u.nombre, an.identificador
           FROM aplicaciones_sanitarias s JOIN animales an ON an.id = s.animal_id LEFT JOIN usuarios u ON u.id = s.creado_por
          WHERE s.rancho_id = $1 AND s.eliminado_en IS NULL
         UNION ALL
         SELECT 'movimiento', m.creado_en, u.nombre, an.identificador
           FROM movimientos_corral m JOIN animales an ON an.id = m.animal_id LEFT JOIN usuarios u ON u.id = m.creado_por
          WHERE m.rancho_id = $1 AND m.eliminado_en IS NULL
         UNION ALL
         SELECT 'consulta', c.creado_en, u.nombre, NULL
           FROM consultas_asistente c LEFT JOIN usuarios u ON u.id = c.usuario_id
          WHERE c.rancho_id = $1 AND c.eliminado_en IS NULL
       ) eventos
       ORDER BY en DESC
       LIMIT $2`,
      [ranchoId, cuantas],
    );
    return r.rows;
  }

  // ── Usuarios ───────────────────────────────────────────────────────────────

  async usuario(id: string) {
    const r = await this.bd.query(
      `SELECT u.id, u.nombre, u.correo, u.rol, u.estado, u.rancho_id, u.idioma, r.nombre AS rancho
         FROM usuarios u LEFT JOIN ranchos r ON r.id = u.rancho_id
        WHERE u.id = $1 AND u.eliminado_en IS NULL`,
      [id],
    );
    return r.rows[0] ?? null;
  }

  async cambiarEstado(id: string, estado: 'activo' | 'suspendido', adminId: string): Promise<void> {
    await this.bd.query(
      `UPDATE usuarios SET estado = $2, modificado_por = $3
        WHERE id = $1 AND eliminado_en IS NULL AND rol <> 'admin_plataforma'`,
      [id, estado, adminId],
    );
  }

  // ── Catálogo de razas (RF-60) ─────────────────────────────────────────────

  async razas(): Promise<RazaCatalogo[]> {
    const r = await this.bd.query(
      `SELECT z.id, z.nombre, z.grupo, z.eliminado_en IS NULL AS activa,
              (SELECT COUNT(*) FROM animales a WHERE a.eliminado_en IS NULL AND a.raza = z.nombre)::int AS animales
         FROM razas z
        WHERE z.rancho_id IS NULL
        ORDER BY z.eliminado_en IS NOT NULL, z.grupo, LOWER(z.nombre)`,
    );
    return r.rows;
  }

  /** Las que escribieron los ranchos en «Otra», agrupadas: candidatas para el catálogo. */
  async razasDeRanchos(): Promise<{ nombre: string; ranchos: number; animales: number }[]> {
    const r = await this.bd.query(
      `SELECT MIN(z.nombre) AS nombre, COUNT(DISTINCT z.rancho_id)::int AS ranchos,
              (SELECT COUNT(*) FROM animales a JOIN razas y ON y.rancho_id = a.rancho_id AND y.nombre = a.raza
                WHERE a.eliminado_en IS NULL AND y.clave = z.clave AND y.rancho_id IS NOT NULL
                  AND y.eliminado_en IS NULL)::int AS animales
         FROM razas z
        WHERE z.rancho_id IS NOT NULL AND z.eliminado_en IS NULL
        GROUP BY z.clave
        ORDER BY ranchos DESC, animales DESC, MIN(z.nombre)
        LIMIT 30`,
    );
    return r.rows;
  }

  async razaPorClave(clave: string) {
    const r = await this.bd.query(
      `SELECT id, nombre, grupo, eliminado_en IS NULL AS activa FROM razas
        WHERE rancho_id IS NULL AND clave = $1
        ORDER BY eliminado_en NULLS FIRST LIMIT 1`,
      [clave],
    );
    return r.rows[0] ?? null;
  }

  async razaPorId(id: string) {
    const r = await this.bd.query(
      `SELECT id, nombre, clave, grupo, eliminado_en IS NULL AS activa FROM razas
        WHERE id = $1 AND rancho_id IS NULL`,
      [id],
    );
    return r.rows[0] ?? null;
  }

  /**
   * Una raza nueva del catálogo. Las que los ranchos ya tenían escritas igual
   * pasan a ser esta: se dan de baja las propias (los animales guardan la
   * raza como texto, así que no cambian), para que no aparezca dos veces.
   */
  async crearRaza(datos: { nombre: string; clave: string; grupo: string; adminId: string }) {
    const cliente = await this.bd.connect();
    try {
      await cliente.query('BEGIN');
      const r = await cliente.query(
        `INSERT INTO razas (rancho_id, nombre, clave, grupo, orden, creado_por, modificado_por)
         VALUES (NULL, $1, $2, $3::varchar,
                 (SELECT COALESCE(MAX(orden), 0) + 1 FROM razas WHERE rancho_id IS NULL AND grupo = $3::varchar), $4, $4)
         RETURNING id`,
        [datos.nombre, datos.clave, datos.grupo, datos.adminId],
      );
      const absorbidas = await cliente.query(
        `UPDATE razas SET eliminado_en = CURRENT_TIMESTAMP, modificado_por = $2
          WHERE rancho_id IS NOT NULL AND clave = $1 AND eliminado_en IS NULL`,
        [datos.clave, datos.adminId],
      );
      await cliente.query('COMMIT');
      return { id: r.rows[0].id as string, absorbidas: absorbidas.rowCount ?? 0 };
    } catch (error) {
      await cliente.query('ROLLBACK');
      throw error;
    } finally {
      cliente.release();
    }
  }

  async editarRaza(id: string, cambios: { grupo?: string; activa?: boolean }, adminId: string) {
    await this.bd.query(
      `UPDATE razas
          SET grupo = COALESCE($2::varchar, grupo),
              eliminado_en = CASE
                WHEN $3::boolean IS NULL THEN eliminado_en
                WHEN $3 THEN NULL
                ELSE COALESCE(eliminado_en, CURRENT_TIMESTAMP) END,
              modificado_por = $4
        WHERE id = $1 AND rancho_id IS NULL`,
      [id, cambios.grupo ?? null, cambios.activa ?? null, adminId],
    );
  }

  // ── Configuración (RNF-04, RNF-11) ─────────────────────────────────────────

  async configuracion(): Promise<Record<string, number | null>> {
    const r = await this.bd.query('SELECT clave, valor FROM configuracion_plataforma WHERE eliminado_en IS NULL');
    return Object.fromEntries(r.rows.map((fila) => [fila.clave, fila.valor]));
  }

  async guardarConfiguracion(clave: string, valor: number | null, adminId: string): Promise<void> {
    await this.bd.query(
      `INSERT INTO configuracion_plataforma (clave, valor, creado_por, modificado_por)
       VALUES ($1, $2, $3, $3)
       ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, modificado_por = EXCLUDED.modificado_por`,
      [clave, valor, adminId],
    );
  }

  // ── Auditoría (RF-62) ──────────────────────────────────────────────────────

  async auditoria(filtros: { accion: string | null; ranchoId: string | null; limite: number }): Promise<EntradaAuditoria[]> {
    const r = await this.bd.query(
      `SELECT a.id, adm.nombre AS admin, a.accion, a.rancho_id, r.nombre AS rancho,
              u.nombre AS usuario, a.objeto, a.detalle, a.creado_en
         FROM registro_auditoria a
         JOIN usuarios adm ON adm.id = a.admin_id
         LEFT JOIN ranchos r ON r.id = a.rancho_id
         LEFT JOIN usuarios u ON u.id = a.usuario_id
        WHERE a.eliminado_en IS NULL
          AND ($1::text IS NULL OR a.accion LIKE $1 || '%')
          AND ($2::uuid IS NULL OR a.rancho_id = $2::uuid)
        ORDER BY a.creado_en DESC
        LIMIT $3`,
      [filtros.accion, filtros.ranchoId, filtros.limite],
    );
    return r.rows;
  }
}

/** Una fila del registro de auditoría. Lo usan el panel y el acceso de soporte (HU-24). */
@Injectable()
export class RepositorioAuditoria {
  constructor(@Inject(POOL_BD) private readonly bd: Pool) {}

  async anotar(fila: {
    adminId: string;
    accion: string;
    ranchoId?: string | null;
    usuarioId?: string | null;
    objeto?: string | null;
    detalle?: Record<string, unknown>;
  }): Promise<void> {
    await this.bd.query(
      `INSERT INTO registro_auditoria (admin_id, accion, rancho_id, usuario_id, objeto, detalle, creado_por, modificado_por)
       VALUES ($1, $2, $3, $4, $5, $6, $1, $1)`,
      [
        fila.adminId,
        fila.accion,
        fila.ranchoId ?? null,
        fila.usuarioId ?? null,
        fila.objeto ?? null,
        JSON.stringify(fila.detalle ?? {}),
      ],
    );
  }
}
