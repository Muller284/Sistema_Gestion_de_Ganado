import { HttpException, Injectable } from '@nestjs/common';
import type { UsuarioActual } from '../../comun/repositorio-usuario-actual';
import type { Nivel } from '../../comun/permisos-modulo';
import { REGLAS_CATEGORIAS } from '../../comun/categorias-animal';
import { ServicioAnimales } from '../animales/servicio-animales';
import { ServicioCorrales } from '../corrales/servicio-corrales';
import { ServicioIndicadores } from '../indicadores/servicio-indicadores';
import { ServicioPesajes } from '../pesajes/servicio-pesajes';
import { ServicioSanidad } from '../sanidad/servicio-sanidad';
import { ServicioVacunacion } from '../vacunacion/servicio-vacunacion';
import type { DefinicionHerramienta } from './proveedor-asistente';

/**
 * RF-38 a RF-41 · Las herramientas del asistente.
 *
 * El modelo no ve la base de datos: pide herramientas por nombre, con filtros,
 * y cada herramienta llama al mismo servicio que usan las pantallas. Por eso:
 *
 *   - Solo lee (RF-39). Ninguna herramienta llama a crear, editar ni borrar.
 *   - Respeta el rol (RF-40). Al modelo solo se le ofrecen las herramientas de
 *     los módulos que quien pregunta puede ver, y si igual pidiera otra, el
 *     servicio corta con su propio permisos.exigir().
 *   - Nunca sale del rancho (RF-41). El rancho sale de la sesión, dentro de
 *     cada servicio; ningún parámetro de herramienta lo nombra.
 *
 * Las respuestas van recortadas: sin identificadores internos ni auditoría,
 * solo lo que sirve para contestar, para gastar pocos tokens.
 */

const CATEGORIAS = REGLAS_CATEGORIAS.map((regla) => regla.codigo);
const ESTADOS_ANIMAL = ['activo', 'vendido', 'muerto', 'archivado', 'todos'];
const ESTADOS_DOSIS = ['vencida', 'proxima', 'programada'];
const MAXIMO_ANIMALES = 50;
const MAXIMO_DOSIS = 60;

type Modulo = 'animales' | 'corrales' | 'sanidad' | 'pesajes' | null;

interface Herramienta {
  /** Módulo que hay que poder ver para que se ofrezca. null: siempre. */
  modulo: Modulo;
  definicion: DefinicionHerramienta;
  ejecutar: (argumentos: any, quien: UsuarioActual, contexto: Contexto) => Promise<unknown>;
}

interface Contexto {
  hoy: string;
  niveles: Record<string, Nivel>;
}

const fecha = { type: 'string', description: 'Fecha AAAA-MM-DD' };

function definicion(name: string, description: string, propiedades: Record<string, unknown> = {}): DefinicionHerramienta {
  // Sin parámetros no se manda «parameters»: Gemini rechazó en versiones
  // anteriores un objeto con properties vacío.
  const conParametros = Object.keys(propiedades).length > 0;
  return {
    type: 'function',
    function: {
      name,
      description,
      ...(conParametros ? { parameters: { type: 'object', properties: propiedades } } : {}),
    },
  };
}

