import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { api, type Pesaje } from '../src/servicios/api';
import { t, tn } from '../src/servicios/idioma';
import {
  armarSemanas,
  indicadores,
  type ComparativaPesos,
  type MesSanitario,
  type PanelRancho as DatosPanel,
} from '../src/servicios/indicadores';
import { conGanancias, diasEntre, gananciaDiaria, gananciaTotal, textoGanancia } from '../src/servicios/pesos';
import { REGIONAL_POR_DEFECTO, type Regional } from '../src/servicios/unidades';
import { PanelRancho } from '../src/paginas/panel/PanelRancho';
import { EvolucionPeso } from '../src/paginas/pesajes/EvolucionPeso';
import { PestanaPesajes } from '../src/paginas/pesajes/PestanaPesajes';
import { PaginaComparativa } from '../src/paginas/pesajes/PaginaComparativa';
import { CalendarioMensual } from '../src/paginas/sanidad/CalendarioMensual';

/**
 * Sprint 4 (Aaron), del lado de la pantalla:
 *   HU-54  ganancia diaria y evolución del peso en la ficha
 *   HU-56  comparativa por corral y categoría
 *   HU-57  panel del propietario
 *   HU-58  panel según el rol
 *   HU-59  calendario sanitario en vista mensual
 *
 * Lo que cuenta el servidor (sumas, promedios, permisos y aislamiento) se
 * prueba en servidor/pruebas/paneles.test.js y calendario-sanitario.test.js.
 */

const LIBRAS: Regional = { ...REGIONAL_POR_DEFECTO, peso: 'lb' };

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function pesaje(fecha: string, peso: number, id = fecha): Pesaje {
  return { id, animal_id: 'a-1', fecha, peso_kg: peso, observacion: null, lote_id: null, creado_en: `${fecha}T12:00:00Z`, registrado_por: 'Roberto' };
}

describe('HU-54 · la ganancia diaria', () => {
  it('es la diferencia de peso dividida por los días entre un pesaje y el anterior', () => {
    expect(diasEntre('2026-09-15', '2026-10-30')).toBe(45);
    // El cambio de horario no suma ni quita días.
    expect(diasEntre('2026-03-01', '2026-04-01')).toBe(31);
    expect(gananciaDiaria({ fecha: '2026-09-15', peso_kg: 378 }, { fecha: '2026-10-30', peso_kg: 402 })).toBeCloseTo(24 / 45);
    expect(gananciaDiaria({ fecha: '2026-09-15', peso_kg: 378 }, { fecha: '2026-09-15', peso_kg: 380 })).toBeNull();
  });

  it('el primer pesaje no tiene ganancia, y el orden de la lista no importa', () => {
    const filas = conGanancias([pesaje('2026-10-30', 402), pesaje('2026-08-01', 352), pesaje('2026-09-15', 378)]);
    expect(filas.map((f) => f.pesaje.fecha)).toEqual(['2026-08-01', '2026-09-15', '2026-10-30']);
    expect(filas[0].ganancia).toBeNull();
    expect(filas[1].dias).toBe(45);
    expect(filas[2].ganancia).toBeCloseTo(24 / 45);
    expect(gananciaTotal([pesaje('2026-08-01', 352), pesaje('2026-10-30', 402)])).toBeCloseTo(50 / 90);
    expect(gananciaTotal([pesaje('2026-08-01', 352)])).toBeNull();
  });

  it('se muestra con signo y en la unidad del país', () => {
    expect(textoGanancia(0.5, REGIONAL_POR_DEFECTO)).toBe(`+${t('evolucionPeso.porDia', { peso: '0.50 kg' })}`);
    expect(textoGanancia(-0.1, REGIONAL_POR_DEFECTO)).toBe(`−${t('evolucionPeso.porDia', { peso: '0.10 kg' })}`);
    // 1 kg son 2,2 libras.
    expect(textoGanancia(1, LIBRAS)).toBe(`+${t('evolucionPeso.porDia', { peso: '2.20 lb' })}`);
  });

  it('criterio 2: la tabla de la pestaña Pesajes trae la ganancia de cada pesaje desde el anterior', () => {
    render(
      <PestanaPesajes
        animal={{ id: 'a-1', identificador: '0503', estado: 'activo', eliminado_en: null, peso_kg: 402 } as never}
        pesajes={[pesaje('2026-10-30', 402), pesaje('2026-09-15', 378), pesaje('2026-08-01', 352)]}
        error=""
        regional={REGIONAL_POR_DEFECTO}
        puedeEditar={false}
        alRegistrar={() => undefined}
      />,
    );
    const tabla = screen.getByRole('table');
    expect(within(tabla).getByRole('columnheader', { name: t('evolucionPeso.ganancia') })).toBeTruthy();
    const filas = within(tabla).getAllByRole('row');
    // Del más nuevo al más viejo; el más viejo no tiene con qué compararse.
    expect(within(filas[1]).getByText(textoGanancia(24 / 45, REGIONAL_POR_DEFECTO))).toBeTruthy();
    expect(within(filas[1]).getByText(tn('evolucionPeso.dias', 45))).toBeTruthy();
    expect(within(filas[3]).getAllByText('—').length).toBeGreaterThan(0);
  });

  it('con un solo pesaje explica que hace falta otro', () => {
    render(<EvolucionPeso pesajes={[pesaje('2026-10-30', 402)]} regional={REGIONAL_POR_DEFECTO} />);
    expect(screen.getByText(t('evolucionPeso.unSolo'))).toBeTruthy();
  });

  it('con varios muestra el gráfico y la ganancia promedio', () => {
    render(
      <EvolucionPeso
        pesajes={[pesaje('2026-10-30', 402), pesaje('2026-09-15', 378), pesaje('2026-08-01', 352)]}
        regional={REGIONAL_POR_DEFECTO}
      />,
    );
    expect(screen.getByRole('img', { name: t('evolucionPeso.descripcion') })).toBeTruthy();
    expect(screen.getByText(t('evolucionPeso.total', { ganancia: textoGanancia(50 / 90, REGIONAL_POR_DEFECTO) }))).toBeTruthy();
  });
});

