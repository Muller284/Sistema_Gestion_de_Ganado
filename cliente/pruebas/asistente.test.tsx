import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { api } from '../src/servicios/api';
import { asistente, bloquesDeRespuesta, type EstadoAsistente } from '../src/servicios/asistente';
import { t } from '../src/servicios/idioma';
import { PaginaAsistente } from '../src/paginas/asistente/PaginaAsistente';
import { codificarWav, nivel, textoParaLeer } from '../src/servicios/voz';

// El micrófono y el parlante no existen en jsdom: se simulan. Lo demás de
// servicios/voz (WAV, nivel, texto para leer) es el de verdad.
const voz = vi.hoisted(() => ({
  puedeGrabar: vi.fn(() => true),
  reproducir: vi.fn(async () => {}),
  empezar: vi.fn(async () => {}),
  terminar: vi.fn(),
}));

vi.mock('../src/servicios/voz', async (importOriginal) => {
  const real = await importOriginal<typeof import('../src/servicios/voz')>();
  return {
    ...real,
    puedeGrabar: voz.puedeGrabar,
    reproducir: voz.reproducir,
    hayVozDelNavegador: () => false,
    Grabadora: class {
      empezar = voz.empezar;
      terminar = voz.terminar;
      cancelar = () => {};
    },
  };
});

/**
 * Fase 5 · El asistente con IA, del lado de la pantalla.
 *
 *   - Las sugerencias dependen de los módulos que se ven (RF-40).
 *   - La cuota del mes está a la vista y, agotada, no deja preguntar (RF-42).
 *   - La respuesta se dibuja sin interpretar HTML y dice qué consultó.
 *   - La charla sigue: la segunda pregunta lleva la primera como historial.
 *   - Voz: se pregunta hablando y la respuesta se escucha (DECISIONES §49).
 *
 * Que solo lea, que respete los permisos y que no salga del rancho lo prueba
 * el servidor: servidor/pruebas/asistente.test.js.
 */

function contexto() {
  vi.spyOn(api, 'miRancho').mockResolvedValue({
    usuario: { id: 'u-1', nombre: 'Carlos Gutierrez', rol: 'propietario' },
    tieneRancho: true,
    rancho: null,
  });
  vi.spyOn(api, 'misPermisos').mockResolvedValue({});
}

function estado(cambios: Partial<EstadoAsistente> = {}): EstadoAsistente {
  return {
    configurado: true,
    voz: false,
    proveedor: 'generativelanguage.googleapis.com',
    usadas: 3,
    limite: 30,
    modulos: ['animales', 'corrales', 'sanidad', 'pesajes'],
    ...cambios,
  };
}

function abrir() {
  render(
    <MemoryRouter>
      <PaginaAsistente />
    </MemoryRouter>,
  );
}

const campo = () => screen.getByLabelText(t('asistente.campo')) as HTMLTextAreaElement;
const botonPreguntar = () => screen.getByRole('button', { name: new RegExp(t('asistente.enviar')) }) as HTMLButtonElement;

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  voz.reproducir.mockClear();
  voz.empezar.mockReset();
  voz.terminar.mockReset();
});

describe('Asistente · respuesta en bloques', () => {
  it('arma párrafos, listas y negritas sin interpretar HTML', () => {
    const bloques = bloquesDeRespuesta('Hay **2** vacas:\n- 0501 Lucera\n- 0502 <b>Canela</b>\n\nFin.');
    expect(bloques).toEqual([
      { tipo: 'parrafo', trozos: [{ tipo: 'texto', texto: 'Hay ' }, { tipo: 'negrita', texto: '2' }, { tipo: 'texto', texto: ' vacas:' }] },
      {
        tipo: 'lista',
        items: [[{ tipo: 'texto', texto: '0501 Lucera' }], [{ tipo: 'texto', texto: '0502 <b>Canela</b>' }]],
      },
      { tipo: 'parrafo', trozos: [{ tipo: 'texto', texto: 'Fin.' }] },
    ]);
  });
});

