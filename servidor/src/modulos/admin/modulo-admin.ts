import { Module } from '@nestjs/common';
import { RepositorioUsuarioActual } from '../../comun/repositorio-usuario-actual';
import { RepositorioSesion } from '../usuarios/repositorio-sesion';
import { RepositorioToken } from '../usuarios/repositorio-token';
import { ControladorAdmin } from './controlador-admin';
import { RepositorioAdmin } from './repositorio-admin';
import { RepositorioAuditoria, RepositorioPanelAdmin } from './repositorio-panel-admin';
import { ServicioAdmin } from './servicio-admin';
import { ServicioPanelAdmin } from './servicio-panel-admin';

/**
 * HU-24 y fase 4 (panel del Admin). RepositorioUsuarioActual lo pide
 * GuardiaCuentaLista; RepositorioSesion y RepositorioToken son los de
 * usuarios: suspender cierra las sesiones y el enlace de contraseña es el de
 * HU-09.
 */
@Module({
  controllers: [ControladorAdmin],
  providers: [
    ServicioAdmin,
    ServicioPanelAdmin,
    RepositorioAdmin,
    RepositorioPanelAdmin,
    RepositorioAuditoria,
    RepositorioSesion,
    RepositorioToken,
    RepositorioUsuarioActual,
  ],
})
export class ModuloAdmin {}
