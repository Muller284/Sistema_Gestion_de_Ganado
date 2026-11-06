import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import {
  api,
  type AvisosSanidad as Avisos,
  type CalendarioSanitario,
  type EsquemaVacunacion,
  type ListaEsquemas,
} from '../src/servicios/api';
import { t, tn } from '../src/servicios/idioma';
import {
  aDatosEsquema,
  categoriasDelSexo,
  formularioDe,
  nombreDosis,
  problemaEsquema,
  resumenDosis,
  resumenPublico,
  textoVencimiento,
} from '../src/servicios/sanidad';
import { PaginaCalendario } from '../src/paginas/sanidad/PaginaCalendario';
import { FormularioEsquemaVacunacion, PaginaEsquemas } from '../src/paginas/sanidad/PaginaEsquemas';
import { AvisosSanidad } from '../src/paginas/sanidad/AvisosSanidad';

/**
 * HU-47 · Esquemas de vacunación, HU-50 · Calendario sanitario y
 * HU-51 · Avisos de vencimientos, del lado de la pantalla. Lo que se calcula
 * (qué dosis toca y cuándo) lo prueba el servidor: calendario-sanitario.test.js.
 */

const REGLAS = [
  { codigo: 'ternero', sexo: 'macho' as const, edad_minima_meses: 0, edad_maxima_meses: 12 },
  { codigo: 'ternera', sexo: 'hembra' as const, edad_minima_meses: 0, edad_maxima_meses: 12 },
  { codigo: 'vaca', sexo: 'hembra' as const, edad_minima_meses: 18, edad_maxima_meses: null },
  { codigo: 'toro', sexo: 'macho' as const, edad_minima_meses: 18, edad_maxima_meses: null },
];

function esquema(cambios: Partial<EsquemaVacunacion> = {}): EsquemaVacunacion {
  return {
    id: 'e-1',
    producto_id: 'p-1',
    producto_nombre: 'Vacuna antiaftosa',
    producto_tipo: 'vacuna',
    nombre: 'Aftosa (todo el rodeo)',
    categorias: null,
    sexo: null,
    edad_minima_meses: 0,
    edad_maxima_meses: null,
    dosis: 1,
    intervalo_dias: null,
    refuerzo_dias: 180,
    animales: 6,
    creado_en: '2026-03-01T00:00:00Z',
    ...cambios,
  };
}

function lista(cambios: Partial<ListaEsquemas> = {}): ListaEsquemas {
  return {
    esquemas: [esquema()],
    productos: [
      { id: 'p-1', nombre: 'Vacuna antiaftosa', tipo: 'vacuna' },
      { id: 'p-2', nombre: 'Brucelosis RB51', tipo: 'vacuna' },
    ],
    categorias: ['ternero', 'ternera', 'vaca', 'toro'],
    ...cambios,
  };
}

function calendario(cambios: Partial<CalendarioSanitario> = {}): CalendarioSanitario {
  return {
    resumen: { vencida: 1, proxima: 1, programada: 0 },
    total: 2,
    pagina: 1,
    por_pagina: 50,
    dias_proxima: 7,
    dosis: [
      {
        animal_id: 'a-1',
        identificador: '0504',
        animal_nombre: null,
        categoria_codigo: 'novillo',
        corral_nombre: 'Engorde',
        esquema_id: 'e-1',
        esquema_nombre: 'Aftosa (todo el rodeo)',
        producto_nombre: 'Vacuna antiaftosa',
        numero_dosis: null,
        dosis_total: 1,
        vence: '2026-10-17',
        dias: -16,
        estado: 'vencida',
      },
      {
        animal_id: 'a-2',
        identificador: '0505',
        animal_nombre: 'Chispa',
        categoria_codigo: 'ternera',
        corral_nombre: null,
        esquema_id: 'e-2',
        esquema_nombre: 'Brucelosis (terneras)',
        producto_nombre: 'Brucelosis RB51',
        numero_dosis: 1,
        dosis_total: 1,
        vence: '2026-11-05',
        dias: 3,
        estado: 'proxima',
      },
    ],
    ...cambios,
  };
}

