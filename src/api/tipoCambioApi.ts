import api from './api';

export type TipoCambioResponse = {
  source: string;
  serie: string;
  fecha: string;
  tipo_cambio: number;
};

export const getTipoCambioActual = async () => {
  const { data } = await api.get<TipoCambioResponse>('/tipo-cambio/actual');
  return data;
};