function panelCompleto(cambios: Partial<DatosPanel> = {}): DatosPanel {
  return {
    hoy: '2026-11-08',
    secciones: { animales: true, corrales: true, sanidad: true, pesajes: true },
    editar: { animales: true, corrales: true, sanidad: true, pesajes: true },
    animales: {
      activos: 6,
      por_categoria: [
        { codigo: 'novillo', n: 2 },
        { codigo: 'vaca', n: 2 },
        { codigo: 'toro', n: 1 },
        { codigo: null, n: 1 },
      ],
      // De diciembre de 2025 a noviembre de 2026: tres altas en marzo y una baja en septiembre.
      movimientos: ['2025-12', ...Array.from({ length: 11 }, (_, i) => `2026-${String(i + 1).padStart(2, '0')}`)].map((mes) => ({
        mes,
        altas: mes === '2026-03' ? 3 : 0,
        bajas: mes === '2026-09' ? 1 : 0,
      })),
    },
    corrales: {
      por_corral: [
        { id: 'c-1', nombre: 'Potrero Las Lomas', capacidad: 20, n: 4 },
        { id: 'c-2', nombre: 'Potrero del Río', capacidad: null, n: 2 },
      ],
      sin_corral: 0,
    },
    sanidad: {
      activos: 6,
      esquemas: 3,
      con_esquema: 6,
      al_dia: 4,
      atrasados: 2,
      cobertura: 67,
      vencidas: 3,
      proximas: 4,
      dias_proxima: 7,
      proximos: [
        { animal_id: 'a-1', identificador: '0501', esquema_nombre: 'Aftosa', vence: '2026-11-09', dias: 1, estado: 'proxima' },
      ],
    },
    pesajes: {
      evolucion: [
        { mes: '2026-08', peso_promedio: 410.7, animales: 6 },
        { mes: '2026-09', peso_promedio: 423.8, animales: 6 },
        { mes: '2026-10', peso_promedio: 436.5, animales: 6 },
        { mes: '2026-11', peso_promedio: null, animales: 0 },
      ],
      meses_con_datos: 3,
    },
    ...cambios,
  };
}

async function abrirPanel(datos: DatosPanel) {
  vi.spyOn(indicadores, 'panel').mockResolvedValue(datos);
  render(
    <MemoryRouter>
      <PanelRancho />
    </MemoryRouter>,
  );
  await screen.findByText(t('panel.titulo'));
}

