import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { Pool } from 'pg';
import { POOL_BD } from './modulo-base-datos';
import { verificarTokenAcceso } from './tokens';

/**
 * Quien es el usuario que esta haciendo la peticion.
 *
 * HU-08 y HU-12:
 * Resuelve la identidad a partir de un token firmado de vida corta (Bearer token),
 * o a través de la cabecera x-usuario-id / USUARIO_DEMO_ID (modo compatibilidad/desarrollo).
 */
export interface UsuarioActual {
  id: string;
  nombre: string;
  correo: string;
  rol: string;
  ranchoId: string | null;
  /** HU-07. Sin esto en verdadero, el sistema no deja hacer nada mas. */
  correoVerificado: boolean;
  /** HU-10. Con esto en verdadero, tampoco. */
  debeCambiarContrasena: boolean;
}

@Injectable()
export class RepositorioUsuarioActual {
  constructor(@Inject(POOL_BD) private readonly bd: Pool) {}

  async resolver(credencialEnCabecera?: string): Promise<UsuarioActual> {
    let id: string | undefined;

    if (credencialEnCabecera) {
      const valor = credencialEnCabecera.startsWith('Bearer ')
        ? credencialEnCabecera.slice(7).trim()
        : credencialEnCabecera.trim();

      // Si contiene puntos, es un token firmado JWT (HU-12)
      if (valor.includes('.')) {
        const payload = verificarTokenAcceso(valor);
        if (!payload) {
          throw new UnauthorizedException('Token de acceso inválido o expirado.');
        }
        id = payload.sub;
      } else {
        id = valor;
      }
    } else {
      id = process.env.USUARIO_DEMO_ID;
    }

    if (!id) {
      throw new UnauthorizedException(
        'No se indicó credencial de autenticación. Inicia sesión o envía un token válido.',
      );
    }

    const resultado = await this.bd.query(
      `SELECT id, nombre, correo, rol, rancho_id,
              correo_verificado, debe_cambiar_contrasena
         FROM usuarios
        WHERE id = $1 AND eliminado_en IS NULL AND estado = 'activo'`,
      [id],
    );
    const fila = resultado.rows[0];
    if (!fila) {
      throw new UnauthorizedException('El usuario indicado no existe o no está activo.');
    }

    return {
      id: fila.id,
      nombre: fila.nombre,
      correo: fila.correo,
      rol: fila.rol,
      ranchoId: fila.rancho_id,
      correoVerificado: fila.correo_verificado,
      debeCambiarContrasena: fila.debe_cambiar_contrasena,
    };
  }
}

