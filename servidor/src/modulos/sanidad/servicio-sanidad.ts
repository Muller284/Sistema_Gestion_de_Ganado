import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { UsuarioActual } from '../../comun/repositorio-usuario-actual';
import { PermisosModulo } from '../../comun/permisos-modulo';
import { t } from '../../comun/idioma';
import { claveDeRaza } from '../../comun/razas';
import {
  RepositorioSanidad,
  type DatosAplicacion,
  type DatosProducto,
  type TipoProducto,
  type UnidadDosis,
} from './repositorio-sanidad';

/**
 * HU-46 · Catálogo de productos sanitarios.
 *   1. Cada producto tiene nombre, tipo, laboratorio opcional y dosis por
 *      animal con su unidad (las dos o ninguna).
 *   2. El catálogo es de cada rancho: otro rancho no lo ve (HU-03).
 *   3. El nombre no se repite dentro del rancho, sin importar mayúsculas ni
 *      acentos (columna clave, misma regla que las razas).
 *   4. Se da de baja sin borrarse; las aplicaciones que lo usaron lo siguen
 *      mostrando. Mientras un esquema vigente lo use, no se puede: el
 *      calendario quedaría pidiendo un producto que ya no está.
 *   5. Solo quien edita sanidad crea, edita o da de baja.
 *
 * HU-48 · Registro de aplicación individual.
 *   1. Se elige el producto, la fecha (no futura), la dosis y, si
 *      corresponde, el esquema y a qué dosis de él equivale.
 *   2. Queda quién la aplicó: quien la registra, o la persona del rancho que
 *      se elija.
 *   3. Se ve en la pestaña Sanidad y en el historial de la ficha (HU-32).
 *   4. No se registra en un animal dado de baja (HU-34).
 */

const TIPOS: TipoProducto[] = ['vacuna', 'antiparasitario', 'vitamina', 'antibiotico', 'otro'];
const UNIDADES: UnidadDosis[] = ['ml', 'g', 'mg', 'dosis'];
const LARGO_NOMBRE = 120;
const LARGO_OBSERVACION = 500;
/** NUMERIC(10,2) de la migración 010. */
const MAXIMA_DOSIS = 99999999.99;

@Injectable()
export class ServicioSanidad {
  constructor(
    private readonly repositorio: RepositorioSanidad,
    private readonly permisos: PermisosModulo,
  ) {}

  // ---------------------------------------------------------------- productos

  async productos(quien: UsuarioActual) {
    const ranchoId = await this.permisos.exigir(quien, 'sanidad', 'ver');
    return { productos: await this.repositorio.productos(ranchoId) };
  }

  async crearProducto(cuerpo: any, quien: UsuarioActual) {
    const ranchoId = await this.permisos.exigir(quien, 'sanidad', 'editar');
    const datos = await this.validarProducto(cuerpo, ranchoId, null);
    const id = randomUUID();
    await this.conNombreUnico(datos.nombre, () => this.repositorio.crearProducto(id, ranchoId, datos, quien.id));
    return {
      producto: await this.repositorio.producto(id, ranchoId),
      mensaje: t('servidor.sanidad.productos.creado', { nombre: datos.nombre }),
    };
  }

  async actualizarProducto(id: string, cuerpo: any, quien: UsuarioActual) {
    const ranchoId = await this.permisos.exigir(quien, 'sanidad', 'editar');
    const actual = await this.repositorio.producto(id, ranchoId);
    if (!actual) throw new NotFoundException(t('servidor.sanidad.productos.noExiste'));
    const datos = await this.validarProducto(cuerpo, ranchoId, actual.id);
    await this.conNombreUnico(datos.nombre, () =>
      this.repositorio.actualizarProducto(actual.id, ranchoId, datos, quien.id),
    );
    return {
      producto: await this.repositorio.producto(actual.id, ranchoId),
      mensaje: t('servidor.sanidad.productos.guardado', { nombre: datos.nombre }),
    };
  }

  async darDeBajaProducto(id: string, quien: UsuarioActual) {
    const ranchoId = await this.permisos.exigir(quien, 'sanidad', 'editar');
    const actual = await this.repositorio.producto(id, ranchoId);
    if (!actual) throw new NotFoundException(t('servidor.sanidad.productos.noExiste'));
    if (actual.esquemas > 0) {
      throw new ConflictException(
        t('servidor.sanidad.productos.usadoEnEsquemas', { nombre: actual.nombre, n: actual.esquemas }),
      );
    }
    await this.repositorio.darDeBajaProducto(actual.id, ranchoId, quien.id);
    return { mensaje: t('servidor.sanidad.productos.dadoDeBaja', { nombre: actual.nombre }) };
  }

  // ------------------------------------------------------------- aplicaciones

