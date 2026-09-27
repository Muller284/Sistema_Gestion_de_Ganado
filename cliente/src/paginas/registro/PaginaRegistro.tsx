import { useEffect, useState } from 'react';
import {
  Alerta,
  Boton,
  CampoLista,
  CampoTexto,
  Cargando,
  DisenoAcceso,
  EsperaDeCorreo,
  Icono,
} from '../../componentes';
import { api, cambiarUsuario, type Pais, type RespuestaRegistro } from '../../servicios/api';

/**
 * HU-06 · Registro de propietario.
 *
 * Los cuatro criterios de aceptacion, del lado del cliente:
 *   1. Pide nombre, correo, contraseña y pais.
 *   2. Avisa en el momento si la contraseña no llega a ocho caracteres, una
 *      mayuscula y un numero. La regla tambien esta en el servidor: esto es
 *      para no hacerle perder el viaje al usuario, no para reemplazarla.
 *   3. El correo repetido lo rechaza el servidor y el mensaje se muestra tal
 *      cual, debajo del campo.
 *   4. La cuenta queda como propietario. No hay forma de elegir otro rol.
 *
 * El diseño es el del mockup Web / Acceso / Registro, con una diferencia: los
 * textos estan en español estandar y no en voseo, que es la convencion del
 * equipo. En el Figma quedaron en voseo y hay que corregirlos ahi tambien.
 */

const VACIO = {
  nombre: '',
  correo: '',
  contrasena: '',
  pais_codigo: 'BO',
};

/** Las mismas tres reglas que aplica el servidor, en el mismo orden. */
function faltasDeContrasena(contrasena: string): string[] {
  const faltas: string[] = [];
  if (contrasena.length < 8) faltas.push('ocho caracteres');
  if (!/[A-ZÁÉÍÓÚÑ]/.test(contrasena)) faltas.push('una mayúscula');
  if (!/[0-9]/.test(contrasena)) faltas.push('un número');
  return faltas;
}

/** "a, b y c", para que el mensaje se lea como una frase. */
function enumerar(partes: string[]): string {
  if (partes.length <= 1) return partes.join('');
  return `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`;
}

interface Propiedades {
  /** Se llama cuando la cuenta queda confirmada, para que App siga sola. */
  alConfirmar?: () => void;
}

export function PaginaRegistro({ alConfirmar }: Propiedades) {
  const [formulario, setFormulario] = useState({ ...VACIO });
  const [paises, setPaises] = useState<Pais[]>([]);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [errorCorreo, setErrorCorreo] = useState('');
  const [listo, setListo] = useState<RespuestaRegistro | null>(null);

  useEffect(() => {
    let vigente = true;
    void (async () => {
      try {
        const lista = await api.paises();
        if (vigente) setPaises(lista);
      } catch (e) {
        if (vigente) setError((e as Error).message);
      } finally {
        if (vigente) setCargando(false);
      }
    })();
    return () => {
      vigente = false;
    };
  }, []);

  function campo(nombre: keyof typeof VACIO) {
    return {
      value: formulario[nombre],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setFormulario({ ...formulario, [nombre]: e.target.value }),
    };
  }

  const faltas = faltasDeContrasena(formulario.contrasena);
  const contrasenaTocada = formulario.contrasena.length > 0;

  async function registrar(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setErrorCorreo('');

    if (faltas.length > 0) {
      setError(`La contraseña necesita al menos ${enumerar(faltas)}.`);
      return;
    }

    setEnviando(true);
    try {
      const respuesta = await api.registrar({
        // El identificador lo genera el cliente, como el resto del sistema.
        id: crypto.randomUUID(),
        nombre: formulario.nombre,
        correo: formulario.correo,
        contrasena: formulario.contrasena,
        pais_codigo: formulario.pais_codigo,
      });
      cambiarUsuario(respuesta.usuario.id);
      setListo(respuesta);
    } catch (err) {
      const mensaje = (err as Error).message;
      // El del correo repetido va debajo del campo, donde esta el problema.
      if (mensaje.toLowerCase().includes('correo')) setErrorCorreo(mensaje);
      else setError(mensaje);
    } finally {
      setEnviando(false);
    }
  }

  if (listo) {
    return (
      <DisenoAcceso
        paso={2}
        icono="correo"
        titulo="Revisa tu correo"
        subtitulo={`Le enviamos un enlace de confirmación a ${listo.usuario.correo}.`}
        nota="El enlace vence en 24 horas. Si no llega, puedes pedir otro."
      >
        <div className="col g16">
          <Alerta variante="exito">
            Cuenta creada a nombre de {listo.usuario.nombre}.
          </Alerta>
          <p className="cuerpo c-600">
            Confirma el correo para activar la cuenta. Hasta entonces no se
            puede entrar al sistema.
          </p>
          <a className="btn btn-secundario btn-bloque" href="#/verificar">
            <Icono nombre="enviar" tamano={18} />
            No me llegó, pedir otro
          </a>
          {listo.enlace_verificacion && (
            <Alerta variante="info">
              En desarrollo el correo se escribe en la consola del servidor.
              Este es el enlace:{' '}
              <a href={listo.enlace_verificacion}>ábrelo aquí</a>.
            </Alerta>
          )}

          <EsperaDeCorreo alConfirmar={() => alConfirmar?.()} />
        </div>
      </DisenoAcceso>
    );
  }

  return (
    <DisenoAcceso
      paso={1}
      icono="persona-mas"
      titulo="Crea tu cuenta"
      subtitulo="10 días con todas las funciones. Sin tarjeta."
      nota="Cuando terminen los 10 días tu cuenta pasa al plan Gratis. No se bloquea y no pierdes nada."
    >
      <div className="col g16">
        {error && <Alerta variante="error">{error}</Alerta>}

        {cargando && <Cargando lineas={4} />}

        {!cargando && (
          <form onSubmit={registrar} className="col g16">
            <CampoTexto
              etiqueta="Nombre y apellido"
              obligatorio
              autoComplete="name"
              maxLength={150}
              placeholder="Ej. Aaron Vargas"
              {...campo('nombre')}
            />
            <CampoTexto
              etiqueta="Correo"
              obligatorio
              type="email"
              autoComplete="email"
              maxLength={150}
              placeholder="tu@ejemplo.com"
              error={errorCorreo || undefined}
              {...campo('correo')}
            />
            <CampoTexto
              etiqueta="Contraseña"
              obligatorio
              type="password"
              autoComplete="new-password"
              placeholder="Al menos 8 caracteres"
              ayuda="Usa al menos 8 caracteres, con una mayúscula y un número."
              error={
                contrasenaTocada && faltas.length > 0
                  ? `Falta al menos ${enumerar(faltas)}.`
                  : undefined
              }
              {...campo('contrasena')}
            />
            <CampoLista
              etiqueta="País"
              obligatorio
              ayuda="Define el idioma, la moneda y las unidades de medida. Lo puedes cambiar después."
              {...campo('pais_codigo')}
            >
              {paises.map((p) => (
                <option key={p.codigo} value={p.codigo}>
                  {p.nombre}
                </option>
              ))}
            </CampoLista>

            <p className="pie c-500 centrado">
              Acepto los términos del servicio y la política de privacidad.
            </p>

            <Boton type="submit" variante="primario" bloque disabled={enviando}>
              <Icono nombre="persona-mas" tamano={18} />
              {enviando ? 'Creando…' : 'Crear cuenta'}
            </Boton>
          </form>
        )}
      </div>
    </DisenoAcceso>
  );
}
