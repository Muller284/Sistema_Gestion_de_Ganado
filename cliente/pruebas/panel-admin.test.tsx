import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { api, type EstadoCuenta } from '../src/servicios/api';
import { admin, type FichaCuenta, type TableroAdmin } from '../src/servicios/admin';
import { t } from '../src/servicios/idioma';
import { PaginaAdmin } from '../src/paginas/admin/PaginaAdmin';
import { PaginaAdminAuditoria } from '../src/paginas/admin/PaginaAdminAuditoria';
import { PaginaAdminCatalogo } from '../src/paginas/admin/PaginaAdminCatalogo';
import { PaginaAdminConfiguracion } from '../src/paginas/admin/PaginaAdminConfiguracion';
import { PaginaAdminCuenta } from '../src/paginas/admin/PaginaAdminCuenta';
import { PaginaAdminCuentas } from '../src/paginas/admin/PaginaAdminCuentas';

/**
 * Fase 4 · El panel del Admin, del lado de la pantalla (RF-56 a RF-62).
 * Que solo el Admin llegue, que todo quede en la auditoría y que la
 * contraseña nunca se vea lo prueba el servidor: servidor/pruebas/panel-admin.test.js.
 */

function como(rol: string) {
  vi.spyOn(api, 'yo').mockResolvedValue({
    id: 'f-1',
    nombre: 'Soporte Central',
    correo: 'soporte@plataforma.bo',
    rol,
  } as EstadoCuenta);
}

function abrir(elemento: React.ReactElement, ruta = '/', patron = '/') {
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path={patron} element={elemento} />
      </Routes>
    </MemoryRouter>,
  );
}

const TABLERO: TableroAdmin = {
  cuentas: {
    ranchos: 12,
    ranchos_nuevos: 3,
    usuarios: 57,
    usuarios_nuevos: 9,
    activos: 31,
    suspendidos: 2,
    sin_verificar: 4,
    por_rol: [
      { rol: 'colaborador', n: 30 },
      { rol: 'propietario', n: 12 },
    ],
    por_pais: [{ codigo: 'BO', pais: 'Bolivia', n: 10 }],
    altas_por_semana: Array.from({ length: 12 }, (_, i) => ({ semana: `2026-09-${String(i + 1).padStart(2, '0')}`, ranchos: 1, usuarios: i })),
  },
  actividad: { animales: 1830, corrales: 41, aplicaciones_30: 220, pesajes_30: 310 },
  asistente: { consultas_mes: 140, usuarios_mes: 18, por_dia: [{ dia: 1, n: 4 }, { dia: 2, n: 9 }], por_usuario: 30, tope: 400 },
  soporte: { abiertos: 1, ultimos_30: 5 },
};

const FICHA: FichaCuenta = {
  rancho: {
    id: 'r-1',
    nombre: 'Rancho El Cerrito',
    departamento: 'Santa Cruz',
    localidad: 'Warnes',
    superficie: '850.50',
    tipo_produccion: 'carne',
    pais_codigo: 'BO',
    pais: 'Bolivia',
    creado_en: '2026-11-16T10:00:00Z',
    propietario_id: 'u-1',
    propietario: 'Carlos Gutierrez',
    propietario_correo: 'carlos@elcerrito.bo',
  },
  equipo: [
    {
      id: 'u-1',
      nombre: 'Carlos Gutierrez',
      correo: 'carlos@elcerrito.bo',
      rol: 'propietario',
      tipo: null,
      estado: 'activo',
      correo_verificado: true,
      debe_cambiar_contrasena: false,
      creado_en: '2026-11-16T10:00:00Z',
      ultima_actividad: null,
    },
    {
      id: 'u-2',
      nombre: 'Maria Aguilera',
      correo: 'maria@elcerrito.bo',
      rol: 'socio',
      tipo: null,
      estado: 'suspendido',
      correo_verificado: true,
      debe_cambiar_contrasena: false,
      creado_en: '2026-11-16T10:00:00Z',
      ultima_actividad: null,
    },
  ],
  consumo: { animales: 6, animales_historicos: 7, corrales: 2, productos: 3, aplicaciones: 8, pesajes: 20, consultas_mes: 15, consultas_total: 15 },
  actividad: [{ tipo: 'pesaje', en: '2026-11-17T10:00:00Z', quien: 'Roberto', animal: '0503' }],
  accesos: [],
};

// Las cifras animan el número salvo que se prefiera sin movimiento; jsdom no trae matchMedia.
beforeAll(() => {
  window.matchMedia ??= ((consulta: string) =>
    ({ matches: true, media: consulta, addEventListener() {}, removeEventListener() {} }) as unknown as MediaQueryList);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Panel del Admin · acceso', () => {
  it('a quien no es Admin le explica que esta parte no es suya y no carga nada', async () => {
    como('propietario');
    vi.spyOn(api, 'misPermisos').mockResolvedValue({});
    const tablero = vi.spyOn(admin, 'tablero');
    abrir(<PaginaAdmin />);
    expect(await screen.findByText(t('admin.noEsTuRol.titulo'))).toBeTruthy();
    expect(tablero).not.toHaveBeenCalled();
  });
});

