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
import { actuaComoPropietario } from '../../comun/permisos-rol';
import { t, tn } from '../../comun/idioma';

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
    const ranchoId = this.soloPropietario(quien, 'servidor.tipos.acciones.crear');
    const nombre = await this.nombreValido(cuerpo?.nombre, ranchoId, null);
    const permisos = await this.permisosValidos(cuerpo?.permisos);

    const id = esUuid(cuerpo?.id) ? cuerpo.id : randomUUID();
    try {
      await this.tipos.crear({ id, nombre, ranchoId, permisos, autorId: quien.id });
    } catch (error: any) {
      if (error?.code === '23505') {
        throw new ConflictException(t('servidor.tipos.yaTienes', { nombre }));
      }
      throw error;
    }

    return {
      tipo: await this.tipos.uno(id, ranchoId),
      mensaje: t('servidor.tipos.creado', { nombre }),
    };
  }

  /** Criterio 3. */
  async actualizar(id: string, cuerpo: any, quien: UsuarioActual) {
    const ranchoId = this.soloPropietario(quien, 'servidor.tipos.acciones.cambiar');
    const actual = await this.existente(id, ranchoId);

    let nombre: string | null = null;
    const pedido = texto(cuerpo?.nombre);
    if (pedido && pedido !== actual.nombre) {
      if (actual.es_predefinido) {
        throw new BadRequestException(t('servidor.tipos.predefinidoSinRenombrar'));
      }
      nombre = await this.nombreValido(pedido, ranchoId, id);
    }
    const permisos = await this.permisosValidos(cuerpo?.permisos);

    await this.tipos.actualizar({ id, ranchoId, nombre, permisos, autorId: quien.id });
    const tipo = await this.tipos.uno(id, ranchoId);

    return {
      tipo,
      afectados: actual.colaboradores,
      mensaje: tn('servidor.tipos.guardados', actual.colaboradores, { nombre: nombreVisible(tipo!) }),
    };
  }

  async restablecer(id: string, quien: UsuarioActual) {
    const ranchoId = this.soloPropietario(quien, 'servidor.tipos.acciones.restablecer');
    const actual = await this.existente(id, ranchoId);
    if (!actual.es_predefinido) {
      throw new BadRequestException(t('servidor.tipos.soloPredefinidosRestablecen'));
    }

    await this.tipos.restablecer(id, ranchoId, quien.id);
    return {
      tipo: await this.tipos.uno(id, ranchoId),
      afectados: actual.colaboradores,
      mensaje: t('servidor.tipos.restablecido', { nombre: nombreVisible(actual) }),
    };
  }

  async eliminar(id: string, quien: UsuarioActual) {
    const ranchoId = this.soloPropietario(quien, 'servidor.tipos.acciones.eliminar');
    const actual = await this.existente(id, ranchoId);
    if (actual.es_predefinido) {
      throw new BadRequestException(t('servidor.tipos.predefinidoNoSeElimina'));
    }
    if (actual.colaboradores > 0) {
      throw new ConflictException(tn('servidor.tipos.enUso', actual.colaboradores));
    }

    await this.tipos.eliminar(id, ranchoId, quien.id);
    return { mensaje: t('servidor.tipos.eliminado', { nombre: nombreVisible(actual) }) };
  }

  /** Asignar un tipo a un colaborador que ya es del equipo. */
  async asignar(usuarioId: string, cuerpo: any, quien: UsuarioActual) {
    const ranchoId = this.soloPropietario(quien, 'servidor.tipos.acciones.asignar');
    const tipoId = texto(cuerpo?.tipo_colaborador_id);
    if (!tipoId) {
      throw new BadRequestException(t('servidor.tipos.faltaTipo'));
    }

    const persona = await this.tipos.colaborador(usuarioId, ranchoId);
    if (!persona) {
      throw new NotFoundException(t('servidor.datos.noEsDeTuRancho'));
    }
    if (persona.rol !== 'colaborador') {
      throw new BadRequestException(t('servidor.tipos.soloColaboradores'));
    }

    const tipo = esUuid(tipoId) ? await this.tipos.uno(tipoId, ranchoId) : null;
    if (!tipo) {
      throw new BadRequestException(t('servidor.datos.tipoNoExiste'));
    }

    await this.tipos.asignar(usuarioId, tipoId, ranchoId, quien.id);
    return {
      tipo_colaborador_id: tipo.id,
      tipo_colaborador: tipo.nombre,
      mensaje: t('servidor.tipos.asignado', {
        persona: persona.nombre,
        tipo: nombreVisible(tipo).toLowerCase(),
      }),
    };
  }

  // --------------------------------------------------------------------------

  private async existente(id: string, ranchoId: string) {
    // Un id de otro rancho responde igual que uno que no existe.
    const tipo = esUuid(id) ? await this.tipos.uno(id, ranchoId) : null;
    if (!tipo) {
      throw new NotFoundException(t('servidor.datos.tipoNoExiste'));
    }
    return tipo;
  }

  private async nombreValido(valor: unknown, ranchoId: string, salvoId: string | null) {
    const nombre = texto(valor).replace(/\s+/g, ' ');
    if (!nombre) {
      throw new BadRequestException(t('servidor.tipos.sinNombre'));
    }
    if (nombre.length > LARGO_NOMBRE) {
      throw new BadRequestException(t('servidor.perfil.nombreLargo', { n: LARGO_NOMBRE }));
    }
    if (await this.tipos.nombreOcupado(nombre, ranchoId, salvoId)) {
      throw new ConflictException(t('servidor.tipos.yaExiste', { nombre }));
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
      throw new BadRequestException(t('servidor.tipos.faltanPermisos'));
    }
    const codigos = new Set((await this.tipos.modulos()).map((m) => m.codigo));
    const permisos: Record<string, Nivel> = {};

    for (const [modulo, nivel] of Object.entries(valor as Record<string, unknown>)) {
      if (!codigos.has(modulo)) {
        throw new BadRequestException(t('servidor.tipos.moduloNoExiste', { modulo }));
      }
      if (!NIVELES.includes(nivel as Nivel)) {
        throw new BadRequestException(t('servidor.tipos.nivelInvalido', { modulo }));
      }
      permisos[modulo] = nivel as Nivel;
    }

    if (!Object.values(permisos).some((nivel) => nivel !== 'ninguno')) {
      throw new BadRequestException(t('servidor.tipos.algunModulo'));
    }
    return permisos;
  }

  private ranchoDe(quien: UsuarioActual): string {
    if (!quien.ranchoId) {
      throw new ForbiddenException(t('servidor.datos.primeroElRancho'));
    }
    return quien.ranchoId;
  }

  private puedeVer(quien: UsuarioActual) {
    if (quien.rol !== 'socio' && !actuaComoPropietario(quien)) {
      throw new ForbiddenException(t('servidor.tipos.soloVen'));
    }
  }

  /** accion es la clave del texto de la accion: "Solo el propietario puede {accion}." */
  private soloPropietario(quien: UsuarioActual, accion: string): string {
    const ranchoId = this.ranchoDe(quien);
    if (!actuaComoPropietario(quien)) {
      throw new ForbiddenException(t('servidor.datos.soloPropietario', { accion: t(accion) }));
    }
    return ranchoId;
  }
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

/**
 * HU-25. Los cuatro predefinidos tienen su nombre en cada idioma; los tipos
 * propios se muestran como los escribio el propietario.
 */
const CLAVE_PREDEFINIDO: Record<string, string> = {
  '11111111-1111-4111-8111-000000000001': 'veterinario',
  '11111111-1111-4111-8111-000000000002': 'encargadoCampo',
  '11111111-1111-4111-8111-000000000003': 'encargadoAlmacen',
  '11111111-1111-4111-8111-000000000004': 'administrativo',
};

function nombreVisible(tipo: { id: string; nombre: string; es_predefinido: boolean }): string {
  const clave = tipo.es_predefinido ? CLAVE_PREDEFINIDO[tipo.id] : undefined;
  return clave ? t(`servidor.tipos.predefinidos.${clave}`) : tipo.nombre;
}
