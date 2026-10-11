import { Icono } from './Iconos';

/**
 * El hilo que une las tres pantallas del alta: crear la cuenta, confirmar el
 * correo y crear el rancho.
 *
 * POR QUE
 * Las tres existían y funcionaban, pero cada una se veía como una pantalla
 * suelta. Con el hilo arriba se lee como un solo recorrido: se sabe de dónde
 * se viene, dónde se está y qué falta. Es lo mismo que pide HU-16 para la
 * guía de configuración, aplicado al alta.
 *
 * No navega. Es un indicador, no un menú: no se puede saltar a confirmar el
 * correo antes de tener cuenta.
 */

const PASOS = ['Cuenta', 'Correo', 'Rancho'];

export function PasosDeAlta({ actual }: { actual: 1 | 2 | 3 }) {
  return (
    <ol className="pasos-alta" aria-label={`Paso ${actual} de ${PASOS.length}`}>
      {PASOS.map((nombre, indice) => {
        const numero = indice + 1;
        const estado =
          numero < actual ? 'hecho' : numero === actual ? 'actual' : 'futuro';

        return (
          <li key={nombre} className={estado} aria-current={estado === 'actual'}>
            <span className="marca">
              {estado === 'hecho' ? (
                <Icono nombre="exito" tamano={16} />
              ) : (
                numero
              )}
            </span>
            {nombre}
          </li>
        );
      })}
    </ol>
  );
}
