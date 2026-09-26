import {
  cambiarUsuario,
  limpiarSesionLocal,
  usuarioActual,
} from '../servicios/api';

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
 * "Empezar de cero" olvida el usuario y devuelve al registro. Es lo único que
 * permite recorrer el alta entera de principio a fin sin borrar el
 * almacenamiento del navegador a mano. No es el cierre de sesión de HU-12:
 * eso es de Favio y vive en el producto, esto vive en la barra provisional y
 * se borra con ella.
 */

const CUENTAS = [
  { id: 'a1000000-0000-4000-8000-000000000001', nombre: 'Carlos · propietario con rancho' },
  { id: 'a1000000-0000-4000-8000-000000000002', nombre: 'María René · socia' },
  { id: 'c1000000-0000-4000-8000-000000000001', nombre: 'Ariel · propietario sin rancho' },
  { id: 'c1000000-0000-4000-8000-000000000002', nombre: 'Lucía · correo sin confirmar' },
  { id: 'c1000000-0000-4000-8000-000000000003', nombre: 'Rubén · con clave temporal' },
];

export function BarraDemostracion() {
  // Se lee en cada renderizado y no se guarda en el estado: si se guardara,
  // al registrarse una cuenta nueva la barra seguiria mostrando la anterior.
  const id = usuarioActual();

  function elegir(nuevo: string) {
    cambiarUsuario(nuevo);
    // Se recarga entera para que todas las pantallas vuelvan a preguntar por
    // la cuenta. Es lo más simple y esto no va al producto.
    window.location.reload();
  }

  function empezarDeCero() {
    limpiarSesionLocal();
    window.location.hash = '#/ingreso';
    window.location.reload();
  }

  return (
    <div className="barra-demo">
      <span className="etiqueta-demo">Demostración</span>
      <label className="solo-lectores" htmlFor="barra-demo-usuario">
        Usuario con el que se muestra el sistema
      </label>
      <select
        id="barra-demo-usuario"
        value={CUENTAS.some((c) => c.id === id) ? id : ''}
        onChange={(e) => elegir(e.target.value)}
      >
        <option value="" disabled>
          Elegir cuenta…
        </option>
        {CUENTAS.map((cuenta) => (
          <option key={cuenta.id} value={cuenta.id}>
            {cuenta.nombre}
          </option>
        ))}
      </select>
      <button type="button" className="enlace-demo" onClick={empezarDeCero}>
        Empezar de cero
      </button>
      <span className="pie">Se reemplaza por el inicio de sesión (HU-08).</span>
    </div>
  );
}
