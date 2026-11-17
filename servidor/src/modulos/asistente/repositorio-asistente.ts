import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Pool } from 'pg';
import { POOL_BD } from '../../comun/modulo-base-datos';

/**
 * RF-38 a RF-42 · Lo único que el asistente lee y escribe por su cuenta: los
 * datos del rancho para presentarse, la cuota del mes y el historial de
 * consultas. Los datos del ganado los lee a través de los servicios de cada
 * módulo (ver herramientas-asistente.ts), nunca con SQL propio.
 */

export interface DatosRancho {
  nombre: string;
  departamento: string | null;
  localidad: string | null;
  superficie: number | null;
  tipo_produccion: string | null;
  pais: string | null;
  unidad_peso: string | null;
  hoy: string;
}

export interface ConsultaGuardada {
  pregunta: string;
  respuesta: string;
  creado_en: string;
}

@Injectable()
export class RepositorioAsistente {
  constructor(@Inject(POOL_BD) private readonly bd: Pool) {}

  /** El rancho y su «hoy» en la zona horaria del país, como el calendario. */
  async rancho(ranchoId: string): Promise<DatosRancho | null> {
    const resultado = await this.bd.query(
      `SELECT r.nombre, r.departamento, r.localidad, r.superficie::float AS superficie,
              r.tipo_produccion, pa.nombre AS pais, pa.unidad_peso,
              to_char((CURRENT_TIMESTAMP AT TIME ZONE COALESCE(pa.zona_horaria, 'UTC'))::date, 'YYYY-MM-DD') AS hoy
         FROM ranchos r
         LEFT JOIN paises pa ON pa.codigo = r.pais_codigo
        WHERE r.id = $1 AND r.eliminado_en IS NULL`,
      [ranchoId],
    );
    return resultado.rows[0] ?? null;
  }

  /** RF-42 · Consultas respondidas a este usuario en el mes en curso. */
  async usadasEnElMes(usuarioId: string): Promise<number> {
    const resultado = await this.bd.query(
      `SELECT COUNT(*)::int AS n
         FROM consultas_asistente
        WHERE usuario_id = $1
          AND eliminado_en IS NULL
          AND creado_en >= date_trunc('month', CURRENT_TIMESTAMP)`,
      [usuarioId],
    );
    return resultado.rows[0].n;
  }

  async guardar(datos: {
    ranchoId: string;
    usuarioId: string;
    pregunta: string;
    respuesta: string;
    herramientas: string[];
  }): Promise<string> {
    const id = randomUUID();
    await this.bd.query(
      `INSERT INTO consultas_asistente
         (id, rancho_id, usuario_id, pregunta, respuesta, herramientas, creado_por, modificado_por)
       VALUES ($1, $2, $3, $4, $5, $6, $3, $3)`,
      [id, datos.ranchoId, datos.usuarioId, datos.pregunta, datos.respuesta, datos.herramientas],
    );
    return id;
  }

  /** La respuesta de una consulta, solo si es de este usuario en este rancho. */
  async respuestaDe(id: string, usuarioId: string, ranchoId: string): Promise<string | null> {
    const resultado = await this.bd.query(
      `SELECT respuesta
         FROM consultas_asistente
        WHERE id = $1 AND usuario_id = $2 AND rancho_id = $3 AND eliminado_en IS NULL`,
      [id, usuarioId, ranchoId],
    );
    return resultado.rows[0]?.respuesta ?? null;
  }

  /** Las últimas consultas del usuario en este rancho, de la más vieja a la más nueva. */
  async ultimas(usuarioId: string, ranchoId: string, cuantas: number): Promise<ConsultaGuardada[]> {
    const resultado = await this.bd.query(
      `SELECT pregunta, respuesta, creado_en
         FROM (SELECT pregunta, respuesta, creado_en
                 FROM consultas_asistente
                WHERE usuario_id = $1 AND rancho_id = $2 AND eliminado_en IS NULL
                ORDER BY creado_en DESC
                LIMIT $3) ultimas
        ORDER BY creado_en`,
      [usuarioId, ranchoId, cuantas],
    );
    return resultado.rows;
  }
}
