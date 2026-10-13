import { Body, Controller, Get, Headers, Param, Patch, Post, HttpException, HttpStatus } from '@nestjs/common';
import { ServicioUsuario } from './servicio-usuario';
import { ServicioVerificacion } from './servicio-verificacion';
import { ServicioContrasena } from './servicio-contrasena';
import { ServicioSesion } from './servicio-sesion';
import { RepositorioUsuarioActual } from '../../comun/repositorio-usuario-actual';
import { DataSource } from 'typeorm';

@Controller('usuarios')
export class ControladorUsuario {
  constructor(
    private readonly servicio: ServicioUsuario,
    private readonly verificacion: ServicioVerificacion,
    private readonly contrasenas: ServicioContrasena,
    private readonly sesiones: ServicioSesion,
    private readonly usuarios: RepositorioUsuarioActual,
    private readonly dataSource: DataSource, // <--- Inyectamos DataSource aquí directamente
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
      idioma: usuario.idioma,
      idioma_elegido: usuario.idiomaElegido,
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
    const usuario = await this.usuarios.aplicarSoporte(
      await this.usuarios.resolver(auth || usuarioId),
      ranchoSoporte,
    );
    return this.contrasenas.restablecer(id, usuario);
  }

  @Post('recuperacion-contrasena')
  async solicitarRecuperacion(@Body() cuerpo: any) {
    return this.contrasenas.solicitarRecuperacion(cuerpo);
  }

  @Post('recuperacion-contrasena/ejecutar')
  async ejecutarRecuperacion(@Body() cuerpo: any) {
    return this.contrasenas.ejecutarRecuperacion(cuerpo);
  }

  @Post('colaboradores')
  async altaColaborador(
    @Body() cuerpo: any,
    @Headers('authorization') auth?: string,
    @Headers('x-usuario-id') usuarioId?: string,
  ) {
    const usuario = await this.usuarios.resolver(auth || usuarioId);
    return this.servicio.altaColaborador(cuerpo, usuario);
  }

  /**
   * HU-18: Endpoint para actualizar y persistir los permisos de un colaborador en la base de datos.
   */
  @Patch(':id/permisos')
  async actualizarPermisos(
    @Param('id') id: string,
    @Body() cuerpo: any,
    @Headers('authorization') auth?: string,
    @Headers('x-usuario-id') usuarioId?: string,
  ) {
    const usuarioActual = await this.usuarios.resolver(auth || usuarioId);
    
    if (
      usuarioActual.rol !== 'propietario' && 
      usuarioActual.rol !== 'admin' && 
      usuarioActual.rol !== 'admin_plataforma'
    ) {
      throw new HttpException(
        { mensaje: 'Acción no autorizada. Solo el Propietario o Administrador pueden modificar permisos.' },
        HttpStatus.FORBIDDEN,
      );
    }

    const permisosJson = typeof cuerpo.permisos === 'string' ? cuerpo.permisos : JSON.stringify(cuerpo.permisos);

    // Usamos el DataSource inyectado correctamente en el controlador
    await this.dataSource.query(
      `UPDATE usuarios SET permisos = $1 WHERE id = $2 AND rancho_id = $3`,
      [permisosJson, id, usuarioActual.ranchoId]
    );

    return { mensaje: 'Permisos actualizados y guardados en la base de datos correctamente.' };
  }
}