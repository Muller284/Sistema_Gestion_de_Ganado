import { useEffect, useState, type FormEvent } from 'react';
import { Alerta, Boton, CampoBuscador, CampoLista, CampoTexto, Tarjeta } from '../../componentes';
import {
  api,
  type Animal,
  type Corral,
  type DatosFichaAnimal,
  type Origen,
  type Raza,
  type ReglaCategoria,
  type Sexo,
  type TipoIdentificador,
} from '../../servicios/api';
import { t } from '../../servicios/idioma';
import { categoriasPermitidas } from '../../servicios/categorias';
import { buscarRazas, esRazaNueva, razaAGuardar } from '../../servicios/razas';
import { hoyEn, pesoAGuardar, pesoAMostrar, type Regional } from '../../servicios/unidades';

/**
 * HU-28 · Datos de la ficha del animal: raza, sexo, categoría, fecha de
 * nacimiento, origen y corral.
 *
 *   1. El corral es opcional (y solo se elige al registrar: después cambia
 *      con un movimiento, HU-39).
 *   2. La categoría se elige de un catálogo, no se escribe libre. Es
 *      obligatoria: es con lo que se cuenta el hato.
 *   3. La fecha de nacimiento no puede ser futura (el campo no la deja y el
 *      servidor la rechaza igual).
 *
 * HU-26: el peso se escribe en la unidad del país y viaja en kilos.
 * La raza se busca escribiendo en una lista (catálogo mundial más las
 * propias del rancho); si lo escrito no está, se guarda como raza nueva y
 * queda en la lista del rancho (pedido del docente).
 * La categoría solo ofrece las que corresponden al sexo y a la edad que da la
 * fecha de nacimiento: si nació hoy no puede ser vaca ni toro (pedido del
 * docente). Las reglas las manda el servidor, que lo vuelve a controlar.
 */

const TIPOS: TipoIdentificador[] = ['caravana', 'interno', 'rfid'];
const SEXOS: Sexo[] = ['hembra', 'macho'];
const ORIGENES: Origen[] = ['nacido', 'comprado', 'otro'];

export type DatosAlta = DatosFichaAnimal & {
  identificador: string;
  tipo_identificador: TipoIdentificador;
  corral_id: string | null;
};

interface Propiedades {
  /** Sin animal es un alta; con animal, se edita su ficha. */
  animal?: Animal;
  regional: Regional;
  alGuardar: (animal: Animal, mensaje: string) => void;
  alCancelar: () => void;
}

