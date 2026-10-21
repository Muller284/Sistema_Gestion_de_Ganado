import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { api, type FichaAnimal } from '../src/servicios/api';
import { t } from '../src/servicios/idioma';
import { armarHistorial, edadEnMeses } from '../src/paginas/animales/historial';
import { PaginaFichaAnimal } from '../src/paginas/animales/PaginaFichaAnimal';

/**
 * HU-32 · Ficha e historial del animal.
 *
 *   1. El encabezado muestra la caravana en grande, el estado y los datos
 *      principales.
 *   2. Hay pestañas de resumen, sanidad, pesajes e historial.
 *   3. Las pestañas de fases posteriores aparecen con su estado vacío
 *      explicado.
 *   4. El historial muestra quién registró cada evento y cuándo.
 */

function ficha(cambios: Partial<FichaAnimal['animal']> = {}): FichaAnimal {
  return {
    animal: {
      id: 'a-1',
      identificador: '4471',
      tipo_identificador: 'caravana',
      nombre: 'Lucera',
      raza: 'Nelore',
      sexo: 'hembra',
      categoria_codigo: 'vaquilla',
      fecha_nacimiento: '2024-05-12',
      origen: 'nacido',
      peso_kg: 380,
      corral_id: 'c-2',
      corral_nombre: 'Corral Sur',
      estado: 'vendido',
      creado_en: '2026-10-01T12:00:00.000Z',
      modificado_en: '2026-10-10T15:00:00.000Z',
      creado_por_nombre: 'Carlos Gutierrez',
      modificado_por_nombre: 'Roberto Justiniano',
      eliminado_en: null,
      ...cambios,
    },
    movimientos: [
      {
        id: 'm-2',
        fecha: '2026-10-05T09:00:00.000Z',
        corral_origen_id: 'c-1',
        corral_origen: 'Corral Norte',
        corral_destino_id: 'c-2',
        corral_destino: 'Corral Sur',
        registrado_por: 'Roberto Justiniano',
      },
      {
        // El primer movimiento se guarda junto con el alta, en el mismo instante.
        id: 'm-1',
        fecha: '2026-10-01T12:00:00.000Z',
        corral_origen_id: null,
        corral_origen: null,
        corral_destino_id: 'c-1',
        corral_destino: 'Corral Norte',
        registrado_por: 'Carlos Gutierrez',
      },
    ],
    estados: [
      {
        id: 'e-1',
        estado_anterior: 'activo',
        estado_nuevo: 'vendido',
        fecha: '2026-10-08',
        motivo: 'Venta a feria',
        creado_en: '2026-10-10T15:00:00.000Z',
        registrado_por: 'Roberto Justiniano',
      },
    ],
  };
}

describe('HU-32 · armarHistorial (criterio 4)', () => {
  it('junta alta, movimientos y cambios de estado, lo más nuevo primero', () => {
    const eventos = armarHistorial(ficha());
    expect(eventos.map((e) => e.tipo)).toEqual(['estado', 'movimiento', 'movimiento', 'alta']);
  });

  it('a igual momento, el alta queda debajo de su primer movimiento', () => {
    const eventos = armarHistorial(ficha());
    expect(eventos.at(-1)?.tipo).toBe('alta');
    expect(eventos.at(-2)).toMatchObject({ tipo: 'movimiento', origen: null, destino: 'Corral Norte' });
  });

  it('cada evento lleva quién lo registró y cuándo', () => {
    for (const evento of armarHistorial(ficha())) {
      expect(evento.quien).toBeTruthy();
      expect(Number.isNaN(Date.parse(evento.momento))).toBe(false);
    }
  });

  it('un cambio de estado se ubica cuando se registró, no por la fecha elegida', () => {
    const [estado] = armarHistorial(ficha());
    expect(estado).toMatchObject({ tipo: 'estado', momento: '2026-10-10T15:00:00.000Z', fecha: '2026-10-08' });
  });

  it('si está dado de baja, la baja es el último evento y dice quién la hizo', () => {
    const eventos = armarHistorial(
      ficha({ eliminado_en: '2026-10-12T10:00:00.000Z', modificado_por_nombre: 'Carlos Gutierrez' }),
    );
    expect(eventos[0]).toMatchObject({ tipo: 'baja', quien: 'Carlos Gutierrez' });
  });
});

