import { Module } from '@nestjs/common';
import { RepositorioUsuarioActual } from '../../comun/repositorio-usuario-actual';
import { RepositorioSesion } from '../usuarios/repositorio-sesion';
import { ControladorEquipo } from './controlador-equipo';
import { RepositorioEquipo } from './repositorio-equipo';
import { ServicioEquipo } from './servicio-equipo';

/** HU-17. RepositorioSesion es el de HU-12: suspender cierra las sesiones. */
@Module({
  controllers: [ControladorEquipo],
  providers: [ServicioEquipo, RepositorioEquipo, RepositorioSesion, RepositorioUsuarioActual],
})
export class ModuloEquipo {}
