import { Module } from '@nestjs/common';
import { PermisosModulo } from '../../comun/permisos-modulo';
import { RepositorioUsuarioActual } from '../../comun/repositorio-usuario-actual';
import { ControladorAnimales } from './controlador-animales';
import { RepositorioAnimales } from './repositorio-animales';
import { ServicioAnimales } from './servicio-animales';

/** HU-28, HU-33, HU-34 y HU-39. RepositorioUsuarioActual lo pide GuardiaCuentaLista. */
@Module({
  controllers: [ControladorAnimales],
  providers: [ServicioAnimales, RepositorioAnimales, PermisosModulo, RepositorioUsuarioActual],
})
export class ModuloAnimales {}
