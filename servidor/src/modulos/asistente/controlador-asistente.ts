import { Body, Controller, Get, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';
import { GuardiaCuentaLista } from '../../comun/guardia-cuenta-lista';
import { ServicioAsistente } from './servicio-asistente';

/**
 * Fase 5 · Asistente con IA (RF-38 a RF-42).
 *
 *   GET  /asistente             si está configurado, la cuota del mes y los
 *                               módulos sobre los que puede responder
 *   POST /asistente/preguntas   { pregunta, historial?: [{ rol, texto }] }
 *                               → { id, respuesta, herramientas, usadas, limite }
 *   POST /asistente/transcripciones  { audio: WAV en base64 } → { texto }
 *   GET  /asistente/consultas/:id/voz  la respuesta leída → { tipo, audio }
 */
@UseGuards(GuardiaCuentaLista)
@Controller('asistente')
export class ControladorAsistente {
  constructor(private readonly servicio: ServicioAsistente) {}

  @Get()
  async estado(@Req() peticion: any) {
    return this.servicio.estado(peticion.usuarioActual);
  }

  @Post('preguntas')
  @HttpCode(200)
  async preguntar(@Body() cuerpo: any, @Req() peticion: any) {
    return this.servicio.preguntar(cuerpo, peticion.usuarioActual);
  }

  @Post('transcripciones')
  @HttpCode(200)
  async transcribir(@Body() cuerpo: any, @Req() peticion: any) {
    return this.servicio.transcribir(cuerpo, peticion.usuarioActual);
  }

  @Get('consultas/:id/voz')
  async leer(@Param('id') id: string, @Req() peticion: any) {
    return this.servicio.leer(id, peticion.usuarioActual);
  }
}
