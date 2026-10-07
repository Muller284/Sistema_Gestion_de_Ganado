import { Module } from '@nestjs/common';
import { RepositorioUsuarioActual } from '../../comun/repositorio-usuario-actual';
import { ControladorAdmin } from './controlador-admin';
import { RepositorioAdmin } from './repositorio-admin';
import { ServicioAdmin } from './servicio-admin';

/** HU-24. RepositorioUsuarioActual lo pide GuardiaCuentaLista. */
@Module({
  controllers: [ControladorAdmin],
  providers: [ServicioAdmin, RepositorioAdmin, RepositorioUsuarioActual],
})
export class ModuloAdmin {}
