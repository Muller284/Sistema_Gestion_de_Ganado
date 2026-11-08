import { Module } from '@nestjs/common';
import { PermisosModulo } from '../../comun/permisos-modulo';
import { RepositorioUsuarioActual } from '../../comun/repositorio-usuario-actual';
import { ControladorPesajes } from './controlador-pesajes';
import { RepositorioPesajes } from './repositorio-pesajes';
import { ServicioPesajes } from './servicio-pesajes';

/** HU-53. RepositorioUsuarioActual lo pide GuardiaCuentaLista. */
@Module({
  controllers: [ControladorPesajes],
  providers: [ServicioPesajes, RepositorioPesajes, PermisosModulo, RepositorioUsuarioActual],
})
export class ModuloPesajes {}
