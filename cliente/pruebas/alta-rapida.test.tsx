import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MemoryRouter } from 'react-router-dom';
import { api, type Animal, type MisPermisos } from '../src/servicios/api';
import { t } from '../src/servicios/idioma';
import { PaginaAltaRapida } from '../src/paginas/animales/PaginaAltaRapida';

/**
 * HU-35 · Registro de animal desde el celular.
 *
 *   1. El formulario móvil pide solo identificador, categoría y sexo.
 *   2. Todos los elementos tocables miden al menos 48 píxeles de alto.
 *   3. Las acciones principales están en la mitad inferior de la pantalla.
 *   4. Puedo encadenar varias altas sin volver al listado.
 *
 * jsdom no calcula estilos, así que los criterios 2 y 3 se comprueban en las
 * reglas de animal.css y tokens.css que usa la pantalla.
 */

const CATEGORIAS = ['ternero', 'ternera', 'torito', 'vaquilla', 'novillo', 'vaca', 'toro', 'buey'];

function animalCreado(identificador: string, categoria: string, sexo: Animal['sexo']): Animal {
  return {
    id: `id-${identificador}`,
    identificador,
    tipo_identificador: 'caravana',
    nombre: null,
    raza: null,
    sexo,
    categoria_codigo: categoria,
    fecha_nacimiento: null,
    origen: null,
    peso_kg: null,
    corral_id: null,
    corral_nombre: null,
    estado: 'activo',
    creado_en: '2026-10-21T12:00:00.000Z',
    modificado_en: '2026-10-21T12:00:00.000Z',
    creado_por_nombre: 'Roberto Justiniano',
    modificado_por_nombre: 'Roberto Justiniano',
    eliminado_en: null,
  };
}

function preparar(permisos: MisPermisos = { animales: 'editar' }) {
  vi.spyOn(api, 'miRancho').mockResolvedValue({
    usuario: { id: 'u-4', nombre: 'Roberto Justiniano', rol: 'colaborador' },
    tieneRancho: true,
    rancho: null,
  });
  vi.spyOn(api, 'misPermisos').mockResolvedValue(permisos);
  vi.spyOn(api, 'categoriasAnimal').mockResolvedValue(CATEGORIAS);
  return vi.spyOn(api, 'crearAnimal').mockImplementation(async (datos) => ({
    animal: animalCreado(datos.identificador, datos.categoria_codigo ?? '', datos.sexo),
    mensaje: `Listo, registraste el animal ${datos.identificador}.`,
  }));
}

function abrir() {
  render(
    <MemoryRouter>
      <PaginaAltaRapida />
    </MemoryRouter>,
  );
}

