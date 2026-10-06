import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { GuardiaCuentaLista } from '../../comun/guardia-cuenta-lista';
import { ServicioTipos } from './servicio-tipos';

/**
 * HU-20 · Tipos de colaborador. Viven bajo /equipo porque son parte del
 * equipo del rancho:
 *
 *   GET    /equipo/modulos                  los modulos sobre los que hay permisos
 *   GET    /equipo/tipos                    los tipos, con sus permisos y cuantos los tienen
 *   POST   /equipo/tipos                    crear un tipo propio      { nombre, permisos }
 *   PUT    /equipo/tipos/:id                cambiar nombre y permisos { nombre?, permisos }
 *   POST   /equipo/tipos/:id/restablecer    un predefinido vuelve a los de fabrica
 *   DELETE /equipo/tipos/:id                eliminar un tipo propio que nadie usa
 *   PATCH  /equipo/:id/tipo                 cambiarle el tipo a un colaborador
 *
 * permisos = { animales: 'editar', sanidad: 'ver', ... }  (ninguno, ver o editar)
 *
 * GET /equipo/tipos ya existia (HU-17, para el formulario de alta) y sigue
 * devolviendo id, nombre y es_predefinido: lo nuevo son campos de mas.
 */
@UseGuards(GuardiaCuentaLista)
@Controller('equipo')
export class ControladorTipos {
  constructor(private readonly servicio: ServicioTipos) {}

  @Get('modulos')
  async modulos(@Req() peticion: any) {
    return this.servicio.modulos(peticion.usuarioActual);
  }

  @Get('tipos')
  async listar(@Req() peticion: any) {
    return this.servicio.listar(peticion.usuarioActual);
  }

  @Post('tipos')
  async crear(@Body() cuerpo: any, @Req() peticion: any) {
    return this.servicio.crear(cuerpo, peticion.usuarioActual);
  }

  @Put('tipos/:id')
  async actualizar(@Param('id') id: string, @Body() cuerpo: any, @Req() peticion: any) {
    return this.servicio.actualizar(id, cuerpo, peticion.usuarioActual);
  }

  @Post('tipos/:id/restablecer')
  async restablecer(@Param('id') id: string, @Req() peticion: any) {
    return this.servicio.restablecer(id, peticion.usuarioActual);
  }

  @Delete('tipos/:id')
  async eliminar(@Param('id') id: string, @Req() peticion: any) {
    return this.servicio.eliminar(id, peticion.usuarioActual);
  }

  @Patch(':id/tipo')
  async asignar(@Param('id') id: string, @Body() cuerpo: any, @Req() peticion: any) {
    return this.servicio.asignar(id, cuerpo, peticion.usuarioActual);
  }
}
