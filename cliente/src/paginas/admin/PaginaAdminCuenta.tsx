import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Alerta, Boton, Cargando, Cifra, Dato, Datos, Icono, Insignia, Tarjeta } from '../../componentes';
import { admin, type EventoCuenta, type FichaCuenta, type MiembroCuenta } from '../../servicios/admin';
import { existe, t, tn } from '../../servicios/idioma';
import { EntrarASoporte, FormularioMotivo, ListaDeAccesos, MarcoAdmin } from './comun';
import { fecha, fechaHora, haceCuanto, useCarga } from './formatos';

/**
 * Fase 4 · RF-57. La ficha de una cuenta: el rancho, su equipo, lo que tiene
 * cargado, lo último que se registró y quién del soporte entró.
 *
 * Por cada persona, el Admin puede suspenderla o reactivarla y mandarle un
 * enlace para que cree una contraseña nueva. Las tres cosas piden un motivo
 * y quedan en la auditoría (RF-62). La contraseña no la ve nunca (RF-14).
 */

export function PaginaAdminCuenta() {
  const { id = '' } = useParams();
  const { datos, error, recargar } = useCarga(() => admin.cuenta(id), [id]);

  return (
    <MarcoAdmin
      activo="admin-cuentas"
      ruta={[t('admin.navegacion.cuentas'), datos?.rancho.nombre ?? '…']}
      titulo={datos?.rancho.nombre ?? t('admin.ficha.titulo')}
      acciones={
        <Link className="btn btn-secundario" to="/admin/cuentas">
          <Icono nombre="flecha" tamano={16} className="admin__volver" />
          {t('admin.ficha.volver')}
        </Link>
      }
    >
      {() => (
        <>
          {error && <Alerta variante="error">{error}</Alerta>}
          {!datos && !error && <Cargando lineas={6} />}
          {datos && <Ficha ficha={datos} alCambiar={recargar} />}
        </>
      )}
    </MarcoAdmin>
  );
}

