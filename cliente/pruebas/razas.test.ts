import { describe, expect, it } from 'vitest';
import type { Raza } from '../src/servicios/api';
import {
  agruparRazas,
  buscarRazas,
  claveDeRaza,
  esRazaNueva,
  razaAGuardar,
  razaConocida,
} from '../src/servicios/razas';

/**
 * HU-28 · La raza se elige de una lista que se filtra al escribir: el
 * catálogo mundial y las propias del rancho. Lo que no está se guarda como
 * raza nueva.
 */

const RAZAS: Raza[] = [
  { nombre: 'Braford', grupo: 'carne' },
  { nombre: 'Brahman', grupo: 'carne' },
  { nombre: 'Nelore', grupo: 'carne' },
  { nombre: 'Simbrah', grupo: 'carne' },
  { nombre: 'Holstein', grupo: 'leche' },
  { nombre: 'Guzerá', grupo: 'doble' },
  { nombre: 'Gyr', grupo: 'doble' },
  { nombre: 'Blanco Orejinegro', grupo: null },
];

describe('lista de razas', () => {
  it('agrupa en carne, leche, doble propósito y las propias del rancho, en ese orden', () => {
    expect(agruparRazas(RAZAS).map((g) => g.grupo)).toEqual(['carne', 'leche', 'doble', 'propias']);
  });

  it('no muestra grupos vacíos', () => {
    expect(agruparRazas([{ nombre: 'Nelore', grupo: 'carne' }]).map((g) => g.grupo)).toEqual(['carne']);
  });

  it('la clave ignora mayúsculas, acentos y espacios de más', () => {
    expect(claveDeRaza('  NELÓRE ')).toBe('nelore');
  });
});

describe('buscador de razas', () => {
  it('sin texto muestra todas', () => {
    expect(buscarRazas(RAZAS, '  ').flatMap((g) => g.razas)).toHaveLength(RAZAS.length);
  });

  it('filtra por cualquier parte del nombre', () => {
    expect(buscarRazas(RAZAS, 'bra')).toEqual([{ grupo: 'carne', razas: ['Braford', 'Brahman', 'Simbrah'] }]);
  });

  it('no importan mayúsculas ni acentos', () => {
    expect(buscarRazas(RAZAS, 'GUZERA').flatMap((g) => g.razas)).toEqual(['Guzerá']);
    expect(buscarRazas(RAZAS, 'orejinegro').flatMap((g) => g.razas)).toEqual(['Blanco Orejinegro']);
  });

  it('si nada coincide, la lista queda vacía', () => {
    expect(buscarRazas(RAZAS, 'lucerna')).toEqual([]);
  });

  it('reconoce una raza de la lista aunque esté escrita distinto', () => {
    expect(razaConocida(RAZAS, 'nelóre')?.nombre).toBe('Nelore');
    expect(esRazaNueva(RAZAS, 'nelóre')).toBe(false);
  });

  it('lo que no está en la lista es una raza nueva; vacío no lo es', () => {
    expect(esRazaNueva(RAZAS, 'Lucerna')).toBe(true);
    expect(esRazaNueva(RAZAS, '   ')).toBe(false);
  });

  it('se manda el nombre de la lista, lo escrito limpio o nada', () => {
    expect(razaAGuardar(RAZAS, 'gyr')).toBe('Gyr');
    expect(razaAGuardar(RAZAS, '  Lucerna   Roja ')).toBe('Lucerna Roja');
    expect(razaAGuardar(RAZAS, '   ')).toBeNull();
  });
});