  /** Lo que hace falta para el formulario: productos, esquemas y quién pudo aplicar. */
  async opcionesAplicacion(quien: UsuarioActual) {
    const ranchoId = await this.permisos.exigir(quien, 'sanidad', 'editar');
    const [productos, esquemas, integrantes, hoy] = await Promise.all([
      this.repositorio.productos(ranchoId),
      this.repositorio.esquemasElegibles(ranchoId),
      this.repositorio.integrantes(ranchoId),
      this.repositorio.hoy(ranchoId),
    ]);
    return { productos, esquemas, integrantes, hoy };
  }

  async aplicaciones(animalId: string, quien: UsuarioActual) {
    const ranchoId = await this.permisos.exigir(quien, 'sanidad', 'ver');
    const animal = await this.repositorio.animal(animalId, ranchoId);
    if (!animal) throw new NotFoundException(t('servidor.sanidad.aplicaciones.animalNoExiste'));
    return { aplicaciones: await this.repositorio.aplicaciones(animal.id, ranchoId) };
  }

  async registrarAplicacion(animalId: string, cuerpo: any, quien: UsuarioActual) {
    const ranchoId = await this.permisos.exigir(quien, 'sanidad', 'editar');
    const animal = await this.repositorio.animal(animalId, ranchoId);
    if (!animal) throw new NotFoundException(t('servidor.sanidad.aplicaciones.animalNoExiste'));
    if (animal.eliminado_en) {
      throw new BadRequestException(
        t('servidor.sanidad.aplicaciones.animalDadoDeBaja', { identificador: animal.identificador }),
      );
    }

    const datos = await this.validarAplicacion(cuerpo, animal, ranchoId, quien);
    const id = randomUUID();
    await this.repositorio.crearAplicacion(id, ranchoId, datos, quien.id);
    const aplicacion = (await this.repositorio.aplicaciones(animal.id, ranchoId)).find((a) => a.id === id);
    return {
      aplicacion,
      mensaje: t('servidor.sanidad.aplicaciones.registrada', {
        producto: aplicacion?.producto_nombre ?? '',
        identificador: animal.identificador,
      }),
    };
  }

  // --------------------------------------------------------------------------

  private async validarProducto(cuerpo: any, ranchoId: string, propioId: string | null): Promise<DatosProducto> {
    const nombre = limpio(cuerpo?.nombre);
    if (!nombre) throw new BadRequestException(t('servidor.sanidad.productos.sinNombre'));
    if (nombre.length > LARGO_NOMBRE) {
      throw new BadRequestException(t('servidor.sanidad.productos.nombreLargo', { n: LARGO_NOMBRE }));
    }
    const clave = claveDeRaza(nombre);
    if (await this.repositorio.claveOcupada(clave, ranchoId, propioId)) {
      throw new ConflictException(t('servidor.sanidad.productos.nombreOcupado', { nombre }));
    }

    const tipo = cuerpo?.tipo;
    if (!TIPOS.includes(tipo)) throw new BadRequestException(t('servidor.sanidad.productos.tipoInvalido'));

    const laboratorio = limpio(cuerpo?.laboratorio) || null;
    if (laboratorio && laboratorio.length > LARGO_NOMBRE) {
      throw new BadRequestException(t('servidor.sanidad.productos.laboratorioLargo', { n: LARGO_NOMBRE }));
    }

    // La dosis y su unidad van juntas, o ninguna de las dos.
    const dosis = numero(cuerpo?.dosis);
    const unidad = vacio(cuerpo?.unidad) ? null : cuerpo.unidad;
    if (dosis !== null && !dosisValida(dosis)) {
      throw new BadRequestException(t('servidor.sanidad.productos.dosisInvalida'));
    }
    if (unidad !== null && !UNIDADES.includes(unidad)) {
      throw new BadRequestException(t('servidor.sanidad.productos.unidadInvalida'));
    }
    if ((dosis === null) !== (unidad === null)) {
      throw new BadRequestException(t('servidor.sanidad.productos.dosisSinUnidad'));
    }

    return { nombre, clave, tipo, laboratorio, dosis, unidad };
  }

