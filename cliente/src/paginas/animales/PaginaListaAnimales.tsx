import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Alerta,
  Boton,
  CampoLista,
  Cargando,
  DisenoApp,
  EstadoVacio,
  Icono,
  Insignia,
  Segmentos,
  Tarjeta,
} from '../../componentes';
import { api, type Animal, type Corral, type EstadoAnimal } from '../../servicios/api';
import { t } from '../../servicios/idioma';
import { conTransicion } from '../../servicios/transicion';
import { nivel, useContextoGanado, usuarioDe } from '../ganado/contexto';
import { FormularioFicha } from './FormularioFicha';

/**
 * Los animales del rancho, para llegar a cada ficha.
 *
 * HU-33, criterio 3: por defecto solo los activos; los vendidos, muertos y
 * archivados se consultan eligiendo su estado.
 * HU-34: los dados de baja tienen su propia vista y desde la ficha se
 * restauran.
 *
 * HU-37, criterio 2: quien edita animales marca varios activos y los asigna
 * juntos a un corral. Si el corral se excede, se avisa sin impedirlo (HU-38).
 *
 * El listado con filtros y búsqueda es HU-29 (Brian): acá está solo lo que
 * hace falta para registrar un animal, abrir su ficha y asignar corrales.
 */

type Vista = EstadoAnimal | 'todos' | 'bajas';
const VISTAS: Vista[] = ['activo', 'vendido', 'muerto', 'archivado', 'todos', 'bajas'];

