import { Body, Controller, Get, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';
import { GuardiaCuentaLista } from '../../comun/guardia-cuenta-lista';
import { ServicioPesajes } from './servicio-pesajes';

/**
 * HU-53 · Módulo «pesajes».
 *
 *   GET  /pesajes/animales/:id        { animal, pesajes, maximo_kg }       (ver)
 *   POST /pesajes                     { animal_id, peso_kg, fecha?, observacion? }  (editar)
 *   POST /pesajes/masivo/animales     { animal_ids } -> los que se pueden pesar     (editar)
 *   POST /pesajes/masivo              { fecha?, observacion?, pesajes: [{ animal_id, peso_kg }] }
 *
 * El peso llega siempre en kilos (HU-26). Sin fecha es hoy en el país del rancho.
 * HU-54 (ganancia diaria) y HU-55 (registro rápido desde el celular) se
 * arman sobre estas mismas rutas.
 */
@UseGuards(GuardiaCuentaLista)
@Controller('pesajes')
export class ControladorPesajes {
  constructor(private readonly servicio: ServicioPesajes) {}

  @Get('animales/:id')
  async delAnimal(@Param('id') id: string, @Req() peticion: any) {
    return this.servicio.delAnimal(id, peticion.usuarioActual);
  }

  @Post()
  async registrar(@Body() cuerpo: any, @Req() peticion: any) {
    return this.servicio.registrar(cuerpo, peticion.usuarioActual);
  }

  @Post('masivo/animales')
  @HttpCode(200)
  async pesables(@Body() cuerpo: any, @Req() peticion: any) {
    return this.servicio.pesables(cuerpo, peticion.usuarioActual);
  }

  @Post('masivo')
  async registrarMasivo(@Body() cuerpo: any, @Req() peticion: any) {
    return this.servicio.registrarMasivo(cuerpo, peticion.usuarioActual);
  }
}
