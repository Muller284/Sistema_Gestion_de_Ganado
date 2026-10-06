import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { GuardiaCuentaLista } from '../../comun/guardia-cuenta-lista';
import { ServicioEquipo } from './servicio-equipo';

/**
 * HU-17 · El equipo del rancho.
 *
 *   GET   /equipo               los integrantes del rancho
 *   POST  /equipo               dar de alta a un socio o colaborador
 *   PATCH /equipo/:id/estado    suspender o reactivar  { estado }
 *
 * Los tipos de colaborador (GET /equipo/tipos y el resto) son de HU-20 y
 * estan en modulos/tipos/controlador-tipos.ts.
 *
 * GuardiaCuentaLista resuelve quien pide (token o x-usuario-id) y lo deja en
 * la peticion: no hace falta volver a preguntarle a la base.
 */
@UseGuards(GuardiaCuentaLista)
@Controller('equipo')
export class ControladorEquipo {
  constructor(private readonly servicio: ServicioEquipo) {}

  @Get()
  async listar(@Req() peticion: any) {
    return this.servicio.listar(peticion.usuarioActual);
  }

  @Post()
  async alta(@Body() cuerpo: any, @Req() peticion: any) {
    return this.servicio.alta(cuerpo, peticion.usuarioActual);
  }

  @Patch(':id/estado')
  async cambiarEstado(@Param('id') id: string, @Body() cuerpo: any, @Req() peticion: any) {
    return this.servicio.cambiarEstado(id, cuerpo, peticion.usuarioActual);
  }
}
