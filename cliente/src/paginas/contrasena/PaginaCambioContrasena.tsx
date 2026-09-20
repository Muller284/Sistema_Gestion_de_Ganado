import { useState } from 'react';
import { Alerta, Boton, CampoTexto, DisenoAcceso, Icono } from '../../componentes';
import { api } from '../../servicios/api';

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

function faltasDeContrasena(contrasena: string): string[] {
  const faltas: string[] = [];
  if (contrasena.length < 8) faltas.push('ocho caracteres');
  if (!/[A-ZÁÉÍÓÚÑ]/.test(contrasena)) faltas.push('una mayúscula');
  if (!/[0-9]/.test(contrasena)) faltas.push('un número');
  return faltas;
}

function enumerar(partes: string[]): string {
  if (partes.length <= 1) return partes.join('');
  return `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`;
}

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
      setError('La contraseña nueva no puede ser igual a la temporal.');
      return;
    }
    if (faltas.length > 0) {
      setError(`La contraseña necesita al menos ${enumerar(faltas)}.`);
      return;
    }
    if (nueva !== repetir) {
      setError('Las dos contraseñas no coinciden.');
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
      titulo="Cambia tu contraseña"
      subtitulo={
        nombre
          ? `${nombre}, entraste con una contraseña temporal.`
          : 'Entraste con una contraseña temporal.'
      }
      nota="Hasta que la cambies no puedes usar el resto del sistema."
    >
      <div className="col g16">
        {error && <Alerta variante="error">{error}</Alerta>}

        <Alerta variante="adv">
          Nadie más conoce tu contraseña nueva, ni siquiera el propietario del
          rancho. Por eso el registro de quién cargó cada dato tiene valor.
        </Alerta>

        <form onSubmit={guardar} className="col g16">
          <CampoTexto
            etiqueta="Contraseña temporal"
            obligatorio
            type="password"
            autoComplete="current-password"
            placeholder="La que te enviaron"
            value={actual}
            onChange={(e) => setActual(e.target.value)}
          />
          <CampoTexto
            etiqueta="Contraseña nueva"
            obligatorio
            type="password"
            autoComplete="new-password"
            placeholder="Al menos 8 caracteres"
            ayuda="Usa al menos 8 caracteres, con una mayúscula y un número."
            error={
              igualALaTemporal
                ? 'No puede ser igual a la temporal.'
                : tocada && faltas.length > 0
                  ? `Falta al menos ${enumerar(faltas)}.`
                  : undefined
            }
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
          />
          <CampoTexto
            etiqueta="Repetir la contraseña nueva"
            obligatorio
            type="password"
            autoComplete="new-password"
            error={noCoinciden ? 'Las dos contraseñas no coinciden.' : undefined}
            value={repetir}
            onChange={(e) => setRepetir(e.target.value)}
          />
          <Boton type="submit" variante="primario" bloque disabled={enviando}>
            <Icono nombre="entrar" tamano={18} />
            {enviando ? 'Guardando…' : 'Guardar y entrar'}
          </Boton>
        </form>
      </div>
    </DisenoAcceso>
  );
}