describe('Asistente · pantalla', () => {
  it('RF-40: las sugerencias son solo de los módulos que ve', async () => {
    contexto();
    vi.spyOn(asistente, 'estado').mockResolvedValue(estado({ modulos: ['sanidad'] }));
    abrir();
    expect(await screen.findByText(t('asistente.ejemplos.sanidad'))).toBeTruthy();
    expect(screen.getByText(t('asistente.ejemplos.resumen'))).toBeTruthy();
    expect(screen.queryByText(t('asistente.ejemplos.animales'))).toBeNull();
    expect(screen.queryByText(t('asistente.ejemplos.pesajes'))).toBeNull();
  });

  it('RF-42: muestra la cuota y, agotada, no deja preguntar', async () => {
    contexto();
    vi.spyOn(asistente, 'estado').mockResolvedValue(estado({ usadas: 30, limite: 30 }));
    abrir();
    expect(await screen.findByText(t('asistente.sinCuota', { n: 30 }))).toBeTruthy();
    expect(screen.getByText(t('asistente.cuota', { usadas: 30, limite: 30 }))).toBeTruthy();
    expect(campo().disabled).toBe(true);
  });

  it('sin clave en el servidor avisa que no está configurado', async () => {
    contexto();
    vi.spyOn(asistente, 'estado').mockResolvedValue(estado({ configurado: false }));
    abrir();
    expect(await screen.findByText(t('asistente.sinConfigurar'))).toBeTruthy();
    expect(campo().disabled).toBe(true);
  });

  it('pregunta, muestra la respuesta con lo que consultó y suma la cuota', async () => {
    contexto();
    vi.spyOn(asistente, 'estado').mockResolvedValue(estado());
    const preguntar = vi.spyOn(asistente, 'preguntar').mockResolvedValue({
      id: 'c-1',
      respuesta: 'Tienes **2** vacas:\n- 0501\n- 0502',
      herramientas: ['buscar_animales'],
      usadas: 4,
      limite: 30,
    });
    abrir();
    await screen.findByText(t('asistente.cuota', { usadas: 3, limite: 30 }));

    fireEvent.change(campo(), { target: { value: '¿Cuántas vacas tengo?' } });
    fireEvent.click(botonPreguntar());

    expect(await screen.findByText('0501')).toBeTruthy();
    expect(preguntar).toHaveBeenCalledWith('¿Cuántas vacas tengo?', []);
    expect(screen.getByText('¿Cuántas vacas tengo?')).toBeTruthy();
    expect(screen.getByText('2').tagName).toBe('STRONG');
    expect(
      screen.getByText(t('asistente.consulto', { lista: t('asistente.herramientas.buscar_animales') })),
    ).toBeTruthy();
    expect(screen.getByText(t('asistente.cuota', { usadas: 4, limite: 30 }))).toBeTruthy();
    expect(campo().value).toBe('');
  });

  it('la segunda pregunta lleva la primera como historial', async () => {
    contexto();
    vi.spyOn(asistente, 'estado').mockResolvedValue(estado());
    const preguntar = vi
      .spyOn(asistente, 'preguntar')
      .mockResolvedValueOnce({ id: 'c-1', respuesta: 'La más pesada es la 0501.', herramientas: [], usadas: 4, limite: 30 })
      .mockResolvedValueOnce({ id: 'c-2', respuesta: 'Pesa 468 kg.', herramientas: [], usadas: 5, limite: 30 });
    abrir();
    await screen.findByLabelText(t('asistente.campo'));

    fireEvent.change(campo(), { target: { value: '¿Cuál es la más pesada?' } });
    fireEvent.click(botonPreguntar());
    await screen.findByText('La más pesada es la 0501.');

    fireEvent.change(campo(), { target: { value: '¿Cuánto pesa?' } });
    fireEvent.keyDown(campo(), { key: 'Enter' });
    await screen.findByText('Pesa 468 kg.');
    expect(preguntar).toHaveBeenLastCalledWith('¿Cuánto pesa?', [
      { rol: 'usuario', texto: '¿Cuál es la más pesada?' },
      { rol: 'asistente', texto: 'La más pesada es la 0501.' },
    ]);
  });

  it('si falla, muestra el error y devuelve la pregunta al campo', async () => {
    contexto();
    vi.spyOn(asistente, 'estado').mockResolvedValue(estado());
    vi.spyOn(asistente, 'preguntar').mockRejectedValue(new Error('El asistente llegó al límite gratuito.'));
    abrir();
    await screen.findByLabelText(t('asistente.campo'));

    fireEvent.change(campo(), { target: { value: 'Hola' } });
    fireEvent.click(botonPreguntar());

    expect(await screen.findByText('El asistente llegó al límite gratuito.')).toBeTruthy();
    await waitFor(() => expect(campo().value).toBe('Hola'));
  });
});

describe('Asistente · voz, piezas', () => {
  it('codifica WAV de 16 kHz, mono y 16 bits', () => {
    const wav = codificarWav(new Float32Array([0, 1, -1, 0.5]));
    const vista = new DataView(wav.buffer);
    expect(String.fromCharCode(...wav.subarray(0, 4))).toBe('RIFF');
    expect(String.fromCharCode(...wav.subarray(8, 12))).toBe('WAVE');
    expect(vista.getUint16(22, true)).toBe(1);
    expect(vista.getUint32(24, true)).toBe(16000);
    expect(vista.getUint32(40, true)).toBe(8);
    expect(wav.length).toBe(52);
    expect(vista.getInt16(46, true)).toBe(32767);
    expect(vista.getInt16(48, true)).toBe(-32768);
  });

  it('distingue silencio de voz por el nivel', () => {
    expect(nivel(new Float32Array(1600))).toBe(0);
    expect(nivel(new Float32Array(1600).fill(0.2))).toBeCloseTo(0.2);
  });

  it('lee la respuesta sin marcas de lista ni negritas', () => {
    expect(textoParaLeer('Tienes **2** vacas:\n- 0501 Lucera\n- 0502')).toBe('Tienes 2 vacas:\n0501 Lucera.\n0502.');
  });
});

