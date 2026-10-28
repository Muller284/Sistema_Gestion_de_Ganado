import { BadRequestException, Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import type { UsuarioActual } from '../../comun/repositorio-usuario-actual';
import { PermisosModulo } from '../../comun/permisos-modulo';
import { t } from '../../comun/idioma';
import { esRaza } from '../animales/razas';
import {
  RepositorioExportacion,
  type ContextoExportacion,
  type CriterioAnimales,
} from './repositorio-exportacion';

/**
 * HU-45 · Exportación a Excel (Aaron, Sprint 3).
 *
 *   1. Puedo elegir qué exportar y en qué formato.
 *        que      animales, corrales, movimientos y/o estados (cambios de estado)
 *        formato  xlsx (una hoja por cada cosa elegida) o csv (una sola cosa)
 *   2. La exportación respeta los filtros aplicados en el listado: llegan los
 *      mismos parámetros que usa GET /animales y se aplican a los animales, a
 *      sus movimientos y a sus cambios de estado.
 *   3. El archivo se descarga con un nombre que incluye el rancho y la fecha:
 *      ganado_rancho-el-cerrito_2026-10-27.xlsx, animales_..._2026-10-27.csv.
 *      La fecha es la de hoy en la zona horaria del país del rancho.
 *
 * El peso sale en la unidad del país y las fechas en su formato (HU-26). Las
 * columnas de la hoja de animales empiezan con los mismos títulos de la
 * plantilla de importación (HU-40), así un archivo exportado se puede volver
 * a importar.
 *
 * Cada cosa exige poder ver su módulo (HU-21 y HU-22): animales, movimientos
 * y estados piden "animales"; corrales pide "corrales".
 */

export type Conjunto = 'animales' | 'corrales' | 'movimientos' | 'estados';
export const CONJUNTOS: Conjunto[] = ['animales', 'corrales', 'movimientos', 'estados'];
const FORMATOS = ['xlsx', 'csv'] as const;
type Formato = (typeof FORMATOS)[number];
const ESTADOS = ['activo', 'vendido', 'muerto', 'archivado'];
const VISTAS = [...ESTADOS, 'todos', 'bajas'];
const MODULO_DE: Record<Conjunto, string> = {
  animales: 'animales',
  movimientos: 'animales',
  estados: 'animales',
  corrales: 'corrales',
};
const KG_A_LB = 2.20462262;
const HA_A_ACRE = 2.47105381;

interface Columna {
  titulo: string;
  clave: string;
  ancho: number;
  /** fecha: AAAA-MM-DD que en Excel va como fecha; momento: fecha y hora. */
  tipo?: 'fecha' | 'momento' | 'numero';
}

interface Tabla {
  conjunto: Conjunto;
  columnas: Columna[];
  filas: Record<string, unknown>[];
}

export interface Archivo {
  nombre: string;
  tipo: string;
  contenido: Buffer;
}

@Injectable()
export class ServicioExportacion {
  constructor(
    private readonly repositorio: RepositorioExportacion,
    private readonly permisos: PermisosModulo,
  ) {}

  async exportar(consulta: Record<string, string | undefined>, quien: UsuarioActual): Promise<Archivo> {
    const formato = (consulta.formato || 'xlsx') as Formato;
    if (!FORMATOS.includes(formato)) throw new BadRequestException(t('servidor.exportacion.formatoInvalido'));

    const que = (consulta.que || 'animales')
      .split(',')
      .map((parte) => parte.trim())
      .filter(Boolean) as Conjunto[];
    if (que.length === 0 || que.some((conjunto) => !CONJUNTOS.includes(conjunto))) {
      throw new BadRequestException(t('servidor.exportacion.queInvalido'));
    }
    const conjuntos = CONJUNTOS.filter((conjunto) => que.includes(conjunto));
    if (formato === 'csv' && conjuntos.length > 1) {
      throw new BadRequestException(t('servidor.exportacion.csvUnoSolo'));
    }

    let ranchoId = '';
    for (const modulo of new Set(conjuntos.map((conjunto) => MODULO_DE[conjunto]))) {
      ranchoId = await this.permisos.exigir(quien, modulo, 'ver');
    }

    const criterio = this.criterio(consulta);
    const contexto = await this.repositorio.contexto(ranchoId);
    const tablas: Tabla[] = [];
    for (const conjunto of conjuntos) tablas.push(await this.tabla(conjunto, ranchoId, criterio, contexto));

    const prefijo = formato === 'csv' ? t(`servidor.exportacion.archivo.${conjuntos[0]}`) : t('servidor.exportacion.archivo.todo');
    const nombre = `${prefijo}_${aNombreDeArchivo(contexto.rancho)}_${hoyEn(contexto.zonaHoraria)}.${formato}`;

    if (formato === 'csv') {
      return { nombre, tipo: 'text/csv; charset=utf-8', contenido: Buffer.from(aCsv(tablas[0], contexto), 'utf8') };
    }
    return {
      nombre,
      tipo: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      contenido: await aExcel(tablas, contexto),
    };
  }

  /** Los filtros del listado, validados igual que en GET /animales. */
  private criterio(consulta: Record<string, string | undefined>): CriterioAnimales {
    const vista = consulta.vista || consulta.estado || 'activo';
    if (!VISTAS.includes(vista)) throw new BadRequestException(t('servidor.animales.estadoInvalido'));

    const sexo = consulta.sexo || null;
    if (sexo && sexo !== 'macho' && sexo !== 'hembra') {
      throw new BadRequestException(t('servidor.animales.sexoInvalido'));
    }
    const fechaDesde = consulta.fechaDesde || null;
    const fechaHasta = consulta.fechaHasta || null;
    for (const fecha of [fechaDesde, fechaHasta]) {
      if (fecha && !fechaValida(fecha)) throw new BadRequestException(t('servidor.animales.fechaInvalida'));
    }
    const busqueda = consulta.busqueda?.trim() || null;
    if (busqueda && busqueda.length > 100) {
      throw new BadRequestException(t('servidor.animales.textoLargo', { n: 100 }));
    }

    return {
      estados: ESTADOS.includes(vista) ? [vista] : null,
      bajas: vista === 'bajas' ? 'solo' : 'no',
      busqueda,
      sexo,
      categoria: consulta.categoria || null,
      corral: consulta.corral || null,
      fechaDesde,
      fechaHasta,
    };
  }

  private async tabla(
    conjunto: Conjunto,
    ranchoId: string,
    criterio: CriterioAnimales,
    contexto: ContextoExportacion,
  ): Promise<Tabla> {
    const unidad = contexto.unidadPeso;
    const col = (clave: string, titulo: string, ancho = 18, tipo?: Columna['tipo']): Columna => ({
      clave, titulo, ancho, tipo,
    });
    const titulo = (clave: string) => t(`servidor.exportacion.columnas.${clave}`);

    switch (conjunto) {
      case 'animales': {
        const filas = await this.repositorio.animales(ranchoId, criterio);
        return {
          conjunto,
          columnas: [
            col('identificador', t('servidor.importacion.columnas.identificador', { unidad }), 18),
            col('tipo_identificador', t('servidor.importacion.columnas.tipo_identificador', { unidad }), 20),
            col('nombre', t('servidor.importacion.columnas.nombre', { unidad })),
            col('raza', t('servidor.importacion.columnas.raza', { unidad })),
            col('sexo', t('servidor.importacion.columnas.sexo', { unidad }), 12),
            col('categoria', t('servidor.importacion.columnas.categoria', { unidad })),
            col('fecha_nacimiento', t('servidor.importacion.columnas.fecha_nacimiento', { unidad }), 18, 'fecha'),
            col('origen', t('servidor.importacion.columnas.origen', { unidad }), 20),
            col('corral', t('servidor.importacion.columnas.corral', { unidad })),
            col('peso', t('servidor.importacion.columnas.peso', { unidad }), 12, 'numero'),
            col('estado', titulo('estado'), 14),
            col('dado_de_baja', titulo('dadoDeBaja'), 20, 'momento'),
            col('creado_por', titulo('registradoPor'), 26),
            col('creado_en', titulo('registradoEl'), 20, 'momento'),
          ],
          filas: filas.map((fila) => ({
            identificador: fila.identificador,
            tipo_identificador: t(`animales.tiposIdentificador.${fila.tipo_identificador}`),
            nombre: fila.nombre,
            raza: fila.raza && esRaza(fila.raza) ? t(`animales.razas.${fila.raza}`) : fila.raza,
            sexo: t(`animales.sexos.${fila.sexo}`),
            categoria: fila.categoria_codigo ? t(`animales.categorias.${fila.categoria_codigo}`) : null,
            fecha_nacimiento: fila.fecha_nacimiento,
            origen: fila.origen ? t(`animales.origenes.${fila.origen}`) : null,
            corral: fila.corral,
            peso: fila.peso_kg === null ? null : redondear(unidad === 'lb' ? fila.peso_kg * KG_A_LB : fila.peso_kg),
            estado: t(`animales.estados.${fila.estado}`),
            dado_de_baja: fila.eliminado_en,
            creado_por: fila.creado_por,
            creado_en: fila.creado_en,
          })),
        };
      }
      case 'corrales': {
        const filas = await this.repositorio.corrales(ranchoId);
        const superficie = contexto.unidadSuperficie;
        return {
          conjunto,
          columnas: [
            col('nombre', titulo('corral'), 24),
            col('capacidad', titulo('capacidad'), 12, 'numero'),
            col('superficie', t(`servidor.exportacion.columnas.superficie_${superficie}`), 16, 'numero'),
            col('ocupacion', titulo('ocupacion'), 18, 'numero'),
          ],
          filas: filas.map((fila) => ({
            nombre: fila.nombre,
            capacidad: fila.capacidad,
            superficie:
              fila.superficie_ha === null
                ? null
                : redondear(superficie === 'acre' ? fila.superficie_ha * HA_A_ACRE : fila.superficie_ha),
            ocupacion: fila.ocupacion,
          })),
        };
      }
      case 'movimientos': {
        const filas = await this.repositorio.movimientos(ranchoId, criterio);
        const ninguno = t('animales.sinCorral');
        return {
          conjunto,
          columnas: [
            col('fecha', titulo('fechaHora'), 20, 'momento'),
            col('identificador', t('servidor.importacion.columnas.identificador', { unidad }), 18),
            col('origen', titulo('corralOrigen'), 22),
            col('destino', titulo('corralDestino'), 22),
            col('registrado_por', titulo('registradoPor'), 26),
          ],
          filas: filas.map((fila) => ({
            fecha: fila.fecha,
            identificador: fila.identificador,
            origen: fila.origen ?? ninguno,
            destino: fila.destino ?? ninguno,
            registrado_por: fila.registrado_por,
          })),
        };
      }
      case 'estados': {
        const filas = await this.repositorio.estados(ranchoId, criterio);
        return {
          conjunto,
          columnas: [
            col('fecha', titulo('fecha'), 14, 'fecha'),
            col('identificador', t('servidor.importacion.columnas.identificador', { unidad }), 18),
            col('anterior', titulo('estadoAnterior'), 16),
            col('nuevo', titulo('estadoNuevo'), 16),
            col('motivo', titulo('motivo'), 40),
            col('registrado_por', titulo('registradoPor'), 26),
            col('creado_en', titulo('registradoEl'), 20, 'momento'),
          ],
          filas: filas.map((fila) => ({
            fecha: fila.fecha,
            identificador: fila.identificador,
            anterior: t(`animales.estados.${fila.estado_anterior}`),
            nuevo: t(`animales.estados.${fila.estado_nuevo}`),
            motivo: fila.motivo,
            registrado_por: fila.registrado_por,
            creado_en: fila.creado_en,
          })),
        };
      }
    }
  }
}

/** Una hoja por cada cosa elegida, con los títulos en negrita y la primera fila fija. */
async function aExcel(tablas: Tabla[], contexto: ContextoExportacion): Promise<Buffer> {
  const libro = new ExcelJS.Workbook();
  const formatoFecha = contexto.formatoFecha.toLowerCase();
  for (const tabla of tablas) {
    const hoja = libro.addWorksheet(t(`servidor.exportacion.hojas.${tabla.conjunto}`));
    hoja.columns = tabla.columnas.map((columna) => ({
      header: columna.titulo,
      key: columna.clave,
      width: columna.ancho,
      style:
        columna.tipo === 'fecha'
          ? { numFmt: formatoFecha }
          : columna.tipo === 'momento'
            ? { numFmt: `${formatoFecha} hh:mm` }
            : undefined,
    }));
    hoja.getRow(1).font = { bold: true };
    hoja.views = [{ state: 'frozen', ySplit: 1 }];
    for (const fila of tabla.filas) {
      const valores: Record<string, unknown> = {};
      for (const columna of tabla.columnas) {
        const valor = fila[columna.clave];
        valores[columna.clave] =
          valor === null || valor === undefined
            ? null
            : columna.tipo === 'fecha'
              ? new Date(`${String(valor)}T00:00:00Z`)
              : columna.tipo === 'momento'
                ? momentoParaExcel(valor as string | Date, contexto.zonaHoraria)
                : valor;
      }
      hoja.addRow(valores);
    }
  }
  return Buffer.from(await libro.xlsx.writeBuffer());
}

/** CSV con BOM (para que Excel respete los acentos), comas y comillas donde haga falta. */
function aCsv(tabla: Tabla, contexto: ContextoExportacion): string {
  const lineas = [tabla.columnas.map((columna) => celdaCsv(columna.titulo)).join(',')];
  for (const fila of tabla.filas) {
    lineas.push(
      tabla.columnas
        .map((columna) => {
          const valor = fila[columna.clave];
          if (valor === null || valor === undefined) return '';
          if (columna.tipo === 'fecha') return celdaCsv(fechaConFormato(String(valor), contexto.formatoFecha));
          if (columna.tipo === 'momento') return celdaCsv(momentoConFormato(valor as string | Date, contexto));
          return celdaCsv(String(valor));
        })
        .join(','),
    );
  }
  return `﻿${lineas.join('\r\n')}\r\n`;
}

function celdaCsv(texto: string): string {
  return /[",\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

/** AAAA-MM-DD en el formato del país: DD/MM/YYYY o MM/DD/YYYY. */
function fechaConFormato(valor: string, formato: string): string {
  const [anio, mes, dia] = valor.slice(0, 10).split('-');
  return formato.replace('YYYY', anio).replace('MM', mes).replace('DD', dia);
}

/** Las partes de un momento vistas en la zona horaria del rancho. */
function partesEn(valor: string | Date, zona: string) {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: zona,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(new Date(valor))
      .map((parte) => [parte.type, parte.value]),
  );
  return partes as Record<'year' | 'month' | 'day' | 'hour' | 'minute', string>;
}

function momentoConFormato(valor: string | Date, contexto: ContextoExportacion): string {
  const p = partesEn(valor, contexto.zonaHoraria);
  return `${fechaConFormato(`${p.year}-${p.month}-${p.day}`, contexto.formatoFecha)} ${p.hour}:${p.minute}`;
}

/** Excel no tiene zonas: se guarda la hora que se ve en el rancho. */
function momentoParaExcel(valor: string | Date, zona: string): Date {
  const p = partesEn(valor, zona);
  return new Date(Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute));
}

/** "Rancho El Cerrito" → "rancho-el-cerrito". */
export function aNombreDeArchivo(texto: string): string {
  const limpio = texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return limpio || 'rancho';
}

/** La fecha de hoy en una zona horaria, AAAA-MM-DD. */
export function hoyEn(zona: string, ahora = new Date()): string {
  const p = partesEn(ahora, zona);
  return `${p.year}-${p.month}-${p.day}`;
}

function fechaValida(valor: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const fecha = new Date(`${valor}T00:00:00Z`);
  return !isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor;
}

function redondear(valor: number): number {
  return Math.round(valor * 10) / 10;
}
