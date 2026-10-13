import { Body, Controller, Get, Headers, Param, Patch, Post } from '@nestjs/common';
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
 *   GET  /usuarios/yo/perfil                    mis datos, para "Mi perfil"
 *   PATCH /usuarios/yo/perfil                   cambiar mi nombre
 *   POST /usuarios/verificacion                 HU-07, confirmar el correo
 *   POST /usuarios/verificacion/reenvio         HU-07, pedir otro enlace
 *   POST /usuarios/mi-contrasena                HU-10, cambiar la mia
 *   POST /usuarios/:id/restablecer-contrasena   HU-10, el propietario fuerza
 *   POST /usuarios/recuperacion-contrasena      HU-09, pedir recuperar acceso
 *   POST /usuarios/recuperacion-contrasena/ejecutar HU-09, usar el enlace
 *   POST /usuarios/colaboradores                HU-13, alta de un integrante
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
      /** HU-25. El idioma con el que trabaja y el que eligio (nulo: el del pais). */
      idioma: usuario.idioma,
      idioma_elegido: usuario.idiomaElegido,
      /** Lo que el cliente tiene que resolver antes de dejarlo pasar. */
      pendiente: !usuario.correoVerificado
        ? 'verificar_correo'
        : usuario.debeCambiarContrasena
          ? 'cambiar_contrasena'
          : null,
    };
  }

  @Get('yo/perfil')
  async perfil(
    @Headers('authorization') auth?: string,
    @Headers('x-usuario-id') usuarioId?: string,
  ) {
    return this.servicio.perfil(await this.usuarios.resolver(auth || usuarioId));
  }

  @Patch('yo/perfil')
  async actualizarPerfil(
    @Body() cuerpo: any,
    @Headers('authorization') auth?: string,
    @Headers('x-usuario-id') usuarioId?: string,
  ) {
    return this.servicio.actualizarPerfil(cuerpo, await this.usuarios.resolver(auth || usuarioId));
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
    @Headers('x-rancho-soporte') ranchoSoporte?: string,
  ) {
    // HU-24: el Admin en soporte tambien puede restablecer una clave.
    const usuario = await this.usuarios.aplicarSoporte(
      await this.usuarios.resolver(auth || usuarioId),
      ranchoSoporte,
    );
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
    @Headers('authorization') auth?: string,
    @Headers('x-usuario-id') usuarioId?: string,
  ) {
    const usuario = await this.usuarios.resolver(auth || usuarioId);
    return this.servicio.altaColaborador(cuerpo, usuario);
  }
}