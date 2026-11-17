import { pedir } from './api';

/**
 * Fase 5 · Asistente con IA (RF-38 a RF-42). La clave del proveedor vive en
 * el servidor: el cliente solo manda la pregunta y lo anterior de la charla.
 */

export type ModuloAsistente = 'animales' | 'corrales' | 'sanidad' | 'pesajes';

export interface EstadoAsistente {
  configurado: boolean;
  /** Si se le puede hablar y escuchar (Gemini con clave). */
  voz: boolean;
  proveedor: string;
  usadas: number;
  limite: number;
  modulos: ModuloAsistente[];
}

export interface TurnoAsistente {
  rol: 'usuario' | 'asistente';
  texto: string;
}

export interface RespuestaAsistente {
  /** La consulta guardada: con este id se pide la respuesta leída en voz alta. */
  id: string;
  respuesta: string;
  herramientas: string[];
  usadas: number;
  limite: number;
}

/** Lo que se reenvía de la charla para que entienda «¿y el otro?». */
export const TURNOS_PREVIOS = 6;
export const LARGO_PREGUNTA = 500;

export const asistente = {
  estado: () => pedir<EstadoAsistente>('/asistente'),
  preguntar: (pregunta: string, historial: TurnoAsistente[]) =>
    pedir<RespuestaAsistente>('/asistente/preguntas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pregunta, historial: historial.slice(-TURNOS_PREVIOS) }),
    }),
  /** La pregunta hablada (WAV en base64) → el texto. */
  transcribir: (audio: string) =>
    pedir<{ texto: string }>('/asistente/transcripciones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audio }),
    }),
  /** La respuesta de una consulta, leída por Gemini. */
  voz: (id: string) => pedir<{ tipo: string; audio: string }>(`/asistente/consultas/${encodeURIComponent(id)}/voz`),
};

export type Trozo = { tipo: 'texto'; texto: string } | { tipo: 'negrita'; texto: string };

export type Bloque = { tipo: 'parrafo'; trozos: Trozo[] } | { tipo: 'lista'; items: Trozo[][] };

/**
 * La respuesta llega en texto con, como mucho, listas con guiones y negritas
 * con **. Se arma en bloques para dibujarla sin interpretar HTML: lo que
 * escribe el modelo nunca se inserta como marcado.
 */
export function bloquesDeRespuesta(texto: string): Bloque[] {
  const bloques: Bloque[] = [];
  for (const linea of texto.replace(/\r/g, '').split('\n')) {
    const limpia = linea.trim();
    if (!limpia) continue;
    const item = limpia.match(/^(?:[-*•]|\d+[.)])\s+(.*)$/);
    if (item) {
      const ultimo = bloques[bloques.length - 1];
      if (ultimo?.tipo === 'lista') ultimo.items.push(trozos(item[1]));
      else bloques.push({ tipo: 'lista', items: [trozos(item[1])] });
    } else {
      bloques.push({ tipo: 'parrafo', trozos: trozos(limpia.replace(/^#+\s*/, '')) });
    }
  }
  return bloques;
}

function trozos(texto: string): Trozo[] {
  return texto
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((parte) =>
      parte.startsWith('**') && parte.endsWith('**') && parte.length > 4
        ? { tipo: 'negrita', texto: parte.slice(2, -2) }
        : { tipo: 'texto', texto: parte },
    );
}
