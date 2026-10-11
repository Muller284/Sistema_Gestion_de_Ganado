import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { cifrarContrasena, claveTemporal, enumerar } from '../../comun/contrasenas';
import type { UsuarioActual } from '../../comun/repositorio-usuario-actual';
import { ServicioCorreo } from '../../comun/servicio-correo';
import { RepositorioSesion } from '../usuarios/repositorio-sesion';
import { RepositorioEquipo } from './repositorio-equipo';

/**
 * HU-17 · Alta de socios y colaboradores.
 *
 * Criterios de aceptacion:
 *   1. Cargo nombre, correo, rol y, si es colaborador, su tipo.
 *   2. El sistema genera una contraseña temporal.
 *   3. Si el correo ya pertenece a otro rancho, el sistema rechaza el alta.
 *   4. Puedo suspender y reactivar a cualquier miembro de mi equipo.
 *
 * LA CONTRASEÑA TEMPORAL NO LA VE EL PROPIETARIO
 * Es la misma regla de HU-10: la clave se manda por correo al integrante y
 * no vuelve en la respuesta. Si el propietario la conociera, el "creado por"
 * de cada dato (HU-23) no probaria quien lo cargo. En desarrollo el correo
 * sale por la consola del servidor, y ahi se lee.
 *
 * DE DONDE VIENE LA REGLA DEL CORREO
 * El rechazo por correo repetido es el criterio de HU-13 (Brian), que ya lo
 * validaba en POST /usuarios/colaboradores sin llegar a crear a nadie. Aca se
 * aplica la misma regla, con el mismo mensaje, y ademas se crea el usuario.
 *
 * QUIEN PUEDE QUE
 *   ver el equipo              propietario y socios (HU-21: el socio ve todo)
 *   dar de alta, suspender     solo el propietario
 * Los permisos por modulo (HU-19) y los limites del plan (fase 4) todavia no
 * existen; cuando lleguen, se agregan en este servicio.
 */

const LARGO_NOMBRE = 150;
const LARGO_CORREO = 150;
const FORMA_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ROLES_QUE_SE_DAN_DE_ALTA = ['socio', 'colaborador'] as const;

const NOMBRE_ROL: Record<string, string> = {
  socio: 'socio',
  colaborador: 'colaborador',
};

@Injectable()
export class ServicioEquipo {
  constructor(
    private readonly equipo: RepositorioEquipo,
    private readonly sesiones: RepositorioSesion,
    private readonly correo: ServicioCorreo,
  ) {}

  async listar(quien: UsuarioActual) {
    const ranchoId = this.ranchoDe(quien);
    if (quien.rol !== 'propietario' && quien.rol !== 'socio') {
      throw new ForbiddenException(
        'El equipo lo ven el propietario y los socios. Si lo necesitas, pídeselo al propietario.',
      );
    }
    return this.equipo.listar(ranchoId);
  }

  async tipos(quien: UsuarioActual) {
    return this.equipo.tipos(this.ranchoDe(quien));
  }

