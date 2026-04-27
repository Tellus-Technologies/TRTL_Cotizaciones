import { pool } from '../config/database.js';

// Obtener todos los proyectos
export const getProyectos = async (req, res) => {
  try {
    const { cliente_id, numero_proyecto, metodologia } = req.query;

    let query = `
      SELECT
        p.id,
        p.numero_proyecto,
        p.cliente_id,
        c.nombre AS cliente_nombre,
        p.nombre_proyecto,
        p.metodologia,
        p.fecha_inicio,
        p.fecha_fin,
        p.tipo_cambio,
        p.anios_fiscales,
        p.total_mxn,
        p.total_usd,
        p.total_dias,
        p.total_horas,
        p.created_at,
        p.updated_at
      FROM proyectos p
      INNER JOIN clientes c ON p.cliente_id = c.id
    `;

    const conditions = [];
    const values = [];

    if (cliente_id) {
      conditions.push(`p.cliente_id = $${values.length + 1}`);
      values.push(cliente_id);
    }

    if (numero_proyecto) {
      conditions.push(`p.numero_proyecto = $${values.length + 1}`);
      values.push(numero_proyecto);
    }

    if (metodologia) {
      conditions.push(`p.metodologia = $${values.length + 1}`);
      values.push(metodologia);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY p.created_at DESC, p.id DESC`;

    const { rows } = await pool.query(query, values);
    res.json(rows);
  } catch (err) {
    console.error('Error al obtener proyectos:', err);
    res.status(500).json({ error: 'Error al obtener proyectos' });
  }
};

// Obtener detalle de un proyecto
export const getProyectoDetalle = async (req, res) => {
  const { id } = req.params;

  try {
    const proyectoQuery = `
      SELECT
        p.*,
        c.nombre AS cliente_nombre,
        c.comen AS cliente_comentario
      FROM proyectos p
      INNER JOIN clientes c ON p.cliente_id = c.id
      WHERE p.id = $1
    `;
    const proyectoResult = await pool.query(proyectoQuery, [id]);

    if (proyectoResult.rowCount === 0) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }

    const proyecto = proyectoResult.rows[0];

    const modulosQuery = `
      SELECT
        pm.*,
        m.modu AS modulo_nombre,
        m.descrip AS modulo_descripcion
      FROM proyecto_modulos pm
      INNER JOIN modulos m ON pm.modulo_id = m.id
      WHERE pm.proyecto_id = $1
      ORDER BY pm.id
    `;
    const modulosResult = await pool.query(modulosQuery, [id]);

    const fasesQuery = `
      SELECT *
      FROM proyecto_fases
      WHERE proyecto_id = $1
      ORDER BY orden_fase ASC, id ASC
    `;
    const fasesResult = await pool.query(fasesQuery, [id]);

    const fasesConFechas = [];
    for (const fase of fasesResult.rows) {
      const fechasResult = await pool.query(
        `
          SELECT fecha
          FROM proyecto_fase_fechas
          WHERE proyecto_fase_id = $1
          ORDER BY fecha ASC
        `,
        [fase.id]
      );

      fasesConFechas.push({
        ...fase,
        fechas_asignadas: fechasResult.rows.map((f) => f.fecha),
      });
    }

    const recursosQuery = `
      SELECT
        pr.*,
        m.modu AS modulo_nombre,
        m.descrip AS modulo_descripcion
      FROM proyecto_recursos pr
      INNER JOIN modulos m ON pr.modulo_id = m.id
      WHERE pr.proyecto_id = $1
      ORDER BY pr.id
    `;
    const recursosResult = await pool.query(recursosQuery, [id]);

    const recursosConFechas = [];
    for (const recurso of recursosResult.rows) {
      const fechasResult = await pool.query(
        `
          SELECT fecha
          FROM proyecto_recurso_fechas
          WHERE proyecto_recurso_id = $1
          ORDER BY fecha ASC
        `,
        [recurso.id]
      );

      recursosConFechas.push({
        ...recurso,
        fechas_asignadas: fechasResult.rows.map((f) => f.fecha),
      });
    }

    res.json({
      proyecto,
      modulos: modulosResult.rows,
      fases: fasesConFechas,
      recursos: recursosConFechas,
    });
  } catch (err) {
    console.error('Error al obtener detalle del proyecto:', err);
    res.status(500).json({ error: 'Error al obtener detalle del proyecto' });
  }
};

// Crear proyecto completo
export const createProyecto = async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      cliente_id,
      nombre_proyecto,
      metodologia,
      fecha_inicio,
      fecha_fin,
      tipo_cambio,
      anios_fiscales,
      total_mxn,
      total_usd,
      total_dias,
      total_horas,
      modulos,
      fases,
      recursos,
    } = req.body;

    if (!cliente_id) {
      return res.status(400).json({ error: 'El cliente es obligatorio' });
    }

    if (!fecha_inicio || !fecha_fin) {
      return res.status(400).json({ error: 'Las fechas de inicio y fin son obligatorias' });
    }

    if (!Array.isArray(modulos) || modulos.length === 0) {
      return res.status(400).json({ error: 'Debes enviar al menos un módulo en el proyecto' });
    }

    await client.query('BEGIN');

    const clienteExiste = await client.query(
      'SELECT 1 FROM clientes WHERE id = $1',
      [cliente_id]
    );

    if (clienteExiste.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'El cliente seleccionado no existe' });
    }

    const insertProyectoQuery = `
      INSERT INTO proyectos (
        cliente_id,
        nombre_proyecto,
        metodologia,
        fecha_inicio,
        fecha_fin,
        tipo_cambio,
        anios_fiscales,
        total_mxn,
        total_usd,
        total_dias,
        total_horas
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING *
    `;

    const proyectoResult = await client.query(insertProyectoQuery, [
      cliente_id,
      nombre_proyecto || null,
      metodologia || null,
      fecha_inicio,
      fecha_fin,
      tipo_cambio || 0,
      Array.isArray(anios_fiscales) ? anios_fiscales.join(', ') : (anios_fiscales || null),
      total_mxn || 0,
      total_usd || 0,
      total_dias || 0,
      total_horas || 0,
    ]);

    const proyecto = proyectoResult.rows[0];
    const proyectoId = proyecto.id;

    for (const item of modulos || []) {
      await client.query(
        `
          INSERT INTO proyecto_modulos (
            proyecto_id,
            modulo_id,
            tarifa_mxn,
            dias,
            horas,
            total_mxn,
            total_usd
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7)
        `,
        [
          proyectoId,
          item.modulo_id,
          item.tarifa_mxn || 0,
          item.dias || 0,
          item.horas || 0,
          item.total_mxn || 0,
          item.total_usd || 0,
        ]
      );
    }

    for (const [index, fase] of (fases || []).entries()) {
      const faseResult = await client.query(
        `
          INSERT INTO proyecto_fases (
            proyecto_id,
            orden_fase,
            nombre_fase,
            dias,
            porcentaje,
            plan_inicio,
            monto_mxn,
            monto_usd
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
          RETURNING id
        `,
        [
          proyectoId,
          fase.orden_fase || index + 1,
          fase.nombre_fase || fase.nombre || `Fase ${index + 1}`,
          fase.dias || 0,
          fase.porcentaje || 0,
          fase.plan_inicio || null,
          fase.monto_mxn || 0,
          fase.monto_usd || 0,
        ]
      );

      const proyectoFaseId = faseResult.rows[0].id;
      const fechasAsignadas = fase.fechas_asignadas || [];

      for (const fecha of fechasAsignadas) {
        await client.query(
          `
            INSERT INTO proyecto_fase_fechas (
              proyecto_fase_id,
              fecha
            )
            VALUES ($1,$2)
          `,
          [proyectoFaseId, fecha]
        );
      }
    }

    for (const recurso of recursos || []) {
      const recursoResult = await client.query(
        `
          INSERT INTO proyecto_recursos (
            proyecto_id,
            modulo_id,
            tarifa_hora,
            dias_asignados,
            horas,
            total_mxn,
            total_usd
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7)
          RETURNING id
        `,
        [
          proyectoId,
          recurso.modulo_id || recurso.recurso_id,
          recurso.tarifa_hora || 0,
          recurso.dias_asignados || 0,
          recurso.horas || 0,
          recurso.total_mxn || 0,
          recurso.total_usd || 0,
        ]
      );

      const proyectoRecursoId = recursoResult.rows[0].id;
      const fechasAsignadas = recurso.fechas_asignadas || [];

      for (const fecha of fechasAsignadas) {
        await client.query(
          `
            INSERT INTO proyecto_recurso_fechas (
              proyecto_recurso_id,
              fecha
            )
            VALUES ($1,$2)
          `,
          [proyectoRecursoId, fecha]
        );
      }
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      proyecto,
      message: `Proyecto ${proyecto.numero_proyecto} creado con éxito`,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al crear proyecto:', err);
    res.status(500).json({ error: 'Error al crear proyecto' });
  } finally {
    client.release();
  }
};

// Eliminar proyecto
export const deleteProyecto = async (req, res) => {
  const { id } = req.params;

  try {
    const existe = await pool.query(
      'SELECT 1 FROM proyectos WHERE id = $1',
      [id]
    );

    if (existe.rowCount === 0) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }

    await pool.query('DELETE FROM proyectos WHERE id = $1', [id]);

    res.json({ success: true });
  } catch (err) {
    console.error('Error al eliminar proyecto:', err);
    res.status(500).json({ error: 'Error al eliminar proyecto' });
  }
};