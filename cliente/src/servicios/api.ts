/**
 * Llamadas al servidor. Ninguna pantalla habla directo con fetch.
 *
 * HU-08 y HU-12:
 * Soporta autenticación mediante token de acceso firmado y renovación automática
 * mediante token de refresco revocable (vida de 30 días sin actividad).
 */
import { idiomaActual } from './idioma';

const BASE = import.meta.env.VITE_API ?? 'http://localhost:3000';

const CLAVE_TOKEN_ACCESO = 'ganado_token_acceso';
const CLAVE_TOKEN_REFRESCO = 'ganado_token_refresco';
const CLAVE_USUARIO = 'ganado_usuario';

export function tokenAccesoActual(): string | null {
  return localStorage.getItem(CLAVE_TOKEN_ACCESO);
}

export function tokenRefrescoActual(): string | null {
  return localStorage.getItem(CLAVE_TOKEN_REFRESCO);
}

export function guardarSesion(
  tokenAcceso: string,
  tokenRefresco: string,
  usuario?: UsuarioRegistrado,
) {
  localStorage.setItem(CLAVE_TOKEN_ACCESO, tokenAcceso);
  localStorage.setItem(CLAVE_TOKEN_REFRESCO, tokenRefresco);
  if (usuario) {
    localStorage.setItem(CLAVE_USUARIO, JSON.stringify(usuario));
    if (usuario.id) {
      localStorage.setItem('usuario-id', usuario.id);
    }
  }
}

/**
 * HU-24 · El rancho al que entró el Admin de plataforma a dar soporte.
 *
 * Vive en sessionStorage: se termina al cerrar la pestaña, y cada pestaña
 * puede estar en un rancho distinto. Mientras está, cada petición lleva la
 * cabecera x-rancho-soporte y el servidor comprueba que el acceso siga
 * abierto y registrado.
 */
export interface Soporte {
  accesoId: string;
  ranchoId: string;
  rancho: string;
  motivo: string;
}

const CLAVE_SOPORTE = 'ganado_soporte';
export const EVENTO_SOPORTE = 'soporte-cambiado';

export function soporteActual(): Soporte | null {
  try {
    const guardado = sessionStorage.getItem(CLAVE_SOPORTE);
    return guardado ? (JSON.parse(guardado) as Soporte) : null;
  } catch {
    return null;
  }
}

export function guardarSoporte(soporte: Soporte | null) {
  try {
    if (soporte) sessionStorage.setItem(CLAVE_SOPORTE, JSON.stringify(soporte));
    else sessionStorage.removeItem(CLAVE_SOPORTE);
  } catch {
    // Sin almacenamiento no se puede entrar a dar soporte; el servidor igual lo impide.
  }
  window.dispatchEvent(new CustomEvent(EVENTO_SOPORTE));
}

export function limpiarSesionLocal() {
  guardarSoporte(null);
  localStorage.removeItem(CLAVE_TOKEN_ACCESO);
  localStorage.removeItem(CLAVE_TOKEN_REFRESCO);
  localStorage.removeItem(CLAVE_USUARIO);
  localStorage.removeItem('usuario-id');
}

export function tieneSesionActiva(): boolean {
  return Boolean(tokenAccesoActual() || tokenRefrescoActual());
}

/**
 * Si en este navegador hay alguien adentro: con sesión de verdad (HU-08) o
 * elegido en la barra de demostración. Es lo que decide si en "/" se ve la
 * landing o el sistema.
 *
 * No mira VITE_USUARIO_DEMO a propósito: si lo mirara, con el .env de
 * desarrollo nadie vería nunca la landing.
 */
export function hayAlguienDentro(): boolean {
  return tieneSesionActiva() || Boolean(localStorage.getItem('usuario-id'));
}

/** Usuario con el que se trabaja si no hay sesión formal o en modo demostración. */
export function usuarioActual(): string {
  return (
    localStorage.getItem('usuario-id') ??
    import.meta.env.VITE_USUARIO_DEMO ??
    ''
  );
}

export function cambiarUsuario(id: string) {
  localStorage.setItem('usuario-id', id);
}

/** Quién pide, en qué idioma y para qué rancho: lo mismo en cada pedido. */
function cabeceras(ruta: string): Record<string, string> {
  const token = tokenAccesoActual();
  const soporte = soporteActual();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    'x-usuario-id': usuarioActual(),
    // HU-25: el servidor contesta sus mensajes en este idioma.
    'Accept-Language': idiomaActual(),
    // HU-24. Las rutas /admin son del Admin fuera de cualquier rancho.
    ...(soporte && !ruta.startsWith('/admin/') ? { 'x-rancho-soporte': soporte.ranchoId } : {}),
  };
}

/**
 * Un archivo que devuelve el servidor (HU-40: la plantilla de Excel). Se
 * guarda con el nombre que manda el servidor, o con el de respaldo.
 */
export async function descargar(ruta: string, nombreDeRespaldo: string): Promise<void> {
  const respuesta = await fetch(`${BASE}${ruta}`, { headers: cabeceras(ruta) });
  if (!respuesta.ok) {
    const cuerpo = await respuesta.json().catch(() => null);
    throw new Error(cuerpo?.message ?? `Error ${respuesta.status}`);
  }
  const disposicion = respuesta.headers.get('Content-Disposition') ?? '';
  const nombre = decodeURIComponent(disposicion.match(/filename="?([^";]+)"?/)?.[1] ?? nombreDeRespaldo);
  guardarArchivo(await respuesta.blob(), nombre);
}

/** Ofrece un archivo armado en el navegador (HU-43: el informe de errores). */
export function guardarArchivo(contenido: Blob, nombre: string): void {
  const enlace = document.createElement('a');
  enlace.href = URL.createObjectURL(contenido);
  enlace.download = nombre;
  enlace.click();
  URL.revokeObjectURL(enlace.href);
}

