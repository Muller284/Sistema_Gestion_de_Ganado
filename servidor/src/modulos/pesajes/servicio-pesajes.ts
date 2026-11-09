import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { UsuarioActual } from '../../comun/repositorio-usuario-actual';
import { PermisosModulo } from '../../comun/permisos-modulo';
import { t } from '../../comun/idioma';
import { AnimalNoPesable, RepositorioPesajes, type AnimalPesable, type DatosPesaje } from './repositorio-pesajes';

/**
 * HU-53 · Registro de pesaje individual y masivo (Brian, Sprint 4).
 *
 *   1. El peso se escribe en la unidad del país y se guarda en kilos (HU-26):
 *      la pantalla convierte, acá siempre llega peso_kg. La fecha no puede
 *      ser futura, contando hoy en la zona horaria del país del rancho.
 *   2. En el masivo se eligen los animales y cada uno tiene su campo de peso:
 *      la pantalla pide los pesables (POST /pesajes/masivo/animales) y manda
 *      un peso por animal. Se guarda todo junto o nada.
 *   3. El último pesaje pasa a ser el peso actual de la ficha.
 *   4. Cada pesaje aparece en la pestaña Pesajes y en el historial, con quién
 *      lo registró (GET /pesajes/animales/:id trae registrado_por).
 *
 * HU-55 · Registro rápido desde el celular (POST /pesajes/rapido): con la
 *   caravana y el peso alcanza; las reglas son las mismas que en la ficha.
 *
 * Reglas que se suman, las mismas que en el resto del sistema:
 *   - Todo vive en el módulo «pesajes»: el encargado de campo y el
 *     veterinario lo editan, el socio lo ve, almacén no entra (HU-21, HU-22).
 *   - Solo se pesan animales vigentes y activos del rancho (HU-03, HU-34):
 *     un dado de baja, vendido o muerto no se pesa.
 *   - Un pesaje por animal y por día (índice ux_pesajes_animal_fecha de la
 *     migración 010): la ganancia diaria (HU-54) divide por los días.
 *   - La fecha no puede ser anterior al nacimiento del animal.
 */

const LARGO_OBSERVACION = 500;
/** El mismo largo que acepta animales.identificador. */
const LARGO_IDENTIFICADOR = 50;
/** Ningún bovino llega a 3 toneladas: más que eso es un error de tipeo (o de unidad). */
export const MAXIMO_KG = 3000;
/** Cada animal lleva su campo en la pantalla: más que esto no se carga a mano. */
export const MAXIMO_PESAJE_MASIVO = 500;

@Injectable()
export class ServicioPesajes {
  constructor(
    private readonly repositorio: RepositorioPesajes,
    private readonly permisos: PermisosModulo,
  ) {}

  /** La pestaña Pesajes de la ficha: los pesajes del animal, del más nuevo al más viejo. */
  async delAnimal(animalId: string, quien: UsuarioActual) {
    const ranchoId = await this.permisos.exigir(quien, 'pesajes', 'ver');
    const animal = await this.repositorio.animal(animalId, ranchoId);
    if (!animal) throw new NotFoundException(t('servidor.pesajes.animalNoExiste'));
    return {
      animal: {
        id: animal.id,
        identificador: animal.identificador,
        estado: animal.estado,
        eliminado: animal.eliminado,
        peso_kg: animal.peso_kg,
      },
      pesajes: await this.repositorio.delAnimal(animal.id, ranchoId),
      maximo_kg: MAXIMO_KG,
    };
  }

  /** Pesaje individual, desde la pestaña Pesajes de la ficha. */
  async registrar(cuerpo: any, quien: UsuarioActual) {
    const ranchoId = await this.permisos.exigir(quien, 'pesajes', 'editar');
    const animalId = typeof cuerpo?.animal_id === 'string' ? cuerpo.animal_id : '';
    if (!animalId) throw new BadRequestException(t('servidor.pesajes.sinAnimal'));

    const animal = await this.repositorio.animal(animalId, ranchoId);
    if (!animal) throw new NotFoundException(t('servidor.pesajes.animalNoExiste'));
    return this.registrarA(animal, cuerpo, ranchoId, quien);
  }