describe('HU-32 · edad del encabezado', () => {
  it('cuenta meses cumplidos', () => {
    expect(edadEnMeses('2024-05-12', '2026-10-21')).toBe(29);
    expect(edadEnMeses('2024-05-22', '2026-10-21')).toBe(28);
    expect(edadEnMeses('2026-10-20', '2026-10-21')).toBe(0);
  });

  it('sin fecha de nacimiento no hay edad', () => {
    expect(edadEnMeses(null, '2026-10-21')).toBeNull();
  });
});

describe('HU-32 · la pantalla de la ficha', () => {
  beforeEach(() => {
    vi.spyOn(api, 'fichaAnimal').mockResolvedValue(ficha());
    vi.spyOn(api, 'miRancho').mockResolvedValue({
      usuario: { id: 'u-1', nombre: 'Carlos Gutierrez', rol: 'propietario' },
      tieneRancho: true,
      rancho: null,
    });
    vi.spyOn(api, 'misPermisos').mockResolvedValue({ animales: 'editar' });
    vi.spyOn(api, 'corrales').mockResolvedValue([]);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  function abrir(direccion = '/animales/a-1') {
    render(
      <MemoryRouter initialEntries={[direccion]}>
        <Routes>
          <Route path="/animales/:id" element={<PaginaFichaAnimal />} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it('criterio 1: el identificador en grande, el estado y los datos principales', async () => {
    abrir();
    const encabezado = await screen.findByRole('region', { name: '4471' });
    expect(within(encabezado).getByText('4471').className).toContain('animal-encabezado__numero');
    expect(within(encabezado).getByText(t('animales.estados.vendido'))).toBeTruthy();
    expect(within(encabezado).getByText(t('animales.categorias.vaquilla'))).toBeTruthy();
    expect(within(encabezado).getByText(t('animales.sexos.hembra'))).toBeTruthy();
    expect(within(encabezado).getByText('Corral Sur')).toBeTruthy();
  });

  it('criterio 2: cuatro pestañas, y resumen es la primera', async () => {
    abrir();
    const grupo = await screen.findByRole('group', { name: t('animales.ficha.pestanas.etiqueta') });
    const pestanas = within(grupo).getAllByRole('button');
    expect(pestanas.map((b) => b.getAttribute('aria-pressed'))).toEqual(['true', 'false', 'false', 'false']);
    for (const clave of ['resumen', 'sanidad', 'pesajes', 'historial']) {
      expect(within(grupo).getByText(t(`animales.ficha.pestanas.${clave}`))).toBeTruthy();
    }
  });

  it('criterio 3: sanidad y pesajes explican por qué están vacías', async () => {
    abrir();
    fireEvent.click(await screen.findByText(t('animales.ficha.pestanas.sanidad')));
    expect(await screen.findByText(t('animales.ficha.sanidad.titulo'))).toBeTruthy();
    expect(screen.getByText(t('animales.ficha.sanidad.texto'))).toBeTruthy();

    fireEvent.click(screen.getByText(t('animales.ficha.pestanas.pesajes')));
    expect(await screen.findByText(t('animales.ficha.pesajes.titulo'))).toBeTruthy();
  });

  it('criterio 4: el historial dice quién registró cada evento', async () => {
    abrir('/animales/a-1?pestana=historial');
    await screen.findByText(t('animales.ficha.historial.alta'));
    const eventos = document.querySelectorAll('.animal-historial__evento');
    expect(eventos).toHaveLength(4);
    expect(screen.getAllByText(/Roberto Justiniano/)).toHaveLength(2);
    expect(screen.getAllByText(/Carlos Gutierrez/).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(`«Venta a feria»`)).toBeTruthy();
  });

  it('la pestaña elegida queda en la dirección', async () => {
    abrir('/animales/a-1?pestana=pesajes');
    await waitFor(() => expect(screen.getByText(t('animales.ficha.pesajes.titulo'))).toBeTruthy());
  });
});