export async function pedir<T>(
  ruta: string,
  opciones: RequestInit = {},
  esReintento = false,
): Promise<T> {
  const respuesta = await fetch(`${BASE}${ruta}`, {
    ...opciones,
    headers: {
      ...cabeceras(ruta),
      ...(opciones.headers ?? {}),
    },
  });

  const texto = await respuesta.text();
  const cuerpo = texto ? JSON.parse(texto) : null;

  // HU-12: Renovación transparente si el token de acceso expiró (401)
  if (
    respuesta.status === 401 &&
    !esReintento &&
    tokenRefrescoActual() &&
    !ruta.includes('/usuarios/ingreso') &&
    !ruta.includes('/usuarios/refresco')
  ) {
    try {
      const resRefresco = await fetch(`${BASE}/usuarios/refresco`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token_refresco: tokenRefrescoActual() }),
      });
      if (resRefresco.ok) {
        const datos = await resRefresco.json();
        guardarSesion(datos.token_acceso, datos.token_refresco, datos.usuario);
        return pedir<T>(ruta, opciones, true);
      } else {
        limpiarSesionLocal();
      }
    } catch {
      limpiarSesionLocal();
    }
  }

  if (!respuesta.ok) {
    // HU-24: el acceso de soporte venció o se cerró en otra pestaña. Se
    // olvida y se vuelve a la lista de ranchos.
    if (cuerpo?.motivo === 'soporte_vencido') {
      guardarSoporte(null);
      window.location.hash = '#/admin';
    }
    const mensaje = cuerpo?.message ?? `Error ${respuesta.status}`;
    throw new Error(Array.isArray(mensaje) ? mensaje.join(', ') : mensaje);
  }
  return cuerpo as T;
}

export interface Rancho {
  id: string;
  nombre: string;
  departamento: string;
  localidad: string;
  latitud: string | null;
  longitud: string | null;
  superficie: string;
  tipo_produccion: string;
  pais_codigo: string;
  propietario_id: string;
  creado_en?: string;
  modificado_en?: string;
  creado_por?: string;
  modificado_por?: string;
}

export interface Pais {
  codigo: string;
  nombre: string;
  idioma?: string;
  moneda?: string;
  unidad_peso?: string;
  unidad_superficie?: string;
  formato_fecha?: string;
  zona_horaria?: string;
  franja_precio?: string;
}

export interface UsuarioRegistrado {
  id: string;
  nombre: string;
  correo: string;
  rol: string;
  pais_codigo: string;
  correo_verificado: boolean;
}

export interface RespuestaRegistro {
  usuario: UsuarioRegistrado;
  siguiente: string;
  mensaje: string;
  enlace_verificacion: string | null;
}

export interface RespuestaIngreso {
  token_acceso: string;
  token_refresco: string;
  expira_en: string;
  usuario: UsuarioRegistrado & {
    debe_cambiar_contrasena: boolean;
    rancho_id: string | null;
  };
}

/** Lo que el cliente consulta para saber si la cuenta está lista (HU-07, HU-10). */
export interface EstadoCuenta {
  id: string;
  nombre: string;
  correo: string;
  rol: string;
  rancho_id: string | null;
  correo_verificado: boolean;
  debe_cambiar_contrasena: boolean;
  pendiente: 'verificar_correo' | 'cambiar_contrasena' | null;
  /** HU-25. El idioma con el que trabaja, y el que eligió (nulo: el de su país). */
  idioma: string;
  idioma_elegido: string | null;
}

export interface EstadoRancho {
  /** soporte: es el Admin de plataforma, dentro del rancho (HU-24). */
  usuario: { id: string; nombre: string; rol: string; soporte?: boolean };
  tieneRancho: boolean;
  rancho: Rancho | null;
}

/** HU-17 · Un integrante del equipo del rancho. */
export interface MiembroEquipo {
  id: string;
  nombre: string;
  correo: string;
  rol: 'propietario' | 'socio' | 'colaborador';
  estado: 'activo' | 'suspendido';
  tipo_colaborador_id: string | null;
  tipo_colaborador: string | null;
  /** Todavia no entro a cambiar su contraseña temporal. */
  debe_cambiar_contrasena: boolean;
  creado_en: string;
  creado_por_nombre: string | null;
}

/** HU-20 · Qué puede un tipo en un módulo. */
export type NivelPermiso = 'ninguno' | 'ver' | 'editar';

export interface PermisoDeModulo {
  modulo: string;
  nombre: string;
  nivel: NivelPermiso;
}

export interface TipoColaborador {
  id: string;
  nombre: string;
  es_predefinido: boolean;
  /** Un predefinido que el propietario ajustó para su rancho. */
  ajustado: boolean;
  /** Cuántos colaboradores del rancho lo tienen. */
  colaboradores: number;
  /** Los ocho módulos, en orden. */
  permisos: PermisoDeModulo[];
}

export interface DatosTipo {
  id?: string;
  nombre?: string;
  permisos: Record<string, NivelPermiso>;
}

export interface RespuestaTipo {
  tipo: TipoColaborador;
  mensaje: string;
  afectados?: number;
}

export interface DatosAltaMiembro {
  id: string;
  nombre: string;
  correo: string;
  rol: 'socio' | 'colaborador';
  tipo_colaborador_id?: string;
}

/** HU-16 · La guia de configuracion. */
export type ClavePaso = 'animales' | 'corrales' | 'vacunas' | 'equipo';

export interface PasoGuia {
  clave: ClavePaso;
  nombre: string;
  descripcion: string;
  fase: number;
  disponible: boolean;
  ruta: string | null;
  estado: 'pendiente' | 'en_curso' | 'completo';
  /** Cuantos registros tiene ya ese paso (integrantes, animales...). */
  datos: number;
}

export interface EstadoGuia {
  pasos: PasoGuia[];
  completos: number;
  total: number;
  siguiente: ClavePaso | null;
  pausada: boolean;
  terminada: boolean;
}

/** Mi perfil. */
export interface PerfilUsuario {
  id: string;
  nombre: string;
  correo: string;
  rol: 'propietario' | 'socio' | 'colaborador' | 'admin_plataforma';
  estado: string;
  pais_codigo: string | null;
  pais: string | null;
  rancho: string | null;
  tipo_colaborador: string | null;
  creado_en: string;
  modificado_en: string;
  /** HU-25. El que usa, el que eligió (nulo: el del país) y el de su país. */
  idioma: string;
  idioma_elegido: string | null;
  idioma_del_pais: string;
}

