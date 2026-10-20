import { BadRequestException, Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import type { UsuarioActual } from '../../comun/repositorio-usuario-actual';
import { PermisosModulo } from '../../comun/permisos-modulo';
import { enIdioma, t } from '../../comun/idioma';
import {
  COLUMNAS,
  leerArchivo,
  normalizar,
  titulosDe,
  type ColumnaDelArchivo,
  type Columna,
  type FilaLeida,
  type Valor,
} from './lector-archivo';
import { RepositorioImportacion, type AnimalAImportar, type ContextoRancho } from './repositorio-importacion';

/**
 * Importación de animales desde Excel o CSV.
 *
 * HU-40 · Plantilla
 *   1. Incluye las columnas con sus nombres y una fila de ejemplo.
 *   2. Está en español e inglés (sale en el idioma de quien la pide).
 *   3. Usarla es opcional: se acepta cualquier archivo con esos encabezados,
 *      en el orden que sea, en cualquiera de los dos idiomas.
 *
 * HU-43 · Vista previa e informe de errores
 *   1. La vista previa muestra las primeras filas tal como quedarían.
 *   2. El resumen dice cuántas se cargan, cuántas tienen error y cuántas están repetidas.
 *   3. Cada error dice número de fila y motivo (la pantalla lo deja descargar).
 *   4. Nada se carga hasta confirmar: vista-previa no escribe en la base.
 *
 * HU-44 · Duplicados
 *   1. Por identificador dentro del rancho.
 *   2. Dentro del propio archivo, no solo contra la base.
 *   3. Se elige omitir los repetidos o actualizar los existentes.
 *
 * HU-41 · Reconocimiento de columnas y HU-42 · Confirmación manual (Brian)
 *   La vista previa devuelve `columnas` (qué columna del archivo se tomó
 *   como qué campo) y `faltan` (obligatorias sin asignar). Las columnas no
 *   reconocidas se asignan a mano y vuelven en `asignaciones`
 *   ({ posición: campo | 'ignorar' }). Si falta una obligatoria, la vista
 *   previa no valida filas (listo: false) y confirmar responde 400.
 *
 * Importar es del módulo "importacion" con permiso de edición (HU-19/HU-22):
 * el socio y los colaboradores sin ese permiso reciben 403.
 */

export type Estrategia = 'omitir' | 'actualizar';

export interface ErrorDeFila {
  fila: number;
  identificador: string | null;
  columna: Columna | null;
  motivo: string;
}

export interface Repetida {
  fila: number;
  identificador: string;
  /** archivo: el identificador ya apareció más arriba. rancho: ya existe un animal con él. */
  en: 'archivo' | 'rancho';
}

export interface FilaPrevia {
  fila: number;
  accion: 'nueva' | 'actualizar';
  identificador: string;
  tipo_identificador: string;
  nombre: string | null;
  raza: string | null;
  sexo: string;
  categoria_codigo: string | null;
  fecha_nacimiento: string | null;
  origen: string | null;
  corral: string | null;
  peso_kg: number | null;
}

export interface Informe {
  estrategia: Estrategia;
  /** HU-41/HU-42: false mientras falte asignar una columna obligatoria. */
  listo: boolean;
  /** HU-41, criterio 3: cada columna del archivo y el campo que se le asignó. */
  columnas: ColumnaDelArchivo[];
  /** Columnas obligatorias que todavía no tienen ninguna columna del archivo. */
  faltan: Columna[];
  /** HU-42: los campos que se pueden elegir para una columna no reconocida. */
  campos: readonly Columna[];
  resumen: {
    total: number;
    /** Las que se guardan al confirmar: nuevas más, si se actualiza, las existentes. */
    cargan: number;
    nuevas: number;
    actualizan: number;
    con_error: number;
    repetidas: number;
    repetidas_en_archivo: number;
    existentes: number;
  };
  vista_previa: FilaPrevia[];
  errores: ErrorDeFila[];
  repetidas: Repetida[];
}

const FILAS_DE_VISTA_PREVIA = 10;
const KG_POR_LIBRA = 0.45359237;

interface Clasificacion {
  informe: Informe;
  nuevas: AnimalAImportar[];
  aActualizar: { id: string; corralActual: string | null; datos: AnimalAImportar }[];
}

@Injectable()
export class ServicioImportacion {
  constructor(
    private readonly repositorio: RepositorioImportacion,
    private readonly permisos: PermisosModulo,
  ) {}

  /** HU-40. El Excel en el idioma de quien lo pide y con la unidad de peso de su país. */
  async plantilla(quien: UsuarioActual): Promise<{ nombre: string; contenido: Buffer }> {
    const ranchoId = await this.permisos.exigir(quien, 'importacion', 'ver');
    const contexto = await this.repositorio.contexto(ranchoId);
    const unidad = contexto.unidadPeso;

    const libro = new ExcelJS.Workbook();
    const hoja = libro.addWorksheet(t('servidor.importacion.plantilla.hoja'));
    hoja.columns = COLUMNAS.map((columna) => ({
      header: t(`servidor.importacion.columnas.${columna}`, { unidad }),
      key: columna,
      width: columna === 'identificador' || columna === 'tipo_identificador' ? 22 : 18,
    }));
    hoja.getRow(1).font = { bold: true };
    hoja.views = [{ state: 'frozen', ySplit: 1 }];

    // Una fila de ejemplo, con valores en el idioma de la plantilla.
    hoja.addRow({
      identificador: '4471',
      tipo_identificador: t('animales.tiposIdentificador.caravana'),
      nombre: 'Lucera',
      raza: 'Nelore',
      sexo: t('animales.sexos.hembra'),
      categoria: t('animales.categorias.vaquilla'),
      fecha_nacimiento: contexto.formatoFecha.replace('YYYY', '2024').replace('MM', '05').replace('DD', '12'),
      origen: t('animales.origenes.nacido'),
      corral: t('servidor.importacion.plantilla.corralEjemplo'),
      peso: unidad === 'lb' ? 838 : 380,
    });

    // Los valores aceptados, para no adivinar.
    const ayuda = libro.addWorksheet(t('servidor.importacion.plantilla.hojaAyuda'));
    ayuda.columns = [
      { header: t('servidor.importacion.plantilla.columna'), width: 26 },
      { header: t('servidor.importacion.plantilla.valores'), width: 90 },
    ];
    ayuda.getRow(1).font = { bold: true };
    const lista = (prefijo: string, claves: string[]) => claves.map((c) => t(`${prefijo}.${c}`)).join(', ');
    ayuda.addRows([
      [t('servidor.importacion.columnas.identificador', { unidad }), t('servidor.importacion.plantilla.obligatorio')],
      [t('servidor.importacion.columnas.tipo_identificador', { unidad }), lista('animales.tiposIdentificador', ['caravana', 'interno', 'rfid'])],
      [t('servidor.importacion.columnas.sexo', { unidad }), `${lista('animales.sexos', ['hembra', 'macho'])}. ${t('servidor.importacion.plantilla.obligatorio')}`],
      [t('servidor.importacion.columnas.categoria', { unidad }), lista('animales.categorias', contexto.categorias)],
      [t('servidor.importacion.columnas.fecha_nacimiento', { unidad }), contexto.formatoFecha],
      [t('servidor.importacion.columnas.origen', { unidad }), lista('animales.origenes', ['nacido', 'comprado', 'otro'])],
      [t('servidor.importacion.columnas.corral', { unidad }), t('servidor.importacion.plantilla.corralAyuda')],
      [t('servidor.importacion.columnas.peso', { unidad }), t('servidor.importacion.plantilla.pesoAyuda', { unidad })],
    ]);

    const contenido = Buffer.from(await libro.xlsx.writeBuffer());
    return { nombre: `${t('servidor.importacion.plantilla.archivo')}.xlsx`, contenido };
  }

  /** HU-43, criterio 4: solo lee y clasifica. No escribe nada. */
  async vistaPrevia(cuerpo: any, quien: UsuarioActual): Promise<Informe> {
    const ranchoId = await this.permisos.exigir(quien, 'importacion', 'editar');
    return (await this.clasificar(cuerpo, ranchoId)).informe;
  }

  /** Recién acá se escribe, y en una sola transacción. */
  async confirmar(cuerpo: any, quien: UsuarioActual) {
    const ranchoId = await this.permisos.exigir(quien, 'importacion', 'editar');
    const { informe, nuevas, aActualizar } = await this.clasificar(cuerpo, ranchoId);
    if (!informe.listo) {
      throw new BadRequestException(t('servidor.importacion.faltanColumnas', { columnas: titulosDe(informe.faltan) }));
    }
    if (nuevas.length + aActualizar.length === 0) {
      throw new BadRequestException(t('servidor.importacion.nadaQueCargar'));
    }
    try {
      const { insertados, actualizados } = await this.repositorio.cargar(ranchoId, nuevas, aActualizar, quien.id);
      const omitidos = informe.resumen.repetidas - actualizados;
      return {
        mensaje: t('servidor.importacion.completada', {
          insertados,
          actualizados,
          omitidos,
          errores: informe.resumen.con_error,
        }),
        resumen: { insertados, actualizados, omitidos, con_error: informe.resumen.con_error },
      };
    } catch (error) {
      // Otro alta con el mismo identificador entre la vista previa y la carga.
      if ((error as { code?: string }).code === '23505') {
        throw new BadRequestException(t('servidor.importacion.cambioMientras'));
      }
      throw error;
    }
  }

  private async clasificar(cuerpo: any, ranchoId: string): Promise<Clasificacion> {
    const estrategia: Estrategia = cuerpo?.estrategia === 'actualizar' ? 'actualizar' : 'omitir';
    const archivo = await leerArchivo(cuerpo?.nombre_archivo, cuerpo?.contenido_base64, cuerpo?.asignaciones);
    const mapeo = { columnas: archivo.columnas, faltan: archivo.faltan, campos: COLUMNAS };

    // HU-42: sin las obligatorias no se valida ninguna fila; primero hay que asignarlas.
    if (archivo.faltan.length > 0) {
      return {
        nuevas: [],
        aActualizar: [],
        informe: {
          estrategia,
          listo: false,
          ...mapeo,
          resumen: {
            total: archivo.filas.length, cargan: 0, nuevas: 0, actualizan: 0, con_error: 0,
            repetidas: 0, repetidas_en_archivo: 0, existentes: 0,
          },
          vista_previa: [],
          errores: [],
          repetidas: [],
        },
      };
    }

    const contexto = await this.repositorio.contexto(ranchoId);
    const valores = valoresAceptados(contexto);

    const errores: ErrorDeFila[] = [];
    const repetidas: Repetida[] = [];
    const nuevas: AnimalAImportar[] = [];
    const aActualizar: Clasificacion['aActualizar'] = [];
    const vistaPrevia: FilaPrevia[] = [];
    const vistos = new Set<string>();
    let repetidasEnArchivo = 0;
    let existentes = 0;

    for (const fila of archivo.filas) {
      const resultado = validarFila(fila, contexto, valores, archivo.unidadPeso);
      if ('motivo' in resultado) {
        errores.push(resultado);
        continue;
      }
      const animal = resultado;

      // HU-44, criterio 2: repetido dentro del archivo. Vale la primera aparición.
      if (vistos.has(animal.identificador)) {
        repetidas.push({ fila: fila.fila, identificador: animal.identificador, en: 'archivo' });
        repetidasEnArchivo++;
        continue;
      }
      vistos.add(animal.identificador);

      // HU-44, criterio 1: ya existe en el rancho.
      const existente = contexto.existentes.get(animal.identificador);
      if (existente) {
        repetidas.push({ fila: fila.fila, identificador: animal.identificador, en: 'rancho' });
        existentes++;
        if (estrategia === 'omitir') continue;
        aActualizar.push({ id: existente.id, corralActual: existente.corral_id, datos: animal });
      } else {
        nuevas.push(animal);
      }

      if (vistaPrevia.length < FILAS_DE_VISTA_PREVIA) {
        vistaPrevia.push({
          fila: fila.fila,
          accion: existente ? 'actualizar' : 'nueva',
          identificador: animal.identificador,
          tipo_identificador: animal.tipo_identificador,
          nombre: animal.nombre,
          raza: animal.raza,
          sexo: animal.sexo,
          categoria_codigo: animal.categoria_codigo,
          fecha_nacimiento: animal.fecha_nacimiento,
          origen: animal.origen,
          corral: animal.corral_id ? (contexto.nombresDeCorrales.get(animal.corral_id) ?? null) : null,
          peso_kg: animal.peso_kg,
        });
      }
    }

    return {
      nuevas,
      aActualizar,
      informe: {
        estrategia,
        listo: true,
        ...mapeo,
        resumen: {
          total: archivo.filas.length,
          cargan: nuevas.length + aActualizar.length,
          nuevas: nuevas.length,
          actualizan: aActualizar.length,
          con_error: errores.length,
          repetidas: repetidasEnArchivo + existentes,
          repetidas_en_archivo: repetidasEnArchivo,
          existentes,
        },
        vista_previa: vistaPrevia,
        errores,
        repetidas,
      },
    };
  }
}

/** Para cada columna con valores fijos: lo que se puede escribir (en los dos idiomas) → el código. */
interface ValoresAceptados {
  tipo: Map<string, AnimalAImportar['tipo_identificador']>;
  sexo: Map<string, AnimalAImportar['sexo']>;
  origen: Map<string, NonNullable<AnimalAImportar['origen']>>;
  categoria: Map<string, string>;
}

function valoresAceptados(contexto: ContextoRancho): ValoresAceptados {
  const armar = <T extends string>(prefijo: string, codigos: readonly T[], extras: Record<string, T> = {}) => {
    const mapa = new Map<string, T>();
    for (const codigo of codigos) {
      mapa.set(normalizar(codigo), codigo);
      for (const idioma of ['es', 'en']) mapa.set(normalizar(enIdioma(idioma, () => t(`${prefijo}.${codigo}`))), codigo);
    }
    for (const [texto, codigo] of Object.entries(extras)) mapa.set(texto, codigo);
    return mapa;
  };
  return {
    tipo: armar('animales.tiposIdentificador', ['caravana', 'interno', 'rfid'] as const),
    sexo: armar('animales.sexos', ['macho', 'hembra'] as const, { m: 'macho', h: 'hembra', f: 'hembra' }),
    origen: armar('animales.origenes', ['nacido', 'comprado', 'otro'] as const),
    categoria: armar('animales.categorias', contexto.categorias),
  };
}

function texto(valor: Valor | undefined): string | null {
  if (valor === null || valor === undefined) return null;
  const limpio = (valor instanceof Date ? valor.toISOString().slice(0, 10) : String(valor)).trim();
  return limpio || null;
}

function error(fila: FilaLeida, identificador: string | null, columna: Columna | null, clave: string, datos?: Record<string, string | number>): ErrorDeFila {
  return { fila: fila.fila, identificador, columna, motivo: t(`servidor.importacion.motivos.${clave}`, datos) };
}

/** Las mismas reglas que el alta a mano (HU-27, HU-28). Devuelve el animal o el primer error. */
function validarFila(
  fila: FilaLeida,
  contexto: ContextoRancho,
  valores: ValoresAceptados,
  unidadPeso: 'kg' | 'lb',
): AnimalAImportar | ErrorDeFila {
  const v = fila.valores;
  const identificador = texto(v.identificador);
  if (!identificador) return error(fila, null, 'identificador', 'sinIdentificador');
  if (identificador.length > 50) return error(fila, identificador, 'identificador', 'textoLargo', { n: 50 });

  let tipo: AnimalAImportar['tipo_identificador'] = 'caravana';
  if (texto(v.tipo_identificador)) {
    const encontrado = valores.tipo.get(normalizar(v.tipo_identificador));
    if (!encontrado) return error(fila, identificador, 'tipo_identificador', 'tipoInvalido', { valor: texto(v.tipo_identificador)! });
    tipo = encontrado;
  }

  const sexo = valores.sexo.get(normalizar(v.sexo));
  if (!sexo) return error(fila, identificador, 'sexo', 'sexoInvalido', { valor: texto(v.sexo) ?? '' });

  let categoria: string | null = null;
  if (texto(v.categoria)) {
    categoria = valores.categoria.get(normalizar(v.categoria)) ?? null;
    if (!categoria) return error(fila, identificador, 'categoria', 'categoriaInvalida', { valor: texto(v.categoria)! });
  }

  let nacimiento: string | null = null;
  if (texto(v.fecha_nacimiento)) {
    nacimiento = leerFecha(v.fecha_nacimiento!, contexto.formatoFecha);
    if (!nacimiento) return error(fila, identificador, 'fecha_nacimiento', 'fechaInvalida', { formato: contexto.formatoFecha });
    if (nacimiento > new Date().toISOString().slice(0, 10)) return error(fila, identificador, 'fecha_nacimiento', 'fechaFutura');
  }

  let origen: AnimalAImportar['origen'] = null;
  if (texto(v.origen)) {
    origen = valores.origen.get(normalizar(v.origen)) ?? null;
    if (!origen) return error(fila, identificador, 'origen', 'origenInvalido', { valor: texto(v.origen)! });
  }

  let corral: string | null = null;
  if (texto(v.corral)) {
    corral = contexto.corrales.get(texto(v.corral)!.toLowerCase()) ?? null;
    if (!corral) return error(fila, identificador, 'corral', 'corralInexistente', { valor: texto(v.corral)! });
  }

  let peso: number | null = null;
  if (texto(v.peso)) {
    const numero = typeof v.peso === 'number' ? v.peso : Number(String(v.peso).replace(',', '.'));
    if (!(numero > 0)) return error(fila, identificador, 'peso', 'pesoInvalido');
    // HU-26: se guarda siempre en kilos.
    peso = Math.round((unidadPeso === 'lb' ? numero * KG_POR_LIBRA : numero) * 100) / 100;
  }

  for (const columna of ['nombre', 'raza'] as const) {
    if ((texto(v[columna])?.length ?? 0) > 100) return error(fila, identificador, columna, 'textoLargo', { n: 100 });
  }

  return {
    identificador,
    tipo_identificador: tipo,
    nombre: texto(v.nombre),
    raza: texto(v.raza),
    sexo,
    categoria_codigo: categoria,
    fecha_nacimiento: nacimiento,
    origen,
    corral_id: corral,
    peso_kg: peso,
  };
}

/** Fecha de Excel, AAAA-MM-DD o el formato del país (DD/MM/YYYY o MM/DD/YYYY). */
function leerFecha(valor: Valor, formato: string): string | null {
  let anio: number, mes: number, dia: number;
  if (valor instanceof Date) {
    [anio, mes, dia] = [valor.getUTCFullYear(), valor.getUTCMonth() + 1, valor.getUTCDate()];
  } else {
    const limpio = String(valor).trim();
    const iso = limpio.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    const local = limpio.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
    if (iso) {
      [anio, mes, dia] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
    } else if (local) {
      const mesPrimero = formato.startsWith('MM');
      anio = Number(local[3]);
      mes = Number(mesPrimero ? local[1] : local[2]);
      dia = Number(mesPrimero ? local[2] : local[1]);
    } else {
      return null;
    }
  }
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  if (fecha.getUTCFullYear() !== anio || fecha.getUTCMonth() !== mes - 1 || fecha.getUTCDate() !== dia) return null;
  return fecha.toISOString().slice(0, 10);
}
