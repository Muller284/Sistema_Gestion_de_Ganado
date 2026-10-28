import { Module } from '@nestjs/common';
import { PermisosModulo } from '../../comun/permisos-modulo';
import { RepositorioUsuarioActual } from '../../comun/repositorio-usuario-actual';
import { ControladorAccionesMasivas } from './controlador-acciones-masivas';
import { RepositorioAccionesMasivas } from './repositorio-acciones-masivas';
import { ServicioAccionesMasivas } from './servicio-acciones-masivas';

/** HU-31. RepositorioUsuarioActual lo pide GuardiaCuentaLista. */
@Module({
  controllers: [ControladorAccionesMasivas],
  providers: [ServicioAccionesMasivas, RepositorioAccionesMasivas, PermisosModulo, RepositorioUsuarioActual],
})
export class ModuloAccionesMasivas {}
