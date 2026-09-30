import { Module } from '@nestjs/common';
import { ControladorUsuario } from './controlador-usuario';
import { ServicioUsuario } from './servicio-usuario';
import { ServicioVerificacion } from './servicio-verificacion';
import { ServicioContrasena } from './servicio-contrasena';
import { ServicioSesion } from './servicio-sesion';
import { RepositorioUsuario } from './repositorio-usuario';
import { RepositorioToken } from './repositorio-token';
import { RepositorioSesion } from './repositorio-sesion';
import { RepositorioUsuarioActual } from '../../comun/repositorio-usuario-actual';

@Module({
  controllers: [ControladorUsuario],
  providers: [
    ServicioUsuario,
    ServicioVerificacion,
    ServicioContrasena,
    ServicioSesion,
    RepositorioUsuario,
    RepositorioToken,
    RepositorioSesion,
    RepositorioUsuarioActual,
  ],
})
export class ModuloUsuario {}

