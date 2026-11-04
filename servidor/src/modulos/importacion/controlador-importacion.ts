import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import { GuardiaCuentaLista } from '../../comun/guardia-cuenta-lista';
import { ServicioImportacion } from './servicio-importacion';

/**
 * Importación de animales (HU-40, HU-43 y HU-44: Romina; HU-41 y HU-42: Brian).
 *
 *   GET  /importacion/plantilla      el Excel de la plantilla, en el idioma de quien lo pide
 *   POST /importacion/vista-previa   { nombre_archivo, contenido_base64, estrategia?, asignaciones? }
 *                                    lee y clasifica el archivo; no guarda nada.
 *                                    Devuelve columnas[] (qué columna se tomó como qué
 *                                    campo, HU-41) y faltan[] (obligatorias sin asignar)
 *   POST /importacion/confirmar      lo mismo, y guarda en una sola transacción
 *
 * estrategia: 'omitir' (por defecto) o 'actualizar' los animales que ya existen.
 * asignaciones (HU-42): { "<posición de la columna>": "<campo>" | "ignorar" } para
 * las columnas que el sistema no reconoció.
 * El archivo viaja en base64 dentro del JSON: Excel (.xlsx) o CSV.
 *
 * Quien pide lo resuelve GuardiaCuentaLista y lo deja en peticion.usuarioActual.
 */
@UseGuards(GuardiaCuentaLista)
@Controller('importacion')
export class ControladorImportacion {
  constructor(private readonly servicio: ServicioImportacion) {}

  @Get('plantilla')
  async plantilla(@Req() peticion: any, @Res() respuesta: any) {
    const { nombre, contenido } = await this.servicio.plantilla(peticion.usuarioActual);
    respuesta.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    respuesta.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(nombre)}"`);
    respuesta.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    respuesta.send(contenido);
  }

  @Post('vista-previa')
  @HttpCode(200)
  async vistaPrevia(@Body() cuerpo: any, @Req() peticion: any) {
    return this.servicio.vistaPrevia(cuerpo, peticion.usuarioActual);
  }

  @Post('confirmar')
  async confirmar(@Body() cuerpo: any, @Req() peticion: any) {
    return this.servicio.confirmar(cuerpo, peticion.usuarioActual);
  }
}