/** HU-24 · Un rancho en la lista del Admin de plataforma. */
export interface RanchoParaSoporte {
  id: string;
  nombre: string;
  departamento: string;
  localidad: string;
  pais_codigo: string;
  pais: string | null;
  propietario: string;
  propietario_correo: string;
  integrantes: number;
  creado_en: string;
  acceso_abierto: string | null;
}

/** HU-24 · Una fila del registro de accesos. */
export interface AccesoAdmin {
  id: string;
  admin_id: string;
  admin: string;
  rancho_id: string;
  rancho: string;
  motivo: string;
  entrado_en: string;
  salido_en: string | null;
  estado: 'abierto' | 'cerrado' | 'vencido';
}

// HU-40, HU-43 y HU-44 · Importación de animales. Mismos nombres que devuelve el servidor.
export type EstrategiaDuplicados = 'omitir' | 'actualizar';

export type ColumnaImportacion =
  | 'identificador'
  | 'tipo_identificador'
  | 'nombre'
  | 'raza'
  | 'sexo'
  | 'categoria'
  | 'fecha_nacimiento'
  | 'origen'
  | 'corral'
  | 'peso';

export interface ErrorDeFila {
  fila: number;
  identificador: string | null;
  columna: ColumnaImportacion | null;
  motivo: string;
}

export interface FilaRepetida {
  fila: number;
  identificador: string;
  /** archivo: ya apareció más arriba en el archivo. rancho: ya existe en el rancho. */
  en: 'archivo' | 'rancho';
}

export interface FilaPrevia {
  fila: number;
  accion: 'nueva' | 'actualizar';
  identificador: string;
  tipo_identificador: TipoIdentificador;
  nombre: string | null;
  raza: string | null;
  sexo: Sexo;
  categoria_codigo: string | null;
  fecha_nacimiento: string | null;
  origen: Origen | null;
  corral: string | null;
  peso_kg: number | null;
}

/**
 * HU-41 y HU-42 · Cómo se interpretó cada columna del archivo.
 * plantilla: igual a la plantilla; variante: por un sinónimo o con un error de
 * tipeo; manual: la eligió el usuario; ignorada: el usuario no la quiere;
 * null: no se reconoció y hay que preguntarla.
 */
export type ComoSeReconocio = 'plantilla' | 'variante' | 'manual' | 'ignorada' | null;

export interface ColumnaDelArchivo {
  /** Posición en el archivo, desde 0: la clave en `asignaciones`. */
  posicion: number;
  encabezado: string;
  campo: ColumnaImportacion | null;
  como: ComoSeReconocio;
}

/** HU-42 · Para cada columna no reconocida: el campo elegido o 'ignorar'. */
export type AsignacionesColumnas = Record<string, ColumnaImportacion | 'ignorar'>;

export interface InformeImportacion {
  estrategia: EstrategiaDuplicados;
  /** false mientras falte asignar una columna obligatoria (HU-42). */
  listo: boolean;
  /** HU-41, criterio 3. */
  columnas: ColumnaDelArchivo[];
  faltan: ColumnaImportacion[];
  campos: ColumnaImportacion[];
  resumen: {
    total: number;
    cargan: number;
    nuevas: number;
    actualizan: number;
    con_error: number;
    repetidas: number;
    repetidas_en_archivo: number;
    existentes: number;
  };
  vista_previa: FilaPrevia[];
  errores: ErrorDeFila[];
  repetidas: FilaRepetida[];
}

export interface ResultadoImportacion {
  mensaje: string;
  resumen: { insertados: number; actualizados: number; omitidos: number; con_error: number };
}

export interface ArchivoAImportar {
  nombre_archivo: string;
  contenido_base64: string;
}

// HU-21 y HU-22 · Lo que puede quien entró en cada módulo.
export type NivelModulo = 'ninguno' | 'ver' | 'editar';
export type MisPermisos = Record<string, NivelModulo>;

// HU-36 · Corrales. La superficie viaja siempre en hectáreas (HU-26).
export interface Corral {
  id: string;
  nombre: string;
  capacidad: number | null;
  superficie_ha: string | null;
  ocupacion: number;
  sobrepoblado: boolean;
  /** Lo máximo que admite la superficie según el tipo de producción; nulo sin superficie. */
  limite_superficie: number | null;
  eliminado_en: string | null;
}

/** Cuántos animales admite cada hectárea en este rancho (comun/carga-animal.ts del servidor). */
/** HU-28 · Una raza para elegir: del catálogo (con grupo) o propia del rancho (grupo nulo). */
export interface Raza {
  nombre: string;
  grupo: 'carne' | 'leche' | 'doble' | null;
}

/** HU-28 · Qué sexo y qué edad corresponden a cada categoría (comun/categorias-animal.ts del servidor). */
export interface ReglaCategoria {
  codigo: string;
  sexo: Sexo;
  edad_minima_meses: number;
  edad_maxima_meses: number | null;
}

export interface CargaAnimal {
  tipo_produccion: 'carne' | 'leche' | 'mixto';
  animales_por_hectarea: number;
}

export interface DatosCorral {
  nombre: string;
  capacidad: number | null;
  superficie_ha: number | null;
}

// HU-28, HU-33, HU-34 y HU-39 · Animales. El peso viaja siempre en kilos.
export type EstadoAnimal = 'activo' | 'vendido' | 'muerto' | 'archivado';
export type Sexo = 'macho' | 'hembra';
export type Origen = 'nacido' | 'comprado' | 'otro';
export type TipoIdentificador = 'caravana' | 'interno' | 'rfid';

export interface DatosFichaAnimal {
  nombre: string | null;
  raza: string | null;
  sexo: Sexo;
  categoria_codigo: string | null;
  fecha_nacimiento: string | null;
  origen: Origen | null;
  peso_kg: number | null;
}

export interface Animal extends DatosFichaAnimal {
  id: string;
  identificador: string;
  tipo_identificador: TipoIdentificador;
  corral_id: string | null;
  corral_nombre: string | null;
  estado: EstadoAnimal;
  creado_en: string;
  modificado_en: string;
  /** HU-23: quien registró la ficha y quien la modificó por última vez. */
  creado_por_nombre: string | null;
  modificado_por_nombre: string | null;
  eliminado_en: string | null;
}

