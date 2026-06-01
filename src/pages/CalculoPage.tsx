import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  OutlinedInput,
  Paper,
  Select,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Divider,
} from '@mui/material';
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import Holidays from 'date-holidays';
import type {
  Cliente,
  Modulo,
  TarifaClienteModulo,
  ProyectoCreatePayload,
} from '../types';
import { getClientes } from '../api/clientesApi';
import { getModulos } from '../api/modulosApi';
import { getTarifas } from '../api/tarifasApi';
import { createProyecto } from '../api/proyectosApi';
import { getTipoCambioActual } from '../api/tipoCambioApi';
import { useWorkingDaysMX } from '../hooks/useWorkingDaysMX';

type MetodologiaKey = 'ASAP' | 'ACTIVATE' | 'ITIL' | '';
type TipoDescuento = 'porcentaje' | 'monto';

type FaseItem = {
  nombre: string;
  dias: number | '';
  porcentaje: number | '';
  fechasAsignadas: string[];
};

type RecursoConfig = {
  moduloId: number;
  cantidad: number;
};

type RecursoPlaneacion = {
  instanceId: string;
  moduloId: number;
  recursoNumero: number;
  fechasAsignadas: string[];
};

type ProjectDay = {
  fecha: string;
  diaNumero: number;
  weekIndex: number;
  weekLabel: string;
  monthLabel: string;
  dayNameShort: string;
};

type RecursoDrag = {
  instanceId: string;
  startFecha: string;
  mode: 'add' | 'remove';
  isDragging: boolean;
};

const METODOLOGIAS: Record<Exclude<MetodologiaKey, ''>, string[]> = {
  ASAP: [
    'Preparación del proyecto',
    'Planes de Negocio',
    'Realización',
    'Preparación Final',
    'Go Live',
  ],
  ACTIVATE: [
    'Descubrir',
    'Preparar',
    'Explorar',
    'Realizar',
    'Desplegar',
    'Correr',
  ],
  ITIL: [
    'Estrategia del Servicio',
    'Diseño del Servicio',
    'Transición del Servicio',
    'Operación del Servicio',
    'Mejora Continua del Servicio',
  ],
};

const HOURS_PER_DAY = 8;
const DEFAULT_EXCHANGE_RATE = 17.92;

function formatCurrency(value: number) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function formatDateDMY(dateStr: string) {
  if (!dateStr) return '';
  const onlyDate = dateStr.slice(0, 10);
  const [year, month, day] = onlyDate.split('-');
  if (!year || !month || !day) return dateStr;
  return `${day}/${month}/${year}`;
}

function toISODate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getShortDayName(date: Date) {
  return ['D', 'L', 'M', 'M', 'J', 'V', 'S'][date.getDay()];
}

function getShortMonthName(date: Date) {
  return ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'][
    date.getMonth()
  ];
}

function generateProjectDays(startDate: string, endDate: string, hd: Holidays): ProjectDay[] {
  if (!startDate || !endDate) return [];
  if (startDate > endDate) return [];

  const result: ProjectDay[] = [];
  const current = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  let weekIndex = 1;
  let laborableCounter = 0;

  while (current <= end) {
    const day = current.getDay();
    const isHoliday = Boolean(hd.isHoliday(current));

    if (day !== 0 && day !== 6 && !isHoliday) {
      laborableCounter += 1;

      result.push({
        fecha: toISODate(current),
        diaNumero: laborableCounter,
        weekIndex,
        weekLabel: `Semana ${weekIndex}`,
        monthLabel: getShortMonthName(current),
        dayNameShort: getShortDayName(current),
      });

      if (laborableCounter % 5 === 0) {
        weekIndex += 1;
      }
    }

    current.setDate(current.getDate() + 1);
  }

  return result;
}

function uniqueSortedDates(dates: string[]) {
  return Array.from(new Set(dates)).sort((a, b) => a.localeCompare(b));
}

function buildInstanceId(moduloId: number, recursoNumero: number) {
  return `${moduloId}-${recursoNumero}`;
}

