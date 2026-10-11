import { flushSync } from 'react-dom';

/**
 * Aplica un cambio de estado con una transición de vista.
 *
 * El navegador saca una foto de la pantalla antes y otra después del cambio y
 * las funde: lo que se movió, se desliza; lo que apareció, entra; lo que se
 * fue, se desvanece. Sirve para filtrar una lista o abrir un formulario sin
 * que la pantalla salte de golpe.
 *
 * Si el navegador no lo soporta, o la persona pidió que nada se mueva, el
 * cambio se aplica igual, sin animación. Nunca bloquea nada.
 *
 * flushSync hace que React pinte el cambio dentro de la transición: sin eso,
 * la "foto de después" saldría igual a la de antes.
 */
export function conTransicion(cambio: () => void): void {
  const quieto =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (quieto || typeof document.startViewTransition !== 'function') {
    cambio();
    return;
  }

  document.startViewTransition(() => {
    flushSync(cambio);
  });
}
