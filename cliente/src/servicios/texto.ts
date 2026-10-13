import { t } from './idioma';

/** La letra que va en el círculo del avatar. */
export function inicial(nombre: string): string {
  return (nombre.trim()[0] ?? '?').toUpperCase();
}

/** "a, b y c" / "a, b and c": para que una lista se lea como una frase. */
export function enumerar(partes: string[]): string {
  if (partes.length <= 1) return partes.join('');
  return t('comun.enumerar', {
    primeros: partes.slice(0, -1).join(', '),
    ultimo: partes[partes.length - 1],
  });
}

/**
 * Las tres reglas de la contraseña que aplica el servidor, en el mismo orden,
 * con el texto de cada una en el idioma actual. Vacío si cumple todas.
 */
export function faltasDeContrasena(contrasena: string): string[] {
  const faltas: string[] = [];
  if (contrasena.length < 8) faltas.push(t('comun.contrasena.largo'));
  if (!/[A-ZÁÉÍÓÚÑ]/.test(contrasena)) faltas.push(t('comun.contrasena.mayuscula'));
  if (!/[0-9]/.test(contrasena)) faltas.push(t('comun.contrasena.numero'));
  return faltas;
}
