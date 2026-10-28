import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { api, type Animal, type Corral } from '../src/servicios/api';
import { t, tn } from '../src/servicios/idioma';
import { REGIONAL_POR_DEFECTO } from '../src/servicios/unidades';
import { AccionesMasivas, TANDA_CORRAL } from '../src/paginas/animales/AccionesMasivas';
import { PaginaListaAnimales } from '../src/paginas/animales/PaginaListaAnimales';

/**
 * HU-31 · Acciones masivas.
 *
 *   1. Puedo seleccionar animales individualmente, toda la página o todo el
 *      resultado del filtro.
 *   2. Aparece una barra con las acciones disponibles y la cantidad
 *      seleccionada.
 *   3. Toda acción masiva pide confirmación indicando cuántos animales afecta.
 *
 * Lo que hace el servidor con la selección se prueba en
 * servidor/pruebas/acciones-masivas.test.js.
 */

const CORRAL = { id: 'c-1', nombre: 'Corral Norte' } as Corral;

function animal(n: number, cambios: Partial<Animal> = {}): Animal {
  return {
    id: `a-${n}`,
    identificador: `10${n}`,
    tipo_identificador: 'caravana',
    nombre: null,
    raza: null,
    sexo: 'hembra',
    categoria_codigo: 'vaca',
    fecha_nacimiento: null,
    origen: null,
    peso_kg: null,
    corral_id: null,
    corral_nombre: null,
    estado: 'activo',
    creado_en: '2026-10-21T12:00:00.000Z',
    modificado_en: '2026-10-21T12:00:00.000Z',
    creado_por_nombre: 'Carlos Gutierrez',
    modificado_por_nombre: 'Carlos Gutierrez',
    eliminado_en: null,
    ...cambios,
  };
}

function barra(props: Partial<Parameters<typeof AccionesMasivas>[0]> = {}) {
  const alTerminar = vi.fn();
  render(
    <AccionesMasivas
      seleccion={['a-1', 'a-2', 'a-3']}
      ambito="sueltos"
      corrales={[CORRAL]}
      puedeEliminar={false}
      regional={REGIONAL_POR_DEFECTO}
      alQuitar={() => undefined}
      alTerminar={alTerminar}
      {...props}
    />,
  );
  return { alTerminar, region: screen.getByRole('region', { name: t('animales.masivo.titulo') }) };
}

