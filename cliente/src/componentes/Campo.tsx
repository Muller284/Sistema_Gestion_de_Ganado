import { useId, useState } from 'react';
import { t } from '../servicios/idioma';
import { Icono } from './Iconos';
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from 'react';

/**
 * HU-05 · Campo.
 *
 * Etiqueta, control, ayuda y mensaje de error, siempre en ese orden y siempre
 * con la etiqueta unida al control. Eso ultimo no es un detalle: sin el, el
 * formulario no se puede completar con el teclado ni con un lector de pantalla.
 *
 * Campo       la envoltura, por si el control no es un input ni un select.
 * CampoTexto  un input de cualquier tipo.
 * CampoLista  un select.
 * CampoContrasena  un input de contraseña con el botón del ojo para ver lo
 *             que se va escribiendo.
 */

interface PropiedadesComunes {
  etiqueta: string;
  ayuda?: string;
  error?: string;
  obligatorio?: boolean;
  /** Sube el alto de los controles a 52 px para pantallas de celular. */
  movil?: boolean;
}

function clasesEnvoltura(error?: string, movil?: boolean) {
  const clases = ['campo'];
  if (error) clases.push('error');
  if (movil) clases.push('campo-movil');
  return clases.join(' ');
}

interface PropiedadesCampo extends PropiedadesComunes {
  /** Recibe el identificador que hay que ponerle al control. */
  children: (id: string) => ReactNode;
}

export function Campo({
  etiqueta,
  ayuda,
  error,
  obligatorio = false,
  movil = false,
  children,
}: PropiedadesCampo) {
  const id = useId();

  return (
    <div className={clasesEnvoltura(error, movil)}>
      <label htmlFor={id}>
        {etiqueta}
        {obligatorio && <span aria-hidden="true"> *</span>}
      </label>
      {children(id)}
      {ayuda && !error && <span className="ayuda">{ayuda}</span>}
      {error && (
        <span className="msg-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

interface PropiedadesCampoTexto
  extends PropiedadesComunes,
    Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'required'> {
  /** Identificadores, caravanas y codigos: van en monoespaciada. */
  mono?: boolean;
}

export function CampoTexto({
  etiqueta,
  ayuda,
  error,
  obligatorio = false,
  movil = false,
  mono = false,
  className,
  ...resto
}: PropiedadesCampoTexto) {
  const clases = [mono ? 'dato' : '', className ?? ''].filter(Boolean).join(' ');

  return (
    <Campo
      etiqueta={etiqueta}
      ayuda={ayuda}
      error={error}
      obligatorio={obligatorio}
      movil={movil}
    >
      {(id) => (
        <input
          id={id}
          className={clases || undefined}
          required={obligatorio}
          aria-invalid={error ? true : undefined}
          {...resto}
        />
      )}
    </Campo>
  );
}

interface PropiedadesCampoLista
  extends PropiedadesComunes,
    Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id' | 'required'> {
  children: ReactNode;
}

export function CampoLista({
  etiqueta,
  ayuda,
  error,
  obligatorio = false,
  movil = false,
  className,
  children,
  ...resto
}: PropiedadesCampoLista) {
  return (
    <Campo
      etiqueta={etiqueta}
      ayuda={ayuda}
      error={error}
      obligatorio={obligatorio}
      movil={movil}
    >
      {(id) => (
        <select
          id={id}
          className={className}
          required={obligatorio}
          aria-invalid={error ? true : undefined}
          {...resto}
        >
          {children}
        </select>
      )}
    </Campo>
  );
}

type PropiedadesCampoContrasena = Omit<PropiedadesCampoTexto, 'type' | 'mono'>;

/**
 * Contraseña con el botón del ojo: muestra u oculta lo escrito. Se usa en
 * todos los lugares donde se escribe una contraseña. El botón queda dentro
 * del campo, a la derecha, y dice con aria-pressed si está mostrando.
 */
export function CampoContrasena({
  etiqueta,
  ayuda,
  error,
  obligatorio = false,
  movil = false,
  className,
  ...resto
}: PropiedadesCampoContrasena) {
  const [visible, setVisible] = useState(false);

  return (
    <Campo
      etiqueta={etiqueta}
      ayuda={ayuda}
      error={error}
      obligatorio={obligatorio}
      movil={movil}
    >
      {(id) => (
        <div className="campo-contrasena">
          <input
            id={id}
            className={className}
            type={visible ? 'text' : 'password'}
            required={obligatorio}
            aria-invalid={error ? true : undefined}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            {...resto}
          />
          <button
            type="button"
            className="campo-contrasena__ojo"
            aria-label={visible ? t('comun.contrasena.ocultar') : t('comun.contrasena.mostrar')}
            aria-pressed={visible}
            aria-controls={id}
            title={visible ? t('comun.contrasena.ocultar') : t('comun.contrasena.mostrar')}
            onClick={() => setVisible((previo) => !previo)}
          >
            <Icono nombre={visible ? 'ojo-cerrado' : 'ojo'} tamano={20} />
          </button>
        </div>
      )}
    </Campo>
  );
}
