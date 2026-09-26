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
  usuario?: any,
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
}

export interface Pais {
  codigo: string;
  nombre: string;
  idioma?: string;
  moneda?: string;
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
};
