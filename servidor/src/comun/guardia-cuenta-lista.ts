import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { RepositorioUsuarioActual } from './repositorio-usuario-actual';

/**
 * El portero del sistema.
 *
 * Impone dos criterios de aceptacion que son de historias distintas pero que
 * en la practica son la misma regla: hay cosas que hay que resolver antes de
 * poder usar el sistema.
 *
 *   HU-07: "Sin confirmar el correo no se puede usar el sistema."
 *   HU-10: "No puedo llegar a ninguna otra pantalla antes de cambiarla."
 *
 * POR QUE EN EL SERVIDOR Y NO SOLO EN EL CLIENTE
 * El cliente tambien lo impide, pero eso es comodidad, no seguridad: cualquiera
 * puede llamar al servidor sin pasar por la pantalla. Si la regla no esta aca,
 * no esta.
 *
 * COMO SE USA
 * Se pone en los controladores que manejan datos del rancho. NO se pone en el
 * de usuarios, porque ahi viven justamente las dos salidas: confirmar el
 * correo y cambiar la contraseña. Un portero que tambien cerrara la salida
 * dejaria a la cuenta encerrada para siempre.
 *
 * La respuesta lleva un campo "motivo" para que el cliente sepa a que pantalla
 * mandar al usuario sin tener que interpretar el texto del mensaje.
 */
@Injectable()
export class GuardiaCuentaLista implements CanActivate {
  constructor(private readonly usuarios: RepositorioUsuarioActual) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const peticion = contexto.switchToHttp().getRequest();
    const usuario = await this.usuarios.resolver(peticion.headers['x-usuario-id']);

    if (!usuario.correoVerificado) {
      throw new ForbiddenException({
        motivo: 'correo_sin_verificar',
        message:
          'Confirma tu correo para poder usar el sistema. Puedes pedir que te reenviemos el enlace.',
      });
    }

    if (usuario.debeCambiarContrasena) {
      throw new ForbiddenException({
        motivo: 'debe_cambiar_contrasena',
        message: 'Cambia tu contraseña temporal para poder usar el sistema.',
      });
    }

    // Se guarda para que el controlador no tenga que resolverlo otra vez.
    peticion.usuarioActual = usuario;
    return true;
  }
}
