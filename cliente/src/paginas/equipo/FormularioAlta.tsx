import { useState } from 'react';
import { Link } from 'react-router-dom';
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
import { t, tJsx } from '../../servicios/idioma';
import { nombreRol, nombreTipo, resumenPermisos } from '../../servicios/permisos';

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

// El nombre sale de roles.<clave> y la explicación de equipo.alta.roles.<clave>;
// se traducen al dibujar.
const ROLES: { clave: Rol; icono: NombreIcono }[] = [
  { clave: 'socio', icono: 'equipo' },
  { clave: 'colaborador', icono: 'sanidad' },
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

  const predefinidos = tipos.filter((tp) => tp.es_predefinido);
  const propios = tipos.filter((tp) => !tp.es_predefinido);
  const elegido = tipos.find((tp) => tp.id === tipo);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setErrorCorreo('');

    if (rol === 'colaborador' && !tipo) {
      setError(t('equipo.alta.faltaTipo'));
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
      // El servidor contesta en el idioma de la interfaz: se buscan las dos.
      if (/correo|equipo|email|team/i.test(mensaje)) setErrorCorreo(mensaje);
      else setError(mensaje);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Tarjeta
      titulo={t('equipo.alta.titulo')}
      accion={
        <button type="button" className="btn btn-fantasma" onClick={alCancelar} aria-label={t('equipo.alta.cerrar')}>
          <Icono nombre="cerrar" tamano={18} />
        </button>
      }
    >
      <form className="col g20 equipo__formulario" onSubmit={enviar}>
        {error && <Alerta variante="error">{error}</Alerta>}

        <div className="par-formulario">
          <CampoTexto
            etiqueta={t('equipo.alta.nombre')}
            obligatorio
            autoComplete="off"
            maxLength={150}
            placeholder={t('equipo.alta.nombreEjemplo')}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
          <CampoTexto
            etiqueta={t('equipo.alta.correo')}
            obligatorio
            type="email"
            autoComplete="off"
            maxLength={150}
            placeholder={t('equipo.alta.correoEjemplo')}
            ayuda={t('equipo.alta.correoAyuda')}
            error={errorCorreo || undefined}
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
          />
        </div>

        <fieldset className="equipo__roles">
          <legend className="etiqueta-campo">{t('equipo.alta.rol')}</legend>
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
                <strong>{nombreRol(r.clave)}</strong>
                <span className="pie c-500">{t(`equipo.alta.roles.${r.clave}`)}</span>
              </span>
            </label>
          ))}
        </fieldset>

        {rol === 'colaborador' && (
          <CampoLista
            etiqueta={t('equipo.alta.tipo')}
            obligatorio
            ayuda={t('equipo.alta.tipoAyuda')}
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
          >
            <option value="" disabled>
              {t('equipo.alta.elegirTipo')}
            </option>
            <optgroup label={t('equipo.alta.predefinidos')}>
              {predefinidos.map((tp) => (
                <option key={tp.id} value={tp.id}>
                  {nombreTipo(tp)}
                </option>
              ))}
            </optgroup>
            {propios.length > 0 && (
              <optgroup label={t('equipo.alta.propios')}>
                {propios.map((tp) => (
                  <option key={tp.id} value={tp.id}>
                    {tp.nombre}
                  </option>
                ))}
              </optgroup>
            )}
          </CampoLista>
        )}

        {rol === 'colaborador' && elegido && (
          <p className="pie c-600 equipo__resumen-tipo" aria-live="polite">
            <Icono nombre="info" tamano={14} />
            <span>
              {tJsx(
                'equipo.alta.resumenTipo',
                { enlace: (s) => <Link to="/equipo/tipos">{s}</Link> },
                { resumen: resumenPermisos(elegido) || t('equipo.alta.tipoSinAcceso') },
              )}
            </span>
          </p>
        )}

        <p className="equipo__nota">
          <Icono nombre="llave" tamano={16} />
          {t('equipo.alta.nota')}
        </p>

        <div className="fila g8 equipo__botones">
          <Boton type="button" variante="secundario" onClick={alCancelar} disabled={enviando}>
            {t('comun.cancelar')}
          </Boton>
          <Boton type="submit" variante="primario" disabled={enviando}>
            <Icono nombre="enviar" tamano={18} />
            {enviando ? t('equipo.alta.enviando') : t('equipo.alta.enviar')}
          </Boton>
        </div>
      </form>
    </Tarjeta>
  );
}