function contexto(sanidad: 'ver' | 'editar', corrales: 'ninguno' | 'ver' = 'ninguno') {
  vi.spyOn(api, 'miRancho').mockResolvedValue({
    usuario: { id: 'u-3', nombre: 'Jorge Mamani', rol: 'colaborador' },
    tieneRancho: true,
    rancho: null,
  });
  vi.spyOn(api, 'misPermisos').mockResolvedValue({ sanidad, corrales });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Cómo se cuentan los esquemas y las dosis', () => {
  it('resume la serie y el refuerzo', () => {
    expect(resumenDosis(esquema())).toBe(`${t('sanidad.esquemas.dosisUnica')} · ${t('sanidad.esquemas.refuerzo', { n: 180 })}`);
    expect(resumenDosis(esquema({ dosis: 3, intervalo_dias: 21, refuerzo_dias: null }))).toBe(
      `${t('sanidad.esquemas.serie', { n: 3, dias: 21 })} · ${t('sanidad.esquemas.sinRefuerzo')}`,
    );
  });

  it('resume a qué animales se aplica', () => {
    expect(resumenPublico(esquema())).toBe(t('sanidad.esquemas.todasCategorias'));
    expect(
      resumenPublico(esquema({ categorias: ['ternera'], sexo: 'hembra', edad_minima_meses: 3, edad_maxima_meses: 8 })),
    ).toBe(
      [
        t('animales.categorias.ternera'),
        t('sanidad.esquemas.sexos.hembra'),
        t('sanidad.esquemas.edad.rango', { min: 3, max: 8 }),
      ].join(' · '),
    );
    expect(resumenPublico(esquema({ edad_minima_meses: 4 }))).toContain(t('sanidad.esquemas.edad.desde', { n: 4 }));
  });

  it('nombra la dosis y dice cuánto falta', () => {
    expect(nombreDosis({ numero_dosis: 2, dosis_total: 3 })).toBe(t('sanidad.dosis.numero', { n: 2, total: 3 }));
    expect(nombreDosis({ numero_dosis: null, dosis_total: 1 })).toBe(t('sanidad.dosis.refuerzo'));
    expect(textoVencimiento(0)).toBe(t('sanidad.vencimiento.hoy'));
    expect(textoVencimiento(-3)).toBe(tn('sanidad.vencimiento.atrasada', 3));
    expect(textoVencimiento(1)).toBe(tn('sanidad.vencimiento.faltan', 1));
  });

  it('el formulario avisa edades cruzadas y la falta de intervalo', () => {
    const base = formularioDe();
    expect(problemaEsquema(base)).toBeNull();
    expect(problemaEsquema({ ...base, edad_minima_meses: '12', edad_maxima_meses: '6' })).toBe('edadesCruzadas');
    expect(problemaEsquema({ ...base, dosis: '2', intervalo_dias: '' })).toBe('faltaIntervalo');
  });

  it('manda números, nulos donde no hay valor y sin intervalo con una sola dosis', () => {
    const datos = aDatosEsquema({
      ...formularioDe(),
      nombre: 'Aftosa',
      producto_id: 'p-1',
      intervalo_dias: '30',
      refuerzo_dias: '',
    });
    expect(datos).toEqual({
      nombre: 'Aftosa',
      producto_id: 'p-1',
      categorias: null,
      sexo: null,
      edad_minima_meses: 0,
      edad_maxima_meses: null,
      dosis: 1,
      intervalo_dias: null,
      refuerzo_dias: null,
    });
  });

  it('con un sexo elegido solo ofrece las categorías de ese sexo', () => {
    const catalogo = ['ternero', 'ternera', 'vaca', 'toro'];
    expect(categoriasDelSexo(catalogo, REGLAS, '')).toEqual(catalogo);
    expect(categoriasDelSexo(catalogo, REGLAS, 'hembra')).toEqual(['ternera', 'vaca']);
  });
});