  /**
   * HU-55 · Registro rápido desde el celular: la caravana y el peso, con un
   * solo toque. Sin fecha es hoy. Además del pesaje, devuelve el animal y su
   * pesaje anterior, así la pantalla muestra a quién pesó y su ganancia
   * diaria (HU-54) sin pedir nada más.
   */
  async registrarRapido(cuerpo: any, quien: UsuarioActual) {
    const ranchoId = await this.permisos.exigir(quien, 'pesajes', 'editar');
    const identificador = typeof cuerpo?.identificador === 'string' ? cuerpo.identificador.trim() : '';
    if (!identificador) throw new BadRequestException(t('servidor.pesajes.rapido.sinIdentificador'));
    if (identificador.length > LARGO_IDENTIFICADOR) {
      throw new BadRequestException(t('servidor.pesajes.rapido.noEncontrado', { identificador: identificador.slice(0, 20) }));
    }

    const animal = await this.repositorio.porIdentificador(identificador, ranchoId);
    if (!animal) throw new NotFoundException(t('servidor.pesajes.rapido.noEncontrado', { identificador }));

    const registrado = await this.registrarA(animal, cuerpo, ranchoId, quien);
    const fecha = registrado.pesaje?.fecha ?? (await this.repositorio.hoy(ranchoId));
    const anterior = await this.repositorio.anteriorA(animal.id, fecha, ranchoId);
    return {
      ...registrado,
      animal: {
        id: animal.id,
        identificador: animal.identificador,
        nombre: animal.nombre,
        categoria_codigo: animal.categoria_codigo,
        corral_nombre: animal.corral_nombre,
      },
      anterior: anterior ? { fecha: anterior.fecha, peso_kg: anterior.peso_kg } : null,
    };
  }

  /** Lo común al pesaje desde la ficha y al rápido: las reglas de HU-53 y guardar. */
  private async registrarA(animal: AnimalPesable, cuerpo: any, ranchoId: string, quien: UsuarioActual) {
    this.exigirPesable(animal);

    const peso = pesoValido(cuerpo?.peso_kg);
    if (peso === null) throw new BadRequestException(t('servidor.pesajes.pesoInvalido', { max: MAXIMO_KG }));
    const fecha = await this.fecha(cuerpo?.fecha, ranchoId);
    this.exigirDespuesDelNacimiento([animal], fecha);
    const observacion = this.observacion(cuerpo?.observacion);

    const repetidos = await this.repositorio.yaPesados([animal.id], fecha, ranchoId);
    if (repetidos.length > 0) {
      throw new ConflictException(t('servidor.pesajes.yaPesado', { identificador: animal.identificador }));
    }

    const [id] = await this.guardar({
      ranchoId,
      fecha,
      pesajes: [{ animal_id: animal.id, peso_kg: peso }],
      observacion,
      loteId: null,
      autorId: quien.id,
    });
    const actualizado = await this.repositorio.animal(animal.id, ranchoId);
    return {
      pesaje: await this.repositorio.pesaje(id, ranchoId),
      peso_actual_kg: actualizado?.peso_kg ?? null,
      mensaje: t('servidor.pesajes.registrado', { identificador: animal.identificador }),
    };
  }

  /**
   * Masivo, paso 1: de los animales elegidos en el listado (HU-31), cuáles se
   * pueden pesar, con su identificador y su peso actual para armar un campo
   * por animal.
   */
  async pesables(cuerpo: any, quien: UsuarioActual) {
    const ranchoId = await this.permisos.exigir(quien, 'pesajes', 'editar');
    const ids = idsElegidos(cuerpo?.animal_ids);
    const animales = await this.repositorio.pesables(ids, ranchoId);
    return {
      animales: animales.map(({ eliminado: _eliminado, ...animal }) => animal),
      no_pesables: ids.length - animales.length,
      maximo: MAXIMO_PESAJE_MASIVO,
      maximo_kg: MAXIMO_KG,
    };
  }

  /** Masivo, paso 2: un peso por animal, la misma fecha para todos, todo o nada. */
  async registrarMasivo(cuerpo: any, quien: UsuarioActual) {
    const ranchoId = await this.permisos.exigir(quien, 'pesajes', 'editar');

    const pedidos: unknown = cuerpo?.pesajes;
    if (
      !Array.isArray(pedidos) ||
      pedidos.length === 0 ||
      pedidos.length > MAXIMO_PESAJE_MASIVO ||
      pedidos.some((p) => typeof p?.animal_id !== 'string' || !p.animal_id)
    ) {
      throw new BadRequestException(t('servidor.pesajes.seleccionInvalida', { n: MAXIMO_PESAJE_MASIVO }));
    }
    const ids = (pedidos as { animal_id: string }[]).map((p) => p.animal_id);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException(t('servidor.pesajes.animalRepetido'));
    }

    const fecha = await this.fecha(cuerpo?.fecha, ranchoId);
    const observacion = this.observacion(cuerpo?.observacion);

    // Todos tienen que poder pesarse: si uno no, no se guarda ninguno.
    const pesables = await this.repositorio.pesables(ids, ranchoId);
    if (pesables.length !== ids.length) {
      throw new BadRequestException(t('servidor.pesajes.noPesables', { n: ids.length - pesables.length }));
    }
    const porId = new Map(pesables.map((animal) => [animal.id, animal]));

