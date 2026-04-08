export type Cliente = {
  id: number;
  nombre: string;
  comen: string;  
};

export type Modulo = {
  id: number;
  modu: string;
  descrip: string;
};

export type TarifaClienteModulo = {
  id: number;
  cliente_id: number;
  modulo_id: number;
  anio_fiscal: string;
  tarifa_mxn: number;
  cliente_nombre?: string;
  modulo_nombre?: string;
};
