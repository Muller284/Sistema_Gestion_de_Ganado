import { Module } from '@nestjs/common';
import { PermisosModulo } from '../../comun/permisos-modulo';
import { RepositorioUsuarioActual } from '../../comun/repositorio-usuario-actual';
import { ControladorIndicadores } from './controlador-indicadores';
import { RepositorioIndicadores } from './repositorio-indicadores';
import { ServicioIndicadores } from './servicio-indicadores';

/** HU-56, HU-57 y HU-58. RepositorioUsuarioActual lo pide GuardiaCuentaLista. */
@Module({
  controllers: [ControladorIndicadores],
  providers: [ServicioIndicadores, RepositorioIndicadores, PermisosModulo, RepositorioUsuarioActual],
})
export class ModuloIndicadores {}
