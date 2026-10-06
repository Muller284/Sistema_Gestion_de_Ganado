import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { UsuarioActual } from '../../comun/repositorio-usuario-actual';
import { RepositorioTipos, type Nivel } from './repositorio-tipos';

/**
 * HU-20 · Tipos de colaborador.
 *
 * Criterios de aceptacion:
 *   1. Existen cuatro tipos predefinidos: veterinario, encargado de campo,
 *      encargado de almacén y administrativo.
 *   2. Puedo crear tipos propios eligiendo los módulos, en cualquier plan.
 *   3. Cambiar los permisos de un tipo afecta a todos los colaboradores de
 *      ese tipo.
 *
 * El criterio 3 sale solo del modelo: los permisos son del tipo, no de cada
 * persona, asi que cambiarlos alcanza a todos los que lo tienen. Por eso cada
 * respuesta dice a cuantos colaboradores afecto el cambio, y la pantalla lo
 * avisa antes de guardar.
 *
 * QUE SE PUEDE HACER CON CADA TIPO
 *                       predefinido               propio
 *   cambiar el nombre   no (es de todos)          si
 *   cambiar permisos    si, solo en este rancho   si
 *   restablecer         si, vuelve al de fabrica  no aplica
 *   eliminar            no                        si, si nadie lo usa
 *
 * QUIEN PUEDE QUE
 *   ver los tipos       propietario y socios (HU-21: el socio ve todo)
 *   todo lo demas       solo el propietario
 *
 * "En cualquier plan": los planes son de la fase 4. Cuando lleguen, crear
 * tipos propios NO tiene que quedar detras de ningun plan.
 *
 * Que el sistema RESPETE estos permisos al usar cada modulo es HU-19 (Brian).
 * Esta historia solo los define.
 */

const LARGO_NOMBRE = 100;
const NIVELES: readonly Nivel[] = ['ninguno', 'ver', 'editar'];

@Injectable()
export class ServicioTipos {
  constructor(private readonly tipos: RepositorioTipos) {}

  async modulos(quien: UsuarioActual) {
    this.puedeVer(quien);
    return this.tipos.modulos();
  }

  async listar(quien: UsuarioActual) {
    const ranchoId = this.ranchoDe(quien);
    // El formulario de alta (HU-17) tambien pide esta lista, y el alta es del
    // propietario: no hace falta abrirsela al colaborador.
    this.puedeVer(quien);
    return this.tipos.listar(ranchoId);
  }

  /** Criterio 2. */
  async crear(cuerpo: any, quien: UsuarioActual) {
    const ranchoId = this.soloPropietario(quien, 'crear tipos de colaborador');
    const nombre = await this.nombreValido(cuerpo?.nombre, ranchoId, null);
    const permisos = await this.permisosValidos(cuerpo?.permisos);

    const id = esUuid(cuerpo?.id) ? cuerpo.id : randomUUID();
    try {
      await this.tipos.crear({ id, nombre, ranchoId, permisos, autorId: quien.id });
    } catch (error: any) {
      if (error?.code === '23505') {
        throw new ConflictException(`Ya tienes un tipo llamado «${nombre}».`);
      }
      throw error;
    }

    return {
      tipo: await this.tipos.uno(id, ranchoId),
      mensaje: `Listo, ya puedes asignar el tipo «${nombre}» a tus colaboradores.`,
    };
  }

  /** Criterio 3. */
  async actualizar(id: string, cuerpo: any, quien: UsuarioActual) {
    const ranchoId = this.soloPropietario(quien, 'cambiar los tipos de colaborador');
    const actual = await this.existente(id, ranchoId);

    let nombre: string | null = null;
    const pedido = texto(cuerpo?.nombre);
    if (pedido && pedido !== actual.nombre) {
      if (actual.es_predefinido) {
        throw new BadRequestException(
          'Los tipos predefinidos no cambian de nombre. Si quieres otro nombre, crea un tipo propio.',
        );
      }
      nombre = await this.nombreValido(pedido, ranchoId, id);
    }
    const permisos = await this.permisosValidos(cuerpo?.permisos);

    await this.tipos.actualizar({ id, ranchoId, nombre, permisos, autorId: quien.id });
    const tipo = await this.tipos.uno(id, ranchoId);

    return {
      tipo,
      afectados: actual.colaboradores,
      mensaje: mensajeDeAlcance(tipo!.nombre, actual.colaboradores),
    };
  }

  async restablecer(id: string, quien: UsuarioActual) {
    const ranchoId = this.soloPropietario(quien, 'restablecer los tipos de colaborador');
    const actual = await this.existente(id, ranchoId);
    if (!actual.es_predefinido) {
      throw new BadRequestException(
        'Solo los tipos predefinidos tienen permisos de fábrica a los que volver.',
      );
    }

    await this.tipos.restablecer(id, ranchoId, quien.id);
    return {
      tipo: await this.tipos.uno(id, ranchoId),
      afectados: actual.colaboradores,
      mensaje: `«${actual.nombre}» volvió a sus permisos de fábrica.`,
    };
  }

