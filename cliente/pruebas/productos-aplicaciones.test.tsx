import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  api,
  type AplicacionSanitaria,
  type Animal,
  type FichaAnimal,
  type OpcionesAplicacion,
  type ProductoSanitario,
} from '../src/servicios/api';
import { t, tn } from '../src/servicios/idioma';
import {
  aDatosProducto,
  formularioProducto,
  problemaProducto,
  textoDosis,
} from '../src/servicios/productos';
import {
  aDatosAplicacion,
  conProducto,
  detalleAplicacion,
  esquemasDelProducto,
  formularioAplicacion,
  problemaAplicacion,
} from '../src/servicios/aplicaciones';
import { armarHistorial } from '../src/paginas/animales/historial';
import { FormularioProductoSanitario, PaginaProductos } from '../src/paginas/sanidad/PaginaProductos';
import { PestanaSanidad } from '../src/paginas/sanidad/PestanaSanidad';
import { REGIONAL_POR_DEFECTO } from '../src/servicios/unidades';

/**
 * HU-46 · Catálogo de productos sanitarios y HU-48 · Registro de aplicación
 * individual, del lado de la pantalla. Las reglas que deciden (nombre
 * repetido, animal dado de baja, producto de otro rancho) las prueba el
 * servidor: productos-sanitarios.test.js y aplicaciones-sanitarias.test.js.
 */

function producto(cambios: Partial<ProductoSanitario> = {}): ProductoSanitario {
  return {
    id: 'p-1',
    nombre: 'Vacuna antiaftosa',
    tipo: 'vacuna',
    laboratorio: 'Biogénesis Bagó',
    dosis: 2,
    unidad: 'ml',
    esquemas: 1,
    aplicaciones: 4,
    ...cambios,
  };
}

const IVERMECTINA = producto({ id: 'p-2', nombre: 'Ivermectina 1%', tipo: 'antiparasitario', laboratorio: null, dosis: 5, esquemas: 0 });

function opciones(cambios: Partial<OpcionesAplicacion> = {}): OpcionesAplicacion {
  return {
    productos: [producto(), IVERMECTINA],
    esquemas: [{ id: 'e-1', nombre: 'Aftosa (todo el rodeo)', producto_id: 'p-1', dosis: 2, refuerzo_dias: 180 }],
    integrantes: [
      { id: 'u-3', nombre: 'Jorge Mamani' },
      { id: 'u-4', nombre: 'Roberto Justiniano' },
    ],
    hoy: '2026-11-06',
    ...cambios,
  };
}

function aplicacion(cambios: Partial<AplicacionSanitaria> = {}): AplicacionSanitaria {
  return {
    id: 'ap-1',
    fecha: '2026-11-02',
    producto_id: 'p-1',
    producto_nombre: 'Vacuna antiaftosa',
    producto_tipo: 'vacuna',
    producto_dado_de_baja: false,
    esquema_id: 'e-1',
    esquema_nombre: 'Aftosa (todo el rodeo)',
    numero_dosis: 1,
    dosis: 2,
    unidad: 'ml',
    aplicado_por: 'u-4',
    aplicado_por_nombre: 'Roberto Justiniano',
    observacion: 'Campaña de noviembre',
    creado_en: '2026-11-02T14:00:00.000Z',
    registrado_por: 'Jorge Mamani',
    ...cambios,
  };
}

function animal(cambios: Partial<Animal> = {}): Animal {
  return {
    id: 'a-1',
    identificador: '0501',
    tipo_identificador: 'caravana',
    nombre: 'Lucera',
    raza: 'Nelore',
    sexo: 'hembra',
    categoria_codigo: 'vaca',
    fecha_nacimiento: '2021-03-14',
    origen: 'nacido',
    peso_kg: 468,
    corral_id: null,
    corral_nombre: null,
    estado: 'activo',
    creado_en: '2026-03-01T12:00:00.000Z',
    modificado_en: '2026-03-01T12:00:00.000Z',
    creado_por_nombre: 'Carlos Gutierrez',
    modificado_por_nombre: 'Carlos Gutierrez',
    eliminado_en: null,
    ...cambios,
  } as Animal;
}

