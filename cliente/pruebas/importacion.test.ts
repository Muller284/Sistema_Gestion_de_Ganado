import { describe, expect, it } from 'vitest';
import { aBase64, informeDeErrores } from '../src/servicios/importacion';

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
