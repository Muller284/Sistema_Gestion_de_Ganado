import { useEffect, useState } from 'react';
import { localeActual, t, tn } from '../../servicios/idioma';

/**
 * Fase 4 · Lo que comparten las pantallas del Admin y no es un componente:
 * cargar datos y escribir fechas y números.
 */

/** Las pantallas del Admin cargan una sola cosa: esto evita repetir el «cargando / error». */
export function useCarga<T>(cargar: () => Promise<T>, dependencias: unknown[] = []) {
  const [datos, setDatos] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [vuelta, setVuelta] = useState(0);

  useEffect(() => {
    let vigente = true;
    cargar()
      .then((respuesta) => {
        if (!vigente) return;
        setDatos(respuesta);
        setError('');
      })
      .catch((err: Error) => vigente && setError(err.message));
    return () => {
      vigente = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vuelta, ...dependencias]);

  return { datos, error, recargar: () => setVuelta((n) => n + 1) };
}

export function fechaHora(valor: string): string {
  return new Date(valor).toLocaleString(localeActual(), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function fecha(valor: string): string {
  return new Date(valor).toLocaleDateString(localeActual(), { day: 'numeric', month: 'short', year: 'numeric' });
}

/** «hace 3 horas», «hace 2 días»; sin fecha, «sin actividad». */
export function haceCuanto(valor: string | null): string {
  if (!valor) return t('admin.tiempo.nunca');
  const minutos = Math.max(0, Math.round((Date.now() - new Date(valor).getTime()) / 60000));
  if (minutos < 60) return minutos <= 1 ? t('admin.tiempo.recien') : tn('admin.tiempo.minutos', minutos);
  const horas = Math.round(minutos / 60);
  if (horas < 24) return tn('admin.tiempo.horas', horas);
  const dias = Math.round(horas / 24);
  if (dias < 60) return tn('admin.tiempo.dias', dias);
  return fecha(valor);
}

export function numero(valor: number): string {
  return valor.toLocaleString(localeActual());
}

