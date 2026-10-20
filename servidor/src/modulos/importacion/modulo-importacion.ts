import { Module } from '@nestjs/common';
import { PermisosModulo } from '../../comun/permisos-modulo';
import { RepositorioUsuarioActual } from '../../comun/repositorio-usuario-actual';
import { ControladorImportacion } from './controlador-importacion';
import { RepositorioImportacion } from './repositorio-importacion';
import { ServicioImportacion } from './servicio-importacion';

/** HU-40, HU-41, HU-42, HU-43 y HU-44. RepositorioUsuarioActual lo pide GuardiaCuentaLista. */
@Module({
  controllers: [ControladorImportacion],
  providers: [ServicioImportacion, RepositorioImportacion, PermisosModulo, RepositorioUsuarioActual],
})
export class ModuloImportacion {}