/** HU-29 · Filtros del listado. Los vacíos no se mandan. */
export interface FiltrosAnimales {
  busqueda?: string;
  sexo?: Sexo | '';
  categoria?: string;
  corral?: string;
  /** AAAA-MM-DD, por fecha de nacimiento. */
  fechaDesde?: string;
  fechaHasta?: string;
}

/** HU-30 · Por qué columna se ordena el listado (las mismas claves que el servidor). */
export type OrdenAnimales =
  | 'identificador'
  | 'nombre'
  | 'sexo'
  | 'categoria'
  | 'nacimiento'
  | 'corral'
  | 'estado'
  | 'peso'
  | 'creado';

export type DireccionOrden = 'asc' | 'desc';

/** HU-30 · Qué página se pide y cómo ordenada. */
export interface PedidoPagina {
  pagina: number;
  porPagina: number;
  orden: OrdenAnimales;
  direccion: DireccionOrden;
}

/** HU-30 · Una página del listado, ordenada y paginada en la base. */
export interface PaginaAnimales {
  animales: Animal[];
  total: number;
  pagina: number;
  por_pagina: number;
  paginas: number;
  orden: OrdenAnimales;
  direccion: DireccionOrden;
}

/** HU-34 · Qué bajas trae el listado: ninguna, también las bajas o solo las bajas. */
export type BajasListado = 'no' | 'con' | 'solo';

export interface MovimientoCorral {
  id: string;
  fecha: string;
  corral_origen_id: string | null;
  corral_origen: string | null;
  corral_destino_id: string | null;
  corral_destino: string | null;
  registrado_por: string | null;
}

export interface CambioEstado {
  id: string;
  estado_anterior: EstadoAnimal;
  estado_nuevo: EstadoAnimal;
  fecha: string;
  motivo: string;
  /** HU-32: cuándo quedó guardado; fecha es el día que eligió el usuario. */
  creado_en: string;
  registrado_por: string | null;
}

export interface FichaAnimal {
  animal: Animal;
  movimientos: MovimientoCorral[];
  estados: CambioEstado[];
}

export interface RespuestaAnimal {
  animal: Animal;
  mensaje: string;
  /** HU-38: el corral de destino quedó por encima de su capacidad. */
  aviso?: string | null;
}

/** HU-37 · Resultado de asignar animales a un corral. */
export interface RespuestaAsignacion {
  corral: Corral;
  movidos: number;
  ya_estaban: number;
  no_encontrados: number;
  mensaje: string;
  /** HU-38: el aviso no impide la asignación, solo advierte. */
  aviso: string | null;
}

export interface RespuestaCorral {
  corral: Corral;
  mensaje: string;
}

