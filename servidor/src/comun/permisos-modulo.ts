import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { POOL_BD } from './modulo-base-datos';
import type { UsuarioActual } from './repositorio-usuario-actual';
import { actuaComoPropietario } from './permisos-rol';
import { t } from './idioma';

/**
 * Lo que puede cada persona en cada modulo, decidido en el servidor.
 *
 * HU-21 · El socio ve todo y no modifica nada, salvo en los modulos en los
 *         que el propietario lo habilito (permisos_usuario con puede_editar).
 * HU-22 · El colaborador solo entra a los modulos de su tipo
 *         (permisos_tipo_vigentes, migracion 005), mas lo que el propietario
 *         le haya dado a el en particular (permisos_usuario).
 *
 * El cliente pide GET /permisos/mios para armar el menu, pero eso es
 * comodidad: cada endpoint vuelve a preguntar con exigir(). Si la regla no
 * esta aca, no esta (ver GuardiaCuentaLista).
 *
 * HU-19 (Brian) puede usar este mismo servicio para el resto de los modulos.
 */

export type Nivel = 'ninguno' | 'ver' | 'editar';

const ORDEN: Record<Nivel, number> = { ninguno: 0, ver: 1, editar: 2 };

function mayor(a: Nivel, b: Nivel): Nivel {
  return ORDEN[a] >= ORDEN[b] ? a : b;
}

function nivelDe(puedeVer: boolean, puedeEditar: boolean): Nivel {
  if (puedeEditar) return 'editar';
  if (puedeVer) return 'ver';
  return 'ninguno';
}

@Injectable()
export class PermisosModulo {
  constructor(@Inject(POOL_BD) private readonly bd: Pool) {}

  /** Los ocho modulos con el nivel de quien pregunta. */
  async todos(quien: UsuarioActual): Promise<Record<string, Nivel>> {
    const modulos = await this.bd.query(
      `SELECT codigo FROM modulos WHERE eliminado_en IS NULL ORDER BY orden`,
    );
    const codigos: string[] = modulos.rows.map((fila) => fila.codigo);

    if (!quien.ranchoId) return Object.fromEntries(codigos.map((c) => [c, 'ninguno']));
    if (actuaComoPropietario(quien)) return Object.fromEntries(codigos.map((c) => [c, 'editar']));

    const base: Nivel = quien.rol === 'socio' ? 'ver' : 'ninguno';
    const niveles: Record<string, Nivel> = Object.fromEntries(codigos.map((c) => [c, base]));

    if (quien.rol === 'colaborador') {
      const delTipo = await this.bd.query(
        `SELECT v.modulo_codigo, v.puede_ver, v.puede_editar
           FROM usuarios u
           JOIN permisos_tipo_vigentes v
             ON v.tipo_colaborador_id = u.tipo_colaborador_id
            AND v.rancho_id = u.rancho_id
          WHERE u.id = $1 AND u.rancho_id = $2`,
        [quien.id, quien.ranchoId],
      );
      for (const fila of delTipo.rows) {
        niveles[fila.modulo_codigo] = mayor(niveles[fila.modulo_codigo] ?? 'ninguno', nivelDe(fila.puede_ver, fila.puede_editar));
      }
    }

    if (quien.rol === 'socio' || quien.rol === 'colaborador') {
      const propios = await this.bd.query(
        `SELECT modulo_codigo, puede_ver, puede_editar
           FROM permisos_usuario
          WHERE usuario_id = $1 AND eliminado_en IS NULL`,
        [quien.id],
      );
      for (const fila of propios.rows) {
        niveles[fila.modulo_codigo] = mayor(niveles[fila.modulo_codigo] ?? 'ninguno', nivelDe(fila.puede_ver, fila.puede_editar));
      }
    }

    return niveles;
  }

  async nivel(quien: UsuarioActual, modulo: string): Promise<Nivel> {
    return (await this.todos(quien))[modulo] ?? 'ninguno';
  }