  async alta(cuerpo: any, quien: UsuarioActual) {
    const ranchoId = this.soloPropietario(quien, 'dar de alta a alguien');

    const nombre = texto(cuerpo?.nombre);
    const correo = texto(cuerpo?.correo).toLowerCase();
    const rol = texto(cuerpo?.rol);
    const tipoId = texto(cuerpo?.tipo_colaborador_id) || null;

    // Criterio 1: nombre, correo, rol y, si es colaborador, el tipo.
    const faltantes: string[] = [];
    if (!nombre) faltantes.push('nombre');
    if (!correo) faltantes.push('correo');
    if (!rol) faltantes.push('rol');
    if (rol === 'colaborador' && !tipoId) faltantes.push('tipo de colaborador');
    if (faltantes.length > 0) {
      throw new BadRequestException(`Faltan datos obligatorios: ${enumerar(faltantes)}.`);
    }

    if (nombre.length > LARGO_NOMBRE) {
      throw new BadRequestException(`El nombre no puede pasar de ${LARGO_NOMBRE} caracteres.`);
    }
    if (correo.length > LARGO_CORREO || !FORMA_CORREO.test(correo)) {
      throw new BadRequestException('El correo no tiene un formato válido.');
    }
    if (!(ROLES_QUE_SE_DAN_DE_ALTA as readonly string[]).includes(rol)) {
      throw new BadRequestException(
        'El rol tiene que ser socio o colaborador. El propietario es uno solo y el Admin no se crea desde un rancho.',
      );
    }
    if (rol === 'socio' && tipoId) {
      throw new BadRequestException('El tipo de colaborador solo se asigna a colaboradores.');
    }
    if (tipoId && !(await this.equipo.tipoDisponible(tipoId, ranchoId))) {
      throw new BadRequestException('Ese tipo de colaborador no existe en tu rancho.');
    }

    // Criterio 3 (y regla de HU-13): un correo, un solo rancho.
    const dueno = await this.equipo.ranchoDelCorreo(correo);
    if (dueno.existe) {
      throw new ConflictException(
        dueno.ranchoId === ranchoId
          ? 'Esa persona ya es parte de tu equipo.'
          : 'Este correo ya está registrado en otro rancho. Por seguridad, cada integrante puede trabajar en un solo establecimiento.',
      );
    }

    // Criterio 2: la contraseña temporal.
    const temporal = claveTemporal();
    const id = esUuid(cuerpo?.id) ? cuerpo.id : randomUUID();

    let miembro;
    try {
      miembro = await this.equipo.crear({
        id,
        nombre,
        correo,
        rol: rol as 'socio' | 'colaborador',
        tipoColaboradorId: rol === 'colaborador' ? tipoId : null,
        contrasenaHash: await cifrarContrasena(temporal),
        ranchoId,
        autorId: quien.id,
      });
    } catch (error: any) {
      // Dos altas del mismo correo al mismo tiempo: la base es la que decide.
      if (error?.code === '23505') {
        throw new ConflictException('Ese correo ya está registrado.');
      }
      throw error;
    }

    await this.correo.enviar({
      para: correo,
      asunto: 'Te sumaron a un rancho — Sistema de Gestión de Ganado',
      cuerpo: [
        `Hola ${nombre},`,
        '',
        `${quien.nombre} te dio de alta como ${NOMBRE_ROL[rol]} en su rancho.`,
        'Entra con tu correo y la contraseña temporal de abajo. La primera vez',
        'el sistema te va a pedir que la cambies por una tuya.',
        '',
        'Si no esperabas este mensaje, puedes ignorarlo.',
      ].join('\n'),
      destacado: `Contraseña temporal: ${temporal}`,
    });

    return {
      miembro,
      mensaje: `${nombre} ya es parte del equipo. Le enviamos su contraseña temporal a ${correo}.`,
      aviso: 'Por seguridad, la contraseña no se muestra acá. Solo la recibe su dueño.',
    };
  }

  /** Criterio 4. Suspender cierra en el acto todas sus sesiones. */
  async cambiarEstado(usuarioId: string, cuerpo: any, quien: UsuarioActual) {
    const ranchoId = this.soloPropietario(quien, 'suspender o reactivar a alguien');
    const estado = texto(cuerpo?.estado);

    if (estado !== 'activo' && estado !== 'suspendido') {
      throw new BadRequestException('El estado tiene que ser activo o suspendido.');
    }

    const miembro = await this.equipo.miembro(usuarioId, ranchoId);
    if (!miembro) {
      // Mismo mensaje exista o no en otro rancho: no se revela quien es de quien.
      throw new NotFoundException('Esa persona no pertenece a tu rancho.');
    }
    if (miembro.rol === 'propietario') {
      throw new BadRequestException('El propietario no se puede suspender.');
    }

    const actualizado = await this.equipo.cambiarEstado(usuarioId, ranchoId, estado, quien.id);

    if (estado === 'suspendido') {
      // Sin esto, un suspendido con la sesion abierta seguiria usando el
      // token de refresco hasta que venciera.
      await this.sesiones.revocarTodasDeUsuario(usuarioId);
    }

    return {
      miembro: actualizado,
      mensaje:
        estado === 'suspendido'
          ? `${miembro.nombre} quedó suspendido. No puede entrar hasta que lo reactives.`
          : `${miembro.nombre} puede volver a entrar.`,
    };
  }

  private ranchoDe(quien: UsuarioActual): string {
    if (!quien.ranchoId) {
      throw new ForbiddenException('Primero hay que crear el rancho.');
    }
    return quien.ranchoId;
  }

  private soloPropietario(quien: UsuarioActual, accion: string): string {
    const ranchoId = this.ranchoDe(quien);
    if (quien.rol !== 'propietario') {
      throw new ForbiddenException(`Solo el propietario puede ${accion}.`);
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
