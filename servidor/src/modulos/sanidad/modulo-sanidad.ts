import { Module } from '@nestjs/common';
import { PermisosModulo } from '../../comun/permisos-modulo';
import { RepositorioUsuarioActual } from '../../comun/repositorio-usuario-actual';
import { ControladorSanidad } from './controlador-sanidad';
import { RepositorioSanidad } from './repositorio-sanidad';
import { ServicioSanidad } from './servicio-sanidad';

/** HU-46, HU-48, HU-49 y HU-52. RepositorioUsuarioActual lo pide GuardiaCuentaLista. */
@Module({
  controllers: [ControladorSanidad],
  providers: [ServicioSanidad, RepositorioSanidad, PermisosModulo, RepositorioUsuarioActual],
})
export class ModuloSanidad {}
