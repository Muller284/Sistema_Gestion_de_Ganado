import { Link } from 'react-router-dom';
import { Alerta, Cargando, Cifra, Dato, Datos, Tarjeta } from '../../componentes';
import { BarrasHorizontales, GraficoLinea } from '../../componentes/Graficos';
import { admin, type TableroAdmin } from '../../servicios/admin';
import { localeActual, t, tn } from '../../servicios/idioma';
import { MarcoAdmin } from './comun';
import { numero, useCarga } from './formatos';

/**
 * Fase 4 · RF-56. El tablero del Admin de plataforma: cómo está la
 * plataforma de un vistazo.
 *
 *   - Cuentas: ranchos, personas, cuántas usaron el sistema en los últimos
 *     30 días, suspendidas y sin verificar.
 *   - Altas por semana, personas por rol y ranchos por país.
 *   - Uso del asistente en el mes, contra la cuota y el tope (RNF-11).
 *   - Actividad del campo y accesos de soporte.
 *
 * Los ingresos y las suscripciones que pide RF-56 llegan con los planes, en
 * una versión futura (DECISIONES §50): la tarjeta del final lo dice.
 */

export function PaginaAdmin() {
  return (
    <MarcoAdmin activo="admin" ruta={[t('admin.navegacion.tablero')]} titulo={t('admin.tablero.titulo')}>
      {() => <Tablero />}
    </MarcoAdmin>
  );
}

function Tablero() {
  const { datos, error } = useCarga(admin.tablero);
  if (error) return <Alerta variante="error">{error}</Alerta>;
  if (!datos) return <Cargando lineas={6} />;
  const { cuentas, actividad, asistente, soporte } = datos;

  return (
    <>
      <p className="cuerpo c-600 admin__intro">{t('admin.tablero.intro')}</p>

      <div className="rejilla-cifras">
        <Cifra
          rotulo={t('admin.tablero.ranchos')}
          icono="corral"
          valor={String(cuentas.ranchos)}
          detalle={tn('admin.tablero.ranchosNuevos', cuentas.ranchos_nuevos)}
        />
        <Cifra
          rotulo={t('admin.tablero.personas')}
          icono="equipo"
          valor={String(cuentas.usuarios)}
          detalle={tn('admin.tablero.activos', cuentas.activos)}
        />
        <Cifra
          rotulo={t('admin.tablero.animales')}
          icono="animal"
          valor={String(actividad.animales)}
          detalle={tn('admin.tablero.corrales', actividad.corrales)}
        />
        <Cifra
          rotulo={t('admin.tablero.consultas')}
          icono="asistente"
          valor={String(asistente.consultas_mes)}
          detalle={
            asistente.tope === null
              ? t('admin.tablero.sinTope')
              : t('admin.tablero.deTope', { tope: numero(asistente.tope) })
          }
        />
      </div>

      <div className="panel">
        <Altas semanas={cuentas.altas_por_semana} />

        <Tarjeta titulo={t('admin.tablero.porRol.titulo')}>
          <BarrasHorizontales
            descripcion={t('admin.tablero.porRol.descripcion')}
            barras={cuentas.por_rol.map((fila) => ({
              clave: fila.rol,
              etiqueta: t(`admin.roles.${fila.rol}`),
              valor: fila.n,
            }))}
          />
        </Tarjeta>

        <Tarjeta titulo={t('admin.tablero.porPais.titulo')}>
          <BarrasHorizontales
            descripcion={t('admin.tablero.porPais.descripcion')}
            barras={cuentas.por_pais.map((fila) => ({
              clave: fila.codigo,
              etiqueta: fila.pais ?? fila.codigo,
              valor: fila.n,
            }))}
          />
        </Tarjeta>

        <Asistente datos={asistente} />

        <Tarjeta
          titulo={t('admin.tablero.atencion.titulo')}
          accion={
            <Link className="pie enlace-derecha" to="/admin/cuentas">
              {t('admin.tablero.atencion.verCuentas')}
            </Link>
          }
        >
          <Datos>
            <Dato nombre={t('admin.tablero.atencion.suspendidas')}>{numero(cuentas.suspendidos)}</Dato>
            <Dato nombre={t('admin.tablero.atencion.sinVerificar')}>{numero(cuentas.sin_verificar)}</Dato>
            <Dato nombre={t('admin.tablero.atencion.soporteAbierto')}>{numero(soporte.abiertos)}</Dato>
            <Dato nombre={t('admin.tablero.atencion.soporte30')}>{numero(soporte.ultimos_30)}</Dato>
          </Datos>
        </Tarjeta>

        <Tarjeta titulo={t('admin.tablero.campo.titulo')}>
          <Datos>
            <Dato nombre={t('admin.tablero.campo.aplicaciones')}>{numero(actividad.aplicaciones_30)}</Dato>
            <Dato nombre={t('admin.tablero.campo.pesajes')}>{numero(actividad.pesajes_30)}</Dato>
            <Dato nombre={t('admin.tablero.campo.nuevos')}>{numero(cuentas.usuarios_nuevos)}</Dato>
          </Datos>
        </Tarjeta>
      </div>

      <div className="admin__futuro">
        <p className="h3">{t('admin.tablero.futuro.titulo')}</p>
        <p className="cuerpo c-600">{t('admin.tablero.futuro.texto')}</p>
      </div>
    </>
  );
}

function semanaCorta(lunes: string): string {
  return new Date(`${lunes}T12:00:00`).toLocaleDateString(localeActual(), { day: 'numeric', month: 'numeric' });
}

function Altas({ semanas }: { semanas: TableroAdmin['cuentas']['altas_por_semana'] }) {
  const total = semanas.reduce((suma, s) => suma + s.usuarios, 0);
  const ranchos = semanas.reduce((suma, s) => suma + s.ranchos, 0);
  return (
    <Tarjeta titulo={t('admin.tablero.altas.titulo')}>
      <p className="pie c-600 panel__antes">{t('admin.tablero.altas.resumen', { personas: total, ranchos })}</p>
      <GraficoLinea
        descripcion={t('admin.tablero.altas.descripcion')}
        puntos={semanas.map((s, i) => ({
          clave: s.semana,
          x: i,
          y: s.usuarios,
          etiquetaX: semanaCorta(s.semana),
          rotulo: String(s.usuarios),
          ayuda: t('admin.tablero.altas.ayuda', { semana: semanaCorta(s.semana), personas: s.usuarios, ranchos: s.ranchos }),
        }))}
      />
    </Tarjeta>
  );
}

function Asistente({ datos }: { datos: TableroAdmin['asistente'] }) {
  return (
    <Tarjeta
      titulo={t('admin.tablero.asistente.titulo')}
      accion={
        <Link className="pie enlace-derecha" to="/admin/configuracion">
          {t('admin.tablero.asistente.cambiar')}
        </Link>
      }
    >
      <p className="pie c-600 panel__antes">
        {tn('admin.tablero.asistente.resumen', datos.usuarios_mes, { cuota: datos.por_usuario })}
      </p>
      {datos.consultas_mes === 0 ? (
        <p className="cuerpo c-600">{t('admin.tablero.asistente.vacio')}</p>
      ) : (
        <GraficoLinea
          descripcion={t('admin.tablero.asistente.descripcion')}
          puntos={datos.por_dia.map((d) => ({
            clave: String(d.dia),
            x: d.dia,
            y: d.n,
            etiquetaX: String(d.dia),
            rotulo: String(d.n),
            ayuda: tn('admin.tablero.asistente.ayuda', d.n, { dia: d.dia }),
          }))}
        />
      )}
    </Tarjeta>
  );
}
