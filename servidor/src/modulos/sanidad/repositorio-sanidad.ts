import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { POOL_BD } from '../../comun/modulo-base-datos';

/**
 * HU-46 y HU-48 · Productos sanitarios y aplicaciones.
 *
 * Como todos los repositorios, cada método recibe el rancho de quien pregunta
 * y lo pone en el WHERE (HU-03). Además, las tablas de la migración 010 no
 * dejan que una aplicación apunte a un animal, un producto o un esquema de
 * otro rancho.
 */

export type TipoProducto = 'vacuna' | 'antiparasitario' | 'vitamina' | 'antibiotico' | 'otro';
export type UnidadDosis = 'ml' | 'g' | 'mg' | 'dosis';

export interface Producto {
  id: string;
  nombre: string;
  tipo: TipoProducto;
  laboratorio: string | null;
  dosis: number | null;
  unidad: UnidadDosis | null;
  /** Esquemas vigentes que lo usan: mientras haya, no se puede dar de baja. */
  esquemas: number;
  /** Veces que se aplicó. */
  aplicaciones: number;
}

export interface DatosProducto {
  nombre: string;
  clave: string;
  tipo: TipoProducto;
  laboratorio: string | null;
  dosis: number | null;
  unidad: UnidadDosis | null;
}

export interface Aplicacion {
  id: string;
  fecha: string;
  producto_id: string;
  producto_nombre: string;
  producto_tipo: TipoProducto;
  /** HU-46, criterio 4: el producto pudo darse de baja después; la aplicación lo sigue mostrando. */
  producto_dado_de_baja: boolean;
  esquema_id: string | null;
  esquema_nombre: string | null;
  numero_dosis: number | null;
  dosis: number | null;
  unidad: UnidadDosis | null;
  aplicado_por: string;
  aplicado_por_nombre: string | null;
  observacion: string | null;
  creado_en: string;
  registrado_por: string | null;
}

export interface DatosAplicacion {
  animal_id: string;
  producto_id: string;
  esquema_id: string | null;
  numero_dosis: number | null;
  fecha: string;
  dosis: number | null;
  aplicado_por: string;
  observacion: string | null;
}

/** Lo que se elige en el formulario de una aplicación. */
export interface EsquemaElegible {
  id: string;
  nombre: string;
  producto_id: string;
  dosis: number;
  refuerzo_dias: number | null;
}

export interface Integrante {
  id: string;
  nombre: string;
}

const COLUMNAS_PRODUCTO = `
  p.id, p.nombre, p.tipo, p.laboratorio, p.dosis::float AS dosis, p.unidad,
  (SELECT COUNT(*)::int FROM esquemas_vacunacion e
    WHERE e.producto_id = p.id AND e.eliminado_en IS NULL) AS esquemas,
  (SELECT COUNT(*)::int FROM aplicaciones_sanitarias a
    WHERE a.producto_id = p.id AND a.eliminado_en IS NULL) AS aplicaciones`;

@Injectable()
export class RepositorioSanidad {
  constructor(@Inject(POOL_BD) private readonly bd: Pool) {}

  // ---------------------------------------------------------------- productos

  async productos(ranchoId: string): Promise<Producto[]> {
    const resultado = await this.bd.query(
      `SELECT ${COLUMNAS_PRODUCTO}
         FROM productos_sanitarios p
        WHERE p.rancho_id = $1 AND p.eliminado_en IS NULL
        ORDER BY LOWER(p.nombre)`,
      [ranchoId],
    );
    return resultado.rows;
  }

  async producto(id: string, ranchoId: string): Promise<Producto | null> {
    const resultado = await this.bd.query(
      `SELECT ${COLUMNAS_PRODUCTO}
         FROM productos_sanitarios p
        WHERE p.id::text = $1 AND p.rancho_id = $2 AND p.eliminado_en IS NULL`,
      [id, ranchoId],
    );
    return resultado.rows[0] ?? null;
  }

  /** El nombre no se repite entre los vigentes del rancho (sin mayúsculas ni acentos). */
  async claveOcupada(clave: string, ranchoId: string, salvoId: string | null): Promise<boolean> {
    const resultado = await this.bd.query(
      `SELECT 1 FROM productos_sanitarios
        WHERE rancho_id = $1 AND eliminado_en IS NULL AND clave = $2
          AND ($3::uuid IS NULL OR id <> $3::uuid)`,
      [ranchoId, clave, salvoId],
    );
    return (resultado.rowCount ?? 0) > 0;
  }

  async crearProducto(id: string, ranchoId: string, datos: DatosProducto, autorId: string): Promise<void> {
    await this.bd.query(
      `INSERT INTO productos_sanitarios
              (id, rancho_id, nombre, clave, tipo, laboratorio, dosis, unidad, creado_por, modificado_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)`,
      [id, ranchoId, datos.nombre, datos.clave, datos.tipo, datos.laboratorio, datos.dosis, datos.unidad, autorId],
    );
  }

