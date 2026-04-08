// Importamos useState para manejar estados internos
import { useState } from 'react';

// Importamos las páginas existentes
import ModulosPage from './pages/ModulosPage';
import ClientesPage from './pages/ClientesPage';
import TarifasPage from './pages/TarifasPage';
import CalculoPage from './pages/CalculoPage';

// Componentes de Material UI
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';
import Box from '@mui/material/Box';

// Íconos
import MenuIcon from '@mui/icons-material/Menu';
import PeopleIcon from '@mui/icons-material/People';
import ViewListIcon from '@mui/icons-material/ViewList';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import CalculateIcon from '@mui/icons-material/Calculate';

function App() {

  const [selected, setSelected] = useState('modulos');
  const [openMenu, setOpenMenu] = useState(false);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        bgcolor: "#f0f2f5"
      }}
    >

      {/* 🔵 BARRA SUPERIOR CON ICONO */}
      <Box
        sx={{
          height: "60px",
          width: "100%",
          bgcolor: "#1976d2",
          display: "flex",
          alignItems: "center",
          px: 2
        }}
      >
        <IconButton
          onClick={() => setOpenMenu(true)}
          sx={{ color: "white" }}
        >
          <MenuIcon />
        </IconButton>

        <Box
          sx={{
            color: "white",
            fontWeight: "bold",
            fontSize: 18,
            ml: 2
          }}
        >
          CALCULO DE TARIFAS
        </Box>
      </Box>

      {/* MENÚ LATERAL */}
      <Drawer
        anchor="left"
        open={openMenu}
        variant="temporary"
        onClose={() => setOpenMenu(false)}
        ModalProps={{
          BackdropProps: {
            sx: { backgroundColor: 'rgba(0,0,0,0.15)' }
          }
        }}
      >
        <Box
          sx={{
            width: 280,
            bgcolor: 'white',
            height: '100%'
          }}
          onMouseLeave={() => setOpenMenu(false)}
        >
          {/* Encabezado del Drawer */}
          <Box
            sx={{
              bgcolor: '#90caf9',
              color: 'white',
              p: 2,
              fontSize: 22,
              fontWeight: 'bold'
            }}
          >
            Menú
          </Box>

          <List>

            <ListItemButton
              onClick={() => {
                setSelected('clientes');
                setOpenMenu(false);
              }}
            >
              <ListItemIcon><PeopleIcon /></ListItemIcon>
              <ListItemText primary="Clientes" />
            </ListItemButton>

            <ListItemButton
              onClick={() => {
                setSelected('modulos');
                setOpenMenu(false);
              }}
            >
              <ListItemIcon><ViewListIcon /></ListItemIcon>
              <ListItemText primary="Módulos SAP" />
            </ListItemButton>

            <ListItemButton
              onClick={() => {
                setSelected('tarifas');
                setOpenMenu(false);
              }}
            >
              <ListItemIcon><AttachMoneyIcon /></ListItemIcon>
              <ListItemText primary="Asignar Tarifas" />
            </ListItemButton>

            <ListItemButton
              onClick={() => {
                setSelected('calculo');
                setOpenMenu(false);
              }}
            >
              <ListItemIcon><CalculateIcon /></ListItemIcon>
              <ListItemText primary="Calcular Precio" />
            </ListItemButton>

          </List>
        </Box>
      </Drawer>

      {/* CONTENIDO PRINCIPAL */}
      <Box sx={{ p: 6, flexGrow: 1 }}>

        {selected === 'modulos' && <ModulosPage />}
        {selected === 'clientes' && <ClientesPage />}
        {selected === 'tarifas' && <TarifasPage />}
        {selected === 'calculo' && <CalculoPage />}

      </Box>

      

    </Box>
  );
}

export default App;