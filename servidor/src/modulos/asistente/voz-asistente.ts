import { Injectable } from '@nestjs/common';
import { conReintento, FallaProveedor, pedirAlProveedor } from './proveedor-asistente';

/**
 * Fase 5 · Hablarle al asistente y escucharlo, con la misma clave de Gemini
 * (DECISIONES §49).
 *
 *   transcribir  el audio de la pregunta (WAV) → texto, con el modelo del
 *                asistente (ASISTENTE_MODELO entiende audio).
 *   hablar       el texto de la respuesta → audio WAV, con un modelo de voz
 *                de Gemini (ASISTENTE_VOZ_MODELO).
 *
 * Usa la API propia de Gemini (generateContent), no la compatible con OpenAI:
 * esa no tiene voz. La dirección sale de ASISTENTE_URL quitándole el /openai
 * del final, o de ASISTENTE_VOZ_URL. Con Groq no hay voz: la pantalla
 * esconde el micrófono.
 */

const MODELO_VOZ_POR_DEFECTO = 'gemini-3.8-flash-lite-tts';
const VOZ_POR_DEFECTO = 'Kore';
const URL_POR_DEFECTO = 'https://generativelanguage.googleapis.com/v1beta/openai';
const MODELO_POR_DEFECTO = 'gemini-3.5-flash-lite';

const INSTRUCCION_TRANSCRIBIR = [
  'Eres un transcriptor. Escribe exactamente lo que dice la persona en el audio, en el idioma en que habla.',
  'Es una pregunta sobre un rancho de ganado: animales, caravanas (números como 0503), corrales, vacunas, pesos.',
  'Escribe los números de las caravanas con cifras.',
  'Si el audio es silencio, ruido o no se entienden palabras, responde hay_voz=false y texto vacío. Nunca inventes ni completes frases.',
].join(' ');

@Injectable()
export class VozAsistente {
  private configuracion() {
    const urlTexto = (process.env.ASISTENTE_URL || URL_POR_DEFECTO).replace(/\/+$/, '');
    const url = process.env.ASISTENTE_VOZ_URL
      ? process.env.ASISTENTE_VOZ_URL.replace(/\/+$/, '')
      : urlTexto.endsWith('/openai')
        ? urlTexto.slice(0, -'/openai'.length)
        : null;
    const modeloVoz = process.env.ASISTENTE_VOZ_MODELO || MODELO_VOZ_POR_DEFECTO;
    return {
      url,
      clave: process.env.ASISTENTE_CLAVE || '',
      modeloTexto: process.env.ASISTENTE_MODELO || MODELO_POR_DEFECTO,
      modeloVoz: modeloVoz === 'ninguno' ? null : modeloVoz,
      voz: process.env.ASISTENTE_VOZ_NOMBRE || VOZ_POR_DEFECTO,
    };
  }

  /** Hay clave, el proveedor es Gemini y la voz no está apagada. */
  disponible(): boolean {
    const { url, clave, modeloVoz } = this.configuracion();
    return Boolean(url && clave && modeloVoz);
  }

  /** WAV → lo que dijo. Vacío si no se escuchó a nadie hablar. */
  async transcribir(wav: Buffer): Promise<string> {
    const { modeloTexto } = this.configuracion();
    const datos = await this.generar(modeloTexto, {
      systemInstruction: { parts: [{ text: INSTRUCCION_TRANSCRIBIR }] },
      contents: [{ role: 'user', parts: [{ inlineData: { mimeType: 'audio/wav', data: wav.toString('base64') } }] }],
      generationConfig: {
        // Transcribir no necesita pensar: con «minimal» tarda alrededor de un segundo.
        thinkingConfig: { thinkingLevel: 'minimal' },
        // Con un esquema el modelo puede decir «no hay voz» en vez de inventar
        // una frase con el silencio (lo hacía en la prueba real).
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: { hay_voz: { type: 'BOOLEAN' }, texto: { type: 'STRING' } },
          required: ['hay_voz', 'texto'],
        },
      },
    });
    const texto = (datos?.candidates?.[0]?.content?.parts ?? [])
      .map((parte: any) => (typeof parte?.text === 'string' ? parte.text : ''))
      .join('');
    let resultado: any;
    try {
      resultado = JSON.parse(texto);
    } catch {
      throw new FallaProveedor('sin_respuesta', 'transcripción que no es JSON');
    }
    return resultado?.hay_voz && typeof resultado.texto === 'string' ? resultado.texto.trim() : '';
  }

  /** Texto → audio WAV listo para el navegador. */
  async hablar(texto: string): Promise<Buffer> {
    const { modeloVoz, voz } = this.configuracion();
    const datos = await this.generar(modeloVoz!, {
      contents: [{ parts: [{ text: texto }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voz } } },
      },
    });
    const audio = (datos?.candidates?.[0]?.content?.parts ?? []).find((parte: any) => parte?.inlineData?.data)?.inlineData;
    if (!audio) throw new FallaProveedor('sin_respuesta', 'respuesta de voz sin audio');
    return comoWav(Buffer.from(audio.data, 'base64'), String(audio.mimeType ?? ''));
  }

  private async generar(modelo: string, cuerpo: unknown): Promise<any> {
    const { url, clave } = this.configuracion();
    if (!url || !clave) throw new FallaProveedor('sin_configurar');
    return conReintento(() =>
      pedirAlProveedor(`${url}/models/${encodeURIComponent(modelo)}:generateContent`, { 'x-goog-api-key': clave }, JSON.stringify(cuerpo)),
    );
  }
}

/**
 * Los modelos de voz nuevos devuelven audio/wav; los anteriores, PCM crudo
 * («audio/L16;codec=pcm;rate=24000»). Al crudo se le pone la cabecera WAV.
 */
export function comoWav(audio: Buffer, tipo: string): Buffer {
  if (audio.subarray(0, 4).toString('latin1') === 'RIFF') return audio;
  if (!/l16|pcm/i.test(tipo)) throw new FallaProveedor('sin_respuesta', `audio en formato desconocido: ${tipo}`);
  const frecuencia = Number(tipo.match(/rate=(\d+)/i)?.[1]) || 24_000;
  const canales = Number(tipo.match(/channels=(\d+)/i)?.[1]) || 1;
  const cabecera = Buffer.alloc(44);
  cabecera.write('RIFF', 0, 'latin1');
  cabecera.writeUInt32LE(36 + audio.length, 4);
  cabecera.write('WAVEfmt ', 8, 'latin1');
  cabecera.writeUInt32LE(16, 16);
  cabecera.writeUInt16LE(1, 20);
  cabecera.writeUInt16LE(canales, 22);
  cabecera.writeUInt32LE(frecuencia, 24);
  cabecera.writeUInt32LE(frecuencia * canales * 2, 28);
  cabecera.writeUInt16LE(canales * 2, 32);
  cabecera.writeUInt16LE(16, 34);
  cabecera.write('data', 36, 'latin1');
  cabecera.writeUInt32LE(audio.length, 40);
  return Buffer.concat([cabecera, audio]);
}

/** Lo que se lee en voz alta: sin las marcas de lista ni de negrita. */
export function textoParaLeer(respuesta: string): string {
  return respuesta
    .replace(/\r/g, '')
    .split('\n')
    .map((linea) => linea.trim().replace(/^(?:[-*•]|\d+[.)])\s+/, '').replace(/^#+\s*/, ''))
    .filter(Boolean)
    .map((linea) => (/[.:;!?]$/.test(linea) ? linea : `${linea}.`))
    .join('\n')
    .replace(/\*\*/g, '');
}
