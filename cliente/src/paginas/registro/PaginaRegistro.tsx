import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
import { t, tJsx } from '../../servicios/idioma';
import { enumerar, faltasDeContrasena } from '../../servicios/texto';

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
      setError(t('comun.contrasena.necesita', { faltas: enumerar(faltas) }));
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
      // El servidor lo manda en el idioma de la interfaz: "correo" o "email".
      if (/correo|e-?mail/i.test(mensaje)) setErrorCorreo(mensaje);
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
        titulo={t('acceso.registro.revisa.titulo')}
        subtitulo={t('acceso.registro.revisa.subtitulo', { correo: listo.usuario.correo })}
        nota={t('acceso.registro.revisa.nota')}
      >
        <div className="col g16">
          <Alerta variante="exito">
            {t('acceso.registro.revisa.creada', { nombre: listo.usuario.nombre })}
          </Alerta>
          <p className="cuerpo c-600">{t('acceso.registro.revisa.confirma')}</p>
          <Link className="btn btn-secundario btn-bloque" to="/verificar">
            <Icono nombre="enviar" tamano={18} />
            {t('acceso.registro.revisa.pedirOtro')}
          </Link>
          {listo.enlace_verificacion && (
            <Alerta variante="info">
              {tJsx('acceso.comun.enlaceDesarrollo', {
                enlace: (s) => <a href={listo.enlace_verificacion ?? undefined}>{s}</a>,
              })}
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
      titulo={t('acceso.registro.titulo')}
      subtitulo={t('acceso.registro.subtitulo')}
      nota={t('acceso.registro.nota')}
    >
      <div className="col g16">
        {error && <Alerta variante="error">{error}</Alerta>}

        {cargando && <Cargando lineas={4} />}

        {!cargando && (
          <form onSubmit={registrar} className="col g16">
            <CampoTexto
              etiqueta={t('acceso.registro.nombre')}
              obligatorio
              autoComplete="name"
              maxLength={150}
              placeholder={t('acceso.registro.nombreEjemplo')}
              {...campo('nombre')}
            />
            <CampoTexto
              etiqueta={t('acceso.comun.correo')}
              obligatorio
              type="email"
              autoComplete="email"
              maxLength={150}
              placeholder={t('acceso.comun.correoEjemplo')}
              error={errorCorreo || undefined}
              {...campo('correo')}
            />
            <CampoTexto
              etiqueta={t('acceso.comun.contrasena')}
              obligatorio
              type="password"
              autoComplete="new-password"
              placeholder={t('acceso.comun.alMenos8')}
              ayuda={t('acceso.comun.ayudaContrasena')}
              error={
                contrasenaTocada && faltas.length > 0
                  ? t('comun.contrasena.falta', { faltas: enumerar(faltas) })
                  : undefined
              }
              {...campo('contrasena')}
            />
            <CampoLista
              etiqueta={t('acceso.registro.pais')}
              obligatorio
              ayuda={t('acceso.registro.paisAyuda')}
              {...campo('pais_codigo')}
            >
              {paises.map((p) => (
                <option key={p.codigo} value={p.codigo}>
                  {p.nombre}
                </option>
              ))}
            </CampoLista>

            <p className="pie c-500 centrado">{t('acceso.registro.terminos')}</p>

            <Boton type="submit" variante="primario" bloque disabled={enviando}>
              <Icono nombre="persona-mas" tamano={18} />
              {enviando ? t('acceso.registro.creando') : t('acceso.registro.crear')}
            </Boton>

            <p className="pie c-500 centrado">
              {tJsx('acceso.registro.yaTienes', {
                enlace: (s) => <Link to="/ingreso">{s}</Link>,
              })}
            </p>
          </form>
        )}
      </div>
    </DisenoAcceso>
  );
}
