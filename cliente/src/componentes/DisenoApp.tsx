import type { ReactNode } from 'react';
import { Icono, type NombreIcono } from './Iconos';
import { IconoMarca } from './Marca';

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
  /** Cuando está, el módulo se ve apagado y dice de qué fase es. */
  fase?: number;
}

const MODULOS: Modulo[] = [
  { clave: 'inicio', nombre: 'Mi rancho', icono: 'casa' },
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
  usuario: { nombre: string; rol: string };
  rancho?: string | null;
  /** Rótulo chico arriba del título. */
  rotulo?: string;
  titulo: string;
  /** Botones a la derecha del título. */
  acciones?: ReactNode;
  children: ReactNode;
}

function inicial(nombre: string): string {
  return (nombre.trim()[0] ?? '?').toUpperCase();
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
          const disponible = !modulo.fase;
          const clases = [
            'item',
            modulo.clave === activo ? 'activo' : '',
            disponible ? '' : 'desactivado',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <a
              key={modulo.clave}
              className={clases}
              href={disponible ? '#/' : undefined}
              aria-disabled={disponible ? undefined : true}
              title={disponible ? undefined : `Llega en la fase ${modulo.fase}`}
            >
              <span className="casilla-icono" aria-hidden="true">
                <Icono nombre={modulo.icono} />
              </span>
              <span className="flex1">{modulo.nombre}</span>
              {!disponible && <span className="pie">Fase {modulo.fase}</span>}
            </a>
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
          <span className="avatar-inicial">{inicial(usuario.nombre)}</span>
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
      <p className="valor">{valor}</p>
      {detalle && <p className="detalle">{detalle}</p>}
    </div>
  );
}
