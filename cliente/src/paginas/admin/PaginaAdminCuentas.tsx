import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alerta, CampoTexto, Cargando, Insignia, Tarjeta } from '../../componentes';
import { admin, type CuentaResumen } from '../../servicios/admin';
import { t, tn } from '../../servicios/idioma';
import { EntrarASoporte, MarcoAdmin } from './comun';
import { haceCuanto, numero } from './formatos';

/**
 * Fase 4 · RF-57. Las cuentas de la plataforma: cada rancho con su
 * propietario, cuánto lo usan y cuándo fue la última vez. La búsqueda la hace
 * el servidor, sin mayúsculas ni tildes. Desde acá se abre la ficha o se
 * entra a dar soporte (HU-24).
 */

const ESPERA_BUSQUEDA_MS = 250;

export function PaginaAdminCuentas() {
  return (
    <MarcoAdmin activo="admin-cuentas" ruta={[t('admin.navegacion.cuentas')]} titulo={t('admin.cuentas.titulo')}>
      {() => <Cuentas />}
    </MarcoAdmin>
  );
}

function Cuentas() {
  const [busqueda, setBusqueda] = useState('');
  const [cuentas, setCuentas] = useState<CuentaResumen[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let vigente = true;
    const espera = window.setTimeout(() => {
      admin
        .cuentas(busqueda)
        .then((lista) => {
          if (!vigente) return;
          setCuentas(lista);
          setError('');
        })
        .catch((err: Error) => vigente && setError(err.message));
    }, busqueda ? ESPERA_BUSQUEDA_MS : 0);
    return () => {
      vigente = false;
      window.clearTimeout(espera);
    };
  }, [busqueda]);

  return (
    <>
      <p className="cuerpo c-600 admin__intro">{t('admin.cuentas.intro')}</p>
      <Tarjeta titulo={cuentas ? tn('admin.cuentas.cuantas', cuentas.length) : t('admin.cuentas.titulo')}>
        <div className="col g16">
          <CampoTexto
            etiqueta={t('admin.ranchos.buscar')}
            placeholder={t('admin.ranchos.buscarEjemplo')}
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          {error && <Alerta variante="error">{error}</Alerta>}
          {!cuentas && !error && <Cargando lineas={4} />}
          {cuentas && cuentas.length === 0 && (
            <p className="cuerpo c-500 centrado admin__vacio">
              {busqueda.trim() ? t('admin.ranchos.sinResultados') : t('admin.ranchos.ninguno')}
            </p>
          )}
          {cuentas && cuentas.length > 0 && (
            <ul className="admin__lista">
              {cuentas.map((cuenta) => (
                <FilaCuenta key={cuenta.id} cuenta={cuenta} />
              ))}
            </ul>
          )}
        </div>
      </Tarjeta>
    </>
  );
}

function FilaCuenta({ cuenta }: { cuenta: CuentaResumen }) {
  return (
    <li className="admin__fila admin__fila--cuenta">
      <div className="admin__rancho">
        <Link className="admin__nombre" to={`/admin/cuentas/${cuenta.id}`}>
          {cuenta.nombre}
        </Link>
        <span className="pie c-500">
          {t('admin.ranchos.ubicacion', {
            localidad: cuenta.localidad,
            departamento: cuenta.departamento,
            pais: cuenta.pais ?? cuenta.pais_codigo,
          })}
        </span>
      </div>
      <div className="admin__dueno">
        <span>{cuenta.propietario}</span>
        <span className="pie c-500">{cuenta.propietario_correo}</span>
      </div>
      <div className="admin__uso">
        <span className="pie c-600">
          {tn('admin.ranchos.integrantes', cuenta.integrantes)} · {tn('admin.cuentas.animales', cuenta.animales)}
        </span>
        <span className="pie c-500">
          {t('admin.cuentas.ultima', { cuando: haceCuanto(cuenta.ultima_actividad) })}
          {cuenta.consultas_mes > 0 && ` · ${tn('admin.cuentas.consultas', cuenta.consultas_mes, { n: numero(cuenta.consultas_mes) })}`}
        </span>
      </div>
      <div className="admin__datos">
        {cuenta.propietario_estado === 'suspendido' && <Insignia variante="error">{t('admin.cuentas.suspendida')}</Insignia>}
        {cuenta.acceso_abierto && <Insignia variante="info">{t('admin.estado.abierto')}</Insignia>}
      </div>
      <div className="admin__acciones">
        <Link className="btn btn-fantasma" to={`/admin/cuentas/${cuenta.id}`}>
          {t('admin.cuentas.verFicha')}
        </Link>
      </div>
      <div className="admin__entrar">
        <EntrarASoporte ranchoId={cuenta.id} rancho={cuenta.nombre} abierto={Boolean(cuenta.acceso_abierto)} />
      </div>
    </li>
  );
}
