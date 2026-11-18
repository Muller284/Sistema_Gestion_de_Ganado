import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Alerta, Cargando, Insignia, Segmentos, Tarjeta } from '../../componentes';
import { admin, type EntradaAuditoria, type TipoAuditoria } from '../../servicios/admin';
import { t } from '../../servicios/idioma';
import { MarcoAdmin } from './comun';
import { fechaHora, useCarga } from './formatos';

/**
 * Fase 4 · RF-62. Qué hizo cada Admin y cuándo: entrar y salir de un rancho
 * (HU-24), suspender y reactivar cuentas, mandar enlaces de contraseña,
 * cambiar el catálogo y la configuración. Con el motivo o el valor de antes y
 * el de después. No se edita ni se borra.
 *
 * Desde la ficha de una cuenta se llega filtrado por ese rancho (?rancho=).
 */

const TIPOS: TipoAuditoria[] = ['todo', 'soporte', 'cuentas', 'contrasenas', 'razas', 'configuracion'];

const VARIANTE: Record<string, 'info' | 'neutro' | 'adv' | 'error' | 'exito'> = {
  soporte_entrada: 'info',
  soporte_salida: 'neutro',
  cuenta_suspendida: 'error',
  cuenta_reactivada: 'exito',
  contrasena_enlace: 'adv',
  raza_creada: 'exito',
  raza_editada: 'neutro',
  raza_desactivada: 'adv',
  raza_reactivada: 'exito',
  configuracion: 'neutro',
};

export function PaginaAdminAuditoria() {
  return (
    <MarcoAdmin activo="admin-auditoria" ruta={[t('admin.navegacion.auditoria')]} titulo={t('admin.auditoria.titulo')}>
      {() => <Auditoria />}
    </MarcoAdmin>
  );
}

function Auditoria() {
  const [parametros] = useSearchParams();
  const ranchoId = parametros.get('rancho') ?? undefined;
  const [tipo, setTipo] = useState<TipoAuditoria>('todo');
  const { datos, error } = useCarga(() => admin.auditoria(tipo, ranchoId), [tipo, ranchoId]);
  const rancho = ranchoId ? datos?.find((e) => e.rancho_id === ranchoId)?.rancho : null;

  return (
    <>
      <p className="cuerpo c-600 admin__intro">{t('admin.auditoria.intro')}</p>
      {ranchoId && (
        <Alerta variante="info">
          {t('admin.auditoria.deRancho', { rancho: rancho ?? '…' })}{' '}
          <Link to="/admin/auditoria">{t('admin.auditoria.verTodo')}</Link>
        </Alerta>
      )}
      <Tarjeta
        titulo={t('admin.auditoria.registro')}
        accion={
          <Segmentos
            etiqueta={t('admin.vistas')}
            valor={tipo}
            alCambiar={setTipo}
            opciones={TIPOS.map((clave) => ({ clave, nombre: t(`admin.auditoria.tipos.${clave}`) }))}
          />
        }
      >
        {error && <Alerta variante="error">{error}</Alerta>}
        {!datos && !error && <Cargando lineas={5} />}
        {datos && datos.length === 0 && <p className="cuerpo c-500 centrado admin__vacio">{t('admin.auditoria.nada')}</p>}
        {datos && datos.length > 0 && (
          <ul className="admin__registro">
            {datos.map((entrada) => (
              <Entrada key={entrada.id} entrada={entrada} />
            ))}
          </ul>
        )}
      </Tarjeta>
    </>
  );
}

function Entrada({ entrada }: { entrada: EntradaAuditoria }) {
  const sobre = entrada.usuario ?? entrada.objeto ?? entrada.rancho ?? '';
  const detalle =
    entrada.accion === 'configuracion'
      ? t('admin.auditoria.cambio', {
          antes: entrada.detalle.antes ?? t('admin.auditoria.deFabrica'),
          despues: entrada.detalle.despues ?? t('admin.auditoria.deFabrica'),
        })
      : entrada.detalle.motivo
        ? `«${entrada.detalle.motivo}»`
        : entrada.detalle.grupo_antes
          ? t('admin.auditoria.grupo', {
              antes: t(`admin.catalogo.grupos.${entrada.detalle.grupo_antes}`),
              despues: t(`admin.catalogo.grupos.${entrada.detalle.grupo}`),
            })
          : '';

  return (
    <li className="admin__acceso">
      <div className="admin__cuando">
        <span className="dato">{fechaHora(entrada.creado_en)}</span>
        <span className="pie c-500">{entrada.admin}</span>
      </div>
      <div className="admin__que">
        <strong>
          {t(`admin.auditoria.acciones.${entrada.accion}`, {
            sobre: entrada.accion === 'configuracion' ? t(`admin.auditoria.claves.${entrada.objeto}`) : sobre,
            rancho: entrada.rancho ?? '',
          })}
        </strong>
        {detalle && <span className="pie c-600">{detalle}</span>}
      </div>
      <Insignia variante={VARIANTE[entrada.accion] ?? 'neutro'}>{t(`admin.auditoria.etiquetas.${entrada.accion}`)}</Insignia>
    </li>
  );
}
