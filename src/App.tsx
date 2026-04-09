import { useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";

import ModulosPage from "./pages/ModulosPage";
import ClientesPage from "./pages/ClientesPage";
import TarifasPage from "./pages/TarifasPage";
import CalculoPage from "./pages/CalculoPage";
import LoginPage from "./pages/LoginPage";

import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import ListItemIcon from "@mui/material/ListItemIcon";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Avatar from "@mui/material/Avatar";
import Divider from "@mui/material/Divider";
import Chip from "@mui/material/Chip";

import MenuIcon from "@mui/icons-material/Menu";
import PeopleIcon from "@mui/icons-material/People";
import ViewListIcon from "@mui/icons-material/ViewList";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import CalculateIcon from "@mui/icons-material/Calculate";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import BusinessCenterRoundedIcon from "@mui/icons-material/BusinessCenterRounded";

import ProtectedRoute from "./auth/ProtectedRoute";
import RoleRoute from "./auth/RoleRoute";
import { useAuth } from "./auth/AuthProvider";

function getInitials(name?: string) {
  if (!name) return "U";

  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function Layout({ children }: { children: React.ReactNode }) {
  const [openMenu, setOpenMenu] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const menuItems = [
    {
      key: "clientes",
      label: "Clientes",
      icon: <PeopleIcon />,
      path: "/clientes",
      roles: ["admin"],
    },
    {
      key: "modulos",
      label: "Módulos SAP",
      icon: <ViewListIcon />,
      path: "/modulos",
      roles: ["admin"],
    },
    {
      key: "tarifas",
      label: "Asignar Tarifas",
      icon: <AttachMoneyIcon />,
      path: "/tarifas",
      roles: ["admin"],
    },
    {
      key: "calculo",
      label: "Calcular Precio",
      icon: <CalculateIcon />,
      path: "/calculo",
      roles: ["admin", "user"],
    },
  ];

  const visibleItems = menuItems.filter((item) =>
    item.roles.includes(user?.appRole || "user")
  );

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        bgcolor: "#f5f7fb",
      }}
    >
      <Box
        sx={{
          height: 72,
          width: "100%",
          background: "linear-gradient(90deg, #1565c0 0%, #1e88e5 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: { xs: 1.5, md: 3 },
          boxShadow: "0 8px 20px rgba(21, 101, 192, 0.20)",
          position: "sticky",
          top: 0,
          zIndex: 1200,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", minWidth: 0 }}>
          <IconButton
            onClick={() => setOpenMenu(true)}
            sx={{
              color: "white",
              mr: 1.5,
              borderRadius: 3,
              bgcolor: "rgba(255,255,255,0.10)",
              "&:hover": {
                bgcolor: "rgba(255,255,255,0.18)",
              },
            }}
          >
            <MenuIcon />
          </IconButton>

          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{
                color: "white",
                fontWeight: 800,
                fontSize: { xs: 17, md: 21 },
                lineHeight: 1.1,
                letterSpacing: 0.4,
              }}
            >
              CÁLCULO DE TARIFAS
            </Typography>

            <Typography
              sx={{
                color: "rgba(255,255,255,0.82)",
                fontSize: { xs: 11, md: 12.5 },
                mt: 0.4,
              }}
            >
              Sistema interno corporativo
            </Typography>
          </Box>
        </Box>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            minWidth: 0,
          }}
        >
          <Box
            sx={{
              display: { xs: "none", md: "flex" },
              alignItems: "center",
              gap: 1.2,
              px: 1.4,
              py: 0.9,
              borderRadius: 999,
              bgcolor: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.14)",
              maxWidth: 420,
            }}
          >
            <Avatar
              sx={{
                width: 38,
                height: 38,
                bgcolor: "white",
                color: "#1565c0",
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              {getInitials(user?.name)}
            </Avatar>

            <Box sx={{ minWidth: 0 }}>
              <Typography
                sx={{
                  color: "white",
                  fontWeight: 600,
                  fontSize: 13.5,
                  lineHeight: 1.2,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: 220,
                }}
              >
                {user?.name || "Usuario"}
              </Typography>

              <Typography
                sx={{
                  color: "rgba(255,255,255,0.80)",
                  fontSize: 12,
                  lineHeight: 1.2,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: 220,
                }}
              >
                {user?.email || ""}
              </Typography>
            </Box>

            <Chip
              label={user?.appRole === "admin" ? "Admin" : "Usuario"}
              size="small"
              sx={{
                bgcolor: "rgba(255,255,255,0.18)",
                color: "white",
                fontWeight: 700,
                borderRadius: 999,
              }}
            />
          </Box>

          <Button
            onClick={logout}
            startIcon={<LogoutRoundedIcon />}
            sx={{
              color: "#0f172a",
              bgcolor: "white",
              borderRadius: 999,
              px: 2.2,
              py: 1,
              minWidth: "auto",
              fontWeight: 700,
              textTransform: "none",
              boxShadow: "0 6px 16px rgba(0,0,0,0.14)",
              "&:hover": {
                bgcolor: "#f8fafc",
                transform: "translateY(-1px)",
                boxShadow: "0 10px 18px rgba(0,0,0,0.18)",
              },
              transition: "all 0.18s ease",
            }}
          >
            Salir
          </Button>
        </Box>
      </Box>

      <Drawer
        anchor="left"
        open={openMenu}
        variant="temporary"
        onClose={() => setOpenMenu(false)}
        ModalProps={{
          BackdropProps: {
            sx: { backgroundColor: "rgba(15, 23, 42, 0.28)" },
          },
        }}
        PaperProps={{
          sx: {
            width: 300,
            borderTopRightRadius: 20,
            borderBottomRightRadius: 20,
            overflow: "hidden",
            boxShadow: "0 20px 50px rgba(0,0,0,0.18)",
          },
        }}
      >
        <Box
          sx={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            bgcolor: "#ffffff",
          }}
        >
          <Box
            sx={{
              background: "linear-gradient(180deg, #1e88e5 0%, #1565c0 100%)",
              color: "white",
              px: 2.5,
              py: 3,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.2, mb: 1.2 }}>
              <Avatar
                sx={{
                  bgcolor: "rgba(255,255,255,0.18)",
                  width: 46,
                  height: 46,
                }}
              >
                <BusinessCenterRoundedIcon />
              </Avatar>

              <Box>
                <Typography sx={{ fontWeight: 800, fontSize: 20, lineHeight: 1.1 }}>
                  Menú
                </Typography>
              </Box>
            </Box>

            <Typography
              sx={{
                fontSize: 13,
                opacity: 0.95,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {user?.name || "Usuario"}
            </Typography>
            <Typography
              sx={{
                fontSize: 12,
                opacity: 0.82,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {user?.email || ""}
            </Typography>
          </Box>

          <Divider />

          <List sx={{ px: 1.2, py: 1.4 }}>
            {visibleItems.map((item) => {
              const isSelected = location.pathname === item.path;

              return (
                <ListItemButton
                  key={item.key}
                  selected={isSelected}
                  onClick={() => {
                    navigate(item.path);
                    setOpenMenu(false);
                  }}
                  sx={{
                    borderRadius: 3,
                    mb: 0.8,
                    px: 1.5,
                    py: 1.2,
                    "&.Mui-selected": {
                      bgcolor: "rgba(30, 136, 229, 0.12)",
                      color: "#1565c0",
                    },
                    "&.Mui-selected .MuiListItemIcon-root": {
                      color: "#1565c0",
                    },
                    "&:hover": {
                      bgcolor: "rgba(30, 136, 229, 0.08)",
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 40,
                      color: isSelected ? "#1565c0" : "#64748b",
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>

                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      fontWeight: isSelected ? 700 : 500,
                      fontSize: 14.5,
                    }}
                  />
                </ListItemButton>
              );
            })}
          </List>

          <Box sx={{ mt: "auto", p: 2 }}>
            <Button
              fullWidth
              onClick={logout}
              startIcon={<LogoutRoundedIcon />}
              sx={{
                borderRadius: 999,
                py: 1.2,
                textTransform: "none",
                fontWeight: 700,
                bgcolor: "#eff6ff",
                color: "#1565c0",
                "&:hover": {
                  bgcolor: "#dbeafe",
                },
              }}
            >
              Cerrar sesión
            </Button>
          </Box>
        </Box>
      </Drawer>

      <Box
        sx={{
          p: { xs: 2, md: 4 },
          flexGrow: 1,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout>
              <Navigate to="/calculo" replace />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/clientes"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["admin"]}>
              <Layout>
                <ClientesPage />
              </Layout>
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/modulos"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["admin"]}>
              <Layout>
                <ModulosPage />
              </Layout>
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/tarifas"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["admin"]}>
              <Layout>
                <TarifasPage />
              </Layout>
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/calculo"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["admin", "user"]}>
              <Layout>
                <CalculoPage />
              </Layout>
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}