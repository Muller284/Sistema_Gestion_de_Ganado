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
import { cargaPorHectarea, limitePorSuperficie } from '../../comun/carga-animal';
import { RepositorioCorrales, type Corral } from './repositorio-corrales';

/**
 * HU-36 · Creacion de corrales.
 *
 * Criterios de aceptacion:
 *   1. El nombre del corral es unico dentro del rancho.
 *   2. La capacidad es opcional; si no se carga, no hay aviso de sobrepoblacion.
 *   3. El listado muestra la ocupacion actual sobre la capacidad.
 *
 * La superficie llega y se guarda en hectareas: la pantalla convierte desde
 * acres si el pais del rancho los usa (HU-26).
 *
 * Dar de baja y restaurar es HU-34: el corral se marca, no se borra.
 *
 * Pedido del docente: la capacidad no puede pasar de lo que admite la
 * superficie segun el tipo de produccion del rancho (comun/carga-animal.ts),
 * y ni la capacidad ni la superficie pueden ser cero.
 */

const LARGO_NOMBRE = 100;
/** Lo que entra en una pagina grande del listado; mas que eso, se hace en partes. */
const MAXIMO_POR_ASIGNACION = 1000;

@Injectable()
export class ServicioCorrales {
  constructor(
    private readonly corrales: RepositorioCorrales,
    private readonly permisos: PermisosModulo,
  ) {}

  async listar(conBajas: boolean, quien: UsuarioActual) {
    const ranchoId = await this.permisos.exigir(quien, 'corrales', 'ver');
    const tipo = await this.corrales.tipoProduccion(ranchoId);
    return (await this.corrales.listar(ranchoId, conBajas)).map((corral) => conAviso(corral, tipo));
  }

  /** Cuantos animales admite cada hectarea en este rancho, para el formulario. */
  async carga(quien: UsuarioActual) {
    const ranchoId = await this.permisos.exigir(quien, 'corrales', 'ver');
    const tipo = await this.corrales.tipoProduccion(ranchoId);
    return { tipo_produccion: tipo, animales_por_hectarea: cargaPorHectarea(tipo) };
  }

  async crear(cuerpo: any, quien: UsuarioActual) {
    const ranchoId = await this.permisos.exigir(quien, 'corrales', 'editar');
    const tipo = await this.corrales.tipoProduccion(ranchoId);
    const datos = this.validar(cuerpo, tipo);
    if (await this.corrales.nombreOcupado(datos.nombre, ranchoId, null)) {
      throw new ConflictException(t('servidor.corrales.nombreOcupado', { nombre: datos.nombre }));
    }
    const id = randomUUID();
    await this.guardando(
      () => this.corrales.crear({ id, ranchoId, ...datos, autorId: quien.id }),
      datos.nombre,
    );
    return {
      corral: conAviso((await this.corrales.uno(id, ranchoId))!, tipo),
      mensaje: t('servidor.corrales.creado', { nombre: datos.nombre }),
    };
  }

  async actualizar(id: string, cuerpo: any, quien: UsuarioActual) {
    const ranchoId = await this.permisos.exigir(quien, 'corrales', 'editar');
    const actual = await this.vigente(id, ranchoId);
    const tipo = await this.corrales.tipoProduccion(ranchoId);

    const datos = this.validar(cuerpo, tipo);
    if (await this.corrales.nombreOcupado(datos.nombre, ranchoId, actual.id)) {
      throw new ConflictException(t('servidor.corrales.nombreOcupado', { nombre: datos.nombre }));
    }
    await this.guardando(
      () => this.corrales.actualizar(actual.id, ranchoId, datos, quien.id),
      datos.nombre,
    );
    return {
      corral: conAviso((await this.corrales.uno(actual.id, ranchoId))!, tipo),
      mensaje: t('servidor.corrales.guardado', { nombre: datos.nombre }),
    };
  }

  /** HU-34. Con animales adentro no: primero hay que moverlos. */
  async darDeBaja(id: string, quien: UsuarioActual) {
    // Solo el propietario y el Admin dan de baja (HU-18, criterio 3).
    const ranchoId = this.permisos.exigirEliminar(quien, 'corrales');
    const actual = await this.vigente(id, ranchoId);
    if (actual.ocupacion > 0) {
      throw new ConflictException(
        t('servidor.corrales.conAnimales', { nombre: actual.nombre, n: actual.ocupacion }),
      );
    }
    await this.corrales.marcarBaja(actual.id, ranchoId, true, quien.id);
    return { mensaje: t('servidor.corrales.dadoDeBaja', { nombre: actual.nombre }) };
  }

