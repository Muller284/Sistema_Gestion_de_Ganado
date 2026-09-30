import { Module } from '@nestjs/common';
import { RepositorioUsuarioActual } from '../../comun/repositorio-usuario-actual';
import { ControladorGuia } from './controlador-guia';
import { RepositorioGuia } from './repositorio-guia';
import { ServicioGuia } from './servicio-guia';

/** HU-16. */
@Module({
  controllers: [ControladorGuia],
  providers: [ServicioGuia, RepositorioGuia, RepositorioUsuarioActual],
})
export class ModuloGuia {}
