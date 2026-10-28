import { BadRequestException, Injectable } from '@nestjs/common';
import type { UsuarioActual } from '../../comun/repositorio-usuario-actual';
import { PermisosModulo } from '../../comun/permisos-modulo';
import { t } from '../../comun/idioma';
import { RepositorioAccionesMasivas } from './repositorio-acciones-masivas';

/**
 * HU-31 · Acciones masivas sobre animales (Aaron, Sprint 3).
 *
 *   1. Se elige de a uno, toda la página o todo el resultado del filtro: eso
 *      lo resuelve la pantalla, que manda acá la lista de ids elegidos.
 *   2. La barra de acciones muestra cuántos hay elegidos (pantalla).
 *   3. Toda acción masiva pide confirmación indicando cuántos animales afecta
 *      (pantalla). El servidor contesta cuántos cambió, cuántos ya estaban y
 *      cuántos no encontró, para que el aviso final diga la verdad.
 *
 * Las acciones son las mismas que existen de a uno, con sus mismas reglas:
 *   estado  HU-33: estado válido, motivo obligatorio, fecha no futura.
 *           Exige edición en animales.
 *   baja    HU-34 y HU-18, criterio 3: solo el propietario o el Admin en
 *           soporte (PermisosModulo.exigirEliminar).
 *   corral  HU-37 ya es masiva: la pantalla usa POST /corrales/:id/animales.
 *
 * Tope de MAXIMO ids por pedido, el mismo que acepta la importación (HU-41).
 */

const ESTADOS = ['activo', 'vendido', 'muerto', 'archivado'];
const LARGO_MOTIVO = 500;
export const MAXIMO_ACCION_MASIVA = 5000;

@Injectable()
export class ServicioAccionesMasivas {
  constructor(
    private readonly repositorio: RepositorioAccionesMasivas,
    private readonly permisos: PermisosModulo,
  ) {}

  async cambiarEstado(cuerpo: any, quien: UsuarioActual) {
    const ranchoId = await this.permisos.exigir(quien, 'animales', 'editar');
    const ids = this.ids(cuerpo);

    const nuevo = cuerpo?.estado;
    if (!ESTADOS.includes(nuevo)) throw new BadRequestException(t('servidor.animales.estadoInvalido'));

    const motivo = typeof cuerpo?.motivo === 'string' ? cuerpo.motivo.trim() : '';
    if (!motivo) throw new BadRequestException(t('servidor.animales.sinMotivo'));
    if (motivo.length > LARGO_MOTIVO) {
      throw new BadRequestException(t('servidor.animales.textoLargo', { n: LARGO_MOTIVO }));
    }

    const fecha = cuerpo?.fecha ? fechaValida(cuerpo.fecha) : hoy();
    if (!fecha) throw new BadRequestException(t('servidor.animales.fechaInvalida'));
    if (fecha > hoy()) throw new BadRequestException(t('servidor.animales.fechaFutura'));

    const vigentes = await this.repositorio.contarVigentes(ids, ranchoId);
    const cambiados = await this.repositorio.cambiarEstado({
      ids, ranchoId, nuevo, fecha, motivo, autorId: quien.id,
    });
    return {
      cambiados,
      ya_estaban: vigentes - cambiados,
      no_encontrados: ids.length - vigentes,
      mensaje: t('servidor.masivo.estadoCambiado', {
        n: cambiados,
        estado: t(`servidor.animales.estados.${nuevo}`),
      }),
    };
  }

  async darDeBaja(cuerpo: any, quien: UsuarioActual) {
    const ranchoId = this.permisos.exigirEliminar(quien, 'animales');
    const ids = this.ids(cuerpo);
    const dadosDeBaja = await this.repositorio.darDeBaja(ids, ranchoId, quien.id);
    return {
      dados_de_baja: dadosDeBaja,
      no_encontrados: ids.length - dadosDeBaja,
      mensaje: t('servidor.masivo.dadosDeBaja', { n: dadosDeBaja }),
    };
  }

  /** Entre 1 y MAXIMO ids de texto, sin repetidos. */
  private ids(cuerpo: any): string[] {
    const pedidos: unknown = cuerpo?.animal_ids;
    if (
      !Array.isArray(pedidos) ||
      pedidos.length === 0 ||
      pedidos.length > MAXIMO_ACCION_MASIVA ||
      pedidos.some((id) => typeof id !== 'string' || !id)
    ) {
      throw new BadRequestException(t('servidor.masivo.seleccionInvalida', { n: MAXIMO_ACCION_MASIVA }));
    }
    return [...new Set(pedidos as string[])];
  }
}

/** AAAA-MM-DD que exista de verdad (no 2026-02-31). */
function fechaValida(valor: unknown): string | null {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return null;
  const fecha = new Date(`${valor}T00:00:00Z`);
  return !isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor ? valor : null;
}

function hoy(): string {
  return new Date().toISOString().slice(0, 10);
}