export default function CalculoPage() {
  const navigate = useNavigate();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [tarifas, setTarifas] = useState<TarifaClienteModulo[]>([]);

  const [nombreProyecto, setNombreProyecto] = useState<string>('');
  const [clienteId, setClienteId] = useState<string>('');
  const [aniosSeleccionados, setAniosSeleccionados] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [exchangeRate, setExchangeRate] = useState<number>(DEFAULT_EXCHANGE_RATE);
  const [tipoCambioFecha, setTipoCambioFecha] = useState<string>('');
  const [loadingTipoCambio, setLoadingTipoCambio] = useState<boolean>(false);

  const [recursosConfig, setRecursosConfig] = useState<RecursoConfig[]>([]);
  const [planeacionRecursos, setPlaneacionRecursos] = useState<RecursoPlaneacion[]>([]);

  const [metodologia, setMetodologia] = useState<MetodologiaKey>('');
  const [fases, setFases] = useState<FaseItem[]>([]);

  const [tipoDescuento, setTipoDescuento] = useState<TipoDescuento>('porcentaje');
  const [valorDescuento, setValorDescuento] = useState<string>('');

  const [faseDrag, setFaseDrag] = useState<{
    faseIndex: number;
    startFecha: string;
    isDragging: boolean;
  } | null>(null);

  const [recursoDrag, setRecursoDrag] = useState<RecursoDrag | null>(null);

  const [savingProject, setSavingProject] = useState(false);

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const hd = useMemo(() => new Holidays('MX'), []);

  const clienteIdNumber = useMemo(() => {
    return clienteId === '' ? null : Number(clienteId);
  }, [clienteId]);

  const showSnackbar = (
    message: string,
    severity: 'success' | 'error' | 'warning' | 'info'
  ) => {
    setSnackbar({
      open: true,
      message,
      severity,
    });
  };

  const cargarTipoCambioActual = async (mostrarMensaje = false) => {
    try {
      setLoadingTipoCambio(true);

      const data = await getTipoCambioActual();

      if (typeof data?.tipo_cambio === 'number' && data.tipo_cambio > 0) {
        setExchangeRate(data.tipo_cambio);
        setTipoCambioFecha(data.fecha || '');

        if (mostrarMensaje) {
          showSnackbar(`Tipo de cambio actualizado: ${data.tipo_cambio}`, 'success');
        }
      } else if (mostrarMensaje) {
        showSnackbar('No se recibió un tipo de cambio válido', 'warning');
      }
    } catch (error) {
      console.error(error);
      if (mostrarMensaje) {
        showSnackbar('No se pudo obtener el tipo de cambio actual', 'warning');
      }
    } finally {
      setLoadingTipoCambio(false);
    }
  };

  const loadData = async () => {
    try {
      const [clientesData, modulosData, tarifasData] = await Promise.all([
        getClientes(),
        getModulos(),
        getTarifas(),
      ]);

      setClientes(clientesData);
      setModulos(modulosData);
      setTarifas(tarifasData);

      await cargarTipoCambioActual(false);
    } catch (error) {
      console.error(error);
      showSnackbar('Error al cargar catálogos iniciales', 'error');
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    const handleMouseUp = () => {
      setFaseDrag(null);
      setRecursoDrag(null);
    };

    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  const workingDays = useWorkingDaysMX(startDate, endDate);

  const diasProyecto = useMemo(() => {
    return generateProjectDays(startDate, endDate, hd);
  }, [startDate, endDate, hd]);

  const groupedWeeks = useMemo(() => {
    const map = new Map<string, number>();

    diasProyecto.forEach((d) => {
      map.set(d.weekLabel, (map.get(d.weekLabel) || 0) + 1);
    });

    return Array.from(map.entries()).map(([weekLabel, count]) => ({
      weekLabel,
      count,
    }));
  }, [diasProyecto]);

  const aniosDisponibles = useMemo(() => {
    const years = Array.from(
      new Set(
        tarifas
          .map((t) => String(t.anio_fiscal ?? ''))
          .filter((y) => y !== '')
      )
    ).sort((a, b) => Number(b) - Number(a));

    return years;
  }, [tarifas]);

  useEffect(() => {
    if (aniosDisponibles.length > 0 && aniosSeleccionados.length === 0) {
      setAniosSeleccionados([aniosDisponibles[0]]);
    }
  }, [aniosDisponibles, aniosSeleccionados.length]);

  const aniosOrdenadosSeleccionados = useMemo(() => {
    return [...aniosSeleccionados].sort((a, b) => Number(b) - Number(a));
  }, [aniosSeleccionados]);

  const resetPlaneacion = () => {
    setRecursosConfig([]);
    setPlaneacionRecursos([]);
    setMetodologia('');
    setFases([]);
    setTipoDescuento('porcentaje');
    setValorDescuento('');
  };

  const resetAllForm = () => {
    setNombreProyecto('');
    setClienteId('');
    setAniosSeleccionados(aniosDisponibles.length > 0 ? [aniosDisponibles[0]] : []);
    setStartDate('');
    setEndDate('');
    setExchangeRate(DEFAULT_EXCHANGE_RATE);
    setTipoCambioFecha('');
    setRecursosConfig([]);
    setPlaneacionRecursos([]);
    setMetodologia('');
    setFases([]);
    setTipoDescuento('porcentaje');
    setValorDescuento('');
    void cargarTipoCambioActual(false);
  };

  const limpiarFechasPlaneadas = () => {
    setFases((prev) =>
      prev.map((fase) => ({
        ...fase,
        dias: '',
        fechasAsignadas: [],
      }))
    );

    setPlaneacionRecursos((prev) =>
      prev.map((recurso) => ({
        ...recurso,
        fechasAsignadas: [],
      }))
    );
  };

  const getTarifaModuloPorAnios = (modId: number) => {
    if (clienteIdNumber === null || aniosOrdenadosSeleccionados.length === 0) return 0;

    for (const year of aniosOrdenadosSeleccionados) {
      const tarifaEncontrada = tarifas.find(
        (t) =>
          t.cliente_id === clienteIdNumber &&
          t.modulo_id === modId &&
          String(t.anio_fiscal) === year
      );

      if (tarifaEncontrada) {
        return Number(tarifaEncontrada.tarifa_mxn || 0);
      }
    }

    return 0;
  };

  const modulosDisponibles = useMemo(() => {
    if (clienteIdNumber === null || aniosSeleccionados.length === 0) return [];

    const modIds = tarifas
      .filter(
        (t) =>
          t.cliente_id === clienteIdNumber &&
          aniosSeleccionados.includes(String(t.anio_fiscal))
      )
      .map((t) => t.modulo_id)
      .filter((value, index, self) => self.indexOf(value) === index);

    return modIds;
  }, [clienteIdNumber, aniosSeleccionados, tarifas]);

  const recursosDisponibles = useMemo(() => {
    return modulosDisponibles
      .map((modId) => {
        const moduloInfo = modulos.find((m) => m.id === modId);

        return {
          id: modId,
          nombre: moduloInfo?.modu || '',
          tarifa: getTarifaModuloPorAnios(modId),
        };
      })
      .filter((item) => item.nombre !== '');
  }, [modulosDisponibles, modulos, clienteIdNumber, aniosOrdenadosSeleccionados, tarifas]);

  useEffect(() => {
    const disponiblesIds = recursosDisponibles.map((r) => r.id);

    setRecursosConfig((prev) =>
      prev.filter((item) => disponiblesIds.includes(item.moduloId))
    );

    setPlaneacionRecursos((prev) =>
      prev.filter((item) => disponiblesIds.includes(item.moduloId))
    );
  }, [recursosDisponibles]);

  const syncPlaneacionConCantidad = (moduloId: number, cantidad: number) => {
    setPlaneacionRecursos((prev) => {
      const otrosRecursos = prev.filter((item) => item.moduloId !== moduloId);
      const recursosActuales = prev.filter((item) => item.moduloId === moduloId);

      const recursosNuevos: RecursoPlaneacion[] = [];

      for (let i = 1; i <= cantidad; i += 1) {
        const instanceId = buildInstanceId(moduloId, i);
        const existente = recursosActuales.find((item) => item.instanceId === instanceId);

        recursosNuevos.push(
          existente || {
            instanceId,
            moduloId,
            recursoNumero: i,
            fechasAsignadas: [],
          }
        );
      }

      return [...otrosRecursos, ...recursosNuevos].sort((a, b) => {
        if (a.moduloId !== b.moduloId) return a.moduloId - b.moduloId;
        return a.recursoNumero - b.recursoNumero;
      });
    });
  };

  const toggleRecursoModulo = (moduloId: number) => {
    const exists = recursosConfig.some((item) => item.moduloId === moduloId);

    if (exists) {
      setRecursosConfig((prev) => prev.filter((item) => item.moduloId !== moduloId));
      setPlaneacionRecursos((prev) => prev.filter((item) => item.moduloId !== moduloId));
      return;
    }

    setRecursosConfig((prev) => [...prev, { moduloId, cantidad: 1 }]);
    syncPlaneacionConCantidad(moduloId, 1);
  };

  const updateCantidadModulo = (moduloId: number, value: string) => {
    if (value === '') {
      setRecursosConfig((prev) =>
        prev.map((item) =>
          item.moduloId === moduloId ? { ...item, cantidad: 1 } : item
        )
      );
      syncPlaneacionConCantidad(moduloId, 1);
      return;
    }

    const numero = Number(value);

    if (Number.isNaN(numero) || numero < 1) return;

    const cantidad = Math.floor(numero);

    setRecursosConfig((prev) =>
      prev.map((item) =>
        item.moduloId === moduloId ? { ...item, cantidad } : item
      )
    );

    syncPlaneacionConCantidad(moduloId, cantidad);
  };

  const handleChangeMetodologia = (value: MetodologiaKey) => {
    setMetodologia(value);

    if (!value) {
      setFases([]);
      return;
    }

    const fasesIniciales: FaseItem[] = METODOLOGIAS[value].map((nombre) => ({
      nombre,
      dias: '',
      porcentaje: '',
      fechasAsignadas: [],
    }));

    setFases(fasesIniciales);
  };

  const updateFasePorcentaje = (index: number, value: string) => {
    setFases((prev) =>
      prev.map((fase, i) =>
        i === index
          ? {
              ...fase,
              porcentaje: value === '' ? '' : Number(value),
            }
          : fase
      )
    );
  };

  const handleDescuentoChange = (value: string) => {
    if (value === '') {
      setValorDescuento('');
      return;
    }

    const numero = Number(value);
    if (Number.isNaN(numero) || numero < 0) return;

    setValorDescuento(value);
  };

  const setRecursoRange = (
    instanceId: string,
    fechaA: string,
    fechaB: string,
    mode: 'add' | 'remove'
  ) => {
    const start = fechaA <= fechaB ? fechaA : fechaB;
    const end = fechaA <= fechaB ? fechaB : fechaA;

    const fechasEnRango = diasProyecto
      .filter((d) => d.fecha >= start && d.fecha <= end)
      .map((d) => d.fecha);

    setPlaneacionRecursos((prev) =>
      prev.map((recurso) => {
        if (recurso.instanceId !== instanceId) return recurso;

        if (mode === 'add') {
          return {
            ...recurso,
            fechasAsignadas: uniqueSortedDates([
              ...recurso.fechasAsignadas,
              ...fechasEnRango,
            ]),
          };
        }

        return {
          ...recurso,
          fechasAsignadas: recurso.fechasAsignadas.filter(
            (fecha) => !fechasEnRango.includes(fecha)
          ),
        };
      })
    );
  };

  const clearRecursoDays = (instanceId: string) => {
    setPlaneacionRecursos((prev) =>
      prev.map((recurso) =>
        recurso.instanceId === instanceId
          ? { ...recurso, fechasAsignadas: [] }
          : recurso
      )
    );
  };

  const setFaseRange = (faseIndex: number, fechaA: string, fechaB: string) => {
    const start = fechaA <= fechaB ? fechaA : fechaB;
    const end = fechaA <= fechaB ? fechaB : fechaA;

    const fechasEnRango = diasProyecto
      .filter((d) => d.fecha >= start && d.fecha <= end)
      .map((d) => d.fecha);

    setFases((prev) =>
      prev.map((fase, i) =>
        i === faseIndex
          ? {
              ...fase,
              fechasAsignadas: fechasEnRango,
              dias: fechasEnRango.length,
            }
          : fase
      )
    );
  };

  const clearFaseRange = (faseIndex: number) => {
    setFases((prev) =>
      prev.map((fase, i) =>
        i === faseIndex
          ? {
              ...fase,
              fechasAsignadas: [],
              dias: '',
            }
          : fase
      )
    );
  };

  const getFasePlanInicio = (fase: FaseItem) => {
    if (!fase.fechasAsignadas.length) return null;

    const fechasOrdenadas = [...fase.fechasAsignadas].sort((a, b) => a.localeCompare(b));
    const primeraFecha = fechasOrdenadas[0];
    const dia = diasProyecto.find((d) => d.fecha === primeraFecha);

    return dia ? dia.diaNumero : null;
  };

  const totalPorcentajeAsignado = useMemo(() => {
    return fases.reduce((acc, fase) => {
      const porcentaje =
        fase.porcentaje === '' || fase.porcentaje === null || fase.porcentaje === undefined
          ? 0
          : Number(fase.porcentaje);

      return acc + (Number.isNaN(porcentaje) ? 0 : porcentaje);
    }, 0);
  }, [fases]);

  const totalDiasAsignados = useMemo(() => {
    return fases.reduce((acc, fase) => acc + fase.fechasAsignadas.length, 0);
  }, [fases]);

  const resumenRecursos = useMemo(() => {
    return planeacionRecursos.map((plan, index) => {
      const recurso = recursosDisponibles.find((r) => r.id === plan.moduloId);
      const diasAsignados = plan.fechasAsignadas.length;
      const horas = diasAsignados * HOURS_PER_DAY;
      const tarifaHora = recurso?.tarifa || 0;
      const totalMXN = tarifaHora * horas;
      const totalUSD = exchangeRate > 0 ? totalMXN / exchangeRate : 0;

      return {
        rowNumber: index + 1,
        instanceId: plan.instanceId,
        moduloId: plan.moduloId,
        recursoNumero: plan.recursoNumero,
        nombreModulo: recurso?.nombre || '',
        tarifaHora,
        fechasAsignadas: plan.fechasAsignadas,
        diasAsignados,
        horas,
        totalMXN,
        totalUSD,
      };
    });
  }, [planeacionRecursos, recursosDisponibles, exchangeRate]);

  const resumenModulosProyecto = useMemo(() => {
    const map = new Map<
      number,
      {
        moduloId: number;
        nombreModulo: string;
        tarifaHora: number;
        dias: number;
        horas: number;
        totalMXN: number;
        totalUSD: number;
      }
    >();

    resumenRecursos.forEach((recurso) => {
      const current = map.get(recurso.moduloId);

      if (!current) {
        map.set(recurso.moduloId, {
          moduloId: recurso.moduloId,
          nombreModulo: recurso.nombreModulo,
          tarifaHora: recurso.tarifaHora,
          dias: recurso.diasAsignados,
          horas: recurso.horas,
          totalMXN: recurso.totalMXN,
          totalUSD: recurso.totalUSD,
        });
        return;
      }

      current.dias += recurso.diasAsignados;
      current.horas += recurso.horas;
      current.totalMXN += recurso.totalMXN;
      current.totalUSD += recurso.totalUSD;
    });

    return Array.from(map.values());
  }, [resumenRecursos]);

  const totalRecursosDias = useMemo(() => {
    return resumenRecursos.reduce((acc, item) => acc + item.diasAsignados, 0);
  }, [resumenRecursos]);

  const totalRecursosHoras = useMemo(() => {
    return resumenRecursos.reduce((acc, item) => acc + item.horas, 0);
  }, [resumenRecursos]);

  const totalRecursosMXN = useMemo(() => {
    return resumenRecursos.reduce((acc, item) => acc + item.totalMXN, 0);
  }, [resumenRecursos]);

  const totalRecursosUSD = useMemo(() => {
    return resumenRecursos.reduce((acc, item) => acc + item.totalUSD, 0);
  }, [resumenRecursos]);

  const descuentoMXN = useMemo(() => {
    const valor = Number(valorDescuento);

    if (Number.isNaN(valor) || valor <= 0) return 0;

    if (tipoDescuento === 'porcentaje') {
      return totalRecursosMXN * (valor / 100);
    }

    return valor;
  }, [valorDescuento, tipoDescuento, totalRecursosMXN]);

  const descuentoMXNAplicado = useMemo(() => {
    return Math.min(descuentoMXN, totalRecursosMXN);
  }, [descuentoMXN, totalRecursosMXN]);

  const descuentoUSD = useMemo(() => {
    return exchangeRate > 0 ? descuentoMXNAplicado / exchangeRate : 0;
  }, [descuentoMXNAplicado, exchangeRate]);

  const totalRecursosConDescuentoMXN = useMemo(() => {
    return Math.max(0, totalRecursosMXN - descuentoMXNAplicado);
  }, [totalRecursosMXN, descuentoMXNAplicado]);

  const totalRecursosConDescuentoUSD = useMemo(() => {
    return Math.max(0, totalRecursosUSD - descuentoUSD);
  }, [totalRecursosUSD, descuentoUSD]);

  const hayDescuento = descuentoMXNAplicado > 0;

  const totalProyectoMXN = totalRecursosConDescuentoMXN;
  const totalProyectoUSD = totalRecursosConDescuentoUSD;
  const totalProyectoDias = totalRecursosDias;
  const totalProyectoHoras = totalRecursosHoras;

  const resumenFases = useMemo(() => {
    return fases.map((fase, index) => {
      const porcentaje =
        fase.porcentaje === '' || fase.porcentaje === null || fase.porcentaje === undefined
          ? 0
          : Number(fase.porcentaje);

      const porcentajeSeguro = Number.isNaN(porcentaje) ? 0 : porcentaje;

      const montoEstimadoMXN = totalRecursosMXN * (porcentajeSeguro / 100);
      const montoEstimadoUSD = totalRecursosUSD * (porcentajeSeguro / 100);
      const montoFinalMXN = totalRecursosConDescuentoMXN * (porcentajeSeguro / 100);
      const montoFinalUSD = totalRecursosConDescuentoUSD * (porcentajeSeguro / 100);

      return {
        faseIndex: index,
        nombre: fase.nombre,
        porcentaje: fase.porcentaje,
        porcentajeSeguro,
        planInicio: getFasePlanInicio(fase),
        planDuracion: fase.fechasAsignadas.length,
        montoEstimadoMXN,
        montoEstimadoUSD,
        montoFinalMXN,
        montoFinalUSD,
      };
    });
  }, [
    fases,
    diasProyecto,
    totalRecursosMXN,
    totalRecursosUSD,
    totalRecursosConDescuentoMXN,
    totalRecursosConDescuentoUSD,
  ]);

  const exportToExcel = () => {
    const resumenData = resumenRecursos.map((item) => ({
      '#': item.rowNumber,
      Recurso: item.nombreModulo,
      'Tarifa (MXN/h)': item.tarifaHora,
      'Días asignados': item.diasAsignados,
      Horas: item.horas,
      'Total real (MXN)': item.totalMXN.toFixed(2),
      'Total real (USD)': item.totalUSD.toFixed(2),
      'Años fiscales seleccionados': aniosSeleccionados.join(', '),
    }));

    const modulosData = resumenModulosProyecto.map((item) => ({
      Módulo: item.nombreModulo,
      'Tarifa (MXN/h)': item.tarifaHora,
      'Días acumulados': item.dias,
      'Horas acumuladas': item.horas,
      'Total MXN': item.totalMXN.toFixed(2),
      'Total USD': item.totalUSD.toFixed(2),
    }));

    const fasesData = resumenFases.map((fase) => ({
      Metodología: metodologia,
      Fase: fase.nombre,
      'Plan inicio': fase.planInicio ?? '',
      'Plan duración': fase.planDuracion,
      'Porcentaje monetario': fase.porcentajeSeguro,
      'Monto estimado MXN': fase.montoEstimadoMXN.toFixed(2),
      'Monto estimado USD': fase.montoEstimadoUSD.toFixed(2),
      'Monto final MXN': hayDescuento ? fase.montoFinalMXN.toFixed(2) : 'N/A',
      'Monto final USD': hayDescuento ? fase.montoFinalUSD.toFixed(2) : 'N/A',
    }));

    const descuentoData = [
      {
        Concepto: 'Total estimado',
        MXN: totalRecursosMXN.toFixed(2),
        USD: totalRecursosUSD.toFixed(2),
      },
      {
        Concepto: 'Descuento',
        MXN: hayDescuento ? descuentoMXNAplicado.toFixed(2) : 'N/A',
        USD: hayDescuento ? descuentoUSD.toFixed(2) : 'N/A',
      },
      {
        Concepto: hayDescuento ? 'Total final con descuento' : 'Total final',
        MXN: hayDescuento
          ? totalRecursosConDescuentoMXN.toFixed(2)
          : totalRecursosMXN.toFixed(2),
        USD: hayDescuento
          ? totalRecursosConDescuentoUSD.toFixed(2)
          : totalRecursosUSD.toFixed(2),
      },
    ];

    const workbook = XLSX.utils.book_new();

    const wsResumen = XLSX.utils.json_to_sheet(resumenData);
    XLSX.utils.book_append_sheet(workbook, wsResumen, 'Resumen Recursos');

    if (modulosData.length > 0) {
      const wsModulos = XLSX.utils.json_to_sheet(modulosData);
      XLSX.utils.book_append_sheet(workbook, wsModulos, 'Resumen Modulos');
    }

    if (fasesData.length > 0) {
      const wsFases = XLSX.utils.json_to_sheet(fasesData);
      XLSX.utils.book_append_sheet(workbook, wsFases, 'Resumen Fases');
    }

    const wsDescuento = XLSX.utils.json_to_sheet(descuentoData);
    XLSX.utils.book_append_sheet(workbook, wsDescuento, 'Resumen Final');

    if (fases.length > 0 && diasProyecto.length > 0) {
      const fasesMatrix: (string | number)[][] = [];

      fasesMatrix.push([
        'ETAPA',
        'PLAN INICIO',
        'PLAN DURACIÓN',
        ...diasProyecto.map((d) => d.weekLabel),
      ]);

      fasesMatrix.push([
        '',
        '',
        '',
        ...diasProyecto.map((d) => d.diaNumero),
      ]);

      fases.forEach((fase) => {
        fasesMatrix.push([
          fase.nombre,
          getFasePlanInicio(fase) ?? '',
          fase.fechasAsignadas.length,
          ...diasProyecto.map((d) => (fase.fechasAsignadas.includes(d.fecha) ? 1 : 0)),
        ]);
      });

      const wsFasesMatrix = XLSX.utils.aoa_to_sheet(fasesMatrix);
      XLSX.utils.book_append_sheet(workbook, wsFasesMatrix, 'Planeacion Fases');
    }

    if (resumenRecursos.length > 0 && diasProyecto.length > 0) {
      const matrixData: (string | number)[][] = [];

      matrixData.push(['#', 'Recurso', 'Acciones', ...diasProyecto.map((d) => d.weekLabel)]);

      matrixData.push(['', '', '', ...diasProyecto.map((d) => `${d.dayNameShort}${d.diaNumero}`)]);

      resumenRecursos.forEach((recurso) => {
        matrixData.push([
          recurso.rowNumber,
          recurso.nombreModulo,
          '',
          ...diasProyecto.map((d) => (recurso.fechasAsignadas.includes(d.fecha) ? 1 : 0)),
        ]);
      });

      const wsMatrix = XLSX.utils.aoa_to_sheet(matrixData);
      XLSX.utils.book_append_sheet(workbook, wsMatrix, 'Planeacion Recursos');
    }

    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array',
    });

    const file = new Blob([excelBuffer], {
      type: 'application/octet-stream',
    });

    saveAs(file, 'Calculo_de_tarifas.xlsx');
  };

  const validarProyecto = () => {
    if (clienteIdNumber === null) {
      showSnackbar('Selecciona un cliente', 'warning');
      return false;
    }

    if (!startDate || !endDate) {
      showSnackbar('Debes capturar fecha de inicio y fecha fin', 'warning');
      return false;
    }

    if (startDate > endDate) {
      showSnackbar('La fecha de inicio no puede ser mayor a la fecha final', 'warning');
      return false;
    }

    if (exchangeRate <= 0) {
      showSnackbar('El tipo de cambio debe ser mayor a 0', 'warning');
      return false;
    }

    if (recursosConfig.length === 0) {
      showSnackbar('Selecciona al menos un recurso', 'warning');
      return false;
    }

    const hayRecursosSinDias = resumenRecursos.some(
      (recurso) => recurso.diasAsignados === 0
    );

    if (hayRecursosSinDias) {
      showSnackbar('Todos los recursos generados deben tener al menos un día asignado', 'warning');
      return false;
    }

    if (!metodologia) {
      showSnackbar('Selecciona una metodología', 'warning');
      return false;
    }

    if (fases.length === 0) {
      showSnackbar('Debes configurar las fases del proyecto', 'warning');
      return false;
    }

    if (totalDiasAsignados !== workingDays) {
      showSnackbar(
        `La suma de días de fases debe ser igual a los días hábiles calculados (${workingDays})`,
        'warning'
      );
      return false;
    }

    if (Math.abs(totalPorcentajeAsignado - 100) > 0.001) {
      showSnackbar('El porcentaje total de las fases debe sumar 100%', 'warning');
      return false;
    }

    return true;
  };

  const handleGuardarProyecto = async () => {
    if (!validarProyecto()) return;

    if (clienteIdNumber === null) return;

    try {
      setSavingProject(true);

      const payload: ProyectoCreatePayload = {
        cliente_id: clienteIdNumber,
        nombre_proyecto: nombreProyecto.trim() || undefined,
        metodologia,
        fecha_inicio: startDate,
        fecha_fin: endDate,
        tipo_cambio: exchangeRate,
        anios_fiscales: aniosSeleccionados,

        // Totales antes de descuento
        subtotal_mxn: totalRecursosMXN,
        subtotal_usd: totalRecursosUSD,

        // Datos del descuento
        tipo_descuento: hayDescuento ? tipoDescuento : null,
        valor_descuento: hayDescuento ? Number(valorDescuento || 0) : 0,
        descuento_mxn: hayDescuento ? descuentoMXNAplicado : 0,
        descuento_usd: hayDescuento ? descuentoUSD : 0,

        // Totales finales después de descuento
        total_final_mxn: totalProyectoMXN,
        total_final_usd: totalProyectoUSD,

        // Compatibilidad con columnas antiguas
        total_mxn: totalProyectoMXN,
        total_usd: totalProyectoUSD,

        total_dias: totalProyectoDias,
        total_horas: totalProyectoHoras,

        comentario_proyecto: null,

        modulos: resumenModulosProyecto.map((item) => ({
          modulo_id: item.moduloId,
          tarifa_mxn: item.tarifaHora,
          dias: item.dias,
          horas: item.horas,
          total_mxn: item.totalMXN,
          total_usd: item.totalUSD,
        })),

        fases: resumenFases.map((fase, index) => ({
          orden_fase: index + 1,
          nombre_fase: fase.nombre,
          dias: fase.planDuracion,
          porcentaje: fase.porcentajeSeguro,
          plan_inicio: fase.planInicio,

          // Compatibilidad
          monto_mxn: fase.montoFinalMXN,
          monto_usd: fase.montoFinalUSD,

          // Nuevos campos
          monto_estimado_mxn: fase.montoEstimadoMXN,
          monto_estimado_usd: fase.montoEstimadoUSD,
          monto_final_mxn: fase.montoFinalMXN,
          monto_final_usd: fase.montoFinalUSD,

          fechas_asignadas: [...fases[index].fechasAsignadas],
        })),

        recursos: resumenRecursos.map((recurso) => ({
          modulo_id: recurso.moduloId,
          recurso_numero: recurso.recursoNumero,
          tarifa_hora: recurso.tarifaHora,
          dias_asignados: recurso.diasAsignados,
          horas: recurso.horas,
          total_mxn: recurso.totalMXN,
          total_usd: recurso.totalUSD,
          fechas_asignadas: [...recurso.fechasAsignadas],
        })),
      };

      const response = await createProyecto(payload);

      showSnackbar(
        `Proyecto guardado correctamente. Número de proyecto: ${response?.numero_proyecto ?? response?.proyecto?.numero_proyecto ?? ''}`,
        'success'
      );

      const proyectoId = response?.id ?? response?.proyecto?.id;

      resetAllForm();

      if (proyectoId) {
        setTimeout(() => {
          navigate(`/proyectos/${proyectoId}`);
        }, 1200);
      }
    } catch (error: any) {
      console.error(error);
      const mensaje =
        error?.response?.data?.error ||
        'Ocurrió un error al guardar el proyecto';
      showSnackbar(mensaje, 'error');
    } finally {
      setSavingProject(false);
    }
  };

  const nombreMetodologia =
    metodologia === 'ASAP'
      ? 'Metodología ASAP'
      : metodologia === 'ACTIVATE'
      ? 'Metodología Activate'
      : metodologia === 'ITIL'
      ? 'Metodología ITIL'
      : '';

  const stickyLeftSx = {
    position: 'sticky' as const,
    zIndex: 4,
    backgroundColor: '#fff',
    borderRight: '1px solid #d0d0d0',
  };

  const stickyHeaderSx = {
    position: 'sticky' as const,
    zIndex: 5,
    backgroundColor: '#fff8e1',
    borderRight: '1px solid #d0d0d0',
  };

  const stickyPhaseHeaderSx = {
    position: 'sticky' as const,
    zIndex: 5,
    backgroundColor: '#e8f5e9',
    borderRight: '1px solid #d0d0d0',
  };

  return (
    <Box sx={{ maxWidth: 1600, mx: 'auto', mt: 4, px: 2, mb: 5 }}>
      <Paper elevation={3} sx={{ p: 3, borderRadius: 3, bgcolor: '#f0f4f8' }}>
        <Typography variant="h5" gutterBottom color="primary.main">
          Cálculo del Precio del Proyecto
        </Typography>

        <Divider sx={{ mb: 3 }} />

        <Box display="flex" flexWrap="wrap" gap={2} mb={2}>
          <TextField
            label="Nombre del proyecto"
            value={nombreProyecto}
            onChange={(e) => setNombreProyecto(e.target.value)}
            sx={{ minWidth: 260 }}
            size="small"
          />

          <FormControl sx={{ minWidth: 220 }} size="small">
            <InputLabel>Cliente</InputLabel>
            <Select
              value={clienteId}
              label="Cliente"
              onChange={(e) => {
                setClienteId(String(e.target.value));
                resetPlaneacion();
              }}
            >
              <MenuItem value="">Selecciona</MenuItem>
              {clientes.map((c) => (
                <MenuItem key={c.id} value={String(c.id)}>
                  {c.nombre}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 240 }} size="small">
            <InputLabel>Años Fiscales</InputLabel>
            <Select
              multiple
              value={aniosSeleccionados}
              onChange={(e) => {
                const value = e.target.value;
                const years = typeof value === 'string' ? value.split(',') : value;
                setAniosSeleccionados(years);
                setRecursosConfig([]);
                setPlaneacionRecursos([]);
              }}
              input={<OutlinedInput label="Años Fiscales" />}
              renderValue={(selected) => (selected as string[]).join(', ')}
            >
              {aniosDisponibles.map((year) => (
                <MenuItem key={year} value={year}>
                  <Checkbox checked={aniosSeleccionados.includes(year)} />
                  <Typography>{year}</Typography>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Fecha Inicio"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={startDate}
            size="small"
            onChange={(e) => {
              setStartDate(e.target.value);
              limpiarFechasPlaneadas();
            }}
          />

          <TextField
            label="Fecha Fin"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={endDate}
            size="small"
            onChange={(e) => {
              setEndDate(e.target.value);
              limpiarFechasPlaneadas();
            }}
          />
        </Box>

        <Box display="flex" flexWrap="wrap" gap={1.5} alignItems="center" mb={2}>
          <Chip size="small" label={`Días hábiles: ${workingDays}`} color="primary" />
          <Chip size="small" label={`Días para planeación: ${diasProyecto.length}`} />
        </Box>

        <Box mt={2} display="flex" gap={2} flexWrap="wrap" alignItems="center">
          <TextField
            label="Tipo de cambio actual (MXN/USD)"
            type="number"
            value={exchangeRate}
            size="small"
            onChange={(e) => setExchangeRate(Number(e.target.value))}
          />

          <Button
            variant="outlined"
            size="small"
            onClick={() => void cargarTipoCambioActual(true)}
            disabled={loadingTipoCambio}
          >
            {loadingTipoCambio ? 'Actualizando...' : 'Actualizar tipo de cambio'}
          </Button>

          {tipoCambioFecha && (
            <Typography variant="body2" color="text.secondary">
              Fecha Banxico: {formatDateDMY(tipoCambioFecha)}
            </Typography>
          )}
        </Box>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h5" gutterBottom color="primary.main">
          Planeación de Recursos
        </Typography>

        <Box mt={1} mb={3}>
          <Typography variant="subtitle2" gutterBottom>
            Selecciona los recursos y captura la cantidad requerida:
          </Typography>

          <Paper
            variant="outlined"
            sx={{
              bgcolor: '#fff',
              borderRadius: 2,
              overflow: 'hidden',
              maxWidth: 760,
            }}
          >
            {recursosDisponibles.map((recurso, index) => {
              const config = recursosConfig.find((item) => item.moduloId === recurso.id);
              const isSelected = Boolean(config);

              return (
                <Box
                  key={recurso.id}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: '1fr',
                      md: '36px 1fr 115px 120px',
                    },
                    gap: 1,
                    alignItems: 'center',
                    px: 1.5,
                    py: 0.8,
                    minHeight: 52,
                    borderBottom:
                      index === recursosDisponibles.length - 1
                        ? 'none'
                        : '1px solid #e0e0e0',
                    bgcolor: isSelected ? '#eef7ff' : '#fff',
                  }}
                >
                  <Checkbox
                    size="small"
                    checked={isSelected}
                    onChange={() => toggleRecursoModulo(recurso.id)}
                  />

                  <Box>
                    <Typography fontWeight="bold" fontSize={14}>
                      {recurso.nombre}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatCurrency(recurso.tarifa)}/h
                    </Typography>
                  </Box>

                  <Chip
                    size="small"
                    label={isSelected ? 'Seleccionado' : 'No seleccionado'}
                    color={isSelected ? 'primary' : 'default'}
                    variant={isSelected ? 'filled' : 'outlined'}
                    sx={{ height: 24 }}
                  />

                  <TextField
                    label="Cantidad"
                    type="number"
                    size="small"
                    value={config?.cantidad || 1}
                    disabled={!isSelected}
                    onChange={(e) => updateCantidadModulo(recurso.id, e.target.value)}
                    inputProps={{
                      min: 1,
                      step: 1,
                    }}
                  />
                </Box>
              );
            })}

            {clienteIdNumber !== null && recursosDisponibles.length === 0 && (
              <Box sx={{ p: 2 }}>
                <Typography color="text.secondary">
                  No hay tarifas disponibles para este cliente y los años fiscales seleccionados.
                </Typography>
              </Box>
            )}

            {clienteIdNumber === null && (
              <Box sx={{ p: 2 }}>
                <Typography color="text.secondary">
                  Selecciona un cliente para ver sus recursos disponibles.
                </Typography>
              </Box>
            )}
          </Paper>
        </Box>

        {resumenRecursos.length > 0 && (
          <>
            <Box display="flex" flexWrap="wrap" gap={1.5} mb={2}>
              <Chip size="small" label={`Módulos: ${recursosConfig.length}`} color="primary" />
              <Chip size="small" label={`Recursos: ${resumenRecursos.length}`} color="primary" />
              <Chip size="small" label={`Días: ${totalRecursosDias}`} />
              <Chip size="small" label={`Horas: ${totalRecursosHoras}`} />
              <Chip size="small" label={`Estimado MXN: ${formatCurrency(totalRecursosMXN)}`} />
              <Chip size="small" label={`Estimado USD: ${formatCurrency(totalRecursosUSD)}`} />
            </Box>

            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Tabla de planeación: asigna los días por cada recurso. La parte izquierda queda fija.
            </Typography>

            <Box
              sx={{
                overflowX: 'auto',
                border: '1px solid #d9d9d9',
                borderRadius: 2,
                bgcolor: '#fff',
                mb: 3,
              }}
            >
              <Table
                size="small"
                sx={{
                  minWidth: 300 + diasProyecto.length * 42,
                  borderCollapse: 'separate',
                  borderSpacing: 0,
                }}
              >
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#fff8e1' }}>
                    <TableCell
                      rowSpan={2}
                      sx={{
                        ...stickyHeaderSx,
                        left: 0,
                        width: 48,
                        minWidth: 48,
                        maxWidth: 48,
                      }}
                    >
                      <strong>#</strong>
                    </TableCell>

                    <TableCell
                      rowSpan={2}
                      sx={{
                        ...stickyHeaderSx,
                        left: 48,
                        width: 120,
                        minWidth: 120,
                        maxWidth: 120,
                      }}
                    >
                      <strong>Recurso</strong>
                    </TableCell>

                    <TableCell
                      rowSpan={2}
                      sx={{
                        ...stickyHeaderSx,
                        left: 168,
                        width: 110,
                        minWidth: 110,
                        maxWidth: 110,
                      }}
                    >
                      <strong>Acciones</strong>
                    </TableCell>

                    {groupedWeeks.map((week) => (
                      <TableCell
                        key={week.weekLabel}
                        align="center"
                        colSpan={week.count}
                        sx={{
                          borderLeft: '1px solid #bbb',
                          backgroundColor: '#f5f5f5',
                          fontWeight: 'bold',
                          minWidth: week.count * 42,
                        }}
                      >
                        {week.weekLabel}
                      </TableCell>
                    ))}
                  </TableRow>

                  <TableRow sx={{ backgroundColor: '#fafafa' }}>
                    {diasProyecto.map((day) => (
                      <TableCell
                        key={day.fecha}
                        align="center"
                        sx={{
                          minWidth: 42,
                          p: 0.4,
                          borderLeft: day.diaNumero % 5 === 1 ? '1px solid #bbb' : undefined,
                          backgroundColor: '#fafafa',
                        }}
                      >
                        <Box>
                          <Typography variant="caption" sx={{ display: 'block', lineHeight: 1 }}>
                            {day.dayNameShort}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              display: 'block',
                              lineHeight: 1,
                              fontWeight: 'bold',
                            }}
                          >
                            {day.diaNumero}
                          </Typography>
                        </Box>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>

                <TableBody>
                  {resumenRecursos.map((recurso) => (
                    <TableRow key={recurso.instanceId} hover>
                      <TableCell
                        sx={{
                          ...stickyLeftSx,
                          left: 0,
                          width: 48,
                          minWidth: 48,
                          maxWidth: 48,
                          fontWeight: 'bold',
                        }}
                      >
                        {recurso.rowNumber}
                      </TableCell>

                      <TableCell
                        sx={{
                          ...stickyLeftSx,
                          left: 48,
                          width: 120,
                          minWidth: 120,
                          maxWidth: 120,
                          fontWeight: 500,
                        }}
                      >
                        {recurso.nombreModulo}
                      </TableCell>

                      <TableCell
                        sx={{
                          ...stickyLeftSx,
                          left: 168,
                          width: 110,
                          minWidth: 110,
                          maxWidth: 110,
                        }}
                      >
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          onClick={() => clearRecursoDays(recurso.instanceId)}
                        >
                          Limpiar
                        </Button>
                      </TableCell>

                      {diasProyecto.map((day) => {
                        const isAssigned = recurso.fechasAsignadas.includes(day.fecha);

                        return (
                          <TableCell
                            key={`${recurso.instanceId}-${day.fecha}`}
                            align="center"
                            sx={{
                              p: 0.25,
                              minWidth: 42,
                              borderLeft: day.diaNumero % 5 === 1 ? '1px solid #bbb' : undefined,
                            }}
                          >
                            <Box
                              onMouseDown={() => {
                                const mode = isAssigned ? 'remove' : 'add';

                                setRecursoDrag({
                                  instanceId: recurso.instanceId,
                                  startFecha: day.fecha,
                                  mode,
                                  isDragging: true,
                                });

                                setRecursoRange(recurso.instanceId, day.fecha, day.fecha, mode);
                              }}
                              onMouseEnter={() => {
                                if (
                                  recursoDrag &&
                                  recursoDrag.isDragging &&
                                  recursoDrag.instanceId === recurso.instanceId
                                ) {
                                  setRecursoRange(
                                    recurso.instanceId,
                                    recursoDrag.startFecha,
                                    day.fecha,
                                    recursoDrag.mode
                                  );
                                }
                              }}
                              onMouseUp={() => {
                                setRecursoDrag(null);
                              }}
                              sx={{
                                width: 26,
                                height: 26,
                                mx: 'auto',
                                borderRadius: 1,
                                cursor: 'pointer',
                                border: '1px solid #c7c7c7',
                                backgroundColor: isAssigned ? '#7e57c2' : '#f7f7f7',
                                '&:hover': {
                                  opacity: 0.85,
                                },
                              }}
                              title={`${recurso.nombreModulo} #${recurso.rowNumber} - ${day.fecha}`}
                            />
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>

            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Resumen de costos: se actualiza automáticamente con los días seleccionados arriba.
            </Typography>

            <Box
              sx={{
                overflowX: 'auto',
                border: '1px solid #d9d9d9',
                borderRadius: 2,
                bgcolor: '#fff',
                mb: 3,
              }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#e3f2fd' }}>
                    <TableCell><strong>#</strong></TableCell>
                    <TableCell><strong>Recurso</strong></TableCell>
                    <TableCell><strong>Tarifa MXN/h</strong></TableCell>
                    <TableCell><strong>Días</strong></TableCell>
                    <TableCell><strong>Horas</strong></TableCell>
                    <TableCell><strong>Total MXN</strong></TableCell>
                    <TableCell><strong>Total USD</strong></TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {resumenRecursos.map((recurso) => (
                    <TableRow key={`resumen-${recurso.instanceId}`} hover>
                      <TableCell sx={{ fontWeight: 'bold' }}>{recurso.rowNumber}</TableCell>
                      <TableCell>{recurso.nombreModulo}</TableCell>
                      <TableCell>{formatCurrency(recurso.tarifaHora)}</TableCell>
                      <TableCell>{recurso.diasAsignados}</TableCell>
                      <TableCell>{recurso.horas}</TableCell>
                      <TableCell>{formatCurrency(recurso.totalMXN)}</TableCell>
                      <TableCell>{formatCurrency(recurso.totalUSD)}</TableCell>
                    </TableRow>
                  ))}

                  <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableCell colSpan={3}><strong>Total estimado</strong></TableCell>
                    <TableCell><strong>{totalRecursosDias}</strong></TableCell>
                    <TableCell><strong>{totalRecursosHoras}</strong></TableCell>
                    <TableCell><strong>{formatCurrency(totalRecursosMXN)}</strong></TableCell>
                    <TableCell><strong>{formatCurrency(totalRecursosUSD)}</strong></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Box>

            <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: '#fff', borderRadius: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Descuento
              </Typography>

              <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
                <FormControl sx={{ minWidth: 220 }} size="small">
                  <InputLabel>Tipo de descuento</InputLabel>
                  <Select
                    value={tipoDescuento}
                    label="Tipo de descuento"
                    onChange={(e) => setTipoDescuento(e.target.value as TipoDescuento)}
                  >
                    <MenuItem value="porcentaje">Porcentaje</MenuItem>
                    <MenuItem value="monto">Monto fijo</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  label={tipoDescuento === 'porcentaje' ? 'Descuento (%)' : 'Descuento (MXN)'}
                  type="number"
                  size="small"
                  value={valorDescuento}
                  onChange={(e) => handleDescuentoChange(e.target.value)}
                  sx={{ minWidth: 180 }}
                />
              </Box>
            </Paper>

            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Resumen final del precio:
            </Typography>

            <Box
              sx={{
                overflowX: 'auto',
                border: '1px solid #d9d9d9',
                borderRadius: 2,
                bgcolor: '#fff',
                mb: 3,
              }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#e8f5e9' }}>
                    <TableCell><strong>Concepto</strong></TableCell>
                    <TableCell><strong>MXN</strong></TableCell>
                    <TableCell><strong>USD</strong></TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  <TableRow>
                    <TableCell>Total estimado</TableCell>
                    <TableCell>{formatCurrency(totalRecursosMXN)}</TableCell>
                    <TableCell>{formatCurrency(totalRecursosUSD)}</TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell>Descuento</TableCell>
                    <TableCell>{hayDescuento ? formatCurrency(descuentoMXNAplicado) : 'N/A'}</TableCell>
                    <TableCell>{hayDescuento ? formatCurrency(descuentoUSD) : 'N/A'}</TableCell>
                  </TableRow>

                  <TableRow sx={{ backgroundColor: '#eef7ee' }}>
                    <TableCell>
                      <strong>{hayDescuento ? 'Total final con descuento' : 'Total final'}</strong>
                    </TableCell>
                    <TableCell>
                      <strong>
                        {hayDescuento
                          ? formatCurrency(totalRecursosConDescuentoMXN)
                          : formatCurrency(totalRecursosMXN)}
                      </strong>
                    </TableCell>
                    <TableCell>
                      <strong>
                        {hayDescuento
                          ? formatCurrency(totalRecursosConDescuentoUSD)
                          : formatCurrency(totalRecursosUSD)}
                      </strong>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Box>
          </>
        )}

        <Divider sx={{ my: 3 }} />

        <Typography variant="h5" gutterBottom color="primary.main">
          Configuración del Proyecto
        </Typography>

        <Box mt={1} mb={2}>
          <FormControl sx={{ minWidth: 260 }} size="small">
            <InputLabel>Metodología</InputLabel>
            <Select
              value={metodologia}
              label="Metodología"
              onChange={(e) => handleChangeMetodologia(e.target.value as MetodologiaKey)}
            >
              <MenuItem value="ASAP">Metodología ASAP</MenuItem>
              <MenuItem value="ACTIVATE">Metodología Activate</MenuItem>
              <MenuItem value="ITIL">Metodología ITIL</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {metodologia && fases.length > 0 && (
          <>
            <Typography variant="h6" gutterBottom>
              {nombreMetodologia}
            </Typography>

            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Planeación de fases: asigna los días de cada fase. La parte izquierda queda fija.
            </Typography>

            <Box
              sx={{
                overflowX: 'auto',
                border: '1px solid #d9d9d9',
                borderRadius: 2,
                bgcolor: '#fff',
                mb: 3,
              }}
            >
              <Table
                size="small"
                sx={{
                  minWidth: 470 + diasProyecto.length * 42,
                  borderCollapse: 'separate',
                  borderSpacing: 0,
                }}
              >
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#e8f5e9' }}>
                    <TableCell
                      rowSpan={2}
                      sx={{
                        ...stickyPhaseHeaderSx,
                        left: 0,
                        width: 230,
                        minWidth: 230,
                        maxWidth: 230,
                      }}
                    >
                      <strong>Etapa</strong>
                    </TableCell>

                    <TableCell
                      rowSpan={2}
                      align="center"
                      sx={{
                        ...stickyPhaseHeaderSx,
                        left: 230,
                        width: 70,
                        minWidth: 70,
                        maxWidth: 70,
                      }}
                    >
                      <strong>Inicio</strong>
                    </TableCell>

                    <TableCell
                      rowSpan={2}
                      align="center"
                      sx={{
                        ...stickyPhaseHeaderSx,
                        left: 300,
                        width: 70,
                        minWidth: 70,
                        maxWidth: 70,
                      }}
                    >
                      <strong>Días</strong>
                    </TableCell>

                    <TableCell
                      rowSpan={2}
                      align="center"
                      sx={{
                        ...stickyPhaseHeaderSx,
                        left: 370,
                        width: 90,
                        minWidth: 90,
                        maxWidth: 90,
                      }}
                    >
                      <strong>Acción</strong>
                    </TableCell>

                    {groupedWeeks.map((week) => (
                      <TableCell
                        key={week.weekLabel}
                        align="center"
                        colSpan={week.count}
                        sx={{
                          borderLeft: '1px solid #bbb',
                          backgroundColor: '#f5f5f5',
                          fontWeight: 'bold',
                          minWidth: week.count * 42,
                        }}
                      >
                        {week.weekLabel}
                      </TableCell>
                    ))}
                  </TableRow>

                  <TableRow sx={{ backgroundColor: '#fafafa' }}>
                    {diasProyecto.map((day) => (
                      <TableCell
                        key={day.fecha}
                        align="center"
                        sx={{
                          minWidth: 42,
                          p: 0.4,
                          borderLeft: day.diaNumero % 5 === 1 ? '1px solid #bbb' : undefined,
                          backgroundColor: '#fafafa',
                        }}
                      >
                        <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                          {day.diaNumero}
                        </Typography>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>

                <TableBody>
                  {fases.map((fase, faseIndex) => {
                    const planInicio = getFasePlanInicio(fase);
                    const planDuracion = fase.fechasAsignadas.length;

                    return (
                      <TableRow key={fase.nombre} hover>
                        <TableCell
                          sx={{
                            ...stickyLeftSx,
                            left: 0,
                            width: 230,
                            minWidth: 230,
                            maxWidth: 230,
                            backgroundColor: '#5f9ea0',
                            color: '#fff',
                            fontWeight: 'bold',
                          }}
                        >
                          {`Fase ${faseIndex + 1}. ${fase.nombre}`}
                        </TableCell>

                        <TableCell
                          align="center"
                          sx={{
                            ...stickyLeftSx,
                            left: 230,
                            width: 70,
                            minWidth: 70,
                            maxWidth: 70,
                            fontWeight: 'bold',
                          }}
                        >
                          {planInicio ?? ''}
                        </TableCell>

                        <TableCell
                          align="center"
                          sx={{
                            ...stickyLeftSx,
                            left: 300,
                            width: 70,
                            minWidth: 70,
                            maxWidth: 70,
                            fontWeight: 'bold',
                          }}
                        >
                          {planDuracion}
                        </TableCell>

                        <TableCell
                          align="center"
                          sx={{
                            ...stickyLeftSx,
                            left: 370,
                            width: 90,
                            minWidth: 90,
                            maxWidth: 90,
                          }}
                        >
                          <Button
                            size="small"
                            color="error"
                            variant="text"
                            onClick={() => clearFaseRange(faseIndex)}
                          >
                            Limpiar
                          </Button>
                        </TableCell>

                        {diasProyecto.map((day) => {
                          const isAssigned = fase.fechasAsignadas.includes(day.fecha);

                          return (
                            <TableCell
                              key={`${fase.nombre}-${day.fecha}`}
                              align="center"
                              sx={{
                                p: 0.25,
                                minWidth: 42,
                                borderLeft: day.diaNumero % 5 === 1 ? '1px solid #bbb' : undefined,
                              }}
                              onMouseDown={() => {
                                setFaseDrag({
                                  faseIndex,
                                  startFecha: day.fecha,
                                  isDragging: true,
                                });
                                setFaseRange(faseIndex, day.fecha, day.fecha);
                              }}
                              onMouseEnter={() => {
                                if (
                                  faseDrag &&
                                  faseDrag.isDragging &&
                                  faseDrag.faseIndex === faseIndex
                                ) {
                                  setFaseRange(faseIndex, faseDrag.startFecha, day.fecha);
                                }
                              }}
                              onMouseUp={() => {
                                setFaseDrag(null);
                              }}
                            >
                              <Box
                                sx={{
                                  width: 26,
                                  height: 26,
                                  mx: 'auto',
                                  borderRadius: 0.5,
                                  cursor: 'pointer',
                                  border: '1px solid #c7c7c7',
                                  backgroundColor: isAssigned ? '#b48ead' : '#f7f7f7',
                                  '&:hover': {
                                    opacity: 0.85,
                                  },
                                }}
                                title={`${fase.nombre} - ${day.fecha}`}
                              />
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Box>

            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Resumen financiero por fase: asigna el porcentaje y revisa el monto estimado y el monto final con descuento.
            </Typography>

            <Box
              sx={{
                overflowX: 'auto',
                border: '1px solid #d9d9d9',
                borderRadius: 2,
                bgcolor: '#fff',
                mb: 2,
              }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#e3f2fd' }}>
                    <TableCell><strong>Fase</strong></TableCell>
                    <TableCell align="center"><strong>%</strong></TableCell>
                    <TableCell align="center"><strong>Días</strong></TableCell>
                    <TableCell align="center"><strong>Estimado MXN</strong></TableCell>
                    <TableCell align="center"><strong>Estimado USD</strong></TableCell>
                    <TableCell align="center"><strong>Final desc. MXN</strong></TableCell>
                    <TableCell align="center"><strong>Final desc. USD</strong></TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {resumenFases.map((fase) => (
                    <TableRow key={`resumen-fase-${fase.nombre}`} hover>
                      <TableCell sx={{ fontWeight: 500 }}>
                        {`Fase ${fase.faseIndex + 1}. ${fase.nombre}`}
                      </TableCell>

                      <TableCell align="center">
                        <TextField
                          type="number"
                          size="small"
                          value={fase.porcentaje}
                          onChange={(e) => updateFasePorcentaje(fase.faseIndex, e.target.value)}
                          inputProps={{ min: 0, max: 100, step: 0.01 }}
                          sx={{ width: 90 }}
                        />
                      </TableCell>

                      <TableCell align="center">{fase.planDuracion}</TableCell>

                      <TableCell align="center">
                        {formatCurrency(fase.montoEstimadoMXN)}
                      </TableCell>

                      <TableCell align="center">
                        {formatCurrency(fase.montoEstimadoUSD)}
                      </TableCell>

                      <TableCell align="center">
                        {hayDescuento ? formatCurrency(fase.montoFinalMXN) : 'N/A'}
                      </TableCell>

                      <TableCell align="center">
                        {hayDescuento ? formatCurrency(fase.montoFinalUSD) : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}

                  <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableCell><strong>Total</strong></TableCell>
                    <TableCell align="center">
                      <strong>{totalPorcentajeAsignado.toFixed(2)}%</strong>
                    </TableCell>
                    <TableCell align="center">
                      <strong>{totalDiasAsignados}</strong>
                    </TableCell>
                    <TableCell align="center">
                      <strong>{formatCurrency(totalRecursosMXN)}</strong>
                    </TableCell>
                    <TableCell align="center">
                      <strong>{formatCurrency(totalRecursosUSD)}</strong>
                    </TableCell>
                    <TableCell align="center">
                      <strong>
                        {hayDescuento ? formatCurrency(totalRecursosConDescuentoMXN) : 'N/A'}
                      </strong>
                    </TableCell>
                    <TableCell align="center">
                      <strong>
                        {hayDescuento ? formatCurrency(totalRecursosConDescuentoUSD) : 'N/A'}
                      </strong>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Box>

            <Box mt={2} display="flex" gap={2} flexWrap="wrap">
              <Chip
                size="small"
                color={totalDiasAsignados !== workingDays ? 'error' : 'default'}
                label={`Días asignados: ${totalDiasAsignados}`}
              />

              <Chip
                size="small"
                color={Math.abs(totalPorcentajeAsignado - 100) > 0.001 ? 'error' : 'default'}
                label={`Porcentaje total: ${totalPorcentajeAsignado.toFixed(2)}%`}
              />

              <Chip size="small" label={`Días hábiles: ${workingDays}`} />

              <Chip size="small" label={`Total estimado: ${formatCurrency(totalRecursosMXN)}`} />

              <Chip
                size="small"
                color="success"
                label={
                  hayDescuento
                    ? `Total final desc.: ${formatCurrency(totalRecursosConDescuentoMXN)}`
                    : `Total final: ${formatCurrency(totalRecursosMXN)}`
                }
              />
            </Box>

            {totalDiasAsignados !== workingDays && (
              <Box mt={2}>
                <Typography color="error">
                  La suma de los días asignados en las fases debe ser igual a los días hábiles
                  calculados ({workingDays}).
                </Typography>
              </Box>
            )}

            {Math.abs(totalPorcentajeAsignado - 100) > 0.001 && (
              <Box mt={1}>
                <Typography color="error">
                  El porcentaje total de las fases debe sumar 100%.
                </Typography>
              </Box>
            )}
          </>
        )}

        <Box mt={4} display="flex" gap={2} flexWrap="wrap">
          <Button variant="outlined" onClick={exportToExcel}>
            Exportar un Excel
          </Button>

          <Button
            variant="contained"
            onClick={handleGuardarProyecto}
            disabled={savingProject}
          >
            {savingProject ? 'Guardando proyecto...' : 'Guardar proyecto'}
          </Button>
        </Box>
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4500}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity={snackbar.severity}
          variant="filled"
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}