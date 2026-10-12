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

  /** Mi perfil: lo que ve cada usuario de si mismo. */
  async perfil(quien: UsuarioActual) {
    const perfil = await this.repositorio.perfil(quien.id);
    if (!perfil) throw new ForbiddenException('El usuario no existe.');
    return perfil;
  }

  /**
   * Mi perfil: por ahora se edita el nombre. El correo no, porque cambiarlo
   * exige confirmar el nuevo (HU-07) y eso es otra historia; el pais tampoco
   * desde aca, porque es el criterio 2 de HU-14 (Brian).
   */
  async actualizarPerfil(cuerpo: any, quien: UsuarioActual) {
    // Mismas salidas que el portero: con esto pendiente no se edita nada.
    if (!quien.correoVerificado || quien.debeCambiarContrasena) {
      throw new ForbiddenException('Termina de activar tu cuenta antes de editar tu perfil.');
    }

    const nombre = texto(cuerpo?.nombre);
    if (!nombre) {
      throw new BadRequestException('El nombre no puede quedar vacío.');
    }
    if (nombre.length > LARGO_NOMBRE) {
      throw new BadRequestException(`El nombre no puede pasar de ${LARGO_NOMBRE} caracteres.`);
    }

    await this.repositorio.cambiarNombre(quien.id, nombre);
    return { perfil: await this.repositorio.perfil(quien.id), mensaje: 'Tus datos quedaron guardados.' };
  }

  /**
   * HU-13 y HU-18: Alta de colaboradores con permisos iniciales de solo consulta.
   */
  async altaColaborador(cuerpo: any, quien: UsuarioActual) {
    if (quien.rol !== 'propietario' && quien.rol !== 'admin') {
      throw new ForbiddenException('Solo el propietario o administrador pueden registrar nuevo personal.');
    }

    const nombre = texto(cuerpo?.nombre);
    const correo = texto(cuerpo?.correo).toLowerCase();
    const contrasena = typeof cuerpo?.contrasena === 'string' ? cuerpo.contrasena : 'Temporal123*';
    
    if (!correo || !FORMA_CORREO.test(correo)) {
      throw new BadRequestException('El correo proporcionado no es válido.');
    }

    // HU-13 Criterio 2: Si el correo ya está registrado, se rechaza con un mensaje claro.
    if (await this.repositorio.existeCorreo(correo)) {
      throw new ConflictException(
        'Este correo ya está registrado en otro rancho. Por seguridad, cada integrante puede trabajar en un solo establecimiento.',
      );
    }

    const id = randomUUID();

    // HU-18: Permisos iniciales estrictos de solo consulta (edición en false por defecto)
    const permisosIniciales = {
      animales: { ver: true, editar: false },
      corrales: { ver: true, editar: false },
      sanidad: { ver: true, editar: false },
      pesajes: { ver: true, editar: false },
      importacion: { ver: true, editar: false },
      almacen: { ver: true, editar: false },
      equipo: { ver: true, editar: false },
      planes: { ver: true, editar: false },
    };

    // Guardamos el colaborador en la base de datos asociado al rancho del propietario
    await this.repositorio.crearColaborador({
      id,
      ranchoId: quien.ranchoId,
      nombre: nombre || 'Colaborador',
      correo,
      contrasenaHash: await cifrarContrasena(contrasena),
      rol: 'colaborador',
      permisos: JSON.stringify(permisosIniciales),
      estado: 'activo'
    });

    return { mensaje: 'Colaborador registrado con éxito con permisos iniciales de solo consulta (HU-18).' };
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