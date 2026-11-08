import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { UsuarioActual } from '../../comun/repositorio-usuario-actual';
import { PermisosModulo } from '../../comun/permisos-modulo';
import { t } from '../../comun/idioma';
import { REGLAS_CATEGORIAS } from '../../comun/categorias-animal';
import {
  DIAS_PROXIMA,
  RepositorioVacunacion,
  type DatosEsquema,
  type EstadoDosis,
  type FiltroCalendario,
} from './repositorio-vacunacion';

/**
 * HU-47 · Esquemas de vacunación.
 *   1. Un esquema dice qué producto, a qué animales (categorías, sexo y rango
 *      de edad), cuántas dosis, cada cuántos días y si tiene refuerzo.
 *   2. Solo se eligen productos del catálogo del rancho (HU-46).
 *   3. Cambiar un esquema no toca las aplicaciones ya registradas; darlo de
 *      baja lo saca del calendario, pero su historial queda.
 *
 * HU-50 · Calendario sanitario en lista: qué dosis toca a cada animal, con
 *   filtros por fechas, producto, corral y estado, y paginado.
 *
 * HU-51 · Avisos: cuántas dosis están vencidas y cuántas vencen en los
 *   próximos DIAS_PROXIMA días, para el aviso de la pantalla de inicio.
 *
 * Todo vive en el módulo «sanidad»: el veterinario lo edita, el socio lo ve.
 */

const LARGO_NOMBRE = 120;
/** Diez años: más que eso es un error de tipeo. */
const MAXIMO_DIAS = 3650;
const MAXIMO_MESES = 360;
const MAXIMO_DOSIS = 10;
const POR_PAGINA = 50;
const MAXIMO_POR_PAGINA = 200;
const ESTADOS: EstadoDosis[] = ['vencida', 'proxima', 'programada'];

@Injectable()
export class ServicioVacunacion {
  constructor(
    private readonly repositorio: RepositorioVacunacion,
    private readonly permisos: PermisosModulo,
  ) {}

  /** Los esquemas vigentes y lo que hace falta para el formulario. */
  async listar(quien: UsuarioActual) {
    const ranchoId = await this.permisos.exigir(quien, 'sanidad', 'ver');
    const [esquemas, productos, categorias] = await Promise.all([
      this.repositorio.esquemas(ranchoId),
      this.repositorio.productos(ranchoId),
      this.repositorio.categorias(),
    ]);
    return { esquemas, productos, categorias };
  }

  async crear(cuerpo: any, quien: UsuarioActual) {
    const ranchoId = await this.permisos.exigir(quien, 'sanidad', 'editar');
    const datos = await this.validar(cuerpo, ranchoId, null);
    const id = randomUUID();
    await this.repositorio.crear(id, ranchoId, datos, quien.id);
    return {
      esquema: await this.repositorio.esquema(id, ranchoId),
      mensaje: t('servidor.sanidad.esquemaCreado', { nombre: datos.nombre }),
    };
  }

  async actualizar(id: string, cuerpo: any, quien: UsuarioActual) {
    const ranchoId = await this.permisos.exigir(quien, 'sanidad', 'editar');
    const actual = await this.repositorio.esquema(id, ranchoId);
    if (!actual) throw new NotFoundException(t('servidor.sanidad.esquemaNoExiste'));
    const datos = await this.validar(cuerpo, ranchoId, actual.id);
    await this.repositorio.actualizar(actual.id, ranchoId, datos, quien.id);
    return {
      esquema: await this.repositorio.esquema(actual.id, ranchoId),
      mensaje: t('servidor.sanidad.esquemaGuardado', { nombre: datos.nombre }),
    };
  }

  /** Baja lógica: sale del calendario y las aplicaciones registradas quedan. */
  async darDeBaja(id: string, quien: UsuarioActual) {
    const ranchoId = await this.permisos.exigir(quien, 'sanidad', 'editar');
    const actual = await this.repositorio.esquema(id, ranchoId);
    if (!actual) throw new NotFoundException(t('servidor.sanidad.esquemaNoExiste'));
    await this.repositorio.darDeBaja(actual.id, ranchoId, quien.id);
    return { mensaje: t('servidor.sanidad.esquemaDadoDeBaja', { nombre: actual.nombre }) };
  }

  async calendario(consulta: any, quien: UsuarioActual) {
    const ranchoId = await this.permisos.exigir(quien, 'sanidad', 'ver');
    const filtro = this.filtroCalendario(consulta ?? {});
    const resultado = await this.repositorio.calendario(ranchoId, filtro);
    return {
      ...resultado,
      pagina: filtro.pagina,
      por_pagina: filtro.porPagina,
      dias_proxima: DIAS_PROXIMA,
    };
  }

