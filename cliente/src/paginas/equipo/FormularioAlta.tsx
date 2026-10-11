import { useState } from 'react';
import {
  Alerta,
  Boton,
  CampoLista,
  CampoTexto,
  Icono,
  Tarjeta,
  type NombreIcono,
} from '../../componentes';
import { api, type MiembroEquipo, type TipoColaborador } from '../../servicios/api';

/**
 * HU-17 · El formulario de alta de un socio o un colaborador.
 *
 * El rol se elige con dos tarjetas y no con una lista: la diferencia entre
 * socio y colaborador es justamente lo que el propietario tiene que entender
 * al elegir, y una lista esconde esa explicación.
 *
 * La contraseña temporal no aparece nunca en pantalla: le llega por correo al
 * integrante (misma regla que HU-10).
 */

type Rol = 'socio' | 'colaborador';

const ROLES: { clave: Rol; nombre: string; texto: string; icono: NombreIcono }[] = [
  {
    clave: 'socio',
    nombre: 'Socio',
    texto: 'Ve toda la información del rancho, sin modificarla.',
    icono: 'equipo',
  },
  {
    clave: 'colaborador',
    nombre: 'Colaborador',
    texto: 'Carga lo de su trabajo, según su tipo: sanidad, pesajes, campo…',
    icono: 'sanidad',
  },
];

interface Propiedades {
  tipos: TipoColaborador[];
  alDarDeAlta: (miembro: MiembroEquipo, mensaje: string, detalle: string) => void;
  alCancelar: () => void;
}

export function FormularioAlta({ tipos, alDarDeAlta, alCancelar }: Propiedades) {
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [rol, setRol] = useState<Rol>('colaborador');
  const [tipo, setTipo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [errorCorreo, setErrorCorreo] = useState('');

  const predefinidos = tipos.filter((t) => t.es_predefinido);
  const propios = tipos.filter((t) => !t.es_predefinido);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setErrorCorreo('');

    if (rol === 'colaborador' && !tipo) {
      setError('Elige qué tipo de colaborador es: define a qué módulos va a entrar.');
      return;
    }

    setEnviando(true);
    try {
      const respuesta = await api.darDeAltaMiembro({
        id: crypto.randomUUID(),
        nombre: nombre.trim(),
        correo: correo.trim(),
        rol,
        ...(rol === 'colaborador' ? { tipo_colaborador_id: tipo } : {}),
      });
      alDarDeAlta(respuesta.miembro, respuesta.mensaje, respuesta.aviso);
    } catch (err) {
      const mensaje = (err as Error).message;
      // El del correo repetido va debajo del campo, donde está el problema.
      if (/correo|equipo/i.test(mensaje)) setErrorCorreo(mensaje);
      else setError(mensaje);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Tarjeta
      titulo="Nuevo integrante"
      accion={
        <button type="button" className="btn btn-fantasma" onClick={alCancelar} aria-label="Cerrar el formulario">
          <Icono nombre="cerrar" tamano={18} />
        </button>
      }
    >
      <form className="col g20 equipo__formulario" onSubmit={enviar}>
        {error && <Alerta variante="error">{error}</Alerta>}

        <div className="par-formulario">
          <CampoTexto
            etiqueta="Nombre y apellido"
            obligatorio
            autoComplete="off"
            maxLength={150}
            placeholder="Ej. Jorge Soliz"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
          <CampoTexto
            etiqueta="Correo"
            obligatorio
            type="email"
            autoComplete="off"
            maxLength={150}
            placeholder="nombre@correo.com"
            ayuda="Ahí le llega su contraseña temporal."
            error={errorCorreo || undefined}
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
          />
        </div>

        <fieldset className="equipo__roles">
          <legend className="etiqueta-campo">Rol</legend>
          {ROLES.map((r) => (
            <label key={r.clave} className={rol === r.clave ? 'equipo__rol-opcion elegido' : 'equipo__rol-opcion'}>
              <input
                type="radio"
                name="rol"
                value={r.clave}
                checked={rol === r.clave}
                onChange={() => setRol(r.clave)}
              />
              <span className="equipo__rol-icono">
                <Icono nombre={r.icono} tamano={20} />
              </span>
              <span>
                <strong>{r.nombre}</strong>
                <span className="pie c-500">{r.texto}</span>
              </span>
            </label>
          ))}
        </fieldset>

        {rol === 'colaborador' && (
          <CampoLista
            etiqueta="Tipo de colaborador"
            obligatorio
            ayuda="El tipo decide a qué módulos entra. Arranca solo con permiso de consulta."
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
          >
            <option value="" disabled>
              Elegir tipo…
            </option>
            <optgroup label="Predefinidos">
              {predefinidos.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                </option>
              ))}
            </optgroup>
            {propios.length > 0 && (
              <optgroup label="De tu rancho">
                {propios.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                  </option>
                ))}
              </optgroup>
            )}
          </CampoLista>
        )}

        <p className="equipo__nota">
          <Icono nombre="llave" tamano={16} />
          Le enviamos una contraseña temporal a su correo y la cambia la primera vez
          que entra. Tú no la vas a ver: así, lo que cargue queda a su nombre.
        </p>

        <div className="fila g8 equipo__botones">
          <Boton type="button" variante="secundario" onClick={alCancelar} disabled={enviando}>
            Cancelar
          </Boton>
          <Boton type="submit" variante="primario" disabled={enviando}>
            <Icono nombre="enviar" tamano={18} />
            {enviando ? 'Dando de alta…' : 'Dar de alta'}
          </Boton>
        </div>
      </form>
    </Tarjeta>
  );
}
