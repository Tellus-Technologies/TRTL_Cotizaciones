import { pool } from '../config/database.js';

const BANXICO_SERIE_FIX = 'SF43718';

export const getTipoCambioActual = async (req, res) => {
  try {
    const token = process.env.BANXICO_TOKEN;

    if (!token) {
      return res.status(500).json({ error: 'Falta configurar BANXICO_TOKEN en el backend' });
    }

    const url = `https://www.banxico.org.mx/SieAPIRest/service/v1/series/${BANXICO_SERIE_FIX}/datos/oportuno?token=${token}`;

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('Error Banxico:', text);
      return res.status(502).json({ error: 'No se pudo consultar el tipo de cambio en Banxico' });
    }

    const data = await response.json();

    const serie = data?.bmx?.series?.[0];
    const dato = serie?.datos?.[0];

    if (!dato?.dato) {
      return res.status(404).json({ error: 'No se encontró dato de tipo de cambio' });
    }

    const tipoCambio = Number(String(dato.dato).replace(',', ''));

    return res.json({
      source: 'Banxico',
      serie: BANXICO_SERIE_FIX,
      fecha: dato.fecha,
      tipo_cambio: tipoCambio,
    });
  } catch (err) {
    console.error('Error al obtener tipo de cambio:', err);
    return res.status(500).json({ error: 'Error al obtener tipo de cambio actual' });
  }
};