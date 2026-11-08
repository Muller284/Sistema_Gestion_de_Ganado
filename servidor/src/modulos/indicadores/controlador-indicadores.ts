import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { GuardiaCuentaLista } from '../../comun/guardia-cuenta-lista';
import { ServicioIndicadores } from './servicio-indicadores';

/**
 * HU-56, HU-57 y HU-58 · Indicadores. Solo lectura.
 *
 *   GET /indicadores/panel                 el panel de quien pregunta, con solo
 *                                          las secciones de sus módulos
 *   GET /indicadores/pesajes/comparativa   ?desde&hasta&agrupar=corral|categoria
 */
@UseGuards(GuardiaCuentaLista)
@Controller('indicadores')
export class ControladorIndicadores {
  constructor(private readonly servicio: ServicioIndicadores) {}

  @Get('panel')
  async panel(@Req() peticion: any) {
    return this.servicio.panel(peticion.usuarioActual);
  }

  @Get('pesajes/comparativa')
  async comparativa(@Query() consulta: any, @Req() peticion: any) {
    return this.servicio.comparativa(consulta, peticion.usuarioActual);
  }
}