describe('HU-57 · el panel del propietario', () => {
  it('criterios 1 a 4: existencias, corrales, altas y bajas, vacunación y peso', async () => {
    await abrirPanel(panelCompleto());
    expect(await screen.findByText(t('panel.existencias.titulo'))).toBeTruthy();
    expect(screen.getByText(tn('panel.existencias.activos', 6))).toBeTruthy();
    expect(screen.getByText(t('animales.categorias.novillo'))).toBeTruthy();
    expect(screen.getByText(t('panel.existencias.sinCategoria'))).toBeTruthy();
    expect(screen.getByText(t('panel.corrales.ocupacion', { n: 4, capacidad: 20 }))).toBeTruthy();
    expect(screen.getByRole('img', { name: t('panel.movimientos.descripcion') })).toBeTruthy();
    expect(screen.getByText(t('panel.movimientos.resumen', { altas: 3, bajas: 1 }))).toBeTruthy();
    expect(screen.getByText(t('panel.sanidad.cobertura', { n: 67 }))).toBeTruthy();
    expect(screen.getByText(tn('panel.sanidad.vencidas', 3)).closest('a')!.getAttribute('href')).toBe('/sanidad?estado=vencida');
    expect(screen.getByRole('link', { name: '0501' }).getAttribute('href')).toBe('/animales/a-1');
    expect(screen.getByRole('img', { name: t('panel.pesos.descripcion') })).toBeTruthy();
  });

  it('criterio 5: sin datos, cada indicador dice qué falta cargar', async () => {
    await abrirPanel(
      panelCompleto({
        animales: { activos: 0, por_categoria: [], movimientos: [{ mes: '2026-11', altas: 0, bajas: 0 }] },
        corrales: { por_corral: [], sin_corral: 0 },
        sanidad: { ...panelCompleto().sanidad!, esquemas: 0, con_esquema: 0, al_dia: 0, atrasados: 0, cobertura: null },
        pesajes: { evolucion: [{ mes: '2026-11', peso_promedio: null, animales: 0 }], meses_con_datos: 0 },
      }),
    );
    expect(await screen.findByText(t('panel.existencias.vacio'))).toBeTruthy();
    expect(screen.getByText(t('panel.corrales.vacio'))).toBeTruthy();
    expect(screen.getByText(t('panel.movimientos.vacio'))).toBeTruthy();
    expect(screen.getByText(t('panel.sanidad.sinEsquemas'))).toBeTruthy();
    expect(screen.getByText(t('panel.pesos.vacio'))).toBeTruthy();
    // Quien edita tiene a mano el botón para cargar lo que falta.
    expect(screen.getByRole('link', { name: t('panel.existencias.registrar') })).toBeTruthy();
    expect(screen.getByRole('link', { name: t('panel.sanidad.definir') })).toBeTruthy();
  });

  it('con pesajes de un solo mes explica que hace falta otro', async () => {
    await abrirPanel(
      panelCompleto({ pesajes: { evolucion: [{ mes: '2026-10', peso_promedio: 400, animales: 2 }], meses_con_datos: 1 } }),
    );
    expect(await screen.findByText(t('panel.pesos.unMes'))).toBeTruthy();
  });
});

describe('HU-58 · el panel según el rol', () => {
  it('criterio 1: el socio ve todo, sin botones para cargar', async () => {
    await abrirPanel(
      panelCompleto({
        editar: { animales: false, corrales: false, sanidad: false, pesajes: false },
        animales: { activos: 0, por_categoria: [], movimientos: [] },
        sanidad: { ...panelCompleto().sanidad!, esquemas: 0, cobertura: null },
      }),
    );
    expect(await screen.findByText(t('panel.existencias.vacio'))).toBeTruthy();
    expect(screen.queryByRole('link', { name: t('panel.existencias.registrar') })).toBeNull();
    expect(screen.queryByRole('link', { name: t('panel.sanidad.definir') })).toBeNull();
    expect(screen.getByText(t('panel.corrales.titulo'))).toBeTruthy();
  });

  it('criterio 2: el colaborador ve solo las secciones de sus módulos', async () => {
    await abrirPanel(
      panelCompleto({
        secciones: { animales: true, corrales: false, sanidad: true, pesajes: true },
        corrales: null,
      }),
    );
    expect(await screen.findByText(t('panel.sanidad.titulo'), { selector: 'h2' })).toBeTruthy();
    expect(screen.queryByText(t('panel.corrales.titulo'))).toBeNull();
  });

  it('sin ningún módulo, lo dice en vez de mostrar un panel vacío', async () => {
    await abrirPanel(
      panelCompleto({
        secciones: { animales: false, corrales: false, sanidad: false, pesajes: false },
        animales: null,
        corrales: null,
        sanidad: null,
        pesajes: null,
      }),
    );
    expect(screen.getByText(t('panel.sinModulos.titulo'))).toBeTruthy();
    expect(screen.queryByText(t('panel.existencias.titulo'))).toBeNull();
  });
});

