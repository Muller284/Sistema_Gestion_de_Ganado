import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DatosRancho, RepositorioRancho } from './repositorio-rancho';
import { UsuarioActual } from '../../comun/repositorio-usuario-actual';
import { actuaComoPropietario } from '../../comun/permisos-rol';
import { t } from '../../comun/idioma';

const TIPOS_PRODUCCION = ['carne', 'leche', 'mixto'];

/**
 * Reglas de negocio de la creacion y gestion del rancho (HU-15).
 *
 * Criterios de aceptacion que cubre:
 *  - El formulario pide nombre, departamento, localidad, superficie y tipo
 *    de produccion  -> los cinco son obligatorios al crear.
 *  - La ubicacion en el mapa es opcional                  -> latitud y longitud.
 *  - Una cuenta maneja un solo rancho                     -> propietarioYaTieneRancho.
 *  - No puedo llegar a ninguna otra pantalla sin haber creado el rancho
 *    -> el cliente usa GET /ranchos/mio para saberlo.
 */
@Injectable()
export class ServicioRancho {
  constructor(private readonly repositorio: RepositorioRancho) {}

  /** campo es la clave del nombre del campo, bajo servidor.ranchos.campos. */
  private exigirTexto(valor: any, campo: string, maximo: number): string {
    if (typeof valor !== 'string' || valor.trim() === '') {
      throw new BadRequestException(
        t('servidor.ranchos.campoObligatorio', { campo: t(`servidor.ranchos.campos.${campo}`) }),
      );
    }
    const limpio = valor.trim();
    if (limpio.length > maximo) {
      throw new BadRequestException(
        t('servidor.ranchos.campoLargo', {
          campo: t(`servidor.ranchos.campos.${campo}`),
          n: maximo,
        }),
      );
    }
    return limpio;
  }

  private exigirSuperficie(valor: any): number {
    const numero = Number(valor);
    if (!Number.isFinite(numero) || numero <= 0) {
      throw new BadRequestException(t('servidor.ranchos.superficie'));
    }
    return numero;
  }

  private revisarUbicacion(cuerpo: any): { latitud: number | null; longitud: number | null } {
    const tieneLat = cuerpo.latitud !== undefined && cuerpo.latitud !== null && cuerpo.latitud !== '';
    const tieneLon = cuerpo.longitud !== undefined && cuerpo.longitud !== null && cuerpo.longitud !== '';

    if (!tieneLat && !tieneLon) return { latitud: null, longitud: null };
    if (tieneLat !== tieneLon) {
      throw new BadRequestException(t('servidor.ranchos.ubicacionIncompleta'));
    }
    const latitud = Number(cuerpo.latitud);
    const longitud = Number(cuerpo.longitud);
    if (!Number.isFinite(latitud) || latitud < -90 || latitud > 90) {
      throw new BadRequestException(t('servidor.ranchos.latitud'));
    }
    if (!Number.isFinite(longitud) || longitud < -180 || longitud > 180) {
      throw new BadRequestException(t('servidor.ranchos.longitud'));
    }
    return { latitud, longitud };
  }

  private async armarDatos(cuerpo: any): Promise<DatosRancho> {
    const tipo = this.exigirTexto(cuerpo.tipo_produccion, 'tipoProduccion', 20);
    if (!TIPOS_PRODUCCION.includes(tipo)) {
      throw new BadRequestException(
        t('servidor.ranchos.tipoProduccion', { tipos: TIPOS_PRODUCCION.join(', ') }),
      );
    }
    const pais = this.exigirTexto(cuerpo.pais_codigo, 'pais', 10);
    if (!(await this.repositorio.existePais(pais))) {
      throw new BadRequestException(t('servidor.ranchos.paisNoExiste', { pais }));
    }
    const { latitud, longitud } = this.revisarUbicacion(cuerpo);

    return {
      nombre: this.exigirTexto(cuerpo.nombre, 'nombre', 150),
      departamento: this.exigirTexto(cuerpo.departamento, 'departamento', 100),
      localidad: this.exigirTexto(cuerpo.localidad, 'localidad', 100),
      superficie: this.exigirSuperficie(cuerpo.superficie),
      tipo_produccion: tipo,
      pais_codigo: pais,
      latitud,
      longitud,
    };
  }

