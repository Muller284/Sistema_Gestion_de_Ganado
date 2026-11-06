import { Module } from '@nestjs/common';
import { PermisosModulo } from '../../comun/permisos-modulo';
import { RepositorioUsuarioActual } from '../../comun/repositorio-usuario-actual';
import { ControladorVacunacion } from './controlador-vacunacion';
import { RepositorioVacunacion } from './repositorio-vacunacion';
import { ServicioVacunacion } from './servicio-vacunacion';

/** HU-47, HU-50 y HU-51. RepositorioUsuarioActual lo pide GuardiaCuentaLista. */
@Module({
  controllers: [ControladorVacunacion],
  providers: [ServicioVacunacion, RepositorioVacunacion, PermisosModulo, RepositorioUsuarioActual],
})
export class ModuloVacunacion {}