export function FormularioFicha({ animal, regional, alGuardar, alCancelar }: Propiedades) {
  const [categorias, setCategorias] = useState<string[]>([]);
  const [reglas, setReglas] = useState<ReglaCategoria[]>([]);
  const [corrales, setCorrales] = useState<Corral[]>([]);
  const [identificador, setIdentificador] = useState('');
  const [tipo, setTipo] = useState<TipoIdentificador>('caravana');
  const [nombre, setNombre] = useState(animal?.nombre ?? '');
  const [razas, setRazas] = useState<Raza[]>([]);
  const [raza, setRaza] = useState(animal?.raza ?? '');
  const [sexo, setSexo] = useState<Sexo | ''>(animal?.sexo ?? '');
  const [categoria, setCategoria] = useState(animal?.categoria_codigo ?? '');
  const [nacimiento, setNacimiento] = useState(animal?.fecha_nacimiento ?? '');
  const [origen, setOrigen] = useState<Origen | ''>(animal?.origen ?? '');
  const [peso, setPeso] = useState(
    animal?.peso_kg ? String(Math.round(pesoAMostrar(animal.peso_kg, regional.peso) * 10) / 10) : '',
  );
  const [corral, setCorral] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let vigente = true;
    api
      .categoriasAnimal()
      .then((lista) => vigente && setCategorias(lista))
      .catch((err: Error) => vigente && setError(err.message));
    api
      .razas()
      .then((lista) => vigente && setRazas(lista))
      .catch(() => undefined);
    api
      .reglasCategorias()
      .then((lista) => vigente && setReglas(lista))
      .catch(() => undefined);
    // Los corrales solo hacen falta en el alta. Si no los puede ver, se carga sin corral.
    if (!animal) {
      api
        .corrales()
        .then((lista) => vigente && setCorrales(lista))
        .catch(() => undefined);
    }
    return () => {
      vigente = false;
    };
  }, [animal]);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (!sexo || !categoria) return;
    setEnviando(true);
    setError('');
    const ficha: DatosFichaAnimal = {
      nombre: nombre || null,
      raza: razaAGuardar(razas, raza),
      sexo,
      categoria_codigo: categoria,
      fecha_nacimiento: nacimiento || null,
      origen: origen || null,
      peso_kg: peso === '' ? null : pesoAGuardar(Number(peso), regional.peso),
    };
    try {
      const respuesta = animal
        ? await api.actualizarAnimal(animal.id, ficha)
        : await api.crearAnimal({
            ...ficha,
            identificador,
            tipo_identificador: tipo,
            corral_id: corral || null,
          });
      alGuardar(respuesta.animal, respuesta.mensaje);
    } catch (err) {
      setError((err as Error).message);
      setEnviando(false);
    }
  }

  const hoy = hoyEn(regional);
  const permitidas = categoriasPermitidas(categorias, reglas, sexo, nacimiento, hoy);
  // Una categoría guardada antes de esta regla puede no corresponder: se ve, con su error.
  const categoriaInvalida = Boolean(categoria) && reglas.length > 0 && !permitidas.includes(categoria);
  const opcionesCategoria = categoriaInvalida ? [categoria, ...permitidas] : permitidas;

  /** Si al cambiar el sexo o la fecha la categoría deja de corresponder, se vacía. */
  function revisarCategoria(nuevoSexo: string, nuevaFecha: string) {
    if (categoria && reglas.length > 0) {
      const nuevas = categoriasPermitidas(categorias, reglas, nuevoSexo, nuevaFecha, hoy);
      if (!nuevas.includes(categoria)) setCategoria('');
    }
  }

  const listo = Boolean(sexo) && Boolean(categoria) && (animal || identificador.trim()) && !categoriaInvalida;

  return (
    <form onSubmit={enviar} noValidate>
      <Tarjeta
        titulo={animal ? t('animales.formulario.editar', { identificador: animal.identificador }) : t('animales.formulario.nuevo')}
        pie={
          <div className="fila g8">
            <Boton variante="secundario" onClick={alCancelar} disabled={enviando}>
              {t('comun.cancelar')}
            </Boton>
            <Boton variante="primario" type="submit" disabled={enviando || !listo}>
              {enviando ? t('comun.guardando') : t('comun.guardar')}
            </Boton>
          </div>
        }
      >
        <div className="col g16">
          {error && <Alerta variante="error">{error}</Alerta>}

          {!animal && (
            <div className="par">
              <CampoTexto
                etiqueta={t('animales.campos.identificador')}
                obligatorio
                mono
                maxLength={50}
                placeholder={t('animales.campos.identificadorEjemplo')}
                value={identificador}
                onChange={(e) => setIdentificador(e.target.value)}
              />
              <CampoLista
                etiqueta={t('animales.campos.tipoIdentificador')}
                value={tipo}
                onChange={(e) => setTipo(e.target.value as TipoIdentificador)}
              >
                {TIPOS.map((opcion) => (
                  <option key={opcion} value={opcion}>
                    {t(`animales.tiposIdentificador.${opcion}`)}
                  </option>
                ))}
              </CampoLista>
            </div>
          )}

          <div className="par">
            <CampoTexto
              etiqueta={t('animales.campos.nombre')}
              maxLength={100}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
            <CampoBuscador
              etiqueta={t('animales.campos.raza')}
              placeholder={t('animales.campos.razaBuscar')}
              ayuda={esRazaNueva(razas, raza) ? t('animales.campos.razaNuevaAyuda') : undefined}
              maxLength={100}
              value={raza}
              onChange={setRaza}
              grupos={buscarRazas(razas, raza).map(({ grupo, razas: delGrupo }) => ({
                titulo: t(`animales.gruposRaza.${grupo}`),
                opciones: delGrupo,
              }))}
              opcionNueva={
                esRazaNueva(razas, raza) ? t('animales.campos.razaAgregar', { raza: raza.trim() }) : undefined
              }
              sinResultados={t('animales.campos.razaSinResultados')}
            />
          </div>

          <div className="par">
            <CampoLista
              etiqueta={t('animales.campos.sexo')}
              obligatorio
              value={sexo}
              onChange={(e) => {
                setSexo(e.target.value as Sexo);
                revisarCategoria(e.target.value, nacimiento);
              }}
            >
              <option value="">{t('animales.campos.elegir')}</option>
              {SEXOS.map((opcion) => (
                <option key={opcion} value={opcion}>
                  {t(`animales.sexos.${opcion}`)}
                </option>
              ))}
            </CampoLista>
            {/* Criterio 2: de un catálogo, filtrado por sexo y edad. */}
            <CampoLista
              etiqueta={t('animales.campos.categoria')}
              obligatorio
              ayuda={sexo || nacimiento ? t('animales.campos.categoriaFiltrada') : undefined}
              error={categoriaInvalida ? t('animales.campos.categoriaNoCorresponde') : undefined}
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
            >
              <option value="">{t('animales.campos.elegir')}</option>
              {opcionesCategoria.map((codigo) => (
                <option key={codigo} value={codigo}>
                  {t(`animales.categorias.${codigo}`)}
                </option>
              ))}
            </CampoLista>
          </div>

          <div className="par">
            {/* Criterio 3: nada después de hoy, en la zona del país (HU-26). */}
            <CampoTexto
              etiqueta={t('animales.campos.nacimiento')}
              type="date"
              max={hoyEn(regional)}
              value={nacimiento}
              onChange={(e) => {
                setNacimiento(e.target.value);
                revisarCategoria(sexo, e.target.value);
              }}
            />
            <CampoLista
              etiqueta={t('animales.campos.origen')}
              value={origen}
              onChange={(e) => setOrigen(e.target.value as Origen)}
            >
              <option value="">{t('animales.campos.sinOrigen')}</option>
              {ORIGENES.map((opcion) => (
                <option key={opcion} value={opcion}>
                  {t(`animales.origenes.${opcion}`)}
                </option>
              ))}
            </CampoLista>
          </div>

          <div className="par">
            <CampoTexto
              etiqueta={t('animales.campos.peso', { unidad: t(`unidades.peso.${regional.peso}`) })}
              type="number"
              min={0}
              step="any"
              inputMode="decimal"
              value={peso}
              onChange={(e) => setPeso(e.target.value)}
            />
            {/* Criterio 1: opcional, porque los animales se cargan antes que los corrales. */}
            {!animal && (
              <CampoLista
                etiqueta={t('animales.campos.corral')}
                ayuda={t('animales.campos.corralAyuda')}
                value={corral}
                onChange={(e) => setCorral(e.target.value)}
              >
                <option value="">{t('animales.sinCorral')}</option>
                {corrales.map((opcion) => (
                  <option key={opcion.id} value={opcion.id}>
                    {opcion.nombre}
                  </option>
                ))}
              </CampoLista>
            )}
          </div>
        </div>
      </Tarjeta>
    </form>
  );
}
