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
 */

const LARGO_NOMBRE = 100;

@Injectable()
export class ServicioCorrales {
  constructor(
    private readonly corrales: RepositorioCorrales,
    private readonly permisos: PermisosModulo,
  ) {}

  async listar(conBajas: boolean, quien: UsuarioActual) {
    const ranchoId = await this.permisos.exigir(quien, 'corrales', 'ver');
    return (await this.corrales.listar(ranchoId, conBajas)).map(conAviso);
  }

  async crear(cuerpo: any, quien: UsuarioActual) {
    const ranchoId = await this.permisos.exigir(quien, 'corrales', 'editar');
    const datos = this.validar(cuerpo);
    if (await this.corrales.nombreOcupado(datos.nombre, ranchoId, null)) {
      throw new ConflictException(t('servidor.corrales.nombreOcupado', { nombre: datos.nombre }));
    }
    const id = randomUUID();
    await this.guardando(
      () => this.corrales.crear({ id, ranchoId, ...datos, autorId: quien.id }),
      datos.nombre,
    );
    return {
      corral: conAviso((await this.corrales.uno(id, ranchoId))!),
      mensaje: t('servidor.corrales.creado', { nombre: datos.nombre }),
    };
  }

  async actualizar(id: string, cuerpo: any, quien: UsuarioActual) {
    const ranchoId = await this.permisos.exigir(quien, 'corrales', 'editar');
    const actual = await this.vigente(id, ranchoId);

    const datos = this.validar(cuerpo);
    if (await this.corrales.nombreOcupado(datos.nombre, ranchoId, actual.id)) {
      throw new ConflictException(t('servidor.corrales.nombreOcupado', { nombre: datos.nombre }));
    }
    await this.guardando(
      () => this.corrales.actualizar(actual.id, ranchoId, datos, quien.id),
      datos.nombre,
    );
    return {
      corral: conAviso((await this.corrales.uno(actual.id, ranchoId))!),
      mensaje: t('servidor.corrales.guardado', { nombre: datos.nombre }),
    };
  }

  /** HU-34. Con animales adentro no: primero hay que moverlos. */
  async darDeBaja(id: string, quien: UsuarioActual) {
    const ranchoId = await this.permisos.exigir(quien, 'corrales', 'editar');
    const actual = await this.vigente(id, ranchoId);
    if (actual.ocupacion > 0) {
      throw new ConflictException(
        t('servidor.corrales.conAnimales', { nombre: actual.nombre, n: actual.ocupacion }),
      );
    }
    await this.corrales.marcarBaja(actual.id, ranchoId, true, quien.id);
    return { mensaje: t('servidor.corrales.dadoDeBaja', { nombre: actual.nombre }) };
  }

  async restaurar(id: string, quien: UsuarioActual) {
    const ranchoId = await this.permisos.exigir(quien, 'corrales', 'editar');
    const actual = await this.corrales.uno(id, ranchoId);
    if (!actual) throw new NotFoundException(t('servidor.corrales.noExiste'));
    if (actual.eliminado_en) {
      if (await this.corrales.nombreOcupado(actual.nombre, ranchoId, actual.id)) {
        throw new ConflictException(t('servidor.corrales.nombreOcupado', { nombre: actual.nombre }));
      }
      await this.corrales.marcarBaja(actual.id, ranchoId, false, quien.id);
    }
    return {
      corral: conAviso((await this.corrales.uno(actual.id, ranchoId))!),
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

  private validar(cuerpo: any): {
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

/** Criterio 2: el aviso existe solo si hay capacidad cargada. */
function conAviso(corral: Corral) {
  return {
    ...corral,
    sobrepoblado: corral.capacidad !== null && corral.ocupacion > corral.capacidad,
  };
}
