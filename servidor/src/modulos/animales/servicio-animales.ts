import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { UsuarioActual } from '../../comun/repositorio-usuario-actual';
import { PermisosModulo } from '../../comun/permisos-modulo';
import { t } from '../../comun/idioma';
import { avisoDeExceso } from '../corrales/servicio-corrales';
import { REGLAS_CATEGORIAS, mensajeDeCategoria, problemaDeCategoria } from '../../comun/categorias-animal';
import {
  RepositorioAnimales,
  type Animal,
  type DatosFicha,
  type Estado,
  type FiltrosListado,
} from './repositorio-animales';

/**
 * Animales: la ficha y lo que le pasa a cada uno.
 *
 * HU-28 · Datos de la ficha
 *   1. El corral es opcional, porque los animales se cargan antes que los corrales.
 *   2. La categoria se elige de un catalogo, no se escribe libre.
 *   3. El sistema valida que la fecha de nacimiento no sea futura.
 *
 * HU-33 · Cambio de estado
 *   1. Los estados posibles son activo, vendido, muerto y archivado.
 *   2. El cambio pide confirmacion y registra la fecha y el motivo.
 *      (La confirmacion es de la pantalla; el servidor exige el motivo.)
 *   3. Un animal que no esta activo no aparece en el listado por defecto,
 *      pero se puede consultar.
 *
 * HU-34 · Baja logica: se marca, no se borra; no aparece en las consultas
 *         normales; se puede restaurar.
 *
 * HU-39 · Historial de movimientos: origen, destino, fecha y quien; se ve en
 *         la ficha; el corral actual coincide con el ultimo movimiento.
 *
 * HU-18 · Solo el propietario (y el Admin en soporte) da de baja y restaura:
 *         PermisosModulo.exigirEliminar(), de Romina. Un colaborador con
 *         permiso de edicion carga y corrige fichas, pero no las borra.
 *
 * HU-23 · Cada ficha trae el nombre de quien la creo y de quien la modifico
 *         por ultima vez (creado_por_nombre, modificado_por_nombre).
 *
 * HU-27 · Registro con identificador (Brian)
 *   1. El identificador puede ser caravana, numero interno o RFID.
 *   2. No se repite entre los animales vigentes del mismo rancho.
 *   3. Otro rancho si puede usar el mismo identificador.
 *
 * HU-29 · Listado con filtros (Brian): busqueda por identificador o nombre y
 *         filtros por sexo, categoria, corral y rango de fechas de
 *         nacimiento, todos resueltos en la consulta SQL.
 *
 * El peso llega y se guarda en kilos (HU-26).
 */

const ESTADOS: readonly Estado[] = ['activo', 'vendido', 'muerto', 'archivado'];
const TIPOS_IDENTIFICADOR = ['caravana', 'interno', 'rfid'] as const;
const ORIGENES = ['nacido', 'comprado', 'otro'] as const;
const LARGO_TEXTO = 100;
const LARGO_MOTIVO = 500;

@Injectable()
export class ServicioAnimales {
  constructor(
    private readonly animales: RepositorioAnimales,
    private readonly permisos: PermisosModulo,
  ) {}

  /** HU-28: qué sexo y qué edad corresponden a cada categoría. */
  async reglasDeCategorias(quien: UsuarioActual) {
    await this.permisos.exigir(quien, 'animales', 'ver');
    return REGLAS_CATEGORIAS;
  }

  async categorias(quien: UsuarioActual) {
    await this.permisos.exigir(quien, 'animales', 'ver');
    return this.animales.categorias();
  }

