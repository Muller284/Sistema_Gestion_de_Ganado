/**
 * Corredor de migraciones.
 *
 * Aplica en orden los archivos .sql de la carpeta migraciones que todavia no
 * se hayan aplicado, y deja constancia de cada uno en migraciones_aplicadas.
 *
 * CADA MIGRACION MANEJA SU PROPIA TRANSACCION.
 * Es decir: todo archivo .sql tiene que empezar con BEGIN; y terminar con
 * COMMIT;. Este corredor NO abre una transaccion por fuera, a proposito.
 *
 * Antes si lo hacia, y eso rompia la primera corrida sobre una base vacia:
 * el COMMIT que trae la propia migracion cerraba la transaccion externa, asi
 * que el ROLLBACK del corredor ya no revertia nada y el esquema quedaba a
 * medias aunque la salida fuera un error.
 */
require('./cargar-entorno').cargarEntorno();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

let connectionString =
  process.env.DATABASE_URL ||
  'postgres://postgres:tu_password@localhost:5432/gestion_ganado';

// Si corre fuera de Docker y la URL tiene '@postgres:', usar localhost
if (connectionString.includes('@postgres:') && !fs.existsSync('/.dockerenv')) {
  connectionString = connectionString.replace('@postgres:', '@localhost:');
}

const pool = new Pool({ connectionString });

async function ejecutarMigraciones() {
  let cliente;
  try {
    cliente = await pool.connect();
  } catch (error) {
    console.error('No se pudo conectar a la base de datos:', error.message);
    console.error(
      'Revisa que la base este levantada (docker compose up -d postgres) y que DATABASE_URL en el .env sea correcta.',
    );
    process.exitCode = 1;
    await pool.end();
    return;
  }

  let archivoEnCurso = null;
  try {
    // Tabla de control. La misma definicion que usa la migracion 001, para que
    // las dos coincidan sin importar cual se cree primero.
    await cliente.query(`
      CREATE TABLE IF NOT EXISTS migraciones_aplicadas (
        nombre      VARCHAR(200) PRIMARY KEY,
        aplicada_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const dirMigraciones = path.join(__dirname, 'migraciones');
    const archivos = fs
      .readdirSync(dirMigraciones)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    let aplicadas = 0;
    for (const archivo of archivos) {
      const yaEsta = await cliente.query(
        'SELECT 1 FROM migraciones_aplicadas WHERE nombre = $1',
        [archivo],
      );
      if (yaEsta.rowCount > 0) continue;

      archivoEnCurso = archivo;
      console.log(`Aplicando migracion: ${archivo}`);
      const sql = fs.readFileSync(path.join(dirMigraciones, archivo), 'utf8');
      await cliente.query(sql);

      // ON CONFLICT porque la migracion 001 anota su propio nombre al final.
      // Sin esto, el corredor intentaba insertar dos veces el mismo nombre y
      // la primera corrida terminaba con "duplicate key value".
      await cliente.query(
        'INSERT INTO migraciones_aplicadas (nombre) VALUES ($1) ON CONFLICT (nombre) DO NOTHING',
        [archivo],
      );
      console.log(`Migracion aplicada: ${archivo}`);
      aplicadas++;
      archivoEnCurso = null;
    }

    console.log(
      aplicadas === 0
        ? 'Todas las migraciones estan al dia.'
        : `Listo: ${aplicadas} migracion(es) aplicada(s).`,
    );
  } catch (error) {
    if (archivoEnCurso) {
      console.error(`Error aplicando ${archivoEnCurso}:`, error.message);
      console.error(
        'La migracion se revirtio sola si trae BEGIN; y COMMIT;, que es lo que exige la convencion.',
      );
    } else {
      console.error('Error al ejecutar las migraciones:', error.message);
    }
    process.exitCode = 1;
  } finally {
    cliente.release();
    await pool.end();
  }
}

ejecutarMigraciones();
