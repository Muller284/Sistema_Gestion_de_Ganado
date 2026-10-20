import { describe, expect, it } from 'vitest';
import type { ColumnaDelArchivo, ColumnaImportacion } from '../src/servicios/api';
import {
  aBase64,
  camposDisponibles,
  columnasListas,
  informeDeErrores,
  limpiarAsignaciones,
  noReconocidas,
  obligatoriasSinAsignar,
  reconocidas,
  sinDecidir,
} from '../src/servicios/importacion';

/**
 * HU-43 · Criterio 3: el detalle de errores indica número de fila y motivo, y
 * se puede descargar.
 */

const TITULOS = {
  fila: 'Fila',
  identificador: 'Identificador',
  motivo: 'Motivo',
  repetidaEnArchivo: 'Repetido en el archivo',
  repetidaEnRancho: 'Ya existe en el rancho',
};

describe('HU-43 · informe de errores descargable', () => {
  it('lleva fila, identificador y motivo, ordenado por fila', () => {
    const csv = informeDeErrores(
      [{ fila: 5, identificador: 'A-3', columna: 'sexo', motivo: 'Sexo no válido' }],
      [{ fila: 2, identificador: 'A-1', en: 'rancho' }],
      TITULOS,
    );
    const lineas = csv.replace('﻿', '').trim().split('\r\n');
    expect(lineas[0]).toBe('Fila,Identificador,Motivo');
    expect(lineas[1]).toBe('2,A-1,Ya existe en el rancho');
    expect(lineas[2]).toBe('5,A-3,Sexo no válido');
  });

  it('pone entre comillas lo que tiene comas o comillas', () => {
    const csv = informeDeErrores(
      [{ fila: 3, identificador: null, columna: null, motivo: 'Falta "x", y algo más' }],
      [],
      TITULOS,
    );
    expect(csv).toContain('3,,"Falta ""x"", y algo más"');
  });

  it('empieza con BOM para que Excel respete los acentos', () => {
    expect(informeDeErrores([], [], TITULOS).startsWith('﻿')).toBe(true);
  });
});

describe('HU-43 · el archivo viaja en base64', () => {
  it('convierte los bytes sin perder nada', async () => {
    const texto = 'Identificador;Sexo\nñandú;hembra\n';
    const base64 = await aBase64(new Blob([texto]));
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    expect(new TextDecoder().decode(bytes)).toBe(texto);
  });
});

/**
 * HU-41 y HU-42 · Lo que la pantalla decide con las columnas que devolvió el
 * servidor: qué mostrar como reconocido, qué pedir y cuándo dejar continuar.
 */
const CAMPOS: ColumnaImportacion[] = [
  'identificador',
  'tipo_identificador',
  'nombre',
  'raza',
  'sexo',
  'categoria',
  'fecha_nacimiento',
  'origen',
  'corral',
  'peso',
];

const COLUMNAS: ColumnaDelArchivo[] = [
  { posicion: 0, encabezado: 'Animal', campo: null, como: null },
  { posicion: 1, encabezado: 'Género', campo: 'sexo', como: 'variante' },
  { posicion: 2, encabezado: 'Raza', campo: 'raza', como: 'plantilla' },
  { posicion: 3, encabezado: 'Color', campo: null, como: null },
];

describe('HU-41 · columnas reconocidas', () => {
  it('separa las reconocidas de las que hay que pedir', () => {
    expect(reconocidas(COLUMNAS).map((c) => c.encabezado)).toEqual(['Género', 'Raza']);
    expect(noReconocidas(COLUMNAS).map((c) => c.encabezado)).toEqual(['Animal', 'Color']);
  });
});

describe('HU-42 · asignación manual', () => {
  it('criterio 1: solo se piden las no reconocidas', () => {
    expect(sinDecidir(COLUMNAS, {}).map((c) => c.posicion)).toEqual([0, 3]);
  });

  it('criterio 2: la lista ofrece solo los campos libres', () => {
    const disponibles = camposDisponibles(CAMPOS, COLUMNAS, { 3: 'nombre' }, 0);
    expect(disponibles).not.toContain('sexo');
    expect(disponibles).not.toContain('raza');
    expect(disponibles).not.toContain('nombre');
    expect(disponibles).toContain('identificador');
    // El campo que ya eligió esta misma columna sigue en su lista.
    expect(camposDisponibles(CAMPOS, COLUMNAS, { 3: 'nombre' }, 3)).toContain('nombre');
  });

  it('criterio 3: una columna ignorada ya está decidida y no ocupa campo', () => {
    expect(sinDecidir(COLUMNAS, { 3: 'ignorar' }).map((c) => c.posicion)).toEqual([0]);
    expect(camposDisponibles(CAMPOS, COLUMNAS, { 3: 'ignorar' }, 0)).toContain('nombre');
  });

  it('no deja continuar mientras falte una obligatoria o haya columnas sin decidir', () => {
    expect(obligatoriasSinAsignar(COLUMNAS, {})).toEqual(['identificador']);
    expect(columnasListas(COLUMNAS, { 3: 'ignorar' })).toBe(false);
    expect(columnasListas(COLUMNAS, { 0: 'identificador' })).toBe(false);
    expect(columnasListas(COLUMNAS, { 0: 'identificador', 3: 'ignorar' })).toBe(true);
  });

  it('manda al servidor solo lo de las columnas no reconocidas', () => {
    expect(limpiarAsignaciones(COLUMNAS, { 0: 'identificador', 1: 'nombre', 3: 'ignorar' })).toEqual({
      0: 'identificador',
      3: 'ignorar',
    });
  });
});
