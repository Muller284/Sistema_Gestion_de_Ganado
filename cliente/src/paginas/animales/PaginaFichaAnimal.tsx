import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
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
  Segmentos,
  Tarjeta,
} from '../../componentes';
import {
  api,
  type Animal,
  type Corral,
  type EstadoAnimal,
  type FichaAnimal,
} from '../../servicios/api';
import { t, tn } from '../../servicios/idioma';
import { conTransicion } from '../../servicios/transicion';
import {
  formatoFecha,
  formatoMomento,
  formatoPeso,
  hoyEn,
  type Regional,
} from '../../servicios/unidades';
import { nivel, puedeEliminar, useContextoGanado, usuarioDe } from '../ganado/contexto';
import { FormularioFicha } from './FormularioFicha';
import { armarHistorial, edadEnMeses, type EventoHistorial } from './historial';
import { nombreRaza } from './razas';

/**
 * La ficha de un animal.
 *
 * HU-28  sus datos, y editarlos.
 * HU-39  el historial de movimientos entre corrales se ve acá (criterio 2), y
 *        mover es la única forma de cambiarle el corral, así el corral actual
 *        siempre es el del último movimiento (criterio 3).
 * HU-33  cambiar el estado pide confirmación y registra fecha y motivo.
 * HU-34  dar de baja y restaurar. HU-18, criterio 3: solo el propietario y el
 *        Admin en soporte (puedeEliminar); el servidor lo vuelve a exigir.
 * HU-37  mover desde la ficha también es asignar; si el corral se excede,
 *        se avisa sin impedirlo (HU-38).
 * HU-22  quien solo puede ver, ve la ficha y los dos historiales (criterio 3).
 * HU-23  quién registró la ficha y quién la modificó por última vez, con la
 *        fecha y hora en la zona del rancho.
 * HU-32  la ficha con todo su historial:
 *          1. el encabezado muestra el identificador en grande, el estado y
 *             los datos principales (EncabezadoAnimal);
 *          2. pestañas de resumen, sanidad, pesajes e historial;
 *          3. sanidad y pesajes son de la fase 3: la pestaña existe y explica
 *             por qué todavía está vacía;
 *          4. el historial junta alta, movimientos, cambios de estado y baja,
 *             cada uno con quién lo registró y cuándo (historial.ts).
 *        La pestaña elegida va en la dirección (?pestana=historial), así se
 *        puede compartir el enlace y el botón Atrás del navegador la respeta.
 */

const ESTADOS: EstadoAnimal[] = ['activo', 'vendido', 'muerto', 'archivado'];

type Pestana = 'resumen' | 'sanidad' | 'pesajes' | 'historial';
const PESTANAS: Pestana[] = ['resumen', 'sanidad', 'pesajes', 'historial'];

function pestanaDe(valor: string | null): Pestana {
  return PESTANAS.find((pestana) => pestana === valor) ?? 'resumen';
}

