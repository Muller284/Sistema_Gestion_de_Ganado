import { Inject, Injectable } from '@nestjs/common';
import { Pool, type PoolClient } from 'pg';
import { POOL_BD } from '../../comun/modulo-base-datos';

/**
 * HU-53 · Pesajes de animales, individuales y masivos.
 *
 * Como todos los repositorios, cada método recibe el rancho de quien pregunta
 * y lo pone en el WHERE (HU-03). Además, la migración 010 no deja que un
 * pesaje apunte a un animal de otro rancho: (animal_id, rancho_id) ->
 * animales(id, rancho_id).
 *
 * El peso va siempre en kilos (HU-26): la pantalla convierte antes de mandar.
 *
 * El último pesaje es el peso actual de la ficha (criterio 3): después de
 * guardar, animales.peso_kg toma el peso del pesaje con la fecha más nueva.
 * Si se carga un pesaje viejo (por ejemplo, de una planilla atrasada), el
 * peso actual no cambia.
 */

export interface Pesaje {
  id: string;
  animal_id: string;
  /** AAAA-MM-DD. */
  fecha: string;
  peso_kg: number;
  observacion: string | null;
  /** Los pesajes de una misma carga masiva comparten lote. */
  lote_id: string | null;
  creado_en: string;
  /** Criterio 4: quién lo registró. */
  registrado_por: string | null;
}

/** Lo que hace falta saber de un animal para pesarlo. */
export interface AnimalPesable {
  id: string;
  identificador: string;
  nombre: string | null;
  categoria_codigo: string | null;
  corral_nombre: string | null;
  estado: string;
  fecha_nacimiento: string | null;
  peso_kg: number | null;
  eliminado: boolean;
}

export interface DatosPesaje {
  animal_id: string;
  peso_kg: number;
}

const COLUMNAS_PESAJE = `
  p.id, p.animal_id, to_char(p.fecha, 'YYYY-MM-DD') AS fecha, p.peso_kg::float AS peso_kg,
  p.observacion, p.lote_id, p.creado_en, u.nombre AS registrado_por`;

const COLUMNAS_ANIMAL = `
  a.id, a.identificador, a.nombre, a.categoria_codigo, c.nombre AS corral_nombre, a.estado,
  to_char(a.fecha_nacimiento, 'YYYY-MM-DD') AS fecha_nacimiento, a.peso_kg::float AS peso_kg,
  (a.eliminado_en IS NOT NULL) AS eliminado`;

@Injectable()
export class RepositorioPesajes {
  constructor(@Inject(POOL_BD) private readonly bd: Pool) {}

  /** Hoy en la zona horaria del país del rancho: la fecha no puede ser futura (criterio 1). */
  async hoy(ranchoId: string): Promise<string> {
    const resultado = await this.bd.query(
      `SELECT to_char((CURRENT_TIMESTAMP AT TIME ZONE COALESCE(pa.zona_horaria, 'UTC'))::date, 'YYYY-MM-DD') AS hoy
         FROM ranchos r LEFT JOIN paises pa ON pa.codigo = r.pais_codigo
        WHERE r.id = $1`,
      [ranchoId],
    );
    return resultado.rows[0]?.hoy ?? new Date().toISOString().slice(0, 10);
  }

  /** Un animal del rancho, vigente o dado de baja (para poder decir por qué no se pesa). */
  async animal(id: string, ranchoId: string): Promise<AnimalPesable | null> {
    const resultado = await this.bd.query(
      `SELECT ${COLUMNAS_ANIMAL}
         FROM animales a LEFT JOIN corrales c ON c.id = a.corral_id
        WHERE a.id::text = $1 AND a.rancho_id = $2`,
      [id, ranchoId],
    );
    return resultado.rows[0] ?? null;
  }

  /**
   * Masivo: de los ids elegidos, los que se pueden pesar (vigentes y activos
   * del rancho), en el orden del identificador. Los de otro rancho, los dados
   * de baja y los que no están activos no vienen.
   */
  async pesables(ids: string[], ranchoId: string): Promise<AnimalPesable[]> {
    const resultado = await this.bd.query(
      `SELECT ${COLUMNAS_ANIMAL}
         FROM animales a LEFT JOIN corrales c ON c.id = a.corral_id
        WHERE a.rancho_id = $1 AND a.id::text = ANY($2::text[])
          AND a.eliminado_en IS NULL AND a.estado = 'activo'
        ORDER BY a.identificador`,
      [ranchoId, ids],
    );
    return resultado.rows;
  }

  /** Los pesajes vigentes de un animal, del más nuevo al más viejo. */
  async delAnimal(animalId: string, ranchoId: string): Promise<Pesaje[]> {
    const resultado = await this.bd.query(
      `SELECT ${COLUMNAS_PESAJE}
         FROM pesajes p LEFT JOIN usuarios u ON u.id = p.creado_por
        WHERE p.animal_id::text = $1 AND p.rancho_id = $2 AND p.eliminado_en IS NULL
        ORDER BY p.fecha DESC, p.creado_en DESC`,
      [animalId, ranchoId],
    );
    return resultado.rows;
  }

