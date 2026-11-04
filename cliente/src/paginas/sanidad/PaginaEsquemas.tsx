import { useEffect, useState, type FormEvent } from 'react';
import {
  Alerta,
  Boton,
  Cargando,
  CampoLista,
  CampoTexto,
  DisenoApp,
  EstadoVacio,
  Icono,
  Tarjeta,
} from '../../componentes';
import {
  api,
  type EsquemaVacunacion,
  type ListaEsquemas,
  type ReglaCategoria,
  type Sexo,
} from '../../servicios/api';
import { t, tn } from '../../servicios/idioma';
import {
  aDatosEsquema,
  categoriasDelSexo,
  formularioDe,
  problemaEsquema,
  resumenDosis,
  resumenPublico,
  type FormularioEsquema,
} from '../../servicios/sanidad';
import { conTransicion } from '../../servicios/transicion';
import { nivel, useContextoGanado, usuarioDe } from '../ganado/contexto';
import { PestanasSanidad } from './PestanasSanidad';

/**
 * HU-47 · Esquemas de vacunación.
 *
 *   1. Un esquema dice qué producto, a qué animales (categorías, sexo y rango
 *      de edad), cuántas dosis, cada cuántos días y si tiene refuerzo.
 *   2. Solo se eligen productos del catálogo del rancho (HU-46).
 *   3. Cambiar un esquema no toca las aplicaciones ya registradas; darlo de
 *      baja lo saca del calendario y su historial queda.
 *
 * Edita quien tiene «editar» en sanidad (el veterinario, por ejemplo); el
 * socio ve los esquemas sin botones.
 */

const NUEVO = 'nuevo';
const SEXOS: Sexo[] = ['macho', 'hembra'];

