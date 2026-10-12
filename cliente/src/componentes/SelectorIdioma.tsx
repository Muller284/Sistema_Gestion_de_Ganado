import { useState } from 'react';
import { Icono } from './Iconos';
import { api, hayAlguienDentro } from '../servicios/api';
import { cambiarIdioma, t, useIdioma } from '../servicios/idioma';

/**
 * HU-25 · El selector de idioma.
 *
 * Es una lista y no dos botones "ES / EN": los idiomas salen de los archivos
 * de la carpeta idiomas/, y sumar uno (criterio 3) lo agrega acá solo, sin
 * tocar esta pantalla.
 *
 * Sin sesión (landing, ingreso, registro) el idioma elegido se recuerda en el
 * navegador. Con sesión, además se guarda en la cuenta, PRIMERO, y después se
 * cambia la pantalla: al cambiar, la aplicación vuelve a preguntar por la
 * cuenta, y si el servidor todavía tuviera el idioma viejo lo devolvería.
 */
export function SelectorIdioma() {
  const { idioma, idiomas } = useIdioma();
  const [guardando, setGuardando] = useState(false);
  if (idiomas.length < 2) return null;

  async function elegir(codigo: string) {
    if (hayAlguienDentro()) {
      setGuardando(true);
      await api.actualizarPerfil({ idioma: codigo }).catch(() => undefined);
      setGuardando(false);
    }
    cambiarIdioma(codigo, { recordar: true });
  }

  return (
    <label className="selector-idioma">
      <Icono nombre="idioma" tamano={16} />
      <span className="solo-lectores">{t('comun.idioma')}</span>
      <select
        value={idioma}
        disabled={guardando}
        onChange={(e) => void elegir(e.target.value)}
      >
        {idiomas.map((opcion) => (
          <option key={opcion.codigo} value={opcion.codigo}>
            {opcion.nombre}
          </option>
        ))}
      </select>
    </label>
  );
}
