import { useEffect, useState, type FormEvent } from 'react';
import { Alerta, Boton, Cargando, CampoLista, CampoTexto, EstadoVacio, Icono, Insignia, Tarjeta } from '../../componentes';
import { api, type AplicacionSanitaria, type Animal, type OpcionesAplicacion } from '../../servicios/api';
import {
  aDatosAplicacion,
  conProducto,
  detalleAplicacion,
  esquemasDelProducto,
  formularioAplicacion,
  problemaAplicacion,
  type FormularioAplicacion,
} from '../../servicios/aplicaciones';
import { t } from '../../servicios/idioma';
import { formatoFecha, formatoMomento, type Regional } from '../../servicios/unidades';

/**
 * HU-48 · La pestaña Sanidad de la ficha del animal.
 *
 *   1. Se registra el producto, la fecha (no futura), la dosis y, si
 *      corresponde, a qué dosis del esquema equivale. Al elegir el producto,
 *      la dosis sugerida es la del catálogo (HU-46).
 *   2. Queda quién la aplicó: por defecto quien la registra, o la persona del
 *      rancho que se elija.
 *   3. Las aplicaciones se listan acá; el historial de la ficha las suma a su
 *      línea de tiempo (historial.ts).
 *   4. En un animal dado de baja no se registra: el formulario no aparece.
 *
 * Las aplicaciones las pide la ficha (solo si quien entra ve sanidad), así
 * el historial y esta pestaña usan la misma lista.
 */

interface Propiedades {
  animal: Animal;
  aplicaciones: AplicacionSanitaria[] | null;
  error: string;
  regional: Regional;
  puedeEditar: boolean;
  /** Quien registra: es quien la aplicó si no se elige otra persona. */
  quienId: string;
  alRegistrar: (mensaje: string) => void;
}

