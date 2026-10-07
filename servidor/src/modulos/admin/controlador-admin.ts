import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { GuardiaCuentaLista } from '../../comun/guardia-cuenta-lista';
import { ServicioAdmin } from './servicio-admin';

/**
 * HU-24 · El Admin de plataforma.
 *
 *   GET  /admin/ranchos                 todos los ranchos, para elegir a cual entrar
 *   POST /admin/ranchos/:id/accesos     entrar a dar soporte          { motivo }
 *   POST /admin/accesos/:id/salida      salir
 *   GET  /admin/accesos                 el registro de todos los accesos
 *   GET  /admin/accesos/de-mi-rancho    el propietario: quien entro a su rancho
 *
 * Las primeras cuatro son solo para el rol admin_plataforma.
 */
@UseGuards(GuardiaCuentaLista)
@Controller('admin')
export class ControladorAdmin {
  constructor(private readonly servicio: ServicioAdmin) {}

  @Get('ranchos')
  async ranchos(@Req() peticion: any) {
    return this.servicio.ranchos(peticion.usuarioActual);
  }

  @Post('ranchos/:id/accesos')
  async entrar(@Param('id') id: string, @Body() cuerpo: any, @Req() peticion: any) {
    return this.servicio.entrar(id, cuerpo, peticion.usuarioActual);
  }

  @Post('accesos/:id/salida')
  async salir(@Param('id') id: string, @Req() peticion: any) {
    return this.servicio.salir(id, peticion.usuarioActual);
  }

  @Get('accesos/de-mi-rancho')
  async deMiRancho(@Req() peticion: any) {
    return this.servicio.accesosDeMiRancho(peticion.usuarioActual);
  }

  @Get('accesos')
  async accesos(@Req() peticion: any) {
    return this.servicio.accesos(peticion.usuarioActual);
  }
}
