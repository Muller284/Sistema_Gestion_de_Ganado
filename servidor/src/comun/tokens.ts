import { createHmac, timingSafeEqual } from 'crypto';

/**
 * HU-12: Tokens firmados de vida corta (acceso).
 *
 * Usa HMAC-SHA256 estándar con Node.js 'crypto' nativo (cero dependencias).
 * Vida corta recomendada: 15 minutos (900 segundos).
 */

const SECRETO =
  process.env.JWT_SECRETO ||
  process.env.DB_CONTRASENA ||
  'clave-secreta-ganado-2026-sprint1';

export interface CargaToken {
  sub: string;
  correo: string;
  rol: string;
  ranchoId: string | null;
  exp: number; // Marca de tiempo Unix en segundos
}

export function firmarTokenAcceso(
  payload: Omit<CargaToken, 'exp'>,
  segundosDeVida = 15 * 60, // 15 minutos (vida corta, HU-12)
): string {
  const encabezado = Buffer.from(
    JSON.stringify({ alg: 'HS256', typ: 'JWT' }),
  ).toString('base64url');

  const exp = Math.floor(Date.now() / 1000) + segundosDeVida;
  const cuerpo = Buffer.from(
    JSON.stringify({ ...payload, exp }),
  ).toString('base64url');

  const firma = createHmac('sha256', SECRETO)
    .update(`${encabezado}.${cuerpo}`)
    .digest('base64url');

  return `${encabezado}.${cuerpo}.${firma}`;
}

export function verificarTokenAcceso(token: string): CargaToken | null {
  const partes = token.split('.');
  if (partes.length !== 3) return null;

  const [encabezadoB64, cuerpoB64, firma] = partes;

  const firmaEsperada = createHmac('sha256', SECRETO)
    .update(`${encabezadoB64}.${cuerpoB64}`)
    .digest('base64url');

  if (firma.length !== firmaEsperada.length) return null;
  if (!timingSafeEqual(Buffer.from(firma), Buffer.from(firmaEsperada))) {
    return null;
  }

  try {
    const cuerpo: CargaToken = JSON.parse(
      Buffer.from(cuerpoB64, 'base64url').toString('utf8'),
    );
    const ahora = Math.floor(Date.now() / 1000);
    if (typeof cuerpo.exp === 'number' && cuerpo.exp < ahora) {
      return null; // Expirado
    }
    return cuerpo;
  } catch {
    return null;
  }
}
