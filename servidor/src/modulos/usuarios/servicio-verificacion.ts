import { BadRequestException, Injectable } from '@nestjs/common';
import { RepositorioToken } from './repositorio-token';
import { RepositorioUsuario } from './repositorio-usuario';
import { ServicioCorreo } from '../../comun/servicio-correo';

/**
 * HU-07 · Verificación de correo.
 *
 * Los cuatro criterios de aceptacion:
 *   1. El sistema envia un correo con un enlace de confirmacion.
 *   2. Sin confirmar el correo no se puede usar el sistema.
 *      → Eso lo impone GuardiaCuentaLista, en comun/. Aca solo se marca la
 *        cuenta como verificada; quien bloquea es el guardia.
 *   3. Se puede pedir el reenvio del correo.
 *   4. El enlace vence a las 24 horas.
 *
 * EL ENLACE APUNTA AL CLIENTE, NO AL SERVIDOR
 * Va a  <cliente>/#/verificar?token=...  y la pantalla del cliente manda el
 * token al servidor por POST. Si el enlace apuntara directo al servidor, el
 * token quedaria escrito en los registros de acceso de todos los servidores
 * por los que pase, que es justo lo que no queremos de algo que sirve para
 * entrar a una cuenta.
 */

const HORAS_DE_VIDA = 24;

@Injectable()
export class ServicioVerificacion {
  constructor(
    private readonly tokens: RepositorioToken,
    private readonly usuarios: RepositorioUsuario,
    private readonly correo: ServicioCorreo,
  ) {}

  /**
   * Emite el token y manda el correo. Lo llama el registro (HU-06) y el
   * reenvio. Devuelve el enlace solo cuando el transporte es el de consola,
   * para poder demostrar y probar la historia; con un servidor de correo de
   * verdad devuelve null y el enlace solo existe en el correo.
   */
  async emitir(usuarioId: string, nombre: string, aCorreo: string) {
    const { token, expiraEn } = await this.tokens.emitir(
      usuarioId,
      'verificacion_correo',
      HORAS_DE_VIDA,
    );

    const enlace = `${urlDelCliente()}/#/verificar?token=${token}`;

    await this.correo.enviar({
      para: aCorreo,
      asunto: 'Confirma tu correo — Sistema de Gestión de Ganado',
      cuerpo: [
        `Hola ${nombre},`,
        '',
        'Para activar tu cuenta y empezar a usar el sistema, confirma tu correo',
        'desde este enlace. Vence en 24 horas.',
        '',
        'Si no creaste ninguna cuenta, puedes ignorar este mensaje.',
      ].join('\n'),
      destacado: enlace,
    });

    return {
      expiraEn,
      enlace: this.correo.esDeConsola ? enlace : null,
    };
  }

  /** Confirma la cuenta. El token se consume: sirve una sola vez. */
  async confirmar(token: string) {
    if (!token || typeof token !== 'string') {
      throw new BadRequestException('Falta el enlace de confirmación.');
    }

    const usuarioId = await this.tokens.consumir(token, 'verificacion_correo');

    if (!usuarioId) {
      // Se distingue vencido de inexistente para poder ofrecer el reenvio,
      // que es el tercer criterio.
      const vencido = await this.tokens.estabaVencido(token, 'verificacion_correo');
      throw new BadRequestException(
        vencido
          ? 'El enlace venció. Pide uno nuevo desde la pantalla de acceso.'
          : 'El enlace no es válido o ya se usó.',
      );
    }

    await this.usuarios.marcarCorreoVerificado(usuarioId);
    const usuario = await this.usuarios.porId(usuarioId);

    return {
      mensaje: 'Correo confirmado. Ya puedes usar el sistema.',
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        rol: usuario.rol,
        correo_verificado: usuario.correo_verificado,
      },
    };
  }

  /**
   * Tercer criterio. La respuesta es siempre la misma exista o no la cuenta:
   * si cambiara, esta pantalla serviria para averiguar quien esta registrado.
   */
  async reenviar(correoPedido: string) {
    const correo = typeof correoPedido === 'string' ? correoPedido.trim() : '';
    if (!correo) {
      throw new BadRequestException('Falta el correo.');
    }

    const respuesta = {
      mensaje:
        'Si ese correo tiene una cuenta sin confirmar, le enviamos un enlace nuevo.',
      enlace: null as string | null,
    };

    const usuario = await this.usuarios.porCorreo(correo);
    if (!usuario || usuario.correo_verificado) return respuesta;

    const emitido = await this.emitir(usuario.id, usuario.nombre, usuario.correo);
    respuesta.enlace = emitido.enlace;
    return respuesta;
  }
}

function urlDelCliente(): string {
  return (process.env.URL_CLIENTE ?? 'http://localhost:5173').replace(/\/+$/, '');
}
