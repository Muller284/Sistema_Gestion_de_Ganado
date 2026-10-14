import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Alerta,
  Boton,
  Cargando,
  CampoLista,
  CampoTexto,
  Dato,
  Datos,
  DisenoApp,
  EstadoVacio,
  Icono,
  Insignia,
  Tarjeta,
} from '../../componentes';
import {
  api,
  type Animal,
  type Corral,
  type EstadoAnimal,
  type FichaAnimal,
} from '../../servicios/api';
import { t } from '../../servicios/idioma';
import { conTransicion } from '../../servicios/transicion';
import {
  formatoFecha,
  formatoMomento,
  formatoPeso,
  hoyEn,
  type Regional,
} from '../../servicios/unidades';
import { nivel, useContextoGanado, usuarioDe } from '../ganado/contexto';
import { FormularioFicha } from './FormularioFicha';

/**
 * La ficha de un animal.
 *
 * HU-28  sus datos, y editarlos.
 * HU-39  el historial de movimientos entre corrales se ve acá (criterio 2), y
 *        mover es la única forma de cambiarle el corral, así el corral actual
 *        siempre es el del último movimiento (criterio 3).
 * HU-33  cambiar el estado pide confirmación y registra fecha y motivo.
 * HU-34  dar de baja y restaurar.
 * HU-22  quien solo puede ver, ve la ficha y los dos historiales (criterio 3).
 */

const ESTADOS: EstadoAnimal[] = ['activo', 'vendido', 'muerto', 'archivado'];