export function PaginaListaAnimales() {
  const contexto = useContextoGanado();
  const navegar = useNavigate();
  const [animales, setAnimales] = useState<Animal[]>([]);
  const [vista, setVista] = useState<Vista>('activo');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [registrando, setRegistrando] = useState(false);
  const [seleccion, setSeleccion] = useState<string[]>([]);
  const [corrales, setCorrales] = useState<Corral[]>([]);
  const [destino, setDestino] = useState('');
  const [asignando, setAsignando] = useState(false);
  const [aviso, setAviso] = useState('');
  const [avisoExceso, setAvisoExceso] = useState('');
  // Cambiar la versión vuelve a pedir la lista.
  const [version, setVersion] = useState(0);

  const puedeEditar = nivel(contexto, 'animales') === 'editar';
  // Solo los activos y vigentes se pueden asignar a un corral.
  const asignables = animales.filter((a) => a.estado === 'activo' && !a.eliminado_en);
  const seleccionando = puedeEditar && asignables.length > 0;

  useEffect(() => {
    if (!puedeEditar) return;
    let vigente = true;
    api
      .corrales()
      .then((lista) => vigente && setCorrales(lista))
      .catch(() => undefined);
    return () => {
      vigente = false;
    };
  }, [puedeEditar, version]);

  useEffect(() => {
    let vigente = true;
    const pedido =
      vista === 'bajas'
        ? api.animales('todos', true).then((lista) => lista.filter((a) => a.eliminado_en))
        : api.animales(vista);
    pedido
      .then((lista) => {
        if (vigente) {
          setAnimales(lista);
          setSeleccion([]);
          setError('');
        }
      })
      .catch((err: Error) => vigente && setError(err.message))
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [vista, version]);

  function alternar(id: string) {
    setSeleccion((previa) => (previa.includes(id) ? previa.filter((x) => x !== id) : [...previa, id]));
  }

  /** HU-37, criterio 2. */
  async function asignar() {
    setAsignando(true);
    setError('');
    try {
      const respuesta = await api.asignarAnimales(destino, seleccion);
      setAviso(respuesta.mensaje);
      setAvisoExceso(respuesta.aviso ?? '');
      setDestino('');
      setVersion((previa) => previa + 1);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setAsignando(false);
    }
  }

  function alRegistrar(animal: Animal) {
    navegar(`/animales/${animal.id}`);
  }

  return (
    <DisenoApp
      activo="animales"
      ruta={[t('app.modulos.inicio'), t('animales.titulo')]}
      usuario={usuarioDe(contexto)}
      rancho={contexto.rancho?.rancho?.nombre ?? null}
      rotulo={t('animales.rotulo')}
      titulo={t('animales.titulo')}
      acciones={
        puedeEditar &&
        !registrando && (
          <Boton variante="primario" onClick={() => conTransicion(() => setRegistrando(true))}>
            <Icono nombre="mas" tamano={18} />
            {t('animales.nuevo')}
          </Boton>
        )
      }
    >
      <div className="col g24">
        {(cargando || contexto.cargando) && <Cargando lineas={5} />}
        {error && <Alerta variante="error">{error}</Alerta>}
        {aviso && <Alerta variante="exito">{aviso}</Alerta>}
        {avisoExceso && <Alerta variante="adv">{avisoExceso}</Alerta>}
        {!contexto.cargando && !puedeEditar && !error && (
          <Alerta variante="info">{t('animales.soloConsulta')}</Alerta>
        )}

        {registrando && (
          <FormularioFicha
            regional={contexto.regional}
            alGuardar={alRegistrar}
            alCancelar={() => conTransicion(() => setRegistrando(false))}
          />
        )}

        {!cargando && !error && (
          <>
            <Segmentos
              etiqueta={t('animales.vistas.etiqueta')}
              valor={vista}
              alCambiar={(nueva) => {
                setCargando(true);
                setVista(nueva);
              }}
              opciones={VISTAS.map((clave) => ({ clave, nombre: t(`animales.vistas.${clave}`) }))}
            />

            {seleccion.length > 0 && (
              <Tarjeta>
                <div className="fila g12 centro">
                  <span className="cuerpo-m flex1">{t('animales.seleccion.cuantos', { n: seleccion.length })}</span>
                  <CampoLista
                    etiqueta={t('animales.seleccion.corral')}
                    value={destino}
                    onChange={(e) => setDestino(e.target.value)}
                  >
                    <option value="">{t('animales.campos.elegir')}</option>
                    {corrales.map((corral) => (
                      <option key={corral.id} value={corral.id}>
                        {corral.nombre}
                      </option>
                    ))}
                  </CampoLista>
                  <Boton variante="primario" onClick={asignar} disabled={asignando || !destino}>
                    {asignando ? t('comun.guardando') : t('animales.seleccion.asignar')}
                  </Boton>
                  <Boton variante="fantasma" onClick={() => setSeleccion([])} disabled={asignando}>
                    {t('animales.seleccion.quitar')}
                  </Boton>
                </div>
              </Tarjeta>
            )}

            {animales.length === 0 ? (
              <EstadoVacio
                icono="animal"
                titulo={t('animales.vacio.titulo')}
                texto={vista === 'activo' && puedeEditar ? t('animales.vacio.texto') : t('animales.vacio.textoVista')}
              />
            ) : (
              <Tarjeta>
                <ul className="ganado__lista">
                  {seleccionando && (
                    <li className="ganado__fila">
                      <label className="ganado__casilla">
                        <input
                          type="checkbox"
                          checked={seleccion.length === asignables.length}
                          onChange={() =>
                            setSeleccion(seleccion.length === asignables.length ? [] : asignables.map((a) => a.id))
                          }
                        />
                        {t('animales.seleccion.todos', { n: asignables.length })}
                      </label>
                    </li>
                  )}
                  {animales.map((animal) => (
                    <li key={animal.id} className={animal.eliminado_en ? 'ganado__fila de-baja' : 'ganado__fila'}>
                      {seleccionando && (
                        <input
                          type="checkbox"
                          aria-label={t('animales.seleccion.elegir', { identificador: animal.identificador })}
                          checked={seleccion.includes(animal.id)}
                          disabled={animal.estado !== 'activo' || Boolean(animal.eliminado_en)}
                          onChange={() => alternar(animal.id)}
                        />
                      )}
                      <div className="ganado__principal">
                        <span className="dato">{animal.identificador}</span>
                        <span className="pie c-500">
                          {[
                            animal.nombre,
                            animal.categoria_codigo && t(`animales.categorias.${animal.categoria_codigo}`),
                            t(`animales.sexos.${animal.sexo}`),
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </div>
                      <span className="ganado__dato">{animal.corral_nombre ?? t('animales.sinCorral')}</span>
                      <Insignia variante={animal.estado}>{t(`animales.estados.${animal.estado}`)}</Insignia>
                      {animal.eliminado_en && <Insignia variante="archivado">{t('animales.deBaja')}</Insignia>}
                      <div className="ganado__acciones">
                        <Link className="btn btn-fantasma" to={`/animales/${animal.id}`}>
                          {t('animales.verFicha')}
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              </Tarjeta>
            )}
          </>
        )}
      </div>
    </DisenoApp>
  );
}
