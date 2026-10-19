import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Pool } from 'pg';
import { POOL_BD } from '../../comun/modulo-base-datos';

/**
 * HU-36 · Las consultas de corrales. Como todos los repositorios, cada metodo
 * recibe el rancho de quien pregunta y lo pone en el WHERE (HU-03).
 */

export interface Corral {
  id: string;
  nombre: string;
  capacidad: number | null;
  superficie_ha: string | null;
  /** Animales activos que estan hoy en el corral (criterio 3). */
  ocupacion: number;
  eliminado_en: string | null;
}

const COLUMNAS = `
  c.id, c.nombre, c.capacidad, c.superficie_ha, c.eliminado_en,
  (SELECT COUNT(*)::int FROM animales a
    WHERE a.corral_id = c.id AND a.estado = 'activo' AND a.eliminado_en IS NULL) AS ocupacion`;

@Injectable()
export class RepositorioCorrales {
  constructor(@Inject(POOL_BD) private readonly bd: Pool) {}

  /** Los vigentes; con bajas, tambien los dados de baja (HU-34). */
  async listar(ranchoId: string, conBajas: boolean): Promise<Corral[]> {
    const resultado = await this.bd.query(
      `SELECT ${COLUMNAS} FROM corrales c
        WHERE c.rancho_id = $1 AND ($2 OR c.eliminado_en IS NULL)
        ORDER BY c.eliminado_en NULLS FIRST, LOWER(c.nombre)`,
      [ranchoId, conBajas],
    );
    return resultado.rows;
  }

  async uno(id: string, ranchoId: string): Promise<Corral | null> {
    const resultado = await this.bd.query(
      `SELECT ${COLUMNAS} FROM corrales c WHERE c.id::text = $1 AND c.rancho_id = $2`,
      [id, ranchoId],
    );
    return resultado.rows[0] ?? null;
  }

  async nombreOcupado(nombre: string, ranchoId: string, salvoId: string | null): Promise<boolean> {
    const resultado = await this.bd.query(
      `SELECT 1 FROM corrales
        WHERE rancho_id = $1 AND LOWER(nombre) = LOWER($2) AND eliminado_en IS NULL
          AND ($3::uuid IS NULL OR id <> $3::uuid)`,
      [ranchoId, nombre, salvoId],
    );
    return (resultado.rowCount ?? 0) > 0;
  }

  async crear(datos: {
    id: string;
    ranchoId: string;
    nombre: string;
    capacidad: number | null;
    superficieHa: number | null;
    autorId: string;
  }): Promise<void> {
    await this.bd.query(
      `INSERT INTO corrales (id, rancho_id, nombre, capacidad, superficie_ha, creado_por, modificado_por)
       VALUES ($1, $2, $3, $4, $5, $6, $6)`,
      [datos.id, datos.ranchoId, datos.nombre, datos.capacidad, datos.superficieHa, datos.autorId],
    );
  }

  async actualizar(
    id: string,
    ranchoId: string,
    datos: { nombre: string; capacidad: number | null; superficieHa: number | null },
    autorId: string,
  ): Promise<void> {
    await this.bd.query(
      `UPDATE corrales SET nombre = $3, capacidad = $4, superficie_ha = $5, modificado_por = $6
        WHERE id = $1 AND rancho_id = $2 AND eliminado_en IS NULL`,
      [id, ranchoId, datos.nombre, datos.capacidad, datos.superficieHa, autorId],
    );
  }

  /**
   * HU-37. Mete en el corral a los animales vigentes del rancho que se pidan.
   * Cada uno que cambia de corral deja su movimiento (HU-39), todo en una sola
   * transaccion. Los que ya estaban, o no son de este rancho, no se tocan.
   */
  async asignar(
    corralId: string,
    animalIds: string[],
    ranchoId: string,
    autorId: string,
  ): Promise<{ movidos: number; yaEstaban: number; noEncontrados: number }> {
    const cliente = await this.bd.connect();
    try {
      await cliente.query('BEGIN');
      const animales = await cliente.query(
        `SELECT id, corral_id FROM animales
          WHERE rancho_id = $1 AND id::text = ANY($2::text[]) AND eliminado_en IS NULL
          FOR UPDATE`,
        [ranchoId, animalIds],
      );
      let movidos = 0;
      let yaEstaban = 0;
      for (const animal of animales.rows) {
        if (animal.corral_id === corralId) {
          yaEstaban++;
          continue;
        }
        await cliente.query(
          `INSERT INTO movimientos_corral
                  (id, rancho_id, animal_id, corral_origen_id, corral_destino_id, creado_por, modificado_por)
           VALUES ($1, $2, $3, $4, $5, $6, $6)`,
          [randomUUID(), ranchoId, animal.id, animal.corral_id, corralId, autorId],
        );
        await cliente.query(
          `UPDATE animales SET corral_id = $3, modificado_por = $4 WHERE id = $1 AND rancho_id = $2`,
          [animal.id, ranchoId, corralId, autorId],
        );
        movidos++;
      }
      await cliente.query('COMMIT');
      return { movidos, yaEstaban, noEncontrados: animalIds.length - animales.rowCount! };
    } catch (error) {
      await cliente.query('ROLLBACK');
      throw error;
    } finally {
      cliente.release();
    }
  }

  /** HU-34: la baja marca, no borra; restaurar la desmarca. */
  async marcarBaja(id: string, ranchoId: string, baja: boolean, autorId: string): Promise<void> {
    await this.bd.query(
      `UPDATE corrales
          SET eliminado_en = CASE WHEN $3 THEN CURRENT_TIMESTAMP ELSE NULL END,
              modificado_por = $4
        WHERE id = $1 AND rancho_id = $2`,
      [id, ranchoId, baja, autorId],
    );
  }
}
