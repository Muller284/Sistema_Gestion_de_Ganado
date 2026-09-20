import { useState } from 'react';
import { cambiarUsuario, usuarioActual } from '../servicios/api';

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
 */

const CUENTAS = [
  { id: 'a1000000-0000-4000-8000-000000000001', nombre: 'Carlos · propietario con rancho' },
  { id: 'a1000000-0000-4000-8000-000000000002', nombre: 'María René · socia' },
  { id: 'c1000000-0000-4000-8000-000000000001', nombre: 'Ariel · propietario sin rancho' },
  { id: 'c1000000-0000-4000-8000-000000000002', nombre: 'Lucía · correo sin confirmar' },
  { id: 'c1000000-0000-4000-8000-000000000003', nombre: 'Rubén · con clave temporal' },
];

export function BarraDemostracion() {
  const [id, setId] = useState(usuarioActual());

  function elegir(nuevo: string) {
    setId(nuevo);
    cambiarUsuario(nuevo);
    // Se recarga entera para que todas las pantallas vuelvan a preguntar por
    // la cuenta. Es lo más simple y esto no va al producto.
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
      <span className="pie">Se reemplaza por el inicio de sesión (HU-08).</span>
    </div>
  );
}
