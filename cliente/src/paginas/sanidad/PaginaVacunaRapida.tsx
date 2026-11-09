import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Alerta, Boton, Cargando, CampoTexto, DisenoApp, EstadoVacio, Icono, Tarjeta } from '../../componentes';
import { api, type AnimalSanidad, type OpcionesAplicacion } from '../../servicios/api';
import { t, tn } from '../../servicios/idioma';
import { textoDosis } from '../../servicios/productos';
import { nivel, useContextoGanado, usuarioDe } from '../ganado/contexto';

/**
 * HU-52 · Registrar vacuna desde el celular, en la manga.
 *
 *   1. Se busca el animal por su caravana, se elige el producto y se
 *      confirma. El animal encontrado se muestra antes de registrar, para no
 *      vacunar al que no es.
 *   2. Todo lo tocable mide al menos 48 px: campos y botones usan el alto
 *      móvil del sistema de diseño (52 px) y los productos son botones
 *      grandes. Las acciones van en la barra pegada al borde inferior, como
 *      en el alta rápida (HU-35, animal.css).
 *      La pista de qué falta ocupa siempre su lugar, así los botones no se
 *      mueven bajo el dedo.
 *   3. Se encadenan animales: al registrar, la caravana se vacía y vuelve a
 *      tener el foco; el producto se queda, porque en una jornada se aplica
 *      el mismo a todos.
 *
 * Registra con la misma ruta que la ficha (HU-48): fecha de hoy, la dosis del
 * catálogo y aplicada por quien la registra.
 */

interface Registrada {
  clave: string;
  identificador: string;
  producto: string;
}

