import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { enIdioma, t } from '../../comun/idioma';
import { claveDeRaza, nombreDeRaza } from '../../comun/razas';
import type { UsuarioActual } from '../../comun/repositorio-usuario-actual';
import { ServicioCorreo } from '../../comun/servicio-correo';
import { cuotaPorDefecto } from '../asistente/servicio-asistente';
import { RepositorioSesion } from '../usuarios/repositorio-sesion';
import { RepositorioToken } from '../usuarios/repositorio-token';
import { RepositorioAdmin } from './repositorio-admin';
import { RepositorioAuditoria, RepositorioPanelAdmin } from './repositorio-panel-admin';

/**
 * Fase 4 · El panel de administración de la plataforma (RF-56 a RF-62,
 * RNF-04 y RNF-11). Lo usa solo el rol admin_plataforma.
 *
 *   Tablero        cuentas, actividad, uso del asistente y soporte (RF-56).
 *   Cuentas        buscar ranchos y ver la ficha de cada uno: su equipo, lo
 *                  que tiene cargado y lo último que se registró (RF-57).
 *                  Suspender y reactivar a cualquier persona, y mandarle un
 *                  enlace para que cambie su contraseña: el Admin nunca la ve
 *                  (RF-14). Cada cosa pide un motivo y queda anotada.
 *   Catálogo       razas del catálogo mundial: agregar, cambiar el grupo,
 *                  desactivar y volver a activar (RF-60).
 *   Configuración  las cuotas del asistente: por usuario y tope de la
 *                  plataforma, sin tocar el .env (RNF-04, RNF-11).
 *   Auditoría      todo lo que hizo cada Admin (RF-62).
 *
 * Los planes, la suscripción y el cobro (RF-43 a RF-52, RF-58, RF-59 y lo de
 * pagos de RF-56 y RF-60) quedan para una versión futura: DECISIONES §50.
 */

const LARGO_MINIMO_MOTIVO = 10;
const LARGO_MAXIMO_MOTIVO = 300;
const GRUPOS = ['carne', 'leche', 'doble'] as const;
const CLAVES_CONFIGURACION = ['asistente_consultas_mes', 'asistente_tope_mensual'] as const;
const VALOR_MAXIMO = 100_000;

@Injectable()
export class ServicioPanelAdmin {
  constructor(
    private readonly panel: RepositorioPanelAdmin,
    private readonly admin: RepositorioAdmin,
    private readonly auditoria: RepositorioAuditoria,
    private readonly sesiones: RepositorioSesion,
    private readonly tokens: RepositorioToken,
    private readonly correo: ServicioCorreo,
  ) {}

  async tablero(quien: UsuarioActual) {
    this.soloAdmin(quien);
    const [cifras, porRol, porPais, semanas, dias, configuracion] = await Promise.all([
      this.panel.cifras(),
      this.panel.usuariosPorRol(),
      this.panel.ranchosPorPais(),
      this.panel.altasPorSemana(),
      this.panel.consultasPorDia(),
      this.panel.configuracion(),
    ]);
    return {
      cuentas: {
        ranchos: cifras.ranchos,
        ranchos_nuevos: cifras.ranchos_nuevos,
        usuarios: cifras.usuarios,
        usuarios_nuevos: cifras.usuarios_nuevos,
        activos: cifras.activos,
        suspendidos: cifras.suspendidos,
        sin_verificar: cifras.sin_verificar,
        por_rol: porRol,
        por_pais: porPais,
        altas_por_semana: semanas,
      },
      actividad: {
        animales: cifras.animales,
        corrales: cifras.corrales,
        aplicaciones_30: cifras.aplicaciones_30,
        pesajes_30: cifras.pesajes_30,
      },
      asistente: {
        consultas_mes: cifras.consultas_mes,
        usuarios_mes: cifras.consultaron_mes,
        por_dia: dias,
        por_usuario: configuracion.asistente_consultas_mes ?? cuotaPorDefecto(),
        tope: configuracion.asistente_tope_mensual ?? null,
      },
      soporte: { abiertos: cifras.soporte_abiertos, ultimos_30: cifras.soporte_30 },
    };
  }

  async cuentas(consulta: any, quien: UsuarioActual) {
    this.soloAdmin(quien);
    const busqueda = typeof consulta?.q === 'string' ? consulta.q.trim().slice(0, 100) : '';
    return this.panel.cuentas(quien.id, busqueda);
  }

  async cuenta(ranchoId: string, quien: UsuarioActual) {
    this.soloAdmin(quien);
    const rancho = esUuid(ranchoId) ? await this.panel.cuenta(ranchoId) : null;
    if (!rancho) throw new NotFoundException(t('servidor.admin.ranchoNoExiste'));
    const [equipo, consumo, actividad, accesos] = await Promise.all([
      this.panel.equipo(ranchoId),
      this.panel.consumo(ranchoId),
      this.panel.actividad(ranchoId),
      this.admin.accesos(ranchoId, 20),
    ]);
    return { rancho, equipo, consumo, actividad, accesos };
  }

