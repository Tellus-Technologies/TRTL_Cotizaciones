import { pool } from '../config/database.js';

// Obtener módulos
export const getModulos = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM modulos ORDER BY id');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener módulos' });
  }
};

// Crear módulo con validación de duplicados
export const createModulo = async (req, res) => {
  const { modu, descrip } = req.body;
  try {
    const existing = await pool.query('SELECT 1 FROM modulos WHERE modu=$1', [modu]);
    if (existing.rowCount > 0) {
      return res.status(409).json({ error: 'Ya existe un módulo con ese nombre' });
    }

    const { rows } = await pool.query(
      'INSERT INTO modulos (modu, descrip) VALUES ($1, $2) RETURNING *',
      [modu, descrip]
    );
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Nombre de módulo duplicado' });
    }
    res.status(500).json({ error: 'Error al crear módulo' });
  }
};

// Actualizar módulo con validación
export const updateModulo = async (req, res) => {
  const { id } = req.params;
  const { modu, descrip } = req.body;
  try {
    const existing = await pool.query('SELECT 1 FROM modulos WHERE modu=$1 AND id<>$2', [modu, id]);
    if (existing.rowCount > 0) {
      return res.status(409).json({ error: 'Ya existe otro módulo con ese nombre' });
    }

    await pool.query(
      'UPDATE modulos SET modu=$1, descrip=$2 WHERE id=$3',
      [modu, descrip, id]
    );
    res.json({ success: true });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Nombre de módulo duplicado' });
    }
    res.status(500).json({ error: 'Error al actualizar módulo' });
  }
};

// Eliminar módulo con verificación de tarifas asociadas
export const deleteModulo = async (req, res) => {
  const { id } = req.params;
  try {
    const tarifas = await pool.query('SELECT 1 FROM tarifas WHERE modulo_id=$1 LIMIT 1', [id]);
    if (tarifas.rowCount > 0) {
      return res.status(400).json({ error: 'No se puede eliminar el módulo porque tiene tarifas asociadas' });
    }

    await pool.query('DELETE FROM modulos WHERE id=$1', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar módulo' });
  }
};
