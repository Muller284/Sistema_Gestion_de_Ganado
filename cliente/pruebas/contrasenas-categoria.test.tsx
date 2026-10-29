import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CampoContrasena } from '../src/componentes';
import { api, type Animal } from '../src/servicios/api';
import { t } from '../src/servicios/idioma';
import { REGIONAL_POR_DEFECTO } from '../src/servicios/unidades';
import { PaginaRegistro } from '../src/paginas/registro/PaginaRegistro';
import { FormularioFicha } from '../src/paginas/animales/FormularioFicha';

/**
 * Ajustes de cierre del Sprint 3:
 *   - Toda contraseña tiene el ojo para ver lo escrito, y al crearla o
 *     cambiarla se escribe dos veces.
 *   - La categoría es obligatoria. (La raza es de Romina, HU-28: ver
 *     razas.test.ts.)
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

describe('Categoría obligatoria en la ficha', () => {
  function preparar() {
    vi.spyOn(api, 'categoriasAnimal').mockResolvedValue(['vaca', 'toro']);
    vi.spyOn(api, 'razas').mockResolvedValue([{ nombre: 'Nelore', grupo: 'carne' }]);
    vi.spyOn(api, 'reglasCategorias').mockResolvedValue([]);
    vi.spyOn(api, 'corrales').mockResolvedValue([]);
  }

  it('sin categoría no se puede guardar; con categoría, sí', async () => {
    preparar();
    const crear = vi.spyOn(api, 'crearAnimal').mockResolvedValue({ animal: { id: 'a-1' } as Animal, mensaje: 'Listo.' });
    render(<FormularioFicha regional={REGIONAL_POR_DEFECTO} alGuardar={() => undefined} alCancelar={() => undefined} />);
    await screen.findByText(t('animales.categorias.vaca'));
    fireEvent.change(screen.getByPlaceholderText(t('animales.campos.identificadorEjemplo')), { target: { value: '4471' } });
    fireEvent.change(screen.getByLabelText(new RegExp(t('animales.campos.sexo'))), { target: { value: 'hembra' } });
    const guardar = screen.getByRole('button', { name: t('comun.guardar') }) as HTMLButtonElement;
    expect(guardar.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText(new RegExp(t('animales.campos.categoria'))), { target: { value: 'vaca' } });
    expect(guardar.disabled).toBe(false);
    fireEvent.click(guardar);
    await waitFor(() => expect(crear).toHaveBeenCalled());
    expect(crear.mock.calls[0][0]).toMatchObject({ categoria_codigo: 'vaca' });
  });
});
