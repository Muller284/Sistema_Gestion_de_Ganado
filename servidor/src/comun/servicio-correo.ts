import { Global, Injectable, Module } from '@nestjs/common';

/**
 * Envio de correo (HU-07, HU-09 y HU-17).
 *
 * DOS TRANSPORTES
 *   consola  el mensaje se escribe en la salida del servidor y no se envia
 *            nada. Es el de por defecto y el que usan las pruebas.
 *   brevo    se envia de verdad, por la API de Brevo.
 *
 * POR QUE BREVO Y NO nodemailer CON GMAIL
 * Por tres razones, en orden de peso:
 *
 *   1. No agrega dependencias. Brevo se usa con una peticion HTTP normal, y
 *      Node ya trae fetch. nodemailer habria sido un paquete nuevo, y la regla
 *      del equipo es que las dependencias las instala Favio.
 *   2. No usa SMTP. Muchas redes universitarias y varios servicios de hosting
 *      bloquean los puertos de SMTP; el 443 no lo bloquea nadie.
 *   3. El plan gratuito son 300 correos por dia sin tarjeta, que para un
 *      proyecto de materia sobra, y alcanza para mandarle a cualquier
 *      destinatario, no solo a uno mismo.
 *
 * COMO SE CONFIGURA
 *   1. Crear una cuenta en brevo.com.
 *   2. Agregar el correo del remitente y confirmarlo con el codigo de seis
 *      digitos que llega a esa direccion.
 *   3. Sacar una clave de API y ponerla en el .env:
 *        CORREO_TRANSPORTE=brevo
 *        BREVO_API_KEY=...
 *        CORREO_REMITENTE=el.correo.confirmado@gmail.com
 *        CORREO_REMITENTE_NOMBRE=Sistema de Gestion de Ganado
 *
 * ADVERTENCIA HONESTA
 * Enviando desde un correo gratuito el mensaje llega, pero tiene mas
 * probabilidad de caer en la carpeta de no deseados, porque un dominio
 * gratuito no se puede autenticar. Para el producto de verdad hace falta un
 * dominio propio. Para la materia alcanza; solo hay que mirar la carpeta de
 * no deseados si no aparece.
 */

export interface MensajeCorreo {
  para: string;
  asunto: string;
  cuerpo: string;
  /** El enlace o el dato que el usuario necesita. Se resalta aparte. */
  destacado?: string;
}

export interface TransporteCorreo {
  enviar(mensaje: MensajeCorreo): Promise<void>;
  /** Solo el transporte de consola lo implementa. Ver ServicioCorreo. */
  ultimoPara?(correo: string): MensajeCorreo | null;
}

// ============================================================================
// Consola
// ============================================================================

/**
 * Escribe el mensaje en la consola y guarda el ultimo de cada destinatario.
 * Es lo que permite probar y demostrar sin depender del correo.
 */
class TransporteConsola implements TransporteCorreo {
  private readonly ultimos = new Map<string, MensajeCorreo>();

  async enviar(mensaje: MensajeCorreo): Promise<void> {
    this.ultimos.set(mensaje.para.toLowerCase(), mensaje);
    const linea = '-'.repeat(72);
    console.log(
      [
        '',
        linea,
        'CORREO (transporte de consola, no se envio nada de verdad)',
        `Para:   ${mensaje.para}`,
        `Asunto: ${mensaje.asunto}`,
        linea,
        mensaje.cuerpo,
        mensaje.destacado ? `\n>>> ${mensaje.destacado}` : '',
        linea,
        '',
      ].join('\n'),
    );
  }

  ultimoPara(correo: string): MensajeCorreo | null {
    return this.ultimos.get(correo.toLowerCase()) ?? null;
  }
}

// ============================================================================
// Brevo
// ============================================================================

const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';

class TransporteBrevo implements TransporteCorreo {
  constructor(
    private readonly clave: string,
    private readonly remitente: string,
    private readonly nombreRemitente: string,
  ) {}

  async enviar(mensaje: MensajeCorreo): Promise<void> {
    const respuesta = await fetch(BREVO_URL, {
      method: 'POST',
      headers: {
        'api-key': this.clave,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { name: this.nombreRemitente, email: this.remitente },
        to: [{ email: mensaje.para }],
        subject: mensaje.asunto,
        textContent: cuerpoDeTexto(mensaje),
        htmlContent: cuerpoHtml(mensaje),
      }),
    });

    if (!respuesta.ok) {
      const detalle = await respuesta.text().catch(() => '');
      // No se traga el error: si el correo no salio, quien llamo tiene que
      // enterarse. Un envio que falla en silencio es peor que no enviar.
      throw new Error(
        `Brevo rechazo el envio (${respuesta.status}). ${detalle.slice(0, 300)}`,
      );
    }
  }
}

