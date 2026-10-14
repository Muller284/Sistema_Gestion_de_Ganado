import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { GuardiaCuentaLista } from '../../comun/guardia-cuenta-lista';
import { ServicioImportacion } from './servicio-importacion';

/**
 * Endpoints de Importación de Animales (HU-40 a HU-45).
 * Responsable: Romina | Sprint 2
 *
 *   GET  /importacion/plantilla   Descarga la plantilla CSV con las columnas esperadas
 *   POST /importacion/validar     Valida el archivo CSV y detecta errores / duplicados
 *   POST /importacion/ejecutar    Ejecuta la importación con resolución de duplicados
 *
 * Quien pide lo resuelve GuardiaCuentaLista (token o x-usuario-id) y lo deja
 * en peticion.usuarioActual, igual que en equipo y tipos.
 */
@UseGuards(GuardiaCuentaLista)
@Controller('importacion')
export class ControladorImportacion {
  constructor(private readonly servicio: ServicioImportacion) {}

  @Get('plantilla')
  plantilla() {
    return this.servicio.obtenerPlantilla();
  }

  @Post('validar')
  async validar(@Body() cuerpo: any, @Req() peticion: any) {
    return this.servicio.validar(cuerpo, peticion.usuarioActual);
  }

  @Post('ejecutar')
  async ejecutar(@Body() cuerpo: any, @Req() peticion: any) {
    return this.servicio.ejecutar(cuerpo, peticion.usuarioActual);
  }
}
