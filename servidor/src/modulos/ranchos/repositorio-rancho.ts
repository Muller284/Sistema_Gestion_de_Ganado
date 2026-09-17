import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { POOL_BD } from '../../comun/modulo-base-datos';

/**
 * Capa de acceso a datos de la tabla ranchos (HU-15).
 *
 * POR QUE ESTA CLASE NO HEREDA DE RepositorioBase
 * -----------------------------------------------
 * RepositorioBase (HU-03) exige un rancho_id y lo agrega a toda consulta.
 * La tabla ranchos no tiene rancho_id: tiene id, porque el rancho ES la raiz
 * del aislamiento, no un dato aislado dentro de un rancho. Pasarla por
 * RepositorioBase da el error "column rancho_id does not exist".
 *
 * El aislamiento aca se resuelve de otra forma, y es igual de estricto: todo
 * metodo que lee o modifica un rancho recibe el identificador del rancho al
 * que pertenece el usuario, y compara contra la columna id. Un usuario no
 * puede leer ni tocar un rancho que no sea el suyo.
 *
 * Ninguna consulta a la base se escribe fuera de esta clase.
 */
export interface DatosRancho {
  nombre: string;
  departamento: string;
  localidad: string;
  superficie: number;
  tipo_produccion: string;
  pais_codigo: string;
  latitud?: number | null;
  longitud?: number | null;
}

const COLUMNAS = `id, nombre, departamento, localidad, latitud, longitud,
                  superficie, tipo_produccion, pais_codigo, propietario_id,
                  creado_en, modificado_en, creado_por, modificado_por`;

@Injectable()
export class RepositorioRancho {
  constructor(@Inject(POOL_BD) private readonly bd: Pool) {}

  /** Crea el rancho. El identificador lo genera el cliente (convencion del equipo). */
  async crear(
    id: string,
    datos: DatosRancho,
    propietarioId: string,
  ): Promise<any> {
    const resultado = await this.bd.query(
      `INSERT INTO ranchos
         (id, nombre, departamento, localidad, latitud, longitud, superficie,
          tipo_produccion, pais_codigo, propietario_id, creado_por, modificado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$11)
       RETURNING ${COLUMNAS}`,
      [
        id,
        datos.nombre,
        datos.departamento,
        datos.localidad,
        datos.latitud ?? null,
        datos.longitud ?? null,
        datos.superficie,
        datos.tipo_produccion,
        datos.pais_codigo,
        propietarioId,
        propietarioId,
      ],
    );
    return resultado.rows[0];
  }

  /** Devuelve el rancho solo si es el del usuario. Los dados de baja no aparecen. */
  async obtenerPorId(id: string, ranchoDelUsuario: string): Promise<any | null> {
    const resultado = await this.bd.query(
      `SELECT ${COLUMNAS} FROM ranchos
        WHERE id = $1 AND id = $2 AND eliminado_en IS NULL`,
      [id, ranchoDelUsuario],
    );
    return resultado.rows[0] ?? null;
  }

  /** Una cuenta maneja un solo rancho, asi que esto devuelve cero o un elemento. */
  async listar(ranchoDelUsuario: string | null): Promise<any[]> {
    if (!ranchoDelUsuario) return [];
    const resultado = await this.bd.query(
      `SELECT ${COLUMNAS} FROM ranchos
        WHERE id = $1 AND eliminado_en IS NULL
        ORDER BY nombre`,
      [ranchoDelUsuario],
    );
    return resultado.rows;
  }

  async actualizar(
    id: string,
    ranchoDelUsuario: string,
    datos: Partial<DatosRancho>,
    usuarioId: string,
  ): Promise<any | null> {
    const permitidas = [
      'nombre',
      'departamento',
      'localidad',
      'latitud',
      'longitud',
      'superficie',
      'tipo_produccion',
      'pais_codigo',
    ];
    const asignaciones: string[] = [];
    const valores: any[] = [];

    for (const columna of permitidas) {
      if (columna in datos) {
        valores.push((datos as any)[columna]);
        asignaciones.push(`${columna} = $${valores.length}`);
      }
    }
    if (asignaciones.length === 0) {
      return this.obtenerPorId(id, ranchoDelUsuario);
    }

    valores.push(usuarioId);
    asignaciones.push(`modificado_por = $${valores.length}`);
    valores.push(id);
    valores.push(ranchoDelUsuario);

    const resultado = await this.bd.query(
      `UPDATE ranchos SET ${asignaciones.join(', ')}
        WHERE id = $${valores.length - 1}
          AND id = $${valores.length}
          AND eliminado_en IS NULL
       RETURNING ${COLUMNAS}`,
      valores,
    );
    return resultado.rows[0] ?? null;
  }

  /**
   * Baja logica. Nunca se ejecuta DELETE: se llena eliminado_en.
   * Tambien se desvincula a los usuarios, porque un rancho dado de baja
   * no puede seguir siendo el rancho de nadie.
   */
  async darDeBaja(
    id: string,
    ranchoDelUsuario: string,
    usuarioId: string,
  ): Promise<any | null> {
    const cliente = await this.bd.connect();
    try {
      await cliente.query('BEGIN');
      const resultado = await cliente.query(
        `UPDATE ranchos
            SET eliminado_en = CURRENT_TIMESTAMP, modificado_por = $3
          WHERE id = $1 AND id = $2 AND eliminado_en IS NULL
        RETURNING ${COLUMNAS}, eliminado_en`,
        [id, ranchoDelUsuario, usuarioId],
      );
      if (resultado.rowCount === 0) {
        await cliente.query('ROLLBACK');
        return null;
      }
      await cliente.query(
        `UPDATE usuarios SET rancho_id = NULL, modificado_por = $2
          WHERE rancho_id = $1`,
        [id, usuarioId],
      );
      await cliente.query('COMMIT');
      return resultado.rows[0];
    } catch (error) {
      await cliente.query('ROLLBACK');
      throw error;
    } finally {
      cliente.release();
    }
  }

  /** Deja al propietario vinculado a su rancho recien creado (HU-06 -> HU-15). */
  async vincularPropietario(
    propietarioId: string,
    ranchoId: string,
  ): Promise<void> {
    await this.bd.query(
      `UPDATE usuarios SET rancho_id = $2, modificado_por = $1 WHERE id = $1`,
      [propietarioId, ranchoId],
    );
  }

  /** Cuarto criterio de HU-15: una cuenta maneja un solo rancho. */
  async propietarioYaTieneRancho(propietarioId: string): Promise<boolean> {
    const resultado = await this.bd.query(
      `SELECT 1 FROM ranchos WHERE propietario_id = $1 AND eliminado_en IS NULL`,
      [propietarioId],
    );
    return (resultado.rowCount ?? 0) > 0;
  }

  async existePais(codigo: string): Promise<boolean> {
    const resultado = await this.bd.query(
      `SELECT 1 FROM paises WHERE codigo = $1 AND eliminado_en IS NULL`,
      [codigo],
    );
    return (resultado.rowCount ?? 0) > 0;
  }
}