  /**
   * estado: 'todos' o uno de los cuatro. Sin nada, solo los activos (HU-33).
   * consulta: los filtros de HU-29, tal como llegan en la URL.
   */
  async listar(
    estado: string | undefined,
    bajas: boolean,
    consulta: Record<string, string | undefined>,
    quien: UsuarioActual,
  ) {
    const ranchoId = await this.permisos.exigir(quien, 'animales', 'ver');
    let estados: Estado[] | null = ['activo'];
    if (estado === 'todos') estados = null;
    else if (estado) {
      if (!ESTADOS.includes(estado as Estado)) {
        throw new BadRequestException(t('servidor.animales.estadoInvalido'));
      }
      estados = [estado as Estado];
    }
    return this.animales.listar(ranchoId, estados, bajas, this.validarFiltros(consulta));
  }

  /** La ficha completa: datos, movimientos (HU-39) y cambios de estado (HU-33). */
  async ficha(id: string, quien: UsuarioActual) {
    const ranchoId = await this.permisos.exigir(quien, 'animales', 'ver');
    const animal = await this.existente(id, ranchoId);
    const [movimientos, estados] = await Promise.all([
      this.animales.movimientos(animal.id, ranchoId),
      this.animales.cambiosDeEstado(animal.id, ranchoId),
    ]);
    return { animal, movimientos, estados };
  }

