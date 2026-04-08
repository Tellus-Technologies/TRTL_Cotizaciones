import { pool } from '../config/database.js';

// Obtener todos los clientes
export const getClientes = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM clientes ORDER BY id');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener clientes' });
  }
};

// Crear cliente con validación de duplicados
export const createCliente = async (req, res) => {
  const { nombre, comen } = req.body;
  try {
    const existing = await pool.query('SELECT 1 FROM clientes WHERE nombre=$1', [nombre]);
    if (existing.rowCount > 0) {
      return res.status(409).json({ error: 'Ya existe un cliente con ese nombre' });
    }

    const { rows } = await pool.query(
      'INSERT INTO clientes (nombre, comen) VALUES ($1, $2) RETURNING *',
      [nombre, comen]
    );
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Nombre de cliente duplicado' });
    }
    res.status(500).json({ error: 'Error al crear cliente' });
  }
};

// Actualizar cliente con validación
export const updateCliente = async (req, res) => {
  const { id } = req.params;
  const { nombre, comen } = req.body;
  try {
    const existing = await pool.query('SELECT 1 FROM clientes WHERE nombre=$1 AND id<>$2', [nombre, id]);
    if (existing.rowCount > 0) {
      return res.status(409).json({ error: 'Ya existe otro cliente con ese nombre' });
    }

    await pool.query(
      'UPDATE clientes SET nombre=$1, comen=$2 WHERE id=$3',
      [nombre, comen, id]
    );
    res.json({ success: true });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Nombre de cliente duplicado' });
    }
    res.status(500).json({ error: 'Error al actualizar cliente' });
  }
};

// Eliminar cliente con verificación de tarifas asociadas
export const deleteCliente = async (req, res) => {
  const { id } = req.params;
  try {
    const tarifas = await pool.query('SELECT 1 FROM tarifas WHERE cliente_id=$1 LIMIT 1', [id]);
    if (tarifas.rowCount > 0) {
      return res.status(400).json({ error: 'No se puede eliminar el cliente porque tiene tarifas asociadas' });
    }

    await pool.query('DELETE FROM clientes WHERE id=$1', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar cliente' });
  }
};
