import api from './api';
import type {
  ProyectoCreatePayload,
  ProyectoDetalleResponse,
  ProyectoResumen,
  ProyectoUpdatePayload,
} from '../types';

export const getProyectos = async (params?: {
  cliente_id?: number | string;
  numero_proyecto?: number | string;
  metodologia?: string;
}) => {
  const { data } = await api.get<ProyectoResumen[]>('/proyectos', { params });
  return data;
};

export const getProyectoDetalle = async (id: number | string) => {
  const { data } = await api.get<ProyectoDetalleResponse>(`/proyectos/${id}`);
  return data;
};

export const createProyecto = async (payload: ProyectoCreatePayload) => {
  const { data } = await api.post('/proyectos', payload);
  return data;
};

export const updateProyecto = async (
  id: number | string,
  payload: ProyectoUpdatePayload
) => {
  const { data } = await api.put(`/proyectos/${id}`, payload);
  return data;
};

export const deleteProyecto = async (id: number | string) => {
  const { data } = await api.delete(`/proyectos/${id}`);
  return data;
};