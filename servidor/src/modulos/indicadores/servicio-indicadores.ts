import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { UsuarioActual } from '../../comun/repositorio-usuario-actual';
import { PermisosModulo, type Nivel } from '../../comun/permisos-modulo';
import { t } from '../../comun/idioma';
import { DIAS_PROXIMA } from '../vacunacion/repositorio-vacunacion';
import { RepositorioIndicadores, type PesoDeAnimal } from './repositorio-indicadores';

/**
 * HU-57 · Panel del propietario.
 *   1. Existencias por categoría y por corral.
 *   2. Evolución del rodeo: altas y bajas por mes.
 *   3. Cobertura de vacunación (animales al día) y próximos vencimientos.
 *   4. Evolución del peso promedio.
 *   5. Sin datos suficientes, cada indicador explica qué falta (la pantalla,
 *      con lo que se devuelve acá).
 *
 * HU-58 · Panel según el rol.
 *   1. El socio ve el panel completo, sin botones de acción (`editar`).
 *   2. El colaborador ve solo los indicadores de sus módulos.
 *   3. El servidor no entrega datos de módulos a los que no tiene acceso: cada
 *      sección se arma solo si el nivel lo permite; si no, va nula.
 *
 * HU-56 · Comparativa de peso por corral y por categoría.
 *   1. Peso promedio y ganancia diaria promedio por grupo en el período.
 *   2. Los animales por debajo del promedio de su grupo, con cuánto les falta.
 *   3. Permiso de pesajes y aislamiento entre ranchos. Los nombres de los
 *      corrales solo los ve quien ve corrales: si no, se agrupa por categoría.
 */

const DIAS_POR_DEFECTO = 90;

/** Qué módulo alimenta cada sección del panel. */
const SECCIONES = ['animales', 'corrales', 'sanidad', 'pesajes'] as const;
type Seccion = (typeof SECCIONES)[number];

export interface Grupo {
  clave: string | null;
  nombre: string | null;
  animales: number;
  peso_promedio: number;
  /** Nulo si nadie del grupo tiene dos pesajes en el período. */
  ganancia_promedio: number | null;
}

@Injectable()
export class ServicioIndicadores {
  constructor(
    private readonly repositorio: RepositorioIndicadores,
    private readonly permisos: PermisosModulo,
  ) {}

  async panel(quien: UsuarioActual) {
    if (!quien.ranchoId) throw new NotFoundException(t('servidor.permisos.sinRancho'));
    const ranchoId = quien.ranchoId;
    const niveles = await this.permisos.todos(quien);
    const ve = (s: Seccion) => (niveles[s] ?? 'ninguno') !== 'ninguno';
    const edita = (s: Seccion) => niveles[s] === 'editar';

    const [hoy, existencias, movimientos, sanidad, pesos] = await Promise.all([
      this.repositorio.hoy(ranchoId),
      ve('animales') || ve('corrales') ? this.repositorio.existencias(ranchoId) : null,
      ve('animales') ? this.repositorio.movimientos(ranchoId) : null,
      ve('sanidad') ? this.repositorio.sanidad(ranchoId) : null,
      ve('pesajes') ? this.repositorio.pesoPorMes(ranchoId) : null,
    ]);

    return {
      hoy,
      secciones: Object.fromEntries(SECCIONES.map((s) => [s, ve(s)])) as Record<Seccion, boolean>,
      editar: Object.fromEntries(SECCIONES.map((s) => [s, edita(s)])) as Record<Seccion, boolean>,
      animales:
        ve('animales') && existencias && movimientos
          ? {
              activos: existencias.reduce((suma, fila) => suma + fila.n, 0),
              por_categoria: sumarPor(existencias, (fila) => fila.categoria_codigo).map(([codigo, n]) => ({ codigo, n })),
              movimientos,
            }
          : null,
      corrales: ve('corrales') && existencias ? porCorral(existencias) : null,
      sanidad: sanidad
        ? {
            ...sanidad,
            al_dia: sanidad.con_esquema - sanidad.atrasados,
            cobertura: sanidad.con_esquema > 0
              ? Math.round(((sanidad.con_esquema - sanidad.atrasados) / sanidad.con_esquema) * 100)
              : null,
            dias_proxima: DIAS_PROXIMA,
          }
        : null,
      pesajes: pesos
        ? { evolucion: pesos, meses_con_datos: pesos.filter((mes) => mes.peso_promedio !== null).length }
        : null,
    };
  }

