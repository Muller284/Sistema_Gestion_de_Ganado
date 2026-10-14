import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { GuardiaCuentaLista } from '../../comun/guardia-cuenta-lista';
import { ServicioCorrales } from './servicio-corrales';

/**
 * HU-36 · Corrales (y su baja logica, HU-34).
 *
 *   GET    /corrales                 los vigentes con su ocupacion; ?bajas=1 suma los dados de baja
 *   POST   /corrales                 { nombre, capacidad?, superficie_ha? }
 *   PATCH  /corrales/:id             lo mismo
 *   DELETE /corrales/:id             baja logica
 *   POST   /corrales/:id/restaurar   deshace la baja
 */
@UseGuards(GuardiaCuentaLista)
@Controller('corrales')
export class ControladorCorrales {
  constructor(private readonly servicio: ServicioCorrales) {}

  @Get()
  async listar(@Query('bajas') bajas: string | undefined, @Req() peticion: any) {
    return this.servicio.listar(bajas === '1' || bajas === 'true', peticion.usuarioActual);
  }

  @Post()
  async crear(@Body() cuerpo: any, @Req() peticion: any) {
    return this.servicio.crear(cuerpo, peticion.usuarioActual);
  }

  @Patch(':id')
  async actualizar(@Param('id') id: string, @Body() cuerpo: any, @Req() peticion: any) {
    return this.servicio.actualizar(id, cuerpo, peticion.usuarioActual);
  }

  @Delete(':id')
  async darDeBaja(@Param('id') id: string, @Req() peticion: any) {
    return this.servicio.darDeBaja(id, peticion.usuarioActual);
  }

  @Post(':id/restaurar')
  async restaurar(@Param('id') id: string, @Req() peticion: any) {
    return this.servicio.restaurar(id, peticion.usuarioActual);
  }
}