export function PaginaVacunaRapida() {
  const contexto = useContextoGanado();
  const formulario = useRef<HTMLFormElement>(null);
  const [opciones, setOpciones] = useState<OpcionesAplicacion | null>(null);
  const [caravana, setCaravana] = useState('');
  const [animal, setAnimal] = useState<AnimalSanidad | null>(null);
  const [productoId, setProductoId] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [registradas, setRegistradas] = useState<Registrada[]>([]);

  const puedeEditar = nivel(contexto, 'sanidad') === 'editar';

  useEffect(() => {
    if (!puedeEditar) return;
    let vigente = true;
    api
      .opcionesAplicacion()
      .then((respuesta) => vigente && setOpciones(respuesta))
      .catch((err: Error) => vigente && setError(err.message));
    return () => {
      vigente = false;
    };
  }, [puedeEditar]);

  const producto = opciones?.productos.find((p) => p.id === productoId);
  const listo = animal !== null && producto !== undefined;

  function enfocarCaravana() {
    formulario.current?.querySelector<HTMLInputElement>('input[name="caravana"]')?.focus();
  }

  function cambiarCaravana(valor: string) {
    setCaravana(valor);
    // Otra caravana es otro animal: hay que volver a buscarlo.
    setAnimal(null);
  }

  /** Un solo botón principal: primero busca el animal, después registra. */
  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (ocupado || !caravana.trim()) return;
    setOcupado(true);
    setError('');
    setAviso('');
    try {
      if (!animal) {
        setAnimal((await api.buscarAnimalSanidad(caravana.trim())).animal);
        return;
      }
      if (!producto || !opciones) return;
      const respuesta = await api.registrarAplicacion(animal.id, {
        producto_id: producto.id,
        fecha: opciones.hoy,
        dosis: null,
        esquema_id: null,
        numero_dosis: null,
        aplicado_por: null,
        observacion: null,
      });
      setRegistradas((previas) => [
        { clave: respuesta.aplicacion.id, identificador: animal.identificador, producto: producto.nombre },
        ...previas,
      ]);
      setAviso(`${respuesta.mensaje} ${t('sanidad.rapido.siguiente')}`);
      setCaravana('');
      setAnimal(null);
      enfocarCaravana();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <DisenoApp
      activo="sanidad"
      ruta={[t('sanidad.titulo'), t('sanidad.pestanas.rapido')]}
      usuario={usuarioDe(contexto)}
      rancho={contexto.rancho?.rancho?.nombre ?? null}
      rotulo={t('sanidad.rapido.rotulo')}
      titulo={t('sanidad.rapido.titulo')}
    >
      {contexto.cargando && <Cargando lineas={4} />}

      {!contexto.cargando && !puedeEditar && (
        <EstadoVacio
          icono="sanidad"
          titulo={t('sanidad.rapido.sinPermiso.titulo')}
          texto={t('sanidad.rapido.sinPermiso.texto')}
        />
      )}

      {!contexto.cargando && puedeEditar && (
        <form ref={formulario} className="alta-rapida" onSubmit={enviar} noValidate>
          <p className="cuerpo c-600">{t('sanidad.rapido.intro')}</p>

          {aviso && <Alerta variante="exito">{aviso}</Alerta>}
          {error && <Alerta variante="error">{error}</Alerta>}
          {opciones && opciones.productos.length === 0 && (
            <Alerta variante="adv">{t('sanidad.aplicaciones.formulario.sinProductos')}</Alerta>
          )}

          <CampoTexto
            etiqueta={t('sanidad.rapido.caravana')}
            placeholder={t('animales.altaRapida.identificadorEjemplo')}
            name="caravana"
            obligatorio
            movil
            mono
            autoFocus
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
            maxLength={50}
            value={caravana}
            onChange={(e) => cambiarCaravana(e.target.value)}
          />

          {/* El lugar del animal encontrado está siempre: así los productos no
              bajan justo cuando se va a elegir uno. */}
          <div className="alta-rapida__encontrado" role="status">
            {animal ? (
              <>
                <Icono nombre="exito" tamano={20} />
                <span className="dato">{animal.identificador}</span>
                <span className="cuerpo c-600">
                  {[animal.nombre, animal.categoria_codigo ? t(`animales.categorias.${animal.categoria_codigo}`) : null]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </>
            ) : (
              <span className="pie c-500">{t('sanidad.rapido.sinAnimal')}</span>
            )}
          </div>

          {opciones && opciones.productos.length > 0 && (
            <fieldset className="alta-rapida__grupo">
              <legend>{t('sanidad.rapido.producto')}</legend>
              <div className="alta-rapida__opciones">
                {opciones.productos.map((opcion) => (
                  <button
                    key={opcion.id}
                    type="button"
                    className="btn btn-secundario btn-movil alta-rapida__opcion"
                    aria-pressed={productoId === opcion.id}
                    onClick={() => setProductoId(opcion.id)}
                  >
                    {opcion.nombre}
                  </button>
                ))}
              </div>
              {/* También con su lugar fijo: aparece justo antes del toque final. */}
              <span className="pie c-500 alta-rapida__pista">
                {producto
                  ? t('sanidad.rapido.dosis', {
                      dosis: textoDosis(producto.dosis, producto.unidad) ?? t('sanidad.productos.sinDosis'),
                    })
                  : ''}
              </span>
            </fieldset>
          )}

          {registradas.length > 0 && (
            <Tarjeta
              titulo={t('sanidad.rapido.sesion.titulo')}
              accion={<span className="pie c-600">{tn('sanidad.rapido.sesion.cuantas', registradas.length)}</span>}
            >
              <ul className="alta-rapida__sesion">
                {registradas.map((registrada) => (
                  <li key={registrada.clave}>
                    <span className="fila g8">
                      <Icono nombre="exito" tamano={18} />
                      <span className="dato flex1">{registrada.identificador}</span>
                      <span className="pie c-600">{registrada.producto}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Tarjeta>
          )}

          {/* Siempre ocupa su lugar, aunque no diga nada: si apareciera y
              desapareciera, empujaría los botones justo cuando se van a tocar. */}
          <p className="pie c-500 alta-rapida__pista" aria-live="polite">
            {!animal && caravana.trim() === '' ? t('sanidad.rapido.faltaCaravana') : ''}
            {animal && !producto ? t('sanidad.rapido.faltaProducto') : ''}
          </p>

          <div className="alta-rapida__acciones">
            <Link className="btn btn-secundario btn-movil" to="/sanidad">
              {t('sanidad.rapido.terminar')}
            </Link>
            {animal ? (
              <Boton variante="primario" movil type="submit" disabled={!listo || ocupado}>
                <Icono nombre="sanidad" tamano={18} />
                {ocupado ? t('comun.guardando') : t('sanidad.rapido.registrar')}
              </Boton>
            ) : (
              <Boton variante="primario" movil type="submit" disabled={!caravana.trim() || ocupado}>
                {ocupado ? t('sanidad.rapido.buscando') : t('sanidad.rapido.buscar')}
              </Boton>
            )}
          </div>
        </form>
      )}
    </DisenoApp>
  );
}