/** Para comparar nombres sin mayúsculas ni tildes: «Potrero del Río» = «potrero del rio». */
function normalizar(valor: unknown): string {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

function contiene(valor: unknown, buscado: unknown): boolean {
  return normalizar(valor).includes(normalizar(buscado));
}

function textoOpcional(valor: unknown): string | undefined {
  return typeof valor === 'string' && valor.trim() ? valor.trim() : undefined;
}

function numeroOpcional(valor: unknown): number | undefined {
  const n = typeof valor === 'number' ? valor : typeof valor === 'string' && valor.trim() ? Number(valor) : NaN;
  return Number.isFinite(n) ? n : undefined;
}

/** Meses cumplidos entre el nacimiento y hoy. */
function edadEnMeses(nacimiento: string | null, hoy: string): number | null {
  if (!nacimiento) return null;
  const [an, mn, dn] = nacimiento.slice(0, 10).split('-').map(Number);
  const [ah, mh, dh] = hoy.split('-').map(Number);
  return (ah - an) * 12 + (mh - mn) - (dh < dn ? 1 : 0);
}

function animalCorto(animal: any, hoy: string) {
  return {
    identificador: animal.identificador,
    nombre: animal.nombre ?? null,
    raza: animal.raza ?? null,
    sexo: animal.sexo,
    categoria: animal.categoria_codigo,
    nacimiento: animal.fecha_nacimiento ?? null,
    edad_meses: edadEnMeses(animal.fecha_nacimiento ?? null, hoy),
    peso_kg: animal.peso_kg ?? null,
    corral: animal.corral_nombre ?? null,
    estado: animal.estado,
  };
}

/** Ganancia diaria entre cada pesaje y el anterior; los pesajes llegan del más nuevo al más viejo. */
function conGanancias(pesajes: any[]) {
  const ordenados = [...pesajes].sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
  return ordenados.map((pesaje, i) => {
    const anterior = ordenados[i - 1];
    if (!anterior) return { fecha: pesaje.fecha, peso_kg: pesaje.peso_kg, ganancia_kg_dia: null };
    const dias = (Date.parse(pesaje.fecha) - Date.parse(anterior.fecha)) / 86_400_000;
    const ganancia = dias > 0 ? Math.round(((pesaje.peso_kg - anterior.peso_kg) / dias) * 1000) / 1000 : null;
    return { fecha: pesaje.fecha, peso_kg: pesaje.peso_kg, ganancia_kg_dia: ganancia };
  });
}

@Injectable()
export class HerramientasAsistente {
  private readonly herramientas: Record<string, Herramienta>;

  constructor(
    private readonly animales: ServicioAnimales,
    private readonly corrales: ServicioCorrales,
    private readonly indicadores: ServicioIndicadores,
    private readonly pesajes: ServicioPesajes,
    private readonly sanidad: ServicioSanidad,
    private readonly vacunacion: ServicioVacunacion,
  ) {
    this.herramientas = {
      resumen_rancho: {
        modulo: null,
        definicion: definicion(
          'resumen_rancho',
          'Panel del rancho: animales activos por categoría, altas y bajas de los últimos 12 meses, animales por corral, ' +
            'cobertura de vacunación con dosis vencidas y próximas, y peso promedio por mes. Solo trae las secciones ' +
            'de los módulos que el usuario puede ver.',
        ),
        ejecutar: (_argumentos, quien) => this.resumen(quien),
      },
      buscar_animales: {
        modulo: 'animales',
        definicion: definicion(
          'buscar_animales',
          `Lista animales del rancho con filtros, ordenados y con el total. Devuelve hasta ${MAXIMO_ANIMALES}. ` +
            'Sirve para contar, filtrar por corral, categoría, sexo, raza, edad o peso, y ordenar.',
          {
            texto: { type: 'string', description: 'Parte del identificador (caravana) o del nombre' },
            categoria: { type: 'string', enum: CATEGORIAS },
            sexo: { type: 'string', enum: ['macho', 'hembra'] },
            corral: { type: 'string', description: 'Nombre del corral o potrero, o «sin corral»' },
            raza: { type: 'string' },
            estado: { type: 'string', enum: ESTADOS_ANIMAL, description: 'Por defecto, activo' },
            nacidos_desde: fecha,
            nacidos_hasta: fecha,
            peso_minimo_kg: { type: 'number' },
            peso_maximo_kg: { type: 'number' },
            orden: { type: 'string', enum: ['identificador', 'peso', 'edad'] },
            descendente: {
              type: 'boolean',
              description: 'Por defecto el orden va de menor a mayor. Para «el más pesado» o «el más viejo», true.',
            },
            limite: { type: 'integer', description: `De 1 a ${MAXIMO_ANIMALES}` },
          },
        ),
        ejecutar: (argumentos, quien, contexto) => this.buscarAnimales(argumentos, quien, contexto),
      },
      ficha_animal: {
        modulo: 'animales',
        definicion: definicion(
          'ficha_animal',
          'Todo sobre un animal por su identificador (caravana): datos, movimientos de corral, cambios de estado y, ' +
            'si el usuario puede verlos, sus pesajes con la ganancia diaria y sus aplicaciones sanitarias.',
          { identificador: { type: 'string', description: 'Identificador exacto, por ejemplo 0503' } },
        ),
        ejecutar: (argumentos, quien, contexto) => this.ficha(argumentos, quien, contexto),
      },
      corrales: {
        modulo: 'corrales',
        definicion: definicion(
          'corrales',
          'Corrales y potreros del rancho con capacidad, superficie, animales que tienen y si están sobrepoblados.',
        ),
        ejecutar: (_argumentos, quien) => this.listarCorrales(quien),
      },
      calendario_sanitario: {
        modulo: 'sanidad',
        definicion: definicion(
          'calendario_sanitario',
          'Dosis de vacunación pendientes según los esquemas: vencidas, próximas (vencen en 7 días) y programadas, ' +
            `con animal, esquema, producto y fecha. Devuelve hasta ${MAXIMO_DOSIS} y el resumen por estado.`,
          {
            estado: { type: 'string', enum: ESTADOS_DOSIS },
            desde: fecha,
            hasta: fecha,
            producto: { type: 'string', description: 'Nombre del producto o del esquema' },
            corral: { type: 'string', description: 'Nombre del corral' },
            animal: { type: 'string', description: 'Identificador del animal' },
          },
        ),
        ejecutar: (argumentos, quien) => this.calendario(argumentos, quien),
      },
      esquemas_y_productos: {
        modulo: 'sanidad',
        definicion: definicion(
          'esquemas_y_productos',
          'Productos sanitarios del rancho y esquemas de vacunación: a qué animales se aplican, dosis, intervalos y refuerzos.',
        ),
        ejecutar: (_argumentos, quien) => this.esquemasYProductos(quien),
      },
      comparativa_peso: {
        modulo: 'pesajes',
        definicion: definicion(
          'comparativa_peso',
          'Peso promedio y ganancia diaria promedio por corral o por categoría en un período (por defecto los últimos ' +
            '90 días), y los animales que ganan menos que el promedio de su grupo.',
          {
            desde: fecha,
            hasta: fecha,
            agrupar: { type: 'string', enum: ['corral', 'categoria'] },
          },
        ),
        ejecutar: (argumentos, quien) => this.comparativa(argumentos, quien),
      },
    };
  }

  /** RF-40 · Solo las herramientas de los módulos que puede ver. */
  disponibles(niveles: Record<string, Nivel>): DefinicionHerramienta[] {
    return Object.values(this.herramientas)
      .filter((h) => h.modulo === null || (niveles[h.modulo] ?? 'ninguno') !== 'ninguno')
      .map((h) => h.definicion);
  }

  /**
   * Ejecuta una herramienta y devuelve el texto que vuelve al modelo. Los
   * errores no cortan la conversación: el modelo recibe el motivo (por ejemplo
   * «no tienes acceso a Sanidad») y se lo explica al usuario.
   */
  async ejecutar(nombre: string, argumentosJson: string, quien: UsuarioActual, contexto: Contexto): Promise<string> {
    const herramienta = this.herramientas[nombre];
    if (!herramienta) return JSON.stringify({ error: `No existe la herramienta ${nombre}.` });
    if (herramienta.modulo && (contexto.niveles[herramienta.modulo] ?? 'ninguno') === 'ninguno') {
      return JSON.stringify({ error: `El usuario no tiene acceso al módulo ${herramienta.modulo}.` });
    }
    let argumentos: any = {};
    try {
      argumentos = argumentosJson ? JSON.parse(argumentosJson) : {};
      if (typeof argumentos !== 'object' || argumentos === null) argumentos = {};
    } catch {
      return JSON.stringify({ error: 'Los argumentos no son un JSON válido.' });
    }
    try {
      return JSON.stringify(await herramienta.ejecutar(argumentos, quien, contexto));
    } catch (error) {
      if (error instanceof HttpException) {
        const cuerpo: any = error.getResponse();
        return JSON.stringify({ error: typeof cuerpo === 'string' ? cuerpo : cuerpo?.message ?? error.message });
      }
      throw error;
    }
  }

  // ── Herramientas ─────────────────────────────────────────────────────────

  private async resumen(quien: UsuarioActual) {
    const panel: any = await this.indicadores.panel(quien);
    // Los ids de corrales y animales no le sirven al modelo.
    if (panel.corrales?.por_corral) {
      panel.corrales.por_corral = panel.corrales.por_corral.map(({ id: _id, ...resto }: any) => resto);
    }
    if (panel.sanidad?.proximos) {
      panel.sanidad.proximos = panel.sanidad.proximos.map(({ animal_id: _id, ...resto }: any) => resto);
    }
    delete panel.editar;
    return panel;
  }

  private async todosLosAnimales(estado: string, quien: UsuarioActual, filtros: Record<string, string | undefined>) {
    const resultado: any = await this.animales.listar(estado, 'no', filtros, quien);
    return (Array.isArray(resultado) ? resultado : resultado.animales) as any[];
  }

  private async buscarAnimales(argumentos: any, quien: UsuarioActual, contexto: Contexto) {
    const estado = ESTADOS_ANIMAL.includes(argumentos.estado) ? argumentos.estado : 'activo';
    const lista = await this.todosLosAnimales(estado, quien, {
      busqueda: textoOpcional(argumentos.texto),
      sexo: argumentos.sexo === 'macho' || argumentos.sexo === 'hembra' ? argumentos.sexo : undefined,
      categoria: CATEGORIAS.includes(argumentos.categoria) ? argumentos.categoria : undefined,
      fechaDesde: textoOpcional(argumentos.nacidos_desde),
      fechaHasta: textoOpcional(argumentos.nacidos_hasta),
    });

    const corral = textoOpcional(argumentos.corral);
    const raza = textoOpcional(argumentos.raza);
    const pesoMinimo = numeroOpcional(argumentos.peso_minimo_kg);
    const pesoMaximo = numeroOpcional(argumentos.peso_maximo_kg);
    const sinCorral = corral !== undefined && normalizar(corral).startsWith('sin');

    let filtrados = lista.filter((animal) => {
      if (corral !== undefined) {
        if (sinCorral ? animal.corral_nombre : !contiene(animal.corral_nombre, corral)) return false;
      }
      if (raza !== undefined && !contiene(animal.raza, raza)) return false;
      const peso = animal.peso_kg === null || animal.peso_kg === undefined ? null : Number(animal.peso_kg);
      if (pesoMinimo !== undefined && (peso === null || peso < pesoMinimo)) return false;
      if (pesoMaximo !== undefined && (peso === null || peso > pesoMaximo)) return false;
      return true;
    });

    const orden = argumentos.orden;
    if (orden === 'peso' || orden === 'edad' || orden === 'identificador') {
      const clave = (animal: any) =>
        orden === 'peso'
          ? Number(animal.peso_kg ?? -1)
          : orden === 'edad'
            ? // Más edad = nació antes: se ordena por la fecha al revés.
              -Date.parse(animal.fecha_nacimiento ?? '9999-12-31')
            : String(animal.identificador);
      filtrados = [...filtrados].sort((a, b) => {
        const [x, y] = [clave(a), clave(b)];
        const comparacion = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));
        return argumentos.descendente ? -comparacion : comparacion;
      });
    }

    const pedido = numeroOpcional(argumentos.limite);
    const limite = pedido === undefined ? 20 : Math.min(Math.max(Math.trunc(pedido), 1), MAXIMO_ANIMALES);
    return {
      total: filtrados.length,
      mostrados: Math.min(limite, filtrados.length),
      // Para que el modelo no lea al revés una lista ordenada (lo vimos con «la vaca más pesada»).
      orden: ['peso', 'edad', 'identificador'].includes(orden)
        ? `${orden}, ${argumentos.descendente ? 'de mayor a menor' : 'de menor a mayor'}`
        : 'sin orden pedido',
      animales: filtrados.slice(0, limite).map((animal) => animalCorto(animal, contexto.hoy)),
    };
  }

  private async ficha(argumentos: any, quien: UsuarioActual, contexto: Contexto) {
    const identificador = textoOpcional(argumentos.identificador);
    if (!identificador) return { error: 'Falta el identificador del animal.' };
    const candidatos = await this.todosLosAnimales('todos', quien, { busqueda: identificador });
    const animal =
      candidatos.find((a) => normalizar(a.identificador) === normalizar(identificador)) ??
      (candidatos.length === 1 ? candidatos[0] : null);
    if (!animal) {
      return {
        error: `No hay ningún animal con el identificador ${identificador}.`,
        parecidos: candidatos.slice(0, 5).map((a) => a.identificador),
      };
    }

    const ficha: any = await this.animales.ficha(animal.id, quien);
    const puede = (modulo: string) => (contexto.niveles[modulo] ?? 'ninguno') !== 'ninguno';
    const [pesajes, aplicaciones]: any[] = await Promise.all([
      puede('pesajes') ? this.pesajes.delAnimal(animal.id, quien) : null,
      puede('sanidad') ? this.sanidad.aplicaciones(animal.id, quien) : null,
    ]);

    return {
      animal: { ...animalCorto(ficha.animal, contexto.hoy), origen: ficha.animal.origen ?? null },
      movimientos: (ficha.movimientos ?? []).map((m: any) => ({
        fecha: m.fecha,
        desde: m.corral_origen ?? null,
        hacia: m.corral_destino ?? null,
      })),
      cambios_de_estado: (ficha.estados ?? []).map((e: any) => ({
        fecha: e.fecha,
        de: e.estado_anterior,
        a: e.estado_nuevo,
        motivo: e.motivo ?? null,
      })),
      pesajes: pesajes ? conGanancias(pesajes.pesajes ?? []) : 'sin acceso a pesajes',
      aplicaciones: aplicaciones
        ? (aplicaciones.aplicaciones ?? []).map((a: any) => ({
            fecha: a.fecha,
            producto: a.producto_nombre,
            tipo: a.producto_tipo,
            esquema: a.esquema_nombre ?? null,
            numero_dosis: a.numero_dosis ?? null,
            dosis: a.dosis ?? null,
            unidad: a.unidad ?? null,
            aplicado_por: a.aplicado_por_nombre ?? null,
            observacion: a.observacion ?? null,
          }))
        : 'sin acceso a sanidad',
    };
  }

  private async listarCorrales(quien: UsuarioActual) {
    const corrales: any[] = await this.corrales.listar(false, quien);
    return corrales.map((c) => ({
      nombre: c.nombre,
      capacidad: c.capacidad,
      superficie_ha: c.superficie_ha === null ? null : Number(c.superficie_ha),
      animales: c.ocupacion,
      caben_por_superficie: c.limite_superficie ?? null,
      sobrepoblado: c.sobrepoblado,
    }));
  }

  private async calendario(argumentos: any, quien: UsuarioActual) {
    const resultado: any = await this.vacunacion.calendario(
      {
        desde: textoOpcional(argumentos.desde),
        hasta: textoOpcional(argumentos.hasta),
        estado: ESTADOS_DOSIS.includes(argumentos.estado) ? argumentos.estado : undefined,
        pagina: '1',
        porPagina: '200',
      },
      quien,
    );
    const producto = textoOpcional(argumentos.producto);
    const corral = textoOpcional(argumentos.corral);
    const animal = textoOpcional(argumentos.animal);
    const dosis = (resultado.dosis as any[]).filter(
      (d) =>
        (producto === undefined || contiene(d.producto_nombre, producto) || contiene(d.esquema_nombre, producto)) &&
        (corral === undefined || contiene(d.corral_nombre, corral)) &&
        (animal === undefined || normalizar(d.identificador) === normalizar(animal)),
    );
    const resumen = { vencida: 0, proxima: 0, programada: 0 } as Record<string, number>;
    for (const d of dosis) resumen[d.estado] = (resumen[d.estado] ?? 0) + 1;
    return {
      dias_proxima: resultado.dias_proxima,
      resumen,
      total: dosis.length,
      dosis: dosis.slice(0, MAXIMO_DOSIS).map((d) => ({
        animal: d.identificador,
        nombre: d.animal_nombre ?? null,
        categoria: d.categoria_codigo,
        corral: d.corral_nombre ?? null,
        esquema: d.esquema_nombre,
        producto: d.producto_nombre,
        // Sin número de dosis es un refuerzo periódico, después de la serie.
        dosis: d.numero_dosis ? `${d.numero_dosis} de ${d.dosis_total}` : 'refuerzo',
        vence: d.vence,
        dias: d.dias,
        estado: d.estado,
      })),
    };
  }

  private async esquemasYProductos(quien: UsuarioActual) {
    const [esquemas, productos]: any[] = await Promise.all([
      this.vacunacion.listar(quien),
      this.sanidad.productos(quien),
    ]);
    return {
      productos: (productos.productos ?? []).map((p: any) => ({
        nombre: p.nombre,
        tipo: p.tipo,
        laboratorio: p.laboratorio ?? null,
        dosis: p.dosis ?? null,
        unidad: p.unidad ?? null,
      })),
      esquemas: (esquemas.esquemas ?? []).map((e: any) => ({
        nombre: e.nombre,
        producto: e.producto_nombre,
        categorias: e.categorias ?? 'todas',
        sexo: e.sexo ?? 'ambos',
        edad_minima_meses: e.edad_minima_meses,
        edad_maxima_meses: e.edad_maxima_meses,
        dosis: e.dosis,
        intervalo_dias: e.intervalo_dias,
        refuerzo_dias: e.refuerzo_dias,
        animales_que_entran: e.animales ?? null,
      })),
    };
  }

  private async comparativa(argumentos: any, quien: UsuarioActual) {
    const resultado: any = await this.indicadores.comparativa(
      {
        desde: textoOpcional(argumentos.desde),
        hasta: textoOpcional(argumentos.hasta),
        agrupar: argumentos.agrupar === 'categoria' ? 'categoria' : 'corral',
      },
      quien,
    );
    const sinClave = (grupos: any[] | null | undefined) =>
      grupos ? grupos.map(({ clave: _clave, ...resto }) => resto) : grupos;
    return {
      ...resultado,
      por_corral: sinClave(resultado.por_corral),
      por_categoria: sinClave(resultado.por_categoria),
      bajo_promedio: (resultado.bajo_promedio ?? []).map(({ animal_id: _id, corral_id: _c, ...resto }: any) => resto),
    };
  }
}