export const api = {
  paises: () => pedir<Pais[]>('/paises'),

  // HU-06: Registro
  registrar: (datos: Record<string, unknown>) =>
    pedir<RespuestaRegistro>('/usuarios/registro', {
      method: 'POST',
      body: JSON.stringify(datos),
    }),

  // HU-08: Inicio de sesión
  ingresar: (credenciales: { correo: string; contrasena: string }) =>
    pedir<RespuestaIngreso>('/usuarios/ingreso', {
      method: 'POST',
      body: JSON.stringify(credenciales),
    }),

  // HU-12: Manejo de sesión y cierre
  refrescar: (token_refresco: string) =>
    pedir<RespuestaIngreso>('/usuarios/refresco', {
      method: 'POST',
      body: JSON.stringify({ token_refresco }),
    }),

  cerrarSesion: async () => {
    const tokenRefresco = tokenRefrescoActual();
    try {
      if (tokenRefresco) {
        await pedir<{ mensaje: string }>('/usuarios/cierre', {
          method: 'POST',
          body: JSON.stringify({ token_refresco: tokenRefresco }),
        });
      }
    } finally {
      limpiarSesionLocal();
    }
  },

  // HU-07: Verificación de correo
  yo: () => pedir<EstadoCuenta>('/usuarios/yo'),
  verificarCorreo: (token: string) =>
    pedir<{ mensaje: string }>('/usuarios/verificacion', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),
  reenviarVerificacion: (correo: string) =>
    pedir<{ mensaje: string; enlace: string | null }>(
      '/usuarios/verificacion/reenvio',
      {
        method: 'POST',
        body: JSON.stringify({ correo }),
      },
    ),

  // HU-10: Contraseñas
  cambiarMiContrasena: (actual: string, nueva: string) =>
    pedir<{ mensaje: string }>('/usuarios/mi-contrasena', {
      method: 'POST',
      body: JSON.stringify({
        contrasena_actual: actual,
        contrasena_nueva: nueva,
      }),
    }),
  restablecerContrasena: (usuarioId: string) =>
    pedir<{ mensaje: string; aviso: string }>(
      `/usuarios/${usuarioId}/restablecer-contrasena`,
      { method: 'POST' },
    ),

  // Ranchos
  miRancho: () => pedir<EstadoRancho>('/ranchos/mio'),
  crear: (datos: Record<string, unknown>) =>
    pedir<Rancho>('/ranchos', {
      method: 'POST',
      body: JSON.stringify(datos),
    }),
  actualizar: (id: string, datos: Record<string, unknown>) =>
    pedir<Rancho>(`/ranchos/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(datos),
    }),
  darDeBaja: (id: string) =>
    pedir<{ mensaje: string }>(`/ranchos/${id}`, { method: 'DELETE' }),

  // HU-09
  solicitarRecuperacion: (correo: string) =>
    pedir<{ mensaje: string }>('/usuarios/recuperacion-contrasena', {
      method: 'POST',
      body: JSON.stringify({ correo }),
    }),
  ejecutarRecuperacion: (token: string, contrasena_nueva: string) =>
    pedir<{ mensaje: string }>('/usuarios/recuperacion-contrasena/ejecutar', {
      method: 'POST',
      body: JSON.stringify({ token, contrasena_nueva }),
    }),

  // HU-13
  agregarColaborador: (datos: { correo: string; nombre?: string; rol?: string }) =>
    pedir<{ mensaje: string }>('/usuarios/colaboradores', {
      method: 'POST',
      body: JSON.stringify(datos),
    }),

  // HU-17 · Equipo
  equipo: () => pedir<MiembroEquipo[]>('/equipo'),
  tiposColaborador: () => pedir<TipoColaborador[]>('/equipo/tipos'),
  darDeAltaMiembro: (datos: DatosAltaMiembro) =>
    pedir<{ miembro: MiembroEquipo; mensaje: string; aviso: string }>('/equipo', {
      method: 'POST',
      body: JSON.stringify(datos),
    }),
  cambiarEstadoMiembro: (id: string, estado: 'activo' | 'suspendido') =>
    pedir<{ miembro: MiembroEquipo; mensaje: string }>(`/equipo/${id}/estado`, {
      method: 'PATCH',
      body: JSON.stringify({ estado }),
    }),

  // HU-20 · Tipos de colaborador
  modulosConPermisos: () => pedir<{ codigo: string; nombre: string }[]>('/equipo/modulos'),
  crearTipo: (datos: DatosTipo) =>
    pedir<RespuestaTipo>('/equipo/tipos', { method: 'POST', body: JSON.stringify(datos) }),
  actualizarTipo: (id: string, datos: DatosTipo) =>
    pedir<RespuestaTipo>(`/equipo/tipos/${id}`, { method: 'PUT', body: JSON.stringify(datos) }),
  restablecerTipo: (id: string) =>
    pedir<RespuestaTipo>(`/equipo/tipos/${id}/restablecer`, { method: 'POST' }),
  eliminarTipo: (id: string) =>
    pedir<{ mensaje: string }>(`/equipo/tipos/${id}`, { method: 'DELETE' }),
  asignarTipo: (usuarioId: string, tipoId: string) =>
    pedir<{ tipo_colaborador_id: string; tipo_colaborador: string; mensaje: string }>(
      `/equipo/${usuarioId}/tipo`,
      { method: 'PATCH', body: JSON.stringify({ tipo_colaborador_id: tipoId }) },
    ),

  // HU-16 · Guia de configuracion
  guia: () => pedir<EstadoGuia>('/guia'),
  visitarPaso: (paso: ClavePaso) =>
    pedir<EstadoGuia>(`/guia/pasos/${paso}/visita`, { method: 'POST' }),
  completarPaso: (paso: ClavePaso) =>
    pedir<EstadoGuia>(`/guia/pasos/${paso}/completar`, { method: 'POST' }),
  reabrirPaso: (paso: ClavePaso) =>
    pedir<EstadoGuia>(`/guia/pasos/${paso}/reabrir`, { method: 'POST' }),
  pausarGuia: (pausada: boolean) =>
    pedir<EstadoGuia>('/guia/pausa', { method: 'POST', body: JSON.stringify({ pausada }) }),

  // Mi perfil
  perfil: () => pedir<PerfilUsuario>('/usuarios/yo/perfil'),
  actualizarPerfil: (datos: { nombre?: string; idioma?: string | null; pais_codigo?: string }) =>
    pedir<{ perfil: PerfilUsuario; mensaje: string }>('/usuarios/yo/perfil', {
      method: 'PATCH',
      body: JSON.stringify(datos),
    }),

  // HU-24 · Admin de plataforma
  adminRanchos: () => pedir<RanchoParaSoporte[]>('/admin/ranchos'),
  entrarARancho: (ranchoId: string, motivo: string) =>
    pedir<{ acceso: AccesoAdmin; mensaje: string }>(`/admin/ranchos/${ranchoId}/accesos`, {
      method: 'POST',
      body: JSON.stringify({ motivo }),
    }),
  salirDeRancho: (accesoId: string) =>
    pedir<{ mensaje: string }>(`/admin/accesos/${accesoId}/salida`, { method: 'POST' }),
  accesosAdmin: () => pedir<AccesoAdmin[]>('/admin/accesos'),
  accesosDeMiRancho: () => pedir<AccesoAdmin[]>('/admin/accesos/de-mi-rancho'),

  // HU-40, HU-43 y HU-44 · Importación de animales
  descargarPlantilla: () => descargar('/importacion/plantilla', 'plantilla.xlsx'),
  // HU-41 y HU-42: `asignaciones` lleva lo elegido a mano para las columnas no reconocidas.
  vistaPreviaImportacion: (
    archivo: ArchivoAImportar,
    estrategia: EstrategiaDuplicados,
    asignaciones: AsignacionesColumnas = {},
  ) =>
    pedir<InformeImportacion>('/importacion/vista-previa', {
      method: 'POST',
      body: JSON.stringify({ ...archivo, estrategia, asignaciones }),
    }),
  confirmarImportacion: (
    archivo: ArchivoAImportar,
    estrategia: EstrategiaDuplicados,
    asignaciones: AsignacionesColumnas = {},
  ) =>
    pedir<ResultadoImportacion>('/importacion/confirmar', {
      method: 'POST',
      body: JSON.stringify({ ...archivo, estrategia, asignaciones }),
    }),
  // HU-21 y HU-22 · Permisos por módulo
  misPermisos: () => pedir<MisPermisos>('/permisos/mios'),
  permisosSocio: (id: string) => pedir<{ modulos: string[] }>(`/permisos/socios/${id}`),
  guardarPermisosSocio: (id: string, modulos: string[]) =>
    pedir<{ modulos: string[]; mensaje: string }>(`/permisos/socios/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ modulos }),
    }),

  // HU-36 y HU-34 · Corrales
  corrales: (conBajas = false) => pedir<Corral[]>(`/corrales${conBajas ? '?bajas=1' : ''}`),
  cargaCorrales: () => pedir<CargaAnimal>('/corrales/carga'),
  crearCorral: (datos: DatosCorral) =>
    pedir<RespuestaCorral>('/corrales', { method: 'POST', body: JSON.stringify(datos) }),
  actualizarCorral: (id: string, datos: DatosCorral) =>
    pedir<RespuestaCorral>(`/corrales/${id}`, { method: 'PATCH', body: JSON.stringify(datos) }),
  asignarAnimales: (corralId: string, animalIds: string[]) =>
    pedir<RespuestaAsignacion>(`/corrales/${corralId}/animales`, {
      method: 'POST',
      body: JSON.stringify({ animal_ids: animalIds }),
    }),
  bajaCorral: (id: string) => pedir<{ mensaje: string }>(`/corrales/${id}`, { method: 'DELETE' }),
  restaurarCorral: (id: string) =>
    pedir<RespuestaCorral>(`/corrales/${id}/restaurar`, { method: 'POST' }),

  // HU-47, HU-50 y HU-51 · Sanidad: esquemas, calendario y avisos
  esquemasVacunacion: () => pedir<ListaEsquemas>('/sanidad/esquemas'),
  crearEsquema: (datos: DatosEsquema) =>
    pedir<RespuestaEsquema>('/sanidad/esquemas', { method: 'POST', body: JSON.stringify(datos) }),
  actualizarEsquema: (id: string, datos: DatosEsquema) =>
    pedir<RespuestaEsquema>(`/sanidad/esquemas/${id}`, { method: 'PATCH', body: JSON.stringify(datos) }),
  bajaEsquema: (id: string) => pedir<{ mensaje: string }>(`/sanidad/esquemas/${id}`, { method: 'DELETE' }),
  calendarioSanitario: (filtro: FiltroCalendario) => {
    const parametros = new URLSearchParams();
    for (const [clave, valor] of Object.entries(filtro)) {
      if (valor !== undefined && valor !== null && valor !== '') parametros.set(clave, String(valor));
    }
    return pedir<CalendarioSanitario>(`/sanidad/calendario?${parametros.toString()}`);
  },
  avisosSanidad: () => pedir<AvisosSanidad>('/sanidad/avisos'),

  // HU-46 y HU-48 · Sanidad: catálogo de productos y aplicaciones
  productosSanitarios: () => pedir<{ productos: ProductoSanitario[] }>('/sanidad/productos'),
  crearProducto: (datos: DatosProducto) =>
    pedir<RespuestaProducto>('/sanidad/productos', { method: 'POST', body: JSON.stringify(datos) }),
  actualizarProducto: (id: string, datos: DatosProducto) =>
    pedir<RespuestaProducto>(`/sanidad/productos/${id}`, { method: 'PATCH', body: JSON.stringify(datos) }),
  bajaProducto: (id: string) => pedir<{ mensaje: string }>(`/sanidad/productos/${id}`, { method: 'DELETE' }),
  opcionesAplicacion: () => pedir<OpcionesAplicacion>('/sanidad/aplicaciones/opciones'),
  aplicacionesAnimal: (animalId: string) =>
    pedir<{ aplicaciones: AplicacionSanitaria[] }>(`/sanidad/animales/${animalId}/aplicaciones`),
  registrarAplicacion: (animalId: string, datos: DatosAplicacion) =>
    pedir<RespuestaAplicacion>(`/sanidad/animales/${animalId}/aplicaciones`, {
      method: 'POST',
      body: JSON.stringify(datos),
    }),
  // HU-49 y HU-52
  aplicacionMasiva: (animalIds: string[], datos: DatosAplicacion) =>
    pedir<RespuestaAplicacionMasiva>('/sanidad/aplicaciones/masiva', {
      method: 'POST',
      body: JSON.stringify({ animal_ids: animalIds, ...datos }),
    }),
  buscarAnimalSanidad: (identificador: string) =>
    pedir<{ animal: AnimalSanidad }>(
      `/sanidad/animales/buscar?${new URLSearchParams({ identificador }).toString()}`,
    ),

  // HU-28, HU-33, HU-34 y HU-39 · Animales
  categoriasAnimal: () => pedir<string[]>('/animales/categorias'),
  reglasCategorias: () => pedir<ReglaCategoria[]>('/animales/categorias/reglas'),
  razas: () => pedir<Raza[]>('/animales/razas'),
  animales: (estado: EstadoAnimal | 'todos' = 'activo', conBajas = false, filtros: FiltrosAnimales = {}) => {
    const parametros = new URLSearchParams({ estado });
    if (conBajas) parametros.set('bajas', '1');
    for (const [clave, valor] of Object.entries(filtros)) {
      const limpio = typeof valor === 'string' ? valor.trim() : '';
      if (limpio) parametros.set(clave, limpio);
    }
    return pedir<Animal[]>(`/animales?${parametros.toString()}`);
  },
  /**
   * HU-30 · Una página del listado. El filtro, el orden y la página viajan
   * juntos en cada pedido, así que cambiar de página no pierde ninguno.
   */
  paginaAnimales: (
    estado: EstadoAnimal | 'todos',
    bajas: BajasListado,
    filtros: FiltrosAnimales,
    pagina: PedidoPagina,
  ) => {
    const parametros = new URLSearchParams({ estado });
    if (bajas === 'con') parametros.set('bajas', '1');
    if (bajas === 'solo') parametros.set('bajas', 'solo');
    for (const [clave, valor] of Object.entries(filtros)) {
      const limpio = typeof valor === 'string' ? valor.trim() : '';
      if (limpio) parametros.set(clave, limpio);
    }
    parametros.set('pagina', String(pagina.pagina));
    parametros.set('porPagina', String(pagina.porPagina));
    parametros.set('orden', pagina.orden);
    parametros.set('direccion', pagina.direccion);
    return pedir<PaginaAnimales>(`/animales?${parametros.toString()}`);
  },
  fichaAnimal: (id: string) => pedir<FichaAnimal>(`/animales/${id}`),
  crearAnimal: (
    datos: DatosFichaAnimal & {
      identificador: string;
      tipo_identificador: TipoIdentificador;
      corral_id: string | null;
    },
  ) => pedir<RespuestaAnimal>('/animales', { method: 'POST', body: JSON.stringify(datos) }),
  actualizarAnimal: (id: string, datos: DatosFichaAnimal) =>
    pedir<RespuestaAnimal>(`/animales/${id}`, { method: 'PATCH', body: JSON.stringify(datos) }),
  moverAnimal: (id: string, corralId: string | null) =>
    pedir<RespuestaAnimal>(`/animales/${id}/movimientos`, {
      method: 'POST',
      body: JSON.stringify({ corral_id: corralId }),
    }),
  cambiarEstadoAnimal: (id: string, estado: EstadoAnimal, motivo: string, fecha: string) =>
    pedir<RespuestaAnimal>(`/animales/${id}/estado`, {
      method: 'POST',
      body: JSON.stringify({ estado, motivo, fecha }),
    }),
  bajaAnimal: (id: string) => pedir<{ mensaje: string }>(`/animales/${id}`, { method: 'DELETE' }),
  restaurarAnimal: (id: string) =>
    pedir<RespuestaAnimal>(`/animales/${id}/restaurar`, { method: 'POST' }),

  // HU-31 · Acciones masivas sobre animales
  cambiarEstadoMasivo: (animalIds: string[], estado: EstadoAnimal, motivo: string, fecha: string) =>
    pedir<RespuestaEstadoMasivo>('/masivo/animales/estado', {
      method: 'POST',
      body: JSON.stringify({ animal_ids: animalIds, estado, motivo, fecha }),
    }),
  bajaMasiva: (animalIds: string[]) =>
    pedir<RespuestaBajaMasiva>('/masivo/animales/baja', {
      method: 'POST',
      body: JSON.stringify({ animal_ids: animalIds }),
    }),

  // HU-53 · Pesajes. El peso va siempre en kilos (HU-26): convierte quien llama.
  pesajesAnimal: (id: string) => pedir<PesajesDeAnimal>(`/pesajes/animales/${id}`),
  registrarPesaje: (datos: DatosPesaje) =>
    pedir<RespuestaPesaje>('/pesajes', { method: 'POST', body: JSON.stringify(datos) }),
  pesablesMasivo: (animalIds: string[]) =>
    pedir<RespuestaPesables>('/pesajes/masivo/animales', {
      method: 'POST',
      body: JSON.stringify({ animal_ids: animalIds }),
    }),
  registrarPesajeMasivo: (datos: DatosPesajeMasivo) =>
    pedir<RespuestaPesajeMasivo>('/pesajes/masivo', { method: 'POST', body: JSON.stringify(datos) }),
  // HU-55 · Registro rápido desde el celular: caravana y peso (en kilos).
  registrarPesajeRapido: (datos: DatosPesajeRapido) =>
    pedir<RespuestaPesajeRapido>('/pesajes/rapido', { method: 'POST', body: JSON.stringify(datos) }),

  // HU-45 · Exportación
  exportar: (pedido: PedidoExportacion) => descargar(`/exportacion?${parametrosExportacion(pedido)}`, 'ganado.xlsx'),
};

