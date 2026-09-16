import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { POOL_BD } from '../../comun/modulo-base-datos';

/** Catalogo de paises. Lo necesita el formulario de creacion del rancho. */
@Injectable()
export class RepositorioPais {
  constructor(@Inject(POOL_BD) private readonly bd: Pool) {}

  async listar(): Promise<any[]> {
    const resultado = await this.bd.query(
      `SELECT codigo, nombre, idioma, moneda, unidad_peso, unidad_superficie,
              formato_fecha, zona_horaria
         FROM paises
        WHERE eliminado_en IS NULL
        ORDER BY nombre`,
    );
    return resultado.rows;
  }
}
