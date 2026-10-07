import {
  cambiarUsuario,
  limpiarSesionLocal,
  guardarSoporte,
  usuarioActual,
} from '../servicios/api';
import { t } from '../servicios/idioma';

/**
 * Barra de demostración. PROVISIONAL, y se borra sola cuando exista HU-08.
 *
 * Mientras no hay inicio de sesión, el usuario se indica con una cabecera.
 * Esta barra permite cambiarlo para mostrar el sistema desde cada rol sin
 * tener que abrir la consola del navegador.
 *
 * Está abajo y en letra chica a propósito: no forma parte del producto y no
 * debe competir con la pantalla. Cuando HU-08 esté lista, se borra este
 * archivo y su uso en App.tsx, y no hay que tocar nada más.
 *
 * "Empezar de cero" olvida el usuario y devuelve a la landing. Es lo único que
 * permite recorrer el alta entera de principio a fin sin borrar el
 * almacenamiento del navegador a mano. No es el cierre de sesión de HU-12:
 * eso es de Favio y vive en el producto, esto vive en la barra provisional y
 * se borra con ella.
 */

// nombre es la clave del texto en el archivo de idioma; se traduce al dibujar.
const CUENTAS = [
  { id: 'a1000000-0000-4000-8000-000000000001', nombre: 'app.demo.cuentas.carlos' },
  { id: 'a1000000-0000-4000-8000-000000000002', nombre: 'app.demo.cuentas.mariaRene' },
  { id: 'c1000000-0000-4000-8000-000000000001', nombre: 'app.demo.cuentas.ariel' },
  { id: 'c1000000-0000-4000-8000-000000000002', nombre: 'app.demo.cuentas.lucia' },
  { id: 'c1000000-0000-4000-8000-000000000003', nombre: 'app.demo.cuentas.ruben' },
  // HU-24
  { id: 'f0000000-0000-4000-8000-000000000001', nombre: 'app.demo.cuentas.admin' },
];

const ADMIN = 'f0000000-0000-4000-8000-000000000001';

export function BarraDemostracion() {
  // Se lee en cada renderizado y no se guarda en el estado: si se guardara,
  // al registrarse una cuenta nueva la barra seguiria mostrando la anterior.
  const id = usuarioActual();

  function elegir(nuevo: string) {
    cambiarUsuario(nuevo);
    // Otra cuenta no hereda el rancho al que había entrado el Admin (HU-24).
    guardarSoporte(null);
    // Desde la landing se va directo al panel: elegir una cuenta es querer
    // verla por dentro. En cualquier otra pantalla, se queda donde está. El
    // Admin de plataforma no tiene panel de rancho: va a la suya.
    if (nuevo === ADMIN) window.location.hash = '#/admin';
    else if (/^#?\/?$/.test(window.location.hash)) window.location.hash = '#/rancho';
    // Se recarga entera para que todas las pantallas vuelvan a preguntar por
    // la cuenta. Es lo más simple y esto no va al producto.
    window.location.reload();
  }

  function empezarDeCero() {
    limpiarSesionLocal();
    // Sin nadie adentro, "/" muestra la landing: es el principio de verdad.
    window.location.hash = '#/';
    window.location.reload();
  }

  return (
    <div className="barra-demo">
      <span className="etiqueta-demo">{t('app.demo.etiqueta')}</span>
      <label className="solo-lectores" htmlFor="barra-demo-usuario">
        {t('app.demo.usuario')}
      </label>
      <select
        id="barra-demo-usuario"
        value={CUENTAS.some((c) => c.id === id) ? id : ''}
        onChange={(e) => elegir(e.target.value)}
      >
        <option value="" disabled>
          {t('app.demo.elegirCuenta')}
        </option>
        {CUENTAS.map((cuenta) => (
          <option key={cuenta.id} value={cuenta.id}>
            {t(cuenta.nombre)}
          </option>
        ))}
      </select>
      <button type="button" className="enlace-demo" onClick={empezarDeCero}>
        {t('app.demo.empezarDeCero')}
      </button>
      <span className="pie">{t('app.demo.provisional')}</span>
    </div>
  );
}