function campoIdentificador() {
  return screen.getByLabelText(new RegExp(t('animales.altaRapida.identificador'))) as HTMLInputElement;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('HU-35 · el formulario', () => {
  beforeEach(() => {
    preparar();
  });

  it('criterio 1: solo identificador, categoría y sexo', async () => {
    abrir();
    await screen.findByText(t('animales.categorias.vaca'));
    const formulario = document.querySelector('form.alta-rapida')!;
    // Un único campo de texto y ninguna lista desplegable.
    expect(formulario.querySelectorAll('input')).toHaveLength(1);
    expect(formulario.querySelectorAll('select, textarea')).toHaveLength(0);
    const grupos = [...formulario.querySelectorAll('fieldset legend')].map((l) => l.textContent);
    expect(grupos).toEqual([t('animales.altaRapida.categoria'), t('animales.altaRapida.sexo')]);
  });

  it('elegir la categoría marca el sexo que le corresponde', async () => {
    abrir();
    fireEvent.click(await screen.findByText(t('animales.categorias.toro')));
    expect(screen.getByText(t('animales.sexos.macho')).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByText(t('animales.categorias.vaquilla')));
    expect(screen.getByText(t('animales.sexos.hembra')).getAttribute('aria-pressed')).toBe('true');
  });

  it('registrar no se puede hasta tener los tres datos', async () => {
    abrir();
    const registrar = (await screen.findByText(t('animales.altaRapida.registrar'))).closest('button')!;
    expect(registrar.disabled).toBe(true);
    fireEvent.change(campoIdentificador(), { target: { value: '5001' } });
    expect(registrar.disabled).toBe(true);
    fireEvent.click(await screen.findByText(t('animales.categorias.vaca')));
    expect(registrar.disabled).toBe(false);
  });

  it('criterio 4: encadena altas sin volver al listado', async () => {
    const crear = preparar();
    abrir();
    fireEvent.click(await screen.findByText(t('animales.categorias.vaca')));

    fireEvent.change(campoIdentificador(), { target: { value: ' 5001 ' } });
    fireEvent.submit(document.querySelector('form.alta-rapida')!);
    await waitFor(() => expect(crear).toHaveBeenCalledTimes(1));
    expect(crear.mock.calls[0][0]).toMatchObject({
      identificador: '5001',
      tipo_identificador: 'caravana',
      categoria_codigo: 'vaca',
      sexo: 'hembra',
      corral_id: null,
    });

    // El identificador se vacía, la categoría y el sexo se quedan.
    await waitFor(() => expect(campoIdentificador().value).toBe(''));
    expect(screen.getByText(t('animales.categorias.vaca')).getAttribute('aria-pressed')).toBe('true');
    expect(document.activeElement).toBe(campoIdentificador());

    fireEvent.change(campoIdentificador(), { target: { value: '5002' } });
    fireEvent.submit(document.querySelector('form.alta-rapida')!);
    await waitFor(() => expect(crear).toHaveBeenCalledTimes(2));

    // Lo registrado en la tanda queda a la vista, lo último primero.
    await waitFor(() => expect(document.querySelectorAll('.alta-rapida__sesion li')).toHaveLength(2));
    const enLista = [...document.querySelectorAll('.alta-rapida__sesion .dato')].map((n) => n.textContent);
    expect(enLista).toEqual(['5002', '5001']);
  });

  it('si el servidor rechaza (identificador repetido), se ve el motivo y no se pierde lo escrito', async () => {
    const crear = preparar();
    crear.mockRejectedValueOnce(new Error('Ya hay un animal con el identificador «5001» en tu rancho.'));
    abrir();
    fireEvent.click(await screen.findByText(t('animales.categorias.vaca')));
    fireEvent.change(campoIdentificador(), { target: { value: '5001' } });
    fireEvent.submit(document.querySelector('form.alta-rapida')!);
    expect(await screen.findByText(/Ya hay un animal/)).toBeTruthy();
    expect(campoIdentificador().value).toBe('5001');
  });
});

describe('HU-35 · sin permiso de edición', () => {
  it('quien solo ve animales no tiene el formulario', async () => {
    preparar({ animales: 'ver' });
    abrir();
    expect(await screen.findByText(t('animales.altaRapida.sinPermiso.titulo'))).toBeTruthy();
    expect(document.querySelector('form.alta-rapida')).toBeNull();
  });
});

describe('HU-35 · criterios 2 y 3 en los estilos', () => {
  const estilos = join(__dirname, '..', 'src', 'estilos');
  const css = readFileSync(join(estilos, 'animal.css'), 'utf8');
  const tokens = readFileSync(join(estilos, 'tokens.css'), 'utf8');
  const componentes = readFileSync(join(estilos, 'componentes.css'), 'utf8');

  function regla(texto: string, selector: string): string {
    const inicio = texto.indexOf(`${selector} {`);
    expect(inicio, `falta la regla ${selector}`).toBeGreaterThanOrEqual(0);
    return texto.slice(inicio, texto.indexOf('}', inicio));
  }

  it('criterio 2: el alto móvil del sistema es de al menos 48 px', () => {
    const alto = Number(/--alto-control-movil:\s*(\d+)px/.exec(tokens)?.[1]);
    expect(alto).toBeGreaterThanOrEqual(48);
    // Los campos y los botones móviles usan ese alto…
    expect(componentes).toMatch(/\.btn-movil \{ height: var\(--alto-control-movil\)/);
    expect(componentes).toMatch(/\.campo-movil select \{ height: var\(--alto-control-movil\)/);
    // …y lo demás tocable de la pantalla también.
    expect(regla(css, '.alta-rapida__opcion')).toContain('min-height: var(--alto-control-movil)');
    expect(regla(css, '.alta-rapida__acciones .btn')).toContain('min-height: var(--alto-control-movil)');
    expect(regla(css, '.alta-rapida__sesion a')).toContain('min-height: var(--alto-control-movil)');
  });

  it('criterio 3: la barra de acciones queda pegada abajo', () => {
    const barra = regla(css, '.alta-rapida__acciones');
    expect(barra).toContain('position: sticky');
    expect(barra).toMatch(/bottom: /);
  });
});
