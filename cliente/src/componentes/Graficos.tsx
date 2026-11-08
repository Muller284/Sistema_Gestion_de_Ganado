import { useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';

/**
 * Gráficos de los paneles (HU-54, HU-56 y HU-57). SVG a mano: son pocos y
 * simples, y una librería de gráficos pesa más que todo el panel.
 *
 * Reglas que siguen los tres:
 *   - Se dibujan al ancho real de su caja (ResizeObserver), no estirando un
 *     viewBox: así el texto mide lo mismo en el celular que en la computadora.
 *   - Un solo tono por serie, de los tokens. Las bajas van hacia abajo del eje,
 *     así que no dependen solo del color para distinguirse de las altas.
 *   - Rótulos solo donde suman (el último valor, los valores de cada barra),
 *     grilla apagada, y una ayuda al pasar el mouse o tocar cada marca.
 *   - Cada gráfico lleva una descripción para lectores de pantalla; los
 *     números exactos están también en el texto de la tarjeta.
 */

/** El ancho disponible de la caja; 600 mientras no se pudo medir (o en las pruebas). */
function useAncho(): [RefObject<HTMLDivElement | null>, number] {
  const caja = useRef<HTMLDivElement>(null);
  const [ancho, setAncho] = useState(600);
  useLayoutEffect(() => {
    const elemento = caja.current;
    if (!elemento || typeof ResizeObserver === 'undefined') return;
    const medir = () => setAncho(Math.max(240, Math.floor(elemento.getBoundingClientRect().width)));
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(elemento);
    return () => observador.disconnect();
  }, []);
  return [caja, ancho];
}

interface Ayuda {
  x: number;
  y: number;
  texto: string;
}

/** La ayuda que aparece sobre la marca señalada. */
function Globo({ ayuda }: { ayuda: Ayuda | null }) {
  if (!ayuda) return null;
  return (
    <div className="grafico__globo" style={{ left: ayuda.x, top: ayuda.y }} role="status">
      {ayuda.texto}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Barras horizontales: existencias por categoría, por corral, comparativas.
// ---------------------------------------------------------------------------

export interface Barra {
  clave: string;
  etiqueta: string;
  valor: number;
  /** Lo que se escribe al final de la barra; por defecto, el valor. */
  rotulo?: string;
  /** La ayuda al pasar el mouse; por defecto, etiqueta y rótulo. */
  ayuda?: string;
  /** Una marca de referencia sobre la barra (la capacidad del corral, por ejemplo). */
  tope?: number | null;
}

export function BarrasHorizontales({ barras, descripcion }: { barras: Barra[]; descripcion: string }) {
  const maximo = Math.max(1, ...barras.map((b) => Math.max(b.valor, b.tope ?? 0)));
  return (
    <ul className="grafico-barras" aria-label={descripcion}>
      {barras.map((barra) => (
        <li key={barra.clave} title={barra.ayuda ?? `${barra.etiqueta}: ${barra.rotulo ?? barra.valor}`}>
          <span className="grafico-barras__etiqueta">{barra.etiqueta}</span>
          <span className="grafico-barras__pista">
            <span
              className="grafico-barras__relleno"
              style={{ width: `${Math.max(barra.valor > 0 ? 2 : 0, (barra.valor / maximo) * 100)}%` }}
            />
            {barra.tope ? (
              <span className="grafico-barras__tope" style={{ left: `${(barra.tope / maximo) * 100}%` }} />
            ) : null}
          </span>
          <span className="grafico-barras__valor dato">{barra.rotulo ?? barra.valor}</span>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Columnas de altas (hacia arriba) y bajas (hacia abajo) por mes.
// ---------------------------------------------------------------------------

export interface MesAltasBajas {
  clave: string;
  /** "nov", el mes corto. */
  etiqueta: string;
  /** "noviembre de 2026: 3 altas, 1 baja". */
  ayuda: string;
  altas: number;
  bajas: number;
}

export function ColumnasAltasBajas({
  meses,
  descripcion,
  leyenda,
}: {
  meses: MesAltasBajas[];
  descripcion: string;
  leyenda: { altas: string; bajas: string };
}) {
  const [caja, ancho] = useAncho();
  const [ayuda, setAyuda] = useState<Ayuda | null>(null);
  const alto = 180;
  const arriba = 16;
  const abajo = 22;
  const maxAltas = Math.max(1, ...meses.map((m) => m.altas));
  const maxBajas = Math.max(0, ...meses.map((m) => m.bajas));
  // El espacio vertical se reparte en proporción a lo más alto de cada lado.
  const util = alto - arriba - abajo;
  const parteAltas = maxBajas > 0 ? util * (maxAltas / (maxAltas + maxBajas)) : util;
  const base = arriba + parteAltas;
  const escala = parteAltas / maxAltas;
  const paso = ancho / Math.max(1, meses.length);
  const grosor = Math.max(6, Math.min(28, paso * 0.5));

  return (
    <div className="grafico" ref={caja}>
      <svg width={ancho} height={alto} role="img" aria-label={descripcion}>
        <line className="grafico__eje" x1={0} x2={ancho} y1={base} y2={base} />
        {meses.map((mes, i) => {
          const x = i * paso + (paso - grosor) / 2;
          const altoAltas = mes.altas * escala;
          const altoBajas = mes.bajas * escala;
          return (
            <g key={mes.clave}>
              {mes.altas > 0 && (
                <>
                  <path className="grafico__alta" d={columna(x, base, grosor, altoAltas, 'arriba')} />
                  <text className="grafico__rotulo" x={x + grosor / 2} y={base - altoAltas - 4} textAnchor="middle">
                    {mes.altas}
                  </text>
                </>
              )}
              {mes.bajas > 0 && (
                <>
                  <path className="grafico__baja" d={columna(x, base, grosor, altoBajas, 'abajo')} />
                  <text className="grafico__rotulo" x={x + grosor / 2} y={base + altoBajas + 12} textAnchor="middle">
                    {mes.bajas}
                  </text>
                </>
              )}
              <text className="grafico__mes" x={i * paso + paso / 2} y={alto - 6} textAnchor="middle">
                {mes.etiqueta}
              </text>
              {/* La zona que responde al mouse es la columna entera del mes, más grande que la marca. */}
              <rect
                className="grafico__zona"
                x={i * paso}
                y={0}
                width={paso}
                height={alto}
                onMouseEnter={() => setAyuda({ x: i * paso + paso / 2, y: 0, texto: mes.ayuda })}
                onMouseLeave={() => setAyuda(null)}
                onClick={() => setAyuda({ x: i * paso + paso / 2, y: 0, texto: mes.ayuda })}
              >
                <title>{mes.ayuda}</title>
              </rect>
            </g>
          );
        })}
      </svg>
      <Globo ayuda={ayuda} />
      <Leyenda
        items={[
          { clase: 'grafico__muestra--alta', texto: leyenda.altas },
          { clase: 'grafico__muestra--baja', texto: leyenda.bajas },
        ]}
      />
    </div>
  );
}

/** Una columna con las puntas de datos redondeadas (4 px) y la base recta sobre el eje. */
function columna(x: number, base: number, ancho: number, alto: number, hacia: 'arriba' | 'abajo'): string {
  const r = Math.min(4, alto, ancho / 2);
  if (hacia === 'arriba') {
    const tope = base - alto;
    return `M${x},${base} V${tope + r} Q${x},${tope} ${x + r},${tope} H${x + ancho - r} Q${x + ancho},${tope} ${x + ancho},${tope + r} V${base} Z`;
  }
  const fondo = base + alto;
  return `M${x},${base} V${fondo - r} Q${x},${fondo} ${x + r},${fondo} H${x + ancho - r} Q${x + ancho},${fondo} ${x + ancho},${fondo - r} V${base} Z`;
}

function Leyenda({ items }: { items: { clase: string; texto: string }[] }) {
  return (
    <ul className="grafico__leyenda">
      {items.map((item) => (
        <li key={item.texto}>
          <span className={`grafico__muestra ${item.clase}`} aria-hidden="true" />
          {item.texto}
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Línea: peso promedio por mes (HU-57) y evolución del peso de un animal (HU-54).
// ---------------------------------------------------------------------------

export interface PuntoLinea {
  clave: string;
  /** Posición horizontal: el número de mes o el día. Los puntos se ubican en proporción. */
  x: number;
  y: number | null;
  /** Debajo del eje, solo en el primero y el último (y en los que digan mostrarEtiqueta). */
  etiquetaX: string;
  /** "468 kg". */
  rotulo: string;
  /** "30/10/2026: 468 kg (+0,13 kg/día)". */
  ayuda: string;
}

export function GraficoLinea({ puntos, descripcion, pie }: { puntos: PuntoLinea[]; descripcion: string; pie?: ReactNode }) {
  const [caja, ancho] = useAncho();
  const [ayuda, setAyuda] = useState<Ayuda | null>(null);
  const alto = 180;
  const margen = { izquierda: 12, derecha: 56, arriba: 20, abajo: 24 };
  const conValor = puntos.filter((p): p is PuntoLinea & { y: number } => p.y !== null);
  if (conValor.length === 0) return null;

  const xs = puntos.map((p) => p.x);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const ys = conValor.map((p) => p.y);
  // Un poco de aire arriba y abajo; el eje no arranca en cero: lo que importa es la tendencia.
  const holgura = Math.max(1, (Math.max(...ys) - Math.min(...ys)) * 0.15);
  const minY = Math.min(...ys) - holgura;
  const maxY = Math.max(...ys) + holgura;
  const posX = (x: number) =>
    margen.izquierda + (maxX === minX ? 0.5 : (x - minX) / (maxX - minX)) * (ancho - margen.izquierda - margen.derecha);
  const posY = (y: number) => margen.arriba + (1 - (y - minY) / (maxY - minY)) * (alto - margen.arriba - margen.abajo);

  // Tramos sin huecos: un mes sin pesajes corta la línea en vez de inventar un valor.
  const tramos: (PuntoLinea & { y: number })[][] = [];
  let actual: (PuntoLinea & { y: number })[] = [];
  for (const punto of puntos) {
    if (punto.y === null) {
      if (actual.length) tramos.push(actual);
      actual = [];
    } else actual.push(punto as PuntoLinea & { y: number });
  }
  if (actual.length) tramos.push(actual);
  const ultimo = conValor[conValor.length - 1];
  const lineasGuia = [minY + holgura, (minY + maxY) / 2, maxY - holgura];

  return (
    <div className="grafico" ref={caja}>
      <svg width={ancho} height={alto} role="img" aria-label={descripcion}>
        {lineasGuia.map((y) => (
          <line key={y} className="grafico__guia" x1={margen.izquierda} x2={ancho - margen.derecha} y1={posY(y)} y2={posY(y)} />
        ))}
        {tramos.map((tramo) => (
          <polyline
            key={tramo[0].clave}
            className="grafico__linea"
            points={tramo.map((p) => `${posX(p.x)},${posY(p.y)}`).join(' ')}
          />
        ))}
        {conValor.map((p) => (
          <circle key={p.clave} className="grafico__punto" cx={posX(p.x)} cy={posY(p.y)} r={4} />
        ))}
        <text className="grafico__rotulo grafico__rotulo--fuerte" x={posX(ultimo.x) + 8} y={posY(ultimo.y) + 4}>
          {ultimo.rotulo}
        </text>
        {puntos.map((p, i) =>
          i === 0 || i === puntos.length - 1 ? (
            <text
              key={`e-${p.clave}`}
              className="grafico__mes"
              x={posX(p.x)}
              y={alto - 6}
              textAnchor={i === 0 && puntos.length > 1 ? 'start' : 'end'}
            >
              {p.etiquetaX}
            </text>
          ) : null,
        )}
        {conValor.map((p) => (
          <circle
            key={`z-${p.clave}`}
            className="grafico__zona"
            cx={posX(p.x)}
            cy={posY(p.y)}
            r={16}
            onMouseEnter={() => setAyuda({ x: posX(p.x), y: posY(p.y) - 8, texto: p.ayuda })}
            onMouseLeave={() => setAyuda(null)}
            onClick={() => setAyuda({ x: posX(p.x), y: posY(p.y) - 8, texto: p.ayuda })}
          >
            <title>{p.ayuda}</title>
          </circle>
        ))}
      </svg>
      <Globo ayuda={ayuda} />
      {pie}
    </div>
  );
}
