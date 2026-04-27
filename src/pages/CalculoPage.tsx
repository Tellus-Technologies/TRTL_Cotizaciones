import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  FormControl,
  FormControlLabel,
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

type RecursoPlaneacion = {
  recursoId: number;
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
  return ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'][date.getMonth()];
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
  const [selectedModulos, setSelectedModulos] = useState<number[]>([]);
  const [exchangeRate, setExchangeRate] = useState<number>(DEFAULT_EXCHANGE_RATE);
  const [tipoCambioFecha, setTipoCambioFecha] = useState<string>('');
  const [loadingTipoCambio, setLoadingTipoCambio] = useState<boolean>(false);

  const [metodologia, setMetodologia] = useState<MetodologiaKey>('');
  const [fases, setFases] = useState<FaseItem[]>([]);
  const [diasManuales, setDiasManuales] = useState<Record<number, string>>({});

  const [selectedRecursos, setSelectedRecursos] = useState<number[]>([]);
  const [planeacionRecursos, setPlaneacionRecursos] = useState<RecursoPlaneacion[]>([]);

  const [tipoDescuento, setTipoDescuento] = useState<TipoDescuento>('porcentaje');
  const [valorDescuento, setValorDescuento] = useState<string>('');

  const [faseDrag, setFaseDrag] = useState<{
    faseIndex: number;
    startFecha: string;
    isDragging: boolean;
  } | null>(null);

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
    setSelectedModulos([]);
    setDiasManuales({});
    setSelectedRecursos([]);
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
    setSelectedModulos([]);
    setExchangeRate(DEFAULT_EXCHANGE_RATE);
    setTipoCambioFecha('');
    setMetodologia('');
    setFases([]);
    setDiasManuales({});
    setSelectedRecursos([]);
    setPlaneacionRecursos([]);
    setTipoDescuento('porcentaje');
    setValorDescuento('');
    void cargarTipoCambioActual(false);
  };

  const toggleModulo = (id: number) => {
    setSelectedModulos((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const toggleRecurso = (id: number) => {
    setSelectedRecursos((prev) => {
      const exists = prev.includes(id);
      const updated = exists ? prev.filter((r) => r !== id) : [...prev, id];

      setPlaneacionRecursos((prevPlan) => {
        const hasPlan = prevPlan.some((p) => p.recursoId === id);

        if (!exists && !hasPlan) {
          return [...prevPlan, { recursoId: id, fechasAsignadas: [] }];
        }

        if (exists) {
          return prevPlan.filter((p) => p.recursoId !== id);
        }

        return prevPlan;
      });

      return updated;
    });
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

  const handleDiasManualChange = (modId: number, value: string) => {
    if (value === '') {
      setDiasManuales((prev) => ({
        ...prev,
        [modId]: '',
      }));
      return;
    }

    const numero = Number(value);
    if (Number.isNaN(numero) || numero < 0) return;

    setDiasManuales((prev) => ({
      ...prev,
      [modId]: String(Math.floor(numero)),
    }));
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

  const resumenModulos = useMemo(() => {
    return selectedModulos.map((modId) => {
      const modulo = modulos.find((m) => m.id === modId)?.modu || '';
      const tarifa = getTarifaModuloPorAnios(modId);

      const diasManualTexto = diasManuales[modId];
      const dias =
        diasManualTexto !== undefined && diasManualTexto !== ''
          ? Number(diasManualTexto)
          : workingDays;

      const horas = dias * HOURS_PER_DAY;
      const totalMXN = tarifa * horas;
      const totalUSD = exchangeRate > 0 ? totalMXN / exchangeRate : 0;

      return {
        modId,
        modulo,
        tarifa,
        dias,
        horas,
        totalMXN,
        totalUSD,
      };
    });
  }, [
    selectedModulos,
    modulos,
    workingDays,
    exchangeRate,
    diasManuales,
    clienteIdNumber,
    aniosOrdenadosSeleccionados,
    tarifas,
  ]);

  const totalProyectoMXN = useMemo(() => {
    return resumenModulos.reduce((acc, item) => acc + item.totalMXN, 0);
  }, [resumenModulos]);

  const totalProyectoUSD = useMemo(() => {
    return resumenModulos.reduce((acc, item) => acc + item.totalUSD, 0);
  }, [resumenModulos]);

  const totalProyectoDias = useMemo(() => {
    return resumenModulos.reduce((acc, item) => acc + item.dias, 0);
  }, [resumenModulos]);

  const totalProyectoHoras = useMemo(() => {
    return resumenModulos.reduce((acc, item) => acc + item.horas, 0);
  }, [resumenModulos]);

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

  const toggleFechaRecurso = (recursoId: number, fecha: string) => {
    setPlaneacionRecursos((prev) =>
      prev.map((recurso) => {
        if (recurso.recursoId !== recursoId) return recurso;

        const exists = recurso.fechasAsignadas.includes(fecha);

        return {
          ...recurso,
          fechasAsignadas: exists
            ? recurso.fechasAsignadas.filter((f) => f !== fecha)
            : uniqueSortedDates([...recurso.fechasAsignadas, fecha]),
        };
      })
    );
  };

  const clearRecursoDays = (recursoId: number) => {
    setPlaneacionRecursos((prev) =>
      prev.map((recurso) =>
        recurso.recursoId === recursoId
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
    setSelectedRecursos((prev) =>
      prev.filter((id) => recursosDisponibles.some((r) => r.id === id))
    );

    setPlaneacionRecursos((prev) =>
      prev.filter((p) => recursosDisponibles.some((r) => r.id === p.recursoId))
    );
  }, [recursosDisponibles]);

  const resumenRecursos = useMemo(() => {
    return planeacionRecursos
      .filter((p) => selectedRecursos.includes(p.recursoId))
      .map((plan) => {
        const recurso = recursosDisponibles.find((r) => r.id === plan.recursoId);
        const diasAsignados = plan.fechasAsignadas.length;
        const horas = diasAsignados * HOURS_PER_DAY;
        const tarifaHora = recurso?.tarifa || 0;
        const totalMXN = tarifaHora * horas;
        const totalUSD = exchangeRate > 0 ? totalMXN / exchangeRate : 0;

        return {
          recursoId: plan.recursoId,
          nombre: recurso?.nombre || '',
          tarifaHora,
          fechasAsignadas: plan.fechasAsignadas,
          diasAsignados,
          horas,
          totalMXN,
          totalUSD,
        };
      });
  }, [planeacionRecursos, selectedRecursos, recursosDisponibles, exchangeRate]);

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

  const exportToExcel = () => {
    const resumenData = resumenModulos.map((item) => ({
      Módulo: item.modulo,
      'Tarifa (MXN/h)': item.tarifa,
      'Días Laborables': item.dias,
      'Horas Totales': item.horas,
      'Total (MXN)': item.totalMXN.toFixed(2),
      'Total (USD)': item.totalUSD.toFixed(2),
      'Años fiscales seleccionados': aniosSeleccionados.join(', '),
    }));

    const fasesData = fases.map((fase) => {
      const porcentaje =
        fase.porcentaje === '' || fase.porcentaje === null || fase.porcentaje === undefined
          ? 0
          : Number(fase.porcentaje);

      const porcentajeSeguro = Number.isNaN(porcentaje) ? 0 : porcentaje;
      const montoMXN = totalProyectoMXN * (porcentajeSeguro / 100);
      const montoUSD = totalProyectoUSD * (porcentajeSeguro / 100);

      return {
        Metodología: metodologia,
        Fase: fase.nombre,
        'Plan inicio': getFasePlanInicio(fase) ?? '',
        'Plan duración': fase.fechasAsignadas.length,
        'Porcentaje monetario': porcentajeSeguro,
        'Monto fase (MXN)': montoMXN.toFixed(2),
        'Monto fase (USD)': montoUSD.toFixed(2),
      };
    });

    const recursosResumenData = resumenRecursos.map((item) => ({
      Recurso: item.nombre,
      'Tarifa (MXN/h)': item.tarifaHora,
      'Días asignados': item.diasAsignados,
      Horas: item.horas,
      'Total real (MXN)': item.totalMXN.toFixed(2),
      'Total real (USD)': item.totalUSD.toFixed(2),
    }));

    const descuentoData = [
      {
        'Tipo descuento': tipoDescuento,
        'Valor descuento': valorDescuento || '0',
        'Total recursos real (MXN)': totalRecursosMXN.toFixed(2),
        'Total recursos real (USD)': totalRecursosUSD.toFixed(2),
        'Descuento aplicado (MXN)': descuentoMXNAplicado.toFixed(2),
        'Descuento aplicado (USD)': descuentoUSD.toFixed(2),
        'Total con descuento (MXN)': totalRecursosConDescuentoMXN.toFixed(2),
        'Total con descuento (USD)': totalRecursosConDescuentoUSD.toFixed(2),
      },
    ];

    const workbook = XLSX.utils.book_new();

    const wsResumen = XLSX.utils.json_to_sheet(resumenData);
    XLSX.utils.book_append_sheet(workbook, wsResumen, 'Resumen');

    if (fasesData.length > 0) {
      const wsFases = XLSX.utils.json_to_sheet(fasesData);
      XLSX.utils.book_append_sheet(workbook, wsFases, 'Proyecto');
    }

    if (recursosResumenData.length > 0) {
      const wsRecursos = XLSX.utils.json_to_sheet(recursosResumenData);
      XLSX.utils.book_append_sheet(workbook, wsRecursos, 'Recursos');
    }

    const wsDescuento = XLSX.utils.json_to_sheet(descuentoData);
    XLSX.utils.book_append_sheet(workbook, wsDescuento, 'Descuento Recursos');

    if (fases.length > 0 && diasProyecto.length > 0) {
      const fasesMatrix: (string | number)[][] = [];

      fasesMatrix.push([
        'ETAPAS DEL PROYECTO',
        'PLAN INICIO',
        'PLAN DURACIÓN',
        '% MONETARIO',
        ...diasProyecto.map((d) => d.weekLabel),
      ]);

      fasesMatrix.push([
        '',
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
          Number(fase.porcentaje || 0),
          ...diasProyecto.map((d) => (fase.fechasAsignadas.includes(d.fecha) ? 1 : 0)),
        ]);
      });

      const wsFasesMatrix = XLSX.utils.aoa_to_sheet(fasesMatrix);
      XLSX.utils.book_append_sheet(workbook, wsFasesMatrix, 'Planeacion Fases');
    }

    if (resumenRecursos.length > 0 && diasProyecto.length > 0) {
      const matrixData: (string | number)[][] = [];

      matrixData.push([
        'Recurso',
        'Tarifa (MXN/h)',
        'Días',
        'Horas',
        'Total (MXN)',
        ...diasProyecto.map((d) => d.weekLabel),
      ]);

      matrixData.push([
        '',
        '',
        '',
        '',
        '',
        ...diasProyecto.map((d) => `${d.dayNameShort}${d.diaNumero}`),
      ]);

      resumenRecursos.forEach((recurso) => {
        matrixData.push([
          recurso.nombre,
          recurso.tarifaHora,
          recurso.diasAsignados,
          recurso.horas,
          recurso.totalMXN.toFixed(2),
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

    if (selectedModulos.length === 0) {
      showSnackbar('Selecciona al menos un módulo', 'warning');
      return false;
    }

    if (exchangeRate <= 0) {
      showSnackbar('El tipo de cambio debe ser mayor a 0', 'warning');
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
        total_mxn: totalProyectoMXN,
        total_usd: totalProyectoUSD,
        total_dias: totalProyectoDias,
        total_horas: totalProyectoHoras,
        modulos: resumenModulos.map((item) => ({
          modulo_id: item.modId,
          tarifa_mxn: item.tarifa,
          dias: item.dias,
          horas: item.horas,
          total_mxn: item.totalMXN,
          total_usd: item.totalUSD,
        })),
        fases: fases.map((fase, index) => {
          const porcentaje =
            fase.porcentaje === '' || fase.porcentaje === null || fase.porcentaje === undefined
              ? 0
              : Number(fase.porcentaje);

          const porcentajeSeguro = Number.isNaN(porcentaje) ? 0 : porcentaje;
          const montoMXN = totalProyectoMXN * (porcentajeSeguro / 100);
          const montoUSD = totalProyectoUSD * (porcentajeSeguro / 100);

          return {
            orden_fase: index + 1,
            nombre_fase: fase.nombre,
            dias: fase.fechasAsignadas.length,
            porcentaje: porcentajeSeguro,
            plan_inicio: getFasePlanInicio(fase),
            monto_mxn: montoMXN,
            monto_usd: montoUSD,
            fechas_asignadas: [...fase.fechasAsignadas],
          };
        }),
        recursos: resumenRecursos.map((recurso) => ({
          modulo_id: recurso.recursoId,
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
        `Proyecto guardado correctamente. Número de proyecto: ${response?.numero_proyecto ?? ''}`,
        'success'
      );

      const proyectoId = response?.id;

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

  return (
    <Box sx={{ maxWidth: 1600, mx: 'auto', mt: 4, px: 2, mb: 5 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 3, bgcolor: '#f0f4f8' }}>
        <Typography variant="h5" gutterBottom color="primary.main">
          Cálculo del Precio del Proyecto
        </Typography>

        <Divider sx={{ mb: 3 }} />

        <Box display="flex" flexWrap="wrap" gap={2} mb={2}>
          <TextField
            label="Nombre del proyecto"
            value={nombreProyecto}
            onChange={(e) => setNombreProyecto(e.target.value)}
            sx={{ minWidth: 280 }}
          />

          <FormControl sx={{ minWidth: 220 }}>
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

          <FormControl sx={{ minWidth: 260 }}>
            <InputLabel>Años Fiscales</InputLabel>
            <Select
              multiple
              value={aniosSeleccionados}
              onChange={(e) => {
                const value = e.target.value;
                const years = typeof value === 'string' ? value.split(',') : value;
                setAniosSeleccionados(years);
                setSelectedModulos([]);
                setDiasManuales({});
                setSelectedRecursos([]);
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
            onChange={(e) => setStartDate(e.target.value)}
          />

          <TextField
            label="Fecha Fin"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </Box>

        <Typography variant="subtitle1" gutterBottom>
          Días hábiles calculados: <strong>{workingDays}</strong>
        </Typography>

        <Box mt={2} mb={2}>
          <Typography variant="subtitle1">Selecciona los módulos:</Typography>
          <Box display="flex" flexWrap="wrap" gap={2} mt={1}>
            {clienteIdNumber !== null &&
              modulosDisponibles.map((modId) => {
                const modulo = modulos.find((m) => m.id === modId);
                if (!modulo) return null;

                return (
                  <FormControlLabel
                    key={modulo.id}
                    control={
                      <Checkbox
                        checked={selectedModulos.includes(modulo.id)}
                        onChange={() => toggleModulo(modulo.id)}
                      />
                    }
                    label={modulo.modu}
                  />
                );
              })}
          </Box>
        </Box>

        <Typography variant="h6" gutterBottom>
          Resumen
        </Typography>

        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#e3f2fd' }}>
              <TableCell><strong>Módulo</strong></TableCell>
              <TableCell><strong>Tarifa (MXN/h)</strong></TableCell>
              <TableCell><strong>Días</strong></TableCell>
              <TableCell><strong>Horas</strong></TableCell>
              <TableCell><strong>Total (MXN)</strong></TableCell>
              <TableCell><strong>Total (USD)</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {resumenModulos.map((item) => (
              <TableRow key={item.modId}>
                <TableCell>{item.modulo}</TableCell>
                <TableCell>{formatCurrency(Number(item.tarifa))}</TableCell>

                <TableCell>
                  <TextField
                    variant="standard"
                    type="number"
                    value={
                      diasManuales[item.modId] !== undefined
                        ? diasManuales[item.modId]
                        : String(item.dias)
                    }
                    onChange={(e) => handleDiasManualChange(item.modId, e.target.value)}
                    inputProps={{
                      min: 0,
                      step: 1,
                    }}
                    sx={{ width: 70 }}
                  />
                </TableCell>

                <TableCell>{item.horas}</TableCell>
                <TableCell>{formatCurrency(item.totalMXN)}</TableCell>
                <TableCell>{formatCurrency(item.totalUSD)}</TableCell>
              </TableRow>
            ))}

            {resumenModulos.length > 0 && (
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell colSpan={4}>
                  <strong>Total del proyecto</strong>
                </TableCell>
                <TableCell>
                  <strong>{formatCurrency(totalProyectoMXN)}</strong>
                </TableCell>
                <TableCell>
                  <strong>{formatCurrency(totalProyectoUSD)}</strong>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <Box mt={3} display="flex" gap={2} flexWrap="wrap" alignItems="center">
          <TextField
            label="Tipo de cambio actual (MXN/USD)"
            type="number"
            value={exchangeRate}
            onChange={(e) => setExchangeRate(Number(e.target.value))}
          />

          <Button
            variant="outlined"
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

        <Divider sx={{ my: 4 }} />

        <Typography variant="h5" gutterBottom color="primary.main">
          Configuración del Proyecto
        </Typography>

        <Box mt={2} mb={3}>
          <FormControl sx={{ minWidth: 280 }}>
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

            <Box sx={{ overflowX: 'auto', border: '1px solid #d9d9d9', borderRadius: 2, bgcolor: '#fff' }}>
              <Table size="small" sx={{ minWidth: 1400 }}>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#e8f5e9' }}>
                    <TableCell rowSpan={2} sx={{ minWidth: 260 }}>
                      <strong>ETAPAS DEL PROYECTO</strong>
                    </TableCell>
                    <TableCell rowSpan={2} align="center">
                      <strong>PLAN INICIO</strong>
                    </TableCell>
                    <TableCell rowSpan={2} align="center">
                      <strong>PLAN DURACIÓN</strong>
                    </TableCell>
                    <TableCell rowSpan={2} align="center" sx={{ minWidth: 140 }}>
                      <strong>% MONETARIO</strong>
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
                          minWidth: week.count * 36,
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
                          minWidth: 36,
                          p: 0.5,
                          borderLeft: day.diaNumero % 5 === 1 ? '1px solid #bbb' : undefined,
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

                    const porcentaje =
                      fase.porcentaje === '' || fase.porcentaje === null || fase.porcentaje === undefined
                        ? 0
                        : Number(fase.porcentaje);

                    const porcentajeSeguro = Number.isNaN(porcentaje) ? 0 : porcentaje;
                    const montoMXN = totalProyectoMXN * (porcentajeSeguro / 100);
                    const montoUSD = totalProyectoUSD * (porcentajeSeguro / 100);

                    return (
                      <TableRow key={fase.nombre} hover>
                        <TableCell
                          sx={{
                            backgroundColor: '#5f9ea0',
                            color: '#fff',
                            fontWeight: 'bold',
                          }}
                        >
                          {`Fase ${faseIndex + 1}. ${fase.nombre}`}
                        </TableCell>

                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                          {planInicio ?? ''}
                        </TableCell>

                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                          {planDuracion}
                        </TableCell>

                        <TableCell align="center">
                          <TextField
                            label="% monetario"
                            type="number"
                            size="small"
                            value={fase.porcentaje}
                            onChange={(e) => updateFasePorcentaje(faseIndex, e.target.value)}
                            inputProps={{ min: 0, max: 100, step: 0.01 }}
                            sx={{ width: 110, mb: 1 }}
                          />

                          <Typography variant="caption" display="block">
                            MXN {formatCurrency(montoMXN)}
                          </Typography>
                          <Typography variant="caption" display="block">
                            USD {formatCurrency(montoUSD)}
                          </Typography>

                          <Button
                            size="small"
                            color="error"
                            variant="text"
                            onClick={() => clearFaseRange(faseIndex)}
                            sx={{ mt: 0.5 }}
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
                                  width: 24,
                                  height: 24,
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

            <Box mt={3} display="flex" gap={4} flexWrap="wrap">
              <Typography color={totalDiasAsignados !== workingDays ? 'error' : 'text.primary'}>
                <strong>Total días asignados:</strong> {totalDiasAsignados}
              </Typography>

              <Typography color={Math.abs(totalPorcentajeAsignado - 100) > 0.001 ? 'error' : 'text.primary'}>
                <strong>Porcentaje total asignado:</strong> {totalPorcentajeAsignado.toFixed(2)}%
              </Typography>

              <Typography>
                <strong>Días hábiles calculados:</strong> {workingDays}
              </Typography>
            </Box>

            {totalDiasAsignados !== workingDays && (
              <Box mt={2}>
                <Typography color="error">
                  La suma de los días asignados en las fases debe ser igual a los días hábiles calculados ({workingDays}).
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

        <Divider sx={{ my: 4 }} />

        <Typography variant="h5" gutterBottom color="primary.main">
          Planeación de Recursos
        </Typography>

        <Box mt={2} mb={3}>
          <Typography variant="subtitle1">Selecciona los recursos:</Typography>

          <Box display="flex" flexWrap="wrap" gap={2} mt={1}>
            {recursosDisponibles.map((recurso) => (
              <FormControlLabel
                key={recurso.id}
                control={
                  <Checkbox
                    checked={selectedRecursos.includes(recurso.id)}
                    onChange={() => toggleRecurso(recurso.id)}
                  />
                }
                label={`${recurso.nombre} (${formatCurrency(recurso.tarifa)}/h)`}
              />
            ))}
          </Box>
        </Box>

        {selectedRecursos.length > 0 && (
          <>
            <Box display="flex" flexWrap="wrap" gap={2} mb={2}>
              <Chip label={`Recursos seleccionados: ${selectedRecursos.length}`} color="primary" />
              <Chip label={`Días planeados: ${totalRecursosDias}`} />
              <Chip label={`Horas planeadas: ${totalRecursosHoras}`} />
              <Chip label={`Costo real MXN: ${formatCurrency(totalRecursosMXN)}`} />
              <Chip label={`Costo real USD: ${formatCurrency(totalRecursosUSD)}`} />
              <Chip label={`Costo final MXN: ${formatCurrency(totalRecursosConDescuentoMXN)}`} color="success" />
              <Chip label={`Costo final USD: ${formatCurrency(totalRecursosConDescuentoUSD)}`} color="success" />
            </Box>

            <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Descuento sobre total de recursos
              </Typography>

              <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
                <FormControl sx={{ minWidth: 220 }}>
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
                  value={valorDescuento}
                  onChange={(e) => handleDescuentoChange(e.target.value)}
                  sx={{ minWidth: 180 }}
                />
              </Box>

              <Box mt={2} display="flex" gap={3} flexWrap="wrap">
                <Typography>
                  <strong>Total real MXN:</strong> {formatCurrency(totalRecursosMXN)}
                </Typography>
                <Typography>
                  <strong>Total real USD:</strong> {formatCurrency(totalRecursosUSD)}
                </Typography>
                <Typography>
                  <strong>Descuento MXN:</strong> {formatCurrency(descuentoMXNAplicado)}
                </Typography>
                <Typography>
                  <strong>Descuento USD:</strong> {formatCurrency(descuentoUSD)}
                </Typography>
                <Typography color="success.main">
                  <strong>Total con descuento MXN:</strong> {formatCurrency(totalRecursosConDescuentoMXN)}
                </Typography>
                <Typography color="success.main">
                  <strong>Total con descuento USD:</strong> {formatCurrency(totalRecursosConDescuentoUSD)}
                </Typography>
              </Box>
            </Paper>

            <Box sx={{ overflowX: 'auto', border: '1px solid #d9d9d9', borderRadius: 2, bgcolor: '#fff' }}>
              <Table size="small" sx={{ minWidth: 1200 }}>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#fff8e1' }}>
                    <TableCell rowSpan={2}><strong>Recurso</strong></TableCell>
                    <TableCell rowSpan={2}><strong>Tarifa</strong></TableCell>
                    <TableCell rowSpan={2}><strong>Días</strong></TableCell>
                    <TableCell rowSpan={2}><strong>Horas</strong></TableCell>
                    <TableCell rowSpan={2}><strong>Total MXN</strong></TableCell>
                    <TableCell rowSpan={2} sx={{ minWidth: 120 }}><strong>Acciones</strong></TableCell>

                    {groupedWeeks.map((week) => (
                      <TableCell
                        key={week.weekLabel}
                        align="center"
                        colSpan={week.count}
                        sx={{
                          borderLeft: '1px solid #bbb',
                          backgroundColor: '#f5f5f5',
                          fontWeight: 'bold',
                          minWidth: week.count * 36,
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
                          minWidth: 36,
                          p: 0.5,
                          borderLeft: day.diaNumero % 5 === 1 ? '1px solid #bbb' : undefined,
                        }}
                      >
                        <Box>
                          <Typography variant="caption" sx={{ display: 'block', lineHeight: 1 }}>
                            {day.dayNameShort}
                          </Typography>
                          <Typography variant="caption" sx={{ display: 'block', lineHeight: 1, fontWeight: 'bold' }}>
                            {day.diaNumero}
                          </Typography>
                        </Box>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>

                <TableBody>
                  {resumenRecursos.map((recurso) => (
                    <TableRow key={recurso.recursoId} hover>
                      <TableCell>{recurso.nombre}</TableCell>
                      <TableCell>{formatCurrency(recurso.tarifaHora)}</TableCell>
                      <TableCell>{recurso.diasAsignados}</TableCell>
                      <TableCell>{recurso.horas}</TableCell>
                      <TableCell>{formatCurrency(recurso.totalMXN)}</TableCell>

                      <TableCell>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          onClick={() => clearRecursoDays(recurso.recursoId)}
                        >
                          Limpiar
                        </Button>
                      </TableCell>

                      {diasProyecto.map((day) => {
                        const isAssigned = recurso.fechasAsignadas.includes(day.fecha);

                        return (
                          <TableCell
                            key={`${recurso.recursoId}-${day.fecha}`}
                            align="center"
                            sx={{
                              p: 0.25,
                              borderLeft: day.diaNumero % 5 === 1 ? '1px solid #bbb' : undefined,
                            }}
                          >
                            <Box
                              onClick={() => toggleFechaRecurso(recurso.recursoId, day.fecha)}
                              sx={{
                                width: 24,
                                height: 24,
                                mx: 'auto',
                                borderRadius: 1,
                                cursor: 'pointer',
                                border: '1px solid #c7c7c7',
                                backgroundColor: isAssigned ? '#7e57c2' : '#f7f7f7',
                                '&:hover': {
                                  opacity: 0.85,
                                },
                              }}
                              title={`${recurso.nombre} - ${day.fecha}`}
                            />
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}

                  {resumenRecursos.length > 0 && (
                    <>
                      <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                        <TableCell colSpan={2}>
                          <strong>Total recursos real</strong>
                        </TableCell>
                        <TableCell><strong>{totalRecursosDias}</strong></TableCell>
                        <TableCell><strong>{totalRecursosHoras}</strong></TableCell>
                        <TableCell><strong>{formatCurrency(totalRecursosMXN)}</strong></TableCell>
                        <TableCell colSpan={1}></TableCell>
                        <TableCell colSpan={diasProyecto.length}></TableCell>
                      </TableRow>

                      <TableRow sx={{ backgroundColor: '#eef7ee' }}>
                        <TableCell colSpan={4}>
                          <strong>Total recursos con descuento</strong>
                        </TableCell>
                        <TableCell><strong>{formatCurrency(totalRecursosConDescuentoMXN)}</strong></TableCell>
                        <TableCell colSpan={1}></TableCell>
                        <TableCell colSpan={diasProyecto.length}></TableCell>
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </Box>
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