describe('HU-47 · la pantalla de esquemas', () => {
  beforeEach(() => {
    vi.spyOn(api, 'reglasCategorias').mockResolvedValue(REGLAS);
  });

  function abrir() {
    render(
      <MemoryRouter initialEntries={['/sanidad/esquemas']}>
        <PaginaEsquemas />
      </MemoryRouter>,
    );
  }

  it('quien edita sanidad ve el botón de nuevo y las acciones de cada esquema', async () => {
    contexto('editar');
    vi.spyOn(api, 'esquemasVacunacion').mockResolvedValue(lista());
    abrir();
    expect(await screen.findByText('Aftosa (todo el rodeo)')).toBeTruthy();
    expect(screen.getByText(tn('sanidad.esquemas.animales', 6))).toBeTruthy();
    await waitFor(() => expect(screen.getByRole('button', { name: t('sanidad.esquemas.nuevo') })).toBeTruthy());
    expect(screen.getByRole('button', { name: t('sanidad.esquemas.editar') })).toBeTruthy();
  });

  it('el socio los ve sin botones', async () => {
    contexto('ver');
    vi.spyOn(api, 'esquemasVacunacion').mockResolvedValue(lista());
    abrir();
    expect(await screen.findByText(t('sanidad.soloConsulta'))).toBeTruthy();
    expect(screen.queryByRole('button', { name: t('sanidad.esquemas.nuevo') })).toBeNull();
    expect(screen.queryByRole('button', { name: t('sanidad.esquemas.editar') })).toBeNull();
  });

  it('sin productos en el catálogo no deja crear y explica por qué', async () => {
    contexto('editar');
    vi.spyOn(api, 'esquemasVacunacion').mockResolvedValue(lista({ esquemas: [], productos: [] }));
    abrir();
    expect(await screen.findByText(t('sanidad.esquemas.sinProductos'))).toBeTruthy();
    expect(screen.queryByRole('button', { name: t('sanidad.esquemas.nuevo') })).toBeNull();
  });

  it('dar de baja pide confirmación antes', async () => {
    contexto('editar');
    vi.spyOn(api, 'esquemasVacunacion').mockResolvedValue(lista());
    const baja = vi.spyOn(api, 'bajaEsquema').mockResolvedValue({ mensaje: 'Listo' });
    abrir();
    fireEvent.click(await screen.findByRole('button', { name: t('sanidad.esquemas.darDeBaja') }));
    expect(baja).not.toHaveBeenCalled();
    expect(screen.getByText(t('sanidad.esquemas.confirmarBaja', { nombre: 'Aftosa (todo el rodeo)' }))).toBeTruthy();
    fireEvent.click(screen.getAllByRole('button', { name: t('sanidad.esquemas.darDeBaja') }).at(-1)!);
    await waitFor(() => expect(baja).toHaveBeenCalledWith('e-1'));
  });
});