export function PaginaEsquemas() {
  const contexto = useContextoGanado();
  const [lista, setLista] = useState<ListaEsquemas | null>(null);
  const [reglas, setReglas] = useState<ReglaCategoria[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [editando, setEditando] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const puedeEditar = nivel(contexto, 'sanidad') === 'editar';

  useEffect(() => {
    let vigente = true;
    api
      .esquemasVacunacion()
      .then((respuesta) => vigente && setLista(respuesta))
      .catch((err: Error) => vigente && setError(err.message))
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [version]);

  // Para no ofrecer «vaca» en un esquema solo para machos.
  useEffect(() => {
    let vigente = true;
    api
      .reglasCategorias()
      .then((respuesta) => vigente && setReglas(respuesta))
      .catch(() => undefined);
    return () => {
      vigente = false;
    };
  }, []);

  function abrir(id: string | null) {
    conTransicion(() => {
      setEditando(id);
      setConfirmando(null);
      setError('');
    });
  }

  function alGuardar(mensaje: string) {
    setAviso(mensaje);
    abrir(null);
    setVersion((previa) => previa + 1);
  }

  async function darDeBaja(esquema: EsquemaVacunacion) {
    setOcupado(esquema.id);
    setError('');
    setAviso('');
    try {
      const respuesta = await api.bajaEsquema(esquema.id);
      setAviso(respuesta.mensaje);
      setConfirmando(null);
      setVersion((previa) => previa + 1);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setOcupado(null);
    }
  }

  const esquemas = lista?.esquemas ?? [];
  const sinProductos = lista !== null && lista.productos.length === 0;

  return (
    <DisenoApp
      activo="sanidad"
      ruta={[t('app.modulos.inicio'), t('sanidad.titulo')]}
      usuario={usuarioDe(contexto)}
      rancho={contexto.rancho?.rancho?.nombre ?? null}
      rotulo={t('sanidad.rotulo')}
      titulo={t('sanidad.pestanas.esquemas')}
      acciones={
        puedeEditar &&
        editando === null &&
        !sinProductos && (
          <Boton variante="primario" onClick={() => abrir(NUEVO)}>
            <Icono nombre="mas" tamano={18} />
            {t('sanidad.esquemas.nuevo')}
          </Boton>
        )
      }
    >
      <div className="col g24">
        <PestanasSanidad />
        {(cargando || contexto.cargando) && <Cargando lineas={4} />}
        {error && <Alerta variante="error">{error}</Alerta>}
        {contexto.error && <Alerta variante="error">{contexto.error}</Alerta>}
        {aviso && <Alerta variante="exito">{aviso}</Alerta>}
        {!contexto.cargando && !puedeEditar && !error && (
          <Alerta variante="info">{t('sanidad.soloConsulta')}</Alerta>
        )}
        {puedeEditar && sinProductos && <Alerta variante="adv">{t('sanidad.esquemas.sinProductos')}</Alerta>}

        {editando === NUEVO && lista && (
          <FormularioEsquemaVacunacion
            lista={lista}
            reglas={reglas}
            alGuardar={alGuardar}
            alCancelar={() => abrir(null)}
          />
        )}

        {lista && esquemas.length === 0 && editando !== NUEVO && (
          <EstadoVacio
            icono="sanidad"
            titulo={t('sanidad.esquemas.vacio.titulo')}
            texto={puedeEditar ? t('sanidad.esquemas.vacio.texto') : t('sanidad.esquemas.vacio.textoConsulta')}
          />
        )}

        {esquemas.length > 0 && (
          <Tarjeta>
            <ul className="ganado__lista">
              {esquemas.map((esquema) =>
                editando === esquema.id && lista ? (
                  <li key={esquema.id} className="ganado__fila">
                    <FormularioEsquemaVacunacion
                      esquema={esquema}
                      lista={lista}
                      reglas={reglas}
                      alGuardar={alGuardar}
                      alCancelar={() => abrir(null)}
                    />
                  </li>
                ) : (
                  <li key={esquema.id} className="ganado__fila">
                    <div className="ganado__principal">
                      <span className="cuerpo-m">{esquema.nombre}</span>
                      <span className="pie c-500">{esquema.producto_nombre}</span>
                    </div>
                    <div className="sanidad__esquema">
                      <span className="pie c-600">{resumenPublico(esquema)}</span>
                      <span className="pie c-600">{resumenDosis(esquema)}</span>
                    </div>
                    <span className="ganado__dato">{tn('sanidad.esquemas.animales', esquema.animales)}</span>
                    {puedeEditar && editando === null && (
                      <div className="ganado__acciones">
                        {confirmando === esquema.id ? (
                          <>
                            <span className="pie c-600">
                              {t('sanidad.esquemas.confirmarBaja', { nombre: esquema.nombre })}
                            </span>
                            <Boton
                              variante="secundario"
                              onClick={() => setConfirmando(null)}
                              disabled={ocupado === esquema.id}
                            >
                              {t('comun.cancelar')}
                            </Boton>
                            <Boton
                              variante="destructivo"
                              onClick={() => darDeBaja(esquema)}
                              disabled={ocupado === esquema.id}
                            >
                              {t('sanidad.esquemas.darDeBaja')}
                            </Boton>
                          </>
                        ) : (
                          <>
                            <Boton variante="fantasma" onClick={() => abrir(esquema.id)}>
                              <Icono nombre="lapiz" tamano={16} />
                              {t('sanidad.esquemas.editar')}
                            </Boton>
                            <Boton variante="fantasma" onClick={() => setConfirmando(esquema.id)}>
                              <Icono nombre="archivar" tamano={16} />
                              {t('sanidad.esquemas.darDeBaja')}
                            </Boton>
                          </>
                        )}
                      </div>
                    )}
                  </li>
                ),
              )}
            </ul>
          </Tarjeta>
        )}
      </div>
    </DisenoApp>
  );
}

interface PropiedadesFormulario {
  esquema?: EsquemaVacunacion;
  lista: ListaEsquemas;
  reglas: ReglaCategoria[];
  alGuardar: (mensaje: string) => void;
  alCancelar: () => void;
}

export function FormularioEsquemaVacunacion({ esquema, lista, reglas, alGuardar, alCancelar }: PropiedadesFormulario) {
  const [formulario, setFormulario] = useState<FormularioEsquema>(() => formularioDe(esquema));
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const problema = problemaEsquema(formulario);
  const categorias = categoriasDelSexo(lista.categorias, reglas, formulario.sexo);
  const variasDosis = Number(formulario.dosis) > 1;

  function cambiar<K extends keyof FormularioEsquema>(clave: K, valor: FormularioEsquema[K]) {
    setFormulario((previo) => ({ ...previo, [clave]: valor }));
  }

  /** Al elegir un sexo se desmarcan las categorías del otro. */
  function cambiarSexo(sexo: Sexo | '') {
    setFormulario((previo) => ({
      ...previo,
      sexo,
      categorias: previo.categorias.filter((c) => categoriasDelSexo([c], reglas, sexo).length > 0),
    }));
  }

  function alternarCategoria(codigo: string) {
    setFormulario((previo) => ({
      ...previo,
      categorias: previo.categorias.includes(codigo)
        ? previo.categorias.filter((c) => c !== codigo)
        : [...previo.categorias, codigo],
    }));
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (problema) return;
    setEnviando(true);
    setError('');
    try {
      const datos = aDatosEsquema(formulario);
      const respuesta = esquema ? await api.actualizarEsquema(esquema.id, datos) : await api.crearEsquema(datos);
      alGuardar(respuesta.mensaje);
    } catch (err) {
      setError((err as Error).message);
      setEnviando(false);
    }
  }

  const completo = formulario.nombre.trim() !== '' && formulario.producto_id !== '' && formulario.dosis !== '';

  return (
    <form className="col g16 flex1" onSubmit={enviar} noValidate>
      <Tarjeta
        titulo={
          esquema
            ? t('sanidad.esquemas.formulario.editar', { nombre: esquema.nombre })
            : t('sanidad.esquemas.formulario.nuevo')
        }
        pie={
          <div className="fila g8">
            <Boton variante="secundario" onClick={alCancelar} disabled={enviando}>
              {t('comun.cancelar')}
            </Boton>
            <Boton variante="primario" type="submit" disabled={enviando || !completo || problema !== null}>
              {enviando ? t('comun.guardando') : t('comun.guardar')}
            </Boton>
          </div>
        }
      >
        <div className="col g16">
          {error && <Alerta variante="error">{error}</Alerta>}
          {esquema && <Alerta variante="info">{t('sanidad.esquemas.formulario.avisoCambio')}</Alerta>}
          <div className="par">
            <CampoTexto
              etiqueta={t('sanidad.esquemas.formulario.nombre')}
              obligatorio
              maxLength={120}
              placeholder={t('sanidad.esquemas.formulario.nombreEjemplo')}
              value={formulario.nombre}
              onChange={(e) => cambiar('nombre', e.target.value)}
            />
            <CampoLista
              etiqueta={t('sanidad.esquemas.formulario.producto')}
              obligatorio
              value={formulario.producto_id}
              onChange={(e) => cambiar('producto_id', e.target.value)}
            >
              <option value="">{t('sanidad.esquemas.formulario.elegirProducto')}</option>
              {lista.productos.map((producto) => (
                <option key={producto.id} value={producto.id}>
                  {producto.nombre}
                </option>
              ))}
            </CampoLista>
          </div>

          <CampoLista
            etiqueta={t('sanidad.esquemas.formulario.sexo')}
            value={formulario.sexo}
            onChange={(e) => cambiarSexo(e.target.value as Sexo | '')}
          >
            <option value="">{t('sanidad.esquemas.formulario.ambos')}</option>
            {SEXOS.map((sexo) => (
              <option key={sexo} value={sexo}>
                {t(`animales.sexos.${sexo}`)}
              </option>
            ))}
          </CampoLista>

          <fieldset className="sanidad__categorias">
            <legend className="etiqueta c-700">{t('sanidad.esquemas.formulario.categorias')}</legend>
            <div className="ganado__casillas">
              {categorias.map((codigo) => (
                <label key={codigo}>
                  <input
                    type="checkbox"
                    checked={formulario.categorias.includes(codigo)}
                    onChange={() => alternarCategoria(codigo)}
                  />
                  {t(`animales.categorias.${codigo}`)}
                </label>
              ))}
            </div>
            <span className="pie c-500">{t('sanidad.esquemas.formulario.categoriasAyuda')}</span>
          </fieldset>

          <div className="par">
            <CampoTexto
              etiqueta={t('sanidad.esquemas.formulario.edadMinima')}
              ayuda={t('sanidad.esquemas.formulario.edadMinimaAyuda')}
              type="number"
              min={0}
              max={360}
              step={1}
              inputMode="numeric"
              value={formulario.edad_minima_meses}
              onChange={(e) => cambiar('edad_minima_meses', e.target.value)}
            />
            <CampoTexto
              etiqueta={t('sanidad.esquemas.formulario.edadMaxima')}
              ayuda={t('sanidad.esquemas.formulario.edadMaximaAyuda')}
              error={problema === 'edadesCruzadas' ? t('sanidad.esquemas.formulario.edadesCruzadas') : undefined}
              type="number"
              min={0}
              max={360}
              step={1}
              inputMode="numeric"
              value={formulario.edad_maxima_meses}
              onChange={(e) => cambiar('edad_maxima_meses', e.target.value)}
            />
          </div>

          <div className="par">
            <CampoTexto
              etiqueta={t('sanidad.esquemas.formulario.dosis')}
              obligatorio
              type="number"
              min={1}
              max={10}
              step={1}
              inputMode="numeric"
              value={formulario.dosis}
              onChange={(e) => cambiar('dosis', e.target.value)}
            />
            {variasDosis && (
              <CampoTexto
                etiqueta={t('sanidad.esquemas.formulario.intervalo')}
                obligatorio
                ayuda={t('sanidad.esquemas.formulario.intervaloAyuda')}
                error={problema === 'faltaIntervalo' ? t('sanidad.esquemas.formulario.faltaIntervalo') : undefined}
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                value={formulario.intervalo_dias}
                onChange={(e) => cambiar('intervalo_dias', e.target.value)}
              />
            )}
          </div>

          <CampoTexto
            etiqueta={t('sanidad.esquemas.formulario.refuerzo')}
            ayuda={t('sanidad.esquemas.formulario.refuerzoAyuda')}
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            value={formulario.refuerzo_dias}
            onChange={(e) => cambiar('refuerzo_dias', e.target.value)}
          />
        </div>
      </Tarjeta>
    </form>
  );
}