function comparativa(cambios: Partial<ComparativaPesos> = {}): ComparativaPesos {
  return {
    desde: '2026-08-10',
    hasta: '2026-11-08',
    agrupar: 'corral',
    con_corrales: true,
    animales_pesados: 6,
    con_ganancia: 6,
    por_corral: [
      { clave: 'c-1', nombre: 'Potrero Las Lomas', animales: 4, peso_promedio: 461.5, ganancia_promedio: 0.2 },
      { clave: 'c-2', nombre: 'Potrero del Río', animales: 2, peso_promedio: 386.5, ganancia_promedio: 0.445 },
    ],
    por_categoria: [{ clave: 'novillo', nombre: 'novillo', animales: 2, peso_promedio: 386.5, ganancia_promedio: 0.445 }],
    bajo_promedio: [
      {
        animal_id: 'a-4',
        identificador: '0504',
        nombre: null,
        categoria_codigo: 'novillo',
        corral_nombre: 'Potrero del Río',
        peso_final: 371,
        ganancia_diaria: 0.356,
        grupo: 'Potrero del Río',
        ganancia_promedio_grupo: 0.445,
        falta: 0.089,
      },
    ],
    ...cambios,
  };
}

async function abrirComparativa(datos: ComparativaPesos) {
  vi.spyOn(api, 'miRancho').mockResolvedValue({
    usuario: { id: 'u-1', nombre: 'Carlos', rol: 'propietario' },
    tieneRancho: true,
    rancho: null,
  });
  vi.spyOn(api, 'misPermisos').mockResolvedValue({ pesajes: 'editar', corrales: 'editar' });
  const pedir = vi.spyOn(indicadores, 'comparativa').mockResolvedValue(datos);
  render(
    <MemoryRouter>
      <PaginaComparativa />
    </MemoryRouter>,
  );
  return pedir;
}

describe('HU-56 · la comparativa por corral y categoría', () => {
  it('criterios 1 y 2: los grupos con su peso y su ganancia, y los atrasados con lo que les falta', async () => {
    await abrirComparativa(comparativa());
    const tabla = await screen.findByRole('table');
    expect(within(tabla).getByText('Potrero Las Lomas')).toBeTruthy();
    expect(within(tabla).getByText(textoGanancia(0.445, REGIONAL_POR_DEFECTO))).toBeTruthy();
    expect(screen.getByRole('link', { name: '0504' }).getAttribute('href')).toBe('/animales/a-4');
    expect(
      screen.getByText(
        t('comparativa.bajoPromedio.falta', { falta: textoGanancia(0.089, REGIONAL_POR_DEFECTO).replace('+', '') }),
      ),
    ).toBeTruthy();
  });

  it('cambiar a categoría vuelve a pedir agrupando por categoría', async () => {
    const pedir = await abrirComparativa(comparativa());
    await screen.findByRole('table');
    fireEvent.click(screen.getByRole('button', { name: t('comparativa.porCategoria') }));
    await waitFor(() => expect(pedir).toHaveBeenLastCalledWith(expect.objectContaining({ agrupar: 'categoria' })));
  });

  it('criterio 3: sin acceso a corrales, compara por categoría y lo explica', async () => {
    await abrirComparativa(comparativa({ con_corrales: false, agrupar: 'categoria', por_corral: null }));
    expect(await screen.findByText(t('comparativa.soloCategoria'))).toBeTruthy();
    expect(screen.queryByRole('button', { name: t('comparativa.porCorral') })).toBeNull();
  });

  it('sin pesajes en el período, o sin dos por animal, lo explica', async () => {
    await abrirComparativa(comparativa({ animales_pesados: 0, con_ganancia: 0, por_corral: [], por_categoria: [], bajo_promedio: [] }));
    expect(await screen.findByText(t('comparativa.vacio.titulo'))).toBeTruthy();
    cleanup();
    await abrirComparativa(comparativa({ con_ganancia: 0, bajo_promedio: [] }));
    expect(await screen.findByText(t('comparativa.sinGanancia'))).toBeTruthy();
  });
});

