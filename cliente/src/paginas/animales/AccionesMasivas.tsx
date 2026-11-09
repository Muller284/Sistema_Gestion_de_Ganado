import { useState } from 'react';
import { Alerta, Boton, CampoLista, CampoTexto, Segmentos } from '../../componentes';
import { api, type Corral, type EstadoAnimal } from '../../servicios/api';
import { t, tn } from '../../servicios/idioma';
import { hoyEn, type Regional } from '../../servicios/unidades';
import { PesajeMasivo } from '../pesajes/PesajeMasivo';
import { AplicacionMasiva } from '../sanidad/AplicacionMasiva';

/**
 * HU-31 · La barra de acciones masivas del listado de animales.
 *
 *   2. Aparece cuando hay algo elegido y muestra cuántos son y qué se les
 *      puede hacer.
 *   3. Toda acción pide confirmación diciendo cuántos animales afecta, y
 *      recién al confirmar se manda al servidor.
 *
 * Las acciones son las que existen de a uno, con sus mismas reglas:
 *   corral  HU-37: asignar a un corral (POST /corrales/:id/animales). El
 *           servidor acepta hasta 1000 por pedido, así que una selección más
 *           grande se manda en tandas.
 *   estado  HU-33: el nuevo estado, la fecha y el motivo.
 *   baja    HU-34: solo el propietario y el Admin (HU-18, criterio 3); el
 *           botón ni aparece para los demás, y el servidor lo vuelve a exigir.
 *   pesaje  HU-53: un peso por animal, con la misma fecha (PesajeMasivo.tsx).
 *           Solo para quien edita pesajes; tiene su propia confirmación.
 *           Quien edita pesajes pero no animales (el veterinario) solo ve esta.
 *   aplicar HU-49: el mismo producto a todos (AplicacionMasiva.tsx). Solo
 *           para quien edita sanidad; tiene su propia confirmación. Quien
 *           edita sanidad pero no animales (el veterinario) solo ve esta.
 *
 * Elegir de a uno, la página o todo el filtro (criterio 1) lo hace el
 * listado: acá llegan los ids ya elegidos.
 */

export type Accion = 'corral' | 'estado' | 'baja' | 'pesaje' | 'aplicar';
export type Ambito = 'sueltos' | 'pagina' | 'filtro';

const ESTADOS: EstadoAnimal[] = ['activo', 'vendido', 'muerto', 'archivado'];
export const TANDA_CORRAL = 1000;

interface Propiedades {
  seleccion: string[];
  ambito: Ambito;
  corrales: Corral[];
  puedeEliminar: boolean;
  /** HU-53: edita pesajes. */
  puedePesar?: boolean;
  /** HU-49: edita sanidad. */
  puedeAplicar?: boolean;
  /** Edita animales: corral y estado. Por defecto sí (antes era la única forma de elegir). */
  puedeEditarAnimales?: boolean;
  /** HU-49: quien registra; es quien aplicó si no se elige otra persona. */
  quienId?: string;
  regional: Regional;
  alQuitar: () => void;
  alTerminar: (mensaje: string, aviso?: string | null) => void;
}

