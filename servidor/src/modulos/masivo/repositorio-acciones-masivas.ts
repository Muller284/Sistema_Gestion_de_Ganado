import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { POOL_BD } from '../../comun/modulo-base-datos';

/**
 * HU-31 · Las acciones masivas sobre animales, en SQL de conjunto.
 *
 * Cada acción es una sola sentencia sobre todos los elegidos: o se aplica a
 * todos los que corresponde o a ninguno, y no hay una consulta por animal.
 * Solo se tocan animales del rancho de quien pide (HU-03) y vigentes (los
 * dados de baja no se modifican, HU-34). Los ids que no cumplen eso se
 * ignoran y se informan como no encontrados.
 */
@Injectable()
export class RepositorioAccionesMasivas {
  constructor(@Inject(POOL_BD) private readonly bd: Pool) {}

  /** Cuántos de los ids son animales vigentes del rancho. */
  async contarVigentes(ids: string[], ranchoId: string): Promise<number> {
    const resultado = await this.bd.query(
      `SELECT COUNT(*)::int AS n
         FROM animales
        WHERE rancho_id = $1 AND id::text = ANY($2::text[]) AND eliminado_en IS NULL`,
      [ranchoId, ids],
    );
    return resultado.rows[0].n;
  }

  /**
   * HU-33 en lote: cambia el estado y deja un registro por animal en
   * cambios_estado_animal, con el estado anterior de cada uno. Los que ya
   * están en ese estado no se tocan. Devuelve cuántos cambiaron.
   */
  async cambiarEstado(datos: {
    ids: string[];
    ranchoId: string;
    nuevo: string;
    fecha: string;
    motivo: string;
    autorId: string;
  }): Promise<number> {
    const resultado = await this.bd.query(
      `WITH elegidos AS (
         SELECT id, estado
           FROM animales
          WHERE rancho_id = $1 AND id::text = ANY($2::text[])
            AND eliminado_en IS NULL AND estado <> $3
          FOR UPDATE
       ), cambiados AS (
         UPDATE animales a
            SET estado = $3, modificado_por = $6
           FROM elegidos e
          WHERE a.id = e.id
         RETURNING a.id, e.estado AS anterior
       )
       INSERT INTO cambios_estado_animal
              (id, rancho_id, animal_id, estado_anterior, estado_nuevo, fecha, motivo,
               creado_por, modificado_por)
       SELECT gen_random_uuid(), $1, id, anterior, $3, $4::date, $5, $6, $6
         FROM cambiados`,
      [datos.ranchoId, datos.ids, datos.nuevo, datos.fecha, datos.motivo, datos.autorId],
    );
    return resultado.rowCount ?? 0;
  }

  /** HU-34 en lote: la baja marca, no borra. Devuelve cuántos se dieron de baja. */
  async darDeBaja(ids: string[], ranchoId: string, autorId: string): Promise<number> {
    const resultado = await this.bd.query(
      `UPDATE animales
          SET eliminado_en = CURRENT_TIMESTAMP, modificado_por = $3
        WHERE rancho_id = $1 AND id::text = ANY($2::text[]) AND eliminado_en IS NULL`,
      [ranchoId, ids, autorId],
    );
    return resultado.rowCount ?? 0;
  }
}
