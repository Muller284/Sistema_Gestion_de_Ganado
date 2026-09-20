import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { RepositorioUsuario } from './repositorio-usuario';
import { ServicioVerificacion } from './servicio-verificacion';
import { cifrarContrasena, enumerar, revisarContrasena } from '../../comun/contrasenas';

/**
 * HU-06 · Registro de propietario.
 *
 * Los cuatro criterios de aceptacion viven aca:
 *   1. El formulario pide nombre, correo, contraseña y pais.
 *   2. La contraseña exige ocho caracteres, una mayuscula y un numero.
 *   3. No se permite registrar dos veces el mismo correo.
 *   4. Al registrarse queda automaticamente como propietario.
 *
 * La validacion esta escrita a mano y no con una biblioteca de validacion,
 * por la misma razon que en HU-15: agregar una dependencia es decision de
 * Favio, y esto son cuatro reglas.
 */

const LARGO_NOMBRE = 150;
const LARGO_CORREO = 150;

/** Suficiente para un formulario: algo@algo.algo, sin espacios. */
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

    // Tercer criterio. El correo es unico en toda la plataforma, no por rancho:
    // una persona pertenece a un solo rancho (HU-13).
    if (await this.repositorio.existeCorreo(correo)) {
      throw new ConflictException(
        'Ya existe una cuenta con ese correo. Si es tuya, inicia sesión o recupera la contraseña.',
      );
    }

    // El identificador lo genera quien crea el registro, nunca la base: es la
    // convencion del equipo y es lo que despues permite trabajar sin conexion.
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
      // Entre la consulta de arriba y esta insercion puede colarse otro
      // registro con el mismo correo. El indice unico de la base lo impide
      // igual; lo que falta es traducirlo, para que el usuario vea el mismo
      // mensaje de siempre y no un error interno.
      if (error?.code === '23505' && error?.constraint === 'ux_usuarios_correo') {
        throw new ConflictException(
          'Ya existe una cuenta con ese correo. Si es tuya, inicia sesión o recupera la contraseña.',
        );
      }
      throw error;
    }

    // HU-07 arranca aca: la cuenta nace sin verificar y el enlace sale en el
    // acto. El enlace vuelve en la respuesta solo mientras el correo se
    // "envia" por consola; con un servidor de correo de verdad llega null.
    const emitido = await this.verificacion.emitir(
      usuario.id,
      usuario.nombre,
      usuario.correo,
    );

    // La contraseña, cifrada o no, no sale nunca de esta capa.
    return {
      usuario,
      siguiente: 'verificar_correo',
      mensaje:
        'Cuenta creada. Te enviamos un correo para confirmar tu dirección. El enlace vence en 24 horas.',
      enlace_verificacion: emitido.enlace,
    };
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
