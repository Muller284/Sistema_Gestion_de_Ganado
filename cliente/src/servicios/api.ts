/**
 * Llamadas al servidor. Ninguna pantalla habla directo con fetch.
 *
 * HU-08 y HU-12:
 * Soporta autenticación mediante token de acceso firmado y renovación automática
 * mediante token de refresco revocable (vida de 30 días sin actividad).
 */
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

export function limpiarSesionLocal() {
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

async function pedir<T>(
  ruta: string,
  opciones: RequestInit = {},
  esReintento = false,
): Promise<T> {
  const token = tokenAccesoActual();
  const respuesta = await fetch(`${BASE}${ruta}`, {
    ...opciones,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'x-usuario-id': usuarioActual(),
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
}

export interface EstadoRancho {
  usuario: { id: string; nombre: string; rol: string };
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
  actualizarPerfil: (datos: { nombre: string }) =>
    pedir<{ perfil: PerfilUsuario; mensaje: string }>('/usuarios/yo/perfil', {
      method: 'PATCH',
      body: JSON.stringify(datos),
    }),
};
