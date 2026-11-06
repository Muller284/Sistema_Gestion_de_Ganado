import { useEffect, useState, type FormEvent } from 'react';
import { Alerta, Boton, Cargando, EstadoVacio, Icono, Insignia, Tarjeta } from '../../componentes';
import { api, type AplicacionSanitaria, type Animal, type OpcionesAplicacion } from '../../servicios/api';
import {
  aDatosAplicacion,
  detalleAplicacion,
  formularioAplicacion,
  problemaAplicacion,
  type FormularioAplicacion,
} from '../../servicios/aplicaciones';
import { t } from '../../servicios/idioma';
import { formatoFecha, formatoMomento, type Regional } from '../../servicios/unidades';
import { CamposAplicacion } from './CamposAplicacion';

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

  const problema = formulario && opciones ? problemaAplicacion(formulario, opciones.hoy, animal.fecha_nacimiento) : null;
  const completo = Boolean(formulario?.producto_id && formulario.fecha);

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
            <CamposAplicacion
              formulario={formulario}
              opciones={opciones}
              quienId={quienId}
              nacimiento={animal.fecha_nacimiento}
              problema={problema}
              alCambiar={setFormulario}
            />
          )}
        </div>
      </Tarjeta>
    </form>
  );
}
