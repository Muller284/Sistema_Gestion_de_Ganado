import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { api, type RespuestaPesajeRapido } from '../src/servicios/api';
import { t, tn } from '../src/servicios/idioma';
import { textoGanancia } from '../src/servicios/pesos';
import { REGIONAL_POR_DEFECTO } from '../src/servicios/unidades';
import { PaginaPesajeRapido } from '../src/paginas/pesajes/PaginaPesajeRapido';

/**
 * HU-55 · Registro rápido de pesaje desde el celular, del lado de la pantalla.
 *
 *   1. Se escribe la caravana y el peso, y se guarda con un solo toque.
 *   2. Todo lo tocable mide al menos 48 píxeles; después de guardar, el
 *      cursor vuelve a la caravana.
 *   3. Muestra la ganancia diaria del animal recién pesado.
 *
 * Las reglas del pesaje (fecha, animal activo, uno por día, permisos y
 * aislamiento) las prueba el servidor: servidor/pruebas/pesaje-rapido.test.js.
 */

function contexto(pesajes: 'ninguno' | 'ver' | 'editar') {
  vi.spyOn(api, 'miRancho').mockResolvedValue({
    usuario: { id: 'u-4', nombre: 'Roberto Justiniano', rol: 'colaborador' },
    tieneRancho: true,
    rancho: null,
  });
  vi.spyOn(api, 'misPermisos').mockResolvedValue({ pesajes });
}

function respuesta(cambios: Partial<RespuestaPesajeRapido> = {}): RespuestaPesajeRapido {
  return {
    pesaje: {
      id: 'p-9',
      animal_id: 'a-3',
      fecha: '2026-11-09',
      peso_kg: 412,
      observacion: null,
      lote_id: null,
      creado_en: '2026-11-09T11:00:00.000Z',
      registrado_por: 'Roberto Justiniano',
    },
    peso_actual_kg: 412,
    mensaje: 'Listo, registraste el pesaje de 0503.',
    animal: { id: 'a-3', identificador: '0503', nombre: null, categoria_codigo: 'novillo', corral_nombre: null },
    // 10 días antes, 402 kg: gana 1 kg por día.
    anterior: { fecha: '2026-10-30', peso_kg: 402 },
    ...cambios,
  };
}

function abrir() {
  render(
    <MemoryRouter>
      <PaginaPesajeRapido />
    </MemoryRouter>,
  );
}

