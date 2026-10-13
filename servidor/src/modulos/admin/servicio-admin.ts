import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { t } from '../../comun/idioma';
import { actuaComoPropietario } from '../../comun/permisos-rol';
import type { UsuarioActual } from '../../comun/repositorio-usuario-actual';
import { RepositorioAdmin } from './repositorio-admin';

/**
 * HU-24 · Acceso total del Admin de plataforma.
 *
 * Criterios de aceptacion:
 *   1. El rol Admin existe y accede a la información de cualquier rancho.
 *   2. El Admin no puede ser creado desde la interfaz de un rancho.
 *   3. Cada acceso del Admin a un rancho queda registrado.
 *
 * COMO FUNCIONA
 * El Admin no pertenece a ningun rancho. Para ver uno:
 *   1. Ve la lista de todos los ranchos (GET /admin/ranchos).
 *   2. Entra a uno escribiendo por que (POST /admin/ranchos/:id/accesos).
 *      Eso abre una fila en accesos_admin: criterio 3.
 *   3. Mientras el acceso este abierto, el cliente manda la cabecera
 *      x-rancho-soporte en cada peticion. GuardiaCuentaLista comprueba que el
 *      acceso exista y siga abierto, y lo deja trabajar dentro de ese rancho
 *      con lo mismo que puede su propietario: criterio 1.
 *   4. Sale (POST /admin/accesos/:id/salida), o el acceso vence solo a las
 *      ocho horas.
 * Sin un acceso abierto no hay forma de ver nada de adentro: entrar sin
 * quedar registrado no es posible.
 *
 * El criterio 2 lo cumplen el alta del equipo (HU-17), que solo acepta socio
 * o colaborador, y el registro (HU-06), que siempre crea un propietario. El
 * Admin solo se crea directo en la base. Las pruebas lo comprueban.
 *
 * TRANSPARENCIA
 * El propietario puede ver cuando entro el soporte a su rancho y por que
 * (GET /admin/accesos/de-mi-rancho). No es un criterio, pero sin esto el
 * registro solo lo veria quien entra.
 */

const LARGO_MINIMO_MOTIVO = 10;
const LARGO_MAXIMO_MOTIVO = 300;

@Injectable()
export class ServicioAdmin {
  constructor(private readonly admin: RepositorioAdmin) {}

  async ranchos(quien: UsuarioActual) {
    this.soloAdmin(quien);
    return this.admin.ranchos(quien.id);
  }

  async entrar(ranchoId: string, cuerpo: any, quien: UsuarioActual) {
    this.soloAdmin(quien);
    const motivo = typeof cuerpo?.motivo === 'string' ? cuerpo.motivo.trim().replace(/\s+/g, ' ') : '';
    if (motivo.length < LARGO_MINIMO_MOTIVO) {
      throw new BadRequestException(t('servidor.admin.motivoCorto', { n: LARGO_MINIMO_MOTIVO }));
    }
    if (motivo.length > LARGO_MAXIMO_MOTIVO) {
      throw new BadRequestException(t('servidor.admin.motivoLargo', { n: LARGO_MAXIMO_MOTIVO }));
    }

    const rancho = esUuid(ranchoId) ? await this.admin.rancho(ranchoId) : null;
    if (!rancho) {
      throw new NotFoundException(t('servidor.admin.ranchoNoExiste'));
    }

    const acceso = await this.admin.entrar({
      id: esUuid(cuerpo?.id) ? cuerpo.id : randomUUID(),
      adminId: quien.id,
      ranchoId: rancho.id,
      motivo,
    });
    return { acceso, mensaje: t('servidor.admin.entraste', { rancho: rancho.nombre }) };
  }

  async salir(accesoId: string, quien: UsuarioActual) {
    this.soloAdmin(quien);
    const cerrado = esUuid(accesoId) && (await this.admin.salir(accesoId, quien.id));
    if (!cerrado) {
      // Ya estaba cerrado o vencido: para el cliente da igual, ya salio.
      return { mensaje: t('servidor.admin.yaSaliste') };
    }
    return {
      acceso: await this.admin.acceso(accesoId),
      mensaje: t('servidor.admin.saliste'),
    };
  }

  async accesos(quien: UsuarioActual) {
    this.soloAdmin(quien);
    return this.admin.accesos(null);
  }

  /** El propietario ve quien del soporte entro a su rancho. */
  async accesosDeMiRancho(quien: UsuarioActual) {
    if (!quien.ranchoId || !actuaComoPropietario(quien)) {
      throw new ForbiddenException(t('servidor.admin.soloPropietarioVeAccesos'));
    }
    return this.admin.accesos(quien.ranchoId, 50);
  }

  private soloAdmin(quien: UsuarioActual) {
    if (quien.rol !== 'admin_plataforma') {
      throw new ForbiddenException(t('servidor.admin.soloAdmin'));
    }
  }
}

function esUuid(valor: unknown): boolean {
  return (
    typeof valor === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(valor)
  );
}
