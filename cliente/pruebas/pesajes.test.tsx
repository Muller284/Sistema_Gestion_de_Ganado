import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { api, type Animal, type FichaAnimal, type Pesaje } from '../src/servicios/api';
import { t, tn } from '../src/servicios/idioma';
import { formatoFecha, formatoPeso, hoyEn, REGIONAL_POR_DEFECTO, type Regional } from '../src/servicios/unidades';
import { armarHistorial } from '../src/paginas/animales/historial';
import { AccionesMasivas } from '../src/paginas/animales/AccionesMasivas';
import { PaginaFichaAnimal } from '../src/paginas/animales/PaginaFichaAnimal';
import { PestanaPesajes } from '../src/paginas/pesajes/PestanaPesajes';
import { MAXIMO_PESAJE_MASIVO, PesajeMasivo } from '../src/paginas/pesajes/PesajeMasivo';

/**
 * HU-53 · Registro de pesaje individual y masivo.
 *
 *   1. El peso se escribe en la unidad del país y se guarda en kilos (HU-26);
 *      la fecha no puede ser futura.
 *   2. En el masivo se eligen los animales y cada uno tiene su campo de peso.
 *   3. El último pesaje pasa a ser el peso actual de la ficha (la ficha se
 *      vuelve a pedir después de guardar).
 *   4. Cada pesaje aparece en la pestaña Pesajes y en el historial, con quién
 *      lo registró.
 *
 * Lo que hace el servidor (todo o nada, permisos, aislamiento, un pesaje por
 * día) se prueba en servidor/pruebas/pesajes.test.js.
 */

const LIBRAS: Regional = { ...REGIONAL_POR_DEFECTO, peso: 'lb' };

/** La etiqueta del campo de peso, que lleva paréntesis: "Peso (kg)". */
function etiquetaPeso(unidad: 'kg' | 'lb'): RegExp {
  return new RegExp(t('animales.ficha.pesajes.nuevo.peso', { unidad }).replace(/[()]/g, '\\$&'));
}

function animal(cambios: Partial<Animal> = {}): Animal {
  return {
    id: 'a-1',
    identificador: '0503',
    tipo_identificador: 'caravana',
    nombre: null,
    raza: 'Nelore',
    sexo: 'macho',
    categoria_codigo: 'novillo',
    fecha_nacimiento: '2024-07-20',
    origen: 'nacido',
    peso_kg: 402,
    corral_id: null,
    corral_nombre: null,
    estado: 'activo',
    creado_en: '2026-08-01T12:00:00.000Z',
    modificado_en: '2026-10-30T12:00:00.000Z',
    creado_por_nombre: 'Carlos Gutierrez',
    modificado_por_nombre: 'Carlos Gutierrez',
    eliminado_en: null,
    ...cambios,
  };
}

function pesaje(n: number, cambios: Partial<Pesaje> = {}): Pesaje {
  return {
    id: `p-${n}`,
    animal_id: 'a-1',
    fecha: '2026-10-30',
    peso_kg: 402,
    observacion: null,
    lote_id: null,
    creado_en: '2026-10-30T14:00:00.000Z',
    registrado_por: 'Roberto Justiniano',
    ...cambios,
  };
}

const PESAJES = [
  pesaje(2, { fecha: '2026-10-30', peso_kg: 402, observacion: 'Balanza norte' }),
  pesaje(1, { fecha: '2026-09-15', peso_kg: 378, creado_en: '2026-09-15T14:00:00.000Z', registrado_por: 'Jorge Rojas' }),
];

