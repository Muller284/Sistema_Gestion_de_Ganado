import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Pool } from 'pg';
import { POOL_BD } from '../../comun/modulo-base-datos';

/**
 * HU-16 · Las consultas de la guia de configuracion.
 *
 * Como el resto, todo metodo recibe el rancho y lo pone en el WHERE.
 */

export interface FilaPaso {
  paso: string;
  visitado_en: string | null;
  completado_en: string | null;
}

@Injectable()
export class RepositorioGuia {
  constructor(@Inject(POOL_BD) private readonly bd: Pool) {}

  async pasos(ranchoId: string): Promise<FilaPaso[]> {
    const resultado = await this.bd.query(
      `SELECT paso, visitado_en, completado_en
         FROM pasos_guia
        WHERE rancho_id = $1 AND eliminado_en IS NULL`,
      [ranchoId],
    );
    return resultado.rows;
  }

  async pausadaEn(ranchoId: string): Promise<string | null> {
    const resultado = await this.bd.query(
      `SELECT guia_pausada_en FROM ranchos WHERE id = $1 AND eliminado_en IS NULL`,
      [ranchoId],
    );
    return resultado.rows[0]?.guia_pausada_en ?? null;
  }

  async pausar(ranchoId: string, pausada: boolean, autorId: string): Promise<void> {
    await this.bd.query(
      `UPDATE ranchos
          SET guia_pausada_en = CASE WHEN $2 THEN CURRENT_TIMESTAMP ELSE NULL END,
              modificado_por = $3
        WHERE id = $1 AND eliminado_en IS NULL`,
      [ranchoId, pausada, autorId],
    );
  }

  /** Anota que el propietario abrio el paso. Solo la primera vez. */
  async marcarVisitado(ranchoId: string, paso: string, autorId: string): Promise<void> {
    await this.bd.query(
      `INSERT INTO pasos_guia (id, rancho_id, paso, visitado_en, creado_por, modificado_por)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, $4)
       ON CONFLICT (rancho_id, paso)
       DO UPDATE SET visitado_en = COALESCE(pasos_guia.visitado_en, CURRENT_TIMESTAMP),
                     modificado_por = $4`,
      [randomUUID(), ranchoId, paso, autorId],
    );
  }

  /** completado en verdadero lo da por terminado; en falso lo vuelve a abrir. */
  async marcarCompletado(
    ranchoId: string,
    paso: string,
    completado: boolean,
    autorId: string,
  ): Promise<void> {
    await this.bd.query(
      `INSERT INTO pasos_guia
         (id, rancho_id, paso, visitado_en, completado_en, creado_por, modificado_por)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP,
               CASE WHEN $4 THEN CURRENT_TIMESTAMP ELSE NULL END, $5, $5)
       ON CONFLICT (rancho_id, paso)
       DO UPDATE SET completado_en = CASE WHEN $4 THEN CURRENT_TIMESTAMP ELSE NULL END,
                     visitado_en = COALESCE(pasos_guia.visitado_en, CURRENT_TIMESTAMP),
                     modificado_por = $5`,
      [randomUUID(), ranchoId, paso, completado, autorId],
    );
  }

  /** Cuantos integrantes tiene el rancho ademas del propietario. */
  async integrantes(ranchoId: string): Promise<number> {
    const resultado = await this.bd.query(
      `SELECT COUNT(*)::int AS cantidad FROM usuarios
        WHERE rancho_id = $1 AND rol <> 'propietario' AND eliminado_en IS NULL`,
      [ranchoId],
    );
    return resultado.rows[0].cantidad;
  }

  /**
   * Cuantas filas del rancho hay en una tabla de otro modulo (animales,
   * corrales...). Si la tabla todavia no existe, cero: asi la guia no se
   * rompe mientras esos modulos se construyen.
   *
   * El nombre de la tabla sale del catalogo del servicio, nunca del cliente.
   */
  async filasDelRancho(tabla: string, ranchoId: string): Promise<number> {
    const existe = await this.bd.query(`SELECT to_regclass($1) AS tabla`, [`public.${tabla}`]);
    if (!existe.rows[0].tabla) return 0;

    const resultado = await this.bd.query(
      `SELECT COUNT(*)::int AS cantidad FROM ${tabla}
        WHERE rancho_id = $1 AND eliminado_en IS NULL`,
      [ranchoId],
    );
    return resultado.rows[0].cantidad;
  }
}
