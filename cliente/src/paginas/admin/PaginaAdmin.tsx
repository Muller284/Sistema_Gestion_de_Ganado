import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alerta,
  Boton,
  Cargando,
  CampoTexto,
  DisenoApp,
  EstadoVacio,
  Icono,
  Insignia,
  Segmentos,
  Tarjeta,
} from '../../componentes';
import {
  api,
  guardarSoporte,
  soporteActual,
  type AccesoAdmin,
  type EstadoCuenta,
  type RanchoParaSoporte,
} from '../../servicios/api';
import { localeActual, t, tn } from '../../servicios/idioma';
import { conTransicion } from '../../servicios/transicion';

/**
 * HU-24 · La pantalla del Admin de plataforma.
 *
 * Dos vistas:
 *   Ranchos     todos los de la plataforma (criterio 1). Para entrar a uno
 *               hay que escribir por qué: esa entrada queda registrada
 *               (criterio 3) y desde ahí el Admin trabaja dentro del rancho
 *               con lo que puede su propietario.
 *   Registro    cada entrada, de quién, a qué rancho, por qué, cuándo y si
 *               sigue abierta, se cerró o venció sola a las ocho horas.
 *
 * El motivo se pide en la misma fila, no en un cuadro del navegador, igual
 * que la suspensión en Equipo.
 */

type Vista = 'ranchos' | 'registro';
const MOTIVO_MINIMO = 10;