/** HU-31. Cuántos cambiaron, cuántos ya estaban en ese estado y cuántos no se encontraron. */
export interface RespuestaEstadoMasivo {
  cambiados: number;
  ya_estaban: number;
  no_encontrados: number;
  mensaje: string;
}

export interface RespuestaBajaMasiva {
  dados_de_baja: number;
  no_encontrados: number;
  mensaje: string;
}

/** HU-45 · Qué se exporta, en qué formato y con qué filtros del listado. */
export type ConjuntoExportacion = 'animales' | 'corrales' | 'movimientos' | 'estados';
export type FormatoExportacion = 'xlsx' | 'csv';

export interface PedidoExportacion {
  que: ConjuntoExportacion[];
  formato: FormatoExportacion;
  /** La pestaña del listado: un estado, todos o las bajas. */
  vista: EstadoAnimal | 'todos' | 'bajas';
  filtros: FiltrosAnimales;
}

/** Los parámetros de GET /exportacion. Los filtros vacíos no se mandan. */
export function parametrosExportacion(pedido: PedidoExportacion): string {
  const parametros = new URLSearchParams({
    que: pedido.que.join(','),
    formato: pedido.formato,
    vista: pedido.vista,
  });
  for (const [clave, valor] of Object.entries(pedido.filtros)) {
    const limpio = typeof valor === 'string' ? valor.trim() : '';
    if (limpio) parametros.set(clave, limpio);
  }
  return parametros.toString();
}

