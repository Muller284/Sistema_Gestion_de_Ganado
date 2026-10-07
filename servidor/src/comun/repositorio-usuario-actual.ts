import { ForbiddenException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { Pool } from 'pg';
import { POOL_BD } from './modulo-base-datos';
import { verificarTokenAcceso } from './tokens';
import { t } from './idioma';

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
  /**
   * HU-25. El idioma con el que trabaja: el que eligio, o el de su pais, o el
   * del pais de su rancho. idiomaElegido es solo el que eligio (o nulo).
   */
  idioma: string;
  idiomaElegido: string | null;
  /**
   * HU-24. Solo para el Admin de plataforma que entro a un rancho a dar
   * soporte: el acceso registrado que lo habilita. Mientras dure, ranchoId es
   * el de ese rancho y puede lo mismo que su propietario.
   */
  soporte: { accesoId: string; motivo: string } | null;
}

/** HU-24. Cuanto dura abierto un acceso de soporte si el Admin no sale. */
export const HORAS_DE_SOPORTE = 8;

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
          throw new UnauthorizedException(t('servidor.sesion.tokenInvalido'));
        }
        id = payload.sub;
      } else {
        id = valor;
      }
    } else {
      id = process.env.USUARIO_DEMO_ID;
    }

    if (!id) {
      throw new UnauthorizedException(t('servidor.sesion.sinCredencial'));
    }
    

    const resultado = await this.bd.query(
      `SELECT u.id, u.nombre, u.correo, u.rol, u.rancho_id,
              u.correo_verificado, u.debe_cambiar_contrasena,
              u.idioma AS idioma_elegido,
              COALESCE(u.idioma, pu.idioma, pr.idioma, 'es') AS idioma
         FROM usuarios u
         LEFT JOIN paises pu ON pu.codigo = u.pais_codigo
         LEFT JOIN ranchos r ON r.id = u.rancho_id
         LEFT JOIN paises pr ON pr.codigo = r.pais_codigo
        WHERE u.id = $1 AND u.eliminado_en IS NULL AND u.estado = 'activo'`,
      [id],
    );
    const fila = resultado.rows[0];
    if (!fila) {
      throw new UnauthorizedException(t('servidor.sesion.usuarioNoActivo'));
    }

    return {
      id: fila.id,
      nombre: fila.nombre,
      correo: fila.correo,
      rol: fila.rol,
      ranchoId: fila.rancho_id,
      correoVerificado: fila.correo_verificado,
      debeCambiarContrasena: fila.debe_cambiar_contrasena,
      idioma: fila.idioma,
      idiomaElegido: fila.idioma_elegido,
      soporte: null,
    };
  }

  /**
   * HU-24. Si el Admin de plataforma pide algo de un rancho (cabecera
   * x-rancho-soporte), tiene que haber entrado antes y su acceso tiene que
   * seguir abierto. Si es asi, trabaja dentro de ese rancho; si no, no ve
   * nada. Para cualquier otro rol la cabecera no cambia nada.
   */
  async aplicarSoporte(usuario: UsuarioActual, ranchoPedido?: string): Promise<UsuarioActual> {
    if (usuario.rol !== 'admin_plataforma' || !ranchoPedido) return usuario;

    const resultado = await this.bd.query(
      `SELECT id, motivo FROM accesos_admin
        WHERE admin_id = $1 AND rancho_id = $2
          AND salido_en IS NULL AND eliminado_en IS NULL
          AND entrado_en > CURRENT_TIMESTAMP - make_interval(hours => $3)
        ORDER BY entrado_en DESC
        LIMIT 1`,
      [usuario.id, ranchoPedido, HORAS_DE_SOPORTE],
    );
    const acceso = resultado.rows[0];
    if (!acceso) {
      throw new ForbiddenException({
        motivo: 'soporte_vencido',
        message: t('servidor.admin.soporteVencido'),
      });
    }
    return { ...usuario, ranchoId: ranchoPedido, soporte: { accesoId: acceso.id, motivo: acceso.motivo } };
  }
}