export function AccionesMasivas({
  seleccion,
  ambito,
  corrales,
  puedeEliminar,
  puedePesar = false,
  puedeAplicar = false,
  puedeEditarAnimales = true,
  quienId = '',
  regional,
  alQuitar,
  alTerminar,
}: Propiedades) {
  const acciones: Accion[] = [
    ...(puedeEditarAnimales ? (['corral', 'estado'] as Accion[]) : []),
    ...(puedePesar ? (['pesaje'] as Accion[]) : []),
    ...(puedeAplicar ? (['aplicar'] as Accion[]) : []),
    ...(puedeEliminar && puedeEditarAnimales ? (['baja'] as Accion[]) : []),
  ];
  const [accion, setAccion] = useState<Accion>(acciones[0] ?? 'corral');
  // Pesar (HU-53) y aplicar (HU-49) traen su propio formulario y su propia confirmación.
  const formularioPropio = accion === 'pesaje' || accion === 'aplicar';
  const [corral, setCorral] = useState('');
  const [estado, setEstado] = useState<EstadoAnimal | ''>('');
  const [fecha, setFecha] = useState(hoyEn(regional));
  const [motivo, setMotivo] = useState('');
  const [confirmando, setConfirmando] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');

  const n = seleccion.length;
  const nombreCorral = corrales.find((c) => c.id === corral)?.nombre ?? '';
  const lista =
    accion === 'corral'
      ? Boolean(corral)
      : accion === 'estado'
        ? Boolean(estado) && Boolean(fecha) && motivo.trim().length > 0
        : true;

  function cambiarAccion(nueva: Accion) {
    setAccion(nueva);
    setConfirmando(false);
    setError('');
  }

  function pregunta(): string {
    if (accion === 'corral') return tn('animales.masivo.confirmar.corral', n, { corral: nombreCorral });
    if (accion === 'estado') {
      return tn('animales.masivo.confirmar.estado', n, {
        estado: estado ? t(`animales.estados.${estado}`) : '',
      });
    }
    return tn('animales.masivo.confirmar.baja', n);
  }

  async function aplicar() {
    setOcupado(true);
    setError('');
    try {
      if (accion === 'corral') {
        // Las tandas van una detrás de otra: el aviso de exceso es el de la última.
        let movidos = 0;
        let aviso: string | null = null;
        for (let inicio = 0; inicio < n; inicio += TANDA_CORRAL) {
          const respuesta = await api.asignarAnimales(corral, seleccion.slice(inicio, inicio + TANDA_CORRAL));
          movidos += respuesta.movidos;
          aviso = respuesta.aviso;
        }
        alTerminar(tn('animales.masivo.listo.corral', movidos, { corral: nombreCorral }), aviso);
      } else if (accion === 'estado' && estado) {
        const respuesta = await api.cambiarEstadoMasivo(seleccion, estado, motivo.trim(), fecha);
        alTerminar(
          respuesta.ya_estaban > 0
            ? `${respuesta.mensaje} ${tn('animales.masivo.yaEstaban', respuesta.ya_estaban)}`
            : respuesta.mensaje,
        );
      } else if (accion === 'baja') {
        const respuesta = await api.bajaMasiva(seleccion);
        alTerminar(respuesta.mensaje);
      }
    } catch (err) {
      setError((err as Error).message);
      setConfirmando(false);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <section className="acciones-masivas" aria-label={t('animales.masivo.titulo')}>
      <div className="acciones-masivas__cabecera">
        <div className="col g4 flex1">
          <strong className="cuerpo-m">{tn('animales.masivo.cuantos', n)}</strong>
          <span className="pie c-600">{t(`animales.masivo.ambito.${ambito}`)}</span>
        </div>
        <Boton variante="fantasma" onClick={alQuitar} disabled={ocupado}>
          {t('animales.seleccion.quitar')}
        </Boton>
      </div>

      <Segmentos
        etiqueta={t('animales.masivo.acciones')}
        valor={accion}
        alCambiar={cambiarAccion}
        opciones={acciones.map((clave) => ({ clave, nombre: t(`animales.masivo.accion.${clave}`) }))}
      />

      {accion === 'pesaje' && <PesajeMasivo seleccion={seleccion} regional={regional} alTerminar={alTerminar} />}
      {accion === 'aplicar' && (
        <AplicacionMasiva seleccion={seleccion} quienId={quienId} alTerminar={(mensaje) => alTerminar(mensaje)} />
      )}

      {!formularioPropio && error && <Alerta variante="error">{error}</Alerta>}

      {!formularioPropio && (
        <div className="acciones-masivas__campos">
          {accion === 'corral' && (
            <CampoLista
              etiqueta={t('animales.seleccion.corral')}
              value={corral}
              disabled={confirmando}
              onChange={(e) => setCorral(e.target.value)}
            >
              <option value="">{t('animales.campos.elegir')}</option>
              {corrales.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </CampoLista>
          )}

          {accion === 'estado' && (
            <>
              <CampoLista
                etiqueta={t('animales.ficha.estado.nuevo')}
                obligatorio
                value={estado}
                disabled={confirmando}
                onChange={(e) => setEstado(e.target.value as EstadoAnimal)}
              >
                <option value="">{t('animales.campos.elegir')}</option>
                {ESTADOS.map((opcion) => (
                  <option key={opcion} value={opcion}>
                    {t(`animales.estados.${opcion}`)}
                  </option>
                ))}
              </CampoLista>
              <CampoTexto
                etiqueta={t('animales.ficha.estado.fecha')}
                obligatorio
                type="date"
                max={hoyEn(regional)}
                value={fecha}
                disabled={confirmando}
                onChange={(e) => setFecha(e.target.value)}
              />
              <CampoTexto
                etiqueta={t('animales.ficha.estado.motivo')}
                obligatorio
                maxLength={500}
                placeholder={t('animales.ficha.estado.motivoEjemplo')}
                value={motivo}
                disabled={confirmando}
                onChange={(e) => setMotivo(e.target.value)}
              />
            </>
          )}

          {accion === 'baja' && <p className="cuerpo c-600">{t('animales.masivo.bajaExplicacion')}</p>}
        </div>
      )}

      {formularioPropio ? null : confirmando ? (
        <div className="col g12">
          <Alerta variante="adv">{pregunta()}</Alerta>
          <div className="fila g8">
            <Boton variante="secundario" onClick={() => setConfirmando(false)} disabled={ocupado}>
              {t('comun.cancelar')}
            </Boton>
            <Boton variante={accion === 'baja' ? 'destructivo' : 'primario'} onClick={aplicar} disabled={ocupado}>
              {ocupado ? t('comun.guardando') : t('animales.masivo.siAplicar')}
            </Boton>
          </div>
        </div>
      ) : (
        <div className="fila g8">
          <Boton variante="primario" onClick={() => setConfirmando(true)} disabled={!lista}>
            {t('animales.masivo.aplicar', { n })}
          </Boton>
        </div>
      )}
    </section>
  );
}
