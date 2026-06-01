import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
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
} from '@mui/material';
import { ArrowBack, Edit, Save, Cancel } from '@mui/icons-material';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type {
  ProyectoDetalleResponse,
  ProyectoModulo,
  ProyectoFase,
  ProyectoRecurso,
  ProyectoUpdatePayload,
  TipoDescuento,
} from '../types';
import { getProyectoDetalle, updateProyecto } from '../api/proyectosApi';

function formatCurrency(value: number | null | undefined) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function toLocalDateString(dateStr: string | null | undefined) {
  if (!dateStr) return '-';

  const onlyDate = String(dateStr).slice(0, 10);
  const [year, month, day] = onlyDate.split('-');

  if (!year || !month || !day) return String(dateStr);

  return `${day}/${month}/${year}`;
}

function normalizeDate(dateStr: string) {
  return String(dateStr).slice(0, 10);
}

function addOneDay(dateStr: string) {
  const date = new Date(`${dateStr}T00:00:00`);
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

function formatDateRanges(dates: string[]) {
  if (!dates || dates.length === 0) return '-';

  const sortedUniqueDates = Array.from(
    new Set(dates.map((d) => normalizeDate(d)))
  ).sort((a, b) => a.localeCompare(b));

  const ranges: Array<{ start: string; end: string }> = [];
  let rangeStart = sortedUniqueDates[0];
  let rangeEnd = sortedUniqueDates[0];

  for (let i = 1; i < sortedUniqueDates.length; i += 1) {
    const currentDate = sortedUniqueDates[i];
    const expectedNext = addOneDay(rangeEnd);

    if (currentDate === expectedNext) {
      rangeEnd = currentDate;
    } else {
      ranges.push({ start: rangeStart, end: rangeEnd });
      rangeStart = currentDate;
      rangeEnd = currentDate;
    }
  }

  ranges.push({ start: rangeStart, end: rangeEnd });

  return ranges
    .map((range) => {
      const startFormatted = toLocalDateString(range.start);
      const endFormatted = toLocalDateString(range.end);

      return range.start === range.end
        ? startFormatted
        : `${startFormatted} - ${endFormatted}`;
    })
    .join(', ');
}

function normalizeInputDate(dateStr: string | null | undefined) {
  if (!dateStr) return '';
  return String(dateStr).slice(0, 10);
}

function safeNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

type FaseEditable = ProyectoFase & {
  porcentaje_editable: number;
};

export default function ProyectoDetallePage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [detalle, setDetalle] = useState<ProyectoDetalleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [nombreProyecto, setNombreProyecto] = useState('');
  const [comentarioProyecto, setComentarioProyecto] = useState('');
  const [tipoCambio, setTipoCambio] = useState<number>(0);
  const [tipoDescuento, setTipoDescuento] = useState<TipoDescuento>('porcentaje');
  const [valorDescuento, setValorDescuento] = useState<string>('');
  const [fasesEditables, setFasesEditables] = useState<FaseEditable[]>([]);

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  useEffect(() => {
    void cargarDetalle();
  }, [id]);

  const cargarDetalle = async () => {
    try {
      setLoading(true);
      const data = await getProyectoDetalle(id!);
      setDetalle(data);
      cargarEstadoEditable(data);
    } catch (err) {
      console.error(err);
      setDetalle(null);
    } finally {
      setLoading(false);
    }
  };

  const cargarEstadoEditable = (data: ProyectoDetalleResponse) => {
    setNombreProyecto(data.proyecto.nombre_proyecto || '');
    setComentarioProyecto(data.proyecto.comentario_proyecto || '');
    setTipoCambio(Number(data.proyecto.tipo_cambio || 0));
    setTipoDescuento((data.proyecto.tipo_descuento || 'porcentaje') as TipoDescuento);

    const descuentoGuardado = Number(data.proyecto.valor_descuento || 0);
    setValorDescuento(descuentoGuardado > 0 ? String(descuentoGuardado) : '');

    setFasesEditables(
      data.fases.map((fase) => ({
        ...fase,
        porcentaje_editable: Number(fase.porcentaje || 0),
      }))
    );
  };

  const cancelarEdicion = () => {
    if (detalle) {
      cargarEstadoEditable(detalle);
    }
    setEditando(false);
  };

  const subtotalMXN = useMemo(() => {
    if (!detalle) return 0;

    const subtotalFromProyecto = Number(detalle.proyecto.subtotal_mxn || 0);
    if (subtotalFromProyecto > 0) return subtotalFromProyecto;

    return detalle.recursos.reduce(
      (acc, recurso) => acc + Number(recurso.total_mxn || 0),
      0
    );
  }, [detalle]);

  const subtotalUSD = useMemo(() => {
    if (tipoCambio > 0) return subtotalMXN / tipoCambio;

    if (!detalle) return 0;
    return Number(detalle.proyecto.subtotal_usd || detalle.proyecto.total_usd || 0);
  }, [subtotalMXN, tipoCambio, detalle]);

  const descuentoMXN = useMemo(() => {
    const valor = Number(valorDescuento);

    if (Number.isNaN(valor) || valor <= 0) return 0;

    if (tipoDescuento === 'porcentaje') {
      return subtotalMXN * (valor / 100);
    }

    return valor;
  }, [valorDescuento, tipoDescuento, subtotalMXN]);

  const descuentoMXNAplicado = useMemo(() => {
    return Math.min(descuentoMXN, subtotalMXN);
  }, [descuentoMXN, subtotalMXN]);

  const descuentoUSD = useMemo(() => {
    return tipoCambio > 0 ? descuentoMXNAplicado / tipoCambio : 0;
  }, [descuentoMXNAplicado, tipoCambio]);

  const totalFinalMXN = useMemo(() => {
    return Math.max(0, subtotalMXN - descuentoMXNAplicado);
  }, [subtotalMXN, descuentoMXNAplicado]);

  const totalFinalUSD = useMemo(() => {
    return tipoCambio > 0 ? totalFinalMXN / tipoCambio : 0;
  }, [totalFinalMXN, tipoCambio]);

  const hayDescuento = descuentoMXNAplicado > 0;

  const totalPorcentaje = useMemo(() => {
    return fasesEditables.reduce(
      (acc, fase) => acc + Number(fase.porcentaje_editable || 0),
      0
    );
  }, [fasesEditables]);

  const fasesCalculadas = useMemo(() => {
    return fasesEditables.map((fase) => {
      const porcentaje = Number(fase.porcentaje_editable || 0);
      const montoEstimadoMXN = subtotalMXN * (porcentaje / 100);
      const montoEstimadoUSD = subtotalUSD * (porcentaje / 100);
      const montoFinalMXN = totalFinalMXN * (porcentaje / 100);
      const montoFinalUSD = totalFinalUSD * (porcentaje / 100);

      return {
        ...fase,
        porcentaje,
        monto_estimado_mxn: montoEstimadoMXN,
        monto_estimado_usd: montoEstimadoUSD,
        monto_final_mxn: montoFinalMXN,
        monto_final_usd: montoFinalUSD,
        monto_mxn: montoFinalMXN,
        monto_usd: montoFinalUSD,
      };
    });
  }, [fasesEditables, subtotalMXN, subtotalUSD, totalFinalMXN, totalFinalUSD]);

  const updatePorcentajeFase = (faseId: number, value: string) => {
    const number = Number(value);

    if (value !== '' && (Number.isNaN(number) || number < 0)) return;

    setFasesEditables((prev) =>
      prev.map((fase) =>
        fase.id === faseId
          ? {
              ...fase,
              porcentaje_editable: value === '' ? 0 : number,
            }
          : fase
      )
    );
  };

  const validarEdicion = () => {
    if (!detalle) return false;

    if (!nombreProyecto.trim()) {
      setSnackbar({
        open: true,
        message: 'Captura el nombre del proyecto',
        severity: 'warning',
      });
      return false;
    }

    if (tipoCambio <= 0) {
      setSnackbar({
        open: true,
        message: 'El tipo de cambio debe ser mayor a 0',
        severity: 'warning',
      });
      return false;
    }

    if (Math.abs(totalPorcentaje - 100) > 0.001) {
      setSnackbar({
        open: true,
        message: 'El porcentaje total de las fases debe sumar 100%',
        severity: 'warning',
      });
      return false;
    }

    return true;
  };

  const guardarCambios = async () => {
    if (!detalle || !id) return;
    if (!validarEdicion()) return;

    try {
      setGuardando(true);

      const proyecto = detalle.proyecto;

      const modulosPayload = detalle.modulos.map((modulo) => ({
        modulo_id: modulo.modulo_id,
        tarifa_mxn: safeNumber(modulo.tarifa_mxn),
        dias: safeNumber(modulo.dias),
        horas: safeNumber(modulo.horas),
        total_mxn: safeNumber(modulo.total_mxn),
        total_usd: tipoCambio > 0 ? safeNumber(modulo.total_mxn) / tipoCambio : safeNumber(modulo.total_usd),
      }));

      const recursosPayload = detalle.recursos.map((recurso) => ({
        modulo_id: recurso.modulo_id,
        recurso_numero: recurso.recurso_numero || 1,
        tarifa_hora: safeNumber(recurso.tarifa_hora),
        dias_asignados: safeNumber(recurso.dias_asignados),
        horas: safeNumber(recurso.horas),
        total_mxn: safeNumber(recurso.total_mxn),
        total_usd: tipoCambio > 0 ? safeNumber(recurso.total_mxn) / tipoCambio : safeNumber(recurso.total_usd),
        fechas_asignadas: recurso.fechas_asignadas.map((fecha) => normalizeDate(fecha)),
      }));

      const fasesPayload = fasesCalculadas.map((fase) => ({
        orden_fase: fase.orden_fase,
        nombre_fase: fase.nombre_fase,
        dias: safeNumber(fase.dias),
        porcentaje: safeNumber(fase.porcentaje),
        plan_inicio: fase.plan_inicio,
        monto_mxn: safeNumber(fase.monto_final_mxn),
        monto_usd: safeNumber(fase.monto_final_usd),
        monto_estimado_mxn: safeNumber(fase.monto_estimado_mxn),
        monto_estimado_usd: safeNumber(fase.monto_estimado_usd),
        monto_final_mxn: safeNumber(fase.monto_final_mxn),
        monto_final_usd: safeNumber(fase.monto_final_usd),
        fechas_asignadas: fase.fechas_asignadas.map((fecha) => normalizeDate(fecha)),
      }));

      const payload: ProyectoUpdatePayload = {
        cliente_id: proyecto.cliente_id,
        nombre_proyecto: nombreProyecto.trim(),
        metodologia: proyecto.metodologia || undefined,
        fecha_inicio: normalizeInputDate(proyecto.fecha_inicio),
        fecha_fin: normalizeInputDate(proyecto.fecha_fin),
        tipo_cambio: tipoCambio,
        anios_fiscales: proyecto.anios_fiscales || '',

        subtotal_mxn: subtotalMXN,
        subtotal_usd: subtotalUSD,
        tipo_descuento: hayDescuento ? tipoDescuento : null,
        valor_descuento: hayDescuento ? Number(valorDescuento || 0) : 0,
        descuento_mxn: hayDescuento ? descuentoMXNAplicado : 0,
        descuento_usd: hayDescuento ? descuentoUSD : 0,
        total_final_mxn: totalFinalMXN,
        total_final_usd: totalFinalUSD,
        comentario_proyecto: comentarioProyecto.trim() || null,

        total_mxn: totalFinalMXN,
        total_usd: totalFinalUSD,
        total_dias: safeNumber(proyecto.total_dias),
        total_horas: safeNumber(proyecto.total_horas),

        modulos: modulosPayload,
        fases: fasesPayload,
        recursos: recursosPayload,
      };

      await updateProyecto(id, payload);

      setSnackbar({
        open: true,
        message: 'Proyecto actualizado correctamente',
        severity: 'success',
      });

      setEditando(false);
      await cargarDetalle();
    } catch (err: any) {
      console.error(err);
      setSnackbar({
        open: true,
        message: err?.response?.data?.error || 'Error al actualizar proyecto',
        severity: 'error',
      });
    } finally {
      setGuardando(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ maxWidth: 1200, mx: 'auto', mt: 4, px: 2 }}>
        <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
          <Typography>Cargando detalle del proyecto...</Typography>
        </Paper>
      </Box>
    );
  }

  if (!detalle) {
    return (
      <Box sx={{ maxWidth: 1200, mx: 'auto', mt: 4, px: 2 }}>
        <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
          <Button startIcon={<ArrowBack />} onClick={() => navigate('/proyectos')} sx={{ mb: 2 }}>
            Volver
          </Button>
          <Typography color="error">No se pudo cargar el detalle del proyecto.</Typography>
        </Paper>
      </Box>
    );
  }

  const { proyecto, modulos, recursos } = detalle;

  return (
    <Box sx={{ maxWidth: 1450, mx: 'auto', mt: 4, px: 2, mb: 5 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 3, bgcolor: '#f0f4f8' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" gap={2} flexWrap="wrap">
          <Box>
            <Typography variant="h5" color="primary.main">
              Detalle del Proyecto
            </Typography>
            <Typography variant="h6" sx={{ mt: 1 }}>
              Proyecto #{proyecto.numero_proyecto}
            </Typography>
          </Box>

          <Box display="flex" gap={1} flexWrap="wrap">
            <Button startIcon={<ArrowBack />} variant="outlined" onClick={() => navigate('/proyectos')}>
              Volver
            </Button>

            {!editando ? (
              <Button startIcon={<Edit />} variant="contained" onClick={() => setEditando(true)}>
                Editar
              </Button>
            ) : (
              <>
                <Button
                  startIcon={<Cancel />}
                  variant="outlined"
                  color="secondary"
                  onClick={cancelarEdicion}
                  disabled={guardando}
                >
                  Cancelar
                </Button>

                <Button
                  startIcon={<Save />}
                  variant="contained"
                  color="success"
                  onClick={guardarCambios}
                  disabled={guardando}
                >
                  {guardando ? 'Guardando...' : 'Guardar cambios'}
                </Button>
              </>
            )}
          </Box>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box display="flex" flexWrap="wrap" gap={2} mb={3}>
          <Chip label={`Cliente: ${proyecto.cliente_nombre}`} color="primary" />
          <Chip label={`Metodología: ${proyecto.metodologia || '-'}`} />
          <Chip label={`Años fiscales: ${proyecto.anios_fiscales || '-'}`} />
          <Chip label={`Días: ${proyecto.total_dias}`} />
          <Chip label={`Horas: ${proyecto.total_horas}`} />
        </Box>

        <Paper variant="outlined" sx={{ p: 2.5, mb: 3, bgcolor: '#fff', borderRadius: 2 }}>
          <Typography variant="h6" color="primary.dark" gutterBottom>
            Datos generales
          </Typography>

          <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }} gap={2}>
            <TextField
              label="Nombre del proyecto"
              value={nombreProyecto}
              onChange={(e) => setNombreProyecto(e.target.value)}
              disabled={!editando}
              fullWidth
              size="small"
            />

            <TextField
              label="Tipo de cambio"
              type="number"
              value={tipoCambio}
              onChange={(e) => setTipoCambio(Number(e.target.value))}
              disabled={!editando}
              fullWidth
              size="small"
            />

            <TextField
              label="Fecha inicio"
              value={toLocalDateString(proyecto.fecha_inicio)}
              disabled
              fullWidth
              size="small"
            />

            <TextField
              label="Fecha fin"
              value={toLocalDateString(proyecto.fecha_fin)}
              disabled
              fullWidth
              size="small"
            />

            <TextField
              label="Comentario del proyecto"
              value={comentarioProyecto}
              onChange={(e) => setComentarioProyecto(e.target.value)}
              disabled={!editando}
              fullWidth
              multiline
              minRows={2}
              sx={{ gridColumn: { xs: 'span 1', md: 'span 2' } }}
            />
          </Box>

          {proyecto.cliente_comentario && (
            <Box mt={2}>
              <Typography variant="body2" color="text.secondary">
                <strong>Comentario cliente:</strong> {proyecto.cliente_comentario}
              </Typography>
            </Box>
          )}
        </Paper>

        <Paper variant="outlined" sx={{ p: 2.5, mb: 3, bgcolor: '#fff', borderRadius: 2 }}>
          <Typography variant="h6" color="primary.dark" gutterBottom>
            Descuento y totales
          </Typography>

          <Box display="flex" gap={2} flexWrap="wrap" alignItems="center" mb={2}>
            <FormControl sx={{ minWidth: 220 }} size="small">
              <InputLabel>Tipo de descuento</InputLabel>
              <Select
                value={tipoDescuento}
                label="Tipo de descuento"
                disabled={!editando}
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
              disabled={!editando}
              onChange={(e) => setValorDescuento(e.target.value)}
              size="small"
              sx={{ minWidth: 220 }}
            />
          </Box>

          <Box sx={{ overflowX: 'auto' }}>
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
                  <TableCell>Subtotal</TableCell>
                  <TableCell>{formatCurrency(subtotalMXN)}</TableCell>
                  <TableCell>{formatCurrency(subtotalUSD)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Descuento</TableCell>
                  <TableCell>{hayDescuento ? formatCurrency(descuentoMXNAplicado) : 'N/A'}</TableCell>
                  <TableCell>{hayDescuento ? formatCurrency(descuentoUSD) : 'N/A'}</TableCell>
                </TableRow>
                <TableRow sx={{ backgroundColor: '#eef7ee' }}>
                  <TableCell><strong>Total final</strong></TableCell>
                  <TableCell><strong>{formatCurrency(totalFinalMXN)}</strong></TableCell>
                  <TableCell><strong>{formatCurrency(totalFinalUSD)}</strong></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Box>
        </Paper>

        <Typography variant="h6" gutterBottom color="primary.dark">
          Módulos del proyecto
        </Typography>

        <Box sx={{ overflowX: 'auto', mb: 4 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#e3f2fd' }}>
                <TableCell><strong>Módulo</strong></TableCell>
                <TableCell><strong>Tarifa MXN/h</strong></TableCell>
                <TableCell><strong>Días</strong></TableCell>
                <TableCell><strong>Horas</strong></TableCell>
                <TableCell><strong>Total MXN</strong></TableCell>
                <TableCell><strong>Total USD</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {modulos.map((item: ProyectoModulo) => (
                <TableRow key={item.id}>
                  <TableCell>{item.modulo_nombre}</TableCell>
                  <TableCell>{formatCurrency(item.tarifa_mxn)}</TableCell>
                  <TableCell>{item.dias}</TableCell>
                  <TableCell>{item.horas}</TableCell>
                  <TableCell>{formatCurrency(item.total_mxn)}</TableCell>
                  <TableCell>{formatCurrency(tipoCambio > 0 ? Number(item.total_mxn) / tipoCambio : item.total_usd)}</TableCell>
                </TableRow>
              ))}

              {modulos.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    No hay módulos guardados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>

        <Typography variant="h6" gutterBottom color="primary.dark">
          Fases del proyecto
        </Typography>

        <Box sx={{ overflowX: 'auto', mb: 4 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#e8f5e9' }}>
                <TableCell><strong>Orden</strong></TableCell>
                <TableCell><strong>Fase</strong></TableCell>
                <TableCell><strong>Días</strong></TableCell>
                <TableCell><strong>%</strong></TableCell>
                <TableCell><strong>Plan inicio</strong></TableCell>
                <TableCell><strong>Estimado MXN</strong></TableCell>
                <TableCell><strong>Estimado USD</strong></TableCell>
                <TableCell><strong>Final MXN</strong></TableCell>
                <TableCell><strong>Final USD</strong></TableCell>
                <TableCell><strong>Fechas</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {fasesCalculadas.map((fase) => (
                <TableRow key={fase.id}>
                  <TableCell>{fase.orden_fase}</TableCell>
                  <TableCell>{fase.nombre_fase}</TableCell>
                  <TableCell>{fase.dias}</TableCell>
                  <TableCell>
                    {editando ? (
                      <TextField
                        type="number"
                        size="small"
                        value={fase.porcentaje_editable}
                        onChange={(e) => updatePorcentajeFase(fase.id, e.target.value)}
                        inputProps={{ min: 0, max: 100, step: 0.01 }}
                        sx={{ width: 90 }}
                      />
                    ) : (
                      `${fase.porcentaje}%`
                    )}
                  </TableCell>
                  <TableCell>{fase.plan_inicio ?? '-'}</TableCell>
                  <TableCell>{formatCurrency(fase.monto_estimado_mxn)}</TableCell>
                  <TableCell>{formatCurrency(fase.monto_estimado_usd)}</TableCell>
                  <TableCell>{hayDescuento ? formatCurrency(fase.monto_final_mxn) : 'N/A'}</TableCell>
                  <TableCell>{hayDescuento ? formatCurrency(fase.monto_final_usd) : 'N/A'}</TableCell>
                  <TableCell>{formatDateRanges(fase.fechas_asignadas)}</TableCell>
                </TableRow>
              ))}

              {fasesCalculadas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} align="center">
                    No hay fases guardadas.
                  </TableCell>
                </TableRow>
              )}

              {fasesCalculadas.length > 0 && (
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell colSpan={3}><strong>Total</strong></TableCell>
                  <TableCell>
                    <strong>{totalPorcentaje.toFixed(2)}%</strong>
                  </TableCell>
                  <TableCell />
                  <TableCell><strong>{formatCurrency(subtotalMXN)}</strong></TableCell>
                  <TableCell><strong>{formatCurrency(subtotalUSD)}</strong></TableCell>
                  <TableCell><strong>{hayDescuento ? formatCurrency(totalFinalMXN) : 'N/A'}</strong></TableCell>
                  <TableCell><strong>{hayDescuento ? formatCurrency(totalFinalUSD) : 'N/A'}</strong></TableCell>
                  <TableCell />
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>

        <Typography variant="h6" gutterBottom color="primary.dark">
          Recursos planeados
        </Typography>

        <Box sx={{ overflowX: 'auto' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#fff8e1' }}>
                <TableCell><strong>Recurso</strong></TableCell>
                <TableCell><strong>#</strong></TableCell>
                <TableCell><strong>Tarifa hora</strong></TableCell>
                <TableCell><strong>Días asignados</strong></TableCell>
                <TableCell><strong>Horas</strong></TableCell>
                <TableCell><strong>Total MXN</strong></TableCell>
                <TableCell><strong>Total USD</strong></TableCell>
                <TableCell><strong>Fechas</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {recursos.map((recurso: ProyectoRecurso) => (
                <TableRow key={recurso.id}>
                  <TableCell>{recurso.modulo_nombre}</TableCell>
                  <TableCell>{recurso.recurso_numero || 1}</TableCell>
                  <TableCell>{formatCurrency(recurso.tarifa_hora)}</TableCell>
                  <TableCell>{recurso.dias_asignados}</TableCell>
                  <TableCell>{recurso.horas}</TableCell>
                  <TableCell>{formatCurrency(recurso.total_mxn)}</TableCell>
                  <TableCell>{formatCurrency(tipoCambio > 0 ? Number(recurso.total_mxn) / tipoCambio : recurso.total_usd)}</TableCell>
                  <TableCell>{formatDateRanges(recurso.fechas_asignadas)}</TableCell>
                </TableRow>
              ))}

              {recursos.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    No hay recursos guardados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>

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
      </Paper>
    </Box>
  );
}