export function PestanaSanidad({ animal, aplicaciones, error, regional, puedeEditar, quienId, alRegistrar }: Propiedades) {
  const [registrando, setRegistrando] = useState(false);
  const dadoDeBaja = Boolean(animal.eliminado_en);

  return (
    <div className="col g16">
      {puedeEditar && !dadoDeBaja && !registrando && (
        <div className="fila g8">
          <Boton variante="primario" onClick={() => setRegistrando(true)}>
            <Icono nombre="mas" tamano={18} />
            {t('sanidad.aplicaciones.registrar')}
          </Boton>
        </div>
      )}
      {puedeEditar && dadoDeBaja && <Alerta variante="info">{t('sanidad.aplicaciones.dadoDeBaja')}</Alerta>}

      {registrando && (
        <FormularioAplicacionSanitaria
          animal={animal}
          quienId={quienId}
          alGuardar={(mensaje) => {
            setRegistrando(false);
            alRegistrar(mensaje);
          }}
          alCancelar={() => setRegistrando(false)}
        />
      )}

      <Tarjeta titulo={t('animales.ficha.pestanas.sanidad')}>
        {error && <Alerta variante="error">{error}</Alerta>}
        {!error && aplicaciones === null && <Cargando lineas={3} />}
        {aplicaciones?.length === 0 && (
          <EstadoVacio
            icono="sanidad"
            titulo={t('sanidad.aplicaciones.vacio.titulo')}
            texto={t('sanidad.aplicaciones.vacio.texto')}
          />
        )}
        {aplicaciones && aplicaciones.length > 0 && (
          <ul className="ganado__lista">
            {aplicaciones.map((aplicacion) => (
              <li key={aplicacion.id} className="ganado__fila">
                <div className="ganado__principal">
                  <span className="cuerpo-m">
                    {aplicacion.producto_nombre}{' '}
                    {aplicacion.producto_dado_de_baja && (
                      <Insignia variante="archivado">{t('sanidad.aplicaciones.productoDeBaja')}</Insignia>
                    )}
                  </span>
                  <span className="pie c-500">{detalleAplicacion(aplicacion)}</span>
                  {aplicacion.observacion && <span className="pie c-600">«{aplicacion.observacion}»</span>}
                </div>
                <div className="col g4">
                  <span className="ganado__dato">{formatoFecha(aplicacion.fecha, regional)}</span>
                  <span className="pie c-500">
                    {t('sanidad.aplicaciones.aplicadaPor', {
                      nombre: aplicacion.aplicado_por_nombre ?? t('animales.ficha.autoria.sistema'),
                    })}
                  </span>
                  <span className="pie c-500">
                    {t('animales.ficha.historial.quienCuando', {
                      nombre: aplicacion.registrado_por ?? t('animales.ficha.autoria.sistema'),
                      momento: formatoMomento(aplicacion.creado_en, regional),
                    })}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>
    </div>
  );
}

interface PropiedadesFormulario {
  animal: Animal;
  quienId: string;
  alGuardar: (mensaje: string) => void;
  alCancelar: () => void;
}

export function FormularioAplicacionSanitaria({ animal, quienId, alGuardar, alCancelar }: PropiedadesFormulario) {
  const [opciones, setOpciones] = useState<OpcionesAplicacion | null>(null);
  const [formulario, setFormulario] = useState<FormularioAplicacion | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let vigente = true;
    api
      .opcionesAplicacion()
      .then((respuesta) => {
        if (!vigente) return;
        setOpciones(respuesta);
        setFormulario(formularioAplicacion(respuesta.hoy, quienId));
      })
      .catch((err: Error) => vigente && setError(err.message));
    return () => {
      vigente = false;
    };
  }, [quienId]);

  function cambiar<K extends keyof FormularioAplicacion>(clave: K, valor: FormularioAplicacion[K]) {
    setFormulario((previo) => (previo ? { ...previo, [clave]: valor } : previo));
  }

  const problema = formulario && opciones ? problemaAplicacion(formulario, opciones.hoy, animal.fecha_nacimiento) : null;
  const completo = Boolean(formulario?.producto_id && formulario.fecha);
  const esquemas = formulario && opciones ? esquemasDelProducto(opciones.esquemas, formulario.producto_id) : [];
  const esquema = esquemas.find((e) => e.id === formulario?.esquema_id);
  const unidad = opciones?.productos.find((p) => p.id === formulario?.producto_id)?.unidad ?? null;
  // Quien registra va primero; si no es del rancho (el Admin en soporte), igual se ofrece.
  const integrantes = opciones
    ? [
        ...opciones.integrantes.filter((p) => p.id === quienId),
        ...opciones.integrantes.filter((p) => p.id !== quienId),
      ]
    : [];

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (!formulario || problema || !completo) return;
    setEnviando(true);
    setError('');
    try {
      const respuesta = await api.registrarAplicacion(animal.id, aDatosAplicacion(formulario));
      alGuardar(respuesta.mensaje);
    } catch (err) {
      setError((err as Error).message);
      setEnviando(false);
    }
  }

  return (
    <form className="col g16" onSubmit={enviar} noValidate>
      <Tarjeta
        titulo={t('sanidad.aplicaciones.formulario.titulo', { identificador: animal.identificador })}
        pie={
          <div className="fila g8">
            <Boton variante="secundario" onClick={alCancelar} disabled={enviando}>
              {t('comun.cancelar')}
            </Boton>
            <Boton variante="primario" type="submit" disabled={enviando || !completo || problema !== null}>
              {enviando ? t('comun.guardando') : t('sanidad.aplicaciones.formulario.guardar')}
            </Boton>
          </div>
        }
      >
        <div className="col g16">
          {error && <Alerta variante="error">{error}</Alerta>}
          {!formulario && !error && <Cargando lineas={3} />}
          {opciones && opciones.productos.length === 0 && (
            <Alerta variante="adv">{t('sanidad.aplicaciones.formulario.sinProductos')}</Alerta>
          )}

          {formulario && opciones && (
            <>
              <div className="par">
                <CampoLista
                  etiqueta={t('sanidad.aplicaciones.formulario.producto')}
                  obligatorio
                  value={formulario.producto_id}
                  onChange={(e) => setFormulario(conProducto(formulario, e.target.value, opciones))}
                >
                  <option value="">{t('sanidad.esquemas.formulario.elegirProducto')}</option>
                  {opciones.productos.map((producto) => (
                    <option key={producto.id} value={producto.id}>
                      {producto.nombre}
                    </option>
                  ))}
                </CampoLista>
                <CampoTexto
                  etiqueta={t('sanidad.aplicaciones.formulario.fecha')}
                  obligatorio
                  type="date"
                  max={opciones.hoy}
                  min={animal.fecha_nacimiento ?? undefined}
                  error={problema === 'fechaFutura' || problema === 'antesDeNacer'
                    ? t(`sanidad.aplicaciones.formulario.${problema}`)
                    : undefined}
                  value={formulario.fecha}
                  onChange={(e) => cambiar('fecha', e.target.value)}
                />
              </div>

              <div className="par">
                <CampoTexto
                  etiqueta={
                    unidad
                      ? t('sanidad.aplicaciones.formulario.dosisCon', { unidad: t(`sanidad.productos.unidadesNombre.${unidad}`) })
                      : t('sanidad.aplicaciones.formulario.dosis')
                  }
                  ayuda={t('sanidad.aplicaciones.formulario.dosisAyuda')}
                  error={problema === 'dosisInvalida' ? t('sanidad.productos.formulario.dosisInvalida') : undefined}
                  inputMode="decimal"
                  value={formulario.dosis}
                  onChange={(e) => cambiar('dosis', e.target.value)}
                />
                <CampoLista
                  etiqueta={t('sanidad.aplicaciones.formulario.aplicadoPor')}
                  value={formulario.aplicado_por}
                  onChange={(e) => cambiar('aplicado_por', e.target.value)}
                >
                  {!integrantes.some((p) => p.id === quienId) && (
                    <option value={quienId}>{t('sanidad.aplicaciones.formulario.yo')}</option>
                  )}
                  {integrantes.map((persona) => (
                    <option key={persona.id} value={persona.id}>
                      {persona.id === quienId
                        ? t('sanidad.aplicaciones.formulario.yoConNombre', { nombre: persona.nombre })
                        : persona.nombre}
                    </option>
                  ))}
                </CampoLista>
              </div>

              {esquemas.length > 0 && (
                <div className="par">
                  <CampoLista
                    etiqueta={t('sanidad.aplicaciones.formulario.esquema')}
                    ayuda={t('sanidad.aplicaciones.formulario.esquemaAyuda')}
                    value={formulario.esquema_id}
                    onChange={(e) =>
                      setFormulario({ ...formulario, esquema_id: e.target.value, numero_dosis: e.target.value ? '1' : '' })
                    }
                  >
                    <option value="">{t('sanidad.aplicaciones.formulario.sinEsquema')}</option>
                    {esquemas.map((opcion) => (
                      <option key={opcion.id} value={opcion.id}>
                        {opcion.nombre}
                      </option>
                    ))}
                  </CampoLista>
                  {esquema && (
                    <CampoLista
                      etiqueta={t('sanidad.aplicaciones.formulario.numeroDosis')}
                      value={formulario.numero_dosis}
                      onChange={(e) => cambiar('numero_dosis', e.target.value)}
                    >
                      {Array.from({ length: esquema.dosis }, (_, i) => String(i + 1)).map((numero) => (
                        <option key={numero} value={numero}>
                          {t('sanidad.aplicaciones.formulario.dosisNumero', { n: numero, total: esquema.dosis })}
                        </option>
                      ))}
                      {esquema.refuerzo_dias && (
                        <option value="">{t('sanidad.aplicaciones.formulario.refuerzo')}</option>
                      )}
                    </CampoLista>
                  )}
                </div>
              )}

              <CampoTexto
                etiqueta={t('sanidad.aplicaciones.formulario.observacion')}
                maxLength={500}
                placeholder={t('sanidad.aplicaciones.formulario.observacionEjemplo')}
                value={formulario.observacion}
                onChange={(e) => cambiar('observacion', e.target.value)}
              />
            </>
          )}
        </div>
      </Tarjeta>
    </form>
  );
}
