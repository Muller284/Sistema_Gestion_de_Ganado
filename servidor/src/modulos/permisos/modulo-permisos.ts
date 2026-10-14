import { Module } from '@nestjs/common';
import { PermisosModulo } from '../../comun/permisos-modulo';
import { RepositorioUsuarioActual } from '../../comun/repositorio-usuario-actual';
import { ControladorPermisos } from './controlador-permisos';
import { ServicioPermisos } from './servicio-permisos';

/** HU-21 y HU-22. RepositorioUsuarioActual lo pide GuardiaCuentaLista. */
@Module({
  controllers: [ControladorPermisos],
  providers: [ServicioPermisos, PermisosModulo, RepositorioUsuarioActual],
})
export class ModuloPermisos {}
