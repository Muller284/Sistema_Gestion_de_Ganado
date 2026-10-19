import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Pool, type PoolClient } from 'pg';
import { POOL_BD } from '../../comun/modulo-base-datos';

/**
 * HU-43 y HU-44 · Lo que la importación necesita leer para validar, y la carga
 * final en UNA sola transacción: o entran todas las filas válidas, o ninguna.
 *
 * Las columnas son las de la migración 008 (decisión 35). El corral de un
 * animal cambia solo con un movimiento, igual que en RepositorioAnimales.
 */

export interface AnimalAImportar {
  identificador: string;
  tipo_identificador: 'caravana' | 'interno' | 'rfid';
  nombre: string | null;
  raza: string | null;
  sexo: 'macho' | 'hembra';
  categoria_codigo: string | null;
  fecha_nacimiento: string | null;
  origen: 'nacido' | 'comprado' | 'otro' | null;
  corral_id: string | null;
  peso_kg: number | null;
}

export interface ContextoRancho {
  /** Identificador → id y corral actual de cada animal vigente del rancho. */
  existentes: Map<string, { id: string; corral_id: string | null }>;
  /** Nombre del corral en minúsculas → id. */
  corrales: Map<string, string>;
  /** Id → nombre del corral tal como está escrito. */
  nombresDeCorrales: Map<string, string>;
  categorias: string[];
  /** Del país del rancho (HU-26): para leer fechas escritas a mano. */
  formatoFecha: string;
  unidadPeso: 'kg' | 'lb';
}

@Injectable()
export class RepositorioImportacion {
  constructor(@Inject(POOL_BD) private readonly bd: Pool) {}

  async contexto(ranchoId: string): Promise<ContextoRancho> {
    const [animales, corrales, categorias, pais] = await Promise.all([
      this.bd.query(
        `SELECT id, identificador, corral_id FROM animales
          WHERE rancho_id = $1 AND eliminado_en IS NULL`,
        [ranchoId],
      ),
      this.bd.query(
        `SELECT id, nombre FROM corrales WHERE rancho_id = $1 AND eliminado_en IS NULL`,
        [ranchoId],
      ),
      this.bd.query(
        `SELECT codigo FROM categorias_animal WHERE eliminado_en IS NULL ORDER BY orden`,
      ),
      this.bd.query(
        `SELECT p.formato_fecha, p.unidad_peso
           FROM ranchos r JOIN paises p ON p.codigo = r.pais_codigo
          WHERE r.id = $1`,
        [ranchoId],
      ),
    ]);
    return {
      existentes: new Map(
        animales.rows.map((fila) => [fila.identificador, { id: fila.id, corral_id: fila.corral_id }]),
      ),
      corrales: new Map(corrales.rows.map((fila) => [String(fila.nombre).toLowerCase(), fila.id])),
      nombresDeCorrales: new Map(corrales.rows.map((fila) => [fila.id, fila.nombre])),
      categorias: categorias.rows.map((fila) => fila.codigo),
      formatoFecha: pais.rows[0]?.formato_fecha ?? 'DD/MM/YYYY',
      unidadPeso: pais.rows[0]?.unidad_peso === 'lb' ? 'lb' : 'kg',
    };
  }

  /**
   * Carga las nuevas y, si se eligió actualizar, pisa la ficha de las que ya
   * existen. Devuelve cuántas de cada una.
   */
  async cargar(
    ranchoId: string,
    nuevas: AnimalAImportar[],
    aActualizar: { id: string; corralActual: string | null; datos: AnimalAImportar }[],
    autorId: string,
  ): Promise<{ insertados: number; actualizados: number }> {
    const cliente = await this.bd.connect();
    try {
      await cliente.query('BEGIN');
      for (const animal of nuevas) {
        const id = randomUUID();
        await cliente.query(
          `INSERT INTO animales
                  (id, rancho_id, identificador, tipo_identificador, nombre, raza, sexo,
                   categoria_codigo, fecha_nacimiento, origen, peso_kg, creado_por, modificado_por)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12)`,
          [
            id, ranchoId, animal.identificador, animal.tipo_identificador, animal.nombre,
            animal.raza, animal.sexo, animal.categoria_codigo, animal.fecha_nacimiento,
            animal.origen, animal.peso_kg, autorId,
          ],
        );
        if (animal.corral_id) {
          await this.mover(cliente, ranchoId, id, null, animal.corral_id, autorId);
        }
      }
      for (const { id, corralActual, datos } of aActualizar) {
        await cliente.query(
          `UPDATE animales
              SET tipo_identificador = $3, nombre = COALESCE($4, nombre), raza = COALESCE($5, raza),
                  sexo = $6, categoria_codigo = COALESCE($7, categoria_codigo),
                  fecha_nacimiento = COALESCE($8, fecha_nacimiento), origen = COALESCE($9, origen),
                  peso_kg = COALESCE($10, peso_kg), modificado_por = $11
            WHERE id = $1 AND rancho_id = $2 AND eliminado_en IS NULL`,
          [
            id, ranchoId, datos.tipo_identificador, datos.nombre, datos.raza, datos.sexo,
            datos.categoria_codigo, datos.fecha_nacimiento, datos.origen, datos.peso_kg, autorId,
          ],
        );
        // Un corral vacío en el archivo no saca al animal de su corral.
        if (datos.corral_id && datos.corral_id !== corralActual) {
          await this.mover(cliente, ranchoId, id, corralActual, datos.corral_id, autorId);
        }
      }
      await cliente.query('COMMIT');
      return { insertados: nuevas.length, actualizados: aActualizar.length };
    } catch (error) {
      await cliente.query('ROLLBACK');
      throw error;
    } finally {
      cliente.release();
    }
  }

  /** HU-39: el corral cambia junto con su movimiento. */
  private async mover(
    cliente: PoolClient,
    ranchoId: string,
    animalId: string,
    origenId: string | null,
    destinoId: string,
    autorId: string,
  ) {
    await cliente.query(
      `INSERT INTO movimientos_corral
              (id, rancho_id, animal_id, corral_origen_id, corral_destino_id, creado_por, modificado_por)
       VALUES ($1, $2, $3, $4, $5, $6, $6)`,
      [randomUUID(), ranchoId, animalId, origenId, destinoId, autorId],
    );
    await cliente.query(
      `UPDATE animales SET corral_id = $3, modificado_por = $4 WHERE id = $1 AND rancho_id = $2`,
      [animalId, ranchoId, destinoId, autorId],
    );
  }
}
