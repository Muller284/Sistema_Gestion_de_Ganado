import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { api, type AnimalSanidad, type OpcionesAplicacion } from '../src/servicios/api';
import { t, tn } from '../src/servicios/idioma';
import { REGIONAL_POR_DEFECTO } from '../src/servicios/unidades';
import { AccionesMasivas } from '../src/paginas/animales/AccionesMasivas';
import { AplicacionMasiva } from '../src/paginas/sanidad/AplicacionMasiva';
import { PaginaVacunaRapida } from '../src/paginas/sanidad/PaginaVacunaRapida';

/**
 * HU-49 · Aplicación masiva y HU-52 · Registrar vacuna desde el celular, del
 * lado de la pantalla. Que se guarde todo o nada, y que no cuenten los dados
 * de baja ni los de otro rancho, lo prueba el servidor:
 * servidor/pruebas/aplicacion-masiva.test.js.
 */

const SELECCION = ['a-1', 'a-2', 'a-3'];

function opciones(cambios: Partial<OpcionesAplicacion> = {}): OpcionesAplicacion {
  return {
    productos: [
      { id: 'p-1', nombre: 'Vacuna antiaftosa', tipo: 'vacuna', laboratorio: null, dosis: 2, unidad: 'ml', esquemas: 1, aplicaciones: 0 },
      { id: 'p-2', nombre: 'Ivermectina 1%', tipo: 'antiparasitario', laboratorio: null, dosis: 5, unidad: 'ml', esquemas: 0, aplicaciones: 0 },
    ],
    esquemas: [],
    integrantes: [{ id: 'u-3', nombre: 'Jorge Mamani' }],
    hoy: '2026-11-06',
    ...cambios,
  };
}

const LUCERA: AnimalSanidad = {
  id: 'a-1',
  identificador: '0501',
  nombre: 'Lucera',
  sexo: 'hembra',
  categoria_codigo: 'vaca',
  fecha_nacimiento: '2021-03-14',
  eliminado_en: null,
};

