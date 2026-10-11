import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { UsuarioActual } from '../../comun/repositorio-usuario-actual';
import { RepositorioGuia } from './repositorio-guia';

/**
 * HU-16 · Guía de configuración inicial.
 *
 * Criterios de aceptacion:
 *   1. Muestra cuatro pasos: animales, corrales, vacunas y equipo.
 *   2. Cada paso indica si está pendiente, en curso o completo.
 *   3. Puedo abandonarla y retomarla más adelante desde donde quedé.
 *   4. Los pasos de fases posteriores quedan visibles pero marcados como no
 *      disponibles todavía.
 *
 * COMO SE DECIDE EL ESTADO DE UN PASO
 *   completo   el propietario lo dio por terminado.
 *   en curso   lo abrio alguna vez, o ya tiene datos (hay integrantes,
 *              hay animales...).
 *   pendiente  ninguna de las dos.
 * "Completo" lo decide el propietario y no los datos: el sistema no puede
 * saber si con tres colaboradores el equipo ya esta armado o faltan dos.
 *
 * COMO SE PRENDE UN PASO NUEVO
 * Cuando exista el modulo de animales (HU-27) o de corrales (HU-36), se pone
 * disponible en verdadero y su ruta en el catalogo de abajo. Nada mas: el
 * conteo de datos ya mira la tabla del mismo nombre, y mientras la tabla no
 * exista cuenta cero.
 */

type ClavePaso = 'animales' | 'corrales' | 'vacunas' | 'equipo';

interface DefinicionPaso {
  clave: ClavePaso;
  nombre: string;
  descripcion: string;
  fase: number;
  disponible: boolean;
  /** A que pantalla lleva el paso en el cliente. */
  ruta: string | null;
  /** De que tabla sale el conteo de datos. */
  tabla?: string;
}

const CATALOGO: DefinicionPaso[] = [
  {
    clave: 'animales',
    nombre: 'Carga tus animales',
    descripcion: 'Uno por uno o importando tu planilla de Excel.',
    fase: 2,
    disponible: false,
    ruta: null,
    tabla: 'animales',
  },
  {
    clave: 'corrales',
    nombre: 'Arma tus corrales',
    descripcion: 'Con su capacidad, para que el sistema avise si uno se llena.',
    fase: 2,
    disponible: false,
    ruta: null,
    tabla: 'corrales',
  },
  {
    clave: 'vacunas',
    nombre: 'Define tus vacunas',
    descripcion: 'Tu esquema sanitario, para recibir avisos antes de cada vencimiento.',
    fase: 3,
    disponible: false,
    ruta: null,
    tabla: 'esquemas_vacunacion',
  },
  {
    clave: 'equipo',
    nombre: 'Suma a tu equipo',
    descripcion: 'Socios que ven todo y colaboradores que cargan lo suyo.',
    fase: 1,
    disponible: true,
    ruta: '/equipo',
  },
];

export type EstadoPaso = 'pendiente' | 'en_curso' | 'completo';

@Injectable()
export class ServicioGuia {
  constructor(private readonly guia: RepositorioGuia) {}

  async estado(quien: UsuarioActual) {
    const ranchoId = this.ranchoDe(quien);
    const [filas, pausadaEn] = await Promise.all([
      this.guia.pasos(ranchoId),
      this.guia.pausadaEn(ranchoId),
    ]);

    const pasos = await Promise.all(
      CATALOGO.map(async (definicion) => {
        const fila = filas.find((f) => f.paso === definicion.clave);
        const datos = definicion.disponible ? await this.datosDe(definicion, ranchoId) : 0;

        const estado: EstadoPaso = fila?.completado_en
          ? 'completo'
          : fila?.visitado_en || datos > 0
            ? 'en_curso'
            : 'pendiente';

        return {
          clave: definicion.clave,
          nombre: definicion.nombre,
          descripcion: definicion.descripcion,
          fase: definicion.fase,
          disponible: definicion.disponible,
          ruta: definicion.disponible ? definicion.ruta : null,
          estado,
          datos,
        };
      }),
    );

    const completos = pasos.filter((p) => p.estado === 'completo').length;

    // "Desde donde quede": el primer paso disponible que se empezo y no se
    // termino; si no hay, el primero disponible sin terminar.
    const disponibles = pasos.filter((p) => p.disponible && p.estado !== 'completo');
    const siguiente =
      disponibles.find((p) => p.estado === 'en_curso') ?? disponibles[0] ?? null;

    return {
      pasos,
      completos,
      total: pasos.length,
      siguiente: siguiente?.clave ?? null,
      pausada: pausadaEn !== null,
      terminada: completos === pasos.length,
    };
  }

  async visitar(paso: string, quien: UsuarioActual) {
    const { ranchoId } = this.pasoDisponible(paso, quien);
    await this.guia.marcarVisitado(ranchoId, paso, quien.id);
    return this.estado(quien);
  }

  async completar(paso: string, completado: boolean, quien: UsuarioActual) {
    const { ranchoId } = this.pasoDisponible(paso, quien);
    await this.guia.marcarCompletado(ranchoId, paso, completado, quien.id);
    return this.estado(quien);
  }

  /** Criterio 3: abandonarla y retomarla. Pausar no borra nada. */
  async pausar(cuerpo: any, quien: UsuarioActual) {
    const ranchoId = this.soloPropietario(quien);
    if (typeof cuerpo?.pausada !== 'boolean') {
      throw new BadRequestException('Indica si la guía queda en pausa (pausada: true o false).');
    }
    await this.guia.pausar(ranchoId, cuerpo.pausada, quien.id);
    return this.estado(quien);
  }

  private async datosDe(definicion: DefinicionPaso, ranchoId: string): Promise<number> {
    if (definicion.clave === 'equipo') return this.guia.integrantes(ranchoId);
    return definicion.tabla ? this.guia.filasDelRancho(definicion.tabla, ranchoId) : 0;
  }

  private pasoDisponible(paso: string, quien: UsuarioActual) {
    const ranchoId = this.soloPropietario(quien);
    const definicion = CATALOGO.find((d) => d.clave === paso);
    if (!definicion) {
      throw new NotFoundException('Ese paso no existe en la guía.');
    }
    if (!definicion.disponible) {
      throw new BadRequestException(
        `Ese paso todavía no está disponible: llega en la fase ${definicion.fase}.`,
      );
    }
    return { ranchoId, definicion };
  }

  private ranchoDe(quien: UsuarioActual): string {
    if (!quien.ranchoId) {
      throw new ForbiddenException('Primero hay que crear el rancho.');
    }
    return quien.ranchoId;
  }

  private soloPropietario(quien: UsuarioActual): string {
    const ranchoId = this.ranchoDe(quien);
    if (quien.rol !== 'propietario') {
      throw new ForbiddenException('La guía de configuración la maneja el propietario.');
    }
    return ranchoId;
  }
}
