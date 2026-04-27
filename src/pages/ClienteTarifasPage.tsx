import {
  Box,
  Button,
  MenuItem,
  Select,
  TextField,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  FormControl,
  InputLabel,
  Paper,
  Divider,
  IconButton,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack
} from '@mui/material';
import { Edit, Delete, ArrowBack } from '@mui/icons-material';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Cliente, Modulo, TarifaClienteModulo } from '../types';
import { getClientes } from '../api/clientesApi';
import { getModulos } from '../api/modulosApi';
import { getTarifas, createTarifa, updateTarifa, deleteTarifa } from '../api/tarifasApi';

export default function ClienteTarifasPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const clienteId = Number(id);

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [tarifas, setTarifas] = useState<TarifaClienteModulo[]>([]);

  const [moduloId, setModuloId] = useState<number | ''>('');
  const [anio, setAnio] = useState('2025');
  const [tarifa, setTarifa] = useState<number | ''>('');

  const [editingTarifa, setEditingTarifa] = useState<TarifaClienteModulo | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const [editModuloId, setEditModuloId] = useState<number | ''>('');
  const [editAnio, setEditAnio] = useState('');
  const [editTarifa, setEditTarifa] = useState<number | ''>('');

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarifaId, setDeleteTarifaId] = useState<number | null>(null);

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  useEffect(() => {
    cargarDataInicial();
  }, []);

  useEffect(() => {
    if (clienteId) {
      fetchTarifasCliente();
    }
  }, [clienteId]);

  const cargarDataInicial = async () => {
    const [clientesData, modulosData] = await Promise.all([
      getClientes(),
      getModulos()
    ]);
    setClientes(clientesData);
    setModulos(modulosData);
  };

  const fetchTarifasCliente = async () => {
    try {
      const data = await getTarifas({ cliente_id: clienteId });
      setTarifas(data);
    } catch {
      setSnackbar({ open: true, message: 'Error al cargar tarifas del cliente', severity: 'error' });
    }
  };

  const clienteSeleccionado = useMemo(
    () => clientes.find((c) => c.id === clienteId),
    [clientes, clienteId]
  );

  const limpiarFormulario = () => {
    setModuloId('');
    setAnio('2025');
    setTarifa('');
  };

  const handleAsignar = async () => {
    if (!clienteId || !moduloId || !anio || tarifa === '') {
      setSnackbar({ open: true, message: 'Completa todos los campos', severity: 'error' });
      return;
    }

    try {
      await createTarifa(clienteId, moduloId as number, anio, Number(tarifa));
      setSnackbar({ open: true, message: 'Tarifa asignada con éxito', severity: 'success' });
      limpiarFormulario();
      await fetchTarifasCliente();
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Error al asignar tarifa';
      setSnackbar({ open: true, message: msg, severity: 'error' });
    }
  };

  const handleOpenEdit = (item: TarifaClienteModulo) => {
    setEditingTarifa(item);
    setEditModuloId(item.modulo_id);
    setEditAnio(item.anio_fiscal);
    setEditTarifa(item.tarifa_mxn);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingTarifa || !editModuloId || !editAnio || editTarifa === '') {
      setSnackbar({ open: true, message: 'Completa todos los campos para actualizar', severity: 'error' });
      return;
    }

    try {
      await updateTarifa(
        editingTarifa.id,
        clienteId,
        editModuloId as number,
        editAnio,
        Number(editTarifa)
      );
      setSnackbar({ open: true, message: 'Tarifa actualizada', severity: 'success' });
      setEditDialogOpen(false);
      setEditingTarifa(null);
      await fetchTarifasCliente();
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Error al actualizar tarifa';
      setSnackbar({ open: true, message: msg, severity: 'error' });
    }
  };

  const handleConfirmDelete = (id: number) => {
    setDeleteTarifaId(id);
    setConfirmOpen(true);
  };

  const handleDelete = async () => {
    try {
      await deleteTarifa(deleteTarifaId!);
      setSnackbar({ open: true, message: 'Tarifa eliminada', severity: 'success' });
      await fetchTarifasCliente();
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Error al eliminar tarifa';
      setSnackbar({ open: true, message: msg, severity: 'error' });
    }
    setConfirmOpen(false);
    setDeleteTarifaId(null);
  };

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', mt: 4, px: 2 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 3, bgcolor: '#f0f4f8' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={2}>
          <Box>
            <Typography variant="h5" color="primary.main">
              Tarifas del Cliente
            </Typography>
            <Typography variant="h6" sx={{ mt: 1, fontWeight: 700 }}>
              {clienteSeleccionado?.nombre || 'Cliente'}
            </Typography>
            {clienteSeleccionado?.comen && (
              <Typography variant="body2" color="text.secondary">
                {clienteSeleccionado.comen}
              </Typography>
            )}
          </Box>

          <Button
            variant="outlined"
            startIcon={<ArrowBack />}
            onClick={() => navigate('/clientes')}
          >
            Volver a clientes
          </Button>
        </Stack>

        <Divider sx={{ mb: 3 }} />

        <Typography variant="h6" gutterBottom color="primary.dark">
          Asignar nueva tarifa
        </Typography>

        <Box display="flex" gap={2} mb={4} flexWrap="wrap">
          <FormControl fullWidth>
            <InputLabel>Módulo</InputLabel>
            <Select
              value={moduloId}
              onChange={(e) => setModuloId(Number(e.target.value))}
              label="Módulo"
            >
              {modulos.map((m) => (
                <MenuItem key={m.id} value={m.id}>
                  {m.modu}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Año Fiscal"
            value={anio}
            onChange={(e) => setAnio(e.target.value)}
            fullWidth
          />

          <TextField
            label="Tarifa (MXN/hora)"
            type="number"
            value={tarifa}
            onChange={(e) => setTarifa(e.target.value === '' ? '' : Number(e.target.value))}
            fullWidth
          />

          <Button
            variant="contained"
            onClick={handleAsignar}
            sx={{ minWidth: 180 }}
          >
            Guardar tarifa
          </Button>
        </Box>

        <Divider sx={{ mb: 3 }} />

        <Typography variant="h6" gutterBottom color="primary.dark">
          Tarifas registradas
        </Typography>

        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#e3f2fd' }}>
              <TableCell><strong>Módulo</strong></TableCell>
              <TableCell><strong>Año</strong></TableCell>
              <TableCell><strong>Tarifa (MXN/hora)</strong></TableCell>
              <TableCell align="right"><strong>Acciones</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tarifas.map((t) => (
              <TableRow key={t.id}>
                <TableCell>{t.modulo_nombre}</TableCell>
                <TableCell>{t.anio_fiscal}</TableCell>
                <TableCell>${t.tarifa_mxn}</TableCell>
                <TableCell align="right">
                  <IconButton onClick={() => handleOpenEdit(t)}>
                    <Edit />
                  </IconButton>
                  <IconButton onClick={() => handleConfirmDelete(t.id)} color="error">
                    <Delete />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}

            {tarifas.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  No hay tarifas registradas para este cliente.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} fullWidth>
          <DialogTitle>Editar tarifa</DialogTitle>
          <DialogContent>
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Módulo</InputLabel>
              <Select
                value={editModuloId}
                onChange={(e) => setEditModuloId(Number(e.target.value))}
                label="Módulo"
              >
                {modulos.map((m) => (
                  <MenuItem key={m.id} value={m.id}>
                    {m.modu}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Año Fiscal"
              fullWidth
              sx={{ mt: 2 }}
              value={editAnio}
              onChange={(e) => setEditAnio(e.target.value)}
            />

            <TextField
              label="Tarifa (MXN/hora)"
              type="number"
              fullWidth
              sx={{ mt: 2 }}
              value={editTarifa}
              onChange={(e) => setEditTarifa(e.target.value === '' ? '' : Number(e.target.value))}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
            <Button variant="contained" onClick={handleSaveEdit}>
              Guardar cambios
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
          <DialogTitle>Confirmar eliminación</DialogTitle>
          <DialogContent>¿Estás seguro de eliminar esta tarifa?</DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmOpen(false)}>Cancelar</Button>
            <Button variant="contained" color="error" onClick={handleDelete}>
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