// ---------------------------------------------------------------------------
// HU-47 · Esquemas de vacunación
// ---------------------------------------------------------------------------

export interface EsquemaVacunacion {
  id: string;
  producto_id: string;
  producto_nombre: string;
  producto_tipo: string;
  nombre: string;
  /** Nulo: todas las categorías. */
  categorias: string[] | null;
  /** Nulo: los dos sexos. */
  sexo: Sexo | null;
  edad_minima_meses: number;
  edad_maxima_meses: number | null;
  dosis: number;
  intervalo_dias: number | null;
  refuerzo_dias: number | null;
  /** Animales activos que entran por categoría y sexo. */
  animales: number;
  creado_en: string;
}

export interface ProductoSanitarioElegible {
  id: string;
  nombre: string;
  tipo: string;
}

export interface ListaEsquemas {
  esquemas: EsquemaVacunacion[];
  productos: ProductoSanitarioElegible[];
  categorias: string[];
}

export interface DatosEsquema {
  producto_id: string;
  nombre: string;
  categorias: string[] | null;
  sexo: Sexo | null;
  edad_minima_meses: number | null;
  edad_maxima_meses: number | null;
  dosis: number | null;
  intervalo_dias: number | null;
  refuerzo_dias: number | null;
}

export interface RespuestaEsquema {
  esquema: EsquemaVacunacion;
  mensaje: string;
}

// ---------------------------------------------------------------------------
// HU-50 y HU-51 · Calendario sanitario y avisos
// ---------------------------------------------------------------------------

export type EstadoDosis = 'vencida' | 'proxima' | 'programada';

export interface FiltroCalendario {
  desde?: string;
  hasta?: string;
  producto?: string;
  corral?: string;
  estado?: EstadoDosis | '';
  pagina?: number;
  porPagina?: number;
}

export interface DosisPendiente {
  animal_id: string;
  identificador: string;
  animal_nombre: string | null;
  categoria_codigo: string | null;
  corral_nombre: string | null;
  esquema_id: string;
  esquema_nombre: string;
  producto_nombre: string;
  /** Qué dosis de la serie toca; nulo si es un refuerzo. */
  numero_dosis: number | null;
  dosis_total: number;
  /** AAAA-MM-DD. */
  vence: string;
  /** Días que faltan; negativo si está vencida. */
  dias: number;
  estado: EstadoDosis;
}

export interface CalendarioSanitario {
  resumen: Record<EstadoDosis, number>;
  total: number;
  dosis: DosisPendiente[];
  pagina: number;
  por_pagina: number;
  dias_proxima: number;
}

export interface AvisosSanidad {
  vencidas: number;
  proximas: number;
  dias_proxima: number;
}