  /**
   * HU-59 · El mes del calendario: cuántas dosis vencen cada día. ?mes=AAAA-MM
   * (sin mes, el de hoy en el rancho) y los mismos filtros de producto y corral.
   */
  async calendarioMes(consulta: any, quien: UsuarioActual) {
    const ranchoId = await this.permisos.exigir(quien, 'sanidad', 'ver');
    const valores = consulta ?? {};
    if (Object.values(valores).some((valor) => Array.isArray(valor))) {
      throw new BadRequestException(t('servidor.sanidad.filtroRepetido'));
    }
    const pedido = texto(valores.mes);
    let mes: string;
    if (pedido === null) {
      mes = (await this.repositorio.hoy(ranchoId)).slice(0, 7);
    } else {
      const partes = /^(\d{4})-(\d{2})$/.exec(pedido);
      if (!partes || Number(partes[2]) < 1 || Number(partes[2]) > 12) {
        throw new BadRequestException(t('servidor.sanidad.mesInvalido'));
      }
      mes = pedido;
    }
    const [anio, numero] = mes.split('-').map(Number);
    const ultimo = new Date(Date.UTC(anio, numero, 0)).getUTCDate();
    const desde = `${mes}-01`;
    const hasta = `${mes}-${String(ultimo).padStart(2, '0')}`;
    const { hoy, dias } = await this.repositorio.porDia(
      ranchoId,
      desde,
      hasta,
      texto(valores.producto),
      texto(valores.corral),
    );
    return { mes, desde, hasta, hoy, dias, dias_proxima: DIAS_PROXIMA };
  }

  async avisos(quien: UsuarioActual) {
    const ranchoId = await this.permisos.exigir(quien, 'sanidad', 'ver');
    return { ...(await this.repositorio.avisos(ranchoId)), dias_proxima: DIAS_PROXIMA };
  }

  // --------------------------------------------------------------------------

  private async validar(cuerpo: any, ranchoId: string, propioId: string | null): Promise<DatosEsquema> {
    const nombre = typeof cuerpo?.nombre === 'string' ? cuerpo.nombre.trim().replace(/\s+/g, ' ') : '';
    if (!nombre) throw new BadRequestException(t('servidor.sanidad.sinNombre'));
    if (nombre.length > LARGO_NOMBRE) {
      throw new BadRequestException(t('servidor.sanidad.nombreLargo', { n: LARGO_NOMBRE }));
    }
    if (await this.repositorio.nombreOcupado(nombre, ranchoId, propioId)) {
      throw new ConflictException(t('servidor.sanidad.nombreOcupado', { nombre }));
    }

    const productoId = typeof cuerpo?.producto_id === 'string' ? cuerpo.producto_id : '';
    if (!productoId) throw new BadRequestException(t('servidor.sanidad.sinProducto'));
    if (!(await this.repositorio.productoVigente(productoId, ranchoId))) {
      throw new BadRequestException(t('servidor.sanidad.productoNoExiste'));
    }

    const sexo = cuerpo?.sexo === undefined || cuerpo?.sexo === null || cuerpo?.sexo === '' ? null : cuerpo.sexo;
    if (sexo !== null && sexo !== 'macho' && sexo !== 'hembra') {
      throw new BadRequestException(t('servidor.sanidad.sexoInvalido'));
    }

    // Sin categorías (o la lista vacía) es «todas».
    let categorias: string[] | null = null;
    if (cuerpo?.categorias !== undefined && cuerpo?.categorias !== null) {
      const pedidas: unknown = cuerpo.categorias;
      if (!Array.isArray(pedidas) || pedidas.some((c) => typeof c !== 'string')) {
        throw new BadRequestException(t('servidor.sanidad.categoriaInvalida'));
      }
      const validas = new Set(await this.repositorio.categorias());
      const unicas = [...new Set(pedidas as string[])];
      if (unicas.some((c) => !validas.has(c))) {
        throw new BadRequestException(t('servidor.sanidad.categoriaInvalida'));
      }
      // Una vaca no puede estar en un esquema solo para machos.
      if (sexo !== null) {
        const otroSexo = unicas.filter((c) => {
          const regla = REGLAS_CATEGORIAS.find((r) => r.codigo === c);
          return regla !== undefined && regla.sexo !== sexo;
        });
        if (otroSexo.length > 0) {
          throw new BadRequestException(
            t('servidor.sanidad.categoriaOtroSexo', {
              categoria: t(`animales.categorias.${otroSexo[0]}`),
              sexo: t(`animales.sexos.${sexo}`).toLowerCase(),
            }),
          );
        }
      }
      categorias = unicas.length > 0 ? unicas : null;
    }

    const edadMinima = entero(cuerpo?.edad_minima_meses) ?? 0;
    if (!Number.isInteger(edadMinima) || edadMinima < 0 || edadMinima > MAXIMO_MESES) {
      throw new BadRequestException(t('servidor.sanidad.edadInvalida', { n: MAXIMO_MESES }));
    }
    const edadMaxima = entero(cuerpo?.edad_maxima_meses);
    if (edadMaxima !== null && (!Number.isInteger(edadMaxima) || edadMaxima < 0 || edadMaxima > MAXIMO_MESES)) {
      throw new BadRequestException(t('servidor.sanidad.edadInvalida', { n: MAXIMO_MESES }));
    }
    if (edadMaxima !== null && edadMaxima < edadMinima) {
      throw new BadRequestException(t('servidor.sanidad.edadesCruzadas'));
    }

    const dosis = entero(cuerpo?.dosis);
    if (dosis === null || !Number.isInteger(dosis) || dosis < 1 || dosis > MAXIMO_DOSIS) {
      throw new BadRequestException(t('servidor.sanidad.dosisInvalida', { n: MAXIMO_DOSIS }));
    }

    // Con una sola dosis el intervalo no se usa: se descarta en vez de dar error.
    let intervalo: number | null = null;
    if (dosis > 1) {
      intervalo = entero(cuerpo?.intervalo_dias);
      if (intervalo === null) throw new BadRequestException(t('servidor.sanidad.sinIntervalo'));
      if (!diasValidos(intervalo)) {
        throw new BadRequestException(t('servidor.sanidad.diasInvalidos', { n: MAXIMO_DIAS }));
      }
    }
    const refuerzo = entero(cuerpo?.refuerzo_dias);
    if (refuerzo !== null && !diasValidos(refuerzo)) {
      throw new BadRequestException(t('servidor.sanidad.diasInvalidos', { n: MAXIMO_DIAS }));
    }

    return {
      producto_id: productoId,
      nombre,
      categorias,
      sexo,
      edad_minima_meses: edadMinima,
      edad_maxima_meses: edadMaxima,
      dosis,
      intervalo_dias: intervalo,
      refuerzo_dias: refuerzo,
    };
  }

