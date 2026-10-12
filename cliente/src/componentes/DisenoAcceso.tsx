import type { ReactNode } from 'react';
import { t, tJsx } from '../servicios/idioma';
import { Icono, type NombreIcono } from './Iconos';
import { Marca } from './Marca';
import { PasosDeAlta } from './PasosDeAlta';
import { SelectorIdioma } from './SelectorIdioma';

/**
 * El marco de las pantallas de acceso, tal como está en los mockups:
 * a la izquierda el panel verde con la marca y el titular, a la derecha una
 * columna angosta con el formulario.
 *
 * Lo usan el registro, la verificación del correo y el cambio de contraseña.
 * En pantalla chica el panel verde pasa a ser una franja arriba.
 */

interface Propiedades {
  titulo: string;
  subtitulo?: string;
  /** Emblema redondo arriba del título: dice de qué se trata la pantalla. */
  icono?: NombreIcono;
  /** En qué paso del alta está esta pantalla. Sin esto no se muestra el hilo. */
  paso?: 1 | 2 | 3;
  /** Va debajo del formulario, en letra chica y centrado. */
  nota?: ReactNode;
  children: ReactNode;
}

export function DisenoAcceso({
  titulo,
  subtitulo,
  icono,
  paso,
  nota,
  children,
}: Propiedades) {
  return (
    <div className="acceso">
      <aside className="acceso__panel">
        <Marca como="a" />

        <div>
          <h2 className="acceso__titular">
            {tJsx('acceso.marco.titular', { salto: () => <br /> })}
          </h2>
          <p className="acceso__bajada">{t('acceso.marco.bajada')}</p>
        </div>

        <p className="acceso__pie">{t('acceso.marco.pie')}</p>
      </aside>

      <main className="acceso__contenido">
        {/* HU-25: antes de entrar no hay cuenta de dónde sacar el idioma. */}
        <div className="acceso__idioma">
          <SelectorIdioma />
        </div>
        <div className="acceso__columna">
          {paso && <PasosDeAlta actual={paso} />}
          {icono && (
            <span className="acceso__emblema">
              <Icono nombre={icono} tamano={24} />
            </span>
          )}
          <h1 className="acceso__titulo">{titulo}</h1>
          {subtitulo && <p className="acceso__subtitulo">{subtitulo}</p>}
          {children}
          {nota && <p className="acceso__nota">{nota}</p>}
        </div>
      </main>
    </div>
  );
}
