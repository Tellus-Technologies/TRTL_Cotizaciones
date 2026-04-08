import api from './api';
import type { Modulo } from '../types';

export async function getModulos(): Promise<Modulo[]> {
  const { data } = await api.get('/modulos');
  return data;
}

export async function createModulo(modu: string, descrip: string) {
  const { data } = await api.post('/modulos', { modu, descrip });
  return data;
}

export async function updateModulo(id: number, modu: string, descrip: string) {
  const { data } = await api.put(`/modulos/${id}`, { modu, descrip });
  return data;
}

export async function deleteModulo(id: number) {
  const { data } = await api.delete(`/modulos/${id}`);
  return data;
}
