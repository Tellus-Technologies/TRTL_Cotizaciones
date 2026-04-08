import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, Paper, Table, TableBody, TableCell, TableHead,
  TableRow, TextField, Typography, Divider, Snackbar, Alert
} from '@mui/material';
import { Delete, Edit } from '@mui/icons-material';
import { useState, useEffect } from 'react';
import type { Cliente } from '../types';
import { getClientes, createCliente, updateCliente, deleteCliente } from '../api/clientesApi';

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [nombre, setNombre] = useState('');
  const [comen, setComen] = useState('');
  const [deleteClienteId, setDeleteClienteId] = useState<number | null>(null);

  const [snackbar, setSnackbar] = useState<{ open: boolean, message: string, severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  useEffect(() => {
    fetchClientes();
  }, []);

  const fetchClientes = async () => {
    const data = await getClientes();
    setClientes(data);
  };

  const handleOpen = (cliente: Cliente | null = null) => {
    setEditingCliente(cliente);
    setNombre(cliente ? cliente.nombre : '');
    setComen(cliente ? cliente.comen || '' : '');
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setNombre('');
    setComen('');
    setEditingCliente(null);
  };

  const handleSave = async () => {
    if (nombre.trim() === '') {
      setSnackbar({ open: true, message: 'El nombre no puede estar vacío', severity: 'error' });
      return;
    }

    try {
      if (editingCliente) {
        await updateCliente(editingCliente.id, nombre, comen);
        setSnackbar({ open: true, message: 'Cliente actualizado con éxito', severity: 'success' });
      } else {
        await createCliente(nombre, comen);
        setSnackbar({ open: true, message: 'Cliente creado con éxito', severity: 'success' });
      }
      await fetchClientes();
      handleClose();
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Error al guardar';
      setSnackbar({ open: true, message: msg, severity: 'error' });
    }
  };

  const handleConfirmDelete = (id: number) => {
    setDeleteClienteId(id);
    setConfirmOpen(true);
  };

  const handleDelete = async () => {
    try {
      await deleteCliente(deleteClienteId!);
      setSnackbar({ open: true, message: 'Cliente eliminado', severity: 'success' });
      await fetchClientes();
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Error al eliminar';
      setSnackbar({ open: true, message: msg, severity: 'error' });
    }
    setConfirmOpen(false);
    setDeleteClienteId(null);
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', mt: 4, px: 2 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 3, bgcolor: '#f0f4f8' }}>
        <Typography variant="h5" gutterBottom color="primary.main">
          Gestión de Clientes
        </Typography>
        <Divider sx={{ mb: 3 }} />

        <Button variant="contained" onClick={() => handleOpen()} sx={{ mb: 3 }}>
          Agregar Cliente
        </Button>

        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#e3f2fd' }}>
              <TableCell><strong>ID</strong></TableCell>
              <TableCell><strong>Nombre</strong></TableCell>
              <TableCell><strong>Comentario</strong></TableCell>
              <TableCell align="right"><strong>Acciones</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {clientes.map(cliente => (
              <TableRow key={cliente.id}>
                <TableCell>{cliente.id}</TableCell>
                <TableCell>{cliente.nombre}</TableCell>
                <TableCell>{cliente.comen}</TableCell>
                <TableCell align="right">
                  <IconButton onClick={() => handleOpen(cliente)}><Edit /></IconButton>
                  <IconButton onClick={() => handleConfirmDelete(cliente.id)} color="error"><Delete /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Dialog para agregar/editar */}
        <Dialog open={open} onClose={handleClose} fullWidth>
          <DialogTitle>{editingCliente ? 'Editar Cliente' : 'Agregar Cliente'}</DialogTitle>
          <DialogContent>
            <TextField
              label="Nombre del Cliente"
              fullWidth
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              margin="normal"
            />
            <TextField
              label="Comentario"
              fullWidth
              value={comen}
              onChange={(e) => setComen(e.target.value)}
              margin="normal"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancelar</Button>
            <Button onClick={handleSave} variant="contained">Guardar</Button>
          </DialogActions>
        </Dialog>

        {/* Confirmación para borrar */}
        <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
          <DialogTitle>Confirmar eliminación</DialogTitle>
          <DialogContent>
            ¿Estás seguro de eliminar este cliente? Esta acción no se puede deshacer.
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmOpen(false)}>Cancelar</Button>
            <Button onClick={handleDelete} color="error" variant="contained">Eliminar</Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar */}
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