  async comparativa(consulta: any, quien: UsuarioActual) {
    const ranchoId = await this.permisos.exigir(quien, 'pesajes', 'ver');
    const valores = consulta ?? {};
    if (Object.values(valores).some((valor) => Array.isArray(valor))) {
      throw new BadRequestException(t('servidor.indicadores.filtroRepetido'));
    }

    const hoy = await this.repositorio.hoy(ranchoId);
    const hasta = fecha(valores.hasta) ?? hoy;
    const pedidoDesde = fecha(valores.desde);
    if (pedidoDesde === 'mal' || hasta === 'mal') {
      throw new BadRequestException(t('servidor.indicadores.fechaInvalida'));
    }
    const desde = pedidoDesde ?? restarDias(hasta, DIAS_POR_DEFECTO);
    if (desde > hasta) throw new BadRequestException(t('servidor.indicadores.fechasCruzadas'));

    const veCorrales: Nivel = await this.permisos.nivel(quien, 'corrales');
    const conCorrales = veCorrales !== 'ninguno';
    const pedido = typeof valores.agrupar === 'string' ? valores.agrupar : 'corral';
    if (pedido !== 'corral' && pedido !== 'categoria') {
      throw new BadRequestException(t('servidor.indicadores.agruparInvalido'));
    }
    const agrupar = conCorrales ? pedido : 'categoria';

    const filas = await this.repositorio.pesosEnPeriodo(ranchoId, desde, hasta);
    // Sin permiso de corrales, ni el corral de cada animal sale del servidor (HU-58, criterio 3).
    const animales = conCorrales ? filas : filas.map((fila) => ({ ...fila, corral_id: null, corral_nombre: null }));

    const porCorralGrupos = conCorrales
      ? agruparPesos(animales, (a) => a.corral_id, (a) => a.corral_nombre)
      : null;
    const porCategoria = agruparPesos(animales, (a) => a.categoria_codigo, (a) => a.categoria_codigo);
    const grupos = agrupar === 'corral' ? porCorralGrupos! : porCategoria;
    const claveDe = (a: PesoDeAnimal) => (agrupar === 'corral' ? a.corral_id : a.categoria_codigo);

    const bajoPromedio = animales
      .flatMap((animal) => {
        const grupo = grupos.find((g) => g.clave === claveDe(animal));
        if (!grupo || grupo.ganancia_promedio === null || animal.ganancia_diaria === null) return [];
        if (animal.ganancia_diaria >= grupo.ganancia_promedio) return [];
        return [
          {
            ...animal,
            grupo: grupo.nombre,
            ganancia_promedio_grupo: grupo.ganancia_promedio,
            falta: redondear(grupo.ganancia_promedio - animal.ganancia_diaria, 3),
          },
        ];
      })
      .sort((a, b) => b.falta - a.falta);

    return {
      desde,
      hasta,
      agrupar,
      con_corrales: conCorrales,
      animales_pesados: animales.length,
      con_ganancia: animales.filter((a) => a.ganancia_diaria !== null).length,
      por_corral: porCorralGrupos,
      por_categoria: porCategoria,
      bajo_promedio: bajoPromedio,
    };
  }
}

function sumarPor<T extends { n: number }>(filas: T[], clave: (fila: T) => string | null): [string | null, number][] {
  const totales = new Map<string | null, number>();
  for (const fila of filas) totales.set(clave(fila), (totales.get(clave(fila)) ?? 0) + fila.n);
  return [...totales.entries()].sort((a, b) => b[1] - a[1]);
}

function porCorral(
  filas: { corral_id: string | null; corral_nombre: string | null; capacidad: number | null; n: number }[],
) {
  const corrales = new Map<string, { id: string; nombre: string; capacidad: number | null; n: number }>();
  let sinCorral = 0;
  for (const fila of filas) {
    if (!fila.corral_id) {
      sinCorral += fila.n;
      continue;
    }
    const previo = corrales.get(fila.corral_id);
    if (previo) previo.n += fila.n;
    else corrales.set(fila.corral_id, { id: fila.corral_id, nombre: fila.corral_nombre ?? '', capacidad: fila.capacidad, n: fila.n });
  }
  return {
    por_corral: [...corrales.values()].sort((a, b) => b.n - a.n || a.nombre.localeCompare(b.nombre)),
    sin_corral: sinCorral,
  };
}

function agruparPesos(
  animales: PesoDeAnimal[],
  clave: (a: PesoDeAnimal) => string | null,
  nombre: (a: PesoDeAnimal) => string | null,
): Grupo[] {
  const grupos = new Map<string | null, PesoDeAnimal[]>();
  for (const animal of animales) grupos.set(clave(animal), [...(grupos.get(clave(animal)) ?? []), animal]);
  return [...grupos.entries()]
    .map(([k, lista]) => {
      const ganancias = lista.map((a) => a.ganancia_diaria).filter((g): g is number => g !== null);
      return {
        clave: k,
        nombre: nombre(lista[0]),
        animales: lista.length,
        peso_promedio: redondear(lista.reduce((s, a) => s + a.peso_final, 0) / lista.length, 1),
        ganancia_promedio: ganancias.length ? redondear(ganancias.reduce((s, g) => s + g, 0) / ganancias.length, 3) : null,
      };
    })
    .sort((a, b) => b.animales - a.animales || String(a.nombre).localeCompare(String(b.nombre)));
}

function redondear(valor: number, decimales: number): number {
  const factor = 10 ** decimales;
  return Math.round(valor * factor) / factor;
}

/** AAAA-MM-DD válida; nulo si no vino; 'mal' si vino mal. */
function fecha(valor: unknown): string | null | 'mal' {
  if (valor === undefined || valor === null || valor === '') return null;
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return 'mal';
  const [a, m, d] = valor.split('-').map(Number);
  const real = new Date(Date.UTC(a, m - 1, d));
  if (real.getUTCFullYear() !== a || real.getUTCMonth() !== m - 1 || real.getUTCDate() !== d) return 'mal';
  return valor;
}

function restarDias(dia: string, dias: number): string {
  const [a, m, d] = dia.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d - dias)).toISOString().slice(0, 10);
}
