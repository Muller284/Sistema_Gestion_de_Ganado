import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alerta } from '../../componentes';
import { api, type AvisosSanidad as Avisos } from '../../servicios/api';
import { tn, t } from '../../servicios/idioma';

/**
 * HU-51 · Avisos de vencimientos.
 *
 *   1. En el inicio se avisa cuántas dosis están vencidas y cuántas vencen en
 *      los próximos días, con un enlace al calendario ya filtrado (HU-50).
 *   2. Lo ve quien tiene acceso a sanidad; a los demás no se les pregunta
 *      nada (el servidor igual respondería 403).
 *
 * Sin nada vencido ni próximo, no se muestra nada: un aviso que siempre está
 * deja de leerse.
 */
export function AvisosSanidad() {
  const [avisos, setAvisos] = useState<Avisos | null>(null);

  useEffect(() => {
    let vigente = true;
    api
      .misPermisos()
      .then((permisos) => {
        if (!vigente || (permisos.sanidad ?? 'ninguno') === 'ninguno') return null;
        return api.avisosSanidad();
      })
      .then((respuesta) => vigente && respuesta && setAvisos(respuesta))
      // Un aviso que no se pudo pedir no tapa el inicio.
      .catch(() => undefined);
    return () => {
      vigente = false;
    };
  }, []);

  if (!avisos || (avisos.vencidas === 0 && avisos.proximas === 0)) return null;

  return (
    <div className="col g8 sanidad__aviso">
      {avisos.vencidas > 0 && (
        <Alerta variante="error">
          {tn('sanidad.avisos.vencidas', avisos.vencidas)}
          <Link to="/sanidad?estado=vencida">{t('sanidad.avisos.verVencidas')}</Link>
        </Alerta>
      )}
      {avisos.proximas > 0 && (
        <Alerta variante="adv">
          {tn('sanidad.avisos.proximas', avisos.proximas, { dias: avisos.dias_proxima })}
          <Link to="/sanidad?estado=proxima">{t('sanidad.avisos.verProximas')}</Link>
        </Alerta>
      )}
    </div>
  );
}