  async actualizarProducto(id: string, ranchoId: string, datos: DatosProducto, autorId: string): Promise<void> {
    await this.bd.query(
      `UPDATE productos_sanitarios
          SET nombre = $3, clave = $4, tipo = $5, laboratorio = $6, dosis = $7, unidad = $8, modificado_por = $9
        WHERE id = $1 AND rancho_id = $2 AND eliminado_en IS NULL`,
      [id, ranchoId, datos.nombre, datos.clave, datos.tipo, datos.laboratorio, datos.dosis, datos.unidad, autorId],
    );
  }

  /** Baja lógica: las aplicaciones que lo usaron lo siguen mostrando. */
  async darDeBajaProducto(id: string, ranchoId: string, autorId: string): Promise<void> {
    await this.bd.query(
      `UPDATE productos_sanitarios SET eliminado_en = CURRENT_TIMESTAMP, modificado_por = $3
        WHERE id = $1 AND rancho_id = $2 AND eliminado_en IS NULL`,
      [id, ranchoId, autorId],
    );
  }

  // ------------------------------------------------------------- aplicaciones

  /** El animal del rancho, aunque esté dado de baja: así se puede decir por qué no. */
  async animal(id: string, ranchoId: string) {
    const resultado = await this.bd.query(
      `SELECT id, identificador, fecha_nacimiento::text AS fecha_nacimiento, eliminado_en
         FROM animales WHERE id::text = $1 AND rancho_id = $2`,
      [id, ranchoId],
    );
    return resultado.rows[0] ?? null;
  }

  /** Hoy en la zona horaria del país del rancho, como el calendario (HU-50). */
  async hoy(ranchoId: string): Promise<string> {
    const resultado = await this.bd.query(
      `SELECT (CURRENT_TIMESTAMP AT TIME ZONE COALESCE(pa.zona_horaria, 'UTC'))::date::text AS hoy
         FROM ranchos r LEFT JOIN paises pa ON pa.codigo = r.pais_codigo
        WHERE r.id = $1`,
      [ranchoId],
    );
    return resultado.rows[0]?.hoy ?? new Date().toISOString().slice(0, 10);
  }

  async esquemasElegibles(ranchoId: string): Promise<EsquemaElegible[]> {
    const resultado = await this.bd.query(
      `SELECT id, nombre, producto_id, dosis, refuerzo_dias FROM esquemas_vacunacion
        WHERE rancho_id = $1 AND eliminado_en IS NULL
        ORDER BY LOWER(nombre)`,
      [ranchoId],
    );
    return resultado.rows;
  }

  async esquema(id: string, ranchoId: string): Promise<EsquemaElegible | null> {
    const resultado = await this.bd.query(
      `SELECT id, nombre, producto_id, dosis, refuerzo_dias FROM esquemas_vacunacion
        WHERE id::text = $1 AND rancho_id = $2 AND eliminado_en IS NULL`,
      [id, ranchoId],
    );
    return resultado.rows[0] ?? null;
  }

  /** Quienes pueden haber aplicado algo: las personas activas del rancho. */
  async integrantes(ranchoId: string): Promise<Integrante[]> {
    const resultado = await this.bd.query(
      `SELECT id, nombre FROM usuarios
        WHERE rancho_id = $1 AND eliminado_en IS NULL AND estado = 'activo'
        ORDER BY LOWER(nombre)`,
      [ranchoId],
    );
    return resultado.rows;
  }

  async aplicaciones(animalId: string, ranchoId: string): Promise<Aplicacion[]> {
    const resultado = await this.bd.query(
      `SELECT a.id, a.fecha::text AS fecha,
              a.producto_id, p.nombre AS producto_nombre, p.tipo AS producto_tipo,
              p.eliminado_en IS NOT NULL AS producto_dado_de_baja,
              a.esquema_id, e.nombre AS esquema_nombre, a.numero_dosis,
              a.dosis::float AS dosis, p.unidad,
              a.aplicado_por, ap.nombre AS aplicado_por_nombre,
              a.observacion, a.creado_en, r.nombre AS registrado_por
         FROM aplicaciones_sanitarias a
         JOIN productos_sanitarios p ON p.id = a.producto_id
         LEFT JOIN esquemas_vacunacion e ON e.id = a.esquema_id
         LEFT JOIN usuarios ap ON ap.id = a.aplicado_por
         LEFT JOIN usuarios r ON r.id = a.creado_por
        WHERE a.animal_id::text = $1 AND a.rancho_id = $2 AND a.eliminado_en IS NULL
        ORDER BY a.fecha DESC, a.creado_en DESC`,
      [animalId, ranchoId],
    );
    return resultado.rows;
  }

  async crearAplicacion(id: string, ranchoId: string, datos: DatosAplicacion, autorId: string): Promise<void> {
    await this.bd.query(
      `INSERT INTO aplicaciones_sanitarias
              (id, rancho_id, animal_id, producto_id, esquema_id, numero_dosis, fecha, dosis,
               aplicado_por, observacion, creado_por, modificado_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11)`,
      [
        id,
        ranchoId,
        datos.animal_id,
        datos.producto_id,
        datos.esquema_id,
        datos.numero_dosis,
        datos.fecha,
        datos.dosis,
        datos.aplicado_por,
        datos.observacion,
        autorId,
      ],
    );
  }
}
