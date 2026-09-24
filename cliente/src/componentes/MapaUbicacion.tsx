import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Icono } from './Iconos';

/**
 * HU-15 · El mapa para marcar dónde está el rancho.
 *
 * QUÉ USA
 * Leaflet, que es la librería de mapas libre de siempre, y las imágenes de
 * OpenStreetMap, que son gratuitas. Las dos licencias obligan a mostrar el
 * crédito: Leaflet lo pone solo abajo a la derecha y no se quita.
 *
 * Antes esto estaba escrito a mano para no agregar dependencias. Se cambió
 * cuando el equipo abrió la puerta a instalarlas: Leaflet trae el acercamiento
 * con la rueda, el pellizco en pantalla táctil, el teclado y un montón de
 * casos raros que no vale la pena volver a escribir.
 *
 * LA CHINCHETA ES NUESTRA
 * Leaflet trae una imagen propia que los empaquetadores rompen y que además no
 * tiene nada que ver con el sistema de diseño. En lugar de pelearse con eso, la
 * chincheta es el icono del sistema metido en un divIcon.
 *
 * EL MAPA ES UNA AYUDA, NO EL ÚNICO CAMINO
 * Los campos de latitud y longitud siguen existiendo y se pueden escribir a
 * mano. Quien no tenga internet, use lector de pantalla o traiga las
 * coordenadas de un GPS no depende de esto. El mapa solo llena esos campos.
 */

const TESELAS = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const CREDITO =
  '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

/** Bolivia entera, para cuando todavía no hay nada marcado. */
const INICIO: [number, number] = [-16.6, -64.6];
const ACERCAMIENTO_INICIAL = 5;
/** Cuando ya hay coordenadas, se entra de cerca. */
const ACERCAMIENTO_DE_CERCA = 13;

/** Seis decimales son unos once centímetros. De sobra para un rancho. */
function redondear(grados: number): number {
  return Math.round(grados * 1e6) / 1e6;
}

function comoNumero(texto: string): number | null {
  if (texto.trim() === '') return null;
  const valor = Number(texto);
  return Number.isFinite(valor) ? valor : null;
}

/** La chincheta, con el icono del sistema en lugar de la imagen de Leaflet. */
const CHINCHETA = L.divIcon({
  className: 'mapa__chincheta',
  html: `<svg class="ico" width="28" height="28" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>`,
  iconSize: [28, 28],
  // La punta de la chincheta es lo que marca el punto, no su centro.
  iconAnchor: [14, 28],
});

interface Propiedades {
  /** Lo que hay en el formulario. Vacío si todavía no se eligió nada. */
  latitud: string;
  longitud: string;
  /** Se llama al marcar un punto, con los grados ya redondeados. */
  alElegir: (latitud: number, longitud: number) => void;
}

export function MapaUbicacion({ latitud, longitud, alElegir }: Propiedades) {
  const caja = useRef<HTMLDivElement>(null);
  const mapa = useRef<L.Map | null>(null);
  const chincheta = useRef<L.Marker | null>(null);
  const [sinImagenes, setSinImagenes] = useState(false);
  const [aviso, setAviso] = useState('');

  const lat = comoNumero(latitud);
  const lon = comoNumero(longitud);

  // alElegir cambia en cada renderizado de la pantalla. Se guarda aparte para
  // que el mapa se construya una sola vez y no en cada cambio del formulario.
  const avisar = useRef(alElegir);
  useEffect(() => {
    avisar.current = alElegir;
  });

  // El mapa se crea una vez y se destruye al salir de la pantalla.
  useEffect(() => {
    if (!caja.current) return;

    const hayPunto = lat !== null && lon !== null;
    const m = L.map(caja.current, {
      center: hayPunto ? [lat, lon] : INICIO,
      zoom: hayPunto ? ACERCAMIENTO_DE_CERCA : ACERCAMIENTO_INICIAL,
      // Con la rueda se hace sin querer al desplazar la página larga del
      // formulario. Con Ctrl o con los botones, a propósito.
      scrollWheelZoom: false,
    });

    const capa = L.tileLayer(TESELAS, { maxZoom: 19, attribution: CREDITO });
    // Una tesela suelta puede fallar; que fallen varias es que no hay internet.
    let fallidas = 0;
    capa.on('tileerror', () => {
      fallidas += 1;
      if (fallidas >= 4) setSinImagenes(true);
    });
    capa.on('tileload', () => setSinImagenes(false));
    capa.addTo(m);

    m.on('click', (evento: L.LeafletMouseEvent) => {
      avisar.current(redondear(evento.latlng.lat), redondear(evento.latlng.lng));
    });

    mapa.current = m;
    return () => {
      m.remove();
      mapa.current = null;
      chincheta.current = null;
    };
    // Solo al montar: el centro inicial se toma de lo que haya en ese momento.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // La chincheta sigue a lo que diga el formulario, venga del mapa o de que
  // alguien escribió las coordenadas a mano.
  // Se depende de los dos numeros y no de un par armado aca: un array nuevo
  // en cada renderizado haria correr este efecto siempre, aunque nada cambie.
  useEffect(() => {
    const m = mapa.current;
    if (!m) return;

    if (lat === null || lon === null) {
      chincheta.current?.remove();
      chincheta.current = null;
      return;
    }

    if (chincheta.current) {
      chincheta.current.setLatLng([lat, lon]);
    } else {
      chincheta.current = L.marker([lat, lon], {
        icon: CHINCHETA,
        keyboard: false,
      }).addTo(m);
    }
  }, [lat, lon]);

  function usarMiUbicacion() {
    setAviso('');
    if (!navigator.geolocation) {
      setAviso('Este navegador no puede dar tu ubicación.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const punto: [number, number] = [
          redondear(coords.latitude),
          redondear(coords.longitude),
        ];
        mapa.current?.setView(punto, ACERCAMIENTO_DE_CERCA);
        alElegir(punto[0], punto[1]);
      },
      () => setAviso('No se pudo obtener tu ubicación.'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div className="mapa">
      <div
        ref={caja}
        className="mapa__lienzo"
        role="application"
        aria-label="Mapa para marcar la ubicación del rancho. También puedes escribir la latitud y la longitud a mano."
      />

      {sinImagenes && (
        <p className="pie c-500">
          No se pudieron cargar las imágenes del mapa. Revisa la conexión, o
          escribe la latitud y la longitud a mano.
        </p>
      )}

      <div className="mapa__pie">
        <button type="button" className="btn btn-fantasma" onClick={usarMiUbicacion}>
          <Icono nombre="ubicacion" tamano={18} />
          Usar mi ubicación
        </button>
        <span className="pie c-500">
          {lat !== null && lon !== null
            ? `Marcado en ${lat}, ${lon}`
            : 'Toca el mapa para marcar dónde está el rancho.'}
        </span>
      </div>

      {aviso && <p className="pie c-500">{aviso}</p>}
    </div>
  );
}
