/**
 * Fase 5 · Hablarle al asistente y escucharlo (DECISIONES §49).
 *
 * Grabar: el micrófono del navegador (MediaRecorder) graba en el formato que
 * sepa (webm en Chrome, mp4 en Safari, ogg en Firefox). Antes de mandarlo se
 * pasa a WAV de 16 kHz y un canal: es el formato que Gemini entiende siempre,
 * y pesa poco (unos 32 kB por segundo).
 *
 * Escuchar: el servidor devuelve la respuesta leída por Gemini en WAV; acá
 * solo se reproduce. Si Gemini no puede (por ejemplo, llegó a su límite
 * gratuito del día), se lee con la voz del navegador, si la hay.
 */

export const FRECUENCIA_WAV = 16_000;
export const SEGUNDOS_MAXIMOS = 30;
/** Por debajo de este nivel (RMS, de 0 a 1) se considera silencio. */
export const NIVEL_MINIMO = 0.01;

export function puedeGrabar(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof window !== 'undefined' &&
    typeof window.MediaRecorder !== 'undefined' &&
    typeof contextoDeAudio() !== 'undefined'
  );
}

/** Safari viejo lo tiene con prefijo. */
function contextoDeAudio(): typeof AudioContext | undefined {
  return window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
}

/** Muestras de -1 a 1 → WAV PCM de 16 bits, mono. */
export function codificarWav(muestras: Float32Array, frecuencia = FRECUENCIA_WAV): Uint8Array {
  const datos = muestras.length * 2;
  const bytes = new Uint8Array(44 + datos);
  const vista = new DataView(bytes.buffer);
  const texto = (posicion: number, valor: string) => {
    for (let i = 0; i < valor.length; i++) vista.setUint8(posicion + i, valor.charCodeAt(i));
  };
  texto(0, 'RIFF');
  vista.setUint32(4, 36 + datos, true);
  texto(8, 'WAVE');
  texto(12, 'fmt ');
  vista.setUint32(16, 16, true);
  vista.setUint16(20, 1, true);
  vista.setUint16(22, 1, true);
  vista.setUint32(24, frecuencia, true);
  vista.setUint32(28, frecuencia * 2, true);
  vista.setUint16(32, 2, true);
  vista.setUint16(34, 16, true);
  texto(36, 'data');
  vista.setUint32(40, datos, true);
  for (let i = 0; i < muestras.length; i++) {
    const valor = Math.max(-1, Math.min(1, muestras[i]));
    vista.setInt16(44 + i * 2, valor < 0 ? valor * 0x8000 : valor * 0x7fff, true);
  }
  return bytes;
}

/** Qué tan fuerte suena la grabación (RMS). Sirve para no mandar silencio. */
export function nivel(muestras: Float32Array): number {
  if (!muestras.length) return 0;
  let suma = 0;
  for (let i = 0; i < muestras.length; i++) suma += muestras[i] * muestras[i];
  return Math.sqrt(suma / muestras.length);
}

export function aBase64(bytes: Uint8Array): string {
  let binario = '';
  const trozo = 0x8000;
  for (let i = 0; i < bytes.length; i += trozo) {
    binario += String.fromCharCode(...bytes.subarray(i, i + trozo));
  }
  return btoa(binario);
}

/** Lo que grabó el navegador → muestras mono a 16 kHz. */
async function aMuestras16k(grabacion: Blob): Promise<Float32Array> {
  const Contexto = contextoDeAudio()!;
  const contexto = new Contexto();
  try {
    const audio = await contexto.decodeAudioData(await grabacion.arrayBuffer());
    const largo = Math.max(1, Math.ceil(audio.duration * FRECUENCIA_WAV));
    const fuera = new OfflineAudioContext(1, largo, FRECUENCIA_WAV);
    const fuente = fuera.createBufferSource();
    fuente.buffer = audio;
    fuente.connect(fuera.destination);
    fuente.start();
    return (await fuera.startRendering()).getChannelData(0);
  } finally {
    void contexto.close();
  }
}

export interface Grabacion {
  /** WAV en base64, listo para POST /asistente/transcripciones. */
  audio: string;
  segundos: number;
  /** false si fue puro silencio: no vale la pena mandarlo. */
  hayVoz: boolean;
}

/**
 * Una grabación del micrófono. empezar() pide permiso la primera vez;
 * terminar() corta y devuelve el WAV.
 */
export class Grabadora {
  private grabador: MediaRecorder | null = null;
  private flujo: MediaStream | null = null;
  private trozos: Blob[] = [];

  async empezar(): Promise<void> {
    this.flujo = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
    });
    this.trozos = [];
    this.grabador = new MediaRecorder(this.flujo);
    this.grabador.ondataavailable = (evento) => {
      if (evento.data.size) this.trozos.push(evento.data);
    };
    this.grabador.start();
  }

  async terminar(): Promise<Grabacion> {
    const grabador = this.grabador;
    if (!grabador) throw new Error('No se estaba grabando.');
    const listo = new Promise<void>((resolver) => {
      grabador.onstop = () => resolver();
    });
    if (grabador.state !== 'inactive') grabador.stop();
    await listo;
    this.soltarMicrofono();
    const muestras = await aMuestras16k(new Blob(this.trozos, { type: grabador.mimeType }));
    return {
      audio: aBase64(codificarWav(muestras)),
      segundos: muestras.length / FRECUENCIA_WAV,
      hayVoz: nivel(muestras) >= NIVEL_MINIMO,
    };
  }

  cancelar(): void {
    if (this.grabador && this.grabador.state !== 'inactive') {
      this.grabador.onstop = null;
      this.grabador.stop();
    }
    this.soltarMicrofono();
  }

  /** Apaga la luz del micrófono en cuanto se deja de grabar. */
  private soltarMicrofono() {
    this.flujo?.getTracks().forEach((pista) => pista.stop());
    this.flujo = null;
    this.grabador = null;
  }
}

// ── Escuchar ────────────────────────────────────────────────────────────────

let sonando: HTMLAudioElement | null = null;

/** Reproduce un WAV en base64. Termina cuando deja de sonar (o se detiene). */
export function reproducir(audio: string, tipo = 'audio/wav'): Promise<void> {
  detenerVoz();
  const elemento = new Audio(`data:${tipo};base64,${audio}`);
  sonando = elemento;
  return new Promise((resolver, rechazar) => {
    elemento.onended = () => resolver();
    elemento.onpause = () => resolver();
    elemento.onerror = () => rechazar(new Error('No se pudo reproducir el audio.'));
    elemento.play().catch(rechazar);
  });
}

export function hayVozDelNavegador(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
}

/** El respaldo: la voz que trae el navegador. */
export function leerConElNavegador(texto: string, idioma: string): Promise<void> {
  detenerVoz();
  return new Promise((resolver) => {
    const frase = new SpeechSynthesisUtterance(texto);
    frase.lang = idioma === 'en' ? 'en-US' : 'es-ES';
    frase.onend = () => resolver();
    frase.onerror = () => resolver();
    window.speechSynthesis.speak(frase);
  });
}

export function detenerVoz(): void {
  if (sonando) {
    const elemento = sonando;
    sonando = null;
    elemento.pause();
  }
  if (hayVozDelNavegador()) window.speechSynthesis.cancel();
}

/** Lo que se lee en voz alta: sin las marcas de lista ni de negrita (igual que el servidor). */
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
