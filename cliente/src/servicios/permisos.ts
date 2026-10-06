import type { NivelPermiso, TipoColaborador } from './api';

/**
 * HU-20 · Cómo se nombran en pantalla los módulos, los niveles y los tipos.
 *
 * La base guarda los nombres sin tildes (es un catálogo, no un texto para
 * leer). Hasta que llegue HU-25 con los archivos de traducción, los nombres
 * para mostrar viven acá, en un solo lugar.
 */

export const NOMBRE_MODULO: Record<string, string> = {
  animales: 'Animales',
  corrales: 'Corrales',
  sanidad: 'Sanidad',
  pesajes: 'Pesajes',
  importacion: 'Importación',
  almacen: 'Almacén',
  equipo: 'Equipo',
  planes: 'Planes',
};

/** Qué se hace en cada módulo, para que elegir no sea adivinar. */
export const DETALLE_MODULO: Record<string, string> = {
  animales: 'Fichas, altas y estados de los animales',
  corrales: 'Corrales, ocupación y movimientos',
  sanidad: 'Vacunas, tratamientos y diagnósticos',
  pesajes: 'Pesadas y ganancia de peso',
  importacion: 'Subir planillas de Excel o CSV',
  almacen: 'Insumos, vacunas y alimento en stock',
  equipo: 'Ver quién es parte del rancho',
  planes: 'El plan y la facturación del rancho',
};

export const NOMBRE_NIVEL: Record<NivelPermiso, string> = {
  ninguno: 'Sin acceso',
  ver: 'Ve',
  editar: 'Edita',
};

// Los predefinidos, con sus tildes. Por id: el nombre en la base no cambia.
const NOMBRE_PREDEFINIDO: Record<string, string> = {
  '11111111-1111-4111-8111-000000000001': 'Veterinario',
  '11111111-1111-4111-8111-000000000002': 'Encargado de campo',
  '11111111-1111-4111-8111-000000000003': 'Encargado de almacén',
  '11111111-1111-4111-8111-000000000004': 'Administrativo',
};

export function nombreModulo(codigo: string, respaldo?: string): string {
  return NOMBRE_MODULO[codigo] ?? respaldo ?? codigo;
}

export function nombreTipo(tipo: { id: string | null; nombre: string | null } | null): string {
  if (!tipo?.nombre) return '';
  return (tipo.id && NOMBRE_PREDEFINIDO[tipo.id]) || tipo.nombre;
}

/** "Edita Sanidad y Pesajes · Ve Animales". Vacío si no tiene acceso a nada. */
export function resumenPermisos(tipo: Pick<TipoColaborador, 'permisos'>): string {
  const edita = tipo.permisos.filter((p) => p.nivel === 'editar').map((p) => nombreModulo(p.modulo));
  const ve = tipo.permisos.filter((p) => p.nivel === 'ver').map((p) => nombreModulo(p.modulo));
  return [
    edita.length ? `Edita ${enumerar(edita)}` : '',
    ve.length ? `Ve ${enumerar(ve)}` : '',
  ]
    .filter(Boolean)
    .join(' · ');
}

export function cuantosColaboradores(cantidad: number): string {
  if (cantidad === 0) return 'Nadie lo tiene todavía';
  if (cantidad === 1) return '1 colaborador';
  return `${cantidad} colaboradores`;
}

function enumerar(partes: string[]): string {
  if (partes.length <= 1) return partes.join('');
  return `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`;
}
