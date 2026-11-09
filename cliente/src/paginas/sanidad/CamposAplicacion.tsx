import { CampoLista, CampoTexto } from '../../componentes';
import type { OpcionesAplicacion } from '../../servicios/api';
import {
  conProducto,
  esquemasDelProducto,
  type FormularioAplicacion,
  type ProblemaAplicacion,
} from '../../servicios/aplicaciones';
import { t } from '../../servicios/idioma';

/**
 * HU-48 y HU-49 · Los campos de una aplicación: producto, fecha, dosis, quién
 * la aplicó, esquema y número de dosis, y observación. Los usan la ficha del
 * animal (de a uno) y la barra de acciones masivas (de a muchos), así las dos
 * piden lo mismo y de la misma forma.
 */

interface Propiedades {
  formulario: FormularioAplicacion;
  opciones: OpcionesAplicacion;
  quienId: string;
  /** Con un solo animal, la fecha no puede ser anterior a su nacimiento. */
  nacimiento?: string | null;
  problema: ProblemaAplicacion;
  deshabilitado?: boolean;
  alCambiar: (formulario: FormularioAplicacion) => void;
}

export function CamposAplicacion({
  formulario,
  opciones,
  quienId,
  nacimiento = null,
  problema,
  deshabilitado = false,
  alCambiar,
}: Propiedades) {
  const esquemas = esquemasDelProducto(opciones.esquemas, formulario.producto_id);
  const esquema = esquemas.find((e) => e.id === formulario.esquema_id);
  const unidad = opciones.productos.find((p) => p.id === formulario.producto_id)?.unidad ?? null;
  // Quien registra va primero; si no es del rancho (el Admin en soporte), igual se ofrece.
  const integrantes = [
    ...opciones.integrantes.filter((p) => p.id === quienId),
    ...opciones.integrantes.filter((p) => p.id !== quienId),
  ];

  function cambiar<K extends keyof FormularioAplicacion>(clave: K, valor: FormularioAplicacion[K]) {
    alCambiar({ ...formulario, [clave]: valor });
  }

  return (
    <>
      <div className="par">
        <CampoLista
          etiqueta={t('sanidad.aplicaciones.formulario.producto')}
          obligatorio
          disabled={deshabilitado}
          value={formulario.producto_id}
          onChange={(e) => alCambiar(conProducto(formulario, e.target.value, opciones))}
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
          min={nacimiento ?? undefined}
          disabled={deshabilitado}
          error={
            problema === 'fechaFutura' || problema === 'antesDeNacer'
              ? t(`sanidad.aplicaciones.formulario.${problema}`)
              : undefined
          }
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
          disabled={deshabilitado}
          value={formulario.dosis}
          onChange={(e) => cambiar('dosis', e.target.value)}
        />
        <CampoLista
          etiqueta={t('sanidad.aplicaciones.formulario.aplicadoPor')}
          disabled={deshabilitado}
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
            disabled={deshabilitado}
            value={formulario.esquema_id}
            onChange={(e) =>
              alCambiar({ ...formulario, esquema_id: e.target.value, numero_dosis: e.target.value ? '1' : '' })
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
              disabled={deshabilitado}
              value={formulario.numero_dosis}
              onChange={(e) => cambiar('numero_dosis', e.target.value)}
            >
              {Array.from({ length: esquema.dosis }, (_, i) => String(i + 1)).map((numero) => (
                <option key={numero} value={numero}>
                  {t('sanidad.aplicaciones.formulario.dosisNumero', { n: numero, total: esquema.dosis })}
                </option>
              ))}
              {esquema.refuerzo_dias && <option value="">{t('sanidad.aplicaciones.formulario.refuerzo')}</option>}
            </CampoLista>
          )}
        </div>
      )}

      <CampoTexto
        etiqueta={t('sanidad.aplicaciones.formulario.observacion')}
        maxLength={500}
        placeholder={t('sanidad.aplicaciones.formulario.observacionEjemplo')}
        disabled={deshabilitado}
        value={formulario.observacion}
        onChange={(e) => cambiar('observacion', e.target.value)}
      />
    </>
  );
}
