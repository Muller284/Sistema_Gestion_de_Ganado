import { Body, Controller, Get, HttpCode, Param, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { GuardiaCuentaLista } from '../../comun/guardia-cuenta-lista';
import { ServicioAdmin } from './servicio-admin';
import { ServicioPanelAdmin } from './servicio-panel-admin';

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
 *
 * Fase 4 · El panel del Admin (RF-56 a RF-62), todo solo para admin_plataforma:
 *
 *   GET   /admin/tablero                          cifras de la plataforma
 *   GET   /admin/cuentas?q=                       ranchos, con búsqueda
 *   GET   /admin/cuentas/:id                      la ficha de un rancho
 *   PATCH /admin/usuarios/:id/estado              { estado, motivo }
 *   POST  /admin/usuarios/:id/enlace-contrasena   { motivo }
 *   GET   /admin/razas                            el catálogo y las de los ranchos
 *   POST  /admin/razas                            { nombre, grupo }
 *   PATCH /admin/razas/:id                        { grupo?, activa? }
 *   GET   /admin/configuracion                    cuotas del asistente
 *   PUT   /admin/configuracion                    { asistente_consultas_mes?, asistente_tope_mensual? }
 *   GET   /admin/auditoria?tipo=&rancho=          lo que hizo cada Admin
 */
@UseGuards(GuardiaCuentaLista)
@Controller('admin')
export class ControladorAdmin {
  constructor(
    private readonly servicio: ServicioAdmin,
    private readonly panel: ServicioPanelAdmin,
  ) {}

  @Get('tablero')
  async tablero(@Req() peticion: any) {
    return this.panel.tablero(peticion.usuarioActual);
  }

  @Get('cuentas')
  async cuentas(@Query() consulta: any, @Req() peticion: any) {
    return this.panel.cuentas(consulta, peticion.usuarioActual);
  }

  @Get('cuentas/:id')
  async cuenta(@Param('id') id: string, @Req() peticion: any) {
    return this.panel.cuenta(id, peticion.usuarioActual);
  }

  @Patch('usuarios/:id/estado')
  async estadoUsuario(@Param('id') id: string, @Body() cuerpo: any, @Req() peticion: any) {
    return this.panel.cambiarEstado(id, cuerpo, peticion.usuarioActual);
  }

  @Post('usuarios/:id/enlace-contrasena')
  @HttpCode(200)
  async enlaceContrasena(@Param('id') id: string, @Body() cuerpo: any, @Req() peticion: any) {
    return this.panel.enlaceContrasena(id, cuerpo, peticion.usuarioActual);
  }

  @Get('razas')
  async razas(@Req() peticion: any) {
    return this.panel.razas(peticion.usuarioActual);
  }

  @Post('razas')
  async crearRaza(@Body() cuerpo: any, @Req() peticion: any) {
    return this.panel.crearRaza(cuerpo, peticion.usuarioActual);
  }

  @Patch('razas/:id')
  async editarRaza(@Param('id') id: string, @Body() cuerpo: any, @Req() peticion: any) {
    return this.panel.editarRaza(id, cuerpo, peticion.usuarioActual);
  }

  @Get('configuracion')
  async configuracion(@Req() peticion: any) {
    return this.panel.configuracion(peticion.usuarioActual);
  }

  @Put('configuracion')
  async guardarConfiguracion(@Body() cuerpo: any, @Req() peticion: any) {
    return this.panel.guardarConfiguracion(cuerpo, peticion.usuarioActual);
  }

  @Get('auditoria')
  async auditoria(@Query() consulta: any, @Req() peticion: any) {
    return this.panel.verAuditoria(consulta, peticion.usuarioActual);
  }

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
