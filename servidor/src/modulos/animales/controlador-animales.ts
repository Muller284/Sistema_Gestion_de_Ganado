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
import { ServicioAnimales } from './servicio-animales';

/**
 * Animales (HU-28, HU-33, HU-34 y HU-39).
 *
 *   GET    /animales/categorias          el catalogo de categorias (HU-28)
 *   GET    /animales                     los activos; ?estado=todos|vendido|... ; ?bajas=1
 *   GET    /animales/:id                 la ficha, con movimientos y cambios de estado
 *   POST   /animales                     alta con la ficha y, si viene, el corral
 *   PATCH  /animales/:id                 la ficha (sin corral ni estado)
 *   POST   /animales/:id/movimientos     { corral_id }            (HU-39)
 *   POST   /animales/:id/estado          { estado, motivo, fecha? } (HU-33)
 *   DELETE /animales/:id                 baja logica             (HU-34)
 *   POST   /animales/:id/restaurar       deshace la baja         (HU-34)
 */
@UseGuards(GuardiaCuentaLista)
@Controller('animales')
export class ControladorAnimales {
  constructor(private readonly servicio: ServicioAnimales) {}

  @Get('categorias')
  async categorias(@Req() peticion: any) {
    return this.servicio.categorias(peticion.usuarioActual);
  }

  @Get()
  async listar(
    @Query('estado') estado: string | undefined,
    @Query('bajas') bajas: string | undefined,
    @Req() peticion: any,
  ) {
    return this.servicio.listar(estado, bajas === '1' || bajas === 'true', peticion.usuarioActual);
  }

  @Get(':id')
  async ficha(@Param('id') id: string, @Req() peticion: any) {
    return this.servicio.ficha(id, peticion.usuarioActual);
  }

  @Post()
  async crear(@Body() cuerpo: any, @Req() peticion: any) {
    return this.servicio.crear(cuerpo, peticion.usuarioActual);
  }

  @Patch(':id')
  async actualizar(@Param('id') id: string, @Body() cuerpo: any, @Req() peticion: any) {
    return this.servicio.actualizar(id, cuerpo, peticion.usuarioActual);
  }

  @Post(':id/movimientos')
  async mover(@Param('id') id: string, @Body() cuerpo: any, @Req() peticion: any) {
    return this.servicio.mover(id, cuerpo, peticion.usuarioActual);
  }

  @Post(':id/estado')
  async cambiarEstado(@Param('id') id: string, @Body() cuerpo: any, @Req() peticion: any) {
    return this.servicio.cambiarEstado(id, cuerpo, peticion.usuarioActual);
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
