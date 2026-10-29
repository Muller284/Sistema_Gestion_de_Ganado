import { useState, type KeyboardEvent } from 'react';
import { Campo } from './Campo';

/**
 * HU-28 · CampoBuscador.
 *
 * Un campo de texto con una lista que se abre debajo y se filtra mientras se
 * escribe (un combobox). Quien lo usa le pasa las opciones ya filtradas y en
 * grupos; el componente solo se encarga de mostrarlas y de elegir con el
 * mouse o con el teclado (flechas, Enter y Escape).
 *
 * Si se pasa `opcionNueva`, aparece al final de la lista: sirve para aceptar
 * lo escrito aunque no esté entre las opciones.
 */

export interface GrupoBuscador {
  titulo: string;
  opciones: string[];
}

interface PropiedadesCampoBuscador {
  etiqueta: string;
  ayuda?: string;
  error?: string;
  placeholder?: string;
  maxLength?: number;
  value: string;
  onChange: (valor: string) => void;
  grupos: GrupoBuscador[];
  /** Texto de la opción para aceptar lo escrito tal cual. */
  opcionNueva?: string;
  /** Lo que se ve cuando no hay nada para elegir. */
  sinResultados: string;
}

export function CampoBuscador({
  etiqueta,
  ayuda,
  error,
  placeholder,
  maxLength,
  value,
  onChange,
  grupos,
  opcionNueva,
  sinResultados,
}: PropiedadesCampoBuscador) {
  const [abierto, setAbierto] = useState(false);
  const [activa, setActiva] = useState(-1);

  // Todas las opciones en fila, para moverse con las flechas. La nueva va al final.
  const enFila = grupos.flatMap((g) => g.opciones);
  const inicios = grupos.map((_, g) => grupos.slice(0, g).reduce((n, previo) => n + previo.opciones.length, 0));
  const total = enFila.length + (opcionNueva ? 1 : 0);

  function elegir(indice: number) {
    if (indice < enFila.length) onChange(enFila[indice]);
    setAbierto(false);
    setActiva(-1);
  }

  function teclado(evento: KeyboardEvent<HTMLInputElement>) {
    if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
      evento.preventDefault();
      if (!abierto) setAbierto(true);
      if (total === 0) return;
      const paso = evento.key === 'ArrowDown' ? 1 : -1;
      setActiva((actual) => (actual + paso + total) % total);
    } else if (evento.key === 'Enter' && abierto && activa >= 0) {
      evento.preventDefault();
      elegir(activa);
    } else if (evento.key === 'Escape' && abierto) {
      evento.preventDefault();
      setAbierto(false);
      setActiva(-1);
    }
  }

  return (
    <Campo etiqueta={etiqueta} ayuda={ayuda} error={error}>
      {(id) => {
        const idLista = `${id}-lista`;
        const idOpcion = (indice: number) => `${id}-opcion-${indice}`;
        return (
          <div className="buscador">
            <input
              id={id}
              type="text"
              role="combobox"
              autoComplete="off"
              aria-autocomplete="list"
              aria-expanded={abierto}
              aria-controls={idLista}
              aria-activedescendant={abierto && activa >= 0 ? idOpcion(activa) : undefined}
              aria-invalid={error ? true : undefined}
              placeholder={placeholder}
              maxLength={maxLength}
              value={value}
              onChange={(e) => {
                onChange(e.target.value);
                setAbierto(true);
                setActiva(-1);
              }}
              onFocus={() => setAbierto(true)}
              onClick={() => setAbierto(true)}
              onBlur={() => {
                setAbierto(false);
                setActiva(-1);
              }}
              onKeyDown={teclado}
            />
            {abierto && (
              <ul id={idLista} role="listbox" className="buscador__lista">
                {grupos.map((grupo, g) => (
                  <li key={grupo.titulo} role="presentation">
                    <span className="buscador__grupo" aria-hidden="true">
                      {grupo.titulo}
                    </span>
                    <ul role="group" aria-label={grupo.titulo}>
                      {grupo.opciones.map((opcion, o) => {
                        const propio = inicios[g] + o;
                        return (
                          <li
                            key={opcion}
                            id={idOpcion(propio)}
                            role="option"
                            aria-selected={propio === activa}
                            className="buscador__opcion"
                            // Sin esto el input pierde el foco y la lista se cierra antes del clic.
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => elegir(propio)}
                          >
                            {opcion}
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                ))}
                {opcionNueva && (
                  <li
                    id={idOpcion(enFila.length)}
                    role="option"
                    aria-selected={enFila.length === activa}
                    className="buscador__opcion buscador__nueva"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => elegir(enFila.length)}
                  >
                    {opcionNueva}
                  </li>
                )}
                {total === 0 && (
                  <li role="presentation" className="buscador__vacio">
                    {sinResultados}
                  </li>
                )}
              </ul>
            )}
          </div>
        );
      }}
    </Campo>
  );
}