describe('Panel del Admin · tablero (RF-56)', () => {
  it('muestra las cifras de la plataforma y lo que llega en la próxima versión', async () => {
    como('admin_plataforma');
    vi.spyOn(admin, 'tablero').mockResolvedValue(TABLERO);
    abrir(<PaginaAdmin />);
    expect(await screen.findByText('1830')).toBeTruthy();
    expect(screen.getByText('57')).toBeTruthy();
    expect(screen.getByText(t('admin.tablero.deTope', { tope: '400' }))).toBeTruthy();
    expect(screen.getByText(t('admin.roles.colaborador'))).toBeTruthy();
    expect(screen.getByText('Bolivia')).toBeTruthy();
    expect(screen.getByText(t('admin.tablero.futuro.titulo'))).toBeTruthy();
  });
});

describe('Panel del Admin · cuentas (RF-57)', () => {
  it('busca en el servidor mientras se escribe', async () => {
    como('admin_plataforma');
    const cuentas = vi.spyOn(admin, 'cuentas').mockResolvedValue([]);
    abrir(<PaginaAdminCuentas />);
    await waitFor(() => expect(cuentas).toHaveBeenCalledWith(''));
    fireEvent.change(screen.getByLabelText(t('admin.ranchos.buscar')), { target: { value: 'floresta' } });
    await waitFor(() => expect(cuentas).toHaveBeenLastCalledWith('floresta'));
    expect(await screen.findByText(t('admin.ranchos.sinResultados'))).toBeTruthy();
  });

  it('suspender pide un motivo de al menos 10 caracteres y avisa cuando se hizo', async () => {
    como('admin_plataforma');
    vi.spyOn(admin, 'cuenta').mockResolvedValue(FICHA);
    const cambiar = vi
      .spyOn(admin, 'cambiarEstado')
      .mockResolvedValue({ estado: 'suspendido', mensaje: 'Se suspendió la cuenta de Carlos Gutierrez.' });
    abrir(<PaginaAdminCuenta />, '/admin/cuentas/r-1', '/admin/cuentas/:id');

    expect(await screen.findByText(t('admin.ficha.eventos.pesaje', { quien: 'Roberto', animal: '0503' }))).toBeTruthy();
    // La socia ya está suspendida: su botón es Reactivar.
    expect(screen.getByRole('button', { name: t('admin.ficha.reactivar') })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: t('admin.ficha.suspender') }));
    const campo = screen.getByLabelText(new RegExp(t('admin.ficha.motivoSuspender').replace('?', '\\?')));
    const confirmar = () =>
      screen.getAllByRole('button', { name: new RegExp(t('admin.ficha.suspender')) }).at(-1) as HTMLButtonElement;
    fireEvent.change(campo, { target: { value: 'corto' } });
    expect(confirmar().disabled).toBe(true);
    fireEvent.change(campo, { target: { value: 'Lo pidió el propietario por teléfono' } });
    fireEvent.click(confirmar());
    await waitFor(() => expect(cambiar).toHaveBeenCalledWith('u-1', 'suspendido', 'Lo pidió el propietario por teléfono'));
    expect(await screen.findByText('Se suspendió la cuenta de Carlos Gutierrez.')).toBeTruthy();
  });

  it('el enlace de contraseña dice a qué correo llega', async () => {
    como('admin_plataforma');
    vi.spyOn(admin, 'cuenta').mockResolvedValue(FICHA);
    const enlace = vi.spyOn(admin, 'enlaceContrasena').mockResolvedValue({ mensaje: 'Enviado' });
    abrir(<PaginaAdminCuenta />, '/admin/cuentas/r-1', '/admin/cuentas/:id');
    await screen.findAllByRole('button', { name: new RegExp(t('admin.ficha.enlace')) });
    fireEvent.click(screen.getAllByRole('button', { name: new RegExp(t('admin.ficha.enlace')) })[0]);
    expect(screen.getByText(t('admin.ficha.ayudaEnlace', { correo: 'carlos@elcerrito.bo' }))).toBeTruthy();
    fireEvent.change(screen.getByLabelText(new RegExp(t('admin.ficha.motivoEnlace').replace('?', '\\?'))), {
      target: { value: 'No le llega la recuperación' },
    });
    fireEvent.click(screen.getByRole('button', { name: new RegExp(t('admin.ficha.mandarEnlace')) }));
    await waitFor(() => expect(enlace).toHaveBeenCalledWith('u-1', 'No le llega la recuperación'));
  });
});

