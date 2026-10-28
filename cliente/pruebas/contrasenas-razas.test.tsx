import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CampoContrasena } from '../src/componentes';
import { api, type Animal } from '../src/servicios/api';
import { t } from '../src/servicios/idioma';
import { REGIONAL_POR_DEFECTO } from '../src/servicios/unidades';
import { PaginaRegistro } from '../src/paginas/registro/PaginaRegistro';
import { FormularioFicha } from '../src/paginas/animales/FormularioFicha';
import { nombreRaza } from '../src/paginas/animales/razas';

/**
 * Ajustes de cierre del Sprint 3:
 *   - Toda contraseña tiene el ojo para ver lo escrito, y al crearla o
 *     cambiarla se escribe dos veces.
 *   - La raza se elige de una lista fija agrupada; la categoría es
 *     obligatoria.
 */

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Contraseñas', () => {
  it('el ojo muestra y vuelve a ocultar lo escrito', () => {
    render(<CampoContrasena etiqueta="Clave" value="Secreta1" onChange={() => undefined} />);
    const campo = screen.getByLabelText('Clave') as HTMLInputElement;
    expect(campo.type).toBe('password');
    const ojo = screen.getByRole('button', { name: t('comun.contrasena.mostrar') });
    expect(ojo.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(ojo);
    expect(campo.type).toBe('text');
    const cerrar = screen.getByRole('button', { name: t('comun.contrasena.ocultar') });
    expect(cerrar.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(cerrar);
    expect(campo.type).toBe('password');
  });

  it('el ojo no envía el formulario', () => {
    const enviar = vi.fn((e: React.FormEvent) => e.preventDefault());
    render(
      <form onSubmit={enviar}>
        <CampoContrasena etiqueta="Clave" value="" onChange={() => undefined} />
      </form>,
    );
    fireEvent.click(screen.getByRole('button', { name: t('comun.contrasena.mostrar') }));
    expect(enviar).not.toHaveBeenCalled();
  });

  it('el registro pide repetir la contraseña y no crea la cuenta si no coinciden', async () => {
    vi.spyOn(api, 'paises').mockResolvedValue([{ codigo: 'BO', nombre: 'Bolivia' }]);
    const registrar = vi.spyOn(api, 'registrar');
    render(
      <MemoryRouter>
        <PaginaRegistro />
      </MemoryRouter>,
    );
    const contrasena = (await screen.findByLabelText(new RegExp(`^${t('acceso.comun.contrasena')}`))) as HTMLInputElement;
    const repetir = screen.getByLabelText(new RegExp(t('acceso.comun.repetirContrasena'))) as HTMLInputElement;
    expect(contrasena.type).toBe('password');
    expect(repetir.type).toBe('password');

    fireEvent.change(screen.getByLabelText(new RegExp(t('acceso.registro.nombre'))), { target: { value: 'Ana Pérez' } });
    fireEvent.change(screen.getByLabelText(new RegExp(t('acceso.comun.correo'))), { target: { value: 'ana@prueba.bo' } });
    fireEvent.change(contrasena, { target: { value: 'Ganado2026' } });
    fireEvent.change(repetir, { target: { value: 'Ganado2027' } });
    expect(screen.getAllByText(t('acceso.comun.noCoinciden')).length).toBeGreaterThan(0);

    fireEvent.submit(contrasena.closest('form')!);
    await waitFor(() => expect(screen.getAllByText(t('acceso.comun.noCoinciden')).length).toBeGreaterThan(1));
    expect(registrar).not.toHaveBeenCalled();
  });

  it('cada pantalla con contraseña tiene su ojo', async () => {
    vi.spyOn(api, 'paises').mockResolvedValue([{ codigo: 'BO', nombre: 'Bolivia' }]);
    render(
      <MemoryRouter>
        <PaginaRegistro />
      </MemoryRouter>,
    );
    await screen.findByLabelText(new RegExp(t('acceso.comun.repetirContrasena')));
    expect(screen.getAllByRole('button', { name: t('comun.contrasena.mostrar') })).toHaveLength(2);
  });
});