export function PaginaAdmin() {
  const [cuenta, setCuenta] = useState<EstadoCuenta | null>(null);
  const [ranchos, setRanchos] = useState<RanchoParaSoporte[]>([]);
  const [accesos, setAccesos] = useState<AccesoAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [vista, setVista] = useState<Vista>('ranchos');
  const [busqueda, setBusqueda] = useState('');
  const [entrando, setEntrando] = useState<string | null>(null);

  const soporte = soporteActual();

  useEffect(() => {
    let vigente = true;
    void (async () => {
      try {
        const yo = await api.yo();
        if (!vigente) return;
        setCuenta(yo);
        if (yo.rol !== 'admin_plataforma') return;
        const [lista, registro] = await Promise.all([api.adminRanchos(), api.accesosAdmin()]);
        if (!vigente) return;
        setRanchos(lista);
        setAccesos(registro);
      } catch (err) {
        if (vigente) setError((err as Error).message);
      } finally {
        if (vigente) setCargando(false);
      }
    })();
    return () => {
      vigente = false;
    };
  }, []);

  const visibles = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return ranchos;
    return ranchos.filter((r) =>
      [r.nombre, r.propietario, r.propietario_correo, r.localidad, r.departamento, r.pais ?? '']
        .join(' ')
        .toLowerCase()
        .includes(termino),
    );
  }, [ranchos, busqueda]);

  const usuario = cuenta
    ? { nombre: cuenta.nombre, rol: cuenta.rol, correo: cuenta.correo }
    : { nombre: '…', rol: '—' };

  return (
    <DisenoApp
      activo="admin"
      ruta={[t('admin.menu')]}
      usuario={usuario}
      rancho={soporte?.rancho ?? null}
      rotulo={t('admin.rotulo')}
      titulo={t('admin.titulo')}
    >
      <div className="col g24">
        {cargando && <Cargando lineas={5} />}
        {error && <Alerta variante="error">{error}</Alerta>}

        {!cargando && cuenta && cuenta.rol !== 'admin_plataforma' && (
          <EstadoVacio icono="escudo" titulo={t('admin.noEsTuRol.titulo')} texto={t('admin.noEsTuRol.texto')} />
        )}

        {!cargando && cuenta?.rol === 'admin_plataforma' && (
          <>
            <p className="cuerpo c-600 admin__intro">{t('admin.intro')}</p>

            {soporte && (
              <Alerta variante="info">{t('admin.sigueAdentro', { rancho: soporte.rancho })}</Alerta>
            )}

            <Tarjeta
              titulo={vista === 'ranchos' ? t('admin.ranchos.titulo') : t('admin.registro.titulo')}
              accion={
                <Segmentos
                  etiqueta={t('admin.vistas')}
                  valor={vista}
                  alCambiar={(nueva) => conTransicion(() => setVista(nueva))}
                  opciones={[
                    { clave: 'ranchos', nombre: t('admin.ranchos.pestana'), cantidad: ranchos.length },
                    { clave: 'registro', nombre: t('admin.registro.pestana'), cantidad: accesos.length },
                  ]}
                />
              }
            >
              {vista === 'ranchos' ? (
                <div className="col g16">
                  <CampoTexto
                    etiqueta={t('admin.ranchos.buscar')}
                    placeholder={t('admin.ranchos.buscarEjemplo')}
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                  />
                  {visibles.length === 0 ? (
                    <p className="cuerpo c-500 centrado admin__vacio">
                      {ranchos.length === 0 ? t('admin.ranchos.ninguno') : t('admin.ranchos.sinResultados')}
                    </p>
                  ) : (
                    <ul className="admin__lista">
                      {visibles.map((rancho) => (
                        <FilaRancho
                          key={rancho.id}
                          rancho={rancho}
                          abierta={entrando === rancho.id}
                          alAbrir={() => conTransicion(() => setEntrando(rancho.id))}
                          alCerrar={() => conTransicion(() => setEntrando(null))}
                        />
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <Registro accesos={accesos} />
              )}
            </Tarjeta>
          </>
        )}
      </div>
    </DisenoApp>
  );
}

function FilaRancho({
  rancho,
  abierta,
  alAbrir,
  alCerrar,
}: {
  rancho: RanchoParaSoporte;
  abierta: boolean;
  alAbrir: () => void;
  alCerrar: () => void;
}) {
  const navegar = useNavigate();
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const corto = motivo.trim().length < MOTIVO_MINIMO;

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      const respuesta = await api.entrarARancho(rancho.id, motivo.trim());
      guardarSoporte({
        accesoId: respuesta.acceso.id,
        ranchoId: rancho.id,
        rancho: rancho.nombre,
        motivo: respuesta.acceso.motivo,
      });
      navegar('/rancho');
    } catch (err) {
      setError((err as Error).message);
      setEnviando(false);
    }
  }

  return (
    <li className={abierta ? 'admin__fila abierta' : 'admin__fila'} style={{ viewTransitionName: `rancho-${rancho.id}` }}>
      <div className="admin__rancho">
        <strong>{rancho.nombre}</strong>
        <span className="pie c-500">
          {t('admin.ranchos.ubicacion', {
            localidad: rancho.localidad,
            departamento: rancho.departamento,
            pais: rancho.pais ?? rancho.pais_codigo,
          })}
        </span>
      </div>
      <div className="admin__dueno">
        <span>{rancho.propietario}</span>
        <span className="pie c-500">{rancho.propietario_correo}</span>
      </div>
      <div className="admin__datos">
        <span className="pie c-500">{tn('admin.ranchos.integrantes', rancho.integrantes)}</span>
        {rancho.acceso_abierto && <Insignia variante="info">{t('admin.estado.abierto')}</Insignia>}
      </div>
      <div className="admin__acciones">
        {!abierta && (
          <Boton variante="secundario" onClick={alAbrir}>
            <Icono nombre="entrar" tamano={16} />
            {t('admin.ranchos.entrar')}
          </Boton>
        )}
      </div>

      {abierta && (
        <form className="admin__motivo" onSubmit={entrar}>
          {error && <Alerta variante="error">{error}</Alerta>}
          <CampoTexto
            etiqueta={t('admin.ranchos.motivo')}
            obligatorio
            autoFocus
            maxLength={300}
            placeholder={t('admin.ranchos.motivoEjemplo')}
            ayuda={t('admin.ranchos.motivoAyuda', { n: MOTIVO_MINIMO })}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
          <div className="fila g8 admin__botones">
            <Boton type="button" variante="secundario" onClick={alCerrar} disabled={enviando}>
              {t('comun.cancelar')}
            </Boton>
            <Boton type="submit" variante="primario" disabled={enviando || corto}>
              <Icono nombre="escudo" tamano={16} />
              {enviando ? t('admin.ranchos.entrando') : t('admin.ranchos.entrarAlRancho')}
            </Boton>
          </div>
        </form>
      )}
    </li>
  );
}

function Registro({ accesos }: { accesos: AccesoAdmin[] }) {
  if (accesos.length === 0) {
    return <p className="cuerpo c-500 centrado admin__vacio">{t('admin.registro.ninguno')}</p>;
  }
  return <ListaDeAccesos accesos={accesos} conAdmin />;
}

const VARIANTE_ESTADO = { abierto: 'info', cerrado: 'neutro', vencido: 'adv' } as const;

function fechaHora(valor: string): string {
  return new Date(valor).toLocaleString(localeActual(), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function duracion(acceso: AccesoAdmin): string {
  if (!acceso.salido_en) return '';
  const minutos = Math.max(
    1,
    Math.round((new Date(acceso.salido_en).getTime() - new Date(acceso.entrado_en).getTime()) / 60000),
  );
  return tn('admin.registro.minutos', minutos);
}

/** También la usa el panel del propietario para ver quién entró a su rancho. */
export function ListaDeAccesos({
  accesos,
  conAdmin = false,
}: {
  accesos: AccesoAdmin[];
  conAdmin?: boolean;
}) {
  return (
    <ul className="admin__registro">
      {accesos.map((acceso) => (
        <li key={acceso.id} className="admin__acceso">
          <div className="admin__cuando">
            <span className="dato">{fechaHora(acceso.entrado_en)}</span>
            <span className="pie c-500">{duracion(acceso)}</span>
          </div>
          <div className="admin__que">
            <strong>
              {conAdmin
                ? t('admin.registro.quienDonde', { admin: acceso.admin, rancho: acceso.rancho })
                : acceso.admin}
            </strong>
            <span className="pie c-600">«{acceso.motivo}»</span>
          </div>
          <Insignia variante={VARIANTE_ESTADO[acceso.estado]}>{t(`admin.estado.${acceso.estado}`)}</Insignia>
        </li>
      ))}
    </ul>
  );
}