function botonAccion(clave: string) {
  return screen.getByRole('button', { name: t(`animales.masivo.accion.${clave}`) });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('HU-31 · la barra de acciones', () => {
  it('criterio 2: dice cuántos animales hay elegidos y cómo se eligieron', () => {
    const { region } = barra({ ambito: 'filtro' });
    expect(within(region).getByText(tn('animales.masivo.cuantos', 3))).toBeTruthy();
    expect(within(region).getByText(t('animales.masivo.ambito.filtro'))).toBeTruthy();
  });

  it('criterio 2: muestra las acciones disponibles; dar de baja solo para el propietario (HU-18)', () => {
    barra();
    expect(botonAccion('corral')).toBeTruthy();
    expect(botonAccion('estado')).toBeTruthy();
    expect(screen.queryByRole('button', { name: t('animales.masivo.accion.baja') })).toBeNull();
    cleanup();
    barra({ puedeEliminar: true });
    expect(botonAccion('baja')).toBeTruthy();
  });

  it('criterio 3: asignar a un corral pide confirmación con la cantidad y recién ahí se manda', async () => {
    const asignar = vi
      .spyOn(api, 'asignarAnimales')
      .mockResolvedValue({ movidos: 3, aviso: null } as Awaited<ReturnType<typeof api.asignarAnimales>>);
    const { alTerminar } = barra();
    fireEvent.change(screen.getByLabelText(new RegExp(t('animales.seleccion.corral'))), {
      target: { value: 'c-1' },
    });
    fireEvent.click(screen.getByRole('button', { name: t('animales.masivo.aplicar', { n: 3 }) }));

    expect(screen.getByText(tn('animales.masivo.confirmar.corral', 3, { corral: 'Corral Norte' }))).toBeTruthy();
    expect(asignar).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: t('animales.masivo.siAplicar') }));
    await waitFor(() => expect(alTerminar).toHaveBeenCalled());
    expect(asignar).toHaveBeenCalledWith('c-1', ['a-1', 'a-2', 'a-3']);
  });

  it('criterio 3: cancelar la confirmación no manda nada', () => {
    const cambiar = vi.spyOn(api, 'cambiarEstadoMasivo');
    barra();
    fireEvent.click(botonAccion('estado'));
    fireEvent.change(screen.getByLabelText(new RegExp(t('animales.ficha.estado.nuevo'))), {
      target: { value: 'vendido' },
    });
    fireEvent.change(screen.getByLabelText(new RegExp(t('animales.ficha.estado.motivo'))), {
      target: { value: 'Venta de lote' },
    });
    fireEvent.click(screen.getByRole('button', { name: t('animales.masivo.aplicar', { n: 3 }) }));
    expect(
      screen.getByText(tn('animales.masivo.confirmar.estado', 3, { estado: t('animales.estados.vendido') })),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: t('comun.cancelar') }));
    expect(screen.queryByText(tn('animales.masivo.confirmar.estado', 3, { estado: t('animales.estados.vendido') }))).toBeNull();
    expect(cambiar).not.toHaveBeenCalled();
  });

  it('cambiar el estado manda todos los elegidos con el motivo y la fecha', async () => {
    const cambiar = vi.spyOn(api, 'cambiarEstadoMasivo').mockResolvedValue({
      cambiados: 2,
      ya_estaban: 1,
      no_encontrados: 0,
      mensaje: 'Listo.',
    });
    const { alTerminar } = barra();
    fireEvent.click(botonAccion('estado'));
    fireEvent.change(screen.getByLabelText(new RegExp(t('animales.ficha.estado.nuevo'))), {
      target: { value: 'vendido' },
    });
    fireEvent.change(screen.getByLabelText(new RegExp(t('animales.ficha.estado.fecha'))), {
      target: { value: '2026-10-20' },
    });
    fireEvent.change(screen.getByLabelText(new RegExp(t('animales.ficha.estado.motivo'))), {
      target: { value: '  Venta de lote  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: t('animales.masivo.aplicar', { n: 3 }) }));
    fireEvent.click(screen.getByRole('button', { name: t('animales.masivo.siAplicar') }));
    await waitFor(() => expect(alTerminar).toHaveBeenCalled());
    expect(cambiar).toHaveBeenCalledWith(['a-1', 'a-2', 'a-3'], 'vendido', 'Venta de lote', '2026-10-20');
    expect(alTerminar.mock.calls[0][0]).toContain(tn('animales.masivo.yaEstaban', 1));
  });

  it('el estado no se puede aplicar sin motivo', () => {
    barra();
    fireEvent.click(botonAccion('estado'));
    fireEvent.change(screen.getByLabelText(new RegExp(t('animales.ficha.estado.nuevo'))), {
      target: { value: 'muerto' },
    });
    const aplicar = screen.getByRole('button', { name: t('animales.masivo.aplicar', { n: 3 }) }) as HTMLButtonElement;
    expect(aplicar.disabled).toBe(true);
  });

  it('criterio 3: dar de baja confirma cuántos y usa la baja masiva', async () => {
    const baja = vi.spyOn(api, 'bajaMasiva').mockResolvedValue({ dados_de_baja: 3, no_encontrados: 0, mensaje: 'Listo.' });
    const { alTerminar } = barra({ puedeEliminar: true });
    fireEvent.click(botonAccion('baja'));
    fireEvent.click(screen.getByRole('button', { name: t('animales.masivo.aplicar', { n: 3 }) }));
    expect(screen.getByText(tn('animales.masivo.confirmar.baja', 3))).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: t('animales.masivo.siAplicar') }));
    await waitFor(() => expect(alTerminar).toHaveBeenCalledWith('Listo.'));
    expect(baja).toHaveBeenCalledWith(['a-1', 'a-2', 'a-3']);
  });

  it('una selección grande se asigna al corral en tandas', async () => {
    const asignar = vi
      .spyOn(api, 'asignarAnimales')
      .mockImplementation(async (_corral, ids) => ({ movidos: ids.length, aviso: null }) as Awaited<ReturnType<typeof api.asignarAnimales>>);
    const muchos = Array.from({ length: TANDA_CORRAL * 2 + 500 }, (_, i) => `a-${i}`);
    const { alTerminar } = barra({ seleccion: muchos, ambito: 'filtro' });
    fireEvent.change(screen.getByLabelText(new RegExp(t('animales.seleccion.corral'))), {
      target: { value: 'c-1' },
    });
    fireEvent.click(screen.getByRole('button', { name: t('animales.masivo.aplicar', { n: muchos.length }) }));
    fireEvent.click(screen.getByRole('button', { name: t('animales.masivo.siAplicar') }));
    await waitFor(() => expect(alTerminar).toHaveBeenCalled());
    expect(asignar).toHaveBeenCalledTimes(3);
    expect(alTerminar.mock.calls[0][0]).toBe(
      tn('animales.masivo.listo.corral', muchos.length, { corral: 'Corral Norte' }),
    );
  });
});

