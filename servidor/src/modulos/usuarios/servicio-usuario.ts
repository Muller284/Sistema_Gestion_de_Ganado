import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { RepositorioUsuario } from './repositorio-usuario';
import { ServicioVerificacion } from './servicio-verificacion';
import { cifrarContrasena, revisarContrasena } from '../../comun/contrasenas';
import type { UsuarioActual } from '../../comun/repositorio-usuario-actual';
import { enIdioma, enumerarEn, idiomasDisponibles, t } from '../../comun/idioma';

/**
 * HU-06 · Registro de propietario.
 *
 * Los cuatro criterios de aceptacion viven aca:
 *   1. El formulario pide nombre, correo, contraseña y pais.
 *   2. La contraseña exige ocho caracteres, una mayuscula y un numero.
 *   3. No se permite registrar dos veces el mismo correo.
 *   4. Al registrarse queda automaticamente como propietario.
 */

const LARGO_NOMBRE = 150;
const LARGO_CORREO = 150;
const FORMA_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

@Injectable()
export class ServicioUsuario {
  constructor(
    private readonly repositorio: RepositorioUsuario,
    private readonly verificacion: ServicioVerificacion,
  ) {}

  async registrar(cuerpo: any) {
    const nombre = texto(cuerpo?.nombre);
    const correo = texto(cuerpo?.correo).toLowerCase();
    const contrasena = typeof cuerpo?.contrasena === 'string' ? cuerpo.contrasena : '';
    const paisCodigo = texto(cuerpo?.pais_codigo).toUpperCase();

    const faltantes: string[] = [];
    if (!nombre) faltantes.push(t('servidor.datos.campos.nombre'));
    if (!correo) faltantes.push(t('servidor.datos.campos.correo'));
    if (!contrasena) faltantes.push(t('servidor.datos.campos.contrasena'));
    if (!paisCodigo) faltantes.push(t('servidor.datos.campos.pais'));
    if (faltantes.length > 0) {
      throw new BadRequestException(
        t('servidor.datos.faltan', { faltantes: enumerarEn(faltantes) }),
      );
    }

    if (nombre.length > LARGO_NOMBRE) {
      throw new BadRequestException(t('servidor.perfil.nombreLargo', { n: LARGO_NOMBRE }));
    }
    if (correo.length > LARGO_CORREO) {
      throw new BadRequestException(t('servidor.registro.correoLargo', { n: LARGO_CORREO }));
    }
    if (!FORMA_CORREO.test(correo)) {
      throw new BadRequestException(t('servidor.datos.correoInvalido'));
    }

    const faltas = revisarContrasena(contrasena);
    if (faltas.length > 0) {
      throw new BadRequestException(
        t('comun.contrasena.necesita', { faltas: enumerarEn(faltas) }),
      );
    }

    if (!(await this.repositorio.existePais(paisCodigo))) {
      throw new BadRequestException(t('servidor.registro.paisNoExiste'));
    }

    // Tercer criterio de HU-06. 
    if (await this.repositorio.existeCorreo(correo)) {
      throw new ConflictException(t('servidor.registro.correoRepetido'));
    }

    const id = esUuid(cuerpo?.id) ? cuerpo.id : randomUUID();

    let usuario;
    try {
      usuario = await this.repositorio.crearPropietario({
        id,
        nombre,
        correo,
        contrasenaHash: await cifrarContrasena(contrasena),
        paisCodigo,
      });
    } catch (error: any) {
      if (error?.code === '23505' && error?.constraint === 'ux_usuarios_correo') {
        throw new ConflictException(t('servidor.registro.correoRepetido'));
      }
      throw error;
    }

    const emitido = await this.verificacion.emitir(
      usuario.id,
      usuario.nombre,
      usuario.correo,
    );

    return {
      usuario,
      siguiente: 'verificar_correo',
      mensaje: t('servidor.registro.creada'),
      enlace_verificacion: emitido.enlace,
    };
  }