  /**
   * Corta con 403 si no alcanza. El mensaje dice quien puede hacerlo
   * (HU-22, criterio 2) y lleva el motivo y el modulo para la pantalla.
   * Devuelve el rancho, que a esta altura seguro existe.
   */
  async exigir(quien: UsuarioActual, modulo: string, necesita: 'ver' | 'editar'): Promise<string> {
    if (!quien.ranchoId) {
      throw new NotFoundException(t('servidor.permisos.sinRancho'));
    }
    const tiene = await this.nivel(quien, modulo);
    if (ORDEN[tiene] >= ORDEN[necesita]) return quien.ranchoId;

    const nombre = t(`modulos.${modulo}.nombre`);
    throw new ForbiddenException({
      motivo: 'sin_permiso_modulo',
      modulo,
      necesita,
      message:
        necesita === 'ver'
          ? t('servidor.permisos.sinAcceso', { modulo: nombre })
          : quien.rol === 'socio'
            ? t('servidor.permisos.socioSoloConsulta', { modulo: nombre })
            : t('servidor.permisos.sinEdicion', { modulo: nombre }),
    });
  }

  /**
   * HU-18, criterio 3: "Ningun rol salvo el propietario y el Admin puede
   * eliminar registros". Tener edicion en un modulo no alcanza para dar de
   * baja: eso queda para el propietario y el Admin en soporte (HU-24).
   * Devuelve el rancho, como exigir().
   */
  exigirEliminar(quien: UsuarioActual, modulo: string): string {
    if (!quien.ranchoId) {
      throw new NotFoundException(t('servidor.permisos.sinRancho'));
    }
    if (!actuaComoPropietario(quien)) {
      throw new ForbiddenException({
        motivo: 'solo_propietario_elimina',
        modulo,
        message: t('servidor.permisos.soloPropietarioElimina', {
          modulo: t(`modulos.${modulo}.nombre`),
        }),
      });
    }
    return quien.ranchoId;
  }

  /**
   * HU-21, criterio 3: el propietario habilita (o quita) la edicion de un
   * modulo a un socio de su rancho. El socio ya ve todo; esto solo suma editar.
   */
  async edicionDelSocio(socioId: string, ranchoId: string): Promise<string[]> {
    const resultado = await this.bd.query(
      `SELECT p.modulo_codigo
         FROM permisos_usuario p
         JOIN usuarios u ON u.id = p.usuario_id
        WHERE p.usuario_id = $1 AND u.rancho_id = $2
          AND p.puede_editar AND p.eliminado_en IS NULL
        ORDER BY p.modulo_codigo`,
      [socioId, ranchoId],
    );
    return resultado.rows.map((fila) => fila.modulo_codigo);
  }

  async guardarEdicionDelSocio(socioId: string, modulos: string[], autorId: string): Promise<void> {
    const cliente = await this.bd.connect();
    try {
      await cliente.query('BEGIN');
      // Baja logica de lo que ya no va (HU-34), alta de lo nuevo.
      await cliente.query(
        `UPDATE permisos_usuario
            SET eliminado_en = CURRENT_TIMESTAMP, modificado_por = $3
          WHERE usuario_id = $1 AND eliminado_en IS NULL
            AND NOT (modulo_codigo = ANY($2::varchar[]))`,
        [socioId, modulos, autorId],
      );
      for (const modulo of modulos) {
        await cliente.query(
          `INSERT INTO permisos_usuario
                  (id, usuario_id, modulo_codigo, puede_ver, puede_editar, creado_por, modificado_por)
           SELECT gen_random_uuid(), $1::uuid, $2::varchar, TRUE, TRUE, $3::uuid, $3::uuid
            WHERE NOT EXISTS (
                  SELECT 1 FROM permisos_usuario
                   WHERE usuario_id = $1::uuid AND modulo_codigo = $2::varchar AND eliminado_en IS NULL)`,
          [socioId, modulo, autorId],
        );
      }
      await cliente.query('COMMIT');
    } catch (error) {
      await cliente.query('ROLLBACK');
      throw error;
    } finally {
      cliente.release();
    }
  }
}