// ---------------------------------------------------------------------------
// HU-53 · Pesajes
// ---------------------------------------------------------------------------

export interface Pesaje {
  id: string;
  animal_id: string;
  /** AAAA-MM-DD, el día del pesaje. */
  fecha: string;
  /** Siempre en kilos (HU-26). */
  peso_kg: number;
  observacion: string | null;
  /** Los de una misma carga masiva comparten lote. */
  lote_id: string | null;
  /** Cuándo quedó guardado (para el historial). */
  creado_en: string;
  registrado_por: string | null;
}

export interface PesajesDeAnimal {
  animal: {
    id: string;
    identificador: string;
    estado: EstadoAnimal;
    eliminado: boolean;
    peso_kg: number | null;
  };
  /** Del más nuevo al más viejo. */
  pesajes: Pesaje[];
  maximo_kg: number;
}

export interface DatosPesaje {
  animal_id: string;
  peso_kg: number;
  fecha: string;
  observacion?: string | null;
}

export interface RespuestaPesaje {
  pesaje: Pesaje;
  peso_actual_kg: number | null;
  mensaje: string;
}

/** Un animal elegido que se puede pesar: vigente, activo y del rancho. */
export interface AnimalPesable {
  id: string;
  identificador: string;
  nombre: string | null;
  categoria_codigo: string | null;
  corral_nombre: string | null;
  estado: EstadoAnimal;
  fecha_nacimiento: string | null;
  peso_kg: number | null;
}

export interface RespuestaPesables {
  animales: AnimalPesable[];
  /** Los elegidos que no se pueden pesar (dados de baja, no activos o de otro rancho). */
  no_pesables: number;
  maximo: number;
  maximo_kg: number;
}

export interface DatosPesajeMasivo {
  fecha: string;
  observacion?: string | null;
  pesajes: { animal_id: string; peso_kg: number }[];
}

export interface RespuestaPesajeMasivo {
  registrados: number;
  lote_id: string;
  mensaje: string;
}

// ---------------------------------------------------------------------------
// HU-46 · Catálogo de productos sanitarios
// ---------------------------------------------------------------------------

export type TipoProducto = 'vacuna' | 'antiparasitario' | 'vitamina' | 'antibiotico' | 'otro';
export type UnidadDosis = 'ml' | 'g' | 'mg' | 'dosis';

export interface ProductoSanitario {
  id: string;
  nombre: string;
  tipo: TipoProducto;
  laboratorio: string | null;
  /** Dosis por animal; va con su unidad o no va. */
  dosis: number | null;
  unidad: UnidadDosis | null;
  /** Esquemas vigentes que lo usan: mientras haya, no se da de baja. */
  esquemas: number;
  aplicaciones: number;
}

export interface DatosProducto {
  nombre: string;
  tipo: TipoProducto | '';
  laboratorio: string | null;
  dosis: number | null;
  unidad: UnidadDosis | null;
}

export interface RespuestaProducto {
  producto: ProductoSanitario;
  mensaje: string;
}

// ---------------------------------------------------------------------------
// HU-48 · Registro de aplicación individual
// ---------------------------------------------------------------------------

export interface AplicacionSanitaria {
  id: string;
  fecha: string;
  producto_id: string;
  producto_nombre: string;
  producto_tipo: TipoProducto;
  /** HU-46: el producto se dio de baja después; la aplicación lo sigue mostrando. */
  producto_dado_de_baja: boolean;
  esquema_id: string | null;
  esquema_nombre: string | null;
  /** Qué dosis del esquema fue; nulo con esquema es un refuerzo. */
  numero_dosis: number | null;
  dosis: number | null;
  unidad: UnidadDosis | null;
  aplicado_por: string;
  aplicado_por_nombre: string | null;
  observacion: string | null;
  /** HU-32: cuándo quedó guardada; fecha es el día que se aplicó. */
  creado_en: string;
  registrado_por: string | null;
}

export interface EsquemaElegible {
  id: string;
  nombre: string;
  producto_id: string;
  dosis: number;
  refuerzo_dias: number | null;
}

export interface OpcionesAplicacion {
  productos: ProductoSanitario[];
  esquemas: EsquemaElegible[];
  integrantes: { id: string; nombre: string }[];
  /** Hoy en la zona horaria del rancho: la fecha no puede pasar de acá. */
  hoy: string;
}

export interface DatosAplicacion {
  producto_id: string;
  fecha: string;
  dosis: number | null;
  esquema_id: string | null;
  numero_dosis: number | null;
  aplicado_por: string | null;
  observacion: string | null;
}

export interface RespuestaAplicacion {
  aplicacion: AplicacionSanitaria;
  mensaje: string;
}

// ---------------------------------------------------------------------------
// HU-49 · Aplicación masiva y HU-52 · Registrar vacuna desde el celular
// ---------------------------------------------------------------------------

export interface RespuestaAplicacionMasiva {
  registradas: number;
  /** Elegidos que no contaron: dados de baja, de otro rancho o repetidos. */
  no_contados: number;
  lote_id: string;
  mensaje: string;
}

/** El animal que se encontró por su caravana. */
export interface AnimalSanidad {
  id: string;
  identificador: string;
  nombre: string | null;
  sexo: Sexo;
  categoria_codigo: string | null;
  fecha_nacimiento: string | null;
  eliminado_en: string | null;
}

// ---------------------------------------------------------------------------
// HU-55 · Registro rápido de pesaje desde el celular
// ---------------------------------------------------------------------------

export interface DatosPesajeRapido {
  /** La caravana (o el identificador que tenga), sin mirar mayúsculas. */
  identificador: string;
  /** Siempre en kilos (HU-26). */
  peso_kg: number;
  /** AAAA-MM-DD; sin fecha es hoy en el país del rancho. */
  fecha?: string;
}

export interface RespuestaPesajeRapido extends RespuestaPesaje {
  animal: {
    id: string;
    identificador: string;
    nombre: string | null;
    categoria_codigo: string | null;
    corral_nombre: string | null;
  };
  /** El pesaje anterior al recién guardado, para la ganancia diaria (HU-54). Nulo si es el primero. */
  anterior: { fecha: string; peso_kg: number } | null;
}
