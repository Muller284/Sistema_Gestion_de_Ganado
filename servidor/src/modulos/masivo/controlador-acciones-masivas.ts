import { Body, Controller, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { GuardiaCuentaLista } from '../../comun/guardia-cuenta-lista';
import { ServicioAccionesMasivas } from './servicio-acciones-masivas';

/**
 * HU-31 · Acciones masivas sobre animales.
 *
 *   POST /masivo/animales/estado   { animal_ids, estado, motivo, fecha? }
 *   POST /masivo/animales/baja     { animal_ids }
 *
 * Van en su propio prefijo y no bajo /animales para no chocar con
 * /animales/:id/estado. Asignar a un corral ya es masivo: POST
 * /corrales/:id/animales (HU-37).
 */
@UseGuards(GuardiaCuentaLista)
@Controller('masivo/animales')
export class ControladorAccionesMasivas {
  constructor(private readonly servicio: ServicioAccionesMasivas) {}

  @Post('estado')
  @HttpCode(200)
  async cambiarEstado(@Body() cuerpo: any, @Req() peticion: any) {
    return this.servicio.cambiarEstado(cuerpo, peticion.usuarioActual);
  }

  @Post('baja')
  @HttpCode(200)
  async darDeBaja(@Body() cuerpo: any, @Req() peticion: any) {
    return this.servicio.darDeBaja(cuerpo, peticion.usuarioActual);
  }
}
