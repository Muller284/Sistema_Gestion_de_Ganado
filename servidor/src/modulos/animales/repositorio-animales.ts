import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';

@Injectable()
export class RepositorioAnimales {
  constructor(private dataSource: DataSource) {}

  async crear(ranchoId: string, datos: { identificador: string; nombre?: string; raza?: string; sexo: string; corral?: string; peso?: number; categoria: string }, usuarioId: string) {
    const existente = await this.dataSource.query(
      'SELECT id FROM animales WHERE rancho_id = $1 AND identificador = $2',
      [ranchoId, datos.identificador]
    );
    
    if (existente && existente.length > 0) {
      throw new Error('Ya existe un animal con este identificador en el rancho.');
    }

    // Generamos un UUID válido compatible con el tipo de datos UUID de PostgreSQL
    const id = randomUUID();
    
    await this.dataSource.query(
      `INSERT INTO animales (id, rancho_id, identificador, nombre, raza, sexo, corral, peso, categoria, creado_por) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        id,
        ranchoId,
        datos.identificador,
        datos.nombre || null,
        datos.raza || null,
        datos.sexo,
        datos.corral || null,
        datos.peso || null,
        datos.categoria,
        usuarioId,
      ]
    );

    return await this.obtenerPorId(id);
  }

  async obtenerPorId(id: string) {
    const resultados = await this.dataSource.query('SELECT * FROM animales WHERE id = $1', [id]);
    return resultados[0] || null;
  }

  async listarPorRancho(ranchoId: string) {
    return await this.dataSource.query('SELECT * FROM animales WHERE rancho_id = $1', [ranchoId]);
  }
}