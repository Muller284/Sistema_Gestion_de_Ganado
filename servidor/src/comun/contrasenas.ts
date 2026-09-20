import { randomBytes, scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const derivar = promisify(scrypt) as (
  clave: string,
  sal: Buffer,
  largo: number,
  opciones: { N: number; r: number; p: number },
) => Promise<Buffer>;

/**
 * Cifrado de contraseñas (HU-06, y despues HU-08, HU-09 y HU-10).
 *
 * POR QUE scrypt Y NO bcrypt NI argon2
 * Las dos son mejores conocidas, pero las dos son dependencias nuevas, y la
 * regla del equipo es que las dependencias las instala Favio. scrypt viene
 * dentro de Node, no se instala nada, y es una funcion de derivacion de clave
 * seria: esta pensada justamente para esto y es cara de calcular a proposito,
 * que es lo que hace inviable probar contraseñas de a millones.
 *
 * Si mas adelante el equipo decide usar argon2, se cambia solo este archivo:
 * el formato guarda el algoritmo adelante, asi que las contraseñas viejas se
 * siguen pudiendo verificar mientras conviven las dos.
 *
 * FORMATO GUARDADO
 *   scrypt$16384$8$1$<sal en base64>$<hash en base64>
 *   algoritmo, costo, tamaño de bloque, paralelismo, sal, hash.
 * Entra holgado en el VARCHAR(255) de usuarios.contrasena_hash.
 */

const COSTO = 16384; // 2^14
const BLOQUE = 8;
const PARALELISMO = 1;
const LARGO_HASH = 32;
const LARGO_SAL = 16;

export async function cifrarContrasena(contrasena: string): Promise<string> {
  const sal = randomBytes(LARGO_SAL);
  const hash = await derivar(contrasena.normalize('NFKC'), sal, LARGO_HASH, {
    N: COSTO,
    r: BLOQUE,
    p: PARALELISMO,
  });
  return [
    'scrypt',
    COSTO,
    BLOQUE,
    PARALELISMO,
    sal.toString('base64'),
    hash.toString('base64'),
  ].join('$');
}

/**
 * Compara sin filtrar informacion por el tiempo que tarda: si la comparacion
 * cortara en la primera diferencia, el tiempo de respuesta contaria cuantos
 * caracteres del hash se acertaron.
 */
export async function verificarContrasena(
  contrasena: string,
  guardado: string,
): Promise<boolean> {
  const partes = guardado.split('$');
  if (partes.length !== 6 || partes[0] !== 'scrypt') return false;

  const [, costo, bloque, paralelismo, salBase64, hashBase64] = partes;
  const sal = Buffer.from(salBase64, 'base64');
  const esperado = Buffer.from(hashBase64, 'base64');

  const calculado = await derivar(
    contrasena.normalize('NFKC'),
    sal,
    esperado.length,
    { N: Number(costo), r: Number(bloque), p: Number(paralelismo) },
  );

  if (calculado.length !== esperado.length) return false;
  return timingSafeEqual(calculado, esperado);
}

/**
 * Reglas de HU-06: minimo ocho caracteres, una mayuscula y un numero.
 * Devuelve la lista de lo que falta, para poder decirselo todo junto al
 * usuario en lugar de de a un error por vez.
 */
export function revisarContrasena(contrasena: string): string[] {
  const faltas: string[] = [];
  if (contrasena.length < 8) faltas.push('ocho caracteres');
  if (!/[A-ZÁÉÍÓÚÑ]/.test(contrasena)) faltas.push('una mayúscula');
  if (!/[0-9]/.test(contrasena)) faltas.push('un número');
  return faltas;
}

/** "a, b y c". Para que el mensaje se lea como una frase y no como una lista. */
export function enumerar(partes: string[]): string {
  if (partes.length <= 1) return partes.join('');
  return `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`;
}
