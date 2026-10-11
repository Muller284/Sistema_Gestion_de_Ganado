class RepositorioBase {
  constructor(dbPool, ranchoId, usuarioActualId) {
    if (!ranchoId) {
      throw new Error("SEGURIDAD CRÍTICA: No se puede instanciar un repositorio sin indicar el rancho_id.");
    }
    this.db = dbPool;
    this.ranchoId = ranchoId;
    this.usuarioId = usuarioActualId;
  }

  async consultar(tabla, condicionesExtra = '', params = []) {
    const query = `SELECT * FROM ${tabla} WHERE rancho_id = $1 AND eliminado_en IS NULL ${condicionesExtra}`;
    const valores = [this.ranchoId, ...params];
    const resultado = await this.db.query(query, valores);
    return resultado.rows;
  }

  async insertar(tabla, datos) {
    datos.rancho_id = this.ranchoId;
    datos.creado_por = this.usuarioId;
    datos.modificado_por = this.usuarioId;

    const columnas = Object.keys(datos).join(', ');
    const placeholders = Object.keys(datos).map((_, i) => `$${i + 1}`).join(', ');
    const valores = Object.values(datos);

    const query = `INSERT INTO ${tabla} (${columnas}) VALUES (${placeholders}) RETURNING *`;
    const resultado = await this.db.query(query, valores);
    return resultado.rows[0];
  }
}

module.exports = RepositorioBase;