function pestana(props: Partial<Parameters<typeof PestanaPesajes>[0]> = {}) {
  const alRegistrar = vi.fn();
  render(
    <PestanaPesajes
      animal={animal()}
      pesajes={PESAJES}
      error=""
      regional={REGIONAL_POR_DEFECTO}
      puedeEditar
      alRegistrar={alRegistrar}
      {...props}
    />,
  );
  return { alRegistrar };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('HU-53 · la pestaña Pesajes', () => {
  it('criterio 4: lista los pesajes con su fecha, su peso y quién los registró', () => {
    pestana();
    const filas = screen.getAllByRole('row').slice(1);
    expect(filas).toHaveLength(2);
    expect(within(filas[0]).getByText(formatoFecha('2026-10-30', REGIONAL_POR_DEFECTO))).toBeTruthy();
    expect(within(filas[0]).getByText(formatoPeso(402, REGIONAL_POR_DEFECTO))).toBeTruthy();
    expect(within(filas[0]).getByText('Roberto Justiniano')).toBeTruthy();
    expect(within(filas[0]).getByText('Balanza norte')).toBeTruthy();
    expect(within(filas[1]).getByText('Jorge Rojas')).toBeTruthy();
    expect(screen.getByText(tn('animales.ficha.pesajes.cuantos', 2))).toBeTruthy();
  });

  it('sin pesajes, lo dice', () => {
    pestana({ pesajes: [], animal: animal({ peso_kg: null }) });
    expect(screen.getByText(t('animales.ficha.pesajes.vacio.titulo'))).toBeTruthy();
  });

  it('criterio 1: se escribe en libras y se manda en kilos', async () => {
    const registrar = vi.spyOn(api, 'registrarPesaje').mockResolvedValue({
      pesaje: pesaje(3),
      peso_actual_kg: 453.59,
      mensaje: 'Listo, registraste el pesaje de 0503.',
    });
    const { alRegistrar } = pestana({ regional: LIBRAS });

    fireEvent.change(screen.getByLabelText(etiquetaPeso('lb')), {
      target: { value: '1000' },
    });
    fireEvent.change(screen.getByLabelText(new RegExp(t('animales.ficha.pesajes.nuevo.fecha'))), {
      target: { value: '2026-11-01' },
    });
    fireEvent.click(screen.getByRole('button', { name: t('animales.ficha.pesajes.nuevo.boton') }));

    await waitFor(() => expect(alRegistrar).toHaveBeenCalledWith('Listo, registraste el pesaje de 0503.'));
    const datos = registrar.mock.calls[0][0];
    expect(datos.animal_id).toBe('a-1');
    expect(datos.fecha).toBe('2026-11-01');
    expect(datos.peso_kg).toBeCloseTo(453.59237, 4);
  });

  it('criterio 1: la fecha no puede ser futura y el peso tiene que ser mayor que cero', () => {
    const registrar = vi.spyOn(api, 'registrarPesaje');
    pestana();
    const boton = screen.getByRole('button', { name: t('animales.ficha.pesajes.nuevo.boton') });
    const peso = screen.getByLabelText(etiquetaPeso('kg'));
    const fecha = screen.getByLabelText(new RegExp(t('animales.ficha.pesajes.nuevo.fecha')));

    expect(fecha.getAttribute('max')).toBeTruthy();
    fireEvent.change(peso, { target: { value: '0' } });
    expect((boton as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(peso, { target: { value: '410' } });
    expect((boton as HTMLButtonElement).disabled).toBe(false);
    fireEvent.change(fecha, { target: { value: '2999-01-01' } });
    expect((boton as HTMLButtonElement).disabled).toBe(true);
    expect(registrar).not.toHaveBeenCalled();
  });

  it('un animal que no está activo no se pesa, pero su historial se ve', () => {
    pestana({ animal: animal({ estado: 'vendido' }) });
    expect(screen.queryByRole('button', { name: t('animales.ficha.pesajes.nuevo.boton') })).toBeNull();
    expect(screen.getByText(t('animales.ficha.pesajes.noSePesa'))).toBeTruthy();
    expect(screen.getAllByRole('row')).toHaveLength(3);
  });

  it('quien solo ve pesajes no tiene el formulario', () => {
    pestana({ puedeEditar: false });
    expect(screen.queryByText(t('animales.ficha.pesajes.nuevo.titulo'))).toBeNull();
  });
});

describe('HU-53 · los pesajes en el historial (criterio 4)', () => {
  const ficha: FichaAnimal = { animal: animal(), movimientos: [], estados: [] };

  it('cada pesaje es un evento con quién lo registró, ordenado por cuándo se guardó', () => {
    const eventos = armarHistorial(ficha, PESAJES);
    expect(eventos.map((e) => e.tipo)).toEqual(['pesaje', 'pesaje', 'alta']);
    expect(eventos[0]).toMatchObject({ tipo: 'pesaje', quien: 'Roberto Justiniano', fecha: '2026-10-30', peso_kg: 402 });
  });

  it('sin pesajes el historial queda como antes', () => {
    expect(armarHistorial(ficha).map((e) => e.tipo)).toEqual(['alta']);
  });
});

describe('HU-53 · la ficha con el módulo pesajes', () => {
  beforeEach(() => {
    vi.spyOn(api, 'fichaAnimal').mockResolvedValue({ animal: animal(), movimientos: [], estados: [] });
    vi.spyOn(api, 'miRancho').mockResolvedValue({
      usuario: { id: 'u-4', nombre: 'Roberto Justiniano', rol: 'colaborador' },
      tieneRancho: true,
      rancho: null,
    });
    vi.spyOn(api, 'misPermisos').mockResolvedValue({ animales: 'editar', pesajes: 'editar' });
    vi.spyOn(api, 'corrales').mockResolvedValue([]);
    vi.spyOn(api, 'pesajesAnimal').mockResolvedValue({
      animal: { id: 'a-1', identificador: '0503', estado: 'activo', eliminado: false, peso_kg: 402 },
      pesajes: PESAJES,
      maximo_kg: 3000,
    });
  });

  function abrir(direccion: string) {
    render(
      <MemoryRouter initialEntries={[direccion]}>
        <Routes>
          <Route path="/animales/:id" element={<PaginaFichaAnimal />} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it('la pestaña muestra los pesajes y el formulario', async () => {
    abrir('/animales/a-1?pestana=pesajes');
    expect(await screen.findByText(t('animales.ficha.pesajes.nuevo.titulo'))).toBeTruthy();
    expect(await screen.findByText('Jorge Rojas')).toBeTruthy();
  });

  it('criterio 3: después de registrar se vuelve a pedir la ficha, con su peso nuevo', async () => {
    vi.spyOn(api, 'registrarPesaje').mockResolvedValue({
      pesaje: pesaje(3),
      peso_actual_kg: 410,
      mensaje: 'Listo, registraste el pesaje de 0503.',
    });
    abrir('/animales/a-1?pestana=pesajes');
    const peso = await screen.findByLabelText(etiquetaPeso('kg'));
    const pedidasAntes = vi.mocked(api.fichaAnimal).mock.calls.length;
    fireEvent.change(peso, { target: { value: '410' } });
    fireEvent.click(screen.getByRole('button', { name: t('animales.ficha.pesajes.nuevo.boton') }));
    expect(await screen.findByText('Listo, registraste el pesaje de 0503.')).toBeTruthy();
    await waitFor(() => expect(vi.mocked(api.fichaAnimal).mock.calls.length).toBeGreaterThan(pedidasAntes));
  });

  it('criterio 4: el historial suma los pesajes', async () => {
    abrir('/animales/a-1?pestana=historial');
    expect(
      await screen.findByText(
        t('animales.ficha.historial.pesaje', {
          peso: formatoPeso(378, REGIONAL_POR_DEFECTO),
          fecha: formatoFecha('2026-09-15', REGIONAL_POR_DEFECTO),
        }),
      ),
    ).toBeTruthy();
    expect(document.querySelectorAll('.animal-historial__evento--pesaje')).toHaveLength(2);
  });
});

describe('HU-53 · pesaje masivo (criterio 2)', () => {
  const PESABLES = [
    { id: 'a-1', identificador: '0503', nombre: null, categoria_codigo: 'novillo', corral_nombre: null, estado: 'activo' as const, fecha_nacimiento: null, peso_kg: 402 },
    { id: 'a-2', identificador: '0504', nombre: null, categoria_codigo: 'novillo', corral_nombre: null, estado: 'activo' as const, fecha_nacimiento: null, peso_kg: 371 },
  ];

  it('cada animal tiene su campo; los vacíos no se mandan; se confirma cuántos van', async () => {
    vi.spyOn(api, 'pesablesMasivo').mockResolvedValue({ animales: PESABLES, no_pesables: 1, maximo: 500, maximo_kg: 3000 });
    const registrar = vi.spyOn(api, 'registrarPesajeMasivo').mockResolvedValue({
      registrados: 1,
      lote_id: 'l-1',
      mensaje: 'Listo, registraste 1 pesaje(s).',
    });
    const alTerminar = vi.fn();
    render(<PesajeMasivo seleccion={['a-1', 'a-2', 'a-9']} regional={REGIONAL_POR_DEFECTO} alTerminar={alTerminar} />);

    expect(await screen.findByText(tn('animales.masivo.pesaje.noPesables', 1))).toBeTruthy();
    fireEvent.change(screen.getByLabelText(t('animales.masivo.pesaje.pesoDe', { identificador: '0504' })), {
      target: { value: '380' },
    });
    fireEvent.click(screen.getByRole('button', { name: tn('animales.masivo.pesaje.boton', 1) }));
    const hoy = formatoFecha(hoyEn(REGIONAL_POR_DEFECTO), REGIONAL_POR_DEFECTO);
    expect(screen.getByText(tn('animales.masivo.pesaje.confirmar', 1, { fecha: hoy }))).toBeTruthy();
    expect(registrar).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: t('animales.masivo.siAplicar') }));
    await waitFor(() => expect(alTerminar).toHaveBeenCalledWith('Listo, registraste 1 pesaje(s).'));
    expect(registrar.mock.calls[0][0].pesajes).toEqual([{ animal_id: 'a-2', peso_kg: 380 }]);
  });

  it('un peso inválido no deja guardar', async () => {
    vi.spyOn(api, 'pesablesMasivo').mockResolvedValue({ animales: PESABLES, no_pesables: 0, maximo: 500, maximo_kg: 3000 });
    render(<PesajeMasivo seleccion={['a-1', 'a-2']} regional={REGIONAL_POR_DEFECTO} alTerminar={vi.fn()} />);
    fireEvent.change(await screen.findByLabelText(t('animales.masivo.pesaje.pesoDe', { identificador: '0503' })), {
      target: { value: '-3' },
    });
    expect(screen.getByText(t('animales.masivo.pesaje.pesoInvalido', { identificador: '0503' }))).toBeTruthy();
    expect((screen.getByRole('button', { name: tn('animales.masivo.pesaje.boton', 1) }) as HTMLButtonElement).disabled).toBe(true);
  });

  it(`más de ${MAXIMO_PESAJE_MASIVO} elegidos no se piden al servidor`, () => {
    const pesables = vi.spyOn(api, 'pesablesMasivo');
    const muchos = Array.from({ length: MAXIMO_PESAJE_MASIVO + 1 }, (_, i) => `a-${i}`);
    render(<PesajeMasivo seleccion={muchos} regional={REGIONAL_POR_DEFECTO} alTerminar={vi.fn()} />);
    expect(screen.getByText(t('animales.masivo.pesaje.demasiados', { n: MAXIMO_PESAJE_MASIVO }))).toBeTruthy();
    expect(pesables).not.toHaveBeenCalled();
  });

  it('en la barra: quien edita pesajes pero no animales solo ve «Registrar pesaje»', async () => {
    vi.spyOn(api, 'pesablesMasivo').mockResolvedValue({ animales: PESABLES, no_pesables: 0, maximo: 500, maximo_kg: 3000 });
    render(
      <AccionesMasivas
        seleccion={['a-1', 'a-2']}
        ambito="sueltos"
        corrales={[]}
        puedeEliminar={false}
        puedePesar
        puedeEditarAnimales={false}
        regional={REGIONAL_POR_DEFECTO}
        alQuitar={() => undefined}
        alTerminar={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: t('animales.masivo.accion.pesaje') })).toBeTruthy();
    expect(screen.queryByRole('button', { name: t('animales.masivo.accion.corral') })).toBeNull();
    expect(await screen.findByLabelText(t('animales.masivo.pesaje.pesoDe', { identificador: '0503' }))).toBeTruthy();
  });
});
