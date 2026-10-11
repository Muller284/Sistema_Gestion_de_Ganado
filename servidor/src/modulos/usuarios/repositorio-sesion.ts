import { Inject, Injectable } from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { Pool } from 'pg';
import { POOL_BD } from '../../comun/modulo-base-datos';

/**
 * HU-12: Repositorio de sesiones y tokens de refresco revocables.
 *
 * En la tabla 'sesiones' NUNCA se guarda el token en claro: solo su huella SHA-256.
 * La sesión expira automáticamente tras 30 días sin actividad.
 */

export function huellaToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export interface SesionFila {
  id: string;
  usuario_id: string;
  token_refresco_hash: string;
  expira_en: Date;
  revocada_en: Date | null;
  ultimo_uso_en: Date | null;
  agente_usuario: string | null;
}

@Injectable()
export class RepositorioSesion {
  constructor(@Inject(POOL_BD) private readonly bd: Pool) {}

  /**
   * HU-12: Crea una nueva sesión con token de refresco revocable.
   * La sesión expira tras 30 días sin actividad.
   */
  async crear(
    usuarioId: string,
    agenteUsuario?: string,
    diasDeVida = 30,
  ): Promise<{ sesionId: string; tokenRefresco: string; expiraEn: Date }> {
    const sesionId = randomUUID();
    const tokenRefresco = randomBytes(40).toString('base64url');
    const tokenHash = huellaToken(tokenRefresco);
    const expiraEn = new Date(Date.now() + diasDeVida * 24 * 60 * 60 * 1000);

    await this.bd.query(
      `INSERT INTO sesiones (
         id, usuario_id, token_refresco_hash, expira_en,
         ultimo_uso_en, agente_usuario, creado_por, modificado_por
       ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5, $2, $2)`,
      [sesionId, usuarioId, tokenHash, expiraEn, agenteUsuario ?? null],
    );

    return { sesionId, tokenRefresco, expiraEn };
  }

  async buscarPorTokenRefresco(tokenRefresco: string): Promise<SesionFila | null> {
    const tokenHash = huellaToken(tokenRefresco);
    const resultado = await this.bd.query(
      `SELECT id, usuario_id, token_refresco_hash, expira_en,
              revocada_en, ultimo_uso_en, agente_usuario
         FROM sesiones
        WHERE token_refresco_hash = $1 AND eliminado_en IS NULL`,
      [tokenHash],
    );
    return resultado.rows[0] ?? null;
  }

  /**
   * HU-12: Renueva la vigencia de la sesión por 30 días tras actividad/refresco.
   */
  async actualizarActividad(sesionId: string, diasDeVida = 30): Promise<Date> {
    const nuevaExpiraEn = new Date(Date.now() + diasDeVida * 24 * 60 * 60 * 1000);
    await this.bd.query(
      `UPDATE sesiones
          SET ultimo_uso_en = CURRENT_TIMESTAMP,
              expira_en = $2,
              modificado_en = CURRENT_TIMESTAMP
        WHERE id = $1`,
      [sesionId, nuevaExpiraEn],
    );
    return nuevaExpiraEn;
  }

  /**
   * HU-12: Cierre de sesión manual que invalida la sesión de inmediato.
   */
  async revocarPorToken(tokenRefresco: string): Promise<boolean> {
    const tokenHash = huellaToken(tokenRefresco);
    const resultado = await this.bd.query(
      `UPDATE sesiones
          SET revocada_en = CURRENT_TIMESTAMP,
              modificado_en = CURRENT_TIMESTAMP
        WHERE token_refresco_hash = $1 AND revocada_en IS NULL`,
      [tokenHash],
    );
    return (resultado.rowCount ?? 0) > 0;
  }

  async revocarPorId(sesionId: string): Promise<boolean> {
    const resultado = await this.bd.query(
      `UPDATE sesiones
          SET revocada_en = CURRENT_TIMESTAMP,
              modificado_en = CURRENT_TIMESTAMP
        WHERE id = $1 AND revocada_en IS NULL`,
      [sesionId],
    );
    return (resultado.rowCount ?? 0) > 0;
  }

  async revocarTodasDeUsuario(usuarioId: string): Promise<number> {
    const resultado = await this.bd.query(
      `UPDATE sesiones
          SET revocada_en = CURRENT_TIMESTAMP,
              modificado_en = CURRENT_TIMESTAMP
        WHERE usuario_id = $1 AND revocada_en IS NULL`,
      [usuarioId],
    );
    return resultado.rowCount ?? 0;
  }
}
