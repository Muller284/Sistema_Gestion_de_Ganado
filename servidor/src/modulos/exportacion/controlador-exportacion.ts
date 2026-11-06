import { Controller, Get, Query, Req, Res, UseGuards } from '@nestjs/common';
import { GuardiaCuentaLista } from '../../comun/guardia-cuenta-lista';
import { ServicioExportacion } from './servicio-exportacion';

/**
 * HU-45 · Exportación a Excel.
 *
 *   GET /exportacion?que=animales,corrales,movimientos,estados&formato=xlsx|csv
 *                   &vista= &busqueda= &sexo= &categoria= &corral= &fechaDesde= &fechaHasta=
 *
 * Los filtros son los del listado de animales (HU-29): vista es la pestaña
 * elegida (activo, vendido, muerto, archivado, todos o bajas). Responde el
 * archivo con su nombre en Content-Disposition.
 */
@UseGuards(GuardiaCuentaLista)
@Controller('exportacion')
export class ControladorExportacion {
  constructor(private readonly servicio: ServicioExportacion) {}

  @Get()
  async exportar(@Query() consulta: Record<string, string | undefined>, @Req() peticion: any, @Res() respuesta: any) {
    const archivo = await this.servicio.exportar(consulta, peticion.usuarioActual);
    respuesta.setHeader('Content-Type', archivo.tipo);
    respuesta.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(archivo.nombre)}"`);
    respuesta.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    respuesta.send(archivo.contenido);
  }
}
