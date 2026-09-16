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

export interface Pais {
  codigo: string;
  nombre: string;
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

export interface EstadoRancho {
  usuario: { id: string; nombre: string; rol: string };
  tieneRancho: boolean;
  rancho: Rancho | null;
}

export const api = {
  paises: () => pedir<Pais[]>('/paises'),
  miRancho: () => pedir<EstadoRancho>('/ranchos/mio'),
  crear: (datos: Record<string, unknown>) =>
    pedir<Rancho>('/ranchos', { method: 'POST', body: JSON.stringify(datos) }),
  actualizar: (id: string, datos: Record<string, unknown>) =>
    pedir<Rancho>(`/ranchos/${id}`, { method: 'PATCH', body: JSON.stringify(datos) }),
  darDeBaja: (id: string) =>
    pedir<{ mensaje: string }>(`/ranchos/${id}`, { method: 'DELETE' }),
};
