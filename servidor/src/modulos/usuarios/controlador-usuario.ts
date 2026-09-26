import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { ServicioUsuario } from './servicio-usuario';
import { ServicioVerificacion } from './servicio-verificacion';
import { ServicioContrasena } from './servicio-contrasena';
import { ServicioSesion } from './servicio-sesion';
import { RepositorioUsuarioActual } from '../../comun/repositorio-usuario-actual';

/**
 * Endpoints del modulo de usuarios.
 *
 *   POST /usuarios/registro                     HU-06, crear la cuenta
 *   POST /usuarios/ingreso                      HU-08, inicio de sesión
 *   POST /usuarios/refresco                     HU-12, refrescar sesión
 *   POST /usuarios/cierre                       HU-12, cierre de sesión
 *   GET  /usuarios/yo                           el estado de mi cuenta
 *   POST /usuarios/verificacion                 HU-07, confirmar el correo
 *   POST /usuarios/verificacion/reenvio         HU-07, pedir otro enlace
 *   POST /usuarios/mi-contrasena                HU-10, cambiar la mia
 *   POST /usuarios/:id/restablecer-contrasena   HU-10, el propietario fuerza
 */
@Controller('usuarios')
export class ControladorUsuario {
  constructor(
    private readonly servicio: ServicioUsuario,
    private readonly verificacion: ServicioVerificacion,
    private readonly contrasenas: ServicioContrasena,
    private readonly sesiones: ServicioSesion,
    private readonly usuarios: RepositorioUsuarioActual,
  ) {}

  @Post('registro')
  async registrar(@Body() cuerpo: any) {
    return this.servicio.registrar(cuerpo);
  }

  @Post('ingreso')
  async ingresar(
    @Body() cuerpo: any,
    @Headers('user-agent') agenteUsuario?: string,
  ) {
    return this.sesiones.iniciar(cuerpo, agenteUsuario);
  }

  @Post('refresco')
  async refrescar(@Body() cuerpo: any) {
    return this.sesiones.refrescar(cuerpo?.token_refresco);
  }

  @Post('cierre')
  async cerrar(
    @Body() cuerpo: any,
    @Headers('authorization') auth?: string,
    @Headers('x-usuario-id') usuarioId?: string,
  ) {
    let uid: string | undefined;
    try {
      const u = await this.usuarios.resolver(auth || usuarioId);
      uid = u?.id;
    } catch {
      // Si el token ya venció, se revoca igual por el token_refresco del cuerpo
    }
    return this.sesiones.cerrar(cuerpo, uid);
  }

  @Get('yo')
  async yo(
    @Headers('authorization') auth?: string,
    @Headers('x-usuario-id') usuarioId?: string,
  ) {
    const usuario = await this.usuarios.resolver(auth || usuarioId);
    return {
      id: usuario.id,
      nombre: usuario.nombre,
      correo: usuario.correo,
      rol: usuario.rol,
      rancho_id: usuario.ranchoId,
      correo_verificado: usuario.correoVerificado,
      debe_cambiar_contrasena: usuario.debeCambiarContrasena,
      /** Lo que el cliente tiene que resolver antes de dejarlo pasar. */
      pendiente: !usuario.correoVerificado
        ? 'verificar_correo'
        : usuario.debeCambiarContrasena
          ? 'cambiar_contrasena'
          : null,
    };
  }

  @Post('verificacion')
  async verificar(@Body() cuerpo: any) {
    return this.verificacion.confirmar(cuerpo?.token);
  }

  @Post('verificacion/reenvio')
  async reenviar(@Body() cuerpo: any) {
    return this.verificacion.reenviar(cuerpo?.correo);
  }

  @Post('mi-contrasena')
  async cambiarMiContrasena(
    @Body() cuerpo: any,
    @Headers('authorization') auth?: string,
    @Headers('x-usuario-id') usuarioId?: string,
  ) {
    const usuario = await this.usuarios.resolver(auth || usuarioId);
    return this.contrasenas.cambiarLaMia(cuerpo, usuario);
  }

  @Post(':id/restablecer-contrasena')
  async restablecer(
    @Param('id') id: string,
    @Headers('authorization') auth?: string,
    @Headers('x-usuario-id') usuarioId?: string,
  ) {
    const usuario = await this.usuarios.resolver(auth || usuarioId);
    return this.contrasenas.restablecer(id, usuario);
  }
}
