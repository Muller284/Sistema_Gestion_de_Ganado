import { useEffect, useRef, useState, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { api, guardarSoporte, soporteActual } from '../servicios/api';
import { Icono, type NombreIcono } from './Iconos';
import { IconoMarca } from './Marca';
import { inicial } from '../servicios/texto';
import { existe, t, tJsx } from '../servicios/idioma';
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
  /** Clave del nombre en el archivo de idioma; se traduce al dibujar. */
  nombre: string;
  icono: NombreIcono;
  /** A dónde lleva. Solo los módulos que ya existen la tienen. */
  ruta?: string;
  /** Cuando está, el módulo se ve apagado y dice de qué fase es. */
  fase?: number;
}

const MODULOS: Modulo[] = [
  { clave: 'inicio', nombre: 'app.modulos.inicio', icono: 'casa', ruta: '/rancho' },
  { clave: 'animales', nombre: 'app.modulos.animales', icono: 'animal', fase: 2 },
  { clave: 'corrales', nombre: 'app.modulos.corrales', icono: 'corral', fase: 2 },
  { clave: 'sanidad', nombre: 'app.modulos.sanidad', icono: 'sanidad', fase: 3 },
  { clave: 'pesajes', nombre: 'app.modulos.pesajes', icono: 'balanza', fase: 3 },
  // HU-17. Llegó antes que su fase: el alta del equipo es del Sprint 2.
  { clave: 'equipo', nombre: 'app.modulos.equipo', icono: 'equipo', ruta: '/equipo' },
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

/** El nombre del rol en el idioma actual. Si no es un rol conocido ("—"), tal cual. */
function nombreDelRol(rol: string): string {
  return existe(`roles.${rol}`) ? t(`roles.${rol}`) : rol;
}

function iconoDelModulo(clave: string): NombreIcono {
  if (clave === 'perfil') return 'persona';
  if (clave === 'admin') return 'escudo';
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
  // HU-24. El Admin de plataforma ve su entrada de Soporte; los módulos del
  // rancho, solo si entró a uno.
  const esAdmin = usuario.rol === 'admin_plataforma';
  const soporte = esAdmin ? soporteActual() : null;
  const modulos = esAdmin && !soporte ? [] : MODULOS;

  return (
    <div className="app">
      <aside className="lateral app__panel">
        <div className="marca">
          <IconoMarca />
          <span className="nombre">
            {t('app.nombreSistema')}
            <span className="rancho">{rancho ?? t('app.sinRancho')}</span>
          </span>
        </div>

        {esAdmin && (
          <NavLink
            to="/admin"
            end
            className={({ isActive }) => (isActive ? 'item activo' : 'item')}
          >
            <span className="casilla-icono" aria-hidden="true">
              <Icono nombre="escudo" />
            </span>
            <span className="flex1">{t('admin.menu')}</span>
          </NavLink>
        )}

        {modulos.map((modulo) => {
          const contenido = (
            <>
              <span className="casilla-icono" aria-hidden="true">
                <Icono nombre={modulo.icono} />
              </span>
              <span className="flex1">{t(modulo.nombre)}</span>
              {modulo.fase && <span className="pie">{t('app.fase', { n: modulo.fase })}</span>}
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
                title={t('app.llegaEnFase', { n: modulo.fase })}
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

        {!esAdmin && (
        <div className="bloque-cuenta">
          <span className="titulo">{t('app.cuenta.titulo')}</span>
          <span className="plan">
            <Icono nombre="plan" tamano={16} />
            {t('app.cuenta.plan')}
          </span>
          <div
            className="medidor"
            role="progressbar"
            aria-valuenow={76}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t('app.cuenta.medidor')}
          >
            <span style={{ width: '76%' }} />
          </div>
          <span className="detalle">{t('app.cuenta.usados', { porcentaje: 76 })}</span>
        </div>
        )}

        {/* Abre "Mi perfil". Es un enlace de verdad, como los modulos: se
            puede abrir en otra pestaña y el teclado llega igual. */}
        <NavLink
          to="/perfil"
          className={({ isActive }) => (isActive ? 'usuario activo' : 'usuario')}
          title={t('app.miPerfil')}
        >
          <span className="avatar-inicial">{inicial(usuario.nombre)}</span>
          <span className="nombre flex1">
            {usuario.nombre}
            <span className="rol">{nombreDelRol(usuario.rol)}</span>
          </span>
          <Icono nombre="lapiz" tamano={16} className="usuario__editar" />
        </NavLink>
      </aside>

      <div className="app__cuerpo">
        {soporte && <BandaSoporte soporte={soporte} />}
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

/**
 * HU-24. Mientras el Admin está dentro de un rancho, una banda arriba de todo
 * lo recuerda: en qué rancho está, por qué entró y cómo salir. Nadie tiene
 * que confundir el modo soporte con su propia cuenta.
 */
function BandaSoporte({ soporte }: { soporte: NonNullable<ReturnType<typeof soporteActual>> }) {
  const navegar = useNavigate();
  const [saliendo, setSaliendo] = useState(false);

  async function salir() {
    setSaliendo(true);
    // Aunque el servidor no conteste, aca se sale igual: el acceso vence solo.
    await api.salirDeRancho(soporte.accesoId).catch(() => undefined);
    guardarSoporte(null);
    navegar('/admin');
  }

  return (
    <div className="banda-soporte" role="status">
      <Icono nombre="escudo" tamano={18} />
      <span className="flex1">
        {tJsx('admin.banda.texto', { b: (s) => <strong>{s}</strong> }, { rancho: soporte.rancho })}
        <span className="banda-soporte__motivo">{t('admin.banda.motivo', { motivo: soporte.motivo })}</span>
      </span>
      <button type="button" className="btn btn-secundario" onClick={salir} disabled={saliendo}>
        <Icono nombre="salir" tamano={16} />
        {saliendo ? t('admin.banda.saliendo') : t('admin.banda.salir')}
      </button>
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
  // Lo que se esta mostrando en este momento. Cuando el valor cambia (se sumo
  // alguien al equipo), se cuenta desde aca y no desde cero: volver a cero
  // parece que la pantalla se recargo.
  const mostrado = useRef(0);

  useEffect(() => {
    if (destino === null || quieto) return;

    const DURACION = 500;
    const desde = mostrado.current;
    const arranque = performance.now();
    const paso = (ahora: number) => {
      const avance = Math.min(1, (ahora - arranque) / DURACION);
      // Empieza rápido y frena al final, que es como se lee mejor.
      const suave = 1 - (1 - avance) ** 3;
      const valor = desde + (destino - desde) * suave;
      mostrado.current = valor;
      setActual(valor);
      if (avance < 1) cuadro.current = requestAnimationFrame(paso);
    };
    cuadro.current = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(cuadro.current);
  }, [destino, quieto]);

  if (destino === null) return <>{texto}</>;
  return (
    <>
      {(quieto ? destino : actual).toFixed(decimales)}
      {resto}
    </>
  );
}