describe('HU-59 · el calendario en vista mensual', () => {
  it('arma las semanas de lunes a domingo', () => {
    // El 1 de noviembre de 2026 es domingo: seis huecos antes.
    const noviembre = armarSemanas('2026-11-01', '2026-11-30');
    expect(noviembre.slice(0, 7)).toEqual([null, null, null, null, null, null, '2026-11-01']);
    expect(noviembre.length % 7).toBe(0);
    expect(noviembre.filter(Boolean)).toHaveLength(30);
    // Febrero de 2027 empieza lunes y cabe justo en cuatro semanas.
    expect(armarSemanas('2027-02-01', '2027-02-28')).toHaveLength(28);
  });

  const mes: MesSanitario = {
    mes: '2026-11',
    desde: '2026-11-01',
    hasta: '2026-11-30',
    hoy: '2026-11-08',
    dias_proxima: 7,
    dias: [
      { fecha: '2026-11-08', vencida: 0, proxima: 4, programada: 0 },
      { fecha: '2026-11-20', vencida: 0, proxima: 0, programada: 2 },
      { fecha: '2026-11-03', vencida: 1, proxima: 0, programada: 1 },
    ],
  };

  it('criterio 1: cada día con dosis muestra cuántas, con el color de la más urgente', async () => {
    vi.spyOn(indicadores, 'calendarioMes').mockResolvedValue(mes);
    render(<CalendarioMensual producto="" corral="" regional={REGIONAL_POR_DEFECTO} />);
    const tres = await screen.findByRole('gridcell', { name: new RegExp(`^${t('calendarioMensual.dia', { fecha: '03/11/2026', detalle: '' })}`) });
    expect(tres.querySelector('.mes__cuenta')!.className).toContain('vencida');
    expect(within(tres).getByText(tn('calendarioMensual.dosis', 2))).toBeTruthy();
    const ocho = screen.getByRole('gridcell', { name: new RegExp('^' + t('calendarioMensual.dia', { fecha: '08/11/2026', detalle: '' })) });
    expect(ocho.className).toContain('hoy');
    expect(ocho.querySelector('.mes__cuenta')!.className).toContain('proxima');
    // Un día sin dosis no se puede tocar.
    const uno = screen.getByRole('gridcell', { name: new RegExp('^' + t('calendarioMensual.dia', { fecha: '01/11/2026', detalle: '' })) });
    expect((uno as HTMLButtonElement).disabled).toBe(true);
  });

  it('criterio 2: al tocar un día se ve la lista de ese día', async () => {
    vi.spyOn(indicadores, 'calendarioMes').mockResolvedValue(mes);
    const lista = vi.spyOn(api, 'calendarioSanitario').mockResolvedValue({
      resumen: { vencida: 0, proxima: 0, programada: 2 },
      total: 2,
      pagina: 1,
      por_pagina: 200,
      dias_proxima: 7,
      dosis: [
        {
          animal_id: 'a-1',
          identificador: '0501',
          animal_nombre: 'Lucera',
          categoria_codigo: 'vaca',
          corral_nombre: null,
          esquema_id: 'e-1',
          esquema_nombre: 'Vitamina ADE (vacas)',
          producto_nombre: 'Vitamina ADE',
          numero_dosis: null,
          dosis_total: 1,
          vence: '2026-11-20',
          dias: 12,
          estado: 'programada',
        },
      ],
    });
    render(
      <MemoryRouter>
        <CalendarioMensual producto="p-1" corral="" regional={REGIONAL_POR_DEFECTO} />
      </MemoryRouter>,
    );
    const veinte = await screen.findByRole('gridcell', { name: new RegExp('^' + t('calendarioMensual.dia', { fecha: '20/11/2026', detalle: '' })) });
    fireEvent.click(veinte);
    expect(await screen.findByText('Vitamina ADE (vacas)')).toBeTruthy();
    expect(lista).toHaveBeenCalledWith(expect.objectContaining({ desde: '2026-11-20', hasta: '2026-11-20', producto: 'p-1' }));
    expect(screen.getByText(t('calendarioMensual.delDia', { fecha: '20/11/2026' }))).toBeTruthy();
  });

  it('criterio 3: pasa al mes anterior y al siguiente', async () => {
    const pedir = vi.spyOn(indicadores, 'calendarioMes').mockResolvedValue(mes);
    render(<CalendarioMensual producto="" corral="" regional={REGIONAL_POR_DEFECTO} />);
    await screen.findAllByRole('gridcell');
    fireEvent.click(screen.getByRole('button', { name: t('calendarioMensual.anterior') }));
    await waitFor(() => expect(pedir).toHaveBeenLastCalledWith(expect.objectContaining({ mes: '2026-10' })));
    fireEvent.click(screen.getByRole('button', { name: t('calendarioMensual.siguiente') }));
    // La respuesta simulada sigue diciendo noviembre, así que el siguiente es diciembre.
    await waitFor(() => expect(pedir).toHaveBeenLastCalledWith(expect.objectContaining({ mes: '2026-12' })));
  });
});
