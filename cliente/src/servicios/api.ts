/**
 * Llamadas al servidor. Ninguna pantalla habla directo con fetch.
 *
 * El usuario va en la cabecera x-usuario-id mientras no exista el inicio de
 * sesion (HU-08, de Favio). Cuando exista, se cambia solo este archivo.
 */
const BASE = import.meta.env.VITE_API ?? 'http://localhost:3000';

/** Usuario con el que se trabaja mientras no hay inicio de sesion. */
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

async function pedir<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  const respuesta = await fetch(`${BASE}${ruta}`, {
    ...opciones,
    headers: {
      'Content-Type': 'application/json',
      'x-usuario-id': usuarioActual(),
      ...(opciones.headers ?? {}),
    },
  });

  const texto = await respuesta.text();
  const cuerpo = texto ? JSON.parse(texto) : null;

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
  /** Solo mientras el correo se "envia" por consola. Ver HU-07. */
  enlace_verificacion: string | null;
}

/** Lo que el cliente consulta para saber si la cuenta esta lista (HU-07, HU-10). */
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
  // HU-06. Es la unica llamada que no necesita usuario: quien se registra
  // todavia no tiene cuenta.
  registrar: (datos: Record<string, unknown>) =>
    pedir<RespuestaRegistro>('/usuarios/registro', {
      method: 'POST',
      body: JSON.stringify(datos),
    }),

  // HU-07
  yo: () => pedir<EstadoCuenta>('/usuarios/yo'),
  verificarCorreo: (token: string) =>
    pedir<{ mensaje: string }>('/usuarios/verificacion', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),
  reenviarVerificacion: (correo: string) =>
    pedir<{ mensaje: string; enlace: string | null }>('/usuarios/verificacion/reenvio', {
      method: 'POST',
      body: JSON.stringify({ correo }),
    }),

  // HU-10
  cambiarMiContrasena: (actual: string, nueva: string) =>
    pedir<{ mensaje: string }>('/usuarios/mi-contrasena', {
      method: 'POST',
      body: JSON.stringify({ contrasena_actual: actual, contrasena_nueva: nueva }),
    }),
  restablecerContrasena: (usuarioId: string) =>
    pedir<{ mensaje: string; aviso: string }>(
      `/usuarios/${usuarioId}/restablecer-contrasena`,
      { method: 'POST' },
    ),
  miRancho: () => pedir<EstadoRancho>('/ranchos/mio'),
  crear: (datos: Record<string, unknown>) =>
    pedir<Rancho>('/ranchos', { method: 'POST', body: JSON.stringify(datos) }),
  actualizar: (id: string, datos: Record<string, unknown>) =>
    pedir<Rancho>(`/ranchos/${id}`, { method: 'PATCH', body: JSON.stringify(datos) }),
  darDeBaja: (id: string) =>
    pedir<{ mensaje: string }>(`/ranchos/${id}`, { method: 'DELETE' }),
};
