import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { GuardiaCuentaLista } from '../../comun/guardia-cuenta-lista';
import { ServicioGuia } from './servicio-guia';

/**
 * HU-16 · Guia de configuracion inicial.
 *
 *   GET  /guia                        los cuatro pasos, su estado y el progreso
 *   POST /guia/pasos/:paso/visita     el propietario abrio el paso
 *   POST /guia/pasos/:paso/completar  lo da por terminado
 *   POST /guia/pasos/:paso/reabrir    lo vuelve a abrir
 *   POST /guia/pausa                  { pausada } seguir despues / retomar
 *
 * Todas las escrituras devuelven la guia entera ya actualizada: el cliente
 * no tiene que volver a pedirla.
 */
@UseGuards(GuardiaCuentaLista)
@Controller('guia')
export class ControladorGuia {
  constructor(private readonly servicio: ServicioGuia) {}

  @Get()
  async estado(@Req() peticion: any) {
    return this.servicio.estado(peticion.usuarioActual);
  }

  @Post('pasos/:paso/visita')
  async visitar(@Param('paso') paso: string, @Req() peticion: any) {
    return this.servicio.visitar(paso, peticion.usuarioActual);
  }

  @Post('pasos/:paso/completar')
  async completar(@Param('paso') paso: string, @Req() peticion: any) {
    return this.servicio.completar(paso, true, peticion.usuarioActual);
  }

  @Post('pasos/:paso/reabrir')
  async reabrir(@Param('paso') paso: string, @Req() peticion: any) {
    return this.servicio.completar(paso, false, peticion.usuarioActual);
  }

  @Post('pausa')
  async pausar(@Body() cuerpo: any, @Req() peticion: any) {
    return this.servicio.pausar(cuerpo, peticion.usuarioActual);
  }
}