  /** Mi perfil: lo que ve cada usuario de si mismo. */
  async perfil(quien: UsuarioActual) {
    const perfil = await this.repositorio.perfil(quien.id);
    if (!perfil) throw new ForbiddenException(t('servidor.datos.usuarioNoExiste'));
    return perfil;
  }

  /**
   * Mi perfil: el nombre y el idioma (HU-25). El correo no, porque cambiarlo
   * exige confirmar el nuevo (HU-07) y eso es otra historia; el pais tampoco
   * desde aca, porque es el criterio 2 de HU-14 (Brian).
   *
   * Cada dato es opcional: se cambia lo que venga. idioma nulo o vacio vuelve
   * a usar el del pais (criterio 2 de HU-25: "se toma del pais y se puede
   * cambiar").
   */
  async actualizarPerfil(cuerpo: any, quien: UsuarioActual) {
    // Mismas salidas que el portero: con esto pendiente no se edita nada.
    if (!quien.correoVerificado || quien.debeCambiarContrasena) {
      throw new ForbiddenException(t('servidor.perfil.terminaDeActivar'));
    }

    const cambiaNombre = cuerpo && 'nombre' in cuerpo;
    const cambiaIdioma = cuerpo && 'idioma' in cuerpo;
    if (!cambiaNombre && !cambiaIdioma) {
      throw new BadRequestException(t('servidor.perfil.nadaQueCambiar'));
    }

    let nombre: string | null = null;
    if (cambiaNombre) {
      nombre = texto(cuerpo.nombre);
      if (!nombre) {
        throw new BadRequestException(t('servidor.perfil.nombreVacio'));
      }
      if (nombre.length > LARGO_NOMBRE) {
        throw new BadRequestException(t('servidor.perfil.nombreLargo', { n: LARGO_NOMBRE }));
      }
    }

    let idioma: string | null = null;
    if (cambiaIdioma) {
      idioma = texto(cuerpo.idioma).toLowerCase() || null;
      if (idioma && !idiomasDisponibles().includes(idioma)) {
        throw new BadRequestException(
          t('servidor.perfil.idiomaNoExiste', { disponibles: idiomasDisponibles().join(', ') }),
        );
      }
    }

    if (cambiaNombre) await this.repositorio.cambiarNombre(quien.id, nombre!);
    if (cambiaIdioma) await this.repositorio.cambiarIdioma(quien.id, idioma);

    const perfil = await this.repositorio.perfil(quien.id);
    // El mensaje sale en el idioma nuevo: es lo primero que se lee en el.
    const mensaje = enIdioma(perfil.idioma, () =>
      t(cambiaIdioma && !cambiaNombre ? 'servidor.perfil.idiomaGuardado' : 'servidor.perfil.guardado'),
    );
    return { perfil, mensaje };
  }

  /**
   * HU-13: Un usuario, un solo rancho (Alta de colaboradores)
   */
  async altaColaborador(cuerpo: any, quien: UsuarioActual) {
    if (quien.rol !== 'propietario') {
      throw new ForbiddenException(t('servidor.usuarios.soloPropietarioRegistra'));
    }

    const correo = texto(cuerpo?.correo).toLowerCase();
    
    if (!correo || !FORMA_CORREO.test(correo)) {
      throw new BadRequestException(t('servidor.usuarios.correoNoValido'));
    }

    // HU-13 Criterio 2: Si el correo ya está registrado, se rechaza con un mensaje claro.
    if (await this.repositorio.existeCorreo(correo)) {
      throw new ConflictException(t('servidor.datos.correoEnOtroRancho'));
    }

    // NOTA: Aquí irá la lógica de insertar al colaborador en la base de datos (HU-21),
    // pero la regla de negocio de la HU-13 ya está cubierta por la validación de arriba.

    return { mensaje: t('servidor.usuarios.validacionSuperada') };
  }
}

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor.trim() : '';
}

function esUuid(valor: unknown): boolean {
  return (
    typeof valor === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      valor,
    )
  );
}