import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Pool, type PoolClient } from 'pg';
import { POOL_BD } from '../../comun/modulo-base-datos';

/**
 * HU-20 · Las consultas de los tipos de colaborador.
 *
 * Como el resto de los repositorios, TODO metodo recibe el rancho de quien
 * pregunta y lo pone en el WHERE. Los predefinidos son de todos (rancho_id
 * nulo); los propios y los ajustes son de un rancho y nadie mas los ve.
 *
 * Lo que puede un tipo dentro de un rancho no se calcula aca: lo resuelve la
 * vista permisos_tipo_vigentes de la migracion 005. Asi la regla
 * "ajuste del rancho, y si no hay, lo de por defecto" vive en un solo lugar.
 */

export type Nivel = 'ninguno' | 'ver' | 'editar';

export interface PermisoDeModulo {
  modulo: string;
  nombre: string;
  nivel: Nivel;
}

export interface TipoConPermisos {
  id: string;
  nombre: string;
  es_predefinido: boolean;
  /** Un predefinido cuyos permisos el propietario cambio en su rancho. */
  ajustado: boolean;
  /** Colaboradores vigentes del rancho que tienen este tipo. */
  colaboradores: number;
  /** Los ocho modulos, en orden, con lo que el tipo puede en cada uno. */
  permisos: PermisoDeModulo[];
}

export interface Modulo {
  codigo: string;
  nombre: string;
}

@Injectable()
export class RepositorioTipos {
  constructor(@Inject(POOL_BD) private readonly bd: Pool) {}

  async modulos(): Promise<Modulo[]> {
    const resultado = await this.bd.query(
      `SELECT codigo, nombre FROM modulos
        WHERE eliminado_en IS NULL
        ORDER BY orden`,
    );
    return resultado.rows;
  }

  /** Los predefinidos primero y despues los propios, cada uno con sus permisos. */
  async listar(ranchoId: string): Promise<TipoConPermisos[]> {
    const resultado = await this.bd.query(
      `SELECT t.id, t.nombre, t.es_predefinido,
              EXISTS (
                SELECT 1 FROM permisos_tipo p
                 WHERE p.tipo_colaborador_id = t.id
                   AND p.rancho_id = $1
                   AND p.eliminado_en IS NULL
              ) AND t.es_predefinido AS ajustado,
              (SELECT COUNT(*)::int FROM usuarios u
                WHERE u.tipo_colaborador_id = t.id
                  AND u.rancho_id = $1
                  AND u.eliminado_en IS NULL) AS colaboradores,
              COALESCE(
                (SELECT json_agg(
                          json_build_object(
                            'modulo', m.codigo,
                            'nombre', m.nombre,
                            'nivel', CASE
                                       WHEN v.puede_editar THEN 'editar'
                                       WHEN v.puede_ver THEN 'ver'
                                       ELSE 'ninguno'
                                     END)
                          ORDER BY m.orden)
                   FROM modulos m
                   LEFT JOIN permisos_tipo_vigentes v
                          ON v.modulo_codigo = m.codigo
                         AND v.tipo_colaborador_id = t.id
                         AND v.rancho_id = $1
                  WHERE m.eliminado_en IS NULL),
                '[]'::json) AS permisos
         FROM tipos_colaborador t
        WHERE t.eliminado_en IS NULL
          AND (t.rancho_id IS NULL OR t.rancho_id = $1)
        ORDER BY t.es_predefinido DESC, t.nombre`,
      [ranchoId],
    );
    return resultado.rows;
  }

  async uno(id: string, ranchoId: string): Promise<TipoConPermisos | null> {
    const todos = await this.listar(ranchoId);
    return todos.find((tipo) => tipo.id === id) ?? null;
  }

  /** Otro tipo vigente con el mismo nombre, entre los predefinidos o los del rancho. */
  async nombreOcupado(nombre: string, ranchoId: string, salvoId: string | null): Promise<boolean> {
    const resultado = await this.bd.query(
      `SELECT 1 FROM tipos_colaborador
        WHERE eliminado_en IS NULL
          AND LOWER(nombre) = LOWER($1)
          AND (rancho_id IS NULL OR rancho_id = $2)
          AND ($3::uuid IS NULL OR id <> $3::uuid)`,
      [nombre, ranchoId, salvoId],
    );
    return (resultado.rowCount ?? 0) > 0;
  }

  async crear(datos: {
    id: string;
    nombre: string;
    ranchoId: string;
    permisos: Record<string, Nivel>;
    autorId: string;
  }): Promise<void> {
    await this.enTransaccion(async (cliente) => {
      await cliente.query(
        `INSERT INTO tipos_colaborador
           (id, rancho_id, nombre, es_predefinido, creado_por, modificado_por)
         VALUES ($1, $2, $3, FALSE, $4, $4)`,
        [datos.id, datos.ranchoId, datos.nombre, datos.autorId],
      );
      await this.escribirPermisos(cliente, datos.id, datos.ranchoId, datos.permisos, datos.autorId);
    });
  }

