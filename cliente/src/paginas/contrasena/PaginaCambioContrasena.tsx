import { useState } from 'react';
import { Alerta, Boton, CampoTexto, DisenoAcceso, Icono } from '../../componentes';
import { api } from '../../servicios/api';
import { t } from '../../servicios/idioma';
import { enumerar, faltasDeContrasena } from '../../servicios/texto';

/**
 * HU-10 · Cambio obligatorio de contraseña.
 *
 * Esta pantalla es una pared: mientras el sistema diga que hay que cambiar la
 * contraseña temporal, no se puede llegar a ninguna otra. Quien decide eso es
 * App.tsx, con lo que responde GET /usuarios/yo, y el servidor lo impone igual
 * por su cuenta con GuardiaCuentaLista. Las dos cosas hacen falta: la del
 * cliente para que se entienda, la del servidor para que sirva.
 *
 * Las tres reglas de la contraseña son las mismas de HU-06, y tambien estan
 * en el servidor. Acá se comprueban para no hacerle perder el viaje al usuario.
 */

interface Propiedades {
  nombre?: string;
  /** Se llama cuando el cambio salió bien, para que App vuelva a preguntar. */
  alTerminar: () => void;
}

export function PaginaCambioContrasena({ nombre, alTerminar }: Propiedades) {
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [repetir, setRepetir] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const faltas = faltasDeContrasena(nueva);
  const tocada = nueva.length > 0;
  const igualALaTemporal = nueva.length > 0 && nueva === actual;
  const noCoinciden = repetir.length > 0 && repetir !== nueva;

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (igualALaTemporal) {
      setError(t('acceso.contrasena.cambio.igualTemporal'));
      return;
    }
    if (faltas.length > 0) {
      setError(t('comun.contrasena.necesita', { faltas: enumerar(faltas) }));
      return;
    }
    if (nueva !== repetir) {
      setError(t('acceso.comun.noCoinciden'));
      return;
    }

    setEnviando(true);
    try {
      await api.cambiarMiContrasena(actual, nueva);
      alTerminar();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <DisenoAcceso
      icono="llave"
      titulo={t('acceso.contrasena.cambio.titulo')}
      subtitulo={
        nombre
          ? t('acceso.contrasena.cambio.subtituloConNombre', { nombre })
          : t('acceso.contrasena.cambio.subtitulo')
      }
      nota={t('acceso.contrasena.cambio.nota')}
    >
      <div className="col g16">
        {error && <Alerta variante="error">{error}</Alerta>}

        <Alerta variante="adv">{t('acceso.contrasena.cambio.aviso')}</Alerta>

        <form onSubmit={guardar} className="col g16">
          <CampoTexto
            etiqueta={t('acceso.contrasena.cambio.temporal')}
            obligatorio
            type="password"
            autoComplete="current-password"
            placeholder={t('acceso.contrasena.cambio.temporalEjemplo')}
            value={actual}
            onChange={(e) => setActual(e.target.value)}
          />
          <CampoTexto
            etiqueta={t('acceso.comun.contrasenaNueva')}
            obligatorio
            type="password"
            autoComplete="new-password"
            placeholder={t('acceso.comun.alMenos8')}
            ayuda={t('acceso.comun.ayudaContrasena')}
            error={
              igualALaTemporal
                ? t('acceso.contrasena.cambio.igualTemporalCampo')
                : tocada && faltas.length > 0
                  ? t('comun.contrasena.falta', { faltas: enumerar(faltas) })
                  : undefined
            }
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
          />
          <CampoTexto
            etiqueta={t('acceso.comun.repetirNueva')}
            obligatorio
            type="password"
            autoComplete="new-password"
            error={noCoinciden ? t('acceso.comun.noCoinciden') : undefined}
            value={repetir}
            onChange={(e) => setRepetir(e.target.value)}
          />
          <Boton type="submit" variante="primario" bloque disabled={enviando}>
            <Icono nombre="entrar" tamano={18} />
            {enviando ? t('comun.guardando') : t('acceso.contrasena.cambio.guardarYEntrar')}
          </Boton>
        </form>
      </div>
    </DisenoAcceso>
  );
}
