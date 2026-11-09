import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { GuardiaCuentaLista } from '../../comun/guardia-cuenta-lista';
import { ServicioSanidad } from './servicio-sanidad';

/**
 * HU-46, HU-48, HU-49 y HU-52 · Productos y aplicaciones, en el mismo prefijo /sanidad que
 * los esquemas y el calendario de Aaron (modulos/vacunacion).
 *
 *   GET    /sanidad/productos                  { productos }               sanidad · ver
 *   POST   /sanidad/productos                  { nombre, tipo, laboratorio?, dosis?, unidad? }
 *   PATCH  /sanidad/productos/:id              lo mismo                    sanidad · editar
 *   DELETE /sanidad/productos/:id              baja lógica                 sanidad · editar
 *   GET    /sanidad/aplicaciones/opciones      { productos, esquemas, integrantes, hoy }
 *   GET    /sanidad/animales/:id/aplicaciones  { aplicaciones }            sanidad · ver
 *   POST   /sanidad/animales/:id/aplicaciones  { producto_id, fecha, dosis?, esquema_id?,
 *                                                numero_dosis?, aplicado_por?, observacion? }
 *   POST   /sanidad/aplicaciones/masiva        { animal_ids, ...lo mismo }  sanidad · editar
 *   GET    /sanidad/animales/buscar            ?identificador=0501         sanidad · editar
 */
@UseGuards(GuardiaCuentaLista)
@Controller('sanidad')
export class ControladorSanidad {
  constructor(private readonly servicio: ServicioSanidad) {}

  @Get('productos')
  async productos(@Req() peticion: any) {
    return this.servicio.productos(peticion.usuarioActual);
  }

  @Post('productos')
  async crearProducto(@Body() cuerpo: any, @Req() peticion: any) {
    return this.servicio.crearProducto(cuerpo, peticion.usuarioActual);
  }

  @Patch('productos/:id')
  async actualizarProducto(@Param('id') id: string, @Body() cuerpo: any, @Req() peticion: any) {
    return this.servicio.actualizarProducto(id, cuerpo, peticion.usuarioActual);
  }

  @Delete('productos/:id')
  async darDeBajaProducto(@Param('id') id: string, @Req() peticion: any) {
    return this.servicio.darDeBajaProducto(id, peticion.usuarioActual);
  }

  @Get('aplicaciones/opciones')
  async opcionesAplicacion(@Req() peticion: any) {
    return this.servicio.opcionesAplicacion(peticion.usuarioActual);
  }

  @Post('aplicaciones/masiva')
  async registrarMasiva(@Body() cuerpo: any, @Req() peticion: any) {
    return this.servicio.registrarMasiva(cuerpo, peticion.usuarioActual);
  }

  @Get('animales/buscar')
  async buscarAnimal(@Query('identificador') identificador: unknown, @Req() peticion: any) {
    return this.servicio.buscarAnimal(identificador, peticion.usuarioActual);
  }

  @Get('animales/:id/aplicaciones')
  async aplicaciones(@Param('id') id: string, @Req() peticion: any) {
    return this.servicio.aplicaciones(id, peticion.usuarioActual);
  }

  @Post('animales/:id/aplicaciones')
  async registrarAplicacion(@Param('id') id: string, @Body() cuerpo: any, @Req() peticion: any) {
    return this.servicio.registrarAplicacion(id, cuerpo, peticion.usuarioActual);
  }
}
