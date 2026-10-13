import { useEffect, useRef, useState, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { api, guardarSoporte, soporteActual } from '../servicios/api';
import { Icono, type NombreIcono } from './Iconos';
import { IconoMarca } from './Marca';
import { inicial } from '../servicios/texto';
import { existe, t, tJsx } from '../servicios/idioma';
import { MenuUsuario } from './MenuUsuario';

interface Modulo {
  clave: string;
  nombre: string;
  icono: NombreIcono;
  ruta?: string;
  fase?: number;
}

const MODULOS: Modulo[] = [
  { clave: 'inicio', nombre: 'app.modulos.inicio', icono: 'casa', ruta: '/rancho' },
  { clave: 'animales', nombre: 'app.modulos.animales', icono: 'animal', ruta: '/animales' },
  { clave: 'corrales', nombre: 'app.modulos.corrales', icono: 'corral', fase: 2 },
  { clave: 'sanidad', nombre: 'app.modulos.sanidad', icono: 'sanidad', fase: 3 },
  { clave: 'pesajes', nombre: 'app.modulos.pesajes', icono: 'balanza', fase: 3 },
  { clave: 'equipo', nombre: 'app.modulos.equipo', icono: 'equipo', ruta: '/equipo' },
];

interface Propiedades {
  activo?: string;
  ruta: string[];
  usuario: { nombre: string; rol: string; correo?: string; permisos?: any; tipo_colaborador_id?: string };
  rancho?: string | null;
  rotulo?: string;
  titulo: string;
  acciones?: ReactNode;
  children: ReactNode;
}

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
  const esAdmin = usuario.rol === 'admin_plataforma';
  const soporte = esAdmin ? soporteActual() : null;

  let modulosDisponibles = esAdmin && !soporte ? [] : MODULOS;

  // Filtrar los módulos del menú dinámicamente según permisos del usuario o tipo de colaborador
  if (!esAdmin && usuario.rol !== 'propietario' && usuario.rol !== 'admin') {
    try {
      const u = usuario as any;
      // Intentamos extraer los permisos de las props, de la cuenta o del almacenamiento local si estuvieran guardados
      let permisosObj = u?.permisos || u?.tipo_colaborador?.permisos;
      
      if (!permisosObj) {
        const cuentaLocal = localStorage.getItem('ganado_cuenta') || localStorage.getItem('cuenta');
        if (cuentaLocal) {
          const parsed = JSON.parse(cuentaLocal);
          permisosObj = parsed?.permisos || parsed?.tipo_colaborador?.permisos;
        }
      }

      if (typeof permisosObj === 'string') {
        permisosObj = JSON.parse(permisosObj);
      }
      
      if (permisosObj && typeof permisosObj === 'object') {
        modulosDisponibles = modulosDisponibles.filter((modulo) => {
          if (modulo.clave === 'inicio' || modulo.clave === 'equipo') return true;
          const permisoModulo = permisosObj[modulo.clave];
          
          // Si el módulo está explícitamente configurado con ver: false o sin acceso, se oculta del menú
          if (permisoModulo && (permisoModulo.ver === false || permisoModulo === false)) {
            return false;
          }
          return true;
        });
      }
    } catch {
      // Si ocurre algún fallo al parsear, se mantiene la lista por defecto
    }
  }

  const modulos = modulosDisponibles;

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

function BandaSoporte({ soporte }: { soporte: NonNullable<ReturnType<typeof soporteActual>> }) {
  const navegar = useNavigate();
  const [saliendo, setSaliendo] = useState(false);

  async function salir() {
    setSaliendo(true);
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

export function Cifra({
  rotulo,
  valor,
  detalle,
  icono,
}: {
  rotulo: string;
  valor: ReactNode;
  detalle?: string;
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

function Contador({ texto }: { texto: string }) {
  const coincidencia = /^(-?\d+(?:[.,]\d+)?)(.*)$/.exec(texto.trim());
  const destino = coincidencia ? Number(coincidencia[1].replace(',', '.')) : null;
  const resto = coincidencia ? coincidencia[2] : '';
  const decimales = coincidencia?.[1].includes('.') ? 1 : 0;

  const quieto = prefiereQuieto();
  const [actual, setActual] = useState(() =>
    quieto || destino === null ? (destino ?? 0) : 0,
  );
  const cuadro = useRef(0);
  const mostrado = useRef(0);

  useEffect(() => {
    if (destino === null || quieto) return;

    const DURACION = 500;
    const desde = mostrado.current;
    const arranque = performance.now();
    const paso = (ahora: number) => {
      const avance = Math.min(1, (ahora - arranque) / DURACION);
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