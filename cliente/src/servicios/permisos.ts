import type { NivelPermiso, TipoColaborador } from './api';
import { existe, t, tn } from './idioma';
import { enumerar } from './texto';

/**
 * HU-20 · Cómo se nombran en pantalla los módulos, los niveles, los tipos y
 * los roles.
 *
 * La base guarda los nombres sin tildes (es un catálogo, no un texto para
 * leer). HU-25: los nombres para mostrar están en los archivos de idioma
 * (modulos.*, niveles.*, roles.*, tipos.predefinidos.*) y se traducen al
 * llamar a estas funciones, nunca al cargar el módulo.
 */

// Los predefinidos, por id: el nombre en la base no cambia.
const CLAVE_PREDEFINIDO: Record<string, string> = {
  '11111111-1111-4111-8111-000000000001': 'veterinario',
  '11111111-1111-4111-8111-000000000002': 'encargadoCampo',
  '11111111-1111-4111-8111-000000000003': 'encargadoAlmacen',
  '11111111-1111-4111-8111-000000000004': 'administrativo',
};

export function nombreModulo(codigo: string, respaldo?: string): string {
  const clave = `modulos.${codigo}.nombre`;
  return existe(clave) ? t(clave) : (respaldo ?? codigo);
}

/** Qué se hace en cada módulo, para que elegir no sea adivinar. */
export function detalleModulo(codigo: string): string {
  const clave = `modulos.${codigo}.detalle`;
  return existe(clave) ? t(clave) : '';
}

export function nombreNivel(nivel: NivelPermiso): string {
  return t(`niveles.${nivel}`);
}

/** Propietario, Socio, Colaborador, Admin de plataforma. Si no lo conocemos, el código tal cual. */
export function nombreRol(rol: string): string {
  const clave = `roles.${rol}`;
  return existe(clave) ? t(clave) : rol;
}

/** Los predefinidos se traducen; los propios del rancho los escribió el usuario y van tal cual. */
export function nombreTipo(tipo: { id: string | null; nombre: string | null } | null): string {
  if (!tipo?.nombre) return '';
  const clave = tipo.id ? CLAVE_PREDEFINIDO[tipo.id] : undefined;
  return clave ? t(`tipos.predefinidos.${clave}`) : tipo.nombre;
}

/** "Edita Sanidad y Pesajes · Ve Animales". Vacío si no tiene acceso a nada. */
export function resumenPermisos(tipo: Pick<TipoColaborador, 'permisos'>): string {
  const edita = tipo.permisos.filter((p) => p.nivel === 'editar').map((p) => nombreModulo(p.modulo));
  const ve = tipo.permisos.filter((p) => p.nivel === 'ver').map((p) => nombreModulo(p.modulo));
  return [
    edita.length ? t('tipos.resumen.edita', { modulos: enumerar(edita) }) : '',
    ve.length ? t('tipos.resumen.ve', { modulos: enumerar(ve) }) : '',
  ]
    .filter(Boolean)
    .join(' · ');
}

export function cuantosColaboradores(cantidad: number): string {
  return tn('tipos.colaboradores', cantidad);
}
