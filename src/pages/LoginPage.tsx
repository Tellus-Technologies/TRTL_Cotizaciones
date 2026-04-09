import { Box, Button, Paper, Typography, Divider } from "@mui/material";
import MicrosoftIcon from "@mui/icons-material/Microsoft";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import logoTriarii from "../assets/LOGO TRIARII PNG.png";

export default function LoginPage() {
  const { login, isAuthenticated, user, loading } = useAuth();

  if (!loading && isAuthenticated) {
    if (user?.appRole === "admin") {
      return <Navigate to="/" replace />;
    }
    return <Navigate to="/calculo" replace />;
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(circle at top left, #dbeafe 0%, #eff6ff 32%, #f8fafc 60%, #eef2ff 100%)",
        p: 2,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 980,
          minHeight: 560,
          borderRadius: 5,
          overflow: "hidden",
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1.1fr 0.9fr" },
          boxShadow: "0 30px 80px rgba(15, 23, 42, 0.14)",
          border: "1px solid rgba(148, 163, 184, 0.16)",
          bgcolor: "white",
        }}
      >
        <Box
          sx={{
            display: { xs: "none", md: "flex" },
            flexDirection: "column",
            justifyContent: "space-between",
            p: 5,
            color: "white",
            background:
              "linear-gradient(160deg, #1565c0 0%, #1e88e5 55%, #60a5fa 100%)",
            position: "relative",
          }}
        >
          <Box
            sx={{
              position: "absolute",
              width: 240,
              height: 240,
              borderRadius: "50%",
              top: -80,
              right: -60,
              bgcolor: "rgba(255,255,255,0.10)",
            }}
          />

          <Box
            sx={{
              position: "absolute",
              width: 180,
              height: 180,
              borderRadius: "50%",
              bottom: 40,
              left: -50,
              bgcolor: "rgba(255,255,255,0.08)",
            }}
          />

          <Box
            sx={{
              position: "relative",
              zIndex: 1,
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Box
              sx={{
                width: 220,
                height: 220,
                borderRadius: 5,
                bgcolor: "rgba(255,255,255,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backdropFilter: "blur(6px)",
                boxShadow: "0 12px 28px rgba(0,0,0,0.16)",
              }}
            >
              <Box
                component="img"
                src={logoTriarii}
                alt="Logo Triarii Systems"
                sx={{
                  width: 185,
                  height: 185,
                  objectFit: "contain",
                  display: "block",
                }}
              />
            </Box>
          </Box>

          <Box sx={{ position: "relative", zIndex: 1 }}>
            <Divider sx={{ borderColor: "rgba(255,255,255,0.18)", mb: 2 }} />
            <Typography sx={{ fontSize: 13.5, opacity: 0.9 }}>
              © 2026. Triarii Systems. Todos los derechos reservados.
            </Typography>
          </Box>
        </Box>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            p: { xs: 3, md: 5 },
            bgcolor: "#ffffff",
          }}
        >
          <Box sx={{ width: "100%", maxWidth: 390 }}>
            <Box
              sx={{
                width: 62,
                height: 62,
                borderRadius: "18px",
                bgcolor: "#e8f1ff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mb: 3,
              }}
            >
              <LockOutlinedIcon sx={{ color: "#1565c0", fontSize: 30 }} />
            </Box>

            <Typography
              sx={{
                fontSize: { xs: 30, md: 34 },
                fontWeight: 800,
                color: "#0f172a",
                lineHeight: 1.15,
                mb: 1.2,
              }}
            >
              Iniciar Sesión
            </Typography>

            <Typography
              sx={{
                color: "#64748b",
                fontSize: 15,
                lineHeight: 1.7,
                mb: 4,
              }}
            >
              Inicia sesión con tu cuenta corporativa de Microsoft para continuar.
            </Typography>

            <Button
              variant="contained"
              fullWidth
              startIcon={<MicrosoftIcon />}
              onClick={login}
              sx={{
                py: 1.7,
                borderRadius: 999,
                textTransform: "none",
                fontSize: 16,
                fontWeight: 700,
                background: "linear-gradient(90deg, #1565c0 0%, #1e88e5 100%)",
                boxShadow: "0 12px 24px rgba(30, 136, 229, 0.28)",
                "&:hover": {
                  background:
                    "linear-gradient(90deg, #0d47a1 0%, #1976d2 100%)",
                  boxShadow: "0 16px 28px rgba(30, 136, 229, 0.34)",
                },
              }}
            >
              Iniciar sesión con Microsoft
            </Button>

            <Typography
              sx={{
                mt: 3,
                textAlign: "center",
                color: "#94a3b8",
                fontSize: 13,
                lineHeight: 1.6,
              }}
            >
              Solo usuarios autorizados con correo corporativo pueden acceder.
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}