export function PaginaFichaAnimal() {
  const { id = '' } = useParams();
  const contexto = useContextoGanado();
  const [ficha, setFicha] = useState<FichaAnimal | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [editando, setEditando] = useState(false);
  const [confirmandoBaja, setConfirmandoBaja] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  // Cambiar la versión vuelve a pedir la ficha.
  const [version, setVersion] = useState(0);
  const recargar = () => setVersion((previa) => previa + 1);

  useEffect(() => {
    let vigente = true;
    api
      .fichaAnimal(id)
      .then((respuesta) => {
        if (!vigente) return;
        setFicha(respuesta);
        setError('');
      })
      .catch((err: Error) => vigente && setError(err.message))
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [id, version]);

  const puedeEditar = nivel(contexto, 'animales') === 'editar';
  const animal = ficha?.animal;
  const vigente = Boolean(animal && !animal.eliminado_en);

  async function alHacer(hacer: () => Promise<{ mensaje: string }>) {
    setOcupado(true);
    setError('');
    setAviso('');
    try {
      setAviso((await hacer()).mensaje);
      setConfirmandoBaja(false);
      recargar();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <DisenoApp
      activo="animales"
      ruta={[t('animales.titulo'), animal?.identificador ?? t('comun.cargando')]}
      usuario={usuarioDe(contexto)}
      rancho={contexto.rancho?.rancho?.nombre ?? null}
      rotulo={t('animales.ficha.rotulo')}
      titulo={animal ? t('animales.ficha.titulo', { identificador: animal.identificador }) : t('animales.titulo')}
      acciones={
        <Link className="btn btn-secundario" to="/animales">
          <Icono nombre="flecha" tamano={18} />
          {t('animales.ficha.volver')}
        </Link>
      }
    >
      <div className="col g24">
        {(cargando || contexto.cargando) && <Cargando lineas={6} />}
        {error && <Alerta variante="error">{error}</Alerta>}
        {aviso && <Alerta variante="exito">{aviso}</Alerta>}

        {animal && ficha && editando && (
          <FormularioFicha
            animal={animal}
            regional={contexto.regional}
            alGuardar={(_actualizado, mensaje) => {
              conTransicion(() => setEditando(false));
              setAviso(mensaje);
              recargar();
            }}
            alCancelar={() => conTransicion(() => setEditando(false))}
          />
        )}

        {animal && ficha && !editando && (
          <>
            <Tarjeta
              titulo={t('animales.ficha.datos')}
              accion={
                <div className="fila g8 centro">
                  <Insignia variante={animal.estado}>{t(`animales.estados.${animal.estado}`)}</Insignia>
                  {animal.eliminado_en && <Insignia variante="archivado">{t('animales.deBaja')}</Insignia>}
                </div>
              }
              pie={
                puedeEditar && (
                  <div className="fila g8 centro">
                    {vigente && !confirmandoBaja && (
                      <>
                        <Boton variante="secundario" onClick={() => conTransicion(() => setEditando(true))}>
                          <Icono nombre="lapiz" tamano={16} />
                          {t('animales.ficha.editar')}
                        </Boton>
                        <Boton variante="fantasma" onClick={() => setConfirmandoBaja(true)}>
                          <Icono nombre="archivar" tamano={16} />
                          {t('animales.ficha.darDeBaja')}
                        </Boton>
                      </>
                    )}
                    {vigente && confirmandoBaja && (
                      <>
                        <span className="pie c-600">
                          {t('animales.ficha.confirmarBaja', { identificador: animal.identificador })}
                        </span>
                        <Boton variante="secundario" onClick={() => setConfirmandoBaja(false)} disabled={ocupado}>
                          {t('comun.cancelar')}
                        </Boton>
                        <Boton
                          variante="destructivo"
                          onClick={() => alHacer(() => api.bajaAnimal(animal.id))}
                          disabled={ocupado}
                        >
                          {t('animales.ficha.darDeBaja')}
                        </Boton>
                      </>
                    )}
                    {!vigente && (
                      <Boton
                        variante="primario"
                        onClick={() => alHacer(() => api.restaurarAnimal(animal.id))}
                        disabled={ocupado}
                      >
                        {t('animales.ficha.restaurar')}
                      </Boton>
                    )}
                  </div>
                )
              }
            >
              <DatosDelAnimal animal={animal} regional={contexto.regional} />
            </Tarjeta>

            {puedeEditar && vigente && (
              <div className="par">
                <MoverDeCorral animal={animal} alHacer={alHacer} ocupado={ocupado} />
                <CambiarEstado animal={animal} regional={contexto.regional} alHacer={alHacer} ocupado={ocupado} />
              </div>
            )}

            <Tarjeta titulo={t('animales.ficha.movimientos.titulo')}>
              {ficha.movimientos.length === 0 ? (
                <EstadoVacio
                  icono="corral"
                  titulo={t('animales.ficha.movimientos.vacio')}
                  texto={t('animales.ficha.movimientos.vacioTexto')}
                />
              ) : (
                <ul className="ganado__historial">
                  {ficha.movimientos.map((movimiento) => (
                    <li key={movimiento.id}>
                      <span className="dato">{formatoMomento(movimiento.fecha, contexto.regional)}</span>
                      <span className="flex1">
                        {t('animales.ficha.movimientos.de', {
                          origen: movimiento.corral_origen ?? t('animales.sinCorral'),
                          destino: movimiento.corral_destino ?? t('animales.sinCorral'),
                        })}
                      </span>
                      <span className="pie c-500">
                        {t('animales.ficha.registro', { nombre: movimiento.registrado_por ?? '—' })}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Tarjeta>

            <Tarjeta titulo={t('animales.ficha.estados.titulo')}>
              {ficha.estados.length === 0 ? (
                <p className="cuerpo c-600">{t('animales.ficha.estados.vacio')}</p>
              ) : (
                <ul className="ganado__historial">
                  {ficha.estados.map((cambio) => (
                    <li key={cambio.id}>
                      <span className="dato">{formatoFecha(cambio.fecha, contexto.regional)}</span>
                      <span className="flex1">
                        {t('animales.ficha.estados.de', {
                          anterior: t(`animales.estados.${cambio.estado_anterior}`),
                          nuevo: t(`animales.estados.${cambio.estado_nuevo}`),
                        })}
                        {' · '}
                        {cambio.motivo}
                      </span>
                      <span className="pie c-500">
                        {t('animales.ficha.registro', { nombre: cambio.registrado_por ?? '—' })}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Tarjeta>
          </>
        )}
      </div>
    </DisenoApp>
  );
}

function DatosDelAnimal({ animal, regional }: { animal: Animal; regional: Regional }) {
  const raya = '—';
  return (
    <Datos>
      <Dato nombre={t(`animales.tiposIdentificador.${animal.tipo_identificador}`)}>
        <span className="dato">{animal.identificador}</span>
      </Dato>
      <Dato nombre={t('animales.campos.nombre')}>{animal.nombre ?? raya}</Dato>
      <Dato nombre={t('animales.campos.raza')}>{animal.raza ?? raya}</Dato>
      <Dato nombre={t('animales.campos.sexo')}>{t(`animales.sexos.${animal.sexo}`)}</Dato>
      <Dato nombre={t('animales.campos.categoria')}>
        {animal.categoria_codigo ? t(`animales.categorias.${animal.categoria_codigo}`) : raya}
      </Dato>
      <Dato nombre={t('animales.campos.nacimiento')}>{formatoFecha(animal.fecha_nacimiento, regional)}</Dato>
      <Dato nombre={t('animales.campos.origen')}>
        {animal.origen ? t(`animales.origenes.${animal.origen}`) : raya}
      </Dato>
      <Dato nombre={t('animales.campos.pesoActual')}>
        {animal.peso_kg ? formatoPeso(animal.peso_kg, regional) : raya}
      </Dato>
      <Dato nombre={t('animales.campos.corralActual')}>{animal.corral_nombre ?? t('animales.sinCorral')}</Dato>
    </Datos>
  );
}

interface PropiedadesAccion {
  animal: Animal;
  alHacer: (hacer: () => Promise<{ mensaje: string }>) => Promise<void>;
  ocupado: boolean;
}

/** HU-39. */
function MoverDeCorral({ animal, alHacer, ocupado }: PropiedadesAccion) {
  const [corrales, setCorrales] = useState<Corral[]>([]);
  const [destino, setDestino] = useState('');

  useEffect(() => {
    let vigente = true;
    api
      .corrales()
      .then((lista) => vigente && setCorrales(lista))
      .catch(() => undefined);
    return () => {
      vigente = false;
    };
  }, []);

  const opciones = corrales.filter((c) => c.id !== animal.corral_id);
  const sinCorral = 'ninguno';

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    await alHacer(() => api.moverAnimal(animal.id, destino === sinCorral ? null : destino));
    setDestino('');
  }

  return (
    <form onSubmit={enviar}>
      <Tarjeta
        titulo={t('animales.ficha.mover.titulo')}
        pie={
          <Boton variante="primario" type="submit" disabled={ocupado || !destino}>
            {t('animales.ficha.mover.boton')}
          </Boton>
        }
      >
        <CampoLista
          etiqueta={t('animales.ficha.mover.destino')}
          ayuda={t('animales.ficha.mover.ayuda', { corral: animal.corral_nombre ?? t('animales.sinCorral') })}
          value={destino}
          onChange={(e) => setDestino(e.target.value)}
        >
          <option value="">{t('animales.campos.elegir')}</option>
          {opciones.map((corral) => (
            <option key={corral.id} value={corral.id}>
              {corral.nombre}
            </option>
          ))}
          {animal.corral_id && <option value={sinCorral}>{t('animales.ficha.mover.sacar')}</option>}
        </CampoLista>
      </Tarjeta>
    </form>
  );
}

/** HU-33: elegir, confirmar y recién entonces guardar, con fecha y motivo. */
function CambiarEstado({ animal, regional, alHacer, ocupado }: PropiedadesAccion & { regional: Regional }) {
  const [estado, setEstado] = useState<EstadoAnimal | ''>('');
  const [fecha, setFecha] = useState(hoyEn(regional));
  const [motivo, setMotivo] = useState('');
  const [confirmando, setConfirmando] = useState(false);

  const listo = Boolean(estado) && motivo.trim().length > 0 && Boolean(fecha);

  async function confirmar() {
    if (!estado) return;
    await alHacer(() => api.cambiarEstadoAnimal(animal.id, estado, motivo, fecha));
    setEstado('');
    setMotivo('');
    setConfirmando(false);
  }

  return (
    <form
      onSubmit={(evento) => {
        evento.preventDefault();
        if (listo) setConfirmando(true);
      }}
    >
      <Tarjeta
        titulo={t('animales.ficha.estado.titulo')}
        pie={
          confirmando ? (
            <div className="fila g8 centro">
              <Boton variante="secundario" onClick={() => setConfirmando(false)} disabled={ocupado}>
                {t('comun.cancelar')}
              </Boton>
              <Boton variante="destructivo" onClick={confirmar} disabled={ocupado}>
                {t('animales.ficha.estado.confirmar')}
              </Boton>
            </div>
          ) : (
            <Boton variante="primario" type="submit" disabled={!listo}>
              {t('animales.ficha.estado.boton')}
            </Boton>
          )
        }
      >
        <div className="col g16">
          {confirmando && estado && (
            <Alerta variante="adv">
              {t('animales.ficha.estado.pregunta', {
                identificador: animal.identificador,
                estado: t(`animales.estados.${estado}`),
              })}
            </Alerta>
          )}
          <CampoLista
            etiqueta={t('animales.ficha.estado.nuevo')}
            obligatorio
            value={estado}
            disabled={confirmando}
            onChange={(e) => setEstado(e.target.value as EstadoAnimal)}
          >
            <option value="">{t('animales.campos.elegir')}</option>
            {ESTADOS.filter((opcion) => opcion !== animal.estado).map((opcion) => (
              <option key={opcion} value={opcion}>
                {t(`animales.estados.${opcion}`)}
              </option>
            ))}
          </CampoLista>
          <CampoTexto
            etiqueta={t('animales.ficha.estado.fecha')}
            obligatorio
            type="date"
            max={hoyEn(regional)}
            value={fecha}
            disabled={confirmando}
            onChange={(e) => setFecha(e.target.value)}
          />
          <CampoTexto
            etiqueta={t('animales.ficha.estado.motivo')}
            obligatorio
            maxLength={500}
            placeholder={t('animales.ficha.estado.motivoEjemplo')}
            value={motivo}
            disabled={confirmando}
            onChange={(e) => setMotivo(e.target.value)}
          />
        </div>
      </Tarjeta>
    </form>
  );
}