  /**
   * HU-37 · Asignar animales al corral, de a uno o de a muchos (la seleccion
   * del listado). Cada asignacion queda como movimiento (HU-39).
   * HU-38 · Si el corral queda por encima de su capacidad se avisa, pero la
   * asignacion se hace igual: el aviso no impide la accion.
   * Mover animales es editar animales, como hacerlo desde la ficha.
   */
  async asignarAnimales(id: string, cuerpo: any, quien: UsuarioActual) {
    const ranchoId = await this.permisos.exigir(quien, 'animales', 'editar');
    const corral = await this.vigente(id, ranchoId);

    const pedidos: unknown = cuerpo?.animal_ids;
    if (
      !Array.isArray(pedidos) ||
      pedidos.length === 0 ||
      pedidos.length > MAXIMO_POR_ASIGNACION ||
      pedidos.some((animalId) => typeof animalId !== 'string')
    ) {
      throw new BadRequestException(
        t('servidor.corrales.seleccionInvalida', { n: MAXIMO_POR_ASIGNACION }),
      );
    }

    const resultado = await this.corrales.asignar(corral.id, [...new Set(pedidos as string[])], ranchoId, quien.id);
    const tipo = await this.corrales.tipoProduccion(ranchoId);
    const actualizado = conAviso((await this.corrales.uno(corral.id, ranchoId))!, tipo);
    return {
      corral: actualizado,
      movidos: resultado.movidos,
      ya_estaban: resultado.yaEstaban,
      no_encontrados: resultado.noEncontrados,
      mensaje: t('servidor.corrales.asignados', { n: resultado.movidos, nombre: corral.nombre }),
      aviso: avisoDeExceso(actualizado),
    };
  }

  async restaurar(id: string, quien: UsuarioActual) {
    const ranchoId = this.permisos.exigirEliminar(quien, 'corrales');
    const actual = await this.corrales.uno(id, ranchoId);
    if (!actual) throw new NotFoundException(t('servidor.corrales.noExiste'));
    if (actual.eliminado_en) {
      if (await this.corrales.nombreOcupado(actual.nombre, ranchoId, actual.id)) {
        throw new ConflictException(t('servidor.corrales.nombreOcupado', { nombre: actual.nombre }));
      }
      await this.corrales.marcarBaja(actual.id, ranchoId, false, quien.id);
    }
    const tipo = await this.corrales.tipoProduccion(ranchoId);
    return {
      corral: conAviso((await this.corrales.uno(actual.id, ranchoId))!, tipo),
      mensaje: t('servidor.corrales.restaurado', { nombre: actual.nombre }),
    };
  }

  private async vigente(id: string, ranchoId: string): Promise<Corral> {
    const corral = await this.corrales.uno(id, ranchoId);
    if (!corral || corral.eliminado_en) {
      throw new NotFoundException(t('servidor.corrales.noExiste'));
    }
    return corral;
  }

  private validar(cuerpo: any, tipo: string): {
    nombre: string;
    capacidad: number | null;
    superficieHa: number | null;
  } {
    const nombre = typeof cuerpo?.nombre === 'string' ? cuerpo.nombre.trim() : '';
    if (!nombre) throw new BadRequestException(t('servidor.corrales.sinNombre'));
    if (nombre.length > LARGO_NOMBRE) {
      throw new BadRequestException(t('servidor.corrales.nombreLargo', { n: LARGO_NOMBRE }));
    }

    const capacidad = opcional(cuerpo?.capacidad);
    if (capacidad !== null && (!Number.isInteger(capacidad) || capacidad <= 0)) {
      throw new BadRequestException(t('servidor.corrales.capacidadInvalida'));
    }
    const superficieHa = opcional(cuerpo?.superficie_ha);
    if (superficieHa !== null && !(superficieHa > 0)) {
      throw new BadRequestException(t('servidor.corrales.superficieInvalida'));
    }
    // Pedido del docente: no mas animales de los que admite la superficie.
    if (capacidad !== null && superficieHa !== null) {
      const limite = limitePorSuperficie(superficieHa, tipo);
      if (capacidad > limite) {
        throw new BadRequestException(
          t('servidor.corrales.capacidadExcedeSuperficie', {
            limite,
            carga: String(cargaPorHectarea(tipo)),
            tipo: t(`servidor.corrales.tiposProduccion.${tipo}`),
          }),
        );
      }
    }
    return { nombre, capacidad, superficieHa };
  }

  /** Dos altas a la vez con el mismo nombre: la segunda la frena el indice unico. */
  private async guardando(accion: () => Promise<void>, nombre: string): Promise<void> {
    try {
      await accion();
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException(t('servidor.corrales.nombreOcupado', { nombre }));
      }
      throw error;
    }
  }
}

/** Vacio o ausente es "no se cargo". Cualquier otra cosa tiene que ser un numero. */
function opcional(valor: unknown): number | null {
  if (valor === undefined || valor === null || valor === '') return null;
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : NaN;
}

/**
 * Criterio 2: el aviso existe solo si hay capacidad cargada.
 * limite_superficie: lo maximo que admite la superficie (nulo sin superficie).
 */
function conAviso(corral: Corral, tipo: string) {
  return {
    ...corral,
    sobrepoblado: corral.capacidad !== null && corral.ocupacion > corral.capacidad,
    limite_superficie:
      corral.superficie_ha === null ? null : limitePorSuperficie(Number(corral.superficie_ha), tipo),
  };
}

/** HU-38. El texto del aviso, o nulo si el corral no supera su capacidad. */
export function avisoDeExceso(corral: {
  nombre: string;
  ocupacion: number;
  capacidad: number | null;
}): string | null {
  if (corral.capacidad === null || corral.ocupacion <= corral.capacidad) return null;
  return t('servidor.corrales.excedido', {
    nombre: corral.nombre,
    n: corral.ocupacion,
    capacidad: corral.capacidad,
  });
}
