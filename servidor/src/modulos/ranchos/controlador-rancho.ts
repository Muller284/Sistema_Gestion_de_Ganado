import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { GuardiaCuentaLista } from '../../comun/guardia-cuenta-lista';
import { ServicioRancho } from './servicio-rancho';
import type { UsuarioActual } from '../../comun/repositorio-usuario-actual';
import { t } from '../../comun/idioma';

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
 * Quien pide lo resuelve GuardiaCuentaLista (token o x-usuario-id) y lo deja
 * en peticion.usuarioActual. Antes cada metodo lo volvia a resolver leyendo
 * solo x-usuario-id, y se ignoraba el token de sesion (HU-12). Ademas, asi el
 * Admin en soporte (HU-24) llega ya ubicado en el rancho al que entro.
 *
 * GuardiaCuentaLista bloquea todo esto mientras el correo no este confirmado
 * (HU-07) o quede pendiente el cambio de la contraseña temporal (HU-10).
 */
@UseGuards(GuardiaCuentaLista)
@Controller('ranchos')
export class ControladorRancho {
  constructor(private readonly servicio: ServicioRancho) {}

  @Post()
  async crear(@Body() cuerpo: any, @Req() peticion: any) {
    const usuario: UsuarioActual = peticion.usuarioActual;
    return this.servicio.crear(cuerpo, usuario);
  }

  @Get()
  async listar(@Req() peticion: any) {
    const usuario: UsuarioActual = peticion.usuarioActual;
    return this.servicio.listar(usuario);
  }

  @Get('mio')
  async mio(@Req() peticion: any) {
    const usuario: UsuarioActual = peticion.usuarioActual;
    const rancho = await this.servicio.miRancho(usuario);
    return {
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        rol: usuario.rol,
        // HU-24: el Admin que entro a dar soporte actua como el propietario.
        soporte: usuario.soporte !== null,
      },
      tieneRancho: rancho !== null,
      rancho,
    };
  }

  @Get(':id')
  async obtener(@Param('id') id: string, @Req() peticion: any) {
    const usuario: UsuarioActual = peticion.usuarioActual;
    return this.servicio.obtener(id, usuario);
  }

  @Patch(':id')
  async actualizar(
    @Param('id') id: string,
    @Body() cuerpo: any,
    @Req() peticion: any,
  ) {
    const usuario: UsuarioActual = peticion.usuarioActual;
    return this.servicio.actualizar(id, cuerpo, usuario);
  }

  @Delete(':id')
  async darDeBaja(@Param('id') id: string, @Req() peticion: any) {
    const usuario: UsuarioActual = peticion.usuarioActual;
    const rancho = await this.servicio.darDeBaja(id, usuario);
    return { mensaje: t('servidor.ranchos.dadoDeBaja'), rancho };
  }
}
