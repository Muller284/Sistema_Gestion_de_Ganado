import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { api, parametrosExportacion } from '../src/servicios/api';
import { t } from '../src/servicios/idioma';
import { ExportarDatos } from '../src/paginas/animales/ExportarDatos';

/**
 * HU-45 · Exportación a Excel.
 *
 *   1. Puedo elegir qué exportar y en qué formato.
 *   2. La exportación respeta los filtros aplicados en el listado.
 *   3. El archivo se descarga con un nombre que incluye el rancho y la fecha.
 *
 * El nombre lo pone el servidor (servidor/pruebas/exportacion.test.js); acá
 * se prueba que la pantalla manda lo elegido y los filtros del listado.
 */

const FILTROS = { busqueda: ' 44 ', sexo: 'hembra' as const, categoria: '', corral: 'c-1', fechaDesde: '', fechaHasta: '2025-12-31' };

function abrir(props: Partial<Parameters<typeof ExportarDatos>[0]> = {}) {
  render(
    <ExportarDatos
      vista="vendido"
      filtros={FILTROS}
      hayFiltros
      puedeVerCorrales
      alCerrar={() => undefined}
      {...props}
    />,
  );
}

function casilla(conjunto: string) {
  return screen.getByLabelText(t(`exportacion.conjuntos.${conjunto}`)) as HTMLInputElement;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('HU-45 · los parámetros del pedido', () => {
  it('criterio 2: lleva la pestaña y los filtros con valor, sin los vacíos', () => {
    const parametros = new URLSearchParams(
      parametrosExportacion({ que: ['animales', 'estados'], formato: 'xlsx', vista: 'vendido', filtros: FILTROS }),
    );
    expect(parametros.get('que')).toBe('animales,estados');
    expect(parametros.get('formato')).toBe('xlsx');
    expect(parametros.get('vista')).toBe('vendido');
    expect(parametros.get('busqueda')).toBe('44');
    expect(parametros.get('sexo')).toBe('hembra');
    expect(parametros.get('corral')).toBe('c-1');
    expect(parametros.get('fechaHasta')).toBe('2025-12-31');
    expect(parametros.has('categoria')).toBe(false);
    expect(parametros.has('fechaDesde')).toBe(false);
  });
});

describe('HU-45 · el panel de exportación', () => {
  it('criterio 1: se elige el formato y qué exportar; arranca en Excel con animales', () => {
    abrir();
    expect(screen.getByRole('button', { name: t('exportacion.formatos.xlsx') }).getAttribute('aria-pressed')).toBe('true');
    expect(casilla('animales').checked).toBe(true);
    expect(casilla('animales').type).toBe('checkbox');
    expect(casilla('corrales').checked).toBe(false);
  });

  it('criterio 1: en Excel se pueden elegir varias cosas y se mandan todas', async () => {
    const exportar = vi.spyOn(api, 'exportar').mockResolvedValue();
    abrir();
    fireEvent.click(casilla('corrales'));
    fireEvent.click(casilla('estados'));
    fireEvent.click(screen.getByRole('button', { name: t('exportacion.descargar') }));
    await waitFor(() => expect(exportar).toHaveBeenCalled());
    expect(exportar).toHaveBeenCalledWith({
      que: ['animales', 'corrales', 'estados'],
      formato: 'xlsx',
      vista: 'vendido',
      filtros: FILTROS,
    });
  });

  it('criterio 1: CSV es una sola tabla, así que se elige una sola cosa', async () => {
    const exportar = vi.spyOn(api, 'exportar').mockResolvedValue();
    abrir();
    fireEvent.click(casilla('movimientos'));
    fireEvent.click(screen.getByRole('button', { name: t('exportacion.formatos.csv') }));
    expect(casilla('animales').type).toBe('radio');
    expect([casilla('animales'), casilla('movimientos')].filter((c) => c.checked)).toHaveLength(1);
    fireEvent.click(casilla('estados'));
    expect(casilla('estados').checked).toBe(true);
    expect(casilla('animales').checked).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: t('exportacion.descargar') }));
    await waitFor(() => expect(exportar).toHaveBeenCalled());
    expect(exportar.mock.calls[0][0]).toMatchObject({ que: ['estados'], formato: 'csv' });
  });

  it('sin nada elegido no se puede descargar', () => {
    abrir();
    fireEvent.click(casilla('animales'));
    expect((screen.getByRole('button', { name: t('exportacion.descargar') }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('criterio 2: avisa que se exporta con la pestaña y los filtros del listado', () => {
    abrir();
    expect(screen.getByText(new RegExp(t('exportacion.conFiltros').slice(0, 20)))).toBeTruthy();
    cleanup();
    abrir({ hayFiltros: false });
    expect(screen.getByText(new RegExp(t('exportacion.sinFiltros').slice(0, 20)))).toBeTruthy();
  });

  it('corrales queda desactivado para quien no puede verlos (HU-22)', () => {
    abrir({ puedeVerCorrales: false });
    expect(casilla('corrales').disabled).toBe(true);
  });

  it('si el servidor rechaza, se muestra el mensaje', async () => {
    vi.spyOn(api, 'exportar').mockRejectedValue(new Error('No tienes permiso.'));
    abrir();
    fireEvent.click(screen.getByRole('button', { name: t('exportacion.descargar') }));
    expect(await screen.findByText('No tienes permiso.')).toBeTruthy();
  });
});