  async crear(cuerpo: any, usuario: UsuarioActual) {
    if (usuario.rol !== 'propietario') {
      throw new ForbiddenException(
        t('servidor.ranchos.soloPropietarioCrea', { rol: nombreDelRol(usuario.rol) }),
      );
    }
    if (await this.repositorio.propietarioYaTieneRancho(usuario.id)) {
      throw new ConflictException(t('servidor.ranchos.yaTienes'));
    }

    const datos = await this.armarDatos(cuerpo);
    const id = typeof cuerpo.id === 'string' && cuerpo.id ? cuerpo.id : randomUUID();

    const rancho = await this.repositorio.crear(id, datos, usuario.id);
    await this.repositorio.vincularPropietario(usuario.id, rancho.id);
    return rancho;
  }

  async miRancho(usuario: UsuarioActual) {
    if (!usuario.ranchoId) return null;
    return this.repositorio.obtenerPorId(usuario.ranchoId, usuario.ranchoId);
  }

  async listar(usuario: UsuarioActual) {
    return this.repositorio.listar(usuario.ranchoId);
  }

  async obtener(id: string, usuario: UsuarioActual) {
    if (!usuario.ranchoId) {
      throw new NotFoundException(t('servidor.ranchos.sinRancho'));
    }
    const rancho = await this.repositorio.obtenerPorId(id, usuario.ranchoId);
    if (!rancho) {
      throw new NotFoundException(t('servidor.ranchos.noExiste'));
    }
    return rancho;
  }

  async actualizar(id: string, cuerpo: any, usuario: UsuarioActual) {
    if (!actuaComoPropietario(usuario)) {
      throw new ForbiddenException(t('servidor.ranchos.soloPropietarioEdita'));
    }
    await this.obtener(id, usuario);

    const cambios: Partial<DatosRancho> = {};
    if ('nombre' in cuerpo) cambios.nombre = this.exigirTexto(cuerpo.nombre, 'nombre', 150);
    if ('departamento' in cuerpo)
      cambios.departamento = this.exigirTexto(cuerpo.departamento, 'departamento', 100);
    if ('localidad' in cuerpo)
      cambios.localidad = this.exigirTexto(cuerpo.localidad, 'localidad', 100);
    if ('superficie' in cuerpo) cambios.superficie = this.exigirSuperficie(cuerpo.superficie);
    if ('tipo_produccion' in cuerpo) {
      const tipo = this.exigirTexto(cuerpo.tipo_produccion, 'tipoProduccion', 20);
      if (!TIPOS_PRODUCCION.includes(tipo)) {
        throw new BadRequestException(
          t('servidor.ranchos.tipoProduccion', { tipos: TIPOS_PRODUCCION.join(', ') }),
        );
      }
      cambios.tipo_produccion = tipo;
    }
    if ('pais_codigo' in cuerpo) {
      const pais = this.exigirTexto(cuerpo.pais_codigo, 'pais', 10);
      if (!(await this.repositorio.existePais(pais))) {
        throw new BadRequestException(t('servidor.ranchos.paisNoExiste', { pais }));
      }
      cambios.pais_codigo = pais;
    }
    if ('latitud' in cuerpo || 'longitud' in cuerpo) {
      const { latitud, longitud } = this.revisarUbicacion(cuerpo);
      cambios.latitud = latitud;
      cambios.longitud = longitud;
    }

    const rancho = await this.repositorio.actualizar(id, usuario.ranchoId!, cambios, usuario.id);
    if (!rancho) {
      throw new NotFoundException(t('servidor.ranchos.noExiste'));
    }
    return rancho;
  }

  async darDeBaja(id: string, usuario: UsuarioActual) {
    if (!actuaComoPropietario(usuario)) {
      throw new ForbiddenException(t('servidor.ranchos.soloPropietarioDaDeBaja'));
    }
    await this.obtener(id, usuario);
    const rancho = await this.repositorio.darDeBaja(id, usuario.ranchoId!, usuario.id);
    if (!rancho) {
      throw new NotFoundException(t('servidor.ranchos.noExiste'));
    }
    return rancho;
  }
}

/**
 * El rol tal como se guarda ('socio', 'admin_plataforma'...) en el idioma de
 * la peticion. En español queda igual que el codigo; si llegara un rol que no
 * esta en idiomas/, se muestra el codigo.
 */
function nombreDelRol(rol: string): string {
  const clave = `servidor.roles.${rol}`;
  const nombre = t(clave);
  return nombre === clave ? rol : nombre;
}