  /** Suspender cierra en el acto todas sus sesiones, como en Equipo (HU-17). */
  async cambiarEstado(usuarioId: string, cuerpo: any, quien: UsuarioActual) {
    this.soloAdmin(quien);
    const estado = cuerpo?.estado;
    if (estado !== 'activo' && estado !== 'suspendido') {
      throw new BadRequestException(t('servidor.equipo.estadoInvalido'));
    }
    const motivo = this.motivo(cuerpo);
    const usuario = await this.usuarioOperable(usuarioId);

    if (usuario.estado !== estado) {
      await this.panel.cambiarEstado(usuario.id, estado, quien.id);
      if (estado === 'suspendido') await this.sesiones.revocarTodasDeUsuario(usuario.id);
      await this.auditoria.anotar({
        adminId: quien.id,
        accion: estado === 'suspendido' ? 'cuenta_suspendida' : 'cuenta_reactivada',
        ranchoId: usuario.rancho_id,
        usuarioId: usuario.id,
        objeto: usuario.nombre,
        detalle: { motivo, correo: usuario.correo, rol: usuario.rol },
      });
    }

    return {
      estado,
      mensaje:
        estado === 'suspendido'
          ? t('servidor.admin.cuentaSuspendida', { nombre: usuario.nombre })
          : t('servidor.admin.cuentaReactivada', { nombre: usuario.nombre }),
    };
  }

  /**
   * El mismo enlace de «Olvidé mi contraseña» (HU-09), que vence en una hora.
   * La contraseña la elige la persona: el Admin no la ve nunca.
   */
  async enlaceContrasena(usuarioId: string, cuerpo: any, quien: UsuarioActual) {
    this.soloAdmin(quien);
    const motivo = this.motivo(cuerpo);
    const usuario = await this.usuarioOperable(usuarioId);

    const { token } = await this.tokens.emitir(usuario.id, 'recuperacion_contrasena', 1);
    const enlace = `${process.env.URL_CLIENTE || 'http://localhost:5173'}/#/recuperar-contrasena?token=${token}`;
    await enIdioma(usuario.idioma, () =>
      this.correo.enviar({
        para: usuario.correo,
        asunto: t('correos.recuperacionAdmin.asunto'),
        cuerpo: t('correos.recuperacionAdmin.cuerpo', { nombre: usuario.nombre }),
        destacado: enlace,
        textoBoton: t('correos.recuperacion.boton'),
      }),
    );
    await this.auditoria.anotar({
      adminId: quien.id,
      accion: 'contrasena_enlace',
      ranchoId: usuario.rancho_id,
      usuarioId: usuario.id,
      objeto: usuario.nombre,
      detalle: { motivo, correo: usuario.correo },
    });
    return { mensaje: t('servidor.admin.enlaceEnviado', { correo: usuario.correo }) };
  }

  // ── Catálogo de razas ─────────────────────────────────────────────────────

  async razas(quien: UsuarioActual) {
    this.soloAdmin(quien);
    const [catalogo, deRanchos] = await Promise.all([this.panel.razas(), this.panel.razasDeRanchos()]);
    return { catalogo, de_ranchos: deRanchos };
  }

  async crearRaza(cuerpo: any, quien: UsuarioActual) {
    this.soloAdmin(quien);
    const nombre = typeof cuerpo?.nombre === 'string' ? nombreDeRaza(cuerpo.nombre) : '';
    if (nombre.length < 2 || nombre.length > 100) throw new BadRequestException(t('servidor.admin.razaNombre'));
    const grupo = this.grupo(cuerpo?.grupo);
    const clave = claveDeRaza(nombre);

    const existente = await this.panel.razaPorClave(clave);
    if (existente) {
      throw new ConflictException(
        existente.activa
          ? t('servidor.admin.razaRepetida', { nombre: existente.nombre })
          : t('servidor.admin.razaDesactivada', { nombre: existente.nombre }),
      );
    }

    const { id, absorbidas } = await this.panel.crearRaza({ nombre, clave, grupo, adminId: quien.id });
    await this.auditoria.anotar({
      adminId: quien.id,
      accion: 'raza_creada',
      objeto: nombre,
      detalle: { grupo, de_ranchos: absorbidas },
    });
    return { id, mensaje: t('servidor.admin.razaCreada', { nombre }) };
  }

