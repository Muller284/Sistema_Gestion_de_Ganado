import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { RepositorioUsuario } from './repositorio-usuario';
import { RepositorioToken } from './repositorio-token';
import { ServicioCorreo } from '../../comun/servicio-correo';
import {
  cifrarContrasena,
  claveTemporal,
  revisarContrasena,
  verificarContrasena,
} from '../../comun/contrasenas';
import type { UsuarioActual } from '../../comun/repositorio-usuario-actual';
import { actuaComoPropietario } from '../../comun/permisos-rol';
import { enIdioma, enumerarEn, t } from '../../comun/idioma';

/**
 * HU-10 · Cambio obligatorio de contraseña.
 *
 * Los tres criterios de aceptacion:
 *   1. No puedo llegar a ninguna otra pantalla antes de cambiarla.
 *      → Lo impone GuardiaCuentaLista, en comun/. Aca esta el cambio en si.
 *   2. La contraseña nueva no puede ser igual a la temporal.
 *   3. El propietario nunca puede ver la contraseña, solo forzar un
 *      restablecimiento.
 *      → restablecer() genera la clave, se la manda por correo al usuario y
 *        NO la devuelve en la respuesta. El propietario ve "listo", nada mas.
 */

@Injectable()
export class ServicioContrasena {
  constructor(
    private readonly usuarios: RepositorioUsuario,
    private readonly correo: ServicioCorreo,
    private readonly tokens: RepositorioToken,
  ) {}

  /** El usuario cambia su propia contraseña. Es lo que desbloquea la cuenta. */
  async cambiarLaMia(cuerpo: any, quien: UsuarioActual) {
    const actual = typeof cuerpo?.contrasena_actual === 'string' ? cuerpo.contrasena_actual : '';
    const nueva = typeof cuerpo?.contrasena_nueva === 'string' ? cuerpo.contrasena_nueva : '';

    if (!actual || !nueva) {
      throw new BadRequestException(t('servidor.contrasena.faltanAmbas'));
    }

    const usuario = await this.usuarios.porId(quien.id);
    if (!usuario) throw new NotFoundException(t('servidor.datos.usuarioNoExiste'));

    // Se pide la actual aunque el usuario ya este identificado: es lo que
    // impide que alguien que encontro una sesion abierta cambie la clave.
    if (!(await verificarContrasena(actual, usuario.contrasena_hash))) {
      throw new UnauthorizedException(t('servidor.contrasena.actualIncorrecta'));
    }

    // Segundo criterio.
    if (actual === nueva) {
      throw new BadRequestException(
        usuario.debe_cambiar_contrasena
          ? t('servidor.contrasena.igualTemporal')
          : t('servidor.contrasena.igualActual'),
      );
    }

    const faltas = revisarContrasena(nueva);
    if (faltas.length > 0) {
      throw new BadRequestException(
        t('comun.contrasena.necesita', { faltas: enumerarEn(faltas) }),
      );
    }

    await this.usuarios.cambiarContrasena(
      quien.id,
      await cifrarContrasena(nueva),
      quien.id,
    );

    return {
      mensaje: usuario.debe_cambiar_contrasena
        ? t('servidor.contrasena.actualizadaYaPuedes')
        : t('servidor.contrasena.actualizada'),
    };
  }