describe('Raza y categoría en la ficha', () => {
  const GRUPOS = [
    { grupo: 'cebuinas', razas: ['nelore', 'brahman'] },
    { grupo: 'otras', razas: ['cruza', 'otra'] },
  ];

  function preparar() {
    vi.spyOn(api, 'categoriasAnimal').mockResolvedValue(['vaca', 'toro']);
    vi.spyOn(api, 'razasAnimal').mockResolvedValue(GRUPOS);
    vi.spyOn(api, 'corrales').mockResolvedValue([]);
  }

  it('la raza es una lista agrupada con el nombre de cada una', async () => {
    preparar();
    render(<FormularioFicha regional={REGIONAL_POR_DEFECTO} alGuardar={() => undefined} alCancelar={() => undefined} />);
    const lista = (await screen.findByLabelText(t('animales.campos.raza'))) as HTMLSelectElement;
    expect(lista.tagName).toBe('SELECT');
    await waitFor(() => expect(lista.querySelectorAll('optgroup')).toHaveLength(2));
    const cebuinas = lista.querySelector(`optgroup[label="${t('animales.gruposRaza.cebuinas')}"]`) as HTMLElement;
    expect(within(cebuinas).getByText(t('animales.razas.nelore'))).toBeTruthy();
    expect(within(lista).getByText(t('animales.razas.otra'))).toBeTruthy();
  });

  it('sin categoría no se puede guardar; con categoría, sí, y se manda el código de la raza', async () => {
    preparar();
    const crear = vi.spyOn(api, 'crearAnimal').mockResolvedValue({ animal: { id: 'a-1' } as Animal, mensaje: 'Listo.' });
    render(<FormularioFicha regional={REGIONAL_POR_DEFECTO} alGuardar={() => undefined} alCancelar={() => undefined} />);
    await screen.findByText(t('animales.razas.brahman'));
    fireEvent.change(screen.getByPlaceholderText(t('animales.campos.identificadorEjemplo')), { target: { value: '4471' } });
    fireEvent.change(screen.getByLabelText(new RegExp(t('animales.campos.sexo'))), { target: { value: 'hembra' } });
    fireEvent.change(screen.getByLabelText(t('animales.campos.raza')), { target: { value: 'brahman' } });
    const guardar = screen.getByRole('button', { name: t('comun.guardar') }) as HTMLButtonElement;
    expect(guardar.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText(new RegExp(t('animales.campos.categoria'))), { target: { value: 'vaca' } });
    expect(guardar.disabled).toBe(false);
    fireEvent.click(guardar);
    await waitFor(() => expect(crear).toHaveBeenCalled());
    expect(crear.mock.calls[0][0]).toMatchObject({ raza: 'brahman', categoria_codigo: 'vaca' });
  });

  it('una raza escrita antes de la lista se ofrece tal cual para no perderla', async () => {
    preparar();
    const animal = { id: 'a-1', identificador: '4471', raza: 'Nelore puro', sexo: 'hembra', categoria_codigo: 'vaca' } as Animal;
    render(<FormularioFicha animal={animal} regional={REGIONAL_POR_DEFECTO} alGuardar={() => undefined} alCancelar={() => undefined} />);
    const lista = (await screen.findByLabelText(t('animales.campos.raza'))) as HTMLSelectElement;
    await screen.findByText(t('animales.razas.brahman'));
    expect(lista.value).toBe('Nelore puro');
  });

  it('el nombre de la raza: el del idioma si está en la lista, si no el texto guardado', () => {
    expect(nombreRaza('pardo_suizo')).toBe(t('animales.razas.pardo_suizo'));
    expect(nombreRaza('Nelore puro')).toBe('Nelore puro');
    expect(nombreRaza(null)).toBeNull();
  });
});
