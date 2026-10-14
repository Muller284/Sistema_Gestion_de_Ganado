import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { POOL_BD } from '../../comun/modulo-base-datos';
import type { UsuarioActual } from '../../comun/repositorio-usuario-actual';
import { PermisosModulo } from '../../comun/permisos-modulo';
import { actuaComoPropietario } from '../../comun/permisos-rol';
import { t } from '../../comun/idioma';

/**
 * HU-21, criterio 3: "Si el propietario me habilita un módulo, ahí sí puedo
 * editar." El socio ya ve todo; lo que se guarda es en qué modulos edita.
 */
@Injectable()
export class ServicioPermisos {
  constructor(
    private readonly permisos: PermisosModulo,
    @Inject(POOL_BD) private readonly bd: Pool,
  ) {}

  async mios(quien: UsuarioActual) {
    return this.permisos.todos(quien);
  }

  async delSocio(socioId: string, quien: UsuarioActual) {
    const ranchoId = await this.socioDelRancho(socioId, quien);
    return { modulos: await this.permisos.edicionDelSocio(socioId, ranchoId) };
  }

  async guardarDelSocio(socioId: string, cuerpo: any, quien: UsuarioActual) {
    if (!actuaComoPropietario(quien)) {
      throw new ForbiddenException(t('servidor.permisos.soloPropietario'));
    }
    const ranchoId = await this.socioDelRancho(socioId, quien);

    const pedidos: unknown = cuerpo?.modulos;
    if (!Array.isArray(pedidos) || pedidos.some((m) => typeof m !== 'string')) {
      throw new BadRequestException(t('servidor.permisos.modulosInvalidos'));
    }
    const validos = await this.bd.query(
      `SELECT codigo FROM modulos WHERE eliminado_en IS NULL AND codigo = ANY($1::varchar[])`,
      [pedidos],
    );
    const modulos = [...new Set(pedidos as string[])];
    if (validos.rowCount !== modulos.length) {
      throw new BadRequestException(t('servidor.permisos.modulosInvalidos'));
    }

    await this.permisos.guardarEdicionDelSocio(socioId, modulos, quien.id);
    return {
      modulos: await this.permisos.edicionDelSocio(socioId, ranchoId),
      mensaje: t('servidor.permisos.guardados'),
    };
  }

  /** El socio tiene que ser de mi rancho (HU-03). Lo ven el propietario y los socios. */
  private async socioDelRancho(socioId: string, quien: UsuarioActual): Promise<string> {
    if (!quien.ranchoId) throw new NotFoundException(t('servidor.permisos.sinRancho'));
    if (!actuaComoPropietario(quien) && quien.rol !== 'socio') {
      throw new ForbiddenException(t('servidor.permisos.soloPropietario'));
    }
    const resultado = await this.bd.query(
      `SELECT 1 FROM usuarios
        WHERE id::text = $1 AND rancho_id = $2 AND rol = 'socio' AND eliminado_en IS NULL`,
      [socioId, quien.ranchoId],
    );
    if (!resultado.rowCount) throw new NotFoundException(t('servidor.permisos.noEsSocio'));
    return quien.ranchoId;
  }
}