  /**
   * Tercer criterio. El propietario fuerza un restablecimiento.
   *
   * La clave generada NO vuelve en la respuesta: se le manda por correo al
   * dueño de la cuenta. El propietario solo se entera de que se hizo. Eso es
   * lo que da valor al registro de quien cargo cada dato (HU-23): si el
   * propietario pudiera ver la clave de su colaborador, el nombre en
   * "creado por" no probaria nada.
   */
  async restablecer(usuarioId: string, quien: UsuarioActual) {
    if (!actuaComoPropietario(quien)) {
      throw new ForbiddenException(t('servidor.contrasena.soloPropietarioRestablece'));
    }

    const usuario = await this.usuarios.porId(usuarioId);
    if (!usuario || usuario.rancho_id !== quien.ranchoId) {
      // Mismo mensaje que si no existiera: un propietario no tiene por que
      // poder averiguar quien pertenece a otro rancho.
      throw new NotFoundException(t('servidor.contrasena.usuarioAjeno'));
    }
    if (usuario.id === quien.id) {
      throw new BadRequestException(t('servidor.contrasena.usaElCambio'));
    }

    const temporal = claveTemporal();
    await this.usuarios.ponerContrasenaTemporal(
      usuario.id,
      await cifrarContrasena(temporal),
      quien.id,
    );

    // El correo va en el idioma de quien lo recibe, no en el del propietario.
    const idiomaDelUsuario = await this.usuarios.idiomaDe(usuario.id);
    await enIdioma(idiomaDelUsuario, () =>
      this.correo.enviar({
        para: usuario.correo,
        asunto: t('correos.restablecimiento.asunto'),
        cuerpo: t('correos.restablecimiento.cuerpo', { nombre: usuario.nombre, autor: quien.nombre }),
        destacado: t('correos.restablecimiento.destacado', { clave: temporal }),
      }),
    );

    return {
      mensaje: t('servidor.contrasena.temporalEnviada', { correo: usuario.correo }),
      aviso: t('servidor.datos.contrasenaOculta'),
    };
  }

  /**
   * HU-09: Solicitar recuperación de contraseña (Paso 1)
   * Cumple Criterio 1: El enlace llega al correo y vence en una hora.
   */
  async solicitarRecuperacion(cuerpo: any) {
    const correo = cuerpo?.correo;
    if (!correo) {
      throw new BadRequestException(t('servidor.contrasena.correoObligatorio'));
    }

    const usuario = await this.usuarios.porCorreo(correo);
    if (!usuario) {
      return { mensaje: t('servidor.contrasena.recuperacionPedida') };
    }

    const { token } = await this.tokens.emitir(
      usuario.id,
      'recuperacion_contrasena',
      1,
    );

    const urlCliente = process.env.URL_CLIENTE || 'http://localhost:5173';
    const enlace = `${urlCliente}/#/recuperar-contrasena?token=${token}`;

    await this.correo.enviar({
      para: usuario.correo,
      asunto: t('correos.recuperacion.asunto'),
      cuerpo: t('correos.recuperacion.cuerpo', { nombre: usuario.nombre }),
      // El enlace va aparte para que el correo lo muestre como botón.
      destacado: enlace,
      textoBoton: t('correos.recuperacion.boton'),
    });

    return { mensaje: t('servidor.contrasena.recuperacionPedida') };
  }

  /**
   * HU-09: Ejecutar recuperación de contraseña (Paso 2)
   * Cumple Criterio 2 (uso único) y Criterio 3 (cerrar sesiones).
   */
  async ejecutarRecuperacion(cuerpo: any) {
    const token = cuerpo?.token;
    const nueva = cuerpo?.contrasena_nueva;

    if (!token || !nueva) {
      throw new BadRequestException(t('servidor.contrasena.faltanTokenYNueva'));
    }

    const usuarioId = await this.tokens.consumir(token, 'recuperacion_contrasena');

    if (!usuarioId) {
      const estabaVencido = await this.tokens.estabaVencido(token, 'recuperacion_contrasena');
      if (estabaVencido) {
        throw new BadRequestException(t('servidor.contrasena.enlaceExpirado'));
      }
      throw new BadRequestException(t('servidor.contrasena.enlaceInvalido'));
    }

    const faltas = revisarContrasena(nueva);
    if (faltas.length > 0) {
      throw new BadRequestException(
        t('comun.contrasena.necesita', { faltas: enumerarEn(faltas) }),
      );
    }

    const hash = await cifrarContrasena(nueva);

    await this.usuarios.cambiarContrasena(usuarioId, hash, usuarioId);

    return { mensaje: t('servidor.contrasena.recuperada') };
  }
}