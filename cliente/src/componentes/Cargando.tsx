/**
 * HU-05 · Estado de carga.
 *
 * Esqueletos con la forma del contenido que viene. El inventario de pantallas
 * lo pide textual: "Nunca una rueda girando sola".
 */

export function Cargando({ lineas = 3 }: { lineas?: number }) {
  return (
    <div className="col g12" aria-busy="true" aria-live="polite">
      <span className="solo-lectores">Cargando…</span>
      <div className="esqueleto esqueleto-titulo" />
      {Array.from({ length: lineas }).map((_, indice) => (
        <div key={indice} className="esqueleto esqueleto-linea" />
      ))}
    </div>
  );
}
