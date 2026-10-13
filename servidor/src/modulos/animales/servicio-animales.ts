import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class ServicioAnimales {
  constructor(private dataSource: DataSource) {}

  async registrar(ranchoId: number, datos: any, usuarioId: number) {
    const { identificador, tipoIdentificador, nombre, raza, sexo, categoria, fechaNacimiento, corralAsignado, pesoInicial } = datos;

    // Validación estricta: El identificador es obligatorio (HU-27)
    if (!identificador || !identificador.trim()) {
      throw new HttpException({ mensaje: 'El identificador del animal (caravana, número interno o RFID) es obligatorio.' }, HttpStatus.BAD_REQUEST);
    }

    // Validar duplicados por rancho a nivel de aplicación e índice de base de datos
    const duplicado = await this.dataSource.query(
      'SELECT id FROM animales WHERE rancho_id = $1 AND identificador = $2 AND (estado IS NULL OR estado != \'inactivo\')',
      [ranchoId, identificador.trim()]
    );

    if (duplicado && duplicado.length > 0) {
      throw new HttpException({ mensaje: 'Ya existe un animal con este mismo identificador en el rancho.' }, HttpStatus.CONFLICT);
    }

    const tipoId = tipoIdentificador || 'caravana';

    const resultado = await this.dataSource.query(
      `INSERT INTO animales (
        rancho_id, identificador, tipo_identificador, nombre, raza, sexo, categoria, 
        fecha_nacimiento, corral_asignado, peso_inicial, estado, creado_por, modificado_por
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'activo', $11, $11) RETURNING *`,
      [
        ranchoId,
        identificador.trim(),
        tipoId,
        nombre || null,
        raza || null,
        sexo || null,
        categoria || null,
        fechaNacimiento || null,
        corralAsignado || null,
        pesoInicial ? Number(pesoInicial) : null,
        usuarioId,
      ]
    );

    return resultado[0];
  }
}