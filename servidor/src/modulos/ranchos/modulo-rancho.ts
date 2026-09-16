import { Module } from '@nestjs/common';
import { ControladorRancho } from './controlador-rancho';
import { ServicioRancho } from './servicio-rancho';
import { RepositorioRancho } from './repositorio-rancho';
import { RepositorioUsuarioActual } from '../../comun/repositorio-usuario-actual';

@Module({
  controllers: [ControladorRancho],
  providers: [ServicioRancho, RepositorioRancho, RepositorioUsuarioActual],
})
export class ModuloRancho {}
