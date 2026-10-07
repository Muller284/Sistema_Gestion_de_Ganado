import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { POOL_BD } from '../../comun/modulo-base-datos';
import { HORAS_DE_SOPORTE } from '../../comun/repositorio-usuario-actual';

/**
 * HU-24 · Lo que ve y registra el Admin de plataforma.
 *
 * Es el UNICO repositorio que lee ranchos sin filtrar por uno: el Admin es
 * justamente quien tiene que poder verlos todos (criterio 1). Por eso todo
 * lo de aca exige rol admin_plataforma en el servicio, y la lista trae solo
 * lo necesario para elegir a cual entrar, no los datos de adentro.
 */

export interface RanchoParaSoporte {
  id: string;
  nombre: string;
  departamento: string;
  localidad: string;
  pais_codigo: string;
  pais: string | null;
  propietario: string;
  propietario_correo: string;
  integrantes: number;
  creado_en: string;
  /** El acceso abierto del Admin que pregunta, si tiene uno. */
  acceso_abierto: string | null;
}

export interface AccesoAdmin {
  id: string;
  admin_id: string;
  admin: string;
  rancho_id: string;
  rancho: string;
  motivo: string;
  entrado_en: string;
  salido_en: string | null;
  /** Cerrado a mano, abierto, o vencido solo por tiempo. */
  estado: 'abierto' | 'cerrado' | 'vencido';
}

const SELECCION_ACCESO = `
  SELECT a.id, a.admin_id, u.nombre AS admin, a.rancho_id, r.nombre AS rancho,
         a.motivo, a.entrado_en, a.salido_en,
         CASE
           WHEN a.salido_en IS NOT NULL THEN 'cerrado'
           WHEN a.entrado_en <= CURRENT_TIMESTAMP - make_interval(hours => ${HORAS_DE_SOPORTE}) THEN 'vencido'
           ELSE 'abierto'
         END AS estado
    FROM accesos_admin a
    JOIN usuarios u ON u.id = a.admin_id
    JOIN ranchos r ON r.id = a.rancho_id
   WHERE a.eliminado_en IS NULL`;

@Injectable()
export class RepositorioAdmin {
  constructor(@Inject(POOL_BD) private readonly bd: Pool) {}

  async ranchos(adminId: string): Promise<RanchoParaSoporte[]> {
    const resultado = await this.bd.query(
      `SELECT r.id, r.nombre, r.departamento, r.localidad, r.pais_codigo, p.nombre AS pais,
              dueno.nombre AS propietario, dueno.correo AS propietario_correo,
              (SELECT COUNT(*)::int FROM usuarios u
                WHERE u.rancho_id = r.id AND u.eliminado_en IS NULL) AS integrantes,
              r.creado_en,
              (SELECT a.id FROM accesos_admin a
                WHERE a.rancho_id = r.id AND a.admin_id = $1
                  AND a.salido_en IS NULL AND a.eliminado_en IS NULL
                  AND a.entrado_en > CURRENT_TIMESTAMP - make_interval(hours => $2)
                ORDER BY a.entrado_en DESC LIMIT 1) AS acceso_abierto
         FROM ranchos r
         JOIN usuarios dueno ON dueno.id = r.propietario_id
         LEFT JOIN paises p ON p.codigo = r.pais_codigo
        WHERE r.eliminado_en IS NULL
        ORDER BY r.nombre`,
      [adminId, HORAS_DE_SOPORTE],
    );
    return resultado.rows;
  }

  async rancho(id: string): Promise<{ id: string; nombre: string } | null> {
    const resultado = await this.bd.query(
      'SELECT id, nombre FROM ranchos WHERE id = $1 AND eliminado_en IS NULL',
      [id],
    );
    return resultado.rows[0] ?? null;
  }

  /**
   * Abre un acceso. Si el Admin ya tenia uno abierto en ese rancho, se cierra
   * primero: cada entrada es una fila con su propio motivo.
   */
  async entrar(datos: { id: string; adminId: string; ranchoId: string; motivo: string }) {
    await this.bd.query(
      `UPDATE accesos_admin
          SET salido_en = CURRENT_TIMESTAMP, modificado_por = $1
        WHERE admin_id = $1 AND rancho_id = $2 AND salido_en IS NULL`,
      [datos.adminId, datos.ranchoId],
    );
    await this.bd.query(
      `INSERT INTO accesos_admin (id, admin_id, rancho_id, motivo, creado_por, modificado_por)
       VALUES ($1, $2, $3, $4, $2, $2)`,
      [datos.id, datos.adminId, datos.ranchoId, datos.motivo],
    );
    return (await this.acceso(datos.id))!;
  }

  /** Cierra un acceso del propio Admin. Devuelve falso si no habia nada que cerrar. */
  async salir(accesoId: string, adminId: string): Promise<boolean> {
    const resultado = await this.bd.query(
      `UPDATE accesos_admin
          SET salido_en = CURRENT_TIMESTAMP, modificado_por = $2
        WHERE id = $1 AND admin_id = $2 AND salido_en IS NULL`,
      [accesoId, adminId],
    );
    return (resultado.rowCount ?? 0) > 0;
  }

  async acceso(id: string): Promise<AccesoAdmin | null> {
    const resultado = await this.bd.query(`${SELECCION_ACCESO} AND a.id = $1`, [id]);
    return resultado.rows[0] ?? null;
  }

  /** El registro completo, lo mas nuevo primero. Opcionalmente, de un rancho. */
  async accesos(ranchoId: string | null, limite = 200): Promise<AccesoAdmin[]> {
    const resultado = await this.bd.query(
      `${SELECCION_ACCESO}
         AND ($1::uuid IS NULL OR a.rancho_id = $1::uuid)
       ORDER BY a.entrado_en DESC
       LIMIT $2`,
      [ranchoId, limite],
    );
    return resultado.rows;
  }
}
