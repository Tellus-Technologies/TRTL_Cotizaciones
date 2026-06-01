import { pool } from '../config/database.js';

const toNumber = (value, defaultValue = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : defaultValue;
};

const toNullableNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const normalizeAniosFiscales = (anios_fiscales) => {
  if (Array.isArray(anios_fiscales)) {
    return anios_fiscales.join(', ');
  }

  return anios_fiscales || null;
};

const normalizeFechaArray = (fechas) => {
  if (!Array.isArray(fechas)) return [];

  return [...new Set(fechas)]
    .filter(Boolean)
    .map((fecha) => String(fecha).slice(0, 10))
    .sort((a, b) => a.localeCompare(b));
};

const deleteProyectoDetalles = async (client, proyectoId) => {
  await client.query(
    `
      DELETE FROM proyecto_fase_fechas
      WHERE proyecto_fase_id IN (
        SELECT id
        FROM proyecto_fases
        WHERE proyecto_id = $1
      )
    `,
    [proyectoId]
  );

  await client.query(
    `
      DELETE FROM proyecto_recurso_fechas
      WHERE proyecto_recurso_id IN (
        SELECT id
        FROM proyecto_recursos
        WHERE proyecto_id = $1
      )
    `,
    [proyectoId]
  );

  await client.query(
    'DELETE FROM proyecto_fases WHERE proyecto_id = $1',
    [proyectoId]
  );

  await client.query(
    'DELETE FROM proyecto_recursos WHERE proyecto_id = $1',
    [proyectoId]
  );

  await client.query(
    'DELETE FROM proyecto_modulos WHERE proyecto_id = $1',
    [proyectoId]
  );
};

