import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";

import ModulosPage from "./pages/ModulosPage";
import ClientesPage from "./pages/ClientesPage";
import TarifasPage from "./pages/TarifasPage";
import ClienteTarifasPage from "./pages/ClienteTarifasPage";
import ProyectosPage from "./pages/ProyectosPage";
import ProyectoDetallePage from "./pages/ProyectoDetallePage";
import CalculoPage from "./pages/CalculoPage";
import LoginPage from "./pages/LoginPage";
import PerfilPage from "./pages/PerfilPage";

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
import Tooltip from "@mui/material/Tooltip";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";

import MenuIcon from "@mui/icons-material/Menu";
import PeopleIcon from "@mui/icons-material/People";
import ViewListIcon from "@mui/icons-material/ViewList";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import CalculateIcon from "@mui/icons-material/Calculate";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import ChevronRightSmallIcon from "@mui/icons-material/ChevronRight";

import { useMsal } from "@azure/msal-react";

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
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));

  const HEADER_HEIGHT = 72;
  const DRAWER_WIDTH = 290;
  const DRAWER_COLLAPSED = 92;

  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(true);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { instance, accounts } = useMsal();

  const collapsedView = isDesktop && desktopOpen && desktopCollapsed;
  const sidebarWidth = collapsedView ? DRAWER_COLLAPSED : DRAWER_WIDTH;
  const contentMarginLeft = isDesktop && desktopOpen ? sidebarWidth : 0;

  useEffect(() => {
    let objectUrl: string | null = null;

    const loadProfilePhoto = async () => {
      try {
        const account = accounts[0];
        if (!account) return;

        const response = await instance.acquireTokenSilent({
          account,
          scopes: ["User.Read"],
        });

        const photoResponse = await fetch(
          "https://graph.microsoft.com/v1.0/me/photo/$value",
          {
            headers: {
              Authorization: `Bearer ${response.accessToken}`,
            },
          }
        );

        if (!photoResponse.ok) {
          setProfilePhoto(null);
          return;
        }

        const blob = await photoResponse.blob();
        objectUrl = URL.createObjectURL(blob);
        setProfilePhoto(objectUrl);
      } catch (error) {
        console.error("No se pudo cargar la foto de perfil:", error);
        setProfilePhoto(null);
      }
    };

    loadProfilePhoto();

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [instance, accounts]);

  const menuItems = [
    {
      key: "modulos",
      label: "Módulos SAP",
      icon: <ViewListIcon />,
      path: "/modulos",
      roles: ["admin"],
    },
    {
      key: "clientes",
      label: "Clientes",
      icon: <PeopleIcon />,
      path: "/clientes",
      roles: ["admin"],
    },
    {
      key: "tarifas",
      label: "Tarifas",
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
    {
      key: "proyectos",
      label: "Proyectos",
      icon: <FolderOpenIcon />,
      path: "/proyectos",
      roles: ["admin"],
    },
  ];

  const visibleItems = menuItems.filter((item) =>
    item.roles.includes(user?.appRole || "user")
  );

  const handleMenuClick = () => {
    if (isDesktop) {
      setDesktopOpen((prev) => !prev);
    } else {
      setMobileOpen(true);
    }
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    if (!isDesktop) {
      setMobileOpen(false);
    }
  };

  const handleProfileClick = () => {
    navigate("/perfil");
  };

  const drawerContent = (
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
          px: collapsedView ? 1 : 1.8,
          py: 1.5,
          borderBottom: "1px solid #e2e8f0",
          bgcolor: "#f8fafc",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: collapsedView ? "center" : "space-between",
            mb: 1.2,
          }}
        >
          {!collapsedView && (
            <Typography sx={{ fontWeight: 800, fontSize: 16, color: "#0f172a" }}>
              Menú principal
            </Typography>
          )}

          <Box sx={{ display: "flex", gap: 0.5 }}>
            {isDesktop && desktopOpen && (
              <Tooltip
                title={collapsedView ? "Expandir menú" : "Colapsar menú"}
                placement="bottom"
              >
                <IconButton
                  size="small"
                  onClick={() => setDesktopCollapsed((prev) => !prev)}
                  sx={{
                    borderRadius: 2,
                    bgcolor: "#e2e8f0",
                    "&:hover": { bgcolor: "#cbd5e1" },
                  }}
                >
                  {collapsedView ? (
                    <ChevronRightRoundedIcon fontSize="small" />
                  ) : (
                    <ChevronLeftRoundedIcon fontSize="small" />
                  )}
                </IconButton>
              </Tooltip>
            )}

            {!isDesktop && (
              <Tooltip title="Cerrar menú" placement="bottom">
                <IconButton
                  size="small"
                  onClick={() => setMobileOpen(false)}
                  sx={{
                    borderRadius: 2,
                    bgcolor: "#e2e8f0",
                    "&:hover": { bgcolor: "#cbd5e1" },
                  }}
                >
                  <CloseRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>

        <Box
          onClick={handleProfileClick}
          sx={{
            borderRadius: 3,
            border: "1px solid #e2e8f0",
            bgcolor: "white",
            p: collapsedView ? 1.2 : 1.3,
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: collapsedView ? "center" : "space-between",
            gap: 1.2,
            boxShadow: "0 2px 10px rgba(15,23,42,0.04)",
            cursor: "pointer",
            transition: "all 0.18s ease",
            "&:hover": {
              bgcolor: "#f8fbff",
              borderColor: "#bfdbfe",
              boxShadow: "0 6px 18px rgba(21,101,192,0.10)",
              transform: "translateY(-1px)",
            },
          }}
        >
          {collapsedView ? (
            <Tooltip title="Mi perfil" placement="right">
              <Avatar
                src={profilePhoto || undefined}
                sx={{
                  width: 42,
                  height: 42,
                  bgcolor: "#1565c0",
                  color: "white",
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                {!profilePhoto && getInitials(user?.name)}
              </Avatar>
            </Tooltip>
          ) : (
            <>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.2,
                  minWidth: 0,
                  flexGrow: 1,
                }}
              >
                <Avatar
                  src={profilePhoto || undefined}
                  sx={{
                    width: 42,
                    height: 42,
                    bgcolor: "#1565c0",
                    color: "white",
                    fontWeight: 700,
                    fontSize: 14,
                    flexShrink: 0,
                  }}
                >
                  {!profilePhoto && getInitials(user?.name)}
                </Avatar>

                <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                  <Typography
                    sx={{
                      fontWeight: 700,
                      fontSize: 13.5,
                      color: "#0f172a",
                      lineHeight: 1.2,
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
                      color: "#1565c0",
                      mt: 0.45,
                      fontWeight: 600,
                      lineHeight: 1.2,
                    }}
                  >
                    Mi perfil
                  </Typography>
                </Box>
              </Box>

              <ChevronRightSmallIcon
                sx={{
                  color: "#94a3b8",
                  fontSize: 20,
                  flexShrink: 0,
                }}
              />
            </>
          )}
        </Box>
      </Box>

      <List sx={{ px: 1.2, py: 1.4, flexGrow: 1 }}>
        {visibleItems.map((item) => {
          const isSelected =
            location.pathname === item.path ||
            (item.path === "/clientes" && location.pathname.startsWith("/clientes/")) ||
            (item.path === "/proyectos" && location.pathname.startsWith("/proyectos/"));

          const button = (
            <ListItemButton
              key={item.key}
              selected={isSelected}
              onClick={() => handleNavigate(item.path)}
              sx={{
                borderRadius: 3,
                mb: 0.8,
                px: collapsedView ? 1 : 1.5,
                py: 1.15,
                minHeight: 50,
                justifyContent: collapsedView ? "center" : "flex-start",
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
                  minWidth: collapsedView ? "auto" : 40,
                  color: isSelected ? "#1565c0" : "#64748b",
                  justifyContent: "center",
                }}
              >
                {item.icon}
              </ListItemIcon>

              {!collapsedView && (
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontWeight: isSelected ? 700 : 500,
                    fontSize: 14.5,
                  }}
                />
              )}
            </ListItemButton>
          );

          return collapsedView ? (
            <Tooltip key={item.key} title={item.label} placement="right">
              {button}
            </Tooltip>
          ) : (
            button
          );
        })}
      </List>

      <Box sx={{ p: 1.5, borderTop: "1px solid #e2e8f0" }}>
        {!collapsedView ? (
          <Button
            fullWidth
            onClick={logout}
            startIcon={<LogoutRoundedIcon />}
            sx={{
              borderRadius: 999,
              py: 1.15,
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
        ) : (
          <Tooltip title="Cerrar sesión" placement="right">
            <IconButton
              onClick={logout}
              sx={{
                width: "100%",
                borderRadius: 3,
                bgcolor: "#eff6ff",
                color: "#1565c0",
                "&:hover": {
                  bgcolor: "#dbeafe",
                },
              }}
            >
              <LogoutRoundedIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </Box>
  );

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#f5f7fb",
      }}
    >
      <Box
        sx={{
          height: HEADER_HEIGHT,
          width: "100%",
          background: "linear-gradient(90deg, #1565c0 0%, #1e88e5 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: { xs: 1.5, md: 3 },
          boxShadow: "0 8px 20px rgba(21, 101, 192, 0.20)",
          position: "sticky",
          top: 0,
          zIndex: 1300,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", minWidth: 0 }}>
          <IconButton
            onClick={handleMenuClick}
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
              GESTIÓN DE PROYECTOS
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
              src={profilePhoto || undefined}
              sx={{
                width: 38,
                height: 38,
                bgcolor: "white",
                color: "#1565c0",
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              {!profilePhoto && getInitials(user?.name)}
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

      {isDesktop && (
        <Drawer
          variant="persistent"
          anchor="left"
          open={desktopOpen}
          PaperProps={{
            sx: {
              top: `${HEADER_HEIGHT}px`,
              height: `calc(100% - ${HEADER_HEIGHT}px)`,
              width: `${sidebarWidth}px`,
              borderRight: "1px solid #e2e8f0",
              boxShadow: "0 10px 30px rgba(15,23,42,0.06)",
              overflowX: "hidden",
              transition: "width 0.22s ease",
              zIndex: 1200,
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      {!isDesktop && (
        <Drawer
          anchor="left"
          open={mobileOpen}
          variant="temporary"
          onClose={() => setMobileOpen(false)}
          ModalProps={{
            keepMounted: true,
            BackdropProps: {
              sx: { backgroundColor: "rgba(15, 23, 42, 0.28)" },
            },
          }}
          PaperProps={{
            sx: {
              width: 300,
              top: `${HEADER_HEIGHT}px`,
              height: `calc(100% - ${HEADER_HEIGHT}px)`,
              overflow: "hidden",
              borderTopRightRadius: 18,
              borderBottomRightRadius: 18,
              boxShadow: "0 20px 50px rgba(0,0,0,0.18)",
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      <Box
        sx={{
          ml: { md: `${contentMarginLeft}px` },
          transition: "margin-left 0.22s ease",
          p: { xs: 2, md: 4 },
          minHeight: `calc(100vh - ${HEADER_HEIGHT}px)`,
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
        path="/clientes/:id/tarifas"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["admin"]}>
              <Layout>
                <ClienteTarifasPage />
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
        path="/proyectos"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["admin"]}>
              <Layout>
                <ProyectosPage />
              </Layout>
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/proyectos/:id"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["admin"]}>
              <Layout>
                <ProyectoDetallePage />
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

      <Route
        path="/perfil"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["admin", "user"]}>
              <Layout>
                <PerfilPage />
              </Layout>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}