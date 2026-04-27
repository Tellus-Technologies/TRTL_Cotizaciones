import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Divider,
  IconButton,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { Delete, Visibility } from '@mui/icons-material';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Cliente, ProyectoResumen } from '../types';
import { getClientes } from '../api/clientesApi';
import { getProyectos, deleteProyecto } from '../api/proyectosApi';

function formatCurrency(value: number) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return '-';

  const onlyDate = dateStr.slice(0, 10);
  const [year, month, day] = onlyDate.split('-');

  if (!year || !month || !day) return dateStr;

  return `${day}/${month}/${year}`;
}

export default function ProyectosPage() {
  const navigate = useNavigate();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [proyectos, setProyectos] = useState<ProyectoResumen[]>([]);

  const [filtroCliente, setFiltroCliente] = useState<string>('');
  const [filtroNumero, setFiltroNumero] = useState<string>('');
  const [filtroMetodologia, setFiltroMetodologia] = useState<string>('');

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteProyectoId, setDeleteProyectoId] = useState<number | null>(null);

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  useEffect(() => {
    cargarCatalogos();
    fetchProyectos();
  }, []);

  const cargarCatalogos = async () => {
    try {
      const data = await getClientes();
      setClientes(data);
    } catch {
      setSnackbar({
        open: true,
        message: 'Error al cargar clientes',
        severity: 'error',
      });
    }
  };

  const fetchProyectos = async () => {
    try {
      const params: Record<string, string | number> = {};

      if (filtroCliente !== '') params.cliente_id = Number(filtroCliente);
      if (filtroNumero.trim() !== '') params.numero_proyecto = filtroNumero.trim();
      if (filtroMetodologia.trim() !== '') params.metodologia = filtroMetodologia.trim();

      const data = await getProyectos(params);
      setProyectos(data);
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Error al consultar proyectos';
      setSnackbar({ open: true, message: msg, severity: 'error' });
    }
  };

  const limpiarFiltros = async () => {
    setFiltroCliente('');
    setFiltroNumero('');
    setFiltroMetodologia('');

    try {
      const data = await getProyectos();
      setProyectos(data);
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Error al recargar proyectos';
      setSnackbar({ open: true, message: msg, severity: 'error' });
    }
  };

  const handleConfirmDelete = (id: number) => {
    setDeleteProyectoId(id);
    setConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (deleteProyectoId === null) return;

    try {
      await deleteProyecto(deleteProyectoId);
      setSnackbar({
        open: true,
        message: 'Proyecto eliminado con éxito',
        severity: 'success',
      });
      await fetchProyectos();
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Error al eliminar proyecto';
      setSnackbar({ open: true, message: msg, severity: 'error' });
    }

    setConfirmOpen(false);
    setDeleteProyectoId(null);
  };

  return (
    <Box sx={{ maxWidth: 1300, mx: 'auto', mt: 4, px: 2 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 3, bgcolor: '#f0f4f8' }}>
        <Typography variant="h5" gutterBottom color="primary.main">
          Proyectos
        </Typography>

        <Divider sx={{ mb: 3 }} />

        <Typography variant="h6" gutterBottom color="primary.dark">
          Filtros
        </Typography>

        <Box display="flex" gap={2} mb={3} flexWrap="wrap">
          <FormControl sx={{ minWidth: 220 }}>
            <InputLabel>Cliente</InputLabel>
            <Select
              value={filtroCliente}
              onChange={(e) => setFiltroCliente(String(e.target.value))}
              label="Cliente"
            >
              <MenuItem value="">Todos</MenuItem>
              {clientes.map((cliente) => (
                <MenuItem key={cliente.id} value={String(cliente.id)}>
                  {cliente.nombre}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Número de proyecto"
            value={filtroNumero}
            onChange={(e) => setFiltroNumero(e.target.value)}
            sx={{ minWidth: 220 }}
          />

          <FormControl sx={{ minWidth: 220 }}>
            <InputLabel>Metodología</InputLabel>
            <Select
              value={filtroMetodologia}
              onChange={(e) => setFiltroMetodologia(String(e.target.value))}
              label="Metodología"
            >
              <MenuItem value="">Todas</MenuItem>
              <MenuItem value="ASAP">ASAP</MenuItem>
              <MenuItem value="ACTIVATE">ACTIVATE</MenuItem>
              <MenuItem value="ITIL">ITIL</MenuItem>
            </Select>
          </FormControl>

          <Button variant="contained" onClick={fetchProyectos}>
            Aplicar filtro
          </Button>

          <Button variant="outlined" color="secondary" onClick={limpiarFiltros}>
            Limpiar
          </Button>
        </Box>

        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#e3f2fd' }}>
              <TableCell><strong>Número</strong></TableCell>
              <TableCell><strong>Cliente</strong></TableCell>
              <TableCell><strong>Nombre del proyecto</strong></TableCell>
              <TableCell><strong>Metodología</strong></TableCell>
              <TableCell><strong>Fecha Inicio</strong></TableCell>
              <TableCell><strong>Fecha Fin</strong></TableCell>
              <TableCell><strong>Total MXN</strong></TableCell>
              <TableCell><strong>Total USD</strong></TableCell>
              <TableCell align="right"><strong>Acciones</strong></TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {proyectos.map((proyecto) => (
              <TableRow key={proyecto.id}>
                <TableCell>{proyecto.numero_proyecto}</TableCell>
                <TableCell>{proyecto.cliente_nombre}</TableCell>
                <TableCell>{proyecto.nombre_proyecto || 'Sin nombre'}</TableCell>
                <TableCell>{proyecto.metodologia || '-'}</TableCell>
                <TableCell>{formatDate(proyecto.fecha_inicio)}</TableCell>
                <TableCell>{formatDate(proyecto.fecha_fin)}</TableCell>
                <TableCell>{formatCurrency(proyecto.total_mxn)}</TableCell>
                <TableCell>{formatCurrency(proyecto.total_usd)}</TableCell>
                <TableCell align="right">
                  <IconButton onClick={() => navigate(`/proyectos/${proyecto.id}`)}>
                    <Visibility />
                  </IconButton>
                  <IconButton onClick={() => handleConfirmDelete(proyecto.id)} color="error">
                    <Delete />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}

            {proyectos.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  No se encontraron proyectos.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
          <DialogTitle>Confirmar eliminación</DialogTitle>
          <DialogContent>
            ¿Estás seguro de eliminar este proyecto? Esta acción eliminará también sus detalles.
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmOpen(false)}>Cancelar</Button>
            <Button onClick={handleDelete} color="error" variant="contained">
              Eliminar
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            severity={snackbar.severity}
            onClose={() => setSnackbar({ ...snackbar, open: false })}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Paper>
    </Box>
  );
}