import type { ReactNode } from 'react';
import { Icono, type NombreIcono } from './Iconos';
import { Marca } from './Marca';
import { PasosDeAlta } from './PasosDeAlta';

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
            Tu rancho entero,
            <br />
            en el bolsillo
          </h2>
          <p className="acceso__bajada">
            Animales, corrales, vacunas y pesajes. Desde el celular, aunque no
            haya señal.
          </p>
        </div>

        <p className="acceso__pie">© 2026 Gestión de Ganado</p>
      </aside>

      <main className="acceso__contenido">
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
