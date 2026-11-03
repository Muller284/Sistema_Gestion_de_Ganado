import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  Alerta,
  Boton,
  Cargando,
  CampoTexto,
  DisenoApp,
  EstadoVacio,
  Icono,
  Tarjeta,
} from '../../componentes';
import { api, type Animal, type Sexo } from '../../servicios/api';
import { t, tn } from '../../servicios/idioma';
import { nivel, useContextoGanado, usuarioDe } from '../ganado/contexto';

/**
 * HU-35 · Registro de animal desde el celular.
 *
 *   1. El formulario pide solo identificador, categoría y sexo. El tipo de
 *      identificador es caravana, que es lo que se tiene en la mano en el
 *      corral; el resto de la ficha se completa después desde la ficha.
 *   2. Todo lo tocable mide al menos 48 px: campos y botones usan el alto
 *      móvil del sistema de diseño (52 px) y las opciones son botones
 *      grandes, no listas desplegables.
 *   3. Las acciones principales van abajo, en una barra pegada al borde
 *      inferior (animal.css), donde llega el pulgar.
 *   4. Se encadenan altas: al registrar, el identificador se vacía y vuelve
 *      a tener el foco; la categoría y el sexo se quedan, porque en el corral
 *      se cargan tandas parecidas. Lo registrado en la tanda se ve debajo.
 *
 * La categoría ya dice el sexo en casi todos los casos (vaca, toro…), así
 * que al elegirla se marca el sexo que corresponde; se puede cambiar.
 *
 * El servidor es el mismo POST /animales de HU-27 y HU-28: mismas reglas
 * (identificador único en el rancho, categoría del catálogo, permiso de
 * edición en animales).
 */

const SEXO_DE_CATEGORIA: Record<string, Sexo> = {
  ternera: 'hembra',
  vaquilla: 'hembra',
  vaca: 'hembra',
  ternero: 'macho',
  torito: 'macho',
  novillo: 'macho',
  toro: 'macho',
  buey: 'macho',
};

const SEXOS: Sexo[] = ['hembra', 'macho'];