function contexto(sanidad: 'ninguno' | 'ver' | 'editar') {
  vi.spyOn(api, 'miRancho').mockResolvedValue({
    usuario: { id: 'u-3', nombre: 'Jorge Mamani', rol: 'colaborador' },
    tieneRancho: true,
    rancho: null,
  });
  vi.spyOn(api, 'misPermisos').mockResolvedValue({ sanidad });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('HU-49 · «Aplicar producto» en la barra de acciones masivas', () => {
  function barra(cambios: Partial<Parameters<typeof AccionesMasivas>[0]> = {}) {
    render(
      <AccionesMasivas
        seleccion={SELECCION}
        ambito="pagina"
        corrales={[]}
        puedeEliminar={false}
        regional={REGIONAL_POR_DEFECTO}
        alQuitar={() => undefined}
        alTerminar={() => undefined}
        {...cambios}
      />,
    );
  }

  it('criterio 1: aparece junto a las demás acciones para quien edita sanidad', () => {
    vi.spyOn(api, 'opcionesAplicacion').mockResolvedValue(opciones());
    barra({ puedeAplicar: true });
    for (const clave of ['corral', 'estado', 'aplicar']) {
      expect(screen.getByRole('button', { name: t(`animales.masivo.accion.${clave}`) })).toBeTruthy();
    }
  });

  it('quien edita sanidad pero no animales (el veterinario) solo ve esa acción', async () => {
    vi.spyOn(api, 'opcionesAplicacion').mockResolvedValue(opciones());
    barra({ puedeAplicar: true, puedeEditarAnimales: false });
    expect(screen.getByRole('button', { name: t('animales.masivo.accion.aplicar') })).toBeTruthy();
    expect(screen.queryByRole('button', { name: t('animales.masivo.accion.corral') })).toBeNull();
    expect(await screen.findByLabelText(new RegExp(t('sanidad.aplicaciones.formulario.producto')))).toBeTruthy();
  });

  it('sin permiso de sanidad no aparece', () => {
    barra();
    expect(screen.queryByRole('button', { name: t('animales.masivo.accion.aplicar') })).toBeNull();
  });
});

describe('HU-49 · el formulario de la aplicación masiva', () => {
  async function abrir() {
    vi.spyOn(api, 'opcionesAplicacion').mockResolvedValue(opciones());
    const alTerminar = vi.fn();
    render(<AplicacionMasiva seleccion={SELECCION} quienId="u-3" alTerminar={alTerminar} />);
    const producto = await screen.findByLabelText(new RegExp(t('sanidad.aplicaciones.formulario.producto')));
    return { alTerminar, producto };
  }

  it('criterio 2: confirma cuántos animales se van a registrar antes de guardar', async () => {
    const masiva = vi.spyOn(api, 'aplicacionMasiva');
    const { producto } = await abrir();
    const aplicar = screen.getByRole('button', { name: tn('sanidad.masiva.aplicar', 3) }) as HTMLButtonElement;
    expect(aplicar.disabled).toBe(true);

    fireEvent.change(producto, { target: { value: 'p-1' } });
    fireEvent.click(aplicar);
    expect(masiva).not.toHaveBeenCalled();
    expect(screen.getByText(tn('sanidad.masiva.confirmar', 3, { producto: 'Vacuna antiaftosa' }))).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: t('comun.cancelar') }));
    expect(screen.queryByText(tn('sanidad.masiva.confirmar', 3, { producto: 'Vacuna antiaftosa' }))).toBeNull();
    expect(masiva).not.toHaveBeenCalled();
  });

  it('al confirmar manda los elegidos con los datos, y avisa los que no contaron', async () => {
    const masiva = vi.spyOn(api, 'aplicacionMasiva').mockResolvedValue({
      registradas: 2,
      no_contados: 1,
      lote_id: 'l-1',
      mensaje: 'Vacuna antiaftosa registrado en 2 animal(es).',
    });
    const { producto, alTerminar } = await abrir();
    fireEvent.change(producto, { target: { value: 'p-1' } });
    fireEvent.click(screen.getByRole('button', { name: tn('sanidad.masiva.aplicar', 3) }));
    fireEvent.click(screen.getByRole('button', { name: t('sanidad.masiva.siAplicar') }));

    await waitFor(() =>
      expect(masiva).toHaveBeenCalledWith(SELECCION, {
        producto_id: 'p-1',
        fecha: '2026-11-06',
        dosis: 2,
        esquema_id: null,
        numero_dosis: null,
        aplicado_por: 'u-3',
        observacion: null,
      }),
    );
    await waitFor(() =>
      expect(alTerminar).toHaveBeenCalledWith(
        `Vacuna antiaftosa registrado en 2 animal(es). ${tn('sanidad.masiva.noContados', 1)}`,
      ),
    );
  });

  it('criterio 3: si el servidor no guarda ninguna, muestra por qué y deja corregir', async () => {
    vi.spyOn(api, 'aplicacionMasiva').mockRejectedValue(
      new Error('La fecha es anterior al nacimiento de 1 animal(es) (0507). No se registró ninguna aplicación.'),
    );
    const { producto, alTerminar } = await abrir();
    fireEvent.change(producto, { target: { value: 'p-2' } });
    fireEvent.click(screen.getByRole('button', { name: tn('sanidad.masiva.aplicar', 3) }));
    fireEvent.click(screen.getByRole('button', { name: t('sanidad.masiva.siAplicar') }));
    expect(await screen.findByText(/No se registró ninguna aplicación/)).toBeTruthy();
    expect(alTerminar).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: tn('sanidad.masiva.aplicar', 3) })).toBeTruthy();
  });
});

