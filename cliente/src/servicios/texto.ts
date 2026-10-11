/** La letra que va en el círculo del avatar. */
export function inicial(nombre: string): string {
  return (nombre.trim()[0] ?? '?').toUpperCase();
}
