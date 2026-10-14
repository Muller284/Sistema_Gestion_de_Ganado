import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Pool, type PoolClient } from 'pg';
import { POOL_BD } from '../../comun/modulo-base-datos';

/**
 * Las consultas de animales, sus movimientos (HU-39) y sus cambios de estado
 * (HU-33). Cada metodo recibe el rancho de quien pregunta (HU-03).
 */

export type Estado = 'activo' | 'vendido' | 'muerto' | 'archivado';

export interface DatosFicha {
  nombre: string | null;
  raza: string | null;
  sexo: 'macho' | 'hembra';
  categoria_codigo: string | null;
  fecha_nacimiento: string | null;
  origen: 'nacido' | 'comprado' | 'otro' | null;
  peso_kg: number | null;
}

export interface Animal extends DatosFicha {
  id: string;
  identificador: string;
  tipo_identificador: 'caravana' | 'interno' | 'rfid';
  corral_id: string | null;
  corral_nombre: string | null;
  estado: Estado;
  creado_en: string;
  eliminado_en: string | null;
  creado_por_nombre: string | null;
  modificado_por_nombre: string | null;
}

const COLUMNAS = `
  a.id, a.identificador, a.tipo_identificador, a.nombre, a.raza, a.sexo,
  a.categoria_codigo, TO_CHAR(a.fecha_nacimiento, 'YYYY-MM-DD') AS fecha_nacimiento,
  a.origen, a.peso_kg::float AS peso_kg, a.corral_id, c.nombre AS corral_nombre,
  a.estado, a.creado_en, a.eliminado_en,
  uc.nombre AS creado_por_nombre,
  um.nombre AS modificado_por_nombre`;

@Injectable()
export class RepositorioAnimales {
  constructor(@Inject(POOL_BD) private readonly bd: Pool) {}

  async categorias(): Promise<string[]> {
    const resultado = await this.bd.query(
      `SELECT codigo FROM categorias_animal WHERE eliminado_en IS NULL ORDER BY orden`,
    );
    return resultado.rows.map((fila) => fila.codigo);
  }

  async listar(
    ranchoId: string,
    estados: Estado[] | null,
    conBajas: boolean,
    busqueda?: string,
    categoria?: string,
    sexo?: string,
    corral?: string,
    fechaDesde?: string,
    fechaHasta?: string,
  ): Promise<Animal[]> {
    const terminoBusqueda = busqueda ? `%${busqueda.trim().toLowerCase()}%` : null;
    const resultado = await this.bd.query(
      `SELECT ${COLUMNAS}
         FROM animales a
         LEFT JOIN corrales c ON c.id = a.corral_id
         LEFT JOIN usuarios uc ON uc.id = a.creado_por
         LEFT JOIN usuarios um ON um.id = a.modificado_por
        WHERE a.rancho_id = $1
          AND ($2::varchar[] IS NULL OR a.estado = ANY($2::varchar[]))
          AND ($3 OR a.eliminado_en IS NULL)
          AND ($4::varchar IS NULL OR LOWER(a.identificador) LIKE $4 OR LOWER(a.nombre) LIKE $4)
          AND ($5::varchar IS NULL OR a.categoria_codigo = $5)
          AND ($6::varchar IS NULL OR a.sexo = $6)
          AND ($7::varchar IS NULL OR a.corral_id::text = $7)
          AND ($8::date IS NULL OR a.fecha_nacimiento >= $8::date)
          AND ($9::date IS NULL OR a.fecha_nacimiento <= $9::date)
        ORDER BY a.eliminado_en NULLS FIRST, a.identificador`,
      [
        ranchoId,
        estados,
        conBajas,
        terminoBusqueda,
        categoria || null,
        sexo || null,
        corral || null,
        fechaDesde || null,
        fechaHasta || null,
      ],
    );
    return resultado.rows;
  }
  async uno(id: string, ranchoId: string): Promise<Animal | null> {
    const resultado = await this.bd.query(
      `SELECT ${COLUMNAS}
         FROM animales a
         LEFT JOIN corrales c ON c.id = a.corral_id
         LEFT JOIN usuarios uc ON uc.id = a.creado_por
         LEFT JOIN usuarios um ON um.id = a.modificado_por
        WHERE a.id::text = $1 AND a.rancho_id = $2`,
      [id, ranchoId],
    );
    return resultado.rows[0] ?? null;
  }

  async identificadorOcupado(identificador: string, ranchoId: string, salvoId: string | null) {
    const resultado = await this.bd.query(
      `SELECT 1 FROM animales
        WHERE rancho_id = $1 AND identificador = $2 AND eliminado_en IS NULL
          AND ($3::uuid IS NULL OR id <> $3::uuid)`,
      [ranchoId, identificador, salvoId],
    );
    return (resultado.rowCount ?? 0) > 0;
  }

  async categoriaExiste(codigo: string): Promise<boolean> {
    const resultado = await this.bd.query(
      `SELECT 1 FROM categorias_animal WHERE codigo = $1 AND eliminado_en IS NULL`,
      [codigo],
    );
    return (resultado.rowCount ?? 0) > 0;
  }

  async corralVigente(corralId: string, ranchoId: string): Promise<boolean> {
    const resultado = await this.bd.query(
      `SELECT 1 FROM corrales WHERE id::text = $1 AND rancho_id = $2 AND eliminado_en IS NULL`,
      [corralId, ranchoId],
    );
    return (resultado.rowCount ?? 0) > 0;
  }

