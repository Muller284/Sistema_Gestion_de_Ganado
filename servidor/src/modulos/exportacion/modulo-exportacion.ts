import { Module } from '@nestjs/common';
import { PermisosModulo } from '../../comun/permisos-modulo';
import { RepositorioUsuarioActual } from '../../comun/repositorio-usuario-actual';
import { ControladorExportacion } from './controlador-exportacion';
import { RepositorioExportacion } from './repositorio-exportacion';
import { ServicioExportacion } from './servicio-exportacion';

/** HU-45. RepositorioUsuarioActual lo pide GuardiaCuentaLista. */
@Module({
  controllers: [ControladorExportacion],
  providers: [ServicioExportacion, RepositorioExportacion, PermisosModulo, RepositorioUsuarioActual],
})
export class ModuloExportacion {}
