import { Module } from '@nestjs/common';
import { PermisosModulo } from '../../comun/permisos-modulo';
import { RepositorioUsuarioActual } from '../../comun/repositorio-usuario-actual';
import { ControladorImportacion } from './controlador-importacion';
import { RepositorioImportacion } from './repositorio-importacion';
import { ServicioImportacion } from './servicio-importacion';
import { RepositorioRazas } from '../animales/repositorio-razas';

/** HU-40, HU-43 y HU-44. RepositorioUsuarioActual lo pide GuardiaCuentaLista. */
@Module({
  controllers: [ControladorImportacion],
  providers: [ServicioImportacion, RepositorioImportacion, RepositorioRazas, PermisosModulo, RepositorioUsuarioActual],
})
export class ModuloImportacion {}