function cuerpoDeTexto(mensaje: MensajeCorreo): string {
  return mensaje.destacado
    ? `${mensaje.cuerpo}\n\n${mensaje.destacado}\n`
    : `${mensaje.cuerpo}\n`;
}

/**
 * El correo con los colores del sistema de diseño.
 *
 * Va todo con estilos escritos dentro de cada etiqueta, y no con clases: los
 * programas de correo descartan las hojas de estilo. Es el unico lugar del
 * proyecto donde se escriben colores a mano, y los valores son los mismos de
 * cliente/src/estilos/tokens.css.
 */
function cuerpoHtml(mensaje: MensajeCorreo): string {
  const esEnlace = mensaje.destacado?.startsWith('http');
  const destacado = !mensaje.destacado
    ? ''
    : esEnlace
      ? `<tr><td style="padding:8px 32px 32px">
           <a href="${mensaje.destacado}"
              style="display:inline-block;background:#1D5B4B;color:#FFFFFF;
                     text-decoration:none;padding:12px 24px;border-radius:8px;
                     font-weight:600;font-size:15px">Confirmar mi correo</a>
           <p style="margin:16px 0 0;font-size:13px;line-height:18px;color:#8C8478">
             Si el botón no funciona, copia esta dirección en tu navegador:<br>
             <span style="color:#1D5B4B;word-break:break-all">${mensaje.destacado}</span>
           </p>
         </td></tr>`
      : `<tr><td style="padding:8px 32px 32px">
           <div style="background:#F4F1EB;border:1px solid #E7E2D9;border-radius:8px;
                       padding:16px;font-family:'Courier New',monospace;font-size:18px;
                       font-weight:700;color:#1C1A17;text-align:center">
             ${mensaje.destacado}
           </div>
         </td></tr>`;

  return `<!doctype html>
<html lang="es"><body style="margin:0;padding:24px;background:#F4F1EB;
      font-family:Helvetica,Arial,sans-serif;color:#2E2A25">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
         style="max-width:560px;margin:0 auto;background:#FFFFFF;border-radius:12px;
                overflow:hidden;border:1px solid #E7E2D9">
    <tr><td style="background:#123A30;padding:20px 32px">
      <span style="color:#FFFFFF;font-size:17px;font-weight:700;letter-spacing:-.2px">
        Gestión de Ganado
      </span>
    </td></tr>
    <tr><td style="padding:32px 32px 8px;font-size:15px;line-height:24px;white-space:pre-line">
      ${escapar(mensaje.cuerpo)}
    </td></tr>
    ${destacado}
    <tr><td style="background:#FAF8F5;border-top:1px solid #E7E2D9;padding:16px 32px;
                   font-size:12px;line-height:16px;color:#8C8478">
      Sistema de Gestión de Ganado · Este mensaje se envió automáticamente.
    </td></tr>
  </table>
</body></html>`;
}

function escapar(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ============================================================================

@Injectable()
export class ServicioCorreo {
  private readonly transporte: TransporteCorreo;
  readonly esDeConsola: boolean;

  constructor() {
    const elegido = (process.env.CORREO_TRANSPORTE ?? 'consola').toLowerCase();

    if (elegido === 'consola') {
      this.transporte = new TransporteConsola();
      this.esDeConsola = true;
      return;
    }

    if (elegido === 'brevo') {
      const clave = process.env.BREVO_API_KEY;
      const remitente = process.env.CORREO_REMITENTE;
      if (!clave || !remitente) {
        // Se falla al arrancar y no al primer envio: es mejor que el servidor
        // no levante a que levante y los correos se pierdan en silencio.
        throw new Error(
          'CORREO_TRANSPORTE=brevo necesita BREVO_API_KEY y CORREO_REMITENTE en el .env.',
        );
      }
      this.transporte = new TransporteBrevo(
        clave,
        remitente,
        process.env.CORREO_REMITENTE_NOMBRE ?? 'Sistema de Gestión de Ganado',
      );
      this.esDeConsola = false;
      return;
    }

    throw new Error(
      `CORREO_TRANSPORTE="${elegido}" no existe. Los transportes son "consola" y "brevo". ` +
        'Ver servidor/src/comun/servicio-correo.ts.',
    );
  }

  enviar(mensaje: MensajeCorreo): Promise<void> {
    return this.transporte.enviar(mensaje);
  }

  /**
   * El ultimo mensaje que se le "envio" a alguien. Solo funciona con el
   * transporte de consola y solo sirve para las pruebas y la demostracion:
   * con Brevo devuelve null.
   */
  ultimoPara(correo: string): MensajeCorreo | null {
    return this.transporte.ultimoPara?.(correo) ?? null;
  }
}

@Global()
@Module({
  providers: [ServicioCorreo],
  exports: [ServicioCorreo],
})
export class ModuloCorreo {}
