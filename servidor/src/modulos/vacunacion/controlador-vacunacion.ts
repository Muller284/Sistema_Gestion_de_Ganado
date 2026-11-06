import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { GuardiaCuentaLista } from '../../comun/guardia-cuenta-lista';
import { ServicioVacunacion } from './servicio-vacunacion';

/**
 * HU-47, HU-50 y HU-51 · Módulo «sanidad».
 *
 *   GET    /sanidad/esquemas        { esquemas, productos, categorias }
 *   POST   /sanidad/esquemas        { producto_id, nombre, categorias?, sexo?, edad_minima_meses?,
 *                                     edad_maxima_meses?, dosis, intervalo_dias?, refuerzo_dias? }
 *   PATCH  /sanidad/esquemas/:id    lo mismo
 *   DELETE /sanidad/esquemas/:id    baja lógica
 *   GET    /sanidad/calendario      ?desde&hasta&producto&corral&estado&pagina&porPagina
 *   GET    /sanidad/avisos          { vencidas, proximas, dias_proxima }
 *
 * Los productos (HU-46) y las aplicaciones (HU-48 y HU-49) se suman a este
 * mismo prefijo desde sus propios módulos.
 */
@UseGuards(GuardiaCuentaLista)
@Controller('sanidad')
export class ControladorVacunacion {
  constructor(private readonly servicio: ServicioVacunacion) {}

  @Get('esquemas')
  async listar(@Req() peticion: any) {
    return this.servicio.listar(peticion.usuarioActual);
  }

  @Post('esquemas')
  async crear(@Body() cuerpo: any, @Req() peticion: any) {
    return this.servicio.crear(cuerpo, peticion.usuarioActual);
  }

  @Patch('esquemas/:id')
  async actualizar(@Param('id') id: string, @Body() cuerpo: any, @Req() peticion: any) {
    return this.servicio.actualizar(id, cuerpo, peticion.usuarioActual);
  }

  @Delete('esquemas/:id')
  async darDeBaja(@Param('id') id: string, @Req() peticion: any) {
    return this.servicio.darDeBaja(id, peticion.usuarioActual);
  }

  @Get('calendario')
  async calendario(@Query() consulta: any, @Req() peticion: any) {
    return this.servicio.calendario(consulta, peticion.usuarioActual);
  }

  @Get('avisos')
  async avisos(@Req() peticion: any) {
    return this.servicio.avisos(peticion.usuarioActual);
  }
}