  async crear(datos: {
    id: string;
    ranchoId: string;
    identificador: string;
    tipoIdentificador: string;
    ficha: DatosFicha;
    corralId: string | null;
    autorId: string;
  }): Promise<void> {
    await this.enTransaccion(async (cliente) => {
      const f = datos.ficha;
      await cliente.query(
        `INSERT INTO animales
                (id, rancho_id, identificador, tipo_identificador, nombre, raza, sexo,
                 categoria_codigo, fecha_nacimiento, origen, peso_kg, creado_por, modificado_por)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12)`,
        [
          datos.id, datos.ranchoId, datos.identificador, datos.tipoIdentificador, f.nombre, f.raza,
          f.sexo, f.categoria_codigo, f.fecha_nacimiento, f.origen, f.peso_kg, datos.autorId,
        ],
      );
      if (datos.corralId) {
        await this.registrarMovimiento(cliente, datos.id, datos.ranchoId, null, datos.corralId, datos.autorId);
      }
    });
  }

  async actualizarFicha(id: string, ranchoId: string, ficha: DatosFicha, autorId: string) {
    await this.bd.query(
      `UPDATE animales
          SET nombre = $3, raza = $4, sexo = $5, categoria_codigo = $6,
              fecha_nacimiento = $7, origen = $8, peso_kg = $9, modificado_por = $10
        WHERE id = $1 AND rancho_id = $2 AND eliminado_en IS NULL`,
      [
        id, ranchoId, ficha.nombre, ficha.raza, ficha.sexo, ficha.categoria_codigo,
        ficha.fecha_nacimiento, ficha.origen, ficha.peso_kg, autorId,
      ],
    );
  }

  async mover(id: string, ranchoId: string, destinoId: string | null, autorId: string): Promise<boolean> {
    return this.enTransaccion(async (cliente) => {
      const actual = await cliente.query(
        `SELECT corral_id FROM animales
          WHERE id = $1 AND rancho_id = $2 AND eliminado_en IS NULL
          FOR UPDATE`,
        [id, ranchoId],
      );
      const origenId: string | null = actual.rows[0]?.corral_id ?? null;
      if (origenId === destinoId) return false;
      await this.registrarMovimiento(cliente, id, ranchoId, origenId, destinoId, autorId);
      return true;
    });
  }

  async movimientos(animalId: string, ranchoId: string) {
    const resultado = await this.bd.query(
      `SELECT m.id, m.fecha,
              m.corral_origen_id, co.nombre AS corral_origen,
              m.corral_destino_id, cd.nombre AS corral_destino,
              m.creado_por AS registrado_por_id, u.nombre AS registrado_por
         FROM movimientos_corral m
         LEFT JOIN corrales co ON co.id = m.corral_origen_id
         LEFT JOIN corrales cd ON cd.id = m.corral_destino_id
         LEFT JOIN usuarios u ON u.id = m.creado_por
        WHERE m.animal_id = $1 AND m.rancho_id = $2 AND m.eliminado_en IS NULL
        ORDER BY m.fecha DESC, m.creado_en DESC`,
      [animalId, ranchoId],
    );
    return resultado.rows;
  }

  async cambiarEstado(datos: {
    id: string;
    ranchoId: string;
    anterior: Estado;
    nuevo: Estado;
    fecha: string;
    motivo: string;
    autorId: string;
  }): Promise<void> {
    await this.enTransaccion(async (cliente) => {
      await cliente.query(
        `UPDATE animales SET estado = $3, modificado_por = $4
          WHERE id = $1 AND rancho_id = $2 AND eliminado_en IS NULL`,
        [datos.id, datos.ranchoId, datos.nuevo, datos.autorId],
      );
      await cliente.query(
        `INSERT INTO cambios_estado_animal
                (id, rancho_id, animal_id, estado_anterior, estado_nuevo, fecha, motivo,
                 creado_por, modificado_por)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)`,
        [
          randomUUID(), datos.ranchoId, datos.id, datos.anterior, datos.nuevo,
          datos.fecha, datos.motivo, datos.autorId,
        ],
      );
    });
  }

  async cambiosDeEstado(animalId: string, ranchoId: string) {
    const resultado = await this.bd.query(
      `SELECT e.id, e.estado_anterior, e.estado_nuevo,
              TO_CHAR(e.fecha, 'YYYY-MM-DD') AS fecha, e.motivo, e.creado_en,
              u.nombre AS registrado_por
         FROM cambios_estado_animal e
         LEFT JOIN usuarios u ON u.id = e.creado_por
        WHERE e.animal_id = $1 AND e.rancho_id = $2 AND e.eliminado_en IS NULL
        ORDER BY e.creado_en DESC`,
      [animalId, ranchoId],
    );
    return resultado.rows;
  }

  async marcarBaja(id: string, ranchoId: string, baja: boolean, autorId: string) {
    await this.bd.query(
      `UPDATE animales
          SET eliminado_en = CASE WHEN $3 THEN CURRENT_TIMESTAMP ELSE NULL END,
              modificado_por = $4
        WHERE id = $1 AND rancho_id = $2`,
      [id, ranchoId, baja, autorId],
    );
  }

  private async registrarMovimiento(
    cliente: PoolClient,
    animalId: string,
    ranchoId: string,
    origenId: string | null,
    destinoId: string | null,
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