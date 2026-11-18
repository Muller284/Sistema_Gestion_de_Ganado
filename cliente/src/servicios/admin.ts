import { pedir } from './api';

/**
 * Fase 4 · El panel del Admin de plataforma (RF-56 a RF-62). Todo lo decide
 * el servidor, que además corta con 403 a cualquiera que no sea Admin.
 */

export interface TableroAdmin {
  cuentas: {
    ranchos: number;
    ranchos_nuevos: number;
    usuarios: number;
    usuarios_nuevos: number;
    activos: number;
    suspendidos: number;
    sin_verificar: number;
    por_rol: { rol: string; n: number }[];
    por_pais: { codigo: string; pais: string | null; n: number }[];
    altas_por_semana: { semana: string; ranchos: number; usuarios: number }[];
  };
  actividad: { animales: number; corrales: number; aplicaciones_30: number; pesajes_30: number };
  asistente: {
    consultas_mes: number;
    usuarios_mes: number;
    por_dia: { dia: number; n: number }[];
    por_usuario: number;
    tope: number | null;
  };
  soporte: { abiertos: number; ultimos_30: number };
}

export interface CuentaResumen {
  id: string;
  nombre: string;
  departamento: string;
  localidad: string;
  pais_codigo: string;
  pais: string | null;
  creado_en: string;
  propietario_id: string;
  propietario: string;
  propietario_correo: string;
  propietario_estado: 'activo' | 'suspendido';
  integrantes: number;
  animales: number;
  consultas_mes: number;
  ultima_actividad: string | null;
  acceso_abierto: string | null;
}

export interface MiembroCuenta {
  id: string;
  nombre: string;
  correo: string;
  rol: string;
  tipo: string | null;
  estado: 'activo' | 'suspendido';
  correo_verificado: boolean;
  debe_cambiar_contrasena: boolean;
  creado_en: string;
  ultima_actividad: string | null;
}

export interface EventoCuenta {
  tipo: 'animal' | 'pesaje' | 'aplicacion' | 'movimiento' | 'consulta';
  en: string;
  quien: string | null;
  animal: string | null;
}

export interface AccesoSoporte {
  id: string;
  admin: string;
  rancho: string;
  motivo: string;
  entrado_en: string;
  salido_en: string | null;
  estado: 'abierto' | 'cerrado' | 'vencido';
}

export interface FichaCuenta {
  rancho: {
    id: string;
    nombre: string;
    departamento: string;
    localidad: string;
    superficie: string | null;
    tipo_produccion: string | null;
    pais_codigo: string;
    pais: string | null;
    creado_en: string;
    propietario_id: string;
    propietario: string;
    propietario_correo: string;
  };
  equipo: MiembroCuenta[];
  consumo: {
    animales: number;
    animales_historicos: number;
    corrales: number;
    productos: number;
    aplicaciones: number;
    pesajes: number;
    consultas_mes: number;
    consultas_total: number;
  };
  actividad: EventoCuenta[];
  accesos: AccesoSoporte[];
}

export type GrupoRaza = 'carne' | 'leche' | 'doble';

export interface RazaCatalogo {
  id: string;
  nombre: string;
  grupo: GrupoRaza;
  activa: boolean;
  animales: number;
}

export interface CatalogoRazas {
  catalogo: RazaCatalogo[];
  de_ranchos: { nombre: string; ranchos: number; animales: number }[];
}

export interface ConfiguracionPlataforma {
  asistente_consultas_mes: number | null;
  asistente_tope_mensual: number | null;
  por_defecto: { asistente_consultas_mes: number };
  mensaje?: string;
}

export type AccionAuditoria =
  | 'soporte_entrada'
  | 'soporte_salida'
  | 'cuenta_suspendida'
  | 'cuenta_reactivada'
  | 'contrasena_enlace'
  | 'raza_creada'
  | 'raza_editada'
  | 'raza_desactivada'
  | 'raza_reactivada'
  | 'configuracion';

export interface EntradaAuditoria {
  id: string;
  admin: string;
  accion: AccionAuditoria;
  rancho_id: string | null;
  rancho: string | null;
  usuario: string | null;
  objeto: string | null;
  detalle: { motivo?: string; antes?: number | null; despues?: number | null; grupo?: string; grupo_antes?: string; correo?: string };
  creado_en: string;
}

export type TipoAuditoria = 'todo' | 'soporte' | 'cuentas' | 'contrasenas' | 'razas' | 'configuracion';

const json = (metodo: string, cuerpo: unknown): RequestInit => ({
  method: metodo,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(cuerpo),
});

export const admin = {
  tablero: () => pedir<TableroAdmin>('/admin/tablero'),
  cuentas: (busqueda = '') =>
    pedir<CuentaResumen[]>(`/admin/cuentas${busqueda.trim() ? `?q=${encodeURIComponent(busqueda.trim())}` : ''}`),
  cuenta: (id: string) => pedir<FichaCuenta>(`/admin/cuentas/${encodeURIComponent(id)}`),
  cambiarEstado: (usuarioId: string, estado: 'activo' | 'suspendido', motivo: string) =>
    pedir<{ estado: string; mensaje: string }>(`/admin/usuarios/${usuarioId}/estado`, json('PATCH', { estado, motivo })),
  enlaceContrasena: (usuarioId: string, motivo: string) =>
    pedir<{ mensaje: string }>(`/admin/usuarios/${usuarioId}/enlace-contrasena`, json('POST', { motivo })),
  razas: () => pedir<CatalogoRazas>('/admin/razas'),
  crearRaza: (nombre: string, grupo: GrupoRaza) =>
    pedir<{ id: string; mensaje: string }>('/admin/razas', json('POST', { nombre, grupo })),
  editarRaza: (id: string, cambios: { grupo?: GrupoRaza; activa?: boolean }) =>
    pedir<{ mensaje: string }>(`/admin/razas/${id}`, json('PATCH', cambios)),
  configuracion: () => pedir<ConfiguracionPlataforma>('/admin/configuracion'),
  guardarConfiguracion: (valores: { asistente_consultas_mes: number | null; asistente_tope_mensual: number | null }) =>
    pedir<ConfiguracionPlataforma>('/admin/configuracion', json('PUT', valores)),
  auditoria: (tipo: TipoAuditoria = 'todo', ranchoId?: string) => {
    const parametros = new URLSearchParams();
    if (tipo !== 'todo') parametros.set('tipo', tipo);
    if (ranchoId) parametros.set('rancho', ranchoId);
    const consulta = parametros.toString();
    return pedir<EntradaAuditoria[]>(`/admin/auditoria${consulta ? `?${consulta}` : ''}`);
  },
};

/** El motivo que pide el servidor para entrar, suspender o mandar un enlace. */
export const MOTIVO_MINIMO = 10;
