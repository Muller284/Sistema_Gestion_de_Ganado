import { describe, expect, it } from 'vitest';
import { OTRA_RAZA, RAZAS, razaAGuardar, razaEnFormulario } from '../src/servicios/razas';

/** HU-28 · La raza se elige de una lista, con «Otra» para escribirla. */

describe('lista de razas', () => {
  it('trae las razas comunes de carne y de leche, sin repetir', () => {
    expect(RAZAS).toContain('Nelore');
    expect(RAZAS).toContain('Holstein');
    expect(new Set(RAZAS).size).toBe(RAZAS.length);
  });

  it('una raza guardada de la lista se muestra elegida, sin importar mayúsculas', () => {
    expect(razaEnFormulario('nelore')).toEqual({ opcion: 'Nelore', otra: '' });
  });

  it('una raza que no está en la lista se muestra en «Otra» con su texto', () => {
    expect(razaEnFormulario('Romosinuano')).toEqual({ opcion: OTRA_RAZA, otra: 'Romosinuano' });
  });

  it('sin raza, nada elegido', () => {
    expect(razaEnFormulario(null)).toEqual({ opcion: '', otra: '' });
  });

  it('se guarda la elegida, lo escrito en «Otra» o nada', () => {
    expect(razaAGuardar('Gyr', '')).toBe('Gyr');
    expect(razaAGuardar(OTRA_RAZA, '  Romosinuano ')).toBe('Romosinuano');
    expect(razaAGuardar(OTRA_RAZA, '   ')).toBeNull();
    expect(razaAGuardar('', '')).toBeNull();
  });
});
