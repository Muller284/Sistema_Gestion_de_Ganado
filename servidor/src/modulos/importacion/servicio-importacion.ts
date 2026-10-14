import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { UsuarioActual } from '../../comun/repositorio-usuario-actual';
import { PermisosModulo } from '../../comun/permisos-modulo';
import { t } from '../../comun/idioma';

export interface FilaAnimalImportacion {
  caravana: string;
  especie?: string;
  raza?: string;
  sexo: string;
  fecha_nacimiento?: string;
  peso_actual?: number;
  categoria?: string;
  corral?: string;
}

export interface ResultadoValidacion {
  total: number;
  validas: number;
  con_errores: number;
  duplicados: number;
  errores: { fila: number; caravana?: string; error: string }[];
  filas_duplicadas: string[];
  datos_validos: FilaAnimalImportacion[];
}

@Injectable()
export class ServicioImportacion {
  // Simulador de almacenamiento de animales por rancho para Fase 2 (HU-40 a HU-45)
  private readonly animalesPorRancho = new Map<string, Map<string, FilaAnimalImportacion>>();

  constructor(private readonly permisos: PermisosModulo) {
    // Precargar animales de prueba para Rancho El Cerrito
    const ranchoCerrito = new Map<string, FilaAnimalImportacion>();
    ranchoCerrito.set('4471', {
      caravana: '4471',
      especie: 'Bovino',
      raza: 'Nelore',
      sexo: 'hembra',
      fecha_nacimiento: '2024-05-12',
      peso_actual: 380,
      categoria: 'Vaquilla',
      corral: 'Corral 2',
    });
    ranchoCerrito.set('4120', {
      caravana: '4120',
      especie: 'Bovino',
      raza: 'Brahman',
      sexo: 'macho',
      fecha_nacimiento: '2023-11-04',
      peso_actual: 420,
      categoria: 'Novillo',
      corral: 'Corral Norte',
    });
    this.animalesPorRancho.set('a0000000-0000-4000-8000-000000000001', ranchoCerrito);
  }

  obtenerPlantilla(): { encabezados: string[]; ejemplo: string; contenidoCsv: string } {
    const encabezados = [
      'caravana',
      'especie',
      'raza',
      'sexo',
      'fecha_nacimiento',
      'peso_actual',
      'categoria',
      'corral',
    ];
    const lineas = [
      encabezados.join(','),
      '5001,Bovino,Nelore,hembra,2024-06-15,310.5,Ternera,Corral 1',
      '5002,Bovino,Brangus,macho,2024-02-10,415.0,Novillo,Corral 3',
      '5003,Bovino,Criollo,hembra,2023-08-20,490.0,Vaca,Corral 1',
    ];
    return {
      encabezados,
      ejemplo: lineas.slice(1).join('\n'),
      contenidoCsv: lineas.join('\n'),
    };
  }

