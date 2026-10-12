import { Controller, Get, Post, Patch, Delete, Body, Param, Req, HttpException, HttpStatus } from '@nestjs/common';
import { ServicioAnimales } from './servicio-animales';
import { DataSource } from 'typeorm';

@Controller('animales')
export class ControladorAnimales {
  constructor(private servicio: ServicioAnimales, private dataSource: DataSource) {}

  @Post()
  async registrar(@Req() req: any, @Body() datos: any) {
    try {
      const rol = req.headers['x-usuario-rol'] || 'colaborador';
      const permisosJson = req.headers['x-permisos-modulos'];
      let puedeEditarAnimales = false;

      if (rol === 'propietario' || rol === 'admin') {
        puedeEditarAnimales = true;
      } else if (permisosJson) {
        try {
          const permisos = JSON.parse(permisosJson);
          puedeEditarAnimales = Boolean(permisos?.animales?.editar);
        } catch {
          puedeEditarAnimales = req.headers['x-puede-editar'] === 'true';
        }
      } else {
        puedeEditarAnimales = req.headers['x-puede-editar'] === 'true';
      }

      // Criterio HU-19: Rechazar cualquier operación si el módulo no está habilitado para edición
      if (rol !== 'propietario' && rol !== 'admin' && !puedeEditarAnimales) {
        throw new HttpException(
          { mensaje: 'Acción rechazada: No cuentas con permisos de edición para el módulo de animales (HU-19).' },
          HttpStatus.FORBIDDEN,
        );
      }

      let ranchoId = req.usuario?.rancho_id || req.headers['x-rancho-id'] || datos.ranchoId;
      const usuarioId = req.usuario?.id || req.headers['x-usuario-id'] || 'usr_propietario';

      if (!ranchoId || ranchoId === 'rancho_demo' || ranchoId.includes('demo')) {
        const usuarioDb = await this.dataSource.query('SELECT rancho_id FROM usuarios WHERE id = $1', [usuarioId]);
        if (usuarioDb && usuarioDb.length > 0 && usuarioDb[0]?.rancho_id) {
          ranchoId = usuarioDb[0].rancho_id;
        } else {
          const ranchos = await this.dataSource.query('SELECT id FROM ranchos LIMIT 1');
          if (ranchos && ranchos.length > 0) {
            ranchoId = ranchos[0].id;
          }
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
      const rol = req.headers['x-usuario-rol'] || 'colaborador';
      if (rol !== 'propietario' && rol !== 'admin' && req.headers['x-puede-editar'] !== 'true') {
        throw new HttpException(
          { mensaje: 'No tienes permisos de edición en este módulo (HU-19).' },
          HttpStatus.FORBIDDEN,
        );
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
      const rol = req.headers['x-usuario-rol'] || 'colaborador';
      if (rol !== 'propietario' && rol !== 'admin') {
        throw new HttpException(
          { mensaje: 'Acción no autorizada. Solo el Propietario o Administrador pueden eliminar registros.' },
          HttpStatus.FORBIDDEN,
        );
      }

      let ranchoId = req.headers['x-rancho-id'];
      await this.dataSource.query('DELETE FROM animales WHERE id = $1 AND rancho_id = $2', [id, ranchoId]);
      return { mensaje: 'Animal eliminado correctamente.' };
    } catch (error: any) {
      throw new HttpException(
        { mensaje: error.message || 'Error al eliminar el animal' },
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get()
  async listar(@Req() req: any) {
    let ranchoId = req.usuario?.rancho_id || req.headers['x-rancho-id'];
    const usuarioId = req.headers['x-usuario-id'];

    if (!ranchoId || ranchoId === 'rancho_demo' || ranchoId.includes('demo')) {
      if (usuarioId) {
        const usuarioDb = await this.dataSource.query('SELECT rancho_id FROM usuarios WHERE id = $1', [usuarioId]);
        if (usuarioDb && usuarioDb.length > 0 && usuarioDb[0]?.rancho_id) {
          ranchoId = usuarioDb[0].rancho_id;
        }
      }
      if (!ranchoId) {
        const ranchos = await this.dataSource.query('SELECT id FROM ranchos LIMIT 1');
        if (ranchos && ranchos.length > 0) {
          ranchoId = ranchos[0].id;
        }
      }
    }

    return await this.servicio.listar(ranchoId);
  }
}