  private async validarAplicacion(
    cuerpo: any,
    animal: { id: string; fecha_nacimiento: string | null },
    ranchoId: string,
    quien: UsuarioActual,
  ): Promise<DatosAplicacion> {
    const productoId = typeof cuerpo?.producto_id === 'string' ? cuerpo.producto_id : '';
    if (!productoId) throw new BadRequestException(t('servidor.sanidad.aplicaciones.sinProducto'));
    const producto = await this.repositorio.producto(productoId, ranchoId);
    if (!producto) throw new BadRequestException(t('servidor.sanidad.aplicaciones.productoNoExiste'));

    const fecha = fechaValida(cuerpo?.fecha);
    if (!fecha) throw new BadRequestException(t('servidor.sanidad.aplicaciones.fechaInvalida'));
    if (fecha > (await this.repositorio.hoy(ranchoId))) {
      throw new BadRequestException(t('servidor.sanidad.aplicaciones.fechaFutura'));
    }
    if (animal.fecha_nacimiento && fecha < animal.fecha_nacimiento) {
      throw new BadRequestException(t('servidor.sanidad.aplicaciones.antesDeNacer'));
    }

    // Sin dosis escrita, la del producto.
    const escrita = numero(cuerpo?.dosis);
    if (escrita !== null && !dosisValida(escrita)) {
      throw new BadRequestException(t('servidor.sanidad.aplicaciones.dosisInvalida'));
    }
    const dosis = escrita ?? producto.dosis;

    // El esquema es opcional. Si viene, tiene que ser de este producto; el
    // número de dosis va de 1 a las que tiene el esquema, y vacío es un refuerzo.
    let esquemaId: string | null = null;
    let numeroDosis: number | null = null;
    if (!vacio(cuerpo?.esquema_id)) {
      const esquema = await this.repositorio.esquema(String(cuerpo.esquema_id), ranchoId);
      if (!esquema) throw new BadRequestException(t('servidor.sanidad.aplicaciones.esquemaNoExiste'));
      if (esquema.producto_id !== producto.id) {
        throw new BadRequestException(
          t('servidor.sanidad.aplicaciones.esquemaDeOtroProducto', { esquema: esquema.nombre, producto: producto.nombre }),
        );
      }
      esquemaId = esquema.id;
      numeroDosis = numero(cuerpo?.numero_dosis);
      if (numeroDosis !== null && (!Number.isInteger(numeroDosis) || numeroDosis < 1 || numeroDosis > esquema.dosis)) {
        throw new BadRequestException(t('servidor.sanidad.aplicaciones.numeroDosisInvalido', { n: esquema.dosis }));
      }
    } else if (!vacio(cuerpo?.numero_dosis)) {
      throw new BadRequestException(t('servidor.sanidad.aplicaciones.numeroSinEsquema'));
    }

    // Quién la aplicó: por defecto quien la registra.
    let aplicadoPor = quien.id;
    if (!vacio(cuerpo?.aplicado_por) && cuerpo.aplicado_por !== quien.id) {
      const integrantes = await this.repositorio.integrantes(ranchoId);
      if (!integrantes.some((persona) => persona.id === cuerpo.aplicado_por)) {
        throw new BadRequestException(t('servidor.sanidad.aplicaciones.aplicadorNoExiste'));
      }
      aplicadoPor = cuerpo.aplicado_por;
    }

    const observacion = limpio(cuerpo?.observacion) || null;
    if (observacion && observacion.length > LARGO_OBSERVACION) {
      throw new BadRequestException(t('servidor.sanidad.aplicaciones.observacionLarga', { n: LARGO_OBSERVACION }));
    }

    return {
      animal_id: animal.id,
      producto_id: producto.id,
      esquema_id: esquemaId,
      numero_dosis: numeroDosis,
      fecha,
      dosis,
      aplicado_por: aplicadoPor,
      observacion,
    };
  }

  /** Si dos guardan el mismo nombre a la vez, el índice único frena al segundo. */
  private async conNombreUnico(nombre: string, guardar: () => Promise<void>) {
    try {
      await guardar();
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException(t('servidor.sanidad.productos.nombreOcupado', { nombre }));
      }
      throw error;
    }
  }
}

function vacio(valor: unknown): boolean {
  return valor === undefined || valor === null || valor === '';
}

/** Texto sin espacios de más; vacío si no es texto. */
function limpio(valor: unknown): string {
  return typeof valor === 'string' ? valor.trim().replace(/\s+/g, ' ') : '';
}

/** Vacío es nulo; lo demás, número (NaN si no lo es, para que la validación lo rechace). */
function numero(valor: unknown): number | null {
  if (vacio(valor)) return null;
  if (typeof valor === 'number') return valor;
  if (typeof valor === 'string' && valor.trim() !== '') return Number(valor.replace(',', '.'));
  return NaN;
}

/** Mayor que cero, con dos decimales como mucho. */
function dosisValida(valor: number): boolean {
  // 1.1 * 100 no da 110 exacto en coma flotante: se compara con margen.
  return Number.isFinite(valor) && valor > 0 && valor <= MAXIMA_DOSIS && Math.abs(Math.round(valor * 100) - valor * 100) < 1e-6;
}

/** AAAA-MM-DD de un día que existe, o nulo. */
function fechaValida(valor: unknown): string | null {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return null;
  const [a, m, d] = valor.split('-').map(Number);
  const real = new Date(Date.UTC(a, m - 1, d));
  if (real.getUTCFullYear() !== a || real.getUTCMonth() !== m - 1 || real.getUTCDate() !== d) return null;
  return valor;
}
