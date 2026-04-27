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
} from '@mui/material';
import { Edit, Delete } from '@mui/icons-material';
import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import type { Cliente, Modulo, TarifaClienteModulo } from '../types';
import { getClientes } from '../api/clientesApi';
import { getModulos } from '../api/modulosApi';
import { getTarifas, updateTarifa, deleteTarifa } from '../api/tarifasApi';

export default function TarifasPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [tarifas, setTarifas] = useState<TarifaClienteModulo[]>([]);

  const [clienteId, setClienteId] = useState<string>('');
  const [moduloId, setModuloId] = useState<string>('');
  const [anio, setAnio] = useState<string>('2025');
  const [tarifa, setTarifa] = useState<string>('');

  const [editingTarifa, setEditingTarifa] = useState<TarifaClienteModulo | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarifaId, setDeleteTarifaId] = useState<number | null>(null);

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const [filtroCliente, setFiltroCliente] = useState<string>('');
  const [filtroModulo, setFiltroModulo] = useState<string>('');
  const [filtroAnio, setFiltroAnio] = useState<string>('');

  useEffect(() => {
    cargarCatalogos();
    fetchTarifas();
  }, []);

  const cargarCatalogos = async () => {
    try {
      const [clientesData, modulosData] = await Promise.all([
        getClientes(),
        getModulos(),
      ]);

      setClientes(clientesData);
      setModulos(modulosData);
    } catch {
      setSnackbar({
        open: true,
        message: 'Error al cargar catálogos',
        severity: 'error',
      });
    }
  };

  const fetchTarifas = async () => {
    try {
      const params: Record<string, string | number> = {};

      if (filtroCliente !== '') params.cliente_id = Number(filtroCliente);
      if (filtroModulo !== '') params.modulo_id = Number(filtroModulo);
      if (filtroAnio.trim() !== '') params.anio_fiscal = filtroAnio.trim();

      const data = await getTarifas(params);
      setTarifas(data);
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Error al consultar tarifas';
      setSnackbar({ open: true, message: msg, severity: 'error' });
    }
  };

  const limpiarFormularioEdicion = () => {
    setClienteId('');
    setModuloId('');
    setAnio('2025');
    setTarifa('');
    setEditingTarifa(null);
  };

  const handleOpenEdit = (item: TarifaClienteModulo) => {
    setEditingTarifa(item);
    setClienteId(String(item.cliente_id));
    setModuloId(String(item.modulo_id));
    setAnio(String(item.anio_fiscal));
    setTarifa(String(item.tarifa_mxn));
    setEditDialogOpen(true);
  };

  const handleCloseEdit = () => {
    setEditDialogOpen(false);
    limpiarFormularioEdicion();
  };

  const handleSaveEdit = async () => {
    if (!editingTarifa || clienteId === '' || moduloId === '' || anio.trim() === '' || tarifa.trim() === '') {
      setSnackbar({
        open: true,
        message: 'Completa todos los campos para actualizar',
        severity: 'error',
      });
      return;
    }

    try {
      await updateTarifa(
        editingTarifa.id,
        Number(clienteId),
        Number(moduloId),
        anio.trim(),
        Number(tarifa)
      );

      setSnackbar({
        open: true,
        message: 'Tarifa actualizada',
        severity: 'success',
      });

      await fetchTarifas();
      handleCloseEdit();
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
    if (deleteTarifaId === null) return;

    try {
      await deleteTarifa(deleteTarifaId);
      setSnackbar({
        open: true,
        message: 'Tarifa eliminada',
        severity: 'success',
      });
      await fetchTarifas();
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Error al eliminar tarifa';
      setSnackbar({ open: true, message: msg, severity: 'error' });
    }

    setConfirmOpen(false);
    setDeleteTarifaId(null);
  };

  const handleLimpiarFiltros = async () => {
    setFiltroCliente('');
    setFiltroModulo('');
    setFiltroAnio('');

    try {
      const data = await getTarifas();
      setTarifas(data);
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Error al recargar tarifas';
      setSnackbar({ open: true, message: msg, severity: 'error' });
    }
  };

  const exportToExcel = () => {
    const data = tarifas.map((t) => ({
      Cliente: t.cliente_nombre,
      Módulo: t.modulo_nombre,
      'Año Fiscal': t.anio_fiscal,
      'Tarifa (MXN/h)': t.tarifa_mxn,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Tarifas Filtradas');

    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array',
    });

    const file = new Blob([excelBuffer], {
      type: 'application/octet-stream',
    });

    saveAs(file, 'Tarifas_Filtradas.xlsx');
  };

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', mt: 4, px: 2 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 3, bgcolor: '#f0f4f8' }}>
        <Typography variant="h5" gutterBottom color="primary.main">
          Tarifas 
        </Typography>

        <Divider sx={{ mb: 3 }} />

        <Typography variant="h6" gutterBottom color="primary.dark">
          Filtrar Tarifas
        </Typography>

        <Box display="flex" gap={2} mb={3} flexWrap="wrap">
          <FormControl sx={{ minWidth: 180 }}>
            <InputLabel>Cliente</InputLabel>
            <Select
              value={filtroCliente}
              onChange={(e) => setFiltroCliente(String(e.target.value))}
              label="Cliente"
            >
              <MenuItem value="">Todos</MenuItem>
              {clientes.map((c) => (
                <MenuItem key={c.id} value={String(c.id)}>
                  {c.nombre}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 180 }}>
            <InputLabel>Módulo</InputLabel>
            <Select
              value={filtroModulo}
              onChange={(e) => setFiltroModulo(String(e.target.value))}
              label="Módulo"
            >
              <MenuItem value="">Todos</MenuItem>
              {modulos.map((m) => (
                <MenuItem key={m.id} value={String(m.id)}>
                  {m.modu}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Año Fiscal"
            value={filtroAnio}
            onChange={(e) => setFiltroAnio(e.target.value)}
            sx={{ minWidth: 160 }}
          />

          <Button variant="contained" onClick={fetchTarifas}>
            Aplicar Filtro
          </Button>

          <Button variant="outlined" color="secondary" onClick={handleLimpiarFiltros}>
            Limpiar
          </Button>

          <Button variant="outlined" color="success" onClick={exportToExcel}>
            Exportar a Excel
          </Button>
        </Box>

        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#e3f2fd' }}>
              <TableCell><strong>Cliente</strong></TableCell>
              <TableCell><strong>Módulo</strong></TableCell>
              <TableCell><strong>Año</strong></TableCell>
              <TableCell><strong>Tarifa (MXN/hora)</strong></TableCell>
              <TableCell align="right"><strong>Acciones</strong></TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {tarifas.map((t) => (
              <TableRow key={t.id}>
                <TableCell>{t.cliente_nombre}</TableCell>
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
                <TableCell colSpan={5} align="center">
                  No se encontraron tarifas con los filtros seleccionados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <Dialog open={editDialogOpen} onClose={handleCloseEdit} fullWidth>
          <DialogTitle>Editar Tarifa</DialogTitle>
          <DialogContent>
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Cliente</InputLabel>
              <Select
                value={clienteId}
                onChange={(e) => setClienteId(String(e.target.value))}
                label="Cliente"
              >
                {clientes.map((c) => (
                  <MenuItem key={c.id} value={String(c.id)}>
                    {c.nombre}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Módulo</InputLabel>
              <Select
                value={moduloId}
                onChange={(e) => setModuloId(String(e.target.value))}
                label="Módulo"
              >
                {modulos.map((m) => (
                  <MenuItem key={m.id} value={String(m.id)}>
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
              sx={{ mt: 2 }}
            />

            <TextField
              label="Tarifa (MXN/hora)"
              type="number"
              value={tarifa}
              onChange={(e) => setTarifa(e.target.value)}
              fullWidth
              sx={{ mt: 2 }}
            />
          </DialogContent>

          <DialogActions>
            <Button onClick={handleCloseEdit}>Cancelar</Button>
            <Button onClick={handleSaveEdit} variant="contained">
              Guardar Cambios
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
          <DialogTitle>Confirmar eliminación</DialogTitle>
          <DialogContent>
            ¿Estás seguro de eliminar esta tarifa?
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