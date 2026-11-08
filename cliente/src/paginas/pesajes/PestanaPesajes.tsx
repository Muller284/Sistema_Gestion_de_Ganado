import { useState, type FormEvent } from 'react';
import { Alerta, Boton, Cargando, CampoTexto, EstadoVacio, Tarjeta } from '../../componentes';
import { api, type Animal, type Pesaje } from '../../servicios/api';
import { t, tn } from '../../servicios/idioma';
import { formatoFecha, formatoPeso, hoyEn, pesoAGuardar, type Regional } from '../../servicios/unidades';

/**
 * HU-53 · La pestaña Pesajes de la ficha del animal.
 *
 *   1. El peso se escribe en la unidad del país (kilos o libras) y se manda
 *      en kilos (HU-26, pesoAGuardar). La fecha no puede ser futura: el campo
 *      tiene de máximo hoy en la zona del país y el servidor lo vuelve a exigir.
 *   3. Al guardar, la ficha se vuelve a pedir: el último pesaje es su peso actual.
 *   4. La tabla dice quién registró cada pesaje.
 *
 * Solo se pesan animales activos y vigentes; los demás ven la tabla sin el
 * formulario. HU-54 (Aaron) suma acá la ganancia diaria y el gráfico.
 */

interface Propiedades {
  animal: Animal;
  /** Nulo mientras se piden. */
  pesajes: Pesaje[] | null;
  error: string;
  regional: Regional;
  puedeEditar: boolean;
  alRegistrar: (mensaje: string) => void;
}

export function PestanaPesajes({ animal, pesajes, error, regional, puedeEditar, alRegistrar }: Propiedades) {
  const pesable = !animal.eliminado_en && animal.estado === 'activo';

  return (
    <div className="col g24">
      {puedeEditar && pesable && (
        <FormularioPesaje animal={animal} regional={regional} alRegistrar={alRegistrar} />
      )}
      {puedeEditar && !pesable && <Alerta variante="info">{t('animales.ficha.pesajes.noSePesa')}</Alerta>}

      <Tarjeta
        titulo={t('animales.ficha.pesajes.tabla.titulo')}
        accion={
          pesajes && pesajes.length > 0 ? (
            <span className="pie c-600">{tn('animales.ficha.pesajes.cuantos', pesajes.length)}</span>
          ) : undefined
        }
      >
        {error && <Alerta variante="error">{error}</Alerta>}
        {!error && pesajes === null && <Cargando lineas={3} />}
        {!error && pesajes !== null && pesajes.length === 0 && (
          <EstadoVacio
            icono="balanza"
            titulo={t('animales.ficha.pesajes.vacio.titulo')}
            texto={
              animal.peso_kg
                ? t('animales.ficha.pesajes.vacio.textoConPeso', { peso: formatoPeso(animal.peso_kg, regional) })
                : t('animales.ficha.pesajes.vacio.texto')
            }
          />
        )}
        {!error && pesajes !== null && pesajes.length > 0 && (
          <div className="ganado__tabla-contenedor">
            <table className="ganado__tabla pesajes__tabla">
              <thead>
                <tr>
                  <th scope="col">{t('animales.ficha.pesajes.tabla.fecha')}</th>
                  <th scope="col">{t('animales.ficha.pesajes.tabla.peso')}</th>
                  <th scope="col">{t('animales.ficha.pesajes.tabla.quien')}</th>
                  <th scope="col">{t('animales.ficha.pesajes.tabla.observacion')}</th>
                </tr>
              </thead>
              <tbody>
                {pesajes.map((pesaje) => (
                  <tr key={pesaje.id}>
                    <td>{formatoFecha(pesaje.fecha, regional)}</td>
                    <td className="dato">{formatoPeso(pesaje.peso_kg, regional)}</td>
                    <td>{pesaje.registrado_por ?? t('animales.ficha.autoria.sistema')}</td>
                    <td className="pesajes__observacion">{pesaje.observacion ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Tarjeta>
    </div>
  );
}

/** Criterio 1: peso en la unidad del país, fecha no futura y, si hace falta, una observación. */
function FormularioPesaje({
  animal,
  regional,
  alRegistrar,
}: {
  animal: Animal;
  regional: Regional;
  alRegistrar: (mensaje: string) => void;
}) {
  const hoy = hoyEn(regional);
  const [fecha, setFecha] = useState(hoy);
  const [peso, setPeso] = useState('');
  const [observacion, setObservacion] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');

  const valor = Number(peso.replace(',', '.'));
  const pesoValido = peso.trim() !== '' && Number.isFinite(valor) && valor > 0;
  const listo = pesoValido && Boolean(fecha) && fecha <= hoy;

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (!listo) return;
    setOcupado(true);
    setError('');
    try {
      const respuesta = await api.registrarPesaje({
        animal_id: animal.id,
        fecha,
        peso_kg: pesoAGuardar(valor, regional.peso),
        observacion: observacion.trim() || null,
      });
      setPeso('');
      setObservacion('');
      alRegistrar(respuesta.mensaje);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <form onSubmit={enviar}>
      <Tarjeta
        titulo={t('animales.ficha.pesajes.nuevo.titulo')}
        pie={
          <Boton variante="primario" type="submit" disabled={!listo || ocupado}>
            {ocupado ? t('comun.guardando') : t('animales.ficha.pesajes.nuevo.boton')}
          </Boton>
        }
      >
        <div className="col g16">
          {error && <Alerta variante="error">{error}</Alerta>}
          <div className="pesajes__campos">
            <CampoTexto
              etiqueta={t('animales.ficha.pesajes.nuevo.peso', { unidad: regional.peso })}
              obligatorio
              type="number"
              inputMode="decimal"
              min="0"
              step="0.1"
              value={peso}
              error={peso.trim() !== '' && !pesoValido ? t('animales.ficha.pesajes.pesoInvalido') : undefined}
              onChange={(e) => setPeso(e.target.value)}
            />
            <CampoTexto
              etiqueta={t('animales.ficha.pesajes.nuevo.fecha')}
              obligatorio
              type="date"
              max={hoy}
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </div>
          <CampoTexto
            etiqueta={t('animales.ficha.pesajes.nuevo.observacion')}
            maxLength={500}
            placeholder={t('animales.ficha.pesajes.nuevo.observacionEjemplo')}
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
          />
        </div>
      </Tarjeta>
    </form>
  );
}
