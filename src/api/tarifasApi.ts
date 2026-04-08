import api from './api';
import type { TarifaClienteModulo } from '../types';

export async function getTarifas(params = {}): Promise<TarifaClienteModulo[]> {
  const { data } = await api.get('/tarifas', { params });
  return data;
}

export async function createTarifa(
  cliente_id: number,
  modulo_id: number,
  anio_fiscal: string,
  tarifa_mxn: number
) {
  const { data } = await api.post('/tarifas', {
    cliente_id, modulo_id, anio_fiscal, tarifa_mxn
  });
  return data;
}

export async function updateTarifa(
  id: number,
  cliente_id: number,
  modulo_id: number,
  anio_fiscal: string,
  tarifa_mxn: number
) {
  const { data } = await api.put(`/tarifas/${id}`, {
    cliente_id, modulo_id, anio_fiscal, tarifa_mxn
  });
  return data;
}

export async function deleteTarifa(id: number) {
  const { data } = await api.delete(`/tarifas/${id}`);
  return data;
}