  async editarRaza(id: string, cuerpo: any, quien: UsuarioActual) {
    this.soloAdmin(quien);
    const raza = esUuid(id) ? await this.panel.razaPorId(id) : null;
    if (!raza) throw new NotFoundException(t('servidor.admin.razaNoExiste'));

    const grupo = cuerpo?.grupo === undefined ? undefined : this.grupo(cuerpo.grupo);
    const activa = typeof cuerpo?.activa === 'boolean' ? cuerpo.activa : undefined;
    if (grupo === undefined && activa === undefined) throw new BadRequestException(t('servidor.admin.razaSinCambios'));

    if (activa === true && !raza.activa) {
      // Si mientras estaba desactivada alguien la agregó de nuevo, no puede haber dos.
      const otra = await this.panel.razaPorClave(raza.clave);
      if (otra && otra.id !== raza.id && otra.activa) {
        throw new ConflictException(t('servidor.admin.razaRepetida', { nombre: otra.nombre }));
      }
    }

    await this.panel.editarRaza(raza.id, { grupo, activa }, quien.id);
    const accion =
      activa === false && raza.activa
        ? 'raza_desactivada'
        : activa === true && !raza.activa
          ? 'raza_reactivada'
          : 'raza_editada';
    await this.auditoria.anotar({
      adminId: quien.id,
      accion,
      objeto: raza.nombre,
      detalle: grupo && grupo !== raza.grupo ? { grupo_antes: raza.grupo, grupo } : {},
    });
    const mensaje = { raza_editada: 'razaEditada', raza_desactivada: 'razaApagada', raza_reactivada: 'razaReactivada' }[accion];
    return { mensaje: t(`servidor.admin.${mensaje}`, { nombre: raza.nombre }) };
  }

  // ── Configuración ─────────────────────────────────────────────────────────

  async configuracion(quien: UsuarioActual) {
    this.soloAdmin(quien);
    const valores = await this.panel.configuracion();
    return {
      asistente_consultas_mes: valores.asistente_consultas_mes ?? null,
      asistente_tope_mensual: valores.asistente_tope_mensual ?? null,
      por_defecto: { asistente_consultas_mes: cuotaPorDefecto() },
    };
  }

  /** Cada clave que llega: un número entero positivo, o null para volver al de fábrica. */
  async guardarConfiguracion(cuerpo: any, quien: UsuarioActual) {
    this.soloAdmin(quien);
    const antes = await this.panel.configuracion();
    const cambios: [string, number | null][] = [];
    for (const clave of CLAVES_CONFIGURACION) {
      if (!(clave in (cuerpo ?? {}))) continue;
      const valor = cuerpo[clave];
      if (valor !== null && !(Number.isInteger(valor) && valor > 0 && valor <= VALOR_MAXIMO)) {
        throw new BadRequestException(t('servidor.admin.valorInvalido', { max: VALOR_MAXIMO }));
      }
      if ((antes[clave] ?? null) !== valor) cambios.push([clave, valor]);
    }
    if (!cambios.length) return { ...(await this.configuracion(quien)), mensaje: t('servidor.admin.sinCambios') };

    for (const [clave, valor] of cambios) {
      await this.panel.guardarConfiguracion(clave, valor, quien.id);
      await this.auditoria.anotar({
        adminId: quien.id,
        accion: 'configuracion',
        objeto: clave,
        detalle: { antes: antes[clave] ?? null, despues: valor },
      });
    }
    return { ...(await this.configuracion(quien)), mensaje: t('servidor.admin.configuracionGuardada') };
  }

  // ── Auditoría ─────────────────────────────────────────────────────────────

  async verAuditoria(consulta: any, quien: UsuarioActual) {
    this.soloAdmin(quien);
    const tipos: Record<string, string> = { soporte: 'soporte_', cuentas: 'cuenta_', contrasenas: 'contrasena_', razas: 'raza_', configuracion: 'configuracion' };
    const accion = typeof consulta?.tipo === 'string' && tipos[consulta.tipo] ? tipos[consulta.tipo] : null;
    const ranchoId = esUuid(consulta?.rancho) ? consulta.rancho : null;
    return this.panel.auditoria({ accion, ranchoId, limite: 300 });
  }

  // ── Comunes ───────────────────────────────────────────────────────────────

  private motivo(cuerpo: any): string {
    const motivo = typeof cuerpo?.motivo === 'string' ? cuerpo.motivo.trim().replace(/\s+/g, ' ') : '';
    if (motivo.length < LARGO_MINIMO_MOTIVO) {
      throw new BadRequestException(t('servidor.admin.motivoCorto', { n: LARGO_MINIMO_MOTIVO }));
    }
    if (motivo.length > LARGO_MAXIMO_MOTIVO) {
      throw new BadRequestException(t('servidor.admin.motivoLargo', { n: LARGO_MAXIMO_MOTIVO }));
    }
    return motivo;
  }

  /** Cualquier persona de la plataforma, menos un Admin. */
  private async usuarioOperable(id: string) {
    const usuario = esUuid(id) ? await this.panel.usuario(id) : null;
    if (!usuario) throw new NotFoundException(t('servidor.admin.usuarioNoExiste'));
    if (usuario.rol === 'admin_plataforma') throw new ForbiddenException(t('servidor.admin.noOtroAdmin'));
    return usuario;
  }

  private grupo(valor: unknown): string {
    if (typeof valor !== 'string' || !(GRUPOS as readonly string[]).includes(valor)) {
      throw new BadRequestException(t('servidor.admin.razaGrupo'));
    }
    return valor;
  }

  private soloAdmin(quien: UsuarioActual) {
    if (quien.rol !== 'admin_plataforma') throw new ForbiddenException(t('servidor.admin.soloAdmin'));
  }
}

function esUuid(valor: unknown): boolean {
  return (
    typeof valor === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(valor)
  );
}