describe('HU-47 · el formulario del esquema', () => {
  function abrir(alGuardar = vi.fn()) {
    render(
      <FormularioEsquemaVacunacion lista={lista()} reglas={REGLAS} alGuardar={alGuardar} alCancelar={() => undefined} />,
    );
    return alGuardar;
  }

  it('el intervalo aparece recién con más de una dosis, y es obligatorio', () => {
    abrir();
    expect(screen.queryByLabelText(new RegExp(t('sanidad.esquemas.formulario.intervalo')))).toBeNull();
    fireEvent.change(screen.getByLabelText(new RegExp(t('sanidad.esquemas.formulario.dosis'))), { target: { value: '3' } });
    expect(screen.getByLabelText(new RegExp(t('sanidad.esquemas.formulario.intervalo')))).toBeTruthy();
    expect(screen.getByText(t('sanidad.esquemas.formulario.faltaIntervalo'))).toBeTruthy();
  });

  it('elegir un sexo quita las categorías del otro', () => {
    abrir();
    fireEvent.click(screen.getByLabelText(t('animales.categorias.toro')));
    fireEvent.click(screen.getByLabelText(t('animales.categorias.vaca')));
    fireEvent.change(screen.getByLabelText(t('sanidad.esquemas.formulario.sexo')), { target: { value: 'hembra' } });
    expect(screen.queryByLabelText(t('animales.categorias.toro'))).toBeNull();
    expect((screen.getByLabelText(t('animales.categorias.vaca')) as HTMLInputElement).checked).toBe(true);
  });

  it('guarda con lo que se escribió y muestra el error del servidor si lo hay', async () => {
    const crear = vi
      .spyOn(api, 'crearEsquema')
      .mockRejectedValueOnce(new Error('Ya tienes un esquema llamado «Aftosa».'))
      .mockResolvedValueOnce({ esquema: esquema(), mensaje: 'Listo' });
    const alGuardar = abrir();
    fireEvent.change(screen.getByLabelText(new RegExp(t('sanidad.esquemas.formulario.nombre'))), { target: { value: 'Aftosa' } });
    fireEvent.change(screen.getByLabelText(new RegExp(t('sanidad.esquemas.formulario.producto'))), { target: { value: 'p-1' } });
    fireEvent.change(screen.getByLabelText(t('sanidad.esquemas.formulario.refuerzo')), { target: { value: '180' } });
    const guardar = screen.getByRole('button', { name: t('comun.guardar') });
    fireEvent.click(guardar);
    expect(await screen.findByText('Ya tienes un esquema llamado «Aftosa».')).toBeTruthy();
    fireEvent.click(guardar);
    await waitFor(() => expect(alGuardar).toHaveBeenCalledWith('Listo'));
    expect(crear).toHaveBeenLastCalledWith(expect.objectContaining({ nombre: 'Aftosa', producto_id: 'p-1', refuerzo_dias: 180, dosis: 1 }));
  });
});