  async crear(cuerpo: any, quien: UsuarioActual) {
    const ranchoId = await this.permisos.exigir(quien, 'animales', 'editar');

    const identificador = texto(cuerpo?.identificador, 50);
    if (!identificador) throw new BadRequestException(t('servidor.animales.sinIdentificador'));
    const tipoIdentificador = cuerpo?.tipo_identificador ?? 'caravana';
    if (!TIPOS_IDENTIFICADOR.includes(tipoIdentificador)) {
      throw new BadRequestException(t('servidor.animales.tipoIdentificadorInvalido'));
    }
    if (await this.animales.identificadorOcupado(identificador, ranchoId, null)) {
      throw new ConflictException(t('servidor.animales.identificadorOcupado', { identificador }));
    }

    const ficha = await this.validarFicha(cuerpo);
    const corralId = await this.corralValido(cuerpo?.corral_id, ranchoId);

    const id = randomUUID();
    try {
      await this.animales.crear({
        id, ranchoId, identificador, tipoIdentificador, ficha, corralId, autorId: quien.id,
      });
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException(t('servidor.animales.identificadorOcupado', { identificador }));
      }
      throw error;
    }
    return {
      animal: await this.animales.uno(id, ranchoId),
      mensaje: t('servidor.animales.creado', { identificador }),
    };
  }

  /** HU-28. El corral y el estado tienen su propio camino (mover, cambiarEstado). */
  async actualizar(id: string, cuerpo: any, quien: UsuarioActual) {
    const ranchoId = await this.permisos.exigir(quien, 'animales', 'editar');
    const actual = await this.vigente(id, ranchoId);
    const ficha = await this.validarFicha(cuerpo);
    await this.animales.actualizarFicha(actual.id, ranchoId, ficha, quien.id);
    return {
      animal: await this.animales.uno(actual.id, ranchoId),
      mensaje: t('servidor.animales.guardado', { identificador: actual.identificador }),
    };
  }

  /** HU-39. corral_id nulo saca al animal de todo corral. */
  async mover(id: string, cuerpo: any, quien: UsuarioActual) {
    const ranchoId = await this.permisos.exigir(quien, 'animales', 'editar');
    const actual = await this.vigente(id, ranchoId);
    const destino = await this.corralValido(cuerpo?.corral_id, ranchoId);
    const movido = await this.animales.mover(actual.id, ranchoId, destino, quien.id);
    if (!movido) throw new BadRequestException(t('servidor.animales.mismoCorral'));
    // HU-38: si el corral quedo excedido se avisa, pero el movimiento ya se hizo.
    const ocupacion = destino ? await this.animales.ocupacionDeCorral(destino, ranchoId) : null;
    return {
      animal: await this.animales.uno(actual.id, ranchoId),
      mensaje: t('servidor.animales.movido', { identificador: actual.identificador }),
      aviso: ocupacion ? avisoDeExceso(ocupacion) : null,
    };
  }

  /** HU-33. */
  async cambiarEstado(id: string, cuerpo: any, quien: UsuarioActual) {
    const ranchoId = await this.permisos.exigir(quien, 'animales', 'editar');
    const actual = await this.vigente(id, ranchoId);

    const nuevo = cuerpo?.estado;
    if (!ESTADOS.includes(nuevo)) throw new BadRequestException(t('servidor.animales.estadoInvalido'));
    if (nuevo === actual.estado) throw new BadRequestException(t('servidor.animales.mismoEstado'));

    const motivo = texto(cuerpo?.motivo, LARGO_MOTIVO);
    if (!motivo) throw new BadRequestException(t('servidor.animales.sinMotivo'));

    const fecha = cuerpo?.fecha ? fechaValida(cuerpo.fecha) : hoy();
    if (!fecha) throw new BadRequestException(t('servidor.animales.fechaInvalida'));
    if (fecha > hoy()) throw new BadRequestException(t('servidor.animales.fechaFutura'));

    await this.animales.cambiarEstado({
      id: actual.id, ranchoId, anterior: actual.estado, nuevo, fecha, motivo, autorId: quien.id,
    });
    return {
      animal: await this.animales.uno(actual.id, ranchoId),
      mensaje: t('servidor.animales.estadoCambiado', {
        identificador: actual.identificador,
        estado: t(`servidor.animales.estados.${nuevo}`),
      }),
    };
  }

  /** HU-34. Solo el propietario y el Admin dan de baja (HU-18, criterio 3). */
  async darDeBaja(id: string, quien: UsuarioActual) {
    const ranchoId = this.permisos.exigirEliminar(quien, 'animales');
    const actual = await this.vigente(id, ranchoId);
    await this.animales.marcarBaja(actual.id, ranchoId, true, quien.id);
    return { mensaje: t('servidor.animales.dadoDeBaja', { identificador: actual.identificador }) };
  }

  /** HU-34. Si otro animal vigente tomo su identificador, no se puede. */
  async restaurar(id: string, quien: UsuarioActual) {
    const ranchoId = this.permisos.exigirEliminar(quien, 'animales');
    const actual = await this.existente(id, ranchoId);
    if (actual.eliminado_en) {
      if (await this.animales.identificadorOcupado(actual.identificador, ranchoId, actual.id)) {
        throw new ConflictException(
          t('servidor.animales.identificadorOcupado', { identificador: actual.identificador }),
        );
      }
      await this.animales.marcarBaja(actual.id, ranchoId, false, quien.id);
    }
    return {
      animal: await this.animales.uno(actual.id, ranchoId),
      mensaje: t('servidor.animales.restaurado', { identificador: actual.identificador }),
    };
  }

  /** HU-29. Un filtro vacio no filtra; uno mal formado es un 400, no un listado vacio. */
  private validarFiltros(consulta: Record<string, string | undefined>): FiltrosListado {
    const busqueda = texto(consulta.busqueda, LARGO_TEXTO);

    const sexo = consulta.sexo === 'macho' || consulta.sexo === 'hembra' ? consulta.sexo : null;
    if (consulta.sexo && !sexo) {
      throw new BadRequestException(t('servidor.animales.sexoInvalido'));
    }

    const fechaDesde = consulta.fechaDesde ? fechaValida(consulta.fechaDesde) : null;
    const fechaHasta = consulta.fechaHasta ? fechaValida(consulta.fechaHasta) : null;
    if ((consulta.fechaDesde && !fechaDesde) || (consulta.fechaHasta && !fechaHasta)) {
      throw new BadRequestException(t('servidor.animales.fechaInvalida'));
    }
    if (fechaDesde && fechaHasta && fechaDesde > fechaHasta) {
      throw new BadRequestException(t('servidor.animales.rangoInvalido'));
    }

    return {
      busqueda,
      sexo,
      categoria: typeof consulta.categoria === 'string' && consulta.categoria ? consulta.categoria : null,
      corral: typeof consulta.corral === 'string' && consulta.corral ? consulta.corral : null,
      fechaDesde,
      fechaHasta,
    };
  }

  private async existente(id: string, ranchoId: string): Promise<Animal> {
    const animal = await this.animales.uno(id, ranchoId);
    if (!animal) throw new NotFoundException(t('servidor.animales.noExiste'));
    return animal;
  }

  private async vigente(id: string, ranchoId: string): Promise<Animal> {
    const animal = await this.existente(id, ranchoId);
    if (animal.eliminado_en) throw new NotFoundException(t('servidor.animales.noExiste'));
    return animal;
  }

  /** HU-28. */
  private async validarFicha(cuerpo: any): Promise<DatosFicha> {
    const sexo = cuerpo?.sexo;
    if (sexo !== 'macho' && sexo !== 'hembra') {
      throw new BadRequestException(t('servidor.animales.sexoInvalido'));
    }

    let categoria: string | null = null;
    if (cuerpo?.categoria_codigo) {
      categoria = String(cuerpo.categoria_codigo);
      if (!(await this.animales.categoriaExiste(categoria))) {
        throw new BadRequestException(t('servidor.animales.categoriaInvalida'));
      }
    }

    let fechaNacimiento: string | null = null;
    if (cuerpo?.fecha_nacimiento) {
      fechaNacimiento = fechaValida(cuerpo.fecha_nacimiento);
      if (!fechaNacimiento) throw new BadRequestException(t('servidor.animales.fechaInvalida'));
      if (fechaNacimiento > hoy()) {
        throw new BadRequestException(t('servidor.animales.nacimientoFuturo'));
      }
    }

    // La categoría tiene que corresponder al sexo y a la edad (pedido del docente).
    if (categoria) {
      const problema = problemaDeCategoria(categoria, sexo, fechaNacimiento, hoy());
      if (problema) throw new BadRequestException(mensajeDeCategoria(problema, categoria, sexo));
    }

    const origen = cuerpo?.origen || null;
    if (origen !== null && !ORIGENES.includes(origen)) {
      throw new BadRequestException(t('servidor.animales.origenInvalido'));
    }

    let peso: number | null = null;
    if (cuerpo?.peso_kg !== undefined && cuerpo?.peso_kg !== null && cuerpo?.peso_kg !== '') {
      peso = Number(cuerpo.peso_kg);
      if (!(peso > 0)) throw new BadRequestException(t('servidor.animales.pesoInvalido'));
    }

    return {
      nombre: texto(cuerpo?.nombre, LARGO_TEXTO),
      raza: texto(cuerpo?.raza, LARGO_TEXTO),
      sexo,
      categoria_codigo: categoria,
      fecha_nacimiento: fechaNacimiento,
      origen,
      peso_kg: peso,
    };
  }

  /** HU-28, criterio 1: sin corral esta bien. Con corral, tiene que ser mio y vigente. */
  private async corralValido(valor: unknown, ranchoId: string): Promise<string | null> {
    if (valor === undefined || valor === null || valor === '') return null;
    if (typeof valor !== 'string' || !(await this.animales.corralVigente(valor, ranchoId))) {
      throw new BadRequestException(t('servidor.animales.corralInvalido'));
    }
    return valor;
  }
}

/** Texto opcional: recortado, vacio es nulo, y no mas largo que el maximo. */
function texto(valor: unknown, maximo: number): string | null {
  if (typeof valor !== 'string') return null;
  const limpio = valor.trim();
  if (!limpio) return null;
  if (limpio.length > maximo) {
    throw new BadRequestException(t('servidor.animales.textoLargo', { n: maximo }));
  }
  return limpio;
}

/** AAAA-MM-DD que exista de verdad (no 2026-02-31). */
function fechaValida(valor: unknown): string | null {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return null;
  const fecha = new Date(`${valor}T00:00:00Z`);
  return !isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor ? valor : null;
}

function hoy(): string {
  return new Date().toISOString().slice(0, 10);
}