describe('Panel del Admin · catálogo (RF-60)', () => {
  it('agrega una raza con su grupo y desactiva otra', async () => {
    como('admin_plataforma');
    vi.spyOn(admin, 'razas').mockResolvedValue({
      catalogo: [{ id: 'z-1', nombre: 'Angus', grupo: 'carne', activa: true, animales: 4 }],
      de_ranchos: [{ nombre: 'Criollo Saavedreño', ranchos: 2, animales: 9 }],
    });
    const crear = vi.spyOn(admin, 'crearRaza').mockResolvedValue({ id: 'z-2', mensaje: 'Agregada' });
    const editar = vi.spyOn(admin, 'editarRaza').mockResolvedValue({ mensaje: 'Desactivada' });
    abrir(<PaginaAdminCatalogo />);

    // La que escribieron los ranchos se propone con un clic.
    fireEvent.click(await screen.findByRole('button', { name: t('admin.catalogo.deRanchos.proponer') }));
    fireEvent.change(screen.getByLabelText(t('admin.catalogo.grupo')), { target: { value: 'doble' } });
    fireEvent.click(screen.getByRole('button', { name: new RegExp(t('admin.catalogo.agregar')) }));
    await waitFor(() => expect(crear).toHaveBeenCalledWith('Criollo Saavedreño', 'doble'));

    fireEvent.click(await screen.findByRole('button', { name: t('admin.catalogo.desactivar') }));
    await waitFor(() => expect(editar).toHaveBeenCalledWith('z-1', { activa: false }));
  });
});

describe('Panel del Admin · configuración (RNF-04, RNF-11)', () => {
  it('guarda números y deja vacío lo que vuelve al valor de fábrica', async () => {
    como('admin_plataforma');
    vi.spyOn(admin, 'configuracion').mockResolvedValue({
      asistente_consultas_mes: 20,
      asistente_tope_mensual: null,
      por_defecto: { asistente_consultas_mes: 30 },
    });
    const guardar = vi.spyOn(admin, 'guardarConfiguracion').mockResolvedValue({
      asistente_consultas_mes: null,
      asistente_tope_mensual: 400,
      por_defecto: { asistente_consultas_mes: 30 },
      mensaje: 'Guardado',
    });
    abrir(<PaginaAdminConfiguracion />);
    const porUsuario = (await screen.findByLabelText(t('admin.configuracion.porUsuario'))) as HTMLInputElement;
    expect(porUsuario.value).toBe('20');
    const boton = screen.getByRole('button', { name: new RegExp(t('admin.configuracion.guardar')) }) as HTMLButtonElement;
    expect(boton.disabled).toBe(true);
    fireEvent.change(porUsuario, { target: { value: '' } });
    fireEvent.change(screen.getByLabelText(t('admin.configuracion.tope')), { target: { value: '400' } });
    fireEvent.click(boton);
    await waitFor(() =>
      expect(guardar).toHaveBeenCalledWith({ asistente_consultas_mes: null, asistente_tope_mensual: 400 }),
    );
    expect(await screen.findByText('Guardado')).toBeTruthy();
  });
});

describe('Panel del Admin · auditoría (RF-62)', () => {
  it('muestra qué hizo cada Admin con su motivo y filtra por tipo', async () => {
    como('admin_plataforma');
    const auditoria = vi.spyOn(admin, 'auditoria').mockResolvedValue([
      {
        id: 'a-1',
        admin: 'Soporte Central',
        accion: 'cuenta_suspendida',
        rancho_id: 'r-1',
        rancho: 'Rancho El Cerrito',
        usuario: 'Maria Aguilera',
        objeto: 'Maria Aguilera',
        detalle: { motivo: 'Lo pidió el propietario' },
        creado_en: '2026-11-18T10:00:00Z',
      },
      {
        id: 'a-2',
        admin: 'Soporte Central',
        accion: 'configuracion',
        rancho_id: null,
        rancho: null,
        usuario: null,
        objeto: 'asistente_tope_mensual',
        detalle: { antes: null, despues: 400 },
        creado_en: '2026-11-18T09:00:00Z',
      },
    ]);
    abrir(<PaginaAdminAuditoria />);
    expect(await screen.findByText(t('admin.auditoria.acciones.cuenta_suspendida', { sobre: 'Maria Aguilera', rancho: 'Rancho El Cerrito' }))).toBeTruthy();
    expect(screen.getByText('«Lo pidió el propietario»')).toBeTruthy();
    expect(
      screen.getByText(t('admin.auditoria.cambio', { antes: t('admin.auditoria.deFabrica'), despues: 400 })),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: new RegExp(t('admin.auditoria.tipos.cuentas')) }));
    await waitFor(() => expect(auditoria).toHaveBeenLastCalledWith('cuentas', undefined));
  });
});
