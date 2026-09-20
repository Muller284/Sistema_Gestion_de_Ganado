import { Module } from '@nestjs/common';
import { ControladorRancho } from './controlador-rancho';
import { ServicioRancho } from './servicio-rancho';
import { RepositorioRancho } from './repositorio-rancho';
import { RepositorioUsuarioActual } from '../../comun/repositorio-usuario-actual';
import { GuardiaCuentaLista } from '../../comun/guardia-cuenta-lista';

@Module({
  controllers: [ControladorRancho],
  providers: [
    ServicioRancho,
    RepositorioRancho,
    RepositorioUsuarioActual,
    GuardiaCuentaLista,
  ],
})
export class ModuloRancho {}
