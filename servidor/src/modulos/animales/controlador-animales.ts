import { Controller, Get, Post, Patch, Delete, Body, Param, Req, HttpException, HttpStatus } from '@nestjs/common';
import { ServicioAnimales } from './servicio-animales';
import { DataSource } from 'typeorm';

@Controller('animales')
export class ControladorAnimales {
  constructor(private servicio: ServicioAnimales, private dataSource: DataSource) {}

  @Post()
  async registrar(@Req() req: any, @Body() datos: any) {
    try {
      const usuarioId = req.usuario?.id || req.headers['x-usuario-id'];
      if (!usuarioId) {
        throw new HttpException({ mensaje: 'No autorizado: Sesión requerida (HU-07, HU-12).' }, HttpStatus.UNAUTHORIZED);
      }

      const usuarioDb = await this.dataSource.query(
        `SELECT u.rol, u.rancho_id, u.permisos, u.tipo_colaborador_id,
                v.puede_editar AS tipo_puede_editar
           FROM usuarios u
           LEFT JOIN permisos_tipo_vigentes v 
             ON v.tipo_colaborador_id = u.tipo_colaborador_id 
            AND v.rancho_id = u.rancho_id 
            AND v.modulo_codigo = 'animales'
          WHERE u.id = $1 AND u.eliminado_en IS NULL`,
        [usuarioId]
      );

      if (!usuarioDb || usuarioDb.length === 0) {
        throw new HttpException({ mensaje: 'Usuario no encontrado en la base de datos.' }, HttpStatus.FORBIDDEN);
      }

      const { rol, rancho_id: ranchoId, permisos, tipo_puede_editar } = usuarioDb[0];

      if (!ranchoId) {
        throw new HttpException(
          { mensaje: 'Acción rechazada: El usuario no tiene un rancho asignado (HU-03).' },
          HttpStatus.FORBIDDEN,
        );
      }

      let puedeEditarAnimales = false;
      if (rol === 'propietario' || rol === 'admin' || rol === 'admin_plataforma') {
        puedeEditarAnimales = true;
      } else if (tipo_puede_editar === true) {
        puedeEditarAnimales = true;
      } else if (permisos) {
        try {
          const permisosObj = typeof permisos === 'string' ? JSON.parse(permisos) : permisos;
          puedeEditarAnimales = Boolean(permisosObj?.animales?.editar);
        } catch {
          puedeEditarAnimales = false;
        }
      }

      if (!puedeEditarAnimales) {
        throw new HttpException(
          { mensaje: 'Acción rechazada: Usuario con permisos de solo consulta (HU-18).' },
          HttpStatus.FORBIDDEN,
        );
      }

      // Capturamos el identificador de cualquiera de las variantes enviadas por el formulario
      const identificadorValor = datos.identificador || datos.caravana || datos.numero;
      if (!identificadorValor) {
        throw new HttpException({ mensaje: 'El identificador es obligatorio.' }, HttpStatus.BAD_REQUEST);
      }

      // Se incluye identificador y fecha_nacimiento en el registro
      const animal = await this.dataSource.query(
        `INSERT INTO animales (rancho_id, identificador, nombre, raza, sexo, categoria, corral_asignado, peso_inicial, fecha_nacimiento, creado_por) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
        [
          ranchoId, 
          identificadorValor,
          datos.nombre, 
          datos.raza, 
          datos.sexo, 
          datos.categoria, 
          datos.corralAsignado || datos.corral_asignado || datos.corral, 
          datos.pesoInicial || datos.peso_inicial || datos.peso, 
          datos.fechaNacimiento || datos.fecha_nacimiento || null, 
          usuarioId
        ]
      );

      return { animal: animal[0], mensaje: 'Animal registrado con éxito.' };
    } catch (error: any) {
      console.error('Error al registrar animal:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        { mensaje: error.message || 'Error interno al registrar el animal' },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Patch(':id')
  async actualizar(@Req() req: any, @Param('id') id: string, @Body() datos: any) {
    try {
      const usuarioId = req.usuario?.id || req.headers['x-usuario-id'];
      if (!usuarioId) {
        throw new HttpException({ mensaje: 'No autorizado.' }, HttpStatus.UNAUTHORIZED);
      }

      const usuarioDb = await this.dataSource.query(
        `SELECT u.rol, u.rancho_id, u.permisos,
                v.puede_editar AS tipo_puede_editar
           FROM usuarios u
           LEFT JOIN permisos_tipo_vigentes v 
             ON v.tipo_colaborador_id = u.tipo_colaborador_id 
            AND v.rancho_id = u.rancho_id 
            AND v.modulo_codigo = 'animales'
          WHERE u.id = $1 AND u.eliminado_en IS NULL`,
        [usuarioId]
      );

      if (!usuarioDb || usuarioDb.length === 0) {
        throw new HttpException({ mensaje: 'No autorizado.' }, HttpStatus.UNAUTHORIZED);
      }

      const { rol, rancho_id: ranchoId, permisos, tipo_puede_editar } = usuarioDb[0];
      
      if (!ranchoId) {
        throw new HttpException({ mensaje: 'Rancho no asignado (HU-03).' }, HttpStatus.FORBIDDEN);
      }

      let puedeEditar = rol === 'propietario' || rol === 'admin' || rol === 'admin_plataforma';
      
      if (!puedeEditar && tipo_puede_editar === true) {
        puedeEditar = true;
      } else if (!puedeEditar && permisos) {
        try {
          const p = typeof permisos === 'string' ? JSON.parse(permisos) : permisos;
          puedeEditar = Boolean(p?.animales?.editar);
        } catch {
          puedeEditar = false;
        }
      }

      if (!puedeEditar) {
        throw new HttpException({ mensaje: 'Acción rechazada: Solo lectura (HU-18).' }, HttpStatus.FORBIDDEN);
      }

      // Se incluye fecha_nacimiento en la actualización real (PATCH)
      await this.dataSource.query(
        `UPDATE animales 
            SET nombre = COALESCE($1, nombre),
                raza = COALESCE($2, raza),
                sexo = COALESCE($3, sexo),
                categoria = COALESCE($4, categoria),
                corral_asignado = COALESCE($5, corral_asignado),
                peso_inicial = COALESCE($6, peso_inicial),
                fecha_nacimiento = COALESCE($7, fecha_nacimiento),
                modificado_en = CURRENT_TIMESTAMP,
                modificado_por = $8
          WHERE id = $9 AND rancho_id = $10 AND (estado IS NULL OR estado != 'inactivo')`,
        [
          datos.nombre, 
          datos.raza, 
          datos.sexo, 
          datos.categoria, 
          datos.corralAsignado || datos.corral_asignado, 
          datos.pesoInicial || datos.peso_inicial,
          datos.fechaNacimiento || datos.fecha_nacimiento,
          usuarioId, 
          id, 
          ranchoId
        ]
      );

      return { mensaje: 'Animal actualizado correctamente.' };
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        { mensaje: error.message || 'Error al actualizar' },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete(':id')
  async eliminar(@Req() req: any, @Param('id') id: string) {
    try {
      const usuarioId = req.usuario?.id || req.headers['x-usuario-id'];
      if (!usuarioId) {
        throw new HttpException({ mensaje: 'No autorizado.' }, HttpStatus.UNAUTHORIZED);
      }

      const usuarioDb = await this.dataSource.query('SELECT rol, rancho_id FROM usuarios WHERE id = $1', [usuarioId]);
      if (!usuarioDb || usuarioDb.length === 0) {
        throw new HttpException({ mensaje: 'No autorizado.' }, HttpStatus.UNAUTHORIZED);
      }

      const { rol, rancho_id: ranchoId } = usuarioDb[0];
      if (!ranchoId) {
        throw new HttpException({ mensaje: 'Rancho no asignado (HU-03).' }, HttpStatus.FORBIDDEN);
      }

      if (rol !== 'propietario' && rol !== 'admin' && rol !== 'admin_plataforma') {
        throw new HttpException(
          { mensaje: 'Acción no autorizada. Solo el Propietario o Administrador pueden eliminar registros (HU-18).' },
          HttpStatus.FORBIDDEN,
        );
      }

      // Baja Lógica Real
      await this.dataSource.query(
        `UPDATE animales 
            SET estado = 'inactivo', 
                modificado_en = CURRENT_TIMESTAMP, 
                modificado_por = $3 
          WHERE id = $1 AND rancho_id = $2`,
        [id, ranchoId, usuarioId]
      );

      return { mensaje: 'Animal eliminado correctamente (borrado lógico aplicado).' };
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        { mensaje: error.message || 'Error al eliminar el animal' },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get()
  async listar(@Req() req: any) {
    const usuarioId = req.usuario?.id || req.headers['x-usuario-id'];
    if (!usuarioId) {
      throw new HttpException({ mensaje: 'No autorizado: Sesión requerida.' }, HttpStatus.UNAUTHORIZED);
    }

    const usuarioDb = await this.dataSource.query(
      'SELECT rancho_id FROM usuarios WHERE id = $1 AND eliminado_en IS NULL', 
      [usuarioId]
    );

    if (!usuarioDb || usuarioDb.length === 0 || !usuarioDb[0]?.rancho_id) {
      throw new HttpException({ mensaje: 'Rancho no encontrado o usuario sin rancho asignado (HU-03).' }, HttpStatus.FORBIDDEN);
    }

    const ranchoIdReal = usuarioDb[0].rancho_id;

    const animalesDb = await this.dataSource.query(
      `SELECT *, 
              COALESCE(corral, corral_asignado) AS corral, 
              COALESCE(peso, peso_inicial) AS peso 
         FROM animales 
        WHERE rancho_id = $1 AND (estado IS NULL OR estado != 'inactivo') 
        ORDER BY id DESC`,
      [ranchoIdReal]
    );

    return animalesDb;
  }
}