  async validar(cuerpo: any, usuario: UsuarioActual): Promise<ResultadoValidacion> {
    const ranchoId = await this.permisos.exigir(usuario, 'importacion', 'editar');
    const csvTexto = typeof cuerpo?.csv === 'string' ? cuerpo.csv : '';
    const filasEntrada: any[] = Array.isArray(cuerpo?.filas) ? cuerpo.filas : [];

    let filasParaValidar: any[] = [];

    if (csvTexto.trim()) {
      filasParaValidar = this.parsearCsv(csvTexto);
    } else if (filasEntrada.length > 0) {
      filasParaValidar = filasEntrada;
    } else {
      throw new BadRequestException(t('servidor.importacion.sinContenido'));
    }

    const errores: { fila: number; caravana?: string; error: string }[] = [];
    const duplicadosEnRancho: string[] = [];
    const caravanasVistasEnArchivo = new Set<string>();
    const datosValidos: FilaAnimalImportacion[] = [];

    const animalesExistentes = this.obtenerAnimalesDeRancho(ranchoId);

    filasParaValidar.forEach((fila, idx) => {
      const numFila = idx + 1;
      const caravana = String(fila.caravana || '').trim();

      if (!caravana) {
        errores.push({ fila: numFila, error: t('servidor.importacion.caravanaObligatoria') });
        return;
      }

      if (caravanasVistasEnArchivo.has(caravana)) {
        errores.push({ fila: numFila, caravana, error: t('servidor.importacion.caravanaRepetida') });
        return;
      }
      caravanasVistasEnArchivo.add(caravana);

      const sexo = String(fila.sexo || '').trim().toLowerCase();
      if (!sexo || !['macho', 'hembra', 'm', 'h'].includes(sexo)) {
        errores.push({ fila: numFila, caravana, error: t('servidor.importacion.sexoInvalido') });
        return;
      }

      let pesoNum: number | undefined;
      if (fila.peso_actual !== undefined && fila.peso_actual !== null && fila.peso_actual !== '') {
        pesoNum = Number(fila.peso_actual);
        if (isNaN(pesoNum) || pesoNum <= 0) {
          errores.push({ fila: numFila, caravana, error: t('servidor.importacion.pesoInvalido') });
          return;
        }
      }

      // Detectar si ya existe en la base de datos del rancho
      if (animalesExistentes.has(caravana)) {
        duplicadosEnRancho.push(caravana);
      }

      datosValidos.push({
        caravana,
        especie: fila.especie ? String(fila.especie).trim() : 'Bovino',
        raza: fila.raza ? String(fila.raza).trim() : 'Mestizo',
        sexo: ['macho', 'm'].includes(sexo) ? 'macho' : 'hembra',
        fecha_nacimiento: fila.fecha_nacimiento ? String(fila.fecha_nacimiento).trim() : undefined,
        peso_actual: pesoNum,
        categoria: fila.categoria ? String(fila.categoria).trim() : undefined,
        corral: fila.corral ? String(fila.corral).trim() : undefined,
      });
    });

    return {
      total: filasParaValidar.length,
      validas: datosValidos.length,
      con_errores: errores.length,
      duplicados: duplicadosEnRancho.length,
      errores,
      filas_duplicadas: duplicadosEnRancho,
      datos_validos: datosValidos,
    };
  }

  async ejecutar(cuerpo: any, usuario: UsuarioActual) {
    const ranchoId = await this.permisos.exigir(usuario, 'importacion', 'editar');
    const validacion = await this.validar(cuerpo, usuario);

    if (validacion.con_errores > 0) {
      throw new BadRequestException(
        t('servidor.importacion.archivoConErrores', { cantidad: validacion.con_errores }),
      );
    }

    const estrategia = (cuerpo?.estrategia_duplicados || 'omitir').toLowerCase();
    const mapaRancho = this.obtenerAnimalesDeRancho(ranchoId);

    let insertados = 0;
    let actualizados = 0;
    let omitidos = 0;

    for (const animal of validacion.datos_validos) {
      const yaExiste = mapaRancho.has(animal.caravana);
      if (yaExiste) {
        if (estrategia === 'actualizar') {
          mapaRancho.set(animal.caravana, animal);
          actualizados++;
        } else {
          omitidos++;
        }
      } else {
        mapaRancho.set(animal.caravana, animal);
        insertados++;
      }
    }

    return {
      exito: true,
      mensaje: t('servidor.importacion.completada', { insertados, actualizados, omitidos }),
      resumen: {
        total_procesados: validacion.validas,
        insertados,
        actualizados,
        omitidos,
      },
    };
  }

  private parsearCsv(contenido: string): any[] {
    const lineas = contenido.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
    if (lineas.length <= 1) return [];

    const encabezados = lineas[0].split(',').map((h) => h.trim().toLowerCase());
    const filas: any[] = [];

    for (let i = 1; i < lineas.length; i++) {
      const valores = lineas[i].split(',').map((v) => v.trim());
      const filaObj: Record<string, string> = {};
      encabezados.forEach((h, colIdx) => {
        filaObj[h] = valores[colIdx] || '';
      });
      filas.push(filaObj);
    }
    return filas;
  }

  private obtenerAnimalesDeRancho(ranchoId: string): Map<string, FilaAnimalImportacion> {
    if (!this.animalesPorRancho.has(ranchoId)) {
      this.animalesPorRancho.set(ranchoId, new Map());
    }
    return this.animalesPorRancho.get(ranchoId)!;
  }
}