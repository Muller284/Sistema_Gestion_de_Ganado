import { Inject, Injectable } from '@nestjs/common';
import { Pool, type PoolClient } from 'pg';
import { POOL_BD } from '../../comun/modulo-base-datos';
import { claveDeRaza, nombreDeRaza } from '../../comun/razas';

/**
 * HU-28 · Las razas: el catálogo mundial (rancho_id nulo) y las propias de
 * cada rancho (migración 009). Cada método recibe el rancho de quien pregunta
 * y solo ve las de ese rancho más las del catálogo (HU-03).
 */

export interface Raza {
  nombre: string;
  /** carne, leche o doble en el catálogo; nulo en las propias del rancho. */
  grupo: 'carne' | 'leche' | 'doble' | null;
}

@Injectable()
export class RepositorioRazas {
  constructor(@Inject(POOL_BD) private readonly bd: Pool) {}

  /** Primero el catálogo, en su orden; después las del rancho, por nombre. */
  async listar(ranchoId: string): Promise<Raza[]> {
    const resultado = await this.bd.query(
      `SELECT nombre, grupo FROM razas
        WHERE eliminado_en IS NULL AND (rancho_id IS NULL OR rancho_id = $1)
        ORDER BY rancho_id NULLS FIRST, orden, LOWER(nombre)`,
      [ranchoId],
    );
    return resultado.rows;
  }

  /** Clave → nombre de todas las razas que ve el rancho (para la importación). */
  async porClave(ranchoId: string, cliente?: PoolClient): Promise<Map<string, string>> {
    const resultado = await (cliente ?? this.bd).query(
      `SELECT clave, nombre FROM razas
        WHERE eliminado_en IS NULL AND (rancho_id IS NULL OR rancho_id = $1)`,
      [ranchoId],
    );
    return new Map(resultado.rows.map((fila) => [fila.clave, fila.nombre]));
  }

  /**
   * El nombre con el que se guarda la raza en el animal. Si ya existe (en el
   * catálogo o en el rancho), el de la tabla, aunque se haya escrito distinto.
   * Si es nueva, queda como raza propia del rancho.
   */
  async resolver(nombre: string, ranchoId: string, autorId: string, cliente?: PoolClient): Promise<string> {
    const bd = cliente ?? this.bd;
    const clave = claveDeRaza(nombre);
    const buscar = () =>
      bd.query(
        `SELECT nombre FROM razas
          WHERE eliminado_en IS NULL AND clave = $1 AND (rancho_id IS NULL OR rancho_id = $2)
          ORDER BY rancho_id NULLS FIRST
          LIMIT 1`,
        [clave, ranchoId],
      );
    const existente = await buscar();
    if (existente.rowCount) return existente.rows[0].nombre;

    // Si otro la agregó en este mismo momento, el índice único la frena y se usa esa.
    await bd.query(
      `INSERT INTO razas (rancho_id, nombre, clave, creado_por, modificado_por)
       VALUES ($1, $2, $3, $4, $4)
       ON CONFLICT DO NOTHING`,
      [ranchoId, nombreDeRaza(nombre), clave, autorId],
    );
    return (await buscar()).rows[0].nombre;
  }
}
