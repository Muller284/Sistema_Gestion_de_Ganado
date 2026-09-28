import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { POOL_BD } from '../../comun/modulo-base-datos';

/**
 * HU-06 · Acceso a datos del registro de propietarios.
 *
 * Es el unico lugar donde se escribe SQL sobre usuarios para el registro, que
 * es la convencion del equipo: ninguna consulta se escribe fuera de la capa de
 * repositorio.
 *
 * POR QUE NO HEREDA DE RepositorioBase
 * Por lo mismo que RepositorioRancho: RepositorioBase impone el filtro por
 * rancho, y aca todavia no hay rancho. El propietario se registra antes de
 * crear el suyo, asi que su fila nace con rancho_id nulo. El aislamiento no se
 * pierde: esta clase solo sabe crear una cuenta y buscar por correo, nunca
 * leer datos productivos.
 */
@Injectable()
export class RepositorioUsuario {
  constructor(@Inject(POOL_BD) private readonly bd: Pool) {}

  /**
   * El correo es unico en toda la plataforma, no por rancho (HU-13). Se compara
   * en minuscula, igual que el indice ux_usuarios_correo.
   */
  async existeCorreo(correo: string): Promise<boolean> {
    const resultado = await this.bd.query(
      `SELECT 1
         FROM usuarios
        WHERE LOWER(correo) = LOWER($1)
          AND eliminado_en IS NULL
        LIMIT 1`,
      [correo],
    );
    return (resultado.rowCount ?? 0) > 0;
  }

  async existePais(codigo: string): Promise<boolean> {
    const resultado = await this.bd.query(
      'SELECT 1 FROM paises WHERE codigo = $1 AND eliminado_en IS NULL',
      [codigo],
    );
    return (resultado.rowCount ?? 0) > 0;
  }

  /**
   * Crea la cuenta del propietario.
   *
   *   rol                     propietario, siempre. Un registro publico no
   *                           puede crear socios, colaboradores ni admins.
   *   rancho_id               nulo: el rancho se crea despues, en HU-15.
   *   correo_verificado       falso: lo pone en verdadero HU-07.
   *   debe_cambiar_contrasena falso: eligio su propia contraseña. Solo es
   *                           verdadero para las cuentas que crea el
   *                           propietario con una clave temporal (HU-10).
   *   creado_por              el mismo usuario: nadie lo dio de alta.
   */
  async crearPropietario(datos: {
    id: string;
    nombre: string;
    correo: string;
    contrasenaHash: string;
    paisCodigo: string;
  }): Promise<any> {
    const resultado = await this.bd.query(
      `INSERT INTO usuarios
         (id, nombre, correo, contrasena_hash, pais_codigo,
          rol, rancho_id, correo_verificado, debe_cambiar_contrasena,
          estado, creado_por, modificado_por)
       VALUES
         ($1, $2, $3, $4, $5,
          'propietario', NULL, FALSE, FALSE,
          'activo', $1, $1)
       RETURNING id, nombre, correo, rol, pais_codigo,
                 correo_verificado, rancho_id, creado_en`,
      [
        datos.id,
        datos.nombre,
        datos.correo,
        datos.contrasenaHash,
        datos.paisCodigo,
      ],
    );
    return resultado.rows[0];
  }

  /** La ficha que necesitan HU-07 y HU-10 para decidir. */
  async porId(id: string): Promise<any | null> {
    const resultado = await this.bd.query(
      `SELECT id, nombre, correo, rol, rancho_id, pais_codigo,
              correo_verificado, debe_cambiar_contrasena, estado, contrasena_hash
         FROM usuarios
        WHERE id = $1 AND eliminado_en IS NULL`,
      [id],
    );
    return resultado.rows[0] ?? null;
  }

  async porCorreo(correo: string): Promise<any | null> {
    const resultado = await this.bd.query(
      `SELECT id, nombre, correo, correo_verificado
         FROM usuarios
        WHERE LOWER(correo) = LOWER($1) AND eliminado_en IS NULL`,
      [correo],
    );
    return resultado.rows[0] ?? null;
  }

  /** HU-07. Solo lo llama el servicio de verificacion, con un token consumido. */
  async marcarCorreoVerificado(usuarioId: string): Promise<void> {
    await this.bd.query(
      `UPDATE usuarios
          SET correo_verificado = TRUE,
              modificado_en = CURRENT_TIMESTAMP,
              modificado_por = $1
        WHERE id = $1`,
      [usuarioId],
    );
  }