function contexto(sanidad: 'ver' | 'editar') {
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

describe('HU-46 · lo que controla el formulario del producto', () => {
  it('la dosis y su unidad van juntas, o ninguna de las dos', () => {
    const base = formularioProducto();
    expect(problemaProducto(base)).toBeNull();
    expect(problemaProducto({ ...base, dosis: '2' })).toBe('dosisSinUnidad');
    expect(problemaProducto({ ...base, unidad: 'ml' })).toBe('dosisSinUnidad');
    expect(problemaProducto({ ...base, dosis: '2,5', unidad: 'ml' })).toBeNull();
  });

  it('la dosis es un número mayor que cero con dos decimales como mucho', () => {
    const base = { ...formularioProducto(), unidad: 'ml' as const };
    for (const dosis of ['0', '-1', '1,555', 'mucho']) {
      expect(problemaProducto({ ...base, dosis })).toBe('dosisInvalida');
    }
  });

  it('manda el texto limpio, la coma como punto y nulo lo que está vacío', () => {
    expect(
      aDatosProducto({ nombre: '  Ivermectina 1% ', tipo: 'antiparasitario', laboratorio: '  ', dosis: '2,5', unidad: 'ml' }),
    ).toEqual({ nombre: 'Ivermectina 1%', tipo: 'antiparasitario', laboratorio: null, dosis: 2.5, unidad: 'ml' });
    expect(aDatosProducto(formularioProducto(producto({ dosis: null, unidad: null })))).toMatchObject({
      dosis: null,
      unidad: null,
    });
  });

  it('la dosis se muestra con su unidad', () => {
    expect(textoDosis(2.5, 'ml')).toMatch(/^2[,.]5 ml$/);
    expect(textoDosis(null, null)).toBeNull();
  });
});

describe('HU-46 · la pantalla del catálogo', () => {
  function abrir() {
    render(
      <MemoryRouter initialEntries={['/sanidad/productos']}>
        <PaginaProductos />
      </MemoryRouter>,
    );
  }

  it('quien edita sanidad ve los productos con su tipo, dosis y botones', async () => {
    contexto('editar');
    vi.spyOn(api, 'productosSanitarios').mockResolvedValue({ productos: [producto(), IVERMECTINA] });
    abrir();
    expect(await screen.findByText('Ivermectina 1%')).toBeTruthy();
    expect(screen.getByText(`${t('sanidad.productos.tipos.vacuna')} · Biogénesis Bagó`)).toBeTruthy();
    expect(screen.getByText(tn('sanidad.productos.esquemas', 1))).toBeTruthy();
    await waitFor(() => expect(screen.getByRole('button', { name: t('sanidad.productos.nuevo') })).toBeTruthy());
    expect(screen.getAllByRole('button', { name: t('sanidad.productos.editar') })).toHaveLength(2);
  });

  it('criterio 4: el que usa un esquema no ofrece la baja y dice por qué; el otro la confirma antes', async () => {
    contexto('editar');
    vi.spyOn(api, 'productosSanitarios').mockResolvedValue({ productos: [producto(), IVERMECTINA] });
    const baja = vi.spyOn(api, 'bajaProducto').mockResolvedValue({ mensaje: 'Listo' });
    abrir();
    expect(await screen.findByText(t('sanidad.productos.enUso'))).toBeTruthy();
    const botones = await screen.findAllByRole('button', { name: t('sanidad.productos.darDeBaja') });
    expect(botones).toHaveLength(1);
    fireEvent.click(botones[0]);
    expect(baja).not.toHaveBeenCalled();
    expect(screen.getByText(t('sanidad.productos.confirmarBaja', { nombre: 'Ivermectina 1%' }))).toBeTruthy();
    fireEvent.click(screen.getAllByRole('button', { name: t('sanidad.productos.darDeBaja') }).at(-1)!);
    await waitFor(() => expect(baja).toHaveBeenCalledWith('p-2'));
  });

  it('criterio 5: el socio ve el catálogo sin botones', async () => {
    contexto('ver');
    vi.spyOn(api, 'productosSanitarios').mockResolvedValue({ productos: [producto()] });
    abrir();
    expect(await screen.findByText(t('sanidad.soloConsulta'))).toBeTruthy();
    expect(screen.getByText('Vacuna antiaftosa')).toBeTruthy();
    expect(screen.queryByRole('button', { name: t('sanidad.productos.nuevo') })).toBeNull();
    expect(screen.queryByRole('button', { name: t('sanidad.productos.editar') })).toBeNull();
  });

  it('sin productos explica qué cargar', async () => {
    contexto('editar');
    vi.spyOn(api, 'productosSanitarios').mockResolvedValue({ productos: [] });
    abrir();
    expect(await screen.findByText(t('sanidad.productos.vacio.titulo'))).toBeTruthy();
    expect(screen.getByText(t('sanidad.productos.vacio.texto'))).toBeTruthy();
  });
});

describe('HU-46 · el formulario del producto', () => {
  it('no deja guardar sin nombre y tipo, ni con la dosis sin unidad', () => {
    render(<FormularioProductoSanitario alGuardar={() => undefined} alCancelar={() => undefined} />);
    const guardar = screen.getByRole('button', { name: t('comun.guardar') }) as HTMLButtonElement;
    expect(guardar.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(new RegExp(t('sanidad.productos.formulario.nombre'))), {
      target: { value: 'Vitamina ADE' },
    });
    fireEvent.change(screen.getByLabelText(new RegExp(t('sanidad.productos.formulario.tipo'))), {
      target: { value: 'vitamina' },
    });
    expect(guardar.disabled).toBe(false);
    fireEvent.change(screen.getByLabelText(t('sanidad.productos.formulario.dosis')), { target: { value: '5' } });
    expect(screen.getByText(t('sanidad.productos.formulario.dosisSinUnidad'))).toBeTruthy();
    expect(guardar.disabled).toBe(true);
  });

  it('criterio 3: guarda lo escrito y muestra el error del servidor, como el nombre repetido', async () => {
    const crear = vi
      .spyOn(api, 'crearProducto')
      .mockRejectedValue(new Error('Ya tienes un producto llamado «Vitamina ADE».'));
    render(<FormularioProductoSanitario alGuardar={() => undefined} alCancelar={() => undefined} />);
    fireEvent.change(screen.getByLabelText(new RegExp(t('sanidad.productos.formulario.nombre'))), {
      target: { value: ' VITAMINA ADÉ ' },
    });
    fireEvent.change(screen.getByLabelText(new RegExp(t('sanidad.productos.formulario.tipo'))), {
      target: { value: 'vitamina' },
    });
    fireEvent.click(screen.getByRole('button', { name: t('comun.guardar') }));
    await waitFor(() =>
      expect(crear).toHaveBeenCalledWith({ nombre: 'VITAMINA ADÉ', tipo: 'vitamina', laboratorio: null, dosis: null, unidad: null }),
    );
    expect(await screen.findByText('Ya tienes un producto llamado «Vitamina ADE».')).toBeTruthy();
  });
});

describe('HU-48 · lo que controla el formulario de la aplicación', () => {
  it('empieza con la fecha de hoy y aplicado por quien la registra', () => {
    expect(formularioAplicacion('2026-11-06', 'u-3')).toMatchObject({ fecha: '2026-11-06', aplicado_por: 'u-3' });
  });

  it('al elegir el producto sugiere su dosis y limpia el esquema de otro producto', () => {
    const conAftosa = { ...formularioAplicacion('2026-11-06', 'u-3'), producto_id: 'p-1', esquema_id: 'e-1', numero_dosis: '2' };
    const conIvermectina = conProducto(conAftosa, 'p-2', opciones());
    expect(conIvermectina).toMatchObject({ producto_id: 'p-2', dosis: '5', esquema_id: '', numero_dosis: '' });
    expect(conProducto(conAftosa, 'p-1', opciones())).toMatchObject({ dosis: '2', esquema_id: 'e-1', numero_dosis: '2' });
  });

  it('solo ofrece los esquemas del producto elegido', () => {
    expect(esquemasDelProducto(opciones().esquemas, 'p-1').map((e) => e.id)).toEqual(['e-1']);
    expect(esquemasDelProducto(opciones().esquemas, 'p-2')).toEqual([]);
    expect(esquemasDelProducto(opciones().esquemas, '')).toEqual([]);
  });

  it('criterio 1: la fecha no puede ser futura ni anterior al nacimiento', () => {
    const base = formularioAplicacion('2026-11-06', 'u-3');
    expect(problemaAplicacion(base, '2026-11-06', '2021-03-14')).toBeNull();
    expect(problemaAplicacion({ ...base, fecha: '2026-11-07' }, '2026-11-06', '2021-03-14')).toBe('fechaFutura');
    expect(problemaAplicacion({ ...base, fecha: '2021-03-13' }, '2026-11-06', '2021-03-14')).toBe('antesDeNacer');
    expect(problemaAplicacion({ ...base, dosis: '0' }, '2026-11-06', null)).toBe('dosisInvalida');
  });

  it('con esquema manda el número de dosis, o nulo si es un refuerzo; sin esquema, ninguno de los dos', () => {
    const base = { ...formularioAplicacion('2026-11-06', 'u-3'), producto_id: 'p-1', dosis: '2,5', observacion: '  ' };
    expect(aDatosAplicacion({ ...base, esquema_id: 'e-1', numero_dosis: '2' })).toEqual({
      producto_id: 'p-1',
      fecha: '2026-11-06',
      dosis: 2.5,
      esquema_id: 'e-1',
      numero_dosis: 2,
      aplicado_por: 'u-3',
      observacion: null,
    });
    expect(aDatosAplicacion({ ...base, esquema_id: 'e-1', numero_dosis: '' })).toMatchObject({ numero_dosis: null });
    expect(aDatosAplicacion({ ...base, numero_dosis: '2' })).toMatchObject({ esquema_id: null, numero_dosis: null });
  });

  it('describe el tipo, la dosis y qué dosis del esquema fue', () => {
    expect(detalleAplicacion(aplicacion())).toContain(
      t('sanidad.aplicaciones.dosisDelEsquema', { n: 1, esquema: 'Aftosa (todo el rodeo)' }),
    );
    expect(detalleAplicacion(aplicacion({ numero_dosis: null }))).toContain(
      t('sanidad.aplicaciones.refuerzoDelEsquema', { esquema: 'Aftosa (todo el rodeo)' }),
    );
    expect(detalleAplicacion(aplicacion({ esquema_id: null, esquema_nombre: null, numero_dosis: null }))).toBe(
      `${t('sanidad.productos.tipos.vacuna')} · ${textoDosis(2, 'ml')}`,
    );
  });

  it('criterio 3: el historial suma la aplicación con quién la registró', () => {
    const ficha: FichaAnimal = { animal: animal(), movimientos: [], estados: [] };
    const eventos = armarHistorial(ficha, [aplicacion()]);
    expect(eventos.map((e) => e.tipo)).toEqual(['aplicacion', 'alta']);
    expect(eventos[0]).toMatchObject({ quien: 'Jorge Mamani', producto: 'Vacuna antiaftosa', fecha: '2026-11-02' });
  });
});

describe('HU-48 · la pestaña Sanidad de la ficha', () => {
  function abrir(cambios: Partial<Parameters<typeof PestanaSanidad>[0]> = {}) {
    const alRegistrar = vi.fn();
    render(
      <PestanaSanidad
        animal={animal()}
        aplicaciones={[aplicacion(), aplicacion({ id: 'ap-2', producto_dado_de_baja: true, observacion: null })]}
        error=""
        regional={REGIONAL_POR_DEFECTO}
        puedeEditar
        quienId="u-3"
        alRegistrar={alRegistrar}
        {...cambios}
      />,
    );
    return alRegistrar;
  }

  it('lista las aplicaciones con quién la aplicó y avisa si el producto se dio de baja', () => {
    abrir();
    expect(screen.getAllByText('Vacuna antiaftosa')).toBeTruthy();
    expect(screen.getAllByText(t('sanidad.aplicaciones.aplicadaPor', { nombre: 'Roberto Justiniano' }))).toHaveLength(2);
    expect(screen.getByText('«Campaña de noviembre»')).toBeTruthy();
    expect(screen.getByText(t('sanidad.aplicaciones.productoDeBaja'))).toBeTruthy();
  });

  it('sin aplicaciones explica que van a aparecer acá', () => {
    abrir({ aplicaciones: [] });
    expect(screen.getByText(t('sanidad.aplicaciones.vacio.titulo'))).toBeTruthy();
  });

  it('criterio 4: en un animal dado de baja no se ofrece registrar', () => {
    abrir({ animal: animal({ eliminado_en: '2026-11-01T10:00:00.000Z' }) });
    expect(screen.queryByRole('button', { name: t('sanidad.aplicaciones.registrar') })).toBeNull();
    expect(screen.getByText(t('sanidad.aplicaciones.dadoDeBaja'))).toBeTruthy();
  });

  it('quien solo ve sanidad no tiene el botón', () => {
    abrir({ puedeEditar: false });
    expect(screen.queryByRole('button', { name: t('sanidad.aplicaciones.registrar') })).toBeNull();
  });

  it('criterios 1 y 2: registra producto, fecha, dosis sugerida, esquema y quién la aplicó', async () => {
    vi.spyOn(api, 'opcionesAplicacion').mockResolvedValue(opciones());
    const registrar = vi
      .spyOn(api, 'registrarAplicacion')
      .mockResolvedValue({ aplicacion: aplicacion(), mensaje: 'Vacuna antiaftosa registrado en el animal 0501.' });
    const alRegistrar = abrir();

    fireEvent.click(screen.getByRole('button', { name: t('sanidad.aplicaciones.registrar') }));
    const productoCampo = await screen.findByLabelText(new RegExp(t('sanidad.aplicaciones.formulario.producto')));
    const guardar = screen.getByRole('button', { name: t('sanidad.aplicaciones.formulario.guardar') }) as HTMLButtonElement;
    expect(guardar.disabled).toBe(true);

    fireEvent.change(productoCampo, { target: { value: 'p-1' } });
    const dosis = screen.getByLabelText(/ml/) as HTMLInputElement;
    expect(dosis.value).toBe('2');
    fireEvent.change(screen.getByLabelText(t('sanidad.aplicaciones.formulario.esquema')), { target: { value: 'e-1' } });
    fireEvent.change(screen.getByLabelText(t('sanidad.aplicaciones.formulario.numeroDosis')), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText(t('sanidad.aplicaciones.formulario.aplicadoPor')), { target: { value: 'u-4' } });

    fireEvent.click(guardar);
    await waitFor(() =>
      expect(registrar).toHaveBeenCalledWith('a-1', {
        producto_id: 'p-1',
        fecha: '2026-11-06',
        dosis: 2,
        esquema_id: 'e-1',
        numero_dosis: 2,
        aplicado_por: 'u-4',
        observacion: null,
      }),
    );
    await waitFor(() => expect(alRegistrar).toHaveBeenCalledWith('Vacuna antiaftosa registrado en el animal 0501.'));
  });

  it('criterio 1: una fecha futura se marca y no deja guardar', async () => {
    vi.spyOn(api, 'opcionesAplicacion').mockResolvedValue(opciones());
    abrir();
    fireEvent.click(screen.getByRole('button', { name: t('sanidad.aplicaciones.registrar') }));
    fireEvent.change(await screen.findByLabelText(new RegExp(t('sanidad.aplicaciones.formulario.producto'))), {
      target: { value: 'p-2' },
    });
    fireEvent.change(screen.getByLabelText(new RegExp(t('sanidad.aplicaciones.formulario.fecha'))), {
      target: { value: '2026-11-07' },
    });
    expect(screen.getByText(t('sanidad.aplicaciones.formulario.fechaFutura'))).toBeTruthy();
    const guardar = screen.getByRole('button', { name: t('sanidad.aplicaciones.formulario.guardar') }) as HTMLButtonElement;
    expect(guardar.disabled).toBe(true);
  });
});
