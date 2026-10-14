import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Alerta, Boton, Cargando, DisenoApp, Icono, Tarjeta } from '../../componentes';
import { api, type EstadoRancho, type MiembroEquipo } from '../../servicios/api';
import { t } from '../../servicios/idioma';
import { detalleModulo, nombreModulo } from '../../servicios/permisos';

/**
 * HU-21 · Vista de solo lectura del socio, criterio 3: "Si el propietario me
 * habilita un módulo, ahí sí puedo editar."
 *
 * El socio ya ve todo. Acá el propietario marca en qué módulos además puede
 * cargar y modificar datos. El socio entra y ve lo mismo, sin poder tocarlo.
 * Lo que se guarda lo hace cumplir el servidor en cada módulo.
 */

const MODULOS_EDITABLES = ['animales', 'corrales', 'sanidad', 'pesajes', 'importacion', 'almacen'];

export function PaginaPermisosSocio() {
  const { id = '' } = useParams();
  const [rancho, setRancho] = useState<EstadoRancho | null>(null);
  const [socio, setSocio] = useState<MiembroEquipo | null>(null);
  const [elegidos, setElegidos] = useState<string[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    let vigente = true;
    Promise.all([api.miRancho(), api.equipo(), api.permisosSocio(id)])
      .then(([estado, equipo, permisos]) => {
        if (!vigente) return;
        setRancho(estado);
        setSocio(equipo.find((miembro) => miembro.id === id) ?? null);
        setElegidos(permisos.modulos);
      })
      .catch((err: Error) => vigente && setError(err.message))
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [id]);

  const esPropietario = rancho?.usuario.rol === 'propietario' || Boolean(rancho?.usuario.soporte);
  const usuario = rancho?.usuario ?? { nombre: t('equipo.invitado'), rol: '—' };

  function alternar(modulo: string) {
    setAviso('');
    setElegidos((previos) =>
      previos.includes(modulo) ? previos.filter((m) => m !== modulo) : [...previos, modulo],
    );
  }

  async function guardar() {
    setGuardando(true);
    setError('');
    try {
      const respuesta = await api.guardarPermisosSocio(id, elegidos);
      setElegidos(respuesta.modulos);
      setAviso(respuesta.mensaje);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <DisenoApp
      activo="equipo"
      ruta={[t('equipo.titulo'), t('permisosSocio.titulo')]}
      usuario={usuario}
      rancho={rancho?.rancho?.nombre ?? null}
      rotulo={t('equipo.rotulo')}
      titulo={socio ? t('permisosSocio.tituloDe', { nombre: socio.nombre }) : t('permisosSocio.titulo')}
      acciones={
        <Link className="btn btn-secundario" to="/equipo">
          <Icono nombre="equipo" tamano={18} />
          {t('permisosSocio.volver')}
        </Link>
      }
    >
      <div className="col g24">
        {cargando && <Cargando lineas={4} />}
        {error && <Alerta variante="error">{error}</Alerta>}
        {aviso && <Alerta variante="exito">{aviso}</Alerta>}

        {!cargando && !error && (
          <Tarjeta
            titulo={t('permisosSocio.modulos')}
            pie={
              esPropietario && (
                <Boton variante="primario" onClick={guardar} disabled={guardando}>
                  {guardando ? t('comun.guardando') : t('comun.guardar')}
                </Boton>
              )
            }
          >
            <div className="col g16">
              <p className="cuerpo c-600">{t('permisosSocio.explicacion')}</p>
              <div className="ganado__casillas">
                {MODULOS_EDITABLES.map((modulo) => (
                  <label key={modulo} title={detalleModulo(modulo)}>
                    <input
                      type="checkbox"
                      checked={elegidos.includes(modulo)}
                      disabled={!esPropietario || guardando}
                      onChange={() => alternar(modulo)}
                    />
                    {nombreModulo(modulo)}
                  </label>
                ))}
              </div>
              {!esPropietario && <Alerta variante="info">{t('permisosSocio.soloPropietario')}</Alerta>}
            </div>
          </Tarjeta>
        )}
      </div>
    </DisenoApp>
  );
}