describe('Asistente · voz, pantalla', () => {
  const botonHablar = () => screen.getByRole('button', { name: new RegExp(t('asistente.voz.hablar')) });

  it('sin voz en el servidor no aparecen el micrófono ni «Escuchar»', async () => {
    contexto();
    vi.spyOn(asistente, 'estado').mockResolvedValue(estado({ voz: false }));
    vi.spyOn(asistente, 'preguntar').mockResolvedValue({ id: 'c-1', respuesta: 'Hola.', herramientas: [], usadas: 4, limite: 30 });
    abrir();
    await screen.findByLabelText(t('asistente.campo'));
    expect(screen.queryByRole('button', { name: new RegExp(t('asistente.voz.hablar')) })).toBeNull();
    fireEvent.change(campo(), { target: { value: 'Hola' } });
    fireEvent.click(botonPreguntar());
    await screen.findByText('Hola.');
    expect(screen.queryByRole('button', { name: t('asistente.voz.escuchar') })).toBeNull();
  });

  it('pregunta hablando: graba, transcribe, pregunta y lee la respuesta', async () => {
    contexto();
    vi.spyOn(asistente, 'estado').mockResolvedValue(estado({ voz: true }));
    voz.terminar.mockResolvedValue({ audio: 'UklGRg==', segundos: 2, hayVoz: true });
    const transcribir = vi.spyOn(asistente, 'transcribir').mockResolvedValue({ texto: '¿Cuántas vacas tengo?' });
    const preguntar = vi
      .spyOn(asistente, 'preguntar')
      .mockResolvedValue({ id: 'c-9', respuesta: 'Tienes 2 vacas.', herramientas: [], usadas: 4, limite: 30 });
    const leer = vi.spyOn(asistente, 'voz').mockResolvedValue({ tipo: 'audio/wav', audio: 'QUJD' });
    abrir();
    await screen.findByLabelText(t('asistente.campo'));

    fireEvent.click(botonHablar());
    expect(await screen.findByText(t('asistente.voz.grabando'))).toBeTruthy();
    expect(voz.empezar).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: new RegExp(t('asistente.voz.detener', { tiempo: '0:00' })) }));
    expect(await screen.findByText('Tienes 2 vacas.')).toBeTruthy();
    expect(transcribir).toHaveBeenCalledWith('UklGRg==');
    expect(preguntar).toHaveBeenCalledWith('¿Cuántas vacas tengo?', []);
    expect(screen.getByText('¿Cuántas vacas tengo?')).toBeTruthy();
    await waitFor(() => expect(voz.reproducir).toHaveBeenCalledWith('QUJD', 'audio/wav'));
    expect(leer).toHaveBeenCalledWith('c-9');
  });

  it('si fue silencio no lo manda y pide repetir', async () => {
    contexto();
    vi.spyOn(asistente, 'estado').mockResolvedValue(estado({ voz: true }));
    voz.terminar.mockResolvedValue({ audio: 'UklGRg==', segundos: 3, hayVoz: false });
    const transcribir = vi.spyOn(asistente, 'transcribir');
    abrir();
    await screen.findByLabelText(t('asistente.campo'));

    fireEvent.click(botonHablar());
    fireEvent.click(await screen.findByRole('button', { name: new RegExp(t('asistente.voz.detener', { tiempo: '0:00' })) }));
    expect(await screen.findByText(t('asistente.voz.noSeEscucho'))).toBeTruthy();
    expect(transcribir).not.toHaveBeenCalled();
  });

  it('sin permiso para el micrófono lo explica', async () => {
    contexto();
    vi.spyOn(asistente, 'estado').mockResolvedValue(estado({ voz: true }));
    voz.empezar.mockRejectedValue(new DOMException('denegado', 'NotAllowedError'));
    abrir();
    await screen.findByLabelText(t('asistente.campo'));

    fireEvent.click(botonHablar());
    expect(await screen.findByText(t('asistente.voz.sinPermiso'))).toBeTruthy();
  });

  it('«Escuchar» pide la voz a Gemini una sola vez por respuesta', async () => {
    contexto();
    vi.spyOn(asistente, 'estado').mockResolvedValue(estado({ voz: true }));
    vi.spyOn(asistente, 'preguntar').mockResolvedValue({ id: 'c-3', respuesta: 'Hola.', herramientas: [], usadas: 4, limite: 30 });
    const leer = vi.spyOn(asistente, 'voz').mockResolvedValue({ tipo: 'audio/wav', audio: 'QUJD' });
    abrir();
    await screen.findByLabelText(t('asistente.campo'));
    fireEvent.change(campo(), { target: { value: 'Hola' } });
    fireEvent.click(botonPreguntar());
    await screen.findByText('Hola.');
    expect(leer).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: t('asistente.voz.escuchar') }));
    await waitFor(() => expect(voz.reproducir).toHaveBeenCalledTimes(1));
    await screen.findByRole('button', { name: t('asistente.voz.escuchar') });
    fireEvent.click(screen.getByRole('button', { name: t('asistente.voz.escuchar') }));
    await waitFor(() => expect(voz.reproducir).toHaveBeenCalledTimes(2));
    expect(leer).toHaveBeenCalledTimes(1);
  });
});
