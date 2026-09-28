import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { Pool } from 'pg';
import { POOL_BD } from './modulo-base-datos';

/**
 * Quien es el usuario que esta haciendo la peticion.
 *
 * PROVISIONAL, A PROPOSITO. El inicio de sesion es HU-08 y el manejo de
 * sesion es HU-12, las dos de Favio, y ninguna entra en la demostracion del
 * miercoles. Hasta que existan, el usuario se indica con la cabecera
 * x-usuario-id, o se toma el de USUARIO_DEMO_ID del archivo .env.
 *
 * Cuando HU-08 y HU-12 esten listas, se reemplaza el cuerpo de este archivo
 * por la lectura del token y no hay que tocar nada mas: el resto del codigo
 * solo conoce la interfaz UsuarioActual.
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

  async resolver(idEnCabecera?: string): Promise<UsuarioActual> {
    const id = idEnCabecera || process.env.USUARIO_DEMO_ID;
    if (!id) {
      throw new UnauthorizedException(
        'No se indico el usuario. Envia la cabecera x-usuario-id o define USUARIO_DEMO_ID en el .env.',
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
      throw new UnauthorizedException('El usuario indicado no existe o no esta activo.');
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
