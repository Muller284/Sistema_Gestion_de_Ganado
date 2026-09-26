require('./cargar-entorno').cargarEntorno();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

let connectionString =
  process.env.DATABASE_URL ||
  'postgres://ganado_usuario:1234@localhost:5432/gestion_ganado';

// Si corre fuera de Docker y la URL tiene '@postgres:', usar localhost
if (connectionString.includes('@postgres:') && !fs.existsSync('/.dockerenv')) {
  connectionString = connectionString.replace('@postgres:', '@localhost:');
}

const pool = new Pool({ connectionString });

async function ejecutarSemillas() {
  let client;
  try {
    client = await pool.connect();
  } catch (error) {
    console.error('No se pudo conectar a la base de datos:', error.message);
    console.error(
      'Revisa que la base este levantada (docker compose up -d postgres) y que DATABASE_URL en el .env sea correcta.',
    );
    process.exitCode = 1;
    await pool.end();
    return;
  }

  try {
    console.log('Iniciando carga de semillas de datos de prueba (HU-04)...');
    const dirSemillas = path.join(__dirname, 'semillas');
    const archivos = fs.readdirSync(dirSemillas)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const archivo of archivos) {
      console.log(`Aplicando semilla: ${archivo}`);
      const rutaArchivo = path.join(dirSemillas, archivo);
      const sql = fs.readFileSync(rutaArchivo, 'utf8');
      await client.query(sql);
      console.log(`Semilla aplicada con éxito: ${archivo}`);
    }

    console.log('Todas las semillas de prueba fueron cargadas correctamente.');
  } catch (error) {
    console.error('Error al sembrar datos de prueba:', error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

ejecutarSemillas();
