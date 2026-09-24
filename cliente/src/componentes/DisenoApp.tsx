import { useEffect, useRef, useState, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { Icono, type NombreIcono } from './Iconos';
import { IconoMarca } from './Marca';
import { inicial } from '../servicios/texto';
import { MenuUsuario } from './MenuUsuario';

/**
 * El marco de las pantallas internas, tal como está en los mockups: menú
 * lateral verde oscuro, barra superior blanca y el contenido sobre el fondo
 * arena.
 *
 * LOS MÓDULOS QUE TODAVÍA NO EXISTEN SE VEN, PERO NO SE PUEDEN ABRIR.
 * Animales, corrales, sanidad, pesajes y el asistente son de las fases 2 y 3.
 * Aparecen apagados, con la fase a la que pertenecen. Es lo mismo que pide
 * HU-16 para la guía de configuración: dejar visible lo que viene, en lugar de
 * un menú que crece de golpe y no se entiende.
 */

interface Modulo {
  clave: string;
  nombre: string;
  icono: NombreIcono;
  /** A dónde lleva. Solo los módulos que ya existen la tienen. */
  ruta?: string;
  /** Cuando está, el módulo se ve apagado y dice de qué fase es. */
  fase?: number;
}

const MODULOS: Modulo[] = [
  { clave: 'inicio', nombre: 'Mi rancho', icono: 'casa', ruta: '/' },
  { clave: 'animales', nombre: 'Animales', icono: 'animal', fase: 2 },
  { clave: 'corrales', nombre: 'Corrales', icono: 'corral', fase: 2 },
  { clave: 'sanidad', nombre: 'Sanidad', icono: 'sanidad', fase: 3 },
  { clave: 'pesajes', nombre: 'Pesajes', icono: 'balanza', fase: 3 },
  { clave: 'equipo', nombre: 'Equipo', icono: 'equipo', fase: 2 },
];

interface Propiedades {
  /** Qué módulo está abierto. */
  activo?: string;
  /** El rastro de la barra superior: "Mi rancho · Propietario". */
  ruta: string[];
  usuario: { nombre: string; rol: string; correo?: string };
  rancho?: string | null;
  /** Rótulo chico arriba del título. */
  rotulo?: string;
  titulo: string;
  /** Botones a la derecha del título. */
  acciones?: ReactNode;
  children: ReactNode;
}

function iconoDelModulo(clave: string): NombreIcono {
  return MODULOS.find((modulo) => modulo.clave === clave)?.icono ?? 'casa';
}

export function DisenoApp({
  activo = 'inicio',
  ruta,
  usuario,
  rancho,
  rotulo,
  titulo,
  acciones,
  children,
}: Propiedades) {
  return (
    <div className="app">
      <aside className="lateral app__panel">
        <div className="marca">
          <IconoMarca />
          <span className="nombre">
            Gestión de Ganado
            <span className="rancho">{rancho ?? 'Sin rancho todavía'}</span>
          </span>
        </div>

        {MODULOS.map((modulo) => {
          const contenido = (
            <>
              <span className="casilla-icono" aria-hidden="true">
                <Icono nombre={modulo.icono} />
              </span>
              <span className="flex1">{modulo.nombre}</span>
              {modulo.fase && <span className="pie">Fase {modulo.fase}</span>}
            </>
          );

          // Los modulos de fases futuras no son enlaces: un enlace que no
          // lleva a ningun lado confunde y el teclado se para en el igual.
          if (modulo.fase) {
            return (
              <span
                key={modulo.clave}
                className="item desactivado"
                aria-disabled="true"
                title={`Llega en la fase ${modulo.fase}`}
              >
                {contenido}
              </span>
            );
          }

          return (
            <NavLink
              key={modulo.clave}
              to={modulo.ruta!}
              end
              className={({ isActive }) => (isActive ? 'item activo' : 'item')}
            >
              {contenido}
            </NavLink>
          );
        })}

        <div className="espaciador" />

        <div className="bloque-cuenta">
          <span className="titulo">Cuenta</span>
          <span className="plan">
            <Icono nombre="plan" tamano={16} />
            Plan Profesional
          </span>
          <div
            className="medidor"
            role="progressbar"
            aria-valuenow={76}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Animales usados del plan"
          >
            <span style={{ width: '76%' }} />
          </div>
          <span className="detalle">76 % de animales usados</span>
        </div>

        <div className="usuario">
          <span className="avatar-inicial">{inicial(usuario.nombre)}</span>
          <span className="nombre">
            {usuario.nombre}
            <span className="rol">{usuario.rol}</span>
          </span>
        </div>
      </aside>

      <div className="app__cuerpo">
        <header className="barra-sup">
          <Icono nombre={iconoDelModulo(activo)} className="ico-ruta" />
          <span className="ruta">
            {ruta.map((tramo, indice) => (
              <span key={tramo}>
                {indice > 0 && <span className="separador">·</span>}
                {tramo}
              </span>
            ))}
          </span>
          <span className="flex1" />
          <MenuUsuario
            nombre={usuario.nombre}
            rol={usuario.rol}
            rancho={rancho}
            correo={usuario.correo}
          />
        </header>

        <main className="app__contenido">
          <div className="app__ancho">
            <div className="encabezado-seccion">
              <div>
                {rotulo && <p className="rotulo">{rotulo}</p>}
                <h1>{titulo}</h1>
              </div>
              {acciones && <div className="fila centro g8">{acciones}</div>}
            </div>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

/** Tarjeta de una cifra, como las del panel de los mockups. */
export function Cifra({
  rotulo,
  valor,
  detalle,
  icono,
}: {
  rotulo: string;
  valor: ReactNode;
  detalle?: string;
  /** Va arriba a la derecha, apagado. Dice de qué es la cifra de un vistazo. */
  icono?: NombreIcono;
}) {
  return (
    <div className="tarjeta cifra">
      <p className="rotulo">
        <span className="flex1">{rotulo}</span>
        {icono && <Icono nombre={icono} tamano={18} />}
      </p>
      <p className="valor">
        {typeof valor === 'string' ? <Contador texto={valor} /> : valor}
      </p>
      {detalle && <p className="detalle">{detalle}</p>}
    </div>
  );
}

function prefiereQuieto(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * El número de una cifra, contando desde cero hasta su valor.
 *
 * Solo cuenta si el texto empieza por un número: "850.5 ha" cuenta, "Carne" y
 * "—" se escriben tal cual. Dura medio segundo y respeta a quien pidió que las
 * cosas no se muevan.
 */
function Contador({ texto }: { texto: string }) {
  const coincidencia = /^(-?\d+(?:[.,]\d+)?)(.*)$/.exec(texto.trim());
  const destino = coincidencia ? Number(coincidencia[1].replace(',', '.')) : null;
  const resto = coincidencia ? coincidencia[2] : '';
  const decimales = coincidencia?.[1].includes('.') ? 1 : 0;

  // Se lee antes de dibujar, no dentro del efecto: asi el primer numero que
  // se pinta ya es el correcto para quien pidio que nada se mueva.
  const quieto = prefiereQuieto();
  const [actual, setActual] = useState(() =>
    quieto || destino === null ? (destino ?? 0) : 0,
  );
  const cuadro = useRef(0);

  useEffect(() => {
    if (destino === null || quieto) return;

    const DURACION = 500;
    const arranque = performance.now();
    const paso = (ahora: number) => {
      const avance = Math.min(1, (ahora - arranque) / DURACION);
      // Empieza rápido y frena al final, que es como se lee mejor.
      const suave = 1 - (1 - avance) ** 3;
      setActual(destino * suave);
      if (avance < 1) cuadro.current = requestAnimationFrame(paso);
    };
    cuadro.current = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(cuadro.current);
  }, [destino, quieto]);

  if (destino === null) return <>{texto}</>;
  return (
    <>
      {actual.toFixed(decimales)}
      {resto}
    </>
  );
}