describe('HU-52 · registrar vacuna desde el celular', () => {
  function abrir() {
    render(
      <MemoryRouter initialEntries={['/sanidad/registro-rapido']}>
        <PaginaVacunaRapida />
      </MemoryRouter>,
    );
  }

  function caravana() {
    return screen.getByLabelText(new RegExp(t('sanidad.rapido.caravana'))) as HTMLInputElement;
  }

  it('sin permiso de edición en sanidad explica por qué no puede', async () => {
    contexto('ver');
    abrir();
    expect(await screen.findByText(t('sanidad.rapido.sinPermiso.titulo'))).toBeTruthy();
    expect(screen.queryByLabelText(new RegExp(t('sanidad.rapido.caravana')))).toBeNull();
  });

  it('criterio 1: busca por caravana, muestra el animal, se elige el producto y se registra', async () => {
    contexto('editar');
    vi.spyOn(api, 'opcionesAplicacion').mockResolvedValue(opciones());
    const buscar = vi.spyOn(api, 'buscarAnimalSanidad').mockResolvedValue({ animal: LUCERA });
    const registrar = vi.spyOn(api, 'registrarAplicacion').mockResolvedValue({
      aplicacion: { id: 'ap-1' } as never,
      mensaje: 'Vacuna antiaftosa registrado en el animal 0501.',
    });
    abrir();

    fireEvent.change(await screen.findByLabelText(new RegExp(t('sanidad.rapido.caravana'))), {
      target: { value: ' 0501 ' },
    });
    fireEvent.click(screen.getByRole('button', { name: t('sanidad.rapido.buscar') }));
    await waitFor(() => expect(buscar).toHaveBeenCalledWith('0501'));
    expect(await screen.findByText('0501')).toBeTruthy();
    expect(screen.getByText(`Lucera · ${t('animales.categorias.vaca')}`)).toBeTruthy();

    const registrarBoton = screen.getByRole('button', { name: t('sanidad.rapido.registrar') }) as HTMLButtonElement;
    expect(registrarBoton.disabled).toBe(true);
    fireEvent.click(await screen.findByRole('button', { name: 'Vacuna antiaftosa' }));
    expect(registrarBoton.disabled).toBe(false);
    fireEvent.click(registrarBoton);

    await waitFor(() =>
      expect(registrar).toHaveBeenCalledWith('a-1', {
        producto_id: 'p-1',
        fecha: '2026-11-06',
        dosis: null,
        esquema_id: null,
        numero_dosis: null,
        aplicado_por: null,
        observacion: null,
      }),
    );
  });

  it('criterio 3: después de registrar vuelve a la caravana y el producto se queda, para encadenar', async () => {
    contexto('editar');
    vi.spyOn(api, 'opcionesAplicacion').mockResolvedValue(opciones());
    vi.spyOn(api, 'buscarAnimalSanidad').mockResolvedValue({ animal: LUCERA });
    vi.spyOn(api, 'registrarAplicacion').mockResolvedValue({
      aplicacion: { id: 'ap-1' } as never,
      mensaje: 'Vacuna antiaftosa registrado en el animal 0501.',
    });
    abrir();

    fireEvent.change(await screen.findByLabelText(new RegExp(t('sanidad.rapido.caravana'))), { target: { value: '0501' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Vacuna antiaftosa' }));
    fireEvent.click(screen.getByRole('button', { name: t('sanidad.rapido.buscar') }));
    fireEvent.click(await screen.findByRole('button', { name: t('sanidad.rapido.registrar') }));

    expect(await screen.findByText(tn('sanidad.rapido.sesion.cuantas', 1))).toBeTruthy();
    expect(caravana().value).toBe('');
    expect(document.activeElement).toBe(caravana());
    expect(screen.getByRole('button', { name: 'Vacuna antiaftosa' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: t('sanidad.rapido.buscar') })).toBeTruthy();
  });

  it('cambiar la caravana obliga a buscar de nuevo, y una que no existe se explica', async () => {
    contexto('editar');
    vi.spyOn(api, 'opcionesAplicacion').mockResolvedValue(opciones());
    const buscar = vi
      .spyOn(api, 'buscarAnimalSanidad')
      .mockResolvedValueOnce({ animal: LUCERA })
      .mockRejectedValueOnce(new Error('No hay ningún animal vigente con la caravana 9999 en tu rancho.'));
    abrir();

    fireEvent.change(await screen.findByLabelText(new RegExp(t('sanidad.rapido.caravana'))), { target: { value: '0501' } });
    fireEvent.click(screen.getByRole('button', { name: t('sanidad.rapido.buscar') }));
    await screen.findByRole('button', { name: t('sanidad.rapido.registrar') });

    fireEvent.change(caravana(), { target: { value: '9999' } });
    expect(screen.queryByRole('button', { name: t('sanidad.rapido.registrar') })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: t('sanidad.rapido.buscar') }));
    expect(await screen.findByText('No hay ningún animal vigente con la caravana 9999 en tu rancho.')).toBeTruthy();
    expect(buscar).toHaveBeenCalledTimes(2);
  });

  it('criterio 2: controles grandes y las acciones en la barra de abajo', async () => {
    contexto('editar');
    vi.spyOn(api, 'opcionesAplicacion').mockResolvedValue(opciones());
    abrir();
    const producto = await screen.findByRole('button', { name: 'Ivermectina 1%' });
    expect(producto.className).toContain('btn-movil');
    expect(caravana().closest('.campo')?.className).toContain('campo-movil');
    const buscar = screen.getByRole('button', { name: t('sanidad.rapido.buscar') });
    expect(buscar.closest('.alta-rapida__acciones')).toBeTruthy();
    expect(buscar.className).toContain('btn-movil');
  });
});
