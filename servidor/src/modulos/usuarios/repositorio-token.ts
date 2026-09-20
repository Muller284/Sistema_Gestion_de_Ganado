import { Inject, Injectable } from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { Pool } from 'pg';
import { POOL_BD } from '../../comun/modulo-base-datos';

/**
 * HU-07 y HU-09 · Tokens de un solo uso.
 *
 * EL TOKEN NO SE GUARDA
 * En la base queda solo su huella (SHA-256). Si alguien llegara a leer la
 * tabla, no puede reconstruir los enlaces: solo tiene huellas. Es la misma
 * idea que con las contraseñas.
 *
 * El token en claro existe una sola vez, en el momento de crearlo, para
 * armar el enlace del correo. Despues no se puede volver a obtener: si el
 * usuario lo pierde, se emite uno nuevo.
 */

export type TipoToken = 'verificacion_correo' | 'recuperacion_contrasena';

export interface TokenEmitido {
  /** El token en claro. Va en el enlace del correo y no se guarda. */
  token: string;
  expiraEn: Date;
}

function huella(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class RepositorioToken {
  constructor(@Inject(POOL_BD) private readonly bd: Pool) {}

  /**
   * Emite un token e invalida los anteriores del mismo tipo y usuario.
   * Eso es lo que hace que pedir el reenvio deje inservible al enlace viejo:
   * en cualquier momento hay un solo enlace valido por persona y por motivo.
   */
  async emitir(
    usuarioId: string,
    tipo: TipoToken,
    horasDeVida: number,
  ): Promise<TokenEmitido> {
    const cliente = await this.bd.connect();
    try {
      await cliente.query('BEGIN');

      await cliente.query(
        `UPDATE tokens
            SET usado_en = CURRENT_TIMESTAMP, modificado_en = CURRENT_TIMESTAMP
          WHERE usuario_id = $1 AND tipo = $2 AND usado_en IS NULL`,
        [usuarioId, tipo],
      );

      const token = randomBytes(32).toString('base64url');
      const expiraEn = new Date(Date.now() + horasDeVida * 60 * 60 * 1000);

      await cliente.query(
        `INSERT INTO tokens (id, usuario_id, tipo, token_hash, expira_en, creado_por, modificado_por)
         VALUES ($1, $2, $3, $4, $5, $2, $2)`,
        [randomUUID(), usuarioId, tipo, huella(token), expiraEn],
      );

      await cliente.query('COMMIT');
      return { token, expiraEn };
    } catch (error) {
      await cliente.query('ROLLBACK');
      throw error;
    } finally {
      cliente.release();
    }
  }

  /**
   * Consume el token: lo busca, comprueba que siga vigente y lo marca usado,
   * todo en una sola sentencia. Hacerlo en un paso es lo que impide que dos
   * peticiones a la vez lo usen las dos.
   *
   * Devuelve el usuario si el token servia, o null en cualquier otro caso:
   * no existe, ya se uso, o vencio.
   */
  async consumir(token: string, tipo: TipoToken): Promise<string | null> {
    const resultado = await this.bd.query(
      `UPDATE tokens
          SET usado_en = CURRENT_TIMESTAMP, modificado_en = CURRENT_TIMESTAMP
        WHERE token_hash = $1
          AND tipo = $2
          AND usado_en IS NULL
          AND expira_en > CURRENT_TIMESTAMP
      RETURNING usuario_id`,
      [huella(token), tipo],
    );
    return resultado.rows[0]?.usuario_id ?? null;
  }

  /**
   * Para poder distinguir "ese enlace no existe" de "ese enlace vencio" y
   * ofrecer el reenvio en el segundo caso, que es lo que pide HU-07.
   */
  async estabaVencido(token: string, tipo: TipoToken): Promise<boolean> {
    const resultado = await this.bd.query(
      `SELECT 1 FROM tokens
        WHERE token_hash = $1 AND tipo = $2 AND expira_en <= CURRENT_TIMESTAMP
        LIMIT 1`,
      [huella(token), tipo],
    );
    return (resultado.rowCount ?? 0) > 0;
  }
}
