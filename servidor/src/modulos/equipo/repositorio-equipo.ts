import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { POOL_BD } from '../../comun/modulo-base-datos';

/**
 * HU-17 · Las consultas del equipo de un rancho.
 *
 * El equipo son las filas de usuarios con el rancho_id del propietario. Como
 * en repositorio-rancho.ts, esta clase no hereda de RepositorioBase, pero la
 * regla es la misma: TODO metodo recibe el rancho de quien pregunta y lo pone
 * en el WHERE. No hay forma de leer ni tocar a alguien de otro rancho.
 *
 * Ninguna consulta devuelve contrasena_hash.
 */

export interface MiembroEquipo {
  id: string;
  nombre: string;
  correo: string;
  rol: 'propietario' | 'socio' | 'colaborador';
  estado: 'activo' | 'suspendido';
  tipo_colaborador_id: string | null;
  tipo_colaborador: string | null;
  debe_cambiar_contrasena: boolean;
  creado_en: string;
  creado_por_nombre: string | null;
}

export interface TipoColaborador {
  id: string;
  nombre: string;
  es_predefinido: boolean;
}

const SELECCION_MIEMBRO = `
  SELECT u.id, u.nombre, u.correo, u.rol, u.estado,
         u.tipo_colaborador_id, t.nombre AS tipo_colaborador,
         u.debe_cambiar_contrasena, u.creado_en,
         autor.nombre AS creado_por_nombre
    FROM usuarios u
    LEFT JOIN tipos_colaborador t ON t.id = u.tipo_colaborador_id
    LEFT JOIN usuarios autor ON autor.id = u.creado_por`;

@Injectable()
export class RepositorioEquipo {
  constructor(@Inject(POOL_BD) private readonly bd: Pool) {}

  /** El propietario primero, despues los socios y despues los colaboradores. */
  async listar(ranchoId: string): Promise<MiembroEquipo[]> {
    const resultado = await this.bd.query(
      `${SELECCION_MIEMBRO}
        WHERE u.rancho_id = $1 AND u.eliminado_en IS NULL
        ORDER BY CASE u.rol WHEN 'propietario' THEN 0 WHEN 'socio' THEN 1 ELSE 2 END,
                 u.nombre`,
      [ranchoId],
    );
    return resultado.rows;
  }

  async miembro(id: string, ranchoId: string): Promise<MiembroEquipo | null> {
    const resultado = await this.bd.query(
      `${SELECCION_MIEMBRO}
        WHERE u.id = $1 AND u.rancho_id = $2 AND u.eliminado_en IS NULL`,
      [id, ranchoId],
    );
    return resultado.rows[0] ?? null;
  }

  /** Los cuatro predefinidos, que son de todos, mas los propios del rancho. */
  async tipos(ranchoId: string): Promise<TipoColaborador[]> {
    const resultado = await this.bd.query(
      `SELECT id, nombre, es_predefinido
         FROM tipos_colaborador
        WHERE eliminado_en IS NULL
          AND (rancho_id IS NULL OR rancho_id = $1)
        ORDER BY es_predefinido DESC, nombre`,
      [ranchoId],
    );
    return resultado.rows;
  }

  async tipoDisponible(tipoId: string, ranchoId: string): Promise<boolean> {
    const resultado = await this.bd.query(
      `SELECT 1 FROM tipos_colaborador
        WHERE id = $1 AND eliminado_en IS NULL
          AND (rancho_id IS NULL OR rancho_id = $2)`,
      [tipoId, ranchoId],
    );
    return (resultado.rowCount ?? 0) > 0;
  }

  /** En qué rancho está un correo, si está en alguno. Para decir el motivo del rechazo. */
  async ranchoDelCorreo(correo: string): Promise<{ existe: boolean; ranchoId: string | null }> {
    const resultado = await this.bd.query(
      `SELECT rancho_id FROM usuarios
        WHERE LOWER(correo) = LOWER($1) AND eliminado_en IS NULL`,
      [correo],
    );
    const fila = resultado.rows[0];
    return { existe: Boolean(fila), ranchoId: fila?.rancho_id ?? null };
  }

  /**
   * Crea al integrante con la contraseña temporal ya cifrada.
   *
   * correo_verificado va en verdadero a proposito: la clave temporal viaja
   * SOLO en el correo, asi que nadie puede entrar sin haberlo leido. Entrar
   * ya prueba que el correo es suyo, que es lo que pide HU-07.
   * debe_cambiar_contrasena va en verdadero: HU-10 lo obliga a cambiarla.
   */
  async crear(datos: {
    id: string;
    nombre: string;
    correo: string;
    rol: 'socio' | 'colaborador';
    tipoColaboradorId: string | null;
    contrasenaHash: string;
    ranchoId: string;
    autorId: string;
  }): Promise<MiembroEquipo> {
    await this.bd.query(
      `INSERT INTO usuarios
         (id, nombre, correo, contrasena_hash, correo_verificado,
          debe_cambiar_contrasena, estado, rancho_id, rol, tipo_colaborador_id,
          creado_por, modificado_por)
       VALUES ($1, $2, $3, $4, TRUE, TRUE, 'activo', $5, $6, $7, $8, $8)`,
      [
        datos.id,
        datos.nombre,
        datos.correo,
        datos.contrasenaHash,
        datos.ranchoId,
        datos.rol,
        datos.tipoColaboradorId,
        datos.autorId,
      ],
    );
    return (await this.miembro(datos.id, datos.ranchoId))!;
  }

  async cambiarEstado(
    id: string,
    ranchoId: string,
    estado: 'activo' | 'suspendido',
    autorId: string,
  ): Promise<MiembroEquipo | null> {
    const resultado = await this.bd.query(
      `UPDATE usuarios
          SET estado = $3, modificado_por = $4
        WHERE id = $1 AND rancho_id = $2 AND eliminado_en IS NULL`,
      [id, ranchoId, estado, autorId],
    );
    if ((resultado.rowCount ?? 0) === 0) return null;
    return this.miembro(id, ranchoId);
  }
}
