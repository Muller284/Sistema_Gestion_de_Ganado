/**
 * Manda un correo de prueba con la configuracion del .env, sin levantar el
 * servidor. Sirve para saber si el envio real funciona antes de registrarse.
 *
 *   npm run probar:correo -- tu.correo@gmail.com
 *
 * Usa la misma API de Brevo que servidor/src/comun/servicio-correo.ts. Si
 * algo falla, dice que es y como se arregla.
 */
require('./cargar-entorno').cargarEntorno();

const destino = process.argv[2];
const transporte = (process.env.CORREO_TRANSPORTE ?? 'consola').toLowerCase();
const clave = process.env.BREVO_API_KEY;
const remitente = process.env.CORREO_REMITENTE;
const nombre = process.env.CORREO_REMITENTE_NOMBRE ?? 'Sistema de Gestión de Ganado';

function salir(mensaje) {
  console.error(`\n✗ ${mensaje}\n`);
  process.exitCode = 1;
}

async function probar() {
  if (!destino || !destino.includes('@')) {
    return salir('Falta a quien mandarlo. Uso: npm run probar:correo -- tu.correo@gmail.com');
  }
  if (transporte !== 'brevo') {
    return salir(
      `CORREO_TRANSPORTE es "${transporte}". Para enviar de verdad ponlo en brevo en el .env de la raiz.`,
    );
  }
  if (!clave) return salir('Falta BREVO_API_KEY en el .env.');
  if (!remitente) return salir('Falta CORREO_REMITENTE en el .env (el correo que confirmaste en Brevo).');

  console.log(`Enviando un correo de prueba de ${remitente} a ${destino}…`);

  const respuesta = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': clave, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { name: nombre, email: remitente },
      to: [{ email: destino }],
      subject: 'Prueba de correo — Sistema de Gestión de Ganado',
      textContent:
        'Si lees esto, el envío de correos del sistema funciona.\n\n' +
        'Ya puedes registrarte y los enlaces de confirmación llegarán de verdad.',
    }),
  });

  if (respuesta.ok) {
    console.log('\n✓ Brevo aceptó el correo. Revisa la bandeja de entrada y también "No deseados".\n');
    return;
  }

  const detalle = await respuesta.text().catch(() => '');
  const pistas = {
    400: 'Suele ser el remitente: CORREO_REMITENTE tiene que ser exactamente el correo que confirmaste en Brevo (Senders, domains & dedicated IPs → Senders).',
    401: 'La clave no sirve. Copia de nuevo la clave de API (SMTP & API → API Keys) y revisa que no tenga espacios.',
    403: 'La cuenta de Brevo todavía no puede enviar. Entra a Brevo y termina de activar la cuenta (a veces piden completar el perfil).',
  };
  salir(
    `Brevo rechazó el envío (${respuesta.status}).\n  ${pistas[respuesta.status] ?? 'Mira el detalle de abajo.'}\n  Detalle: ${detalle.slice(0, 300)}`,
  );
}

probar().catch((error) => salir(`No se pudo contactar a Brevo: ${error.message}. ¿Hay internet?`));
