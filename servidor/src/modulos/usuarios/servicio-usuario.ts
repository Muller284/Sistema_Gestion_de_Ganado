import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { RepositorioUsuario } from './repositorio-usuario';
import { ServicioVerificacion } from './servicio-verificacion';
import { cifrarContrasena, enumerar, revisarContrasena } from '../../comun/contrasenas';
import type { UsuarioActual } from '../../comun/repositorio-usuario-actual';

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
    if (!nombre) faltantes.push('nombre');
    if (!correo) faltantes.push('correo');
    if (!contrasena) faltantes.push('contraseña');
    if (!paisCodigo) faltantes.push('país');
    if (faltantes.length > 0) {
      throw new BadRequestException(`Faltan datos obligatorios: ${enumerar(faltantes)}.`);
    }

    if (nombre.length > LARGO_NOMBRE) {
      throw new BadRequestException(
        `El nombre no puede pasar de ${LARGO_NOMBRE} caracteres.`,
      );
    }
    if (correo.length > LARGO_CORREO) {
      throw new BadRequestException(
        `El correo no puede pasar de ${LARGO_CORREO} caracteres.`,
      );
    }
    if (!FORMA_CORREO.test(correo)) {
      throw new BadRequestException('El correo no tiene un formato válido.');
    }

    const faltas = revisarContrasena(contrasena);
    if (faltas.length > 0) {
      throw new BadRequestException(`La contraseña necesita al menos ${enumerar(faltas)}.`);
    }

    if (!(await this.repositorio.existePais(paisCodigo))) {
      throw new BadRequestException('El país indicado no existe.');
    }

    // Tercer criterio de HU-06. 
    if (await this.repositorio.existeCorreo(correo)) {
      throw new ConflictException(
        'Ya existe una cuenta con ese correo. Si es tuya, inicia sesión o recupera la contraseña.',
      );
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
        throw new ConflictException(
          'Ya existe una cuenta con ese correo. Si es tuya, inicia sesión o recupera la contraseña.',
        );
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
      mensaje:
        'Cuenta creada. Te enviamos un correo para confirmar tu dirección. El enlace vence en 24 horas.',
      enlace_verificacion: emitido.enlace,
    };
  }

  /**
   * HU-13: Un usuario, un solo rancho (Alta de colaboradores)
   */
  async altaColaborador(cuerpo: any, quien: UsuarioActual) {
    if (quien.rol !== 'propietario') {
      throw new ForbiddenException('Solo el propietario puede registrar nuevo personal.');
    }

    const correo = texto(cuerpo?.correo).toLowerCase();
    
    if (!correo || !FORMA_CORREO.test(correo)) {
      throw new BadRequestException('El correo proporcionado no es válido.');
    }

    // HU-13 Criterio 2: Si el correo ya está registrado, se rechaza con un mensaje claro.
    if (await this.repositorio.existeCorreo(correo)) {
      throw new ConflictException(
        'Este correo ya está registrado en otro rancho. Por seguridad, cada integrante puede trabajar en un solo establecimiento.',
      );
    }

    // NOTA: Aquí irá la lógica de insertar al colaborador en la base de datos (HU-21),
    // pero la regla de negocio de la HU-13 ya está cubierta por la validación de arriba.

    return { mensaje: 'Validación superada. El usuario puede ser agregado al rancho.' };
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