const insertProyectoDetalles = async (client, proyectoId, modulos = [], fases = [], recursos = []) => {
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
        toNumber(item.tarifa_mxn),
        toNumber(item.dias),
        toNumber(item.horas),
        toNumber(item.total_mxn),
        toNumber(item.total_usd),
      ]
    );
  }

  for (const [index, fase] of (fases || []).entries()) {
    const montoEstimadoMXN = toNumber(
      fase.monto_estimado_mxn ?? fase.monto_mxn
    );

    const montoEstimadoUSD = toNumber(
      fase.monto_estimado_usd ?? fase.monto_usd
    );

    const montoFinalMXN = toNumber(
      fase.monto_final_mxn ?? fase.monto_mxn ?? fase.monto_estimado_mxn
    );

    const montoFinalUSD = toNumber(
      fase.monto_final_usd ?? fase.monto_usd ?? fase.monto_estimado_usd
    );

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
          monto_usd,
          monto_estimado_mxn,
          monto_estimado_usd,
          monto_final_mxn,
          monto_final_usd
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        RETURNING id
      `,
      [
        proyectoId,
        fase.orden_fase || index + 1,
        fase.nombre_fase || fase.nombre || `Fase ${index + 1}`,
        toNumber(fase.dias),
        toNumber(fase.porcentaje),
        toNullableNumber(fase.plan_inicio),
        montoFinalMXN,
        montoFinalUSD,
        montoEstimadoMXN,
        montoEstimadoUSD,
        montoFinalMXN,
        montoFinalUSD,
      ]
    );

    const proyectoFaseId = faseResult.rows[0].id;
    const fechasAsignadas = normalizeFechaArray(fase.fechas_asignadas);

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

  for (const [index, recurso] of (recursos || []).entries()) {
    const recursoResult = await client.query(
      `
        INSERT INTO proyecto_recursos (
          proyecto_id,
          modulo_id,
          recurso_numero,
          tarifa_hora,
          dias_asignados,
          horas,
          total_mxn,
          total_usd
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        RETURNING id
      `,
      [
        proyectoId,
        recurso.modulo_id || recurso.recurso_id,
        recurso.recurso_numero || index + 1,
        toNumber(recurso.tarifa_hora),
        toNumber(recurso.dias_asignados),
        toNumber(recurso.horas),
        toNumber(recurso.total_mxn),
        toNumber(recurso.total_usd),
      ]
    );

    const proyectoRecursoId = recursoResult.rows[0].id;
    const fechasAsignadas = normalizeFechaArray(recurso.fechas_asignadas);

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
};

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

        p.subtotal_mxn,
        p.subtotal_usd,
        p.tipo_descuento,
        p.valor_descuento,
        p.descuento_mxn,
        p.descuento_usd,
        p.total_final_mxn,
        p.total_final_usd,
        p.comentario_proyecto,

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
      ORDER BY pr.modulo_id ASC, pr.recurso_numero ASC, pr.id ASC
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

      subtotal_mxn,
      subtotal_usd,
      tipo_descuento,
      valor_descuento,
      descuento_mxn,
      descuento_usd,
      total_final_mxn,
      total_final_usd,
      comentario_proyecto,

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

    if (!Array.isArray(fases) || fases.length === 0) {
      return res.status(400).json({ error: 'Debes enviar las fases del proyecto' });
    }

    if (!Array.isArray(recursos) || recursos.length === 0) {
      return res.status(400).json({ error: 'Debes enviar los recursos del proyecto' });
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

    const subtotalMXNValue = toNumber(subtotal_mxn ?? total_mxn);
    const subtotalUSDValue = toNumber(subtotal_usd ?? total_usd);
    const descuentoMXNValue = toNumber(descuento_mxn);
    const descuentoUSDValue = toNumber(descuento_usd);

    const totalFinalMXNValue = toNumber(
      total_final_mxn ?? total_mxn ?? subtotalMXNValue
    );

    const totalFinalUSDValue = toNumber(
      total_final_usd ?? total_usd ?? subtotalUSDValue
    );

    const insertProyectoQuery = `
      INSERT INTO proyectos (
        cliente_id,
        nombre_proyecto,
        metodologia,
        fecha_inicio,
        fecha_fin,
        tipo_cambio,
        anios_fiscales,

        subtotal_mxn,
        subtotal_usd,
        tipo_descuento,
        valor_descuento,
        descuento_mxn,
        descuento_usd,
        total_final_mxn,
        total_final_usd,
        comentario_proyecto,

        total_mxn,
        total_usd,
        total_dias,
        total_horas
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,
        $8,$9,$10,$11,$12,$13,$14,$15,$16,
        $17,$18,$19,$20
      )
      RETURNING *
    `;

    const proyectoResult = await client.query(insertProyectoQuery, [
      cliente_id,
      nombre_proyecto || null,
      metodologia || null,
      fecha_inicio,
      fecha_fin,
      toNumber(tipo_cambio),
      normalizeAniosFiscales(anios_fiscales),

      subtotalMXNValue,
      subtotalUSDValue,
      tipo_descuento || null,
      toNumber(valor_descuento),
      descuentoMXNValue,
      descuentoUSDValue,
      totalFinalMXNValue,
      totalFinalUSDValue,
      comentario_proyecto || null,

      totalFinalMXNValue,
      totalFinalUSDValue,
      toNumber(total_dias),
      toNumber(total_horas),
    ]);

    const proyecto = proyectoResult.rows[0];
    const proyectoId = proyecto.id;

    await insertProyectoDetalles(client, proyectoId, modulos, fases, recursos);

    await client.query('COMMIT');

    res.json({
      success: true,
      id: proyecto.id,
      numero_proyecto: proyecto.numero_proyecto,
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

// Actualizar proyecto completo
export const updateProyecto = async (req, res) => {
  const { id } = req.params;
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

      subtotal_mxn,
      subtotal_usd,
      tipo_descuento,
      valor_descuento,
      descuento_mxn,
      descuento_usd,
      total_final_mxn,
      total_final_usd,
      comentario_proyecto,

      total_mxn,
      total_usd,
      total_dias,
      total_horas,

      modulos,
      fases,
      recursos,
    } = req.body;

    await client.query('BEGIN');

    const proyectoExiste = await client.query(
      'SELECT * FROM proyectos WHERE id = $1',
      [id]
    );

    if (proyectoExiste.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }

    const proyectoActual = proyectoExiste.rows[0];

    const clienteFinal = cliente_id || proyectoActual.cliente_id;

    const clienteExiste = await client.query(
      'SELECT 1 FROM clientes WHERE id = $1',
      [clienteFinal]
    );

    if (clienteExiste.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'El cliente seleccionado no existe' });
    }

    const subtotalMXNValue = toNumber(
      subtotal_mxn ?? total_mxn ?? proyectoActual.subtotal_mxn ?? proyectoActual.total_mxn
    );

    const subtotalUSDValue = toNumber(
      subtotal_usd ?? total_usd ?? proyectoActual.subtotal_usd ?? proyectoActual.total_usd
    );

    const descuentoMXNValue = toNumber(
      descuento_mxn ?? proyectoActual.descuento_mxn
    );

    const descuentoUSDValue = toNumber(
      descuento_usd ?? proyectoActual.descuento_usd
    );

    const totalFinalMXNValue = toNumber(
      total_final_mxn ?? total_mxn ?? proyectoActual.total_final_mxn ?? proyectoActual.total_mxn
    );

    const totalFinalUSDValue = toNumber(
      total_final_usd ?? total_usd ?? proyectoActual.total_final_usd ?? proyectoActual.total_usd
    );

    const updateProyectoQuery = `
      UPDATE proyectos
      SET
        cliente_id = $1,
        nombre_proyecto = $2,
        metodologia = $3,
        fecha_inicio = $4,
        fecha_fin = $5,
        tipo_cambio = $6,
        anios_fiscales = $7,

        subtotal_mxn = $8,
        subtotal_usd = $9,
        tipo_descuento = $10,
        valor_descuento = $11,
        descuento_mxn = $12,
        descuento_usd = $13,
        total_final_mxn = $14,
        total_final_usd = $15,
        comentario_proyecto = $16,

        total_mxn = $17,
        total_usd = $18,
        total_dias = $19,
        total_horas = $20,
        updated_at = NOW()
      WHERE id = $21
      RETURNING *
    `;

    const proyectoResult = await client.query(updateProyectoQuery, [
      clienteFinal,
      nombre_proyecto ?? proyectoActual.nombre_proyecto,
      metodologia ?? proyectoActual.metodologia,
      fecha_inicio ?? proyectoActual.fecha_inicio,
      fecha_fin ?? proyectoActual.fecha_fin,
      toNumber(tipo_cambio ?? proyectoActual.tipo_cambio),
      anios_fiscales !== undefined
        ? normalizeAniosFiscales(anios_fiscales)
        : proyectoActual.anios_fiscales,

      subtotalMXNValue,
      subtotalUSDValue,
      tipo_descuento !== undefined ? tipo_descuento || null : proyectoActual.tipo_descuento,
      toNumber(valor_descuento ?? proyectoActual.valor_descuento),
      descuentoMXNValue,
      descuentoUSDValue,
      totalFinalMXNValue,
      totalFinalUSDValue,
      comentario_proyecto ?? proyectoActual.comentario_proyecto,

      totalFinalMXNValue,
      totalFinalUSDValue,
      toNumber(total_dias ?? proyectoActual.total_dias),
      toNumber(total_horas ?? proyectoActual.total_horas),
      id,
    ]);

    const shouldReplaceDetalles =
      Array.isArray(modulos) ||
      Array.isArray(fases) ||
      Array.isArray(recursos);

    if (shouldReplaceDetalles) {
      if (!Array.isArray(modulos) || modulos.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Debes enviar al menos un módulo en el proyecto' });
      }

      if (!Array.isArray(fases) || fases.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Debes enviar las fases del proyecto' });
      }

      if (!Array.isArray(recursos) || recursos.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Debes enviar los recursos del proyecto' });
      }

      await deleteProyectoDetalles(client, id);
      await insertProyectoDetalles(client, id, modulos, fases, recursos);
    }

    await client.query('COMMIT');

    const proyecto = proyectoResult.rows[0];

    res.json({
      success: true,
      id: proyecto.id,
      numero_proyecto: proyecto.numero_proyecto,
      proyecto,
      message: `Proyecto ${proyecto.numero_proyecto} actualizado con éxito`,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al actualizar proyecto:', err);
    res.status(500).json({ error: 'Error al actualizar proyecto' });
  } finally {
    client.release();
  }
};

// Eliminar proyecto
export const deleteProyecto = async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const existe = await client.query(
      'SELECT 1 FROM proyectos WHERE id = $1',
      [id]
    );

    if (existe.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }

    await deleteProyectoDetalles(client, id);

    await client.query(
      'DELETE FROM proyectos WHERE id = $1',
      [id]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Proyecto eliminado con éxito',
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al eliminar proyecto:', err);
    res.status(500).json({ error: 'Error al eliminar proyecto' });
  } finally {
    client.release();
  }
};