    const pesajes: DatosPesaje[] = [];
    for (const pedido of pedidos as { animal_id: string; peso_kg: unknown }[]) {
      const animal = porId.get(pedido.animal_id) as AnimalPesable;
      const peso = pesoValido(pedido.peso_kg);
      if (peso === null) {
        throw new BadRequestException(
          t('servidor.pesajes.pesoInvalidoDe', { identificador: animal.identificador, max: MAXIMO_KG }),
        );
      }
      pesajes.push({ animal_id: animal.id, peso_kg: peso });
    }
    this.exigirDespuesDelNacimiento(pesables, fecha);

    const repetidos = await this.repositorio.yaPesados(ids, fecha, ranchoId);
    if (repetidos.length > 0) {
      throw new ConflictException(
        t('servidor.pesajes.yaPesadosMasivo', { n: repetidos.length, lista: repetidos.join(', ') }),
      );
    }

    const loteId = randomUUID();
    await this.guardar({ ranchoId, fecha, pesajes, observacion, loteId, autorId: quien.id });
    return {
      registrados: pesajes.length,
      lote_id: loteId,
      mensaje: t('servidor.pesajes.registradosMasivo', { n: pesajes.length }),
    };
  }

  // --------------------------------------------------------------------------

  /** Si entre validar y guardar cambió algo, el error dice qué y no se guarda nada. */
  private async guardar(datos: Parameters<RepositorioPesajes['registrar']>[0]): Promise<string[]> {
    try {
      return await this.repositorio.registrar(datos);
    } catch (error: any) {
      if (error instanceof AnimalNoPesable) {
        throw new ConflictException(t('servidor.pesajes.animalCambio'));
      }
      // 23505: otro pedido cargó el mismo animal ese mismo día.
      if (error?.code === '23505') {
        throw new ConflictException(t('servidor.pesajes.yaPesadoAhora'));
      }
      throw error;
    }
  }

  private exigirPesable(animal: AnimalPesable): void {
    if (animal.eliminado) {
      throw new BadRequestException(t('servidor.pesajes.animalDeBaja', { identificador: animal.identificador }));
    }
    if (animal.estado !== 'activo') {
      throw new BadRequestException(
        t('servidor.pesajes.animalNoActivo', {
          identificador: animal.identificador,
          estado: t(`servidor.animales.estados.${animal.estado}`),
        }),
      );
    }
  }

  private exigirDespuesDelNacimiento(animales: AnimalPesable[], fecha: string): void {
    const antes = animales.filter((a) => a.fecha_nacimiento && fecha < a.fecha_nacimiento);
    if (antes.length > 0) {
      throw new BadRequestException(
        t('servidor.pesajes.antesDelNacimiento', { lista: antes.map((a) => a.identificador).join(', ') }),
      );
    }
  }

  /** AAAA-MM-DD que exista y no sea futura en el país del rancho. Sin fecha, hoy. */
  private async fecha(valor: unknown, ranchoId: string): Promise<string> {
    const hoy = await this.repositorio.hoy(ranchoId);
    if (valor === undefined || valor === null || valor === '') return hoy;
    const fecha = fechaValida(valor);
    if (!fecha) throw new BadRequestException(t('servidor.pesajes.fechaInvalida'));
    if (fecha > hoy) throw new BadRequestException(t('servidor.pesajes.fechaFutura'));
    return fecha;
  }

  private observacion(valor: unknown): string | null {
    if (valor === undefined || valor === null) return null;
    if (typeof valor !== 'string') throw new BadRequestException(t('servidor.pesajes.observacionInvalida'));
    const limpia = valor.trim();
    if (limpia.length > LARGO_OBSERVACION) {
      throw new BadRequestException(t('servidor.pesajes.observacionLarga', { n: LARGO_OBSERVACION }));
    }
    return limpia || null;
  }
}

/** Kilos con dos decimales, mayor que cero y hasta MAXIMO_KG. Nulo si no sirve. */
export function pesoValido(valor: unknown): number | null {
  let numero: number;
  if (typeof valor === 'number') numero = valor;
  else if (typeof valor === 'string' && valor.trim() !== '') numero = Number(valor);
  else return null;
  if (!Number.isFinite(numero)) return null;
  const redondeado = Math.round(numero * 100) / 100;
  return redondeado > 0 && redondeado <= MAXIMO_KG ? redondeado : null;
}

/** Entre 1 y MAXIMO_PESAJE_MASIVO ids de texto, sin repetidos. */
function idsElegidos(pedidos: unknown): string[] {
  if (
    !Array.isArray(pedidos) ||
    pedidos.length === 0 ||
    pedidos.length > MAXIMO_PESAJE_MASIVO ||
    pedidos.some((id) => typeof id !== 'string' || !id)
  ) {
    throw new BadRequestException(t('servidor.pesajes.seleccionInvalida', { n: MAXIMO_PESAJE_MASIVO }));
  }
  return [...new Set(pedidos as string[])];
}

/** AAAA-MM-DD que exista de verdad (no 2026-02-31). */
function fechaValida(valor: unknown): string | null {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return null;
  const fecha = new Date(`${valor}T00:00:00Z`);
  return !isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor ? valor : null;
}
