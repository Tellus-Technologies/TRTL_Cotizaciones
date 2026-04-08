import api from './api';
import type { Cliente } from '../types';

export async function getClientes(): Promise<Cliente[]> {
  const { data } = await api.get('/clientes');
  return data;
}

export async function createCliente(nombre: string, comen: string) {
  const { data } = await api.post('/clientes', { nombre, comen });
  return data;
}

export async function updateCliente(id: number, nombre: string, comen: string) {
  const { data } = await api.put(`/clientes/${id}`, { nombre, comen });
  return data;
}

export async function deleteCliente(id: number) {
  const { data } = await api.delete(`/clientes/${id}`);
  return data;
}
