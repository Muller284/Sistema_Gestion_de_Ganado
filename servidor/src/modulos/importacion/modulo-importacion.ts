import { Module } from '@nestjs/common';
import { RepositorioUsuarioActual } from '../../comun/repositorio-usuario-actual';
import { PermisosModulo } from '../../comun/permisos-modulo';
import { ControladorImportacion } from './controlador-importacion';
import { ServicioImportacion } from './servicio-importacion';

@Module({
  controllers: [ControladorImportacion],
  providers: [ServicioImportacion, RepositorioUsuarioActual, PermisosModulo],
  exports: [ServicioImportacion],
})
export class ModuloImportacion {}