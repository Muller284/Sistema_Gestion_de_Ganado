/**
 * Carga el archivo .env de la raiz del proyecto.
 *
 * Node no lee los .env por su cuenta. docker compose si lo hace, pero solo
 * para lo que corre dentro de los contenedores; cuando se ejecuta
 * "npm run migrar" desde servidor/, las variables no existen y el script
 * terminaba usando su valor por defecto, con el usuario postgres y una
 * contrasena de ejemplo. De ahi el error "password authentication failed".
 *
 * process.loadEnvFile viene incluido en Node, asi que no agrega dependencias.
 */
const path = require('path');

function cargarEntorno() {
  // Primero el .env de la raiz, que es el que usa todo el proyecto.
  // Despues uno propio de servidor/, por si alguien quiere sobrescribir algo.
  for (const ruta of [
    path.join(__dirname, '..', '.env'),
    path.join(__dirname, '.env'),
  ]) {
    try {
      process.loadEnvFile(ruta);
    } catch {
      // Si el archivo no existe se sigue: puede que las variables vengan
      // del entorno, como pasa dentro de Docker o en la integracion continua.
    }
  }
}

module.exports = { cargarEntorno };
