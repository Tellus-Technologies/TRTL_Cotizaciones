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

export type ProyectoResumen = {
  id: number;
  numero_proyecto: number;
  cliente_id: number;
  cliente_nombre: string;
  nombre_proyecto: string | null;
  metodologia: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  tipo_cambio: number;
  anios_fiscales: string | null;
  total_mxn: number;
  total_usd: number;
  total_dias: number;
  total_horas: number;
  created_at: string;
  updated_at: string;
};

export type ProyectoModulo = {
  id: number;
  proyecto_id: number;
  modulo_id: number;
  modulo_nombre: string;
  modulo_descripcion?: string | null;
  tarifa_mxn: number;
  dias: number;
  horas: number;
  total_mxn: number;
  total_usd: number;
};

export type ProyectoFase = {
  id: number;
  proyecto_id: number;
  orden_fase: number;
  nombre_fase: string;
  dias: number;
  porcentaje: number;
  plan_inicio: number | null;
  monto_mxn: number;
  monto_usd: number;
  fechas_asignadas: string[];
};

export type ProyectoRecurso = {
  id: number;
  proyecto_id: number;
  modulo_id: number;
  modulo_nombre: string;
  modulo_descripcion?: string | null;
  tarifa_hora: number;
  dias_asignados: number;
  horas: number;
  total_mxn: number;
  total_usd: number;
  fechas_asignadas: string[];
};

export type ProyectoDetalleResponse = {
  proyecto: ProyectoResumen & {
    cliente_comentario?: string | null;
  };
  modulos: ProyectoModulo[];
  fases: ProyectoFase[];
  recursos: ProyectoRecurso[];
};

export type ProyectoCreatePayload = {
  cliente_id: number;
  nombre_proyecto?: string;
  metodologia?: string;
  fecha_inicio: string;
  fecha_fin: string;
  tipo_cambio: number;
  anios_fiscales: string[] | string;
  total_mxn: number;
  total_usd: number;
  total_dias: number;
  total_horas: number;
  modulos: Array<{
    modulo_id: number;
    tarifa_mxn: number;
    dias: number;
    horas: number;
    total_mxn: number;
    total_usd: number;
  }>;
  fases: Array<{
    orden_fase?: number;
    nombre_fase?: string;
    nombre?: string;
    dias: number;
    porcentaje: number;
    plan_inicio?: number | null;
    monto_mxn: number;
    monto_usd: number;
    fechas_asignadas: string[];
  }>;
  recursos: Array<{
    modulo_id?: number;
    recurso_id?: number;
    tarifa_hora: number;
    dias_asignados: number;
    horas: number;
    total_mxn: number;
    total_usd: number;
    fechas_asignadas: string[];
  }>;
};