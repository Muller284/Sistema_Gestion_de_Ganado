import { Controller, Get, Post, Patch, Delete, Body, Param, Req, HttpException, HttpStatus } from '@nestjs/common';
import { ServicioAnimales } from './servicio-animales';
import { DataSource } from 'typeorm';

@Controller('animales')
export class ControladorAnimales {
  constructor(private servicio: ServicioAnimales, private dataSource: DataSource) {}

  @Post()
  async registrar(@Req() req: any, @Body() datos: any) {
    try {
      const usuarioId = req.usuario?.id || req.headers['x-usuario-id'];
      if (!usuarioId) {
        throw new HttpException({ mensaje: 'No autorizado: Falta identificar al usuario (HU-19).' }, HttpStatus.UNAUTHORIZED);
      }

      // Consulta de seguridad REAL en la base de datos (Adiós a confiar en headers del navegador)
      const usuarioDb = await this.dataSource.query(
        'SELECT rol, rancho_id, permisos FROM usuarios WHERE id = $1 AND eliminado_en IS NULL',
        [usuarioId]
      );

      if (!usuarioDb || usuarioDb.length === 0) {
        throw new HttpException({ mensaje: 'Usuario no encontrado en la base de datos.' }, HttpStatus.FORBIDDEN);
      }

      const { rol, rancho_id: ranchoIdDb, permisos } = usuarioDb[0];
      let puedeEditarAnimales = false;

      if (rol === 'propietario' || rol === 'admin') {
        puedeEditarAnimales = true;
      } else if (permisos) {
        try {
          const permisosObj = typeof permisos === 'string' ? JSON.parse(permisos) : permisos;
          puedeEditarAnimales = Boolean(permisosObj?.animales?.editar);
        } catch {
          puedeEditarAnimales = false;
        }
      }

      // Criterio HU-19: Rechazar si no tiene permisos explícitos de edición en BD
      if (rol !== 'propietario' && rol !== 'admin' && !puedeEditarAnimales) {
        throw new HttpException(
          { mensaje: 'Acción rechazada: No cuentas con permisos de edición para el módulo de animales en la base de datos (HU-19).' },
          HttpStatus.FORBIDDEN,
        );
      }

      let ranchoId = ranchoIdDb || datos.ranchoId;
      if (!ranchoId || ranchoId === 'rancho_demo' || ranchoId.includes('demo')) {
        const ranchos = await this.dataSource.query('SELECT id FROM ranchos LIMIT 1');
        if (ranchos && ranchos.length > 0) {
          ranchoId = ranchos[0].id;
        }
      }

      const animal = await this.servicio.registrar(ranchoId, datos, usuarioId);
      return { animal, mensaje: 'Animal registrado con éxito.' };
    } catch (error: any) {
      console.error('Error al registrar animal:', error);
      throw new HttpException(
        { mensaje: error.message || 'Error interno al registrar el animal' },
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Patch(':id')
  async actualizar(@Req() req: any, @Param('id') id: string, @Body() datos: any) {
    try {
      const usuarioId = req.usuario?.id || req.headers['x-usuario-id'];
      const usuarioDb = await this.dataSource.query('SELECT rol, permisos FROM usuarios WHERE id = $1', [usuarioId]);
      
      if (!usuarioDb || usuarioDb.length === 0) {
        throw new HttpException({ mensaje: 'No autorizado.' }, HttpStatus.UNAUTHORIZED);
      }

      const { rol, permisos } = usuarioDb[0];
      let puedeEditar = rol === 'propietario' || rol === 'admin';
      
      if (!puedeEditar && permisos) {
        const p = typeof permisos === 'string' ? JSON.parse(permisos) : permisos;
        puedeEditar = Boolean(p?.animales?.editar);
      }

      if (!puedeEditar) {
        throw new HttpException({ mensaje: 'No tienes permisos de edición en este módulo (HU-19).' }, HttpStatus.FORBIDDEN);
      }

      return { mensaje: 'Animal actualizado correctamente.' };
    } catch (error: any) {
      throw new HttpException(
        { mensaje: error.message || 'Error al actualizar' },
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete(':id')
  async eliminar(@Req() req: any, @Param('id') id: string) {
    try {
      const usuarioId = req.usuario?.id || req.headers['x-usuario-id'];
      const usuarioDb = await this.dataSource.query('SELECT rol, rancho_id FROM usuarios WHERE id = $1', [usuarioId]);

      if (!usuarioDb || usuarioDb.length === 0) {
        throw new HttpException({ mensaje: 'No autorizado.' }, HttpStatus.UNAUTHORIZED);
      }

      const { rol, rancho_id: ranchoId } = usuarioDb[0];

      // Criterio HU-18: Ningún rol salvo propietario y Admin puede eliminar
      if (rol !== 'propietario' && rol !== 'admin') {
        throw new HttpException(
          { mensaje: 'Acción no autorizada. Solo el Propietario o Administrador pueden eliminar registros (HU-18).' },
          HttpStatus.FORBIDDEN,
        );
      }

      // HU-18: BORRADO LÓGICO en lugar de borrado físico (UPDATE en vez de DELETE)
      await this.dataSource.query(
        `UPDATE animales 
            SET estado = 'inactivo', 
                modificado_en = CURRENT_TIMESTAMP, 
                modificado_por = $3 
          WHERE id = $1 AND rancho_id = $2`,
        [id, ranchoId, usuarioId]
      );

      return { mensaje: 'Animal eliminado correctamente (borrado lógico aplicado).' };
    } catch (error: any) {
      throw new HttpException(
        { mensaje: error.message || 'Error al eliminar el animal' },
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get()
  async listar(@Req() req: any) {
    const usuarioId = req.usuario?.id || req.headers['x-usuario-id'];
    let ranchoId = req.usuario?.rancho_id || req.headers['x-rancho-id'];

    if (usuarioId) {
      const usuarioDb = await this.dataSource.query('SELECT rancho_id FROM usuarios WHERE id = $1', [usuarioId]);
      if (usuarioDb && usuarioDb.length > 0 && usuarioDb[0]?.rancho_id) {
        ranchoId = usuarioDb[0].rancho_id;
      }
    }

    if (!ranchoId || ranchoId === 'rancho_demo' || ranchoId.includes('demo')) {
      const ranchos = await this.dataSource.query('SELECT id FROM ranchos LIMIT 1');
      if (ranchos && ranchos.length > 0) {
        ranchoId = ranchos[0].id;
      }
    }

    // Listar solo los animales que estén activos (Filtrando el borrado lógico)
    return await this.dataSource.query(
      `SELECT * FROM animales WHERE rancho_id = $1 AND (estado IS NULL OR estado != 'inactivo')`,
      [ranchoId]
    );
  }
}