export function PaginaFichaAnimal() {
  const { id = '' } = useParams();
  const [parametros, setParametros] = useSearchParams();
  const pestana = pestanaDe(parametros.get('pestana'));
  const contexto = useContextoGanado();
  const [ficha, setFicha] = useState<FichaAnimal | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  // HU-38: el corral de destino quedó excedido. El movimiento ya se hizo.
  const [avisoExceso, setAvisoExceso] = useState('');
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
  // HU-18, criterio 3: dar de baja y restaurar, solo el propietario y el Admin.
  const eliminable = puedeEliminar(contexto);
  const animal = ficha?.animal;
  const vigente = Boolean(animal && !animal.eliminado_en);
  const historial = useMemo(() => (ficha ? armarHistorial(ficha) : []), [ficha]);

  function cambiarPestana(nueva: Pestana) {
    conTransicion(() =>
      setParametros(nueva === 'resumen' ? {} : { pestana: nueva }, { replace: true }),
    );
  }

  async function alHacer(hacer: () => Promise<{ mensaje: string; aviso?: string | null }>) {
    setOcupado(true);
    setError('');
    setAviso('');
    setAvisoExceso('');
    try {
      const respuesta = await hacer();
      setAviso(respuesta.mensaje);
      setAvisoExceso(respuesta.aviso ?? '');
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
        {avisoExceso && <Alerta variante="adv">{avisoExceso}</Alerta>}

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
            <EncabezadoAnimal animal={animal} regional={contexto.regional} />

            <Segmentos
              etiqueta={t('animales.ficha.pestanas.etiqueta')}
              valor={pestana}
              alCambiar={cambiarPestana}
              opciones={PESTANAS.map((clave) => ({
                clave,
                nombre: t(`animales.ficha.pestanas.${clave}`),
                cantidad: clave === 'historial' ? historial.length : undefined,
              }))}
            />

            {pestana === 'resumen' && (
              <>
                <Tarjeta
                  titulo={t('animales.ficha.datos')}
                  pie={
                    puedeEditar && (
                      <div className="fila g8 centro">
                        {vigente && !confirmandoBaja && (
                          <>
                            <Boton variante="secundario" onClick={() => conTransicion(() => setEditando(true))}>
                              <Icono nombre="lapiz" tamano={16} />
                              {t('animales.ficha.editar')}
                            </Boton>
                            {eliminable && (
                              <Boton variante="fantasma" onClick={() => setConfirmandoBaja(true)}>
                                <Icono nombre="archivar" tamano={16} />
                                {t('animales.ficha.darDeBaja')}
                              </Boton>
                            )}
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
                        {!vigente && eliminable && (
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
              </>
            )}

            {pestana === 'sanidad' && (
              <Tarjeta titulo={t('animales.ficha.pestanas.sanidad')}>
                <EstadoVacio
                  icono="sanidad"
                  titulo={t('animales.ficha.sanidad.titulo')}
                  texto={t('animales.ficha.sanidad.texto')}
                />
              </Tarjeta>
            )}

            {pestana === 'pesajes' && (
              <Tarjeta titulo={t('animales.ficha.pestanas.pesajes')}>
                <EstadoVacio
                  icono="balanza"
                  titulo={t('animales.ficha.pesajes.titulo')}
                  texto={
                    animal.peso_kg
                      ? t('animales.ficha.pesajes.textoConPeso', {
                          peso: formatoPeso(animal.peso_kg, contexto.regional),
                        })
                      : t('animales.ficha.pesajes.texto')
                  }
                />
              </Tarjeta>
            )}

            {pestana === 'historial' && (
              <Tarjeta titulo={t('animales.ficha.historial.titulo')}>
                <Historial eventos={historial} regional={contexto.regional} />
              </Tarjeta>
            )}
          </>
        )}
      </div>
    </DisenoApp>
  );
}

/**
 * HU-32, criterio 1. El identificador es lo que se busca con el animal
 * delante (la caravana en la oreja), por eso es lo más grande de la pantalla.
 */
function EncabezadoAnimal({ animal, regional }: { animal: Animal; regional: Regional }) {
  const meses = edadEnMeses(animal.fecha_nacimiento, hoyEn(regional));
  const raya = '—';

  return (
    <section className="animal-encabezado" aria-labelledby="animal-identificador">
      <div className="animal-encabezado__titulo">
        <span className="etiqueta c-600">{t(`animales.tiposIdentificador.${animal.tipo_identificador}`)}</span>
        <span id="animal-identificador" className="animal-encabezado__numero">
          {animal.identificador}
        </span>
        {animal.nombre && <span className="cuerpo-g c-700">{animal.nombre}</span>}
      </div>

      <div className="fila g8 centro animal-encabezado__estado">
        <Insignia variante={animal.estado}>{t(`animales.estados.${animal.estado}`)}</Insignia>
        {animal.eliminado_en && <Insignia variante="archivado">{t('animales.deBaja')}</Insignia>}
      </div>

      <dl className="animal-encabezado__datos">
        <div>
          <dt>{t('animales.campos.categoria')}</dt>
          <dd>{animal.categoria_codigo ? t(`animales.categorias.${animal.categoria_codigo}`) : raya}</dd>
        </div>
        <div>
          <dt>{t('animales.campos.sexo')}</dt>
          <dd>{t(`animales.sexos.${animal.sexo}`)}</dd>
        </div>
        <div>
          <dt>{t('animales.ficha.encabezado.edad')}</dt>
          <dd>{meses === null ? raya : textoEdad(meses)}</dd>
        </div>
        <div>
          <dt>{t('animales.campos.pesoActual')}</dt>
          <dd>{animal.peso_kg ? formatoPeso(animal.peso_kg, regional) : raya}</dd>
        </div>
        <div>
          <dt>{t('animales.campos.corralActual')}</dt>
          <dd>{animal.corral_nombre ?? t('animales.sinCorral')}</dd>
        </div>
      </dl>
    </section>
  );
}

/** "1 año y 3 meses", "8 meses". Menos de un mes también es "0 meses". */
function textoEdad(meses: number): string {
  const anios = Math.floor(meses / 12);
  const resto = meses % 12;
  if (anios === 0) return tn('animales.ficha.encabezado.meses', resto);
  if (resto === 0) return tn('animales.ficha.encabezado.anios', anios);
  return t('animales.ficha.encabezado.aniosYMeses', {
    anios: tn('animales.ficha.encabezado.anios', anios),
    meses: tn('animales.ficha.encabezado.meses', resto),
  });
}

const ICONO_EVENTO = {
  alta: 'mas',
  movimiento: 'corral',
  estado: 'regla',
  baja: 'archivar',
} as const;

/** HU-32, criterio 4: qué pasó, quién lo registró y cuándo. */
function Historial({ eventos, regional }: { eventos: EventoHistorial[]; regional: Regional }) {
  return (
    <ol className="animal-historial">
      {eventos.map((evento) => (
        <li key={evento.clave} className={`animal-historial__evento animal-historial__evento--${evento.tipo}`}>
          <span className="animal-historial__icono" aria-hidden="true">
            <Icono nombre={ICONO_EVENTO[evento.tipo]} tamano={16} />
          </span>
          <div className="col g4 flex1">
            <span className="cuerpo">{descripcion(evento, regional)}</span>
            {evento.tipo === 'estado' && <span className="pie c-600">«{evento.motivo}»</span>}
            <span className="pie c-500">
              {t('animales.ficha.historial.quienCuando', {
                nombre: evento.quien ?? t('animales.ficha.autoria.sistema'),
                momento: formatoMomento(evento.momento, regional),
              })}
            </span>
          </div>
        </li>
      ))}
    </ol>
  );
}

function descripcion(evento: EventoHistorial, regional: Regional): string {
  switch (evento.tipo) {
    case 'alta':
      return t('animales.ficha.historial.alta');
    case 'movimiento':
      if (!evento.origen && evento.destino) {
        return t('animales.ficha.historial.entro', { destino: evento.destino });
      }
      return t('animales.ficha.movimientos.de', {
        origen: evento.origen ?? t('animales.sinCorral'),
        destino: evento.destino ?? t('animales.sinCorral'),
      });
    case 'estado':
      return t('animales.ficha.historial.estado', {
        anterior: t(`animales.estados.${evento.anterior}`),
        nuevo: t(`animales.estados.${evento.nuevo}`),
        fecha: formatoFecha(evento.fecha, regional),
      });
    case 'baja':
      return t('animales.ficha.historial.baja');
  }
}

function DatosDelAnimal({ animal, regional }: { animal: Animal; regional: Regional }) {
  const raya = '—';
  return (
    <Datos>
      <Dato nombre={t(`animales.tiposIdentificador.${animal.tipo_identificador}`)}>
        <span className="dato">{animal.identificador}</span>
      </Dato>
      <Dato nombre={t('animales.campos.nombre')}>{animal.nombre ?? raya}</Dato>
      <Dato nombre={t('animales.campos.raza')}>{nombreRaza(animal.raza) ?? raya}</Dato>
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
      <Dato nombre={t('animales.ficha.autoria.creado')}>
        {t('animales.ficha.autoria.detalle', {
          nombre: animal.creado_por_nombre ?? t('animales.ficha.autoria.sistema'),
          momento: formatoMomento(animal.creado_en, regional),
        })}
      </Dato>
      <Dato nombre={t('animales.ficha.autoria.modificado')}>
        {t('animales.ficha.autoria.detalle', {
          nombre: animal.modificado_por_nombre ?? t('animales.ficha.autoria.sistema'),
          momento: formatoMomento(animal.modificado_en, regional),
        })}
      </Dato>
    </Datos>
  );
}

interface PropiedadesAccion {
  animal: Animal;
  alHacer: (hacer: () => Promise<{ mensaje: string; aviso?: string | null }>) => Promise<void>;
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
