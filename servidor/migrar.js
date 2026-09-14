const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:tu_password@localhost:5432/sistema_ganado'
});

async function ejecutarMigraciones() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Asegurar que existe la tabla de control de migraciones
    await client.query(`
      CREATE TABLE IF NOT EXISTS migraciones_aplicadas (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nombre VARCHAR(255) NOT NULL UNIQUE,
        aplicado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Apunta correctamente a la carpeta 'migraciones' que está al lado de este archivo
    const dirMigraciones = path.join(__dirname, 'migraciones');
    const archivos = fs.readdirSync(dirMigraciones)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const archivo of archivos) {
      const res = await client.query('SELECT 1 FROM migraciones_aplicadas WHERE nombre = $1', [archivo]);
      if (res.rowCount === 0) {
        console.log(`Aplicando migración: ${archivo}`);
        const rutaArchivo = path.join(dirMigraciones, archivo);
        const sql = fs.readFileSync(rutaArchivo, 'utf8');
        await client.query(sql);
        await client.query('INSERT INTO migraciones_aplicadas (nombre) VALUES ($1)', [archivo]);
        console.log(`Migración aplicada con éxito: ${archivo}`);
      }
    }

    await client.query('COMMIT');
    console.log('Todas las migraciones están al día.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al ejecutar las migraciones:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

ejecutarMigraciones();