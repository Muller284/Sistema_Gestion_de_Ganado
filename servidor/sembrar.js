const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:tu_password@localhost:5432/sistema_ganado'
});

async function ejecutarSemillas() {
  const client = await pool.connect();
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
    console.error('Error al sembrar datos de prueba:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

ejecutarSemillas();