  /**
   * Cambia el nombre (solo de un tipo propio) y reemplaza los permisos del
   * tipo en este rancho. Las filas anteriores se dan de baja, no se borran.
   */
  async actualizar(datos: {
    id: string;
    ranchoId: string;
    nombre: string | null;
    permisos: Record<string, Nivel>;
    autorId: string;
  }): Promise<void> {
    await this.enTransaccion(async (cliente) => {
      if (datos.nombre !== null) {
        await cliente.query(
          `UPDATE tipos_colaborador
              SET nombre = $3, modificado_por = $4
            WHERE id = $1 AND rancho_id = $2 AND eliminado_en IS NULL`,
          [datos.id, datos.ranchoId, datos.nombre, datos.autorId],
        );
      }
      await this.darDeBajaPermisos(cliente, datos.id, datos.ranchoId, datos.autorId);
      await this.escribirPermisos(cliente, datos.id, datos.ranchoId, datos.permisos, datos.autorId);
    });
  }

  /** Un predefinido vuelve a los permisos de por defecto en este rancho. */
  async restablecer(id: string, ranchoId: string, autorId: string): Promise<void> {
    await this.enTransaccion((cliente) => this.darDeBajaPermisos(cliente, id, ranchoId, autorId));
  }

  /** Baja logica de un tipo propio y de sus permisos. */
  async eliminar(id: string, ranchoId: string, autorId: string): Promise<void> {
    await this.enTransaccion(async (cliente) => {
      await this.darDeBajaPermisos(cliente, id, ranchoId, autorId);
      await cliente.query(
        `UPDATE tipos_colaborador
            SET eliminado_en = CURRENT_TIMESTAMP, modificado_por = $3
          WHERE id = $1 AND rancho_id = $2 AND eliminado_en IS NULL`,
        [id, ranchoId, autorId],
      );
    });
  }

  /** Cambia el tipo de un colaborador de este rancho. */
  async asignar(usuarioId: string, tipoId: string, ranchoId: string, autorId: string): Promise<boolean> {
    const resultado = await this.bd.query(
      `UPDATE usuarios
          SET tipo_colaborador_id = $2, modificado_por = $4
        WHERE id = $1 AND rancho_id = $3 AND rol = 'colaborador' AND eliminado_en IS NULL`,
      [usuarioId, tipoId, ranchoId, autorId],
    );
    return (resultado.rowCount ?? 0) > 0;
  }

  async colaborador(
    usuarioId: string,
    ranchoId: string,
  ): Promise<{ nombre: string; rol: string; tipo_colaborador_id: string | null } | null> {
    const resultado = await this.bd.query(
      `SELECT nombre, rol, tipo_colaborador_id FROM usuarios
        WHERE id = $1 AND rancho_id = $2 AND eliminado_en IS NULL`,
      [usuarioId, ranchoId],
    );
    return resultado.rows[0] ?? null;
  }

  private async darDeBajaPermisos(
    cliente: PoolClient,
    tipoId: string,
    ranchoId: string,
    autorId: string,
  ): Promise<void> {
    await cliente.query(
      `UPDATE permisos_tipo
          SET eliminado_en = CURRENT_TIMESTAMP, modificado_por = $3
        WHERE tipo_colaborador_id = $1 AND rancho_id = $2 AND eliminado_en IS NULL`,
      [tipoId, ranchoId, autorId],
    );
  }

  /**
   * Una fila por modulo, aunque sea sin acceso: ver la migracion 005.
   * Los identificadores se generan aca y no en la base (HU-02).
   */
  private async escribirPermisos(
    cliente: PoolClient,
    tipoId: string,
    ranchoId: string,
    permisos: Record<string, Nivel>,
    autorId: string,
  ): Promise<void> {
    const modulos = await cliente.query(
      'SELECT codigo FROM modulos WHERE eliminado_en IS NULL ORDER BY orden',
    );
    for (const { codigo } of modulos.rows as { codigo: string }[]) {
      const nivel = permisos[codigo] ?? 'ninguno';
      await cliente.query(
        `INSERT INTO permisos_tipo
           (id, tipo_colaborador_id, modulo_codigo, rancho_id, puede_ver, puede_editar,
            creado_por, modificado_por)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $7)`,
        [randomUUID(), tipoId, codigo, ranchoId, nivel !== 'ninguno', nivel === 'editar', autorId],
      );
    }
  }

  private async enTransaccion<T>(trabajo: (cliente: PoolClient) => Promise<T>): Promise<T> {
    const cliente = await this.bd.connect();
    try {
      await cliente.query('BEGIN');
      const resultado = await trabajo(cliente);
      await cliente.query('COMMIT');
      return resultado;
    } catch (error) {
      await cliente.query('ROLLBACK');
      throw error;
    } finally {
      cliente.release();
    }
  }
}
