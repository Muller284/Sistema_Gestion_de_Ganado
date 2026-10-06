import { Module } from '@nestjs/common';
import { RepositorioUsuarioActual } from '../../comun/repositorio-usuario-actual';
import { ControladorTipos } from './controlador-tipos';
import { RepositorioTipos } from './repositorio-tipos';
import { ServicioTipos } from './servicio-tipos';

/** HU-20. RepositorioUsuarioActual lo pide GuardiaCuentaLista. */
@Module({
  controllers: [ControladorTipos],
  providers: [ServicioTipos, RepositorioTipos, RepositorioUsuarioActual],
})
export class ModuloTipos {}