describe('HU-31 · elegir en el listado (criterio 1)', () => {
  const pagina = [animal(1), animal(2), animal(3, { estado: 'vendido' })];

  beforeEach(() => {
    vi.spyOn(api, 'miRancho').mockResolvedValue({
      usuario: { id: 'u-1', nombre: 'Carlos Gutierrez', rol: 'propietario' },
      tieneRancho: true,
      rancho: null,
    });
    vi.spyOn(api, 'misPermisos').mockResolvedValue({ animales: 'editar', corrales: 'editar' });
    vi.spyOn(api, 'categoriasAnimal').mockResolvedValue(['vaca']);
    vi.spyOn(api, 'corrales').mockResolvedValue([CORRAL]);
  });

  async function abrir(lista: Animal[] = pagina) {
    const pedirAnimales = vi.spyOn(api, 'animales').mockResolvedValue(lista);
    render(
      <MemoryRouter>
        <PaginaListaAnimales />
      </MemoryRouter>,
    );
    await screen.findByText(t('animales.masivo.elegirPagina', { n: lista.filter((a) => !a.eliminado_en).length }));
    return pedirAnimales;
  }

  function cuantos(n: number) {
    return screen.getByText(tn('animales.masivo.cuantos', n));
  }

  it('de a uno: cada fila tiene su casilla y la barra aparece al elegir', async () => {
    await abrir();
    expect(screen.queryByRole('region', { name: t('animales.masivo.titulo') })).toBeNull();
    fireEvent.click(screen.getByLabelText(t('animales.seleccion.elegir', { identificador: '101' })));
    expect(cuantos(1)).toBeTruthy();
    expect(screen.getByText(t('animales.masivo.ambito.sueltos'))).toBeTruthy();
  });

  it('toda la página: elige todos los que se ven, y otra vez los quita', async () => {
    await abrir();
    const casilla = screen.getByLabelText(t('animales.masivo.elegirPagina', { n: 3 }));
    fireEvent.click(casilla);
    expect(cuantos(3)).toBeTruthy();
    expect(screen.getByText(t('animales.masivo.ambito.pagina'))).toBeTruthy();
    fireEvent.click(casilla);
    expect(screen.queryByRole('region', { name: t('animales.masivo.titulo') })).toBeNull();
  });

  it('los dados de baja no se pueden elegir', async () => {
    await abrir([animal(1), animal(2, { eliminado_en: '2026-10-22T10:00:00.000Z' })]);
    const deBaja = screen.getByLabelText(t('animales.seleccion.elegir', { identificador: '102' })) as HTMLInputElement;
    expect(deBaja.disabled).toBe(true);
    fireEvent.click(screen.getByLabelText(t('animales.masivo.elegirPagina', { n: 1 })));
    expect(cuantos(1)).toBeTruthy();
  });

  it('todo el filtro: pide la lista completa con la misma pestaña y elige también lo que no se ve', async () => {
    const pedirAnimales = await abrir();
    const todos = Array.from({ length: 8 }, (_, i) => animal(i + 1));
    pedirAnimales.mockResolvedValue(todos);
    fireEvent.click(screen.getByRole('button', { name: t('animales.masivo.elegirFiltro') }));
    await waitFor(() => expect(cuantos(8)).toBeTruthy());
    expect(screen.getByText(t('animales.masivo.ambito.filtro'))).toBeTruthy();
    const ultimo = pedirAnimales.mock.calls.at(-1)!;
    expect(ultimo[0]).toBe('activo');
    expect(ultimo[1]).toBe(false);
  });

  it('quien solo consulta no ve casillas ni barra', async () => {
    vi.spyOn(api, 'misPermisos').mockResolvedValue({ animales: 'ver' });
    vi.spyOn(api, 'animales').mockResolvedValue(pagina);
    render(
      <MemoryRouter>
        <PaginaListaAnimales />
      </MemoryRouter>,
    );
    await screen.findByText(t('animales.soloConsulta'));
    expect(screen.queryByRole('checkbox')).toBeNull();
  });
});
