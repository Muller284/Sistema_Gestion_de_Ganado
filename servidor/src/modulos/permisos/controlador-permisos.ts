import { Body, Controller, Get, Param, Put, Req, UseGuards } from '@nestjs/common';
import { GuardiaCuentaLista } from '../../comun/guardia-cuenta-lista';
import { ServicioPermisos } from './servicio-permisos';

/**
 * HU-21 y HU-22 · Permisos por modulo de quien entra.
 *
 *   GET /permisos/mios           { animales: 'editar', corrales: 'ver', ... }
 *   GET /permisos/socios/:id     los modulos que ese socio puede editar
 *   PUT /permisos/socios/:id     { modulos: ['animales', ...] }  (solo el propietario)
 */
@UseGuards(GuardiaCuentaLista)
@Controller('permisos')
export class ControladorPermisos {
  constructor(private readonly servicio: ServicioPermisos) {}

  @Get('mios')
  async mios(@Req() peticion: any) {
    return this.servicio.mios(peticion.usuarioActual);
  }

  @Get('socios/:id')
  async delSocio(@Param('id') id: string, @Req() peticion: any) {
    return this.servicio.delSocio(id, peticion.usuarioActual);
  }

  @Put('socios/:id')
  async guardarDelSocio(@Param('id') id: string, @Body() cuerpo: any, @Req() peticion: any) {
    return this.servicio.guardarDelSocio(id, cuerpo, peticion.usuarioActual);
  }
}
