import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { ServicioUsuario } from './servicio-usuario';
import { ServicioVerificacion } from './servicio-verificacion';
import { ServicioContrasena } from './servicio-contrasena';
import { RepositorioUsuarioActual } from '../../comun/repositorio-usuario-actual';

/**
 * Endpoints del modulo de usuarios.
 *
 *   POST /usuarios/registro                    HU-06, crear la cuenta
 *   GET  /usuarios/yo                          el estado de mi cuenta
 *   POST /usuarios/verificacion                HU-07, confirmar el correo
 *   POST /usuarios/verificacion/reenvio        HU-07, pedir otro enlace
 *   POST /usuarios/mi-contrasena               HU-10, cambiar la mia
 *   POST /usuarios/:id/restablecer-contrasena  HU-10, el propietario fuerza
 *   POST /usuarios/recuperacion-contrasena     HU-09, pedir recuperar acceso
 *   POST /usuarios/recuperacion-contrasena/ejecutar HU-09, usar el enlace
 *   POST /usuarios/colaboradores               HU-13, alta de un integrante
 *
 * NINGUNO LLEVA EL GUARDIA GuardiaCuentaLista, a proposito: este controlador
 * es justamente la salida para las dos situaciones que el guardia bloquea. Si
 * el portero cerrara tambien la salida, la cuenta quedaria encerrada.
 *
 * GET /usuarios/yo si necesita saber quien pide, pero no exige que la cuenta
 * este lista: es lo que el cliente consulta para saber a que pantalla mandar.
 */
@Controller('usuarios')
export class ControladorUsuario {
  constructor(
    private readonly servicio: ServicioUsuario,
    private readonly verificacion: ServicioVerificacion,
    private readonly contrasenas: ServicioContrasena,
    private readonly usuarios: RepositorioUsuarioActual,
  ) {}

  @Post('registro')
  async registrar(@Body() cuerpo: any) {
    return this.servicio.registrar(cuerpo);
  }

  @Get('yo')
  async yo(@Headers('x-usuario-id') usuarioId?: string) {
    const usuario = await this.usuarios.resolver(usuarioId);
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
    @Headers('x-usuario-id') usuarioId?: string,
  ) {
    const usuario = await this.usuarios.resolver(usuarioId);
    return this.contrasenas.cambiarLaMia(cuerpo, usuario);
  }

  @Post(':id/restablecer-contrasena')
  async restablecer(
    @Param('id') id: string,
    @Headers('x-usuario-id') usuarioId?: string,
  ) {
    const usuario = await this.usuarios.resolver(usuarioId);
    return this.contrasenas.restablecer(id, usuario);
  }

  /**
   * HU-09: Endpoint para pedir el enlace al correo.
   * La url será: http://localhost:3000/usuarios/recuperacion-contrasena
   */
  @Post('recuperacion-contrasena')
  async solicitarRecuperacion(@Body() cuerpo: any) {
    return this.contrasenas.solicitarRecuperacion(cuerpo);
  }

  /**
   * HU-09: Endpoint para guardar la contraseña nueva.
   * La url será: http://localhost:3000/usuarios/recuperacion-contrasena/ejecutar
   */
  @Post('recuperacion-contrasena/ejecutar')
  async ejecutarRecuperacion(@Body() cuerpo: any) {
    return this.contrasenas.ejecutarRecuperacion(cuerpo);
  }

  /**
   * HU-13: Endpoint para dar de alta a un colaborador en el rancho.
   * La url será: http://localhost:3000/usuarios/colaboradores
   */
  @Post('colaboradores')
  async altaColaborador(
    @Body() cuerpo: any,
    @Headers('x-usuario-id') usuarioId?: string,
  ) {
    const usuario = await this.usuarios.resolver(usuarioId);
    return this.servicio.altaColaborador(cuerpo, usuario);
  }
}