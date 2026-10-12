import type { UsuarioActual } from './repositorio-usuario-actual';

/**
 * HU-24 · El Admin de plataforma, cuando entra a un rancho a dar soporte,
 * puede lo mismo que el propietario de ese rancho ("acceso completo para dar
 * soporte y resolver problemas").
 *
 * Cada servicio que antes preguntaba rol === 'propietario' pregunta esto.
 * Cuando llegue HU-19 (permisos por modulo), el Admin en soporte tiene que
 * pasar todos los controles igual que el propietario.
 */
export function actuaComoPropietario(quien: UsuarioActual): boolean {
  return quien.rol === 'propietario' || (quien.rol === 'admin_plataforma' && quien.soporte !== null);
}
