import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  UseGuards,
} from '@nestjs/common';
import { GuardiaCuentaLista } from '../../comun/guardia-cuenta-lista';
import { RepositorioUsuarioActual } from '../../comun/repositorio-usuario-actual';
import { ServicioImportacion } from './servicio-importacion';

/**
 * Endpoints de Importación de Animales (HU-40 a HU-45).
 * Responsable: Romina | Sprint 2
 *
 *   GET  /importacion/plantilla   Descarga la plantilla CSV con las columnas esperadas
 *   POST /importacion/validar     Valida el archivo CSV y detecta errores / duplicados
 *   POST /importacion/ejecutar    Ejecuta la importación con resolución de duplicados
 */
@UseGuards(GuardiaCuentaLista)
@Controller('importacion')
export class ControladorImportacion {
  constructor(
    private readonly servicio: ServicioImportacion,
    private readonly usuarios: RepositorioUsuarioActual,
  ) {}

  @Get('plantilla')
  plantilla() {
    return this.servicio.obtenerPlantilla();
  }

  @Post('validar')
  async validar(
    @Body() cuerpo: any,
    @Headers('x-usuario-id') usuarioId?: string,
  ) {
    const usuario = await this.usuarios.resolver(usuarioId);
    return this.servicio.validar(cuerpo, usuario);
  }

  @Post('ejecutar')
  async ejecutar(
    @Body() cuerpo: any,
    @Headers('x-usuario-id') usuarioId?: string,
  ) {
    const usuario = await this.usuarios.resolver(usuarioId);
    return this.servicio.ejecutar(cuerpo, usuario);
  }
}