  private filtroCalendario(consulta: Record<string, unknown>): FiltroCalendario {
    // ?estado=a&estado=b llega como lista: cada filtro va una sola vez.
    if (Object.values(consulta).some((valor) => Array.isArray(valor))) {
      throw new BadRequestException(t('servidor.sanidad.filtroRepetido'));
    }
    const desde = fecha(consulta.desde);
    const hasta = fecha(consulta.hasta);
    if (desde === undefined || hasta === undefined) {
      throw new BadRequestException(t('servidor.sanidad.fechaInvalida'));
    }
    if (desde && hasta && desde > hasta) {
      throw new BadRequestException(t('servidor.sanidad.fechasCruzadas'));
    }

    const estado = texto(consulta.estado);
    if (estado !== null && !ESTADOS.includes(estado as EstadoDosis)) {
      throw new BadRequestException(t('servidor.sanidad.estadoInvalido'));
    }

    const pagina = texto(consulta.pagina) === null ? 1 : Number(consulta.pagina);
    const porPagina = texto(consulta.porPagina) === null ? POR_PAGINA : Number(consulta.porPagina);
    if (!Number.isInteger(pagina) || pagina < 1) {
      throw new BadRequestException(t('servidor.sanidad.paginaInvalida'));
    }
    if (!Number.isInteger(porPagina) || porPagina < 1 || porPagina > MAXIMO_POR_PAGINA) {
      throw new BadRequestException(t('servidor.sanidad.porPaginaInvalida', { n: MAXIMO_POR_PAGINA }));
    }

    return {
      desde,
      hasta,
      productoId: texto(consulta.producto),
      corralId: texto(consulta.corral),
      estado: estado as EstadoDosis | null,
      pagina,
      porPagina,
    };
  }
}

/** Vacío es nulo; lo demás, número (NaN si no lo es, para que la validación lo rechace). */
function entero(valor: unknown): number | null {
  if (valor === undefined || valor === null || valor === '') return null;
  if (typeof valor === 'number') return valor;
  if (typeof valor === 'string' && valor.trim() !== '') return Number(valor);
  return NaN;
}

function diasValidos(valor: number): boolean {
  return Number.isInteger(valor) && valor >= 1 && valor <= MAXIMO_DIAS;
}

function texto(valor: unknown): string | null {
  if (typeof valor !== 'string') return null;
  const limpio = valor.trim();
  return limpio === '' ? null : limpio;
}

/** AAAA-MM-DD válida, nulo si no vino, undefined si vino mal. */
function fecha(valor: unknown): string | null | undefined {
  const limpio = texto(valor);
  if (limpio === null) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(limpio)) return undefined;
  const [a, m, d] = limpio.split('-').map(Number);
  const real = new Date(Date.UTC(a, m - 1, d));
  if (real.getUTCFullYear() !== a || real.getUTCMonth() !== m - 1 || real.getUTCDate() !== d) return undefined;
  return limpio;
}
