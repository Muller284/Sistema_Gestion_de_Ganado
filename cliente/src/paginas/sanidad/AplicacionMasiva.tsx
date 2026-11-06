import { useEffect, useState } from 'react';
import { Alerta, Boton, Cargando } from '../../componentes';
import { api, type OpcionesAplicacion } from '../../servicios/api';
import {
  aDatosAplicacion,
  formularioAplicacion,
  problemaAplicacion,
  type FormularioAplicacion,
} from '../../servicios/aplicaciones';
import { t, tn } from '../../servicios/idioma';
import { CamposAplicacion } from './CamposAplicacion';

/**
 * HU-49 · «Aplicar producto» en la barra de acciones masivas (HU-31).
 *
 *   1. Los animales vienen elegidos del listado: de a uno, la página o todo
 *      el filtro.
 *   2. Antes de guardar se confirma cuántos animales se van a registrar.
 *   3. El servidor guarda todo en una sola operación: o todas o ninguna.
 *   4. Los dados de baja y los de otro rancho no se cuentan: el listado ya no
 *      deja elegirlos, y el servidor los vuelve a descartar.
 *
 * Los campos son los mismos que en la ficha (CamposAplicacion.tsx).
 */

interface Propiedades {
  seleccion: string[];
  quienId: string;
  alTerminar: (mensaje: string) => void;
}

export function AplicacionMasiva({ seleccion, quienId, alTerminar }: Propiedades) {
  const [opciones, setOpciones] = useState<OpcionesAplicacion | null>(null);
  const [formulario, setFormulario] = useState<FormularioAplicacion | null>(null);
  const [confirmando, setConfirmando] = useState(false);
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

  const n = seleccion.length;
  // El nacimiento de cada animal lo controla el servidor: acá hay muchos.
  const problema = formulario && opciones ? problemaAplicacion(formulario, opciones.hoy, null) : null;
  const listo = Boolean(formulario?.producto_id && formulario.fecha) && problema === null;
  const producto = opciones?.productos.find((p) => p.id === formulario?.producto_id)?.nombre ?? '';

  async function aplicar() {
    if (!formulario) return;
    setEnviando(true);
    setError('');
    try {
      const respuesta = await api.aplicacionMasiva(seleccion, aDatosAplicacion(formulario));
      alTerminar(
        respuesta.no_contados > 0
          ? `${respuesta.mensaje} ${tn('sanidad.masiva.noContados', respuesta.no_contados)}`
          : respuesta.mensaje,
      );
    } catch (err) {
      setError((err as Error).message);
      setConfirmando(false);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="col g12">
      {error && <Alerta variante="error">{error}</Alerta>}
      {!formulario && !error && <Cargando lineas={2} />}
      {opciones && opciones.productos.length === 0 && (
        <Alerta variante="adv">{t('sanidad.aplicaciones.formulario.sinProductos')}</Alerta>
      )}

      {formulario && opciones && (
        // Los campos ya vienen de a pares (.par): la grilla de la barra los apretaría.
        <div className="col g16">
          <CamposAplicacion
            formulario={formulario}
            opciones={opciones}
            quienId={quienId}
            problema={problema}
            deshabilitado={confirmando}
            alCambiar={setFormulario}
          />
        </div>
      )}

      {confirmando ? (
        <div className="col g12">
          <Alerta variante="adv">{tn('sanidad.masiva.confirmar', n, { producto })}</Alerta>
          <div className="fila g8">
            <Boton variante="secundario" onClick={() => setConfirmando(false)} disabled={enviando}>
              {t('comun.cancelar')}
            </Boton>
            <Boton variante="primario" onClick={aplicar} disabled={enviando}>
              {enviando ? t('comun.guardando') : t('sanidad.masiva.siAplicar')}
            </Boton>
          </div>
        </div>
      ) : (
        <div className="fila g8">
          <Boton variante="primario" onClick={() => setConfirmando(true)} disabled={!listo}>
            {tn('sanidad.masiva.aplicar', n)}
          </Boton>
        </div>
      )}
    </div>
  );
}