export function PaginaAltaRapida() {
  const contexto = useContextoGanado();
  const formulario = useRef<HTMLFormElement>(null);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [identificador, setIdentificador] = useState('');
  const [categoria, setCategoria] = useState('');
  const [sexo, setSexo] = useState<Sexo | ''>('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [registrados, setRegistrados] = useState<Animal[]>([]);

  useEffect(() => {
    let vigente = true;
    api
      .categoriasAnimal()
      .then((lista) => vigente && setCategorias(lista))
      .catch((err: Error) => vigente && setError(err.message));
    return () => {
      vigente = false;
    };
  }, []);

  const puedeEditar = nivel(contexto, 'animales') === 'editar';
  const listo = identificador.trim().length > 0 && Boolean(categoria) && Boolean(sexo);

  function elegirCategoria(codigo: string) {
    setCategoria(codigo);
    const sugerido = SEXO_DE_CATEGORIA[codigo];
    if (sugerido) setSexo(sugerido);
  }

  function enfocarIdentificador() {
    formulario.current?.querySelector<HTMLInputElement>('input[name="identificador"]')?.focus();
  }

  async function registrar(evento: FormEvent) {
    evento.preventDefault();
    if (!listo || enviando || !sexo) return;
    setEnviando(true);
    setError('');
    setAviso('');
    try {
      const respuesta = await api.crearAnimal({
        identificador: identificador.trim(),
        tipo_identificador: 'caravana',
        corral_id: null,
        nombre: null,
        raza: null,
        sexo,
        categoria_codigo: categoria,
        fecha_nacimiento: null,
        origen: null,
        peso_kg: null,
      });
      setRegistrados((previos) => [respuesta.animal, ...previos]);
      setAviso(`${respuesta.mensaje} ${t('animales.altaRapida.siguiente')}`);
      setIdentificador('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setEnviando(false);
      enfocarIdentificador();
    }
  }

  return (
    <DisenoApp
      activo="animales"
      ruta={[t('animales.titulo'), t('animales.altaRapida.boton')]}
      usuario={usuarioDe(contexto)}
      rancho={contexto.rancho?.rancho?.nombre ?? null}
      rotulo={t('animales.altaRapida.rotulo')}
      titulo={t('animales.altaRapida.titulo')}
    >
      {contexto.cargando && <Cargando lineas={4} />}

      {!contexto.cargando && !puedeEditar && (
        <EstadoVacio
          icono="animal"
          titulo={t('animales.altaRapida.sinPermiso.titulo')}
          texto={t('animales.altaRapida.sinPermiso.texto')}
        />
      )}

      {!contexto.cargando && puedeEditar && (
        <form ref={formulario} className="alta-rapida" onSubmit={registrar} noValidate>
          <p className="cuerpo c-600">{t('animales.altaRapida.intro')}</p>

          {aviso && <Alerta variante="exito">{aviso}</Alerta>}
          {error && <Alerta variante="error">{error}</Alerta>}

          <CampoTexto
            etiqueta={t('animales.altaRapida.identificador')}
            ayuda={t('animales.altaRapida.identificadorAyuda')}
            placeholder={t('animales.altaRapida.identificadorEjemplo')}
            name="identificador"
            obligatorio
            movil
            mono
            autoFocus
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="send"
            maxLength={50}
            value={identificador}
            onChange={(e) => setIdentificador(e.target.value)}
          />

          <fieldset className="alta-rapida__grupo">
            <legend>{t('animales.altaRapida.categoria')}</legend>
            <div className="alta-rapida__opciones">
              {categorias.map((codigo) => (
                <button
                  key={codigo}
                  type="button"
                  className="btn btn-secundario btn-movil alta-rapida__opcion"
                  aria-pressed={categoria === codigo}
                  onClick={() => elegirCategoria(codigo)}
                >
                  {t(`animales.categorias.${codigo}`)}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="alta-rapida__grupo">
            <legend>{t('animales.altaRapida.sexo')}</legend>
            <div className="alta-rapida__opciones">
              {SEXOS.map((opcion) => (
                <button
                  key={opcion}
                  type="button"
                  className="btn btn-secundario btn-movil alta-rapida__opcion"
                  aria-pressed={sexo === opcion}
                  onClick={() => setSexo(opcion)}
                >
                  {t(`animales.sexos.${opcion}`)}
                </button>
              ))}
            </div>
            <span className="pie c-500">{t('animales.altaRapida.sexoAyuda')}</span>
          </fieldset>

          {registrados.length > 0 && (
            <Tarjeta
              titulo={t('animales.altaRapida.sesion.titulo')}
              accion={<span className="pie c-600">{tn('animales.altaRapida.sesion.cuantos', registrados.length)}</span>}
            >
              <ul className="alta-rapida__sesion">
                {registrados.map((animal) => (
                  <li key={animal.id}>
                    <Link to={`/animales/${animal.id}`}>
                      <Icono nombre="exito" tamano={18} />
                      <span className="dato flex1">{animal.identificador}</span>
                      <span className="pie c-600">
                        {animal.categoria_codigo ? t(`animales.categorias.${animal.categoria_codigo}`) : ''}
                        {' · '}
                        {t(`animales.sexos.${animal.sexo}`)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Tarjeta>
          )}

          {!listo && <p className="pie c-500">{t('animales.altaRapida.faltan')}</p>}

          <div className="alta-rapida__acciones">
            <Link className="btn btn-secundario btn-movil" to="/animales">
              {t('animales.altaRapida.terminar')}
            </Link>
            <Boton variante="primario" movil type="submit" disabled={!listo || enviando}>
              <Icono nombre="mas" tamano={18} />
              {enviando ? t('animales.altaRapida.registrando') : t('animales.altaRapida.registrar')}
            </Boton>
          </div>
        </form>
      )}
    </DisenoApp>
  );
}
