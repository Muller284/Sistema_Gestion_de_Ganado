import { Module } from '@nestjs/common';
import { PermisosModulo } from '../../comun/permisos-modulo';
import { RepositorioUsuarioActual } from '../../comun/repositorio-usuario-actual';
import { ControladorImportacion } from './controlador-importacion';
import { ServicioImportacion } from './servicio-importacion';

@Module({
  controllers: [ControladorImportacion],
  providers: [ServicioImportacion, PermisosModulo, RepositorioUsuarioActual],
  exports: [ServicioImportacion],
})
export class ModuloImportacion {}
