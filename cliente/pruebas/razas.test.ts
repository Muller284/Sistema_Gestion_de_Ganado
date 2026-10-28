import { describe, expect, it } from 'vitest';
import { OTRA_RAZA, RAZAS, razaAGuardar, razaEnFormulario } from '../src/servicios/razas';

/** HU-28 · La raza se elige de una lista, con «Otra» para escribirla. */

describe('lista de razas', () => {
  it('trae razas de todo el mundo, de carne, leche y doble propósito, sin repetir', () => {
    expect(RAZAS).toContain('Wagyu');
    expect(RAZAS).toContain('Fleckvieh');
    expect(RAZAS).toContain('Nelore');
    expect(RAZAS).toContain('Holstein');
    expect(new Set(RAZAS).size).toBe(RAZAS.length);
  });

  it('una raza guardada de la lista se muestra elegida, sin importar mayúsculas', () => {
    expect(razaEnFormulario('nelore')).toEqual({ opcion: 'Nelore', otra: '' });
  });

  it('una raza que no está en la lista se muestra en «Otra» con su texto', () => {
    expect(razaEnFormulario('Blanco Orejinegro')).toEqual({ opcion: OTRA_RAZA, otra: 'Blanco Orejinegro' });
  });

  it('sin raza, nada elegido', () => {
    expect(razaEnFormulario(null)).toEqual({ opcion: '', otra: '' });
  });

  it('se guarda la elegida, lo escrito en «Otra» o nada', () => {
    expect(razaAGuardar('Gyr', '')).toBe('Gyr');
    expect(razaAGuardar(OTRA_RAZA, '  Blanco Orejinegro ')).toBe('Blanco Orejinegro');
    expect(razaAGuardar(OTRA_RAZA, '   ')).toBeNull();
    expect(razaAGuardar('', '')).toBeNull();
  });
});
