import { Module } from '@nestjs/common';
import { PermisosModulo } from '../../comun/permisos-modulo';
import { RepositorioUsuarioActual } from '../../comun/repositorio-usuario-actual';
import { ControladorCorrales } from './controlador-corrales';
import { RepositorioCorrales } from './repositorio-corrales';
import { ServicioCorrales } from './servicio-corrales';

/** HU-36. RepositorioUsuarioActual lo pide GuardiaCuentaLista. */
@Module({
  controllers: [ControladorCorrales],
  providers: [ServicioCorrales, RepositorioCorrales, PermisosModulo, RepositorioUsuarioActual],
})
export class ModuloCorrales {}