const etiquetaCaravana = () => new RegExp(t('pesajes.rapido.caravana'));
const etiquetaPeso = () => new RegExp(t('pesajes.rapido.peso', { unidad: 'kg' }).replace(/[()]/g, '\\$&'));
const botonGuardar = () => screen.getByRole('button', { name: new RegExp(t('pesajes.rapido.guardar')) }) as HTMLButtonElement;

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('HU-55 · registro rápido de pesaje desde el celular', () => {
  it('criterio 1: con la caravana y el peso se guarda con un solo toque', async () => {
    contexto('editar');
    const registrar = vi.spyOn(api, 'registrarPesajeRapido').mockResolvedValue(respuesta());
    abrir();

    const caravana = await screen.findByLabelText(etiquetaCaravana());
    expect(botonGuardar().disabled).toBe(true);
    fireEvent.change(caravana, { target: { value: ' 0503 ' } });
    expect(botonGuardar().disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(etiquetaPeso()), { target: { value: '412' } });
    expect(botonGuardar().disabled).toBe(false);

    fireEvent.click(botonGuardar());
    await waitFor(() => expect(registrar).toHaveBeenCalledTimes(1));
    expect(registrar).toHaveBeenCalledWith({ identificador: '0503', peso_kg: 412 });
  });

  it('criterio 2: después de guardar, los campos se vacían y el cursor vuelve a la caravana', async () => {
    contexto('editar');
    vi.spyOn(api, 'registrarPesajeRapido').mockResolvedValue(respuesta());
    abrir();

    const caravana = (await screen.findByLabelText(etiquetaCaravana())) as HTMLInputElement;
    const peso = screen.getByLabelText(etiquetaPeso()) as HTMLInputElement;
    fireEvent.change(caravana, { target: { value: '0503' } });
    fireEvent.change(peso, { target: { value: '412' } });
    peso.focus();
    fireEvent.click(botonGuardar());

    await screen.findByText(tn('pesajes.rapido.sesion.cuantos', 1));
    expect(caravana.value).toBe('');
    expect(peso.value).toBe('');
    expect(document.activeElement).toBe(caravana);
  });

  it('criterio 2: campos y botones usan el alto del celular y las acciones van abajo', async () => {
    contexto('editar');
    abrir();
    const caravana = await screen.findByLabelText(etiquetaCaravana());
    expect(caravana.closest('.campo')?.className).toContain('campo-movil');
    expect(screen.getByLabelText(etiquetaPeso()).closest('.campo')?.className).toContain('campo-movil');
    expect(botonGuardar().className).toContain('btn-movil');
    expect(botonGuardar().closest('.alta-rapida__acciones')).toBeTruthy();
  });

  it('Enter en la caravana pasa al peso, sin guardar', async () => {
    contexto('editar');
    const registrar = vi.spyOn(api, 'registrarPesajeRapido');
    abrir();
    const caravana = await screen.findByLabelText(etiquetaCaravana());
    fireEvent.change(caravana, { target: { value: '0503' } });
    fireEvent.keyDown(caravana, { key: 'Enter' });
    expect(document.activeElement).toBe(screen.getByLabelText(etiquetaPeso()));
    expect(registrar).not.toHaveBeenCalled();
  });

  it('criterio 3: muestra la ganancia diaria del animal recién pesado', async () => {
    contexto('editar');
    vi.spyOn(api, 'registrarPesajeRapido').mockResolvedValue(respuesta());
    abrir();
    fireEvent.change(await screen.findByLabelText(etiquetaCaravana()), { target: { value: '0503' } });
    fireEvent.change(screen.getByLabelText(etiquetaPeso()), { target: { value: '412' } });
    fireEvent.click(botonGuardar());

    const ganancia = textoGanancia(1, REGIONAL_POR_DEFECTO);
    expect(await screen.findByText(t('pesajes.rapido.ganancia', { ganancia }))).toBeTruthy();
  });

  it('criterio 3: si es su primer pesaje, explica que falta otro para calcularla', async () => {
    contexto('editar');
    vi.spyOn(api, 'registrarPesajeRapido').mockResolvedValue(respuesta({ anterior: null }));
    abrir();
    fireEvent.change(await screen.findByLabelText(etiquetaCaravana()), { target: { value: '0503' } });
    fireEvent.change(screen.getByLabelText(etiquetaPeso()), { target: { value: '412' } });
    fireEvent.click(botonGuardar());
    expect(await screen.findByText(t('pesajes.rapido.primerPesaje'))).toBeTruthy();
  });

  it('si la caravana no existe, muestra el error y deja lo escrito para corregirlo', async () => {
    contexto('editar');
    vi.spyOn(api, 'registrarPesajeRapido').mockRejectedValue(new Error('No hay ningún animal con la caravana «0599»'));
    abrir();
    const caravana = (await screen.findByLabelText(etiquetaCaravana())) as HTMLInputElement;
    fireEvent.change(caravana, { target: { value: '0599' } });
    fireEvent.change(screen.getByLabelText(etiquetaPeso()), { target: { value: '412' } });
    fireEvent.click(botonGuardar());
    expect(await screen.findByText(/0599/)).toBeTruthy();
    expect(caravana.value).toBe('0599');
    expect(document.activeElement).toBe(caravana);
  });

  it('un peso de cero no deja guardar', async () => {
    contexto('editar');
    abrir();
    fireEvent.change(await screen.findByLabelText(etiquetaCaravana()), { target: { value: '0503' } });
    fireEvent.change(screen.getByLabelText(etiquetaPeso()), { target: { value: '0' } });
    expect(botonGuardar().disabled).toBe(true);
  });

  it('quien no edita pesajes ve por qué no puede usarla', async () => {
    contexto('ver');
    abrir();
    expect(await screen.findByText(t('pesajes.rapido.sinPermiso.titulo'))).toBeTruthy();
    expect(screen.queryByLabelText(etiquetaCaravana())).toBeNull();
  });
});
