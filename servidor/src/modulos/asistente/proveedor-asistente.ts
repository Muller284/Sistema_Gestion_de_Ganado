import { Injectable } from '@nestjs/common';

/**
 * RF-38 · El modelo de lenguaje, detrás de una sola clase.
 *
 * Habla el formato de chat de OpenAI (`/chat/completions` con `tools`), que
 * aceptan Gemini y Groq con solo cambiar la URL, la clave y el modelo. Así el
 * proveedor se cambia desde .env, sin tocar código (DECISIONES §48):
 *
 *   Gemini  ASISTENTE_URL=https://generativelanguage.googleapis.com/v1beta/openai
 *           ASISTENTE_MODELO=gemini-3.5-flash-lite
 *   Groq    ASISTENTE_URL=https://api.groq.com/openai/v1
 *           ASISTENTE_MODELO=openai/gpt-oss-120b
 *
 * Sin dependencias: fetch de Node. La clave nunca sale del servidor.
 */

export interface LlamadaHerramienta {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

export type MensajeChat =
  | { role: 'system' | 'user'; content: string }
  | { role: 'assistant'; content: string | null; tool_calls?: LlamadaHerramienta[] }
  | { role: 'tool'; tool_call_id: string; content: string };

export interface DefinicionHerramienta {
  type: 'function';
  function: { name: string; description: string; parameters?: Record<string, unknown> };
}

/** Por qué no respondió el proveedor; el servicio lo traduce a un mensaje. */
export type MotivoFalla = 'sin_configurar' | 'limite' | 'clave' | 'sin_respuesta';

export class FallaProveedor extends Error {
  /** pasajera: vale la pena reintentar (403 suelto, 5xx, sin conexión). */
  constructor(readonly motivo: MotivoFalla, detalle?: string, readonly pasajera = false) {
    super(detalle ?? motivo);
  }
}

const URL_POR_DEFECTO = 'https://generativelanguage.googleapis.com/v1beta/openai';
const MODELO_POR_DEFECTO = 'gemini-3.5-flash-lite';
const ESPERA_MS = 45_000;
const INTENTOS = 2;
const ESPERA_REINTENTO_MS = 1_500;

@Injectable()
export class ProveedorAsistente {
  /** Se lee en cada uso, para que las pruebas y el .env puedan cambiarlo. */
  private configuracion() {
    return {
      url: (process.env.ASISTENTE_URL || URL_POR_DEFECTO).replace(/\/+$/, ''),
      modelo: process.env.ASISTENTE_MODELO || MODELO_POR_DEFECTO,
      clave: process.env.ASISTENTE_CLAVE || '',
      // low, medium o high; «ninguno» para no mandarlo (si un proveedor no lo acepta).
      esfuerzo: process.env.ASISTENTE_ESFUERZO === 'ninguno' ? null : process.env.ASISTENTE_ESFUERZO || 'low',
    };
  }

  configurado(): boolean {
    return this.configuracion().clave !== '';
  }

  /** El servidor del proveedor (sin la clave), para que la pantalla y las pruebas sepan a quién se le pregunta. */
  servidor(): string {
    try {
      return new URL(this.configuracion().url).host;
    } catch {
      return '';
    }
  }

  /**
   * soloTexto: se siguen mandando las herramientas (hay mensajes que las
   * nombran) pero con tool_choice 'none', para que conteste con texto.
   */
  async responder(mensajes: MensajeChat[], herramientas: DefinicionHerramienta[], soloTexto = false) {
    const { url, modelo, clave, esfuerzo } = this.configuracion();
    if (!clave) throw new FallaProveedor('sin_configurar');

    const cuerpo = JSON.stringify({
      model: modelo,
      messages: mensajes,
      ...(herramientas.length ? { tools: herramientas, tool_choice: soloTexto ? 'none' : 'auto' } : {}),
      // Sin temperature: Gemini 3 recomienda dejar la de fábrica. Pensar poco
      // alcanza para elegir herramientas y baja la espera (RNF-22, menos de 10 s).
      ...(esfuerzo ? { reasoning_effort: esfuerzo } : {}),
    });

    const datos = await conReintento(() =>
      pedirAlProveedor(`${url}/chat/completions`, { Authorization: `Bearer ${clave}` }, cuerpo),
    );
    const mensaje = datos?.choices?.[0]?.message;
    if (!mensaje) throw new FallaProveedor('sin_respuesta', 'respuesta sin choices');
    return {
      contenido: typeof mensaje.content === 'string' ? mensaje.content : null,
      llamadas: Array.isArray(mensaje.tool_calls) ? (mensaje.tool_calls as LlamadaHerramienta[]) : [],
    };
  }
}

/**
 * Gemini devuelve a veces un 403 o un 5xx pasajero con una clave buena (lo
 * vimos en la prueba real del 16/11): se reintenta una vez.
 */
export async function conReintento<T>(pedido: () => Promise<T>): Promise<T> {
  let ultima: FallaProveedor | null = null;
  for (let intento = 1; intento <= INTENTOS; intento++) {
    if (intento > 1) await new Promise((listo) => setTimeout(listo, ESPERA_REINTENTO_MS));
    try {
      return await pedido();
    } catch (error) {
      if (!(error instanceof FallaProveedor) || !error.pasajera) throw error;
      ultima = error;
    }
  }
  throw ultima!;
}

/** Un POST con JSON al proveedor. Traduce los errores HTTP a FallaProveedor. */
export async function pedirAlProveedor(direccion: string, cabeceras: Record<string, string>, cuerpo: string): Promise<any> {
  let respuesta: Response;
  try {
    respuesta = await fetch(direccion, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...cabeceras },
      body: cuerpo,
      signal: AbortSignal.timeout(ESPERA_MS),
    });
  } catch (error) {
    throw new FallaProveedor('sin_respuesta', (error as Error).message, true);
  }

  // El detalle del proveedor va a la consola (lo escribe el servicio), nunca a la pantalla.
  const detalle = async () => `HTTP ${respuesta.status} ${(await respuesta.text().catch(() => '')).slice(0, 300)}`;
  if (respuesta.status === 429) throw new FallaProveedor('limite', await detalle());
  if (respuesta.status === 401) throw new FallaProveedor('clave', await detalle());
  if (respuesta.status === 403) throw new FallaProveedor('clave', await detalle(), true);
  if (!respuesta.ok) throw new FallaProveedor('sin_respuesta', await detalle(), respuesta.status >= 500);

  const datos = await respuesta.json().catch(() => null);
  if (!datos) throw new FallaProveedor('sin_respuesta', 'respuesta que no es JSON');
  return datos;
}
