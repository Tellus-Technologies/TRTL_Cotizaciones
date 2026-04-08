import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, Paper, Table, TableBody, TableCell, TableHead,
  TableRow, TextField, Typography, Divider, Snackbar, Alert
} from '@mui/material';
import { Delete, Edit } from '@mui/icons-material';
import { useState, useEffect } from 'react';
import type { Modulo } from '../types';
import { getModulos, createModulo, updateModulo, deleteModulo } from '../api/modulosApi';

export default function ModulosPage() {
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editingModulo, setEditingModulo] = useState<Modulo | null>(null);
  const [modu, setModu] = useState('');
  const [descrip, setDescrip] = useState('');
  const [deleteModuloId, setDeleteModuloId] = useState<number | null>(null);

  const [snackbar, setSnackbar] = useState<{ open: boolean, message: string, severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  useEffect(() => {
    cargarModulos();
  }, []);

  const cargarModulos = async () => {
    const data = await getModulos();
    setModulos(data);
  };

  const handleOpen = (modulo: Modulo | null = null) => {
    setEditingModulo(modulo);
    setModu(modulo ? modulo.modu : '');
    setDescrip(modulo ? modulo.descrip : '');
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingModulo(null);
    setModu('');
    setDescrip('');
  };

  const handleSave = async () => {
    if (modu.trim() === '') {
      setSnackbar({ open: true, message: 'El nombre del módulo no puede estar vacío', severity: 'error' });
      return;
    }

    try {
      if (editingModulo) {
        await updateModulo(editingModulo.id, modu, descrip);
        setSnackbar({ open: true, message: 'Módulo actualizado con éxito', severity: 'success' });
      } else {
        await createModulo(modu, descrip);
        setSnackbar({ open: true, message: 'Módulo creado con éxito', severity: 'success' });
      }
      await cargarModulos();
      handleClose();
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Error al guardar';
      setSnackbar({ open: true, message: msg, severity: 'error' });
    }
  };

  const handleConfirmDelete = (id: number) => {
    setDeleteModuloId(id);
    setConfirmOpen(true);
  };

  const handleDelete = async () => {
    try {
      await deleteModulo(deleteModuloId!);
      setSnackbar({ open: true, message: 'Módulo eliminado', severity: 'success' });
      await cargarModulos();
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Error al eliminar';
      setSnackbar({ open: true, message: msg, severity: 'error' });
    }
    setConfirmOpen(false);
    setDeleteModuloId(null);
  };

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', mt: 4, px: 2 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 3, bgcolor: '#f0f4f8' }}>
        <Typography variant="h5" gutterBottom color="primary.main">
          Módulos SAP
        </Typography>

        <Divider sx={{ mb: 3 }} />

        <Button variant="contained" onClick={() => handleOpen()} sx={{ mb: 3 }}>
          Agregar Módulo
        </Button>

        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#e3f2fd' }}>
              <TableCell><strong>ID</strong></TableCell>
              <TableCell><strong>Módulo</strong></TableCell>
              <TableCell><strong>Descripción</strong></TableCell>
              <TableCell align="right"><strong>Acciones</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {modulos.map((modulo) => (
              <TableRow key={modulo.id}>
                <TableCell>{modulo.id}</TableCell>
                <TableCell>{modulo.modu}</TableCell>
                <TableCell>{modulo.descrip}</TableCell>
                <TableCell align="right">
                  <IconButton onClick={() => handleOpen(modulo)}><Edit /></IconButton>
                  <IconButton onClick={() => handleConfirmDelete(modulo.id)} color="error"><Delete /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Dialog para agregar/editar */}
        <Dialog open={open} onClose={handleClose} fullWidth>
          <DialogTitle>{editingModulo ? 'Editar Módulo' : 'Agregar Módulo'}</DialogTitle>
          <DialogContent>
            <TextField
              label="Nombre del Módulo"
              fullWidth
              value={modu}
              onChange={(e) => setModu(e.target.value)}
              margin="normal"
            />
            <TextField
              label="Descripción"
              fullWidth
              value={descrip}
              onChange={(e) => setDescrip(e.target.value)}
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
            ¿Estás seguro de eliminar este módulo? Esta acción no se puede deshacer.
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
