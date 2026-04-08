import { pool } from '../config/database.js';

// Obtener tarifas con filtros dinámicos
export const getTarifas = async (req, res) => {
  try {
    const { cliente_id, modulo_id, anio_fiscal } = req.query;

    let query = `
      SELECT t.*, c.nombre AS cliente_nombre, m.modu AS modulo_nombre
      FROM tarifas t
      LEFT JOIN clientes c ON t.cliente_id = c.id
      LEFT JOIN modulos m ON t.modulo_id = m.id
    `;
    const conditions = [];
    const values = [];

    if (cliente_id) {
      conditions.push(`t.cliente_id = $${values.length + 1}`);
      values.push(cliente_id);
    }
    if (modulo_id) {
      conditions.push(`t.modulo_id = $${values.length + 1}`);
      values.push(modulo_id);
    }
    if (anio_fiscal) {
      conditions.push(`t.anio_fiscal = $${values.length + 1}`);
      values.push(anio_fiscal);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY t.id';

    const { rows } = await pool.query(query, values);
    res.json(rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener tarifas' });
  }
};


// Crear tarifa con validación única por cliente+modulo+anio
export const createTarifa = async (req, res) => {
  const { cliente_id, modulo_id, anio_fiscal, tarifa_mxn } = req.body;
  try {
    const existing = await pool.query(
      'SELECT 1 FROM tarifas WHERE cliente_id=$1 AND modulo_id=$2 AND anio_fiscal=$3',
      [cliente_id, modulo_id, anio_fiscal]
    );
    if (existing.rowCount > 0) {
      return res.status(409).json({ error: 'Ya existe una tarifa para este cliente, módulo y año' });
    }

    const { rows } = await pool.query(
      'INSERT INTO tarifas (cliente_id, modulo_id, anio_fiscal, tarifa_mxn) VALUES ($1, $2, $3, $4) RETURNING *',
      [cliente_id, modulo_id, anio_fiscal, tarifa_mxn]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al crear tarifa' });
  }
};

// Actualizar tarifa
export const updateTarifa = async (req, res) => {
  const { id } = req.params;
  const { cliente_id, modulo_id, anio_fiscal, tarifa_mxn } = req.body;
  try {
    const existing = await pool.query(
      'SELECT 1 FROM tarifas WHERE cliente_id=$1 AND modulo_id=$2 AND anio_fiscal=$3 AND id<>$4',
      [cliente_id, modulo_id, anio_fiscal, id]
    );
    if (existing.rowCount > 0) {
      return res.status(409).json({ error: 'Ya existe otra tarifa con esos datos' });
    }

    await pool.query(
      'UPDATE tarifas SET cliente_id=$1, modulo_id=$2, anio_fiscal=$3, tarifa_mxn=$4 WHERE id=$5',
      [cliente_id, modulo_id, anio_fiscal, tarifa_mxn, id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar tarifa' });
  }
};

// Eliminar tarifa
export const deleteTarifa = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM tarifas WHERE id=$1', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar tarifa' });
  }
};
