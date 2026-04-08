import {
  Box, Button, MenuItem, Select, TextField, Typography, Table, TableHead,
  TableBody, TableRow, TableCell, FormControl, InputLabel, Paper, Divider,
  IconButton, Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { Edit, Delete } from '@mui/icons-material';
import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import type { Cliente, Modulo, TarifaClienteModulo } from '../types';
import { getClientes } from '../api/clientesApi';
import { getModulos } from '../api/modulosApi';
import { getTarifas, createTarifa, updateTarifa, deleteTarifa } from '../api/tarifasApi';

export default function TarifasPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [tarifas, setTarifas] = useState<TarifaClienteModulo[]>([]);

  // Formulario
  const [clienteId, setClienteId] = useState<number | ''>('');
  const [moduloId, setModuloId] = useState<number | ''>('');
  const [anio, setAnio] = useState('2025');
  const [tarifa, setTarifa] = useState<number | ''>('');

  // Edición
  const [editingTarifa, setEditingTarifa] = useState<TarifaClienteModulo | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Eliminación
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarifaId, setDeleteTarifaId] = useState<number | null>(null);

  // Snackbar
  const [snackbar, setSnackbar] = useState<{ open: boolean, message: string, severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success'
  });

  // Filtros
  const [filtroCliente, setFiltroCliente] = useState<number | ''>('');
  const [filtroModulo, setFiltroModulo] = useState<number | ''>('');
  const [filtroAnio, setFiltroAnio] = useState('');

  useEffect(() => {
    getClientes().then(setClientes);
    getModulos().then(setModulos);
    fetchTarifas(); // carga inicial
  }, []);

  const fetchTarifas = async () => {
    const params: any = {};
    if (filtroCliente) params.cliente_id = filtroCliente;
    if (filtroModulo) params.modulo_id = filtroModulo;
    if (filtroAnio) params.anio_fiscal = filtroAnio;

    const filteredTarifas = await getTarifas(params);
    setTarifas(filteredTarifas);
  };

  const limpiarFormulario = () => {
    setClienteId('');
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
      await createTarifa(clienteId, moduloId, anio, Number(tarifa));
      setSnackbar({ open: true, message: 'Tarifa asignada con éxito', severity: 'success' });
      await fetchTarifas();
      limpiarFormulario();
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Error al asignar tarifa';
      setSnackbar({ open: true, message: msg, severity: 'error' });
    }
  };

  const handleOpenEdit = (tarifa: TarifaClienteModulo) => {
    setEditingTarifa(tarifa);
    setClienteId(tarifa.cliente_id);
    setModuloId(tarifa.modulo_id);
    setAnio(tarifa.anio_fiscal);
    setTarifa(tarifa.tarifa_mxn);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!clienteId || !moduloId || !anio || tarifa === '') {
      setSnackbar({ open: true, message: 'Completa todos los campos para actualizar', severity: 'error' });
      return;
    }

    try {
      await updateTarifa(editingTarifa!.id, clienteId as number, moduloId as number, anio, Number(tarifa));
      setSnackbar({ open: true, message: 'Tarifa actualizada', severity: 'success' });
      await fetchTarifas();
      setEditDialogOpen(false);
      limpiarFormulario();
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
      await fetchTarifas();
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Error al eliminar tarifa';
      setSnackbar({ open: true, message: msg, severity: 'error' });
    }
    setConfirmOpen(false);
    setDeleteTarifaId(null);
  };

  const exportToExcel = () => {
    const data = tarifas.map((t) => ({
      Cliente: t.cliente_nombre,
      Módulo: t.modulo_nombre,
      'Año Fiscal': t.anio_fiscal,
      'Tarifa (MXN/h)': t.tarifa_mxn
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Tarifas Filtradas');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const file = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(file, `Tarifas_Filtradas.xlsx`);
  };

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', mt: 4, px: 2 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 3, bgcolor: '#f0f4f8' }}>
        <Typography variant="h5" gutterBottom color="primary.main">
          Asignar Tarifas por Cliente y Módulo
        </Typography>
        <Divider sx={{ mb: 3 }} />

        <Box display="flex" gap={2} mb={3} flexWrap="wrap">
          <FormControl fullWidth>
            <InputLabel>Cliente</InputLabel>
            <Select value={clienteId} onChange={(e) => setClienteId(Number(e.target.value))} label="Cliente">
              {clientes.map((c) => <MenuItem key={c.id} value={c.id}>{c.nombre}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>Módulo</InputLabel>
            <Select value={moduloId} onChange={(e) => setModuloId(Number(e.target.value))} label="Módulo">
              {modulos.map((m) => <MenuItem key={m.id} value={m.id}>{m.modu}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField label="Año Fiscal" value={anio} onChange={(e) => setAnio(e.target.value)} fullWidth />
          <TextField label="Tarifa (MXN/hora)" type="number" value={tarifa} onChange={(e) => setTarifa(Number(e.target.value))} fullWidth />
          <Button variant="contained" color="primary" onClick={handleAsignar} sx={{ minWidth: 150 }}>
            Asignar
          </Button>
        </Box>

        <Divider sx={{ mb: 3 }} />

        <Typography variant="h6" gutterBottom color="primary.dark">
          Filtrar Tarifas
        </Typography>
        <Box display="flex" gap={2} mb={3} flexWrap="wrap">
          <FormControl sx={{ minWidth: 180 }}>
            <InputLabel>Cliente</InputLabel>
            <Select value={filtroCliente} onChange={(e) => setFiltroCliente(Number(e.target.value))} label="Cliente">
              <MenuItem value="">Todos</MenuItem>
              {clientes.map((c) => <MenuItem key={c.id} value={c.id}>{c.nombre}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 180 }}>
            <InputLabel>Módulo</InputLabel>
            <Select value={filtroModulo} onChange={(e) => setFiltroModulo(Number(e.target.value))} label="Módulo">
              <MenuItem value="">Todos</MenuItem>
              {modulos.map((m) => <MenuItem key={m.id} value={m.id}>{m.modu}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField
            label="Año Fiscal"
            value={filtroAnio}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFiltroAnio(e.target.value)}
            sx={{ minWidth: 160 }}
          />
          <Button variant="contained" onClick={fetchTarifas}>Aplicar Filtro</Button>
          <Button variant="outlined" color="success" onClick={exportToExcel}>Exportar a Excel</Button>
        </Box>

        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#e3f2fd' }}>
              <TableCell>Cliente</TableCell>
              <TableCell>Módulo</TableCell>
              <TableCell>Año</TableCell>
              <TableCell>Tarifa (MXN/hora)</TableCell>
              <TableCell align="right">Acciones</TableCell>
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
                  <IconButton onClick={() => handleOpenEdit(t)}><Edit /></IconButton>
                  <IconButton onClick={() => handleConfirmDelete(t.id)} color="error"><Delete /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Dialogs y Snackbar */}
        <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} fullWidth>
          <DialogTitle>Editar Tarifa</DialogTitle>
          <DialogContent>
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Cliente</InputLabel>
              <Select value={clienteId} onChange={(e) => setClienteId(Number(e.target.value))} label="Cliente">
                {clientes.map((c) => <MenuItem key={c.id} value={c.id}>{c.nombre}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Módulo</InputLabel>
              <Select value={moduloId} onChange={(e) => setModuloId(Number(e.target.value))} label="Módulo">
                {modulos.map((m) => <MenuItem key={m.id} value={m.id}>{m.modu}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="Año Fiscal" value={anio} onChange={(e) => setAnio(e.target.value)} fullWidth sx={{ mt: 2 }} />
            <TextField label="Tarifa (MXN/hora)" type="number" value={tarifa} onChange={(e) => setTarifa(Number(e.target.value))} fullWidth sx={{ mt: 2 }} />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveEdit} variant="contained">Guardar Cambios</Button>
          </DialogActions>
        </Dialog>

        <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
          <DialogTitle>Confirmar eliminación</DialogTitle>
          <DialogContent>¿Estás seguro de eliminar esta tarifa?</DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmOpen(false)}>Cancelar</Button>
            <Button onClick={handleDelete} color="error" variant="contained">Eliminar</Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Paper>
    </Box>
  );
}