  async pesaje(id: string, ranchoId: string): Promise<Pesaje | null> {
    const resultado = await this.bd.query(
      `SELECT ${COLUMNAS_PESAJE}
         FROM pesajes p LEFT JOIN usuarios u ON u.id = p.creado_por
        WHERE p.id = $1 AND p.rancho_id = $2`,
      [id, ranchoId],
    );
    return resultado.rows[0] ?? null;
  }

  /** Cuáles de estos animales ya tienen un pesaje vigente ese día (un pesaje por animal y por día). */
  async yaPesados(animalIds: string[], fecha: string, ranchoId: string): Promise<string[]> {
    const resultado = await this.bd.query(
      `SELECT a.identificador
         FROM pesajes p JOIN animales a ON a.id = p.animal_id
        WHERE p.rancho_id = $1 AND p.animal_id::text = ANY($2::text[])
          AND p.fecha = $3::date AND p.eliminado_en IS NULL
        ORDER BY a.identificador`,
      [ranchoId, animalIds, fecha],
    );
    return resultado.rows.map((fila) => fila.identificador);
  }

  /**
   * Guarda todos los pesajes en una sola transacción: o se registran todos o
   * ninguno. Después pone en cada ficha el peso de su pesaje más nuevo.
   * Devuelve los ids nuevos en el mismo orden que llegaron.
   */
  async registrar(datos: {
    ranchoId: string;
    fecha: string;
    pesajes: DatosPesaje[];
    observacion: string | null;
    loteId: string | null;
    autorId: string;
  }): Promise<string[]> {
    const cliente = await this.bd.connect();
    try {
      await cliente.query('BEGIN');
      const animalIds = datos.pesajes.map((p) => p.animal_id);

      // Bloquea las fichas para que dos cargas a la vez no se pisen el peso actual.
      const bloqueados = await cliente.query(
        `SELECT id FROM animales
          WHERE rancho_id = $1 AND id::text = ANY($2::text[])
            AND eliminado_en IS NULL AND estado = 'activo'
          FOR UPDATE`,
        [datos.ranchoId, animalIds],
      );
      if ((bloqueados.rowCount ?? 0) !== new Set(animalIds).size) {
        throw new AnimalNoPesable();
      }

      const insertados = await cliente.query(
        `INSERT INTO pesajes
                (id, rancho_id, animal_id, fecha, peso_kg, observacion, lote_id, creado_por, modificado_por)
         SELECT gen_random_uuid(), $1, f.animal_id::uuid, $2::date, f.peso_kg, $3, $4::uuid, $5, $5
           FROM unnest($6::text[], $7::numeric[]) WITH ORDINALITY AS f(animal_id, peso_kg, orden)
          ORDER BY f.orden
         RETURNING id, animal_id`,
        [
          datos.ranchoId,
          datos.fecha,
          datos.observacion,
          datos.loteId,
          datos.autorId,
          animalIds,
          datos.pesajes.map((p) => p.peso_kg),
        ],
      );

      await this.actualizarPesoActual(cliente, animalIds, datos.ranchoId, datos.autorId);
      await cliente.query('COMMIT');

      const porAnimal = new Map<string, string>(
        insertados.rows.map((fila) => [String(fila.animal_id), String(fila.id)]),
      );
      return animalIds.map((id) => porAnimal.get(id) ?? '');
    } catch (error) {
      await cliente.query('ROLLBACK');
      throw error;
    } finally {
      cliente.release();
    }
  }

  /** Criterio 3: el peso de la ficha es el del pesaje vigente con la fecha más nueva. */
  private async actualizarPesoActual(
    cliente: PoolClient,
    animalIds: string[],
    ranchoId: string,
    autorId: string,
  ): Promise<void> {
    await cliente.query(
      `UPDATE animales a
          SET peso_kg = ultimo.peso_kg, modificado_por = $3
         FROM (
           SELECT DISTINCT ON (animal_id) animal_id, peso_kg
             FROM pesajes
            WHERE rancho_id = $1 AND animal_id::text = ANY($2::text[]) AND eliminado_en IS NULL
            ORDER BY animal_id, fecha DESC, creado_en DESC
         ) AS ultimo
        WHERE a.id = ultimo.animal_id AND a.rancho_id = $1
          AND a.peso_kg IS DISTINCT FROM ultimo.peso_kg`,
      [ranchoId, animalIds, autorId],
    );
  }
}

/** Entre la validación y la transacción, alguien dio de baja o vendió un animal elegido. */
export class AnimalNoPesable extends Error {}