  async eliminar(id: string, quien: UsuarioActual) {
    const ranchoId = this.soloPropietario(quien, 'eliminar tipos de colaborador');
    const actual = await this.existente(id, ranchoId);
    if (actual.es_predefinido) {
      throw new BadRequestException('Los tipos predefinidos no se pueden eliminar.');
    }
    if (actual.colaboradores > 0) {
      throw new ConflictException(
        actual.colaboradores === 1
          ? 'Un colaborador tiene este tipo. Cámbiale el tipo antes de eliminarlo.'
          : `${actual.colaboradores} colaboradores tienen este tipo. Cámbiales el tipo antes de eliminarlo.`,
      );
    }

    await this.tipos.eliminar(id, ranchoId, quien.id);
    return { mensaje: `Eliminaste el tipo «${actual.nombre}».` };
  }

  /** Asignar un tipo a un colaborador que ya es del equipo. */
  async asignar(usuarioId: string, cuerpo: any, quien: UsuarioActual) {
    const ranchoId = this.soloPropietario(quien, 'cambiar el tipo de un colaborador');
    const tipoId = texto(cuerpo?.tipo_colaborador_id);
    if (!tipoId) {
      throw new BadRequestException('Falta el tipo de colaborador.');
    }

    const persona = await this.tipos.colaborador(usuarioId, ranchoId);
    if (!persona) {
      throw new NotFoundException('Esa persona no pertenece a tu rancho.');
    }
    if (persona.rol !== 'colaborador') {
      throw new BadRequestException('El tipo solo se asigna a colaboradores.');
    }

    const tipo = esUuid(tipoId) ? await this.tipos.uno(tipoId, ranchoId) : null;
    if (!tipo) {
      throw new BadRequestException('Ese tipo de colaborador no existe en tu rancho.');
    }

    await this.tipos.asignar(usuarioId, tipoId, ranchoId, quien.id);
    return {
      tipo_colaborador_id: tipo.id,
      tipo_colaborador: tipo.nombre,
      mensaje: `${persona.nombre} ahora es ${tipo.nombre.toLowerCase()}.`,
    };
  }

  // --------------------------------------------------------------------------

  private async existente(id: string, ranchoId: string) {
    // Un id de otro rancho responde igual que uno que no existe.
    const tipo = esUuid(id) ? await this.tipos.uno(id, ranchoId) : null;
    if (!tipo) {
      throw new NotFoundException('Ese tipo de colaborador no existe en tu rancho.');
    }
    return tipo;
  }

  private async nombreValido(valor: unknown, ranchoId: string, salvoId: string | null) {
    const nombre = texto(valor).replace(/\s+/g, ' ');
    if (!nombre) {
      throw new BadRequestException('Ponle un nombre al tipo.');
    }
    if (nombre.length > LARGO_NOMBRE) {
      throw new BadRequestException(`El nombre no puede pasar de ${LARGO_NOMBRE} caracteres.`);
    }
    if (await this.tipos.nombreOcupado(nombre, ranchoId, salvoId)) {
      throw new ConflictException(`Ya existe un tipo llamado «${nombre}».`);
    }
    return nombre;
  }

  /**
   * { animales: 'editar', sanidad: 'ver', ... }. Los modulos que no vienen
   * quedan sin acceso. Tiene que haber al menos uno con acceso: un tipo que
   * no ve nada deja al colaborador mirando una pantalla vacia.
   */
  private async permisosValidos(valor: unknown): Promise<Record<string, Nivel>> {
    if (!valor || typeof valor !== 'object' || Array.isArray(valor)) {
      throw new BadRequestException('Faltan los permisos: elige qué módulos ve o edita este tipo.');
    }
    const codigos = new Set((await this.tipos.modulos()).map((m) => m.codigo));
    const permisos: Record<string, Nivel> = {};

    for (const [modulo, nivel] of Object.entries(valor as Record<string, unknown>)) {
      if (!codigos.has(modulo)) {
        throw new BadRequestException(`El módulo «${modulo}» no existe.`);
      }
      if (!NIVELES.includes(nivel as Nivel)) {
        throw new BadRequestException(
          `El permiso de «${modulo}» tiene que ser ninguno, ver o editar.`,
        );
      }
      permisos[modulo] = nivel as Nivel;
    }

    if (!Object.values(permisos).some((nivel) => nivel !== 'ninguno')) {
      throw new BadRequestException('Elige al menos un módulo que este tipo pueda ver.');
    }
    return permisos;
  }

  private ranchoDe(quien: UsuarioActual): string {
    if (!quien.ranchoId) {
      throw new ForbiddenException('Primero hay que crear el rancho.');
    }
    return quien.ranchoId;
  }

  private puedeVer(quien: UsuarioActual) {
    if (quien.rol !== 'propietario' && quien.rol !== 'socio') {
      throw new ForbiddenException(
        'Los tipos de colaborador los ven el propietario y los socios.',
      );
    }
  }

  private soloPropietario(quien: UsuarioActual, accion: string): string {
    const ranchoId = this.ranchoDe(quien);
    if (quien.rol !== 'propietario') {
      throw new ForbiddenException(`Solo el propietario puede ${accion}.`);
    }
    return ranchoId;
  }
}

function mensajeDeAlcance(nombre: string, afectados: number): string {
  if (afectados === 0) return `Guardaste los permisos de «${nombre}».`;
  if (afectados === 1) return `Guardaste los permisos de «${nombre}». El colaborador que lo tiene ya trabaja con ellos.`;
  return `Guardaste los permisos de «${nombre}». Los ${afectados} colaboradores que lo tienen ya trabajan con ellos.`;
}

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor.trim() : '';
}

function esUuid(valor: unknown): boolean {
  return (
    typeof valor === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(valor)
  );
}
