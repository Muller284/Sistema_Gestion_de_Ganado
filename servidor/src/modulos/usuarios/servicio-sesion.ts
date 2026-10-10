import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { verificarContrasena } from '../../comun/contrasenas';
import { firmarTokenAcceso } from '../../comun/tokens';
import { RepositorioUsuario } from './repositorio-usuario';
import { RepositorioSesion } from './repositorio-sesion';

/**
 * Servicio de Autenticación y Manejo de Sesión.
 *
 * HU-08: Inicio de sesión con correo y contraseña.
 * HU-12: Manejo de sesión con token firmado de vida corta y token de refresco revocable.
 */
@Injectable()
export class ServicioSesion {
  constructor(
    private readonly usuarios: RepositorioUsuario,
    private readonly sesiones: RepositorioSesion,
  ) {}

  /**
   * HU-08: Inicio de sesión.
   *
   * Criterios:
   * 1. Si las credenciales son correctas entra al sistema.
   * 2. Si no lo son, el mensaje no revela si el error fue el correo o la contraseña.
   * 3. Las contraseñas se guardan con función de hash (scrypt), nunca en plano.
   *
   * Integración con HU-11:
   * - Bloqueo tras 5 intentos fallidos consecutivos por 15 minutos.
   */
  async iniciar(cuerpo: any, agenteUsuario?: string) {
    const correo =
      typeof cuerpo?.correo === 'string' ? cuerpo.correo.trim().toLowerCase() : '';
    const contrasena =
      typeof cuerpo?.contrasena === 'string' ? cuerpo.contrasena : '';

    if (!correo || !contrasena) {
      throw new BadRequestException('Debes indicar correo y contraseña.');
    }

    // Verificar si la cuenta se encuentra bloqueada por intentos fallidos (HU-11)
    const bloqueo = await this.usuarios.estaBloqueado(correo);
    if (bloqueo.bloqueado && bloqueo.bloqueadoHasta) {
      const minutosRestantes = Math.max(
        1,
        Math.ceil((bloqueo.bloqueadoHasta.getTime() - Date.now()) / 60000),
      );
      throw new UnauthorizedException(
        `Cuenta temporalmente bloqueada por exceso de intentos fallidos. Intente nuevamente en ${minutosRestantes} minutos.`,
      );
    }

    const usuario = await this.usuarios.buscarParaAutenticar(correo);

    if (!usuario) {
      // Criterio 2: El mensaje no revela si el error fue el correo o la contraseña
      throw new UnauthorizedException('Correo o contraseña incorrectos.');
    }

    if (usuario.estado !== 'activo') {
      throw new UnauthorizedException('La cuenta se encuentra suspendida.');
    }

    // Verificar contraseña contra el hash scrypt guardado (HU-08 Criterio 3)
    const contrasenaValida = await verificarContrasena(
      contrasena,
      usuario.contrasena_hash,
    );

    if (!contrasenaValida) {
      const intento = await this.usuarios.registrarIntentoFallido(correo);
      if (intento.bloqueado) {
        throw new UnauthorizedException(
          'Cuenta temporalmente bloqueada por exceso de intentos fallidos. Intente nuevamente en 15 minutos.',
        );
      }
      // Criterio 2: Mensaje genérico seguro
      throw new UnauthorizedException('Correo o contraseña incorrectos.');
    }

    // Ingreso correcto: se reinicia el contador de intentos fallidos
    await this.usuarios.reiniciarIntentosFallidos(usuario.id);

    // HU-12: Crear sesión con token de refresco revocable (expira en 30 días sin actividad)
    const sesion = await this.sesiones.crear(usuario.id, agenteUsuario, 30);

    // HU-12: Emitir token firmado de vida corta (15 minutos)
    const tokenAcceso = firmarTokenAcceso({
      sub: usuario.id,
      correo: usuario.correo,
      rol: usuario.rol,
      ranchoId: usuario.rancho_id,
    });

    return {
      token_acceso: tokenAcceso,
      token_refresco: sesion.tokenRefresco,
      expira_en: sesion.expiraEn,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        rol: usuario.rol,
        rancho_id: usuario.rancho_id,
        correo_verificado: usuario.correo_verificado,
        debe_cambiar_contrasena: usuario.debe_cambiar_contrasena,
      },
    };
  }

  /**
   * HU-12: Refresco de sesión.
   *
   * Criterios:
   * - La sesión expira tras 30 días sin actividad.
   * - Extiende la vigencia a 30 días a partir de este uso.
   * - Emite un nuevo token firmado de acceso.
   */
  async refrescar(tokenRefresco?: string) {
    if (!tokenRefresco) {
      throw new UnauthorizedException('Falta el token de refresco.');
    }

    const sesion = await this.sesiones.buscarPorTokenRefresco(tokenRefresco);
    if (!sesion || sesion.revocada_en) {
      throw new UnauthorizedException('La sesión ha sido revocada o no es válida.');
    }

    const ahora = new Date();
    if (new Date(sesion.expira_en) <= ahora) {
      throw new UnauthorizedException(
        'La sesión expiró tras 30 días sin actividad. Inicia sesión nuevamente.',
      );
    }

    const usuario = await this.usuarios.porId(sesion.usuario_id);
    if (!usuario || usuario.estado !== 'activo') {
      throw new UnauthorizedException('Usuario no encontrado o inactivo.');
    }

    // Actualiza el último uso y amplía 30 días la fecha de expiración
    const nuevaExpiraEn = await this.sesiones.actualizarActividad(sesion.id, 30);

    const nuevoTokenAcceso = firmarTokenAcceso({
      sub: usuario.id,
      correo: usuario.correo,
      rol: usuario.rol,
      ranchoId: usuario.rancho_id,
    });

    return {
      token_acceso: nuevoTokenAcceso,
      token_refresco: tokenRefresco,
      expira_en: nuevaExpiraEn,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        rol: usuario.rol,
        rancho_id: usuario.rancho_id,
        correo_verificado: usuario.correo_verificado,
        debe_cambiar_contrasena: usuario.debe_cambiar_contrasena,
      },
    };
  }

  /**
   * HU-12: Cierre de sesión manual.
   * Invalida la sesión de inmediato.
   */
  async cerrar(cuerpo: { token_refresco?: string }, usuarioId?: string) {
    if (cuerpo?.token_refresco) {
      await this.sesiones.revocarPorToken(cuerpo.token_refresco);
    } else if (usuarioId) {
      await this.sesiones.revocarTodasDeUsuario(usuarioId);
    }
    return { mensaje: 'Sesión cerrada correctamente.' };
  }
}