function Ficha({ ficha, alCambiar }: { ficha: FichaCuenta; alCambiar: () => void }) {
  const { rancho, consumo } = ficha;
  const [aviso, setAviso] = useState('');
  const abierto = ficha.accesos.some((a) => a.estado === 'abierto');

  return (
    <>
      {aviso && <Alerta variante="exito">{aviso}</Alerta>}

      <div className="panel">
        <Tarjeta titulo={t('admin.ficha.rancho')}>
          <Datos>
            <Dato nombre={t('admin.ficha.ubicacion')}>
              {t('admin.ranchos.ubicacion', {
                localidad: rancho.localidad,
                departamento: rancho.departamento,
                pais: rancho.pais ?? rancho.pais_codigo,
              })}
            </Dato>
            {rancho.superficie && (
              <Dato nombre={t('admin.ficha.superficie')}>{t('admin.ficha.hectareas', { n: rancho.superficie })}</Dato>
            )}
            {rancho.tipo_produccion && (
              <Dato nombre={t('admin.ficha.produccion')}>
                {existe(`rancho.tipos.${rancho.tipo_produccion}`)
                  ? t(`rancho.tipos.${rancho.tipo_produccion}`)
                  : rancho.tipo_produccion}
              </Dato>
            )}
            <Dato nombre={t('admin.ficha.propietario')}>
              {rancho.propietario} · {rancho.propietario_correo}
            </Dato>
            <Dato nombre={t('admin.ficha.desde')}>{fecha(rancho.creado_en)}</Dato>
          </Datos>
        </Tarjeta>

        <Tarjeta titulo={t('admin.ficha.soporte')}>
          <p className="pie c-600">{t('admin.ficha.soporteTexto')}</p>
          <div className="admin__entrar-ficha">
            <EntrarASoporte ranchoId={rancho.id} rancho={rancho.nombre} abierto={abierto} />
          </div>
        </Tarjeta>
      </div>

      <div className="rejilla-cifras">
        <Cifra
          rotulo={t('admin.ficha.animales')}
          icono="animal"
          valor={String(consumo.animales)}
          detalle={tn('admin.ficha.historicos', consumo.animales_historicos)}
        />
        <Cifra rotulo={t('admin.ficha.corrales')} icono="corral" valor={String(consumo.corrales)} />
        <Cifra
          rotulo={t('admin.ficha.sanidadPesajes')}
          icono="sanidad"
          valor={String(consumo.aplicaciones + consumo.pesajes)}
          detalle={t('admin.ficha.sanidadDetalle', { aplicaciones: consumo.aplicaciones, pesajes: consumo.pesajes })}
        />
        <Cifra
          rotulo={t('admin.ficha.consultas')}
          icono="asistente"
          valor={String(consumo.consultas_mes)}
          detalle={tn('admin.ficha.consultasTotal', consumo.consultas_total)}
        />
      </div>

      <Tarjeta titulo={tn('admin.ficha.equipo', ficha.equipo.length)}>
        <ul className="admin__lista">
          {ficha.equipo.map((miembro) => (
            <Miembro
              key={miembro.id}
              miembro={miembro}
              alCambiar={(mensaje) => {
                setAviso(mensaje);
                alCambiar();
              }}
            />
          ))}
        </ul>
      </Tarjeta>

      <div className="panel">
        <Tarjeta titulo={t('admin.ficha.actividad')}>
          {ficha.actividad.length === 0 ? (
            <p className="cuerpo c-600">{t('admin.ficha.sinActividad')}</p>
          ) : (
            <ul className="admin__eventos">
              {ficha.actividad.map((evento, i) => (
                <li key={i}>
                  <span className="cuerpo">{textoEvento(evento)}</span>
                  <span className="pie c-500">{fechaHora(evento.en)}</span>
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>

        <Tarjeta
          titulo={t('admin.ficha.accesos')}
          accion={
            <Link className="pie enlace-derecha" to={`/admin/auditoria?rancho=${rancho.id}`}>
              {t('admin.ficha.verAuditoria')}
            </Link>
          }
        >
          {ficha.accesos.length === 0 ? (
            <p className="cuerpo c-600">{t('admin.ficha.sinAccesos')}</p>
          ) : (
            <ListaDeAccesos accesos={ficha.accesos} />
          )}
        </Tarjeta>
      </div>
    </>
  );
}

function textoEvento(evento: EventoCuenta): string {
  const quien = evento.quien ?? t('admin.ficha.alguien');
  return t(`admin.ficha.eventos.${evento.tipo}`, { quien, animal: evento.animal ?? '' });
}

type Accion = 'estado' | 'contrasena' | null;

function Miembro({ miembro, alCambiar }: { miembro: MiembroCuenta; alCambiar: (mensaje: string) => void }) {
  const [accion, setAccion] = useState<Accion>(null);
  const suspendido = miembro.estado === 'suspendido';

  return (
    <li className="admin__fila admin__fila--miembro">
      <div className="admin__rancho">
        <strong>{miembro.nombre}</strong>
        <span className="pie c-500">{miembro.correo}</span>
      </div>
      <div className="admin__dueno">
        <span>
          {t(`admin.rol.${miembro.rol}`)}
          {miembro.tipo && ` · ${miembro.tipo}`}
        </span>
        <span className="pie c-500">{t('admin.cuentas.ultima', { cuando: haceCuanto(miembro.ultima_actividad) })}</span>
      </div>
      <div className="admin__datos">
        {suspendido && <Insignia variante="error">{t('admin.ficha.suspendido')}</Insignia>}
        {!miembro.correo_verificado && <Insignia variante="adv">{t('admin.ficha.sinVerificar')}</Insignia>}
        {miembro.debe_cambiar_contrasena && <Insignia variante="neutro">{t('admin.ficha.claveTemporal')}</Insignia>}
      </div>
      <div className="admin__acciones fila g8">
        {accion === null && (
          <>
            <Boton variante="fantasma" onClick={() => setAccion('contrasena')}>
              <Icono nombre="llave" tamano={16} />
              {t('admin.ficha.enlace')}
            </Boton>
            <Boton variante="secundario" onClick={() => setAccion('estado')}>
              {suspendido ? t('admin.ficha.reactivar') : t('admin.ficha.suspender')}
            </Boton>
          </>
        )}
      </div>

      {accion === 'estado' && (
        <div className="admin__entrar">
          <FormularioMotivo
            etiqueta={suspendido ? t('admin.ficha.motivoReactivar') : t('admin.ficha.motivoSuspender')}
            ejemplo={suspendido ? t('admin.ficha.ejemploReactivar') : t('admin.ficha.ejemploSuspender')}
            boton={suspendido ? t('admin.ficha.reactivar') : t('admin.ficha.suspender')}
            icono={suspendido ? 'exito' : 'pendiente'}
            variante={suspendido ? 'primario' : 'destructivo'}
            alCancelar={() => setAccion(null)}
            alConfirmar={async (motivo) => {
              const respuesta = await admin.cambiarEstado(miembro.id, suspendido ? 'activo' : 'suspendido', motivo);
              setAccion(null);
              alCambiar(respuesta.mensaje);
            }}
          />
        </div>
      )}

      {accion === 'contrasena' && (
        <div className="admin__entrar">
          <FormularioMotivo
            etiqueta={t('admin.ficha.motivoEnlace')}
            ejemplo={t('admin.ficha.ejemploEnlace')}
            ayuda={t('admin.ficha.ayudaEnlace', { correo: miembro.correo })}
            boton={t('admin.ficha.mandarEnlace')}
            icono="correo"
            alCancelar={() => setAccion(null)}
            alConfirmar={async (motivo) => {
              const respuesta = await admin.enlaceContrasena(miembro.id, motivo);
              setAccion(null);
              alCambiar(respuesta.mensaje);
            }}
          />
        </div>
      )}
    </li>
  );
}
