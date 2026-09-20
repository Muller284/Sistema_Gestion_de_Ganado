import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomInt } from 'crypto';
import { RepositorioUsuario } from './repositorio-usuario';
import { ServicioCorreo } from '../../comun/servicio-correo';
import {
  cifrarContrasena,
  enumerar,
  revisarContrasena,
  verificarContrasena,
} from '../../comun/contrasenas';
import type { UsuarioActual } from '../../comun/repositorio-usuario-actual';

/**
 * HU-10 · Cambio obligatorio de contraseña.
 *
 * Los tres criterios de aceptacion:
 *   1. No puedo llegar a ninguna otra pantalla antes de cambiarla.
 *      → Lo impone GuardiaCuentaLista, en comun/. Aca esta el cambio en si.
 *   2. La contraseña nueva no puede ser igual a la temporal.
 *   3. El propietario nunca puede ver la contraseña, solo forzar un
 *      restablecimiento.
 *      → restablecer() genera la clave, se la manda por correo al usuario y
 *        NO la devuelve en la respuesta. El propietario ve "listo", nada mas.
 */

/** Sin caracteres que se confundan al dictarla: ni O ni 0, ni l ni 1. */
const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

function claveTemporal(): string {
  // 12 caracteres del alfabeto de arriba, mas una mayuscula y un numero
  // asegurados, para que cumpla las mismas reglas que exige el sistema.
  let clave = '';
  for (let i = 0; i < 10; i++) {
    clave += ALFABETO[randomInt(ALFABETO.length)];
  }
  clave += 'ABCDEFGHJKMNPQRSTUVWXYZ'[randomInt(23)];
  clave += '23456789'[randomInt(8)];
  return clave;
}

@Injectable()
export class ServicioContrasena {
  constructor(
    private readonly usuarios: RepositorioUsuario,
    private readonly correo: ServicioCorreo,
  ) {}

  /** El usuario cambia su propia contraseña. Es lo que desbloquea la cuenta. */
  async cambiarLaMia(cuerpo: any, quien: UsuarioActual) {
    const actual = typeof cuerpo?.contrasena_actual === 'string' ? cuerpo.contrasena_actual : '';
    const nueva = typeof cuerpo?.contrasena_nueva === 'string' ? cuerpo.contrasena_nueva : '';

    if (!actual || !nueva) {
      throw new BadRequestException(
        'Hacen falta la contraseña actual y la nueva.',
      );
    }

    const usuario = await this.usuarios.porId(quien.id);
    if (!usuario) throw new NotFoundException('El usuario no existe.');

    // Se pide la actual aunque el usuario ya este identificado: es lo que
    // impide que alguien que encontro una sesion abierta cambie la clave.
    if (!(await verificarContrasena(actual, usuario.contrasena_hash))) {
      throw new UnauthorizedException('La contraseña actual no es correcta.');
    }

    // Segundo criterio.
    if (actual === nueva) {
      throw new BadRequestException(
        'La contraseña nueva no puede ser igual a la temporal.',
      );
    }

    const faltas = revisarContrasena(nueva);
    if (faltas.length > 0) {
      throw new BadRequestException(
        `La contraseña necesita al menos ${enumerar(faltas)}.`,
      );
    }

    await this.usuarios.cambiarContrasena(
      quien.id,
      await cifrarContrasena(nueva),
      quien.id,
    );

    return { mensaje: 'Contraseña actualizada. Ya puedes usar el sistema.' };
  }

  /**
   * Tercer criterio. El propietario fuerza un restablecimiento.
   *
   * La clave generada NO vuelve en la respuesta: se le manda por correo al
   * dueño de la cuenta. El propietario solo se entera de que se hizo. Eso es
   * lo que da valor al registro de quien cargo cada dato (HU-23): si el
   * propietario pudiera ver la clave de su colaborador, el nombre en
   * "creado por" no probaria nada.
   */
  async restablecer(usuarioId: string, quien: UsuarioActual) {
    if (quien.rol !== 'propietario') {
      throw new ForbiddenException(
        'Solo el propietario puede restablecer la contraseña de su equipo.',
      );
    }

    const usuario = await this.usuarios.porId(usuarioId);
    if (!usuario || usuario.rancho_id !== quien.ranchoId) {
      // Mismo mensaje que si no existiera: un propietario no tiene por que
      // poder averiguar quien pertenece a otro rancho.
      throw new NotFoundException('Ese usuario no pertenece a tu rancho.');
    }
    if (usuario.id === quien.id) {
      throw new BadRequestException(
        'Para cambiar tu propia contraseña usa el cambio de contraseña, no el restablecimiento.',
      );
    }

    const temporal = claveTemporal();
    await this.usuarios.ponerContrasenaTemporal(
      usuario.id,
      await cifrarContrasena(temporal),
      quien.id,
    );

    await this.correo.enviar({
      para: usuario.correo,
      asunto: 'Tu contraseña temporal — Sistema de Gestión de Ganado',
      cuerpo: [
        `Hola ${usuario.nombre},`,
        '',
        `${quien.nombre} restableció tu contraseña. Entra con la clave temporal`,
        'de abajo. El sistema te va a pedir que la cambies antes de dejarte',
        'hacer cualquier otra cosa.',
      ].join('\n'),
      destacado: `Contraseña temporal: ${temporal}`,
    });

    return {
      mensaje: `Se le envió una contraseña temporal a ${usuario.correo}.`,
      aviso: 'Por seguridad, la contraseña no se muestra acá. Solo la recibe su dueño.',
    };
  }
}
