import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ServicioRancho } from './servicio-rancho';
import { RepositorioUsuarioActual } from '../../comun/repositorio-usuario-actual';

/**
 * Endpoints de HU-15, Creacion del rancho.
 *
 *   POST   /ranchos       crear
 *   GET    /ranchos       listar (cero o un rancho: una cuenta maneja uno solo)
 *   GET    /ranchos/mio   el rancho del usuario, o null si todavia no lo creo
 *   GET    /ranchos/:id   ver
 *   PATCH  /ranchos/:id   editar
 *   DELETE /ranchos/:id   baja logica (llena eliminado_en, no borra la fila)
 *
 * El usuario se indica por ahora con la cabecera x-usuario-id.
 * Ver el comentario de repositorio-usuario-actual.ts.
 */
@Controller('ranchos')
export class ControladorRancho {
  constructor(
    private readonly servicio: ServicioRancho,
    private readonly usuarios: RepositorioUsuarioActual,
  ) {}

  @Post()
  async crear(@Body() cuerpo: any, @Headers('x-usuario-id') usuarioId?: string) {
    const usuario = await this.usuarios.resolver(usuarioId);
    return this.servicio.crear(cuerpo, usuario);
  }

  @Get()
  async listar(@Headers('x-usuario-id') usuarioId?: string) {
    const usuario = await this.usuarios.resolver(usuarioId);
    return this.servicio.listar(usuario);
  }

  @Get('mio')
  async mio(@Headers('x-usuario-id') usuarioId?: string) {
    const usuario = await this.usuarios.resolver(usuarioId);
    const rancho = await this.servicio.miRancho(usuario);
    return {
      usuario: { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol },
      tieneRancho: rancho !== null,
      rancho,
    };
  }

  @Get(':id')
  async obtener(@Param('id') id: string, @Headers('x-usuario-id') usuarioId?: string) {
    const usuario = await this.usuarios.resolver(usuarioId);
    return this.servicio.obtener(id, usuario);
  }

  @Patch(':id')
  async actualizar(
    @Param('id') id: string,
    @Body() cuerpo: any,
    @Headers('x-usuario-id') usuarioId?: string,
  ) {
    const usuario = await this.usuarios.resolver(usuarioId);
    return this.servicio.actualizar(id, cuerpo, usuario);
  }

  @Delete(':id')
  async darDeBaja(@Param('id') id: string, @Headers('x-usuario-id') usuarioId?: string) {
    const usuario = await this.usuarios.resolver(usuarioId);
    const rancho = await this.servicio.darDeBaja(id, usuario);
    return { mensaje: 'Rancho dado de baja.', rancho };
  }
}