  /**
   * HU-10. Guarda la contraseña nueva y apaga la obligacion de cambiarla.
   * El hash llega ya calculado: esta clase nunca ve una contraseña en claro.
   */
  async cambiarContrasena(
    usuarioId: string,
    contrasenaHash: string,
    autorId: string,
  ): Promise<void> {
    await this.bd.query(
      `UPDATE usuarios
          SET contrasena_hash = $2,
              debe_cambiar_contrasena = FALSE,
              modificado_en = CURRENT_TIMESTAMP,
              modificado_por = $3
        WHERE id = $1`,
      [usuarioId, contrasenaHash, autorId],
    );
  }

  /**
   * HU-10. El propietario fuerza un restablecimiento: se guarda una clave
   * temporal nueva y queda la obligacion de cambiarla al entrar.
   */
  async ponerContrasenaTemporal(
    usuarioId: string,
    contrasenaHash: string,
    autorId: string,
  ): Promise<void> {
    await this.bd.query(
      `UPDATE usuarios
          SET contrasena_hash = $2,
              debe_cambiar_contrasena = TRUE,
              modificado_en = CURRENT_TIMESTAMP,
              modificado_por = $3
        WHERE id = $1`,
      [usuarioId, contrasenaHash, autorId],
    );
  }

  /**
   * HU-11. Registra un intento fallido de autenticación.
   * Tras cinco intentos fallidos consecutivos, bloquea el acceso por 15 minutos.
   */
  async registrarIntentoFallido(correo: string): Promise<{
    bloqueado: boolean;
    bloqueadoHasta: Date | null;
    intentos: number;
  }> {
    const usuario = await this.bd.query(
      `SELECT id, intentos_fallidos, bloqueado_hasta
         FROM usuarios
        WHERE LOWER(correo) = LOWER($1) AND eliminado_en IS NULL`,
      [correo],
    );

    if ((usuario.rowCount ?? 0) === 0) {
      return { bloqueado: false, bloqueadoHasta: null, intentos: 0 };
    }

    const { id, intentos_fallidos } = usuario.rows[0];
    const nuevosIntentos = (intentos_fallidos || 0) + 1;

    if (nuevosIntentos >= 5) {
      const resultado = await this.bd.query(
        `UPDATE usuarios
            SET intentos_fallidos = $2,
                bloqueado_hasta = CURRENT_TIMESTAMP + INTERVAL '15 minutes',
                modificado_en = CURRENT_TIMESTAMP
          WHERE id = $1
          RETURNING bloqueado_hasta`,
        [id, nuevosIntentos],
      );
      return {
        bloqueado: true,
        bloqueadoHasta: resultado.rows[0].bloqueado_hasta,
        intentos: nuevosIntentos,
      };
    }

    await this.bd.query(
      `UPDATE usuarios
          SET intentos_fallidos = $2,
              modificado_en = CURRENT_TIMESTAMP
        WHERE id = $1`,
      [id, nuevosIntentos],
    );

    return {
      bloqueado: false,
      bloqueadoHasta: null,
      intentos: nuevosIntentos,
    };
  }

  /**
   * HU-11. Reinicia el contador de intentos fallidos y el bloqueo tras un ingreso exitoso.
   */
  async reiniciarIntentosFallidos(usuarioId: string): Promise<void> {
    await this.bd.query(
      `UPDATE usuarios
          SET intentos_fallidos = 0,
              bloqueado_hasta = NULL,
              modificado_en = CURRENT_TIMESTAMP
        WHERE id = $1`,
      [usuarioId],
    );
  }

  /**
   * HU-11. Comprueba si una cuenta se encuentra actualmente bloqueada por intentos fallidos.
   */
  async estaBloqueado(correo: string): Promise<{
    bloqueado: boolean;
    bloqueadoHasta: Date | null;
  }> {
    const resultado = await this.bd.query(
      `SELECT bloqueado_hasta,
              (bloqueado_hasta IS NOT NULL AND bloqueado_hasta > CURRENT_TIMESTAMP) AS actualmente_bloqueado
         FROM usuarios
        WHERE LOWER(correo) = LOWER($1) AND eliminado_en IS NULL`,
      [correo],
    );

    if ((resultado.rowCount ?? 0) === 0) {
      return { bloqueado: false, bloqueadoHasta: null };
    }

    return {
      bloqueado: Boolean(resultado.rows[0].actualmente_bloqueado),
      bloqueadoHasta: resultado.rows[0].bloqueado_hasta,
    };
  }
}

