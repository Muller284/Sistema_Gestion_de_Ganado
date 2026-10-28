import { describe, expect, it } from 'vitest';
import type { Raza } from '../src/servicios/api';
import { OTRA_RAZA, agruparRazas, claveDeRaza, razaAGuardar, razaEnFormulario } from '../src/servicios/razas';

/**
 * HU-28 · La raza se elige de una lista: el catálogo mundial y las propias del
 * rancho. «Otra» permite escribir una nueva.
 */

const RAZAS: Raza[] = [
  { nombre: 'Nelore', grupo: 'carne' },
  { nombre: 'Holstein', grupo: 'leche' },
  { nombre: 'Gyr', grupo: 'doble' },
  { nombre: 'Blanco Orejinegro', grupo: null },
];

describe('lista de razas', () => {
  it('agrupa en carne, leche, doble propósito y las propias del rancho, en ese orden', () => {
    expect(agruparRazas(RAZAS)).toEqual([
      { grupo: 'carne', razas: ['Nelore'] },
      { grupo: 'leche', razas: ['Holstein'] },
      { grupo: 'doble', razas: ['Gyr'] },
      { grupo: 'propias', razas: ['Blanco Orejinegro'] },
    ]);
  });

  it('no muestra grupos vacíos', () => {
    expect(agruparRazas([{ nombre: 'Nelore', grupo: 'carne' }]).map((g) => g.grupo)).toEqual(['carne']);
  });

  it('la clave ignora mayúsculas, acentos y espacios de más', () => {
    expect(claveDeRaza('  NELÓRE ')).toBe('nelore');
  });

  it('una raza guardada de la lista se muestra elegida, aunque esté escrita distinto', () => {
    expect(razaEnFormulario('nelore', RAZAS)).toEqual({ opcion: 'Nelore', otra: '' });
    expect(razaEnFormulario('blanco orejinegro', RAZAS)).toEqual({ opcion: 'Blanco Orejinegro', otra: '' });
  });

  it('una raza que no está en la lista se muestra en «Otra» con su texto', () => {
    expect(razaEnFormulario('Lucerna', RAZAS)).toEqual({ opcion: OTRA_RAZA, otra: 'Lucerna' });
  });

  it('sin raza, nada elegido', () => {
    expect(razaEnFormulario(null, RAZAS)).toEqual({ opcion: '', otra: '' });
  });

  it('se manda la elegida, lo escrito en «Otra» o nada', () => {
    expect(razaAGuardar('Gyr', '')).toBe('Gyr');
    expect(razaAGuardar(OTRA_RAZA, '  Lucerna ')).toBe('Lucerna');
    expect(razaAGuardar(OTRA_RAZA, '   ')).toBeNull();
    expect(razaAGuardar('', '')).toBeNull();
  });
});
