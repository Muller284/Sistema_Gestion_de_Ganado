import { useEffect, useState } from 'react';
import { Alerta, Boton, Cargando, CampoTexto } from '../../componentes';
import { api, type AnimalPesable } from '../../servicios/api';
import { t, tn } from '../../servicios/idioma';
import { formatoFecha, formatoPeso, hoyEn, pesoAGuardar, type Regional } from '../../servicios/unidades';

/**
 * HU-53, criterio 2 · Pesaje masivo desde la barra de acciones del listado.
 *
 * Los animales se eligen como en las demás acciones masivas (HU-31: de a uno,
 * la página o todo el filtro). Con esa selección se le pregunta al servidor
 * cuáles se pueden pesar (vigentes, activos y del rancho) y cada uno tiene su
 * campo de peso, en la unidad del país (HU-26). Los que quedan vacíos no se
 * registran. Antes de guardar se confirma cuántos van, y el servidor guarda
 * todos juntos o ninguno.
 */

export const MAXIMO_PESAJE_MASIVO = 500;

interface Propiedades {
  seleccion: string[];
  regional: Regional;
  alTerminar: (mensaje: string) => void;
}

export function PesajeMasivo({ seleccion, regional, alTerminar }: Propiedades) {
  const hoy = hoyEn(regional);
  const demasiados = seleccion.length > MAXIMO_PESAJE_MASIVO;
  const [animales, setAnimales] = useState<AnimalPesable[] | null>(null);
  const [noPesables, setNoPesables] = useState(0);
  const [fecha, setFecha] = useState(hoy);
  const [pesos, setPesos] = useState<Record<string, string>>({});
  const [confirmando, setConfirmando] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (demasiados) return;
    let vigente = true;
    api
      .pesablesMasivo(seleccion)
      .then((respuesta) => {
        if (!vigente) return;
        setAnimales(respuesta.animales);
        setNoPesables(respuesta.no_pesables);
      })
      .catch((err: Error) => vigente && setError(err.message));
    return () => {
      vigente = false;
    };
  }, [seleccion, demasiados]);

  if (demasiados) {
    return <Alerta variante="adv">{t('animales.masivo.pesaje.demasiados', { n: MAXIMO_PESAJE_MASIVO })}</Alerta>;
  }
  if (!animales) return error ? <Alerta variante="error">{error}</Alerta> : <Cargando lineas={3} />;

  const escritos = animales
    .map((animal) => ({ animal, texto: (pesos[animal.id] ?? '').trim() }))
    .filter((fila) => fila.texto !== '');
  const malos = escritos.filter((fila) => !(Number(fila.texto.replace(',', '.')) > 0));
  const listo = escritos.length > 0 && malos.length === 0 && Boolean(fecha) && fecha <= hoy;

  async function guardar() {
    setOcupado(true);
    setError('');
    try {
      const respuesta = await api.registrarPesajeMasivo({
        fecha,
        pesajes: escritos.map(({ animal, texto }) => ({
          animal_id: animal.id,
          peso_kg: pesoAGuardar(Number(texto.replace(',', '.')), regional.peso),
        })),
      });
      alTerminar(respuesta.mensaje);
    } catch (err) {
      setError((err as Error).message);
      setConfirmando(false);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="col g16">
      {error && <Alerta variante="error">{error}</Alerta>}
      {noPesables > 0 && <Alerta variante="info">{tn('animales.masivo.pesaje.noPesables', noPesables)}</Alerta>}

      {animales.length === 0 ? (
        <p className="cuerpo c-600">{t('animales.masivo.pesaje.ninguno')}</p>
      ) : (
        <>
          <div className="pesajes__campos">
            <CampoTexto
              etiqueta={t('animales.masivo.pesaje.fecha')}
              obligatorio
              type="date"
              max={hoy}
              value={fecha}
              disabled={confirmando}
              onChange={(e) => setFecha(e.target.value)}
            />
          </div>
          <p className="pie c-600">{t('animales.masivo.pesaje.explicacion', { unidad: regional.peso })}</p>

          <div className="ganado__tabla-contenedor pesajes__masivo">
            <table className="ganado__tabla">
              <thead>
                <tr>
                  <th scope="col">{t('animales.masivo.pesaje.animal')}</th>
                  <th scope="col">{t('animales.masivo.pesaje.pesoActual')}</th>
                  <th scope="col">{t('animales.masivo.pesaje.pesoNuevo', { unidad: regional.peso })}</th>
                </tr>
              </thead>
              <tbody>
                {animales.map((animal) => {
                  const etiqueta = t('animales.masivo.pesaje.pesoDe', { identificador: animal.identificador });
                  const texto = pesos[animal.id] ?? '';
                  const malo = texto.trim() !== '' && !(Number(texto.replace(',', '.')) > 0);
                  return (
                    <tr key={animal.id}>
                      <td>
                        <span className="dato">{animal.identificador}</span>
                        {animal.nombre && <span className="pie c-500"> · {animal.nombre}</span>}
                      </td>
                      <td>{animal.peso_kg ? formatoPeso(animal.peso_kg, regional) : '—'}</td>
                      <td>
                        <input
                          className="pesajes__entrada"
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="0.1"
                          aria-label={etiqueta}
                          aria-invalid={malo ? true : undefined}
                          value={texto}
                          disabled={confirmando}
                          onChange={(e) => setPesos((previos) => ({ ...previos, [animal.id]: e.target.value }))}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {malos.length > 0 && (
            <Alerta variante="error">
              {t('animales.masivo.pesaje.pesoInvalido', { identificador: malos[0].animal.identificador })}
            </Alerta>
          )}

          {confirmando ? (
            <div className="col g12">
              <Alerta variante="adv">
                {tn('animales.masivo.pesaje.confirmar', escritos.length, { fecha: formatoFecha(fecha, regional) })}
              </Alerta>
              <div className="fila g8">
                <Boton variante="secundario" onClick={() => setConfirmando(false)} disabled={ocupado}>
                  {t('comun.cancelar')}
                </Boton>
                <Boton variante="primario" onClick={guardar} disabled={ocupado}>
                  {ocupado ? t('comun.guardando') : t('animales.masivo.siAplicar')}
                </Boton>
              </div>
            </div>
          ) : (
            <div className="fila g8 centro">
              <Boton variante="primario" onClick={() => setConfirmando(true)} disabled={!listo}>
                {tn('animales.masivo.pesaje.boton', escritos.length)}
              </Boton>
              <span className="pie c-600">
                {tn('animales.masivo.pesaje.cuantosConPeso', escritos.length, { total: animales.length })}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
