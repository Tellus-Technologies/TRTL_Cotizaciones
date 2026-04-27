import {
  Box,
  Button,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  Divider,
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type {
  ProyectoDetalleResponse,
  ProyectoModulo,
  ProyectoFase,
  ProyectoRecurso,
} from '../types';
import { getProyectoDetalle } from '../api/proyectosApi';

function formatCurrency(value: number) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function toLocalDateString(dateStr: string) {
  if (!dateStr) return '-';

  const onlyDate = dateStr.slice(0, 10);
  const [year, month, day] = onlyDate.split('-');

  if (!year || !month || !day) return dateStr;

  return `${day}/${month}/${year}`;
}

function normalizeDate(dateStr: string) {
  return dateStr.slice(0, 10);
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

export default function ProyectoDetallePage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [detalle, setDetalle] = useState<ProyectoDetalleResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarDetalle();
  }, [id]);

  const cargarDetalle = async () => {
    try {
      setLoading(true);
      const data = await getProyectoDetalle(id!);
      setDetalle(data);
    } catch (err) {
      console.error(err);
      setDetalle(null);
    } finally {
      setLoading(false);
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

  const { proyecto, modulos, fases, recursos } = detalle;

  return (
    <Box sx={{ maxWidth: 1300, mx: 'auto', mt: 4, px: 2, mb: 5 }}>
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

          <Button startIcon={<ArrowBack />} variant="outlined" onClick={() => navigate('/proyectos')}>
            Volver a proyectos
          </Button>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box display="flex" flexWrap="wrap" gap={2} mb={3}>
          <Chip label={`Cliente: ${proyecto.cliente_nombre}`} color="primary" />
          <Chip label={`Metodología: ${proyecto.metodologia || '-'}`} />
          <Chip label={`Tipo de cambio: ${proyecto.tipo_cambio}`} />
          <Chip label={`Años fiscales: ${proyecto.anios_fiscales || '-'}`} />
        </Box>

        <Box mb={3}>
          <Typography><strong>Nombre del proyecto:</strong> {proyecto.nombre_proyecto || 'Sin nombre'}</Typography>
          <Typography><strong>Fecha inicio:</strong> {proyecto.fecha_inicio ? toLocalDateString(proyecto.fecha_inicio) : '-'}</Typography>
          <Typography><strong>Fecha fin:</strong> {proyecto.fecha_fin ? toLocalDateString(proyecto.fecha_fin) : '-'}</Typography>
          <Typography><strong>Comentario cliente:</strong> {proyecto.cliente_comentario || '-'}</Typography>
        </Box>

        <Box display="flex" flexWrap="wrap" gap={3} mb={4}>
          <Typography><strong>Total días:</strong> {proyecto.total_dias}</Typography>
          <Typography><strong>Total horas:</strong> {proyecto.total_horas}</Typography>
          <Typography><strong>Total MXN:</strong> {formatCurrency(proyecto.total_mxn)}</Typography>
          <Typography><strong>Total USD:</strong> {formatCurrency(proyecto.total_usd)}</Typography>
        </Box>

        <Divider sx={{ mb: 3 }} />

        <Typography variant="h6" gutterBottom color="primary.dark">
          Módulos del proyecto
        </Typography>

        <Table sx={{ mb: 4 }}>
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
                <TableCell>{formatCurrency(item.total_usd)}</TableCell>
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

        <Typography variant="h6" gutterBottom color="primary.dark">
          Fases del proyecto
        </Typography>

        <Table sx={{ mb: 4 }}>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#e8f5e9' }}>
              <TableCell><strong>Orden</strong></TableCell>
              <TableCell><strong>Fase</strong></TableCell>
              <TableCell><strong>Días</strong></TableCell>
              <TableCell><strong>%</strong></TableCell>
              <TableCell><strong>Plan inicio</strong></TableCell>
              <TableCell><strong>Monto MXN</strong></TableCell>
              <TableCell><strong>Monto USD</strong></TableCell>
              <TableCell><strong>Fechas</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {fases.map((fase: ProyectoFase) => (
              <TableRow key={fase.id}>
                <TableCell>{fase.orden_fase}</TableCell>
                <TableCell>{fase.nombre_fase}</TableCell>
                <TableCell>{fase.dias}</TableCell>
                <TableCell>{fase.porcentaje}%</TableCell>
                <TableCell>{fase.plan_inicio ?? '-'}</TableCell>
                <TableCell>{formatCurrency(fase.monto_mxn)}</TableCell>
                <TableCell>{formatCurrency(fase.monto_usd)}</TableCell>
                <TableCell>{formatDateRanges(fase.fechas_asignadas)}</TableCell>
              </TableRow>
            ))}

            {fases.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  No hay fases guardadas.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <Typography variant="h6" gutterBottom color="primary.dark">
          Recursos planeados
        </Typography>

        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#fff8e1' }}>
              <TableCell><strong>Recurso</strong></TableCell>
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
                <TableCell>{formatCurrency(recurso.tarifa_hora)}</TableCell>
                <TableCell>{recurso.dias_asignados}</TableCell>
                <TableCell>{recurso.horas}</TableCell>
                <TableCell>{formatCurrency(recurso.total_mxn)}</TableCell>
                <TableCell>{formatCurrency(recurso.total_usd)}</TableCell>
                <TableCell>{formatDateRanges(recurso.fechas_asignadas)}</TableCell>
              </TableRow>
            ))}

            {recursos.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No hay recursos guardados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}