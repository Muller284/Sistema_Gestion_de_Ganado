import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { cifrarContrasena, claveTemporal } from '../../comun/contrasenas';
import type { UsuarioActual } from '../../comun/repositorio-usuario-actual';
import { ServicioCorreo } from '../../comun/servicio-correo';
import { RepositorioSesion } from '../usuarios/repositorio-sesion';
import { RepositorioEquipo } from './repositorio-equipo';
import { actuaComoPropietario } from '../../comun/permisos-rol';
import { enumerarEn, t } from '../../comun/idioma';

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

/** Claves del nombre de cada rol en el correo de alta. */
const NOMBRE_ROL: Record<string, string> = {
  socio: 'correos.alta.roles.socio',
  colaborador: 'correos.alta.roles.colaborador',
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
    if (quien.rol !== 'socio' && !actuaComoPropietario(quien)) {
      throw new ForbiddenException(t('servidor.equipo.soloVen'));
    }
    return this.equipo.listar(ranchoId);
  }

  async alta(cuerpo: any, quien: UsuarioActual) {
    const ranchoId = this.soloPropietario(quien, 'servidor.equipo.acciones.alta');

    const nombre = texto(cuerpo?.nombre);
    const correo = texto(cuerpo?.correo).toLowerCase();
    const rol = texto(cuerpo?.rol);
    const tipoId = texto(cuerpo?.tipo_colaborador_id) || null;

    // Criterio 1: nombre, correo, rol y, si es colaborador, el tipo.
    const faltantes: string[] = [];
    if (!nombre) faltantes.push(t('servidor.datos.campos.nombre'));
    if (!correo) faltantes.push(t('servidor.datos.campos.correo'));
    if (!rol) faltantes.push(t('servidor.datos.campos.rol'));
    if (rol === 'colaborador' && !tipoId) faltantes.push(t('servidor.datos.campos.tipoColaborador'));
    if (faltantes.length > 0) {
      throw new BadRequestException(
        t('servidor.datos.faltan', { faltantes: enumerarEn(faltantes) }),
      );
    }

    if (nombre.length > LARGO_NOMBRE) {
      throw new BadRequestException(t('servidor.perfil.nombreLargo', { n: LARGO_NOMBRE }));
    }
    if (correo.length > LARGO_CORREO || !FORMA_CORREO.test(correo)) {
      throw new BadRequestException(t('servidor.datos.correoInvalido'));
    }
    if (!(ROLES_QUE_SE_DAN_DE_ALTA as readonly string[]).includes(rol)) {
      throw new BadRequestException(t('servidor.equipo.rolInvalido'));
    }
    if (rol === 'socio' && tipoId) {
      throw new BadRequestException(t('servidor.equipo.tipoSoloColaboradores'));
    }
    if (tipoId && !(await this.equipo.tipoDisponible(tipoId, ranchoId))) {
      throw new BadRequestException(t('servidor.datos.tipoNoExiste'));
    }

    // Criterio 3 (y regla de HU-13): un correo, un solo rancho.
    const dueno = await this.equipo.ranchoDelCorreo(correo);
    if (dueno.existe) {
      throw new ConflictException(
        dueno.ranchoId === ranchoId
          ? t('servidor.equipo.yaEsDelEquipo')
          : t('servidor.datos.correoEnOtroRancho'),
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
        throw new ConflictException(t('servidor.equipo.correoRegistrado'));
      }
      throw error;
    }

    await this.correo.enviar({
      para: correo,
      asunto: t('correos.alta.asunto'),
      cuerpo: t('correos.alta.cuerpo', {
        nombre,
        autor: quien.nombre,
        rol: t(NOMBRE_ROL[rol]),
      }),
      destacado: t('correos.alta.destacado', { clave: temporal }),
    });

    return {
      miembro,
      mensaje: t('servidor.equipo.alta', { nombre, correo }),
      aviso: t('servidor.datos.contrasenaOculta'),
    };
  }

  /** Criterio 4. Suspender cierra en el acto todas sus sesiones. */
  async cambiarEstado(usuarioId: string, cuerpo: any, quien: UsuarioActual) {
    const ranchoId = this.soloPropietario(quien, 'servidor.equipo.acciones.estado');
    const estado = texto(cuerpo?.estado);

    if (estado !== 'activo' && estado !== 'suspendido') {
      throw new BadRequestException(t('servidor.equipo.estadoInvalido'));
    }

    const miembro = await this.equipo.miembro(usuarioId, ranchoId);
    if (!miembro) {
      // Mismo mensaje exista o no en otro rancho: no se revela quien es de quien.
      throw new NotFoundException(t('servidor.datos.noEsDeTuRancho'));
    }
    if (miembro.rol === 'propietario') {
      throw new BadRequestException(t('servidor.equipo.propietarioNoSeSuspende'));
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
          ? t('servidor.equipo.suspendido', { nombre: miembro.nombre })
          : t('servidor.equipo.reactivado', { nombre: miembro.nombre }),
    };
  }

  private ranchoDe(quien: UsuarioActual): string {
    if (!quien.ranchoId) {
      throw new ForbiddenException(t('servidor.datos.primeroElRancho'));
    }
    return quien.ranchoId;
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