describe('HU-50 · el calendario', () => {
  beforeEach(() => {
    vi.spyOn(api, 'esquemasVacunacion').mockResolvedValue(lista());
  });

  function abrir(direccion = '/sanidad') {
    render(
      <MemoryRouter initialEntries={[direccion]}>
        <Routes>
          <Route path="/sanidad" element={<PaginaCalendario />} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it('muestra cada dosis con su estado, lo que falta y el enlace a la ficha', async () => {
    contexto('ver');
    vi.spyOn(api, 'corrales').mockRejectedValue(new Error('No tienes acceso a corrales.'));
    vi.spyOn(api, 'calendarioSanitario').mockResolvedValue(calendario());
    abrir();
    expect(await screen.findByText('0504')).toBeTruthy();
    const filas = screen.getAllByRole('listitem');
    const vencida = filas.find((fila) => within(fila).queryByText('0504'))!;
    expect(within(vencida).getByText(t('sanidad.estados.vencida'))).toBeTruthy();
    expect(within(vencida).getByText(tn('sanidad.vencimiento.atrasada', 16))).toBeTruthy();
    expect(within(vencida).getByText(new RegExp(t('sanidad.dosis.refuerzo')))).toBeTruthy();
    expect(within(vencida).getByRole('link', { name: t('sanidad.calendario.verFicha') }).getAttribute('href')).toBe(
      '/animales/a-1',
    );
    // Sin acceso a corrales, el filtro de corral no aparece.
    expect(screen.queryByLabelText(t('sanidad.calendario.filtros.corral'))).toBeNull();
  });

  it('abre con el estado que trae la dirección y lo pide así al servidor (HU-51)', async () => {
    contexto('ver');
    vi.spyOn(api, 'corrales').mockResolvedValue([]);
    const pedir = vi.spyOn(api, 'calendarioSanitario').mockResolvedValue(calendario());
    abrir('/sanidad?estado=vencida');
    await screen.findByText('0504');
    expect(pedir).toHaveBeenCalledWith(expect.objectContaining({ estado: 'vencida', pagina: 1 }));
    const vencidas = screen.getByRole('button', { name: new RegExp(t('sanidad.estados.vencida')) });
    expect(vencidas.getAttribute('aria-pressed')).toBe('true');
  });

  it('filtrar por producto vuelve a pedir desde la primera página', async () => {
    contexto('ver');
    vi.spyOn(api, 'corrales').mockResolvedValue([]);
    const pedir = vi.spyOn(api, 'calendarioSanitario').mockResolvedValue(calendario());
    abrir();
    await screen.findByText('0504');
    await screen.findByRole('option', { name: 'Brucelosis RB51' });
    fireEvent.change(screen.getByLabelText(t('sanidad.calendario.filtros.producto')), { target: { value: 'p-2' } });
    await waitFor(() =>
      expect(pedir).toHaveBeenLastCalledWith(expect.objectContaining({ producto: 'p-2', pagina: 1 })),
    );
  });

  it('pagina cuando hay más de una página', async () => {
    contexto('ver');
    vi.spyOn(api, 'corrales').mockResolvedValue([]);
    const pedir = vi.spyOn(api, 'calendarioSanitario').mockResolvedValue(calendario({ total: 120 }));
    abrir();
    await screen.findByText(t('sanidad.calendario.mostrando', { desde: 1, hasta: 50, total: 120 }));
    fireEvent.click(screen.getByRole('button', { name: t('sanidad.calendario.siguiente') }));
    await waitFor(() => expect(pedir).toHaveBeenLastCalledWith(expect.objectContaining({ pagina: 2 })));
  });

  it('sin esquemas explica qué falta y, a quien edita, le ofrece definir uno', async () => {
    contexto('editar');
    vi.spyOn(api, 'esquemasVacunacion').mockResolvedValue(lista({ esquemas: [] }));
    vi.spyOn(api, 'corrales').mockResolvedValue([]);
    vi.spyOn(api, 'calendarioSanitario').mockResolvedValue(
      calendario({ dosis: [], total: 0, resumen: { vencida: 0, proxima: 0, programada: 0 } }),
    );
    abrir();
    expect(await screen.findByText(t('sanidad.calendario.vacio.sinEsquemas'))).toBeTruthy();
    expect((await screen.findByRole('link', { name: t('sanidad.calendario.vacio.irEsquemas') })).getAttribute('href')).toBe(
      '/sanidad/esquemas',
    );
  });
});

describe('HU-51 · los avisos del inicio', () => {
  function abrir() {
    render(
      <MemoryRouter>
        <AvisosSanidad />
      </MemoryRouter>,
    );
  }

  const avisos: Avisos = { vencidas: 3, proximas: 4, dias_proxima: 7 };

  it('cuenta las vencidas y las próximas y lleva al calendario filtrado', async () => {
    vi.spyOn(api, 'misPermisos').mockResolvedValue({ sanidad: 'ver' });
    vi.spyOn(api, 'avisosSanidad').mockResolvedValue(avisos);
    abrir();
    expect(await screen.findByText(tn('sanidad.avisos.vencidas', 3))).toBeTruthy();
    expect(screen.getByText(tn('sanidad.avisos.proximas', 4, { dias: 7 }))).toBeTruthy();
    expect(screen.getByRole('link', { name: t('sanidad.avisos.verVencidas') }).getAttribute('href')).toBe(
      '/sanidad?estado=vencida',
    );
    expect(screen.getByRole('link', { name: t('sanidad.avisos.verProximas') }).getAttribute('href')).toBe(
      '/sanidad?estado=proxima',
    );
  });

  it('a quien no tiene sanidad no le pregunta ni le muestra nada', async () => {
    const permisos = vi.spyOn(api, 'misPermisos').mockResolvedValue({ sanidad: 'ninguno', almacen: 'editar' });
    const pedir = vi.spyOn(api, 'avisosSanidad');
    abrir();
    await waitFor(() => expect(permisos).toHaveBeenCalled());
    expect(pedir).not.toHaveBeenCalled();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('sin nada vencido ni próximo no muestra nada', async () => {
    vi.spyOn(api, 'misPermisos').mockResolvedValue({ sanidad: 'editar' });
    const pedir = vi.spyOn(api, 'avisosSanidad').mockResolvedValue({ vencidas: 0, proximas: 0, dias_proxima: 7 });
    abrir();
    await waitFor(() => expect(pedir).toHaveBeenCalled());
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
