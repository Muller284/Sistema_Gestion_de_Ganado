import { useEffect, useRef, useState } from 'react';
import { api } from '../servicios/api';

/**
 * HU-07 · La espera de la confirmación, viva.
 *
 * POR QUE EXISTE
 * Sin esto, la pantalla que dice "revisa tu correo" es un callejón sin salida:
 * el usuario confirma en otra pestaña o en el celular y esta se queda igual,
 * esperando a que alguien la recargue a mano. Eso es lo que hace que un
 * sistema se sienta muerto aunque todo funcione por debajo.
 *
 * Cada cuatro segundos se le pregunta al servidor si la cuenta sigue
 * esperando algo (GET /usuarios/yo). En cuanto deja de esperar, se avisa
 * hacia arriba y la pantalla avanza sola.
 *
 * Se corta a los cinco minutos. Una pestaña olvidada abierta toda la tarde no
 * tiene por qué seguir preguntando.
 */

const CADA = 4000;
const MINUTOS = 5;
const MAXIMO = (MINUTOS * 60 * 1000) / CADA;

interface Propiedades {
  /** Se llama una sola vez, cuando el servidor dice que ya no falta nada. */
  alConfirmar: () => void;
}

export function EsperaDeCorreo({ alConfirmar }: Propiedades) {
  const [cansado, setCansado] = useState(false);
  const avisar = useRef(alConfirmar);

  // La función se guarda aparte para que el intervalo no se rearme en cada
  // renderizado. Si dependiera de ella, se cancelaría y volvería a crear todo
  // el tiempo y la cuenta de intentos nunca llegaría al final.
  useEffect(() => {
    avisar.current = alConfirmar;
  });

  useEffect(() => {
    let vigente = true;
    let intentos = 0;

    const reloj = window.setInterval(() => {
      void (async () => {
        intentos += 1;
        if (intentos > MAXIMO) {
          window.clearInterval(reloj);
          if (vigente) setCansado(true);
          return;
        }
        const estado = await api.yo().catch(() => null);
        if (!vigente || !estado) return;
        if (estado.pendiente !== 'verificar_correo') {
          window.clearInterval(reloj);
          avisar.current();
        }
      })();
    }, CADA);

    return () => {
      vigente = false;
      window.clearInterval(reloj);
    };
  }, []);

  if (cansado) {
    return (
      <p className="espera espera-detenida">
        Dejamos de revisar. Recarga la página cuando hayas confirmado.
      </p>
    );
  }

  return (
    <p className="espera" role="status">
      <span className="latido" aria-hidden="true" />
      Esta pantalla se actualiza sola en cuanto confirmes.
    </p>
  );
}
