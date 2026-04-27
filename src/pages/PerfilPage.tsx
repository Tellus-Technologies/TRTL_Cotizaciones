import { useEffect, useState } from "react";
import { Box, Paper, Typography, Avatar, Chip, Divider, Grid, Button } from "@mui/material";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import { useMsal } from "@azure/msal-react";
import { useAuth } from "../auth/AuthProvider";

function getInitials(name?: string) {
  if (!name) return "U";

  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export default function PerfilPage() {
  const { user } = useAuth();
  const { instance, accounts } = useMsal();

  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [loadingPhoto, setLoadingPhoto] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;

    const loadProfilePhoto = async () => {
      try {
        setLoadingPhoto(true);

        const account = accounts[0];
        if (!account) {
          setProfilePhoto(null);
          return;
        }

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
      } finally {
        setLoadingPhoto(false);
      }
    };

    void loadProfilePhoto();

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [instance, accounts]);

  const account = user?.account;
  const claims = (account?.idTokenClaims as Record<string, unknown> | undefined) || {};

  const company =
    (typeof claims.companyName === "string" && claims.companyName) ||
    (typeof claims.tenant_ctry === "string" && claims.tenant_ctry) ||
    "Triarii Systems";

  const displayRole = user?.appRole === "admin" ? "Administrador" : "Usuario";

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto" }}>
      <Typography
        sx={{
          fontSize: { xs: 28, md: 34 },
          fontWeight: 800,
          color: "#1565c0",
          mb: 0.8,
          lineHeight: 1.1,
        }}
      >
        Mi perfil
      </Typography>

      <Typography
        sx={{
          color: "#64748b",
          fontSize: 15,
          mb: 3.5,
        }}
      >
        Consulta la información principal de tu cuenta corporativa.
      </Typography>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper
            elevation={0}
            sx={{
              borderRadius: 4,
              p: 3,
              border: "1px solid #e2e8f0",
              boxShadow: "0 12px 30px rgba(15,23,42,0.05)",
              height: "100%",
            }}
          >
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
              }}
            >
              <Avatar
                src={profilePhoto || undefined}
                sx={{
                  width: 108,
                  height: 108,
                  bgcolor: "#1565c0",
                  color: "white",
                  fontWeight: 800,
                  fontSize: 34,
                  mb: 2,
                  boxShadow: "0 12px 28px rgba(21,101,192,0.18)",
                }}
              >
                {!profilePhoto && getInitials(user?.name)}
              </Avatar>

              <Typography
                sx={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: "#0f172a",
                  lineHeight: 1.2,
                }}
              >
                {user?.name || "Usuario"}
              </Typography>

              <Typography
                sx={{
                  color: "#64748b",
                  fontSize: 14,
                  mt: 0.8,
                  wordBreak: "break-word",
                }}
              >
                {user?.email || "Sin correo disponible"}
              </Typography>

              <Chip
                label={displayRole}
                sx={{
                  mt: 2,
                  bgcolor: "#eff6ff",
                  color: "#1565c0",
                  fontWeight: 700,
                  borderRadius: 999,
                }}
              />

              <Button
                variant="outlined"
                startIcon={<RefreshRoundedIcon />}
                onClick={() => window.location.reload()}
                sx={{
                  mt: 2.2,
                  borderRadius: 999,
                  textTransform: "none",
                  fontWeight: 700,
                }}
              >
                Actualizar foto
              </Button>

              {loadingPhoto && (
                <Typography sx={{ mt: 1.2, fontSize: 12, color: "#94a3b8" }}>
                  Cargando foto...
                </Typography>
              )}
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <Paper
            elevation={0}
            sx={{
              borderRadius: 4,
              p: { xs: 2.2, md: 3 },
              border: "1px solid #e2e8f0",
              boxShadow: "0 12px 30px rgba(15,23,42,0.05)",
            }}
          >
            <Typography
              sx={{
                fontSize: 20,
                fontWeight: 800,
                color: "#0f172a",
                mb: 2,
              }}
            >
              Datos personales
            </Typography>

            <Divider sx={{ mb: 2.5 }} />

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    border: "1px solid #e2e8f0",
                    bgcolor: "#f8fafc",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                    <PersonOutlineOutlinedIcon sx={{ color: "#1565c0" }} />
                    <Typography sx={{ fontWeight: 700, color: "#334155", fontSize: 14 }}>
                      Nombre completo
                    </Typography>
                  </Box>
                  <Typography sx={{ color: "#0f172a", fontWeight: 600 }}>
                    {user?.name || "No disponible"}
                  </Typography>
                </Paper>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    border: "1px solid #e2e8f0",
                    bgcolor: "#f8fafc",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                    <EmailOutlinedIcon sx={{ color: "#1565c0" }} />
                    <Typography sx={{ fontWeight: 700, color: "#334155", fontSize: 14 }}>
                      Correo electrónico
                    </Typography>
                  </Box>
                  <Typography sx={{ color: "#0f172a", fontWeight: 600, wordBreak: "break-word" }}>
                    {user?.email || "No disponible"}
                  </Typography>
                </Paper>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    border: "1px solid #e2e8f0",
                    bgcolor: "#f8fafc",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                    <AdminPanelSettingsOutlinedIcon sx={{ color: "#1565c0" }} />
                    <Typography sx={{ fontWeight: 700, color: "#334155", fontSize: 14 }}>
                      Rol en la aplicación
                    </Typography>
                  </Box>
                  <Typography sx={{ color: "#0f172a", fontWeight: 600 }}>
                    {displayRole}
                  </Typography>
                </Paper>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    border: "1px solid #e2e8f0",
                    bgcolor: "#f8fafc",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                    <BadgeOutlinedIcon sx={{ color: "#1565c0" }} />
                    <Typography sx={{ fontWeight: 700, color: "#334155", fontSize: 14 }}>
                      Username / cuenta
                    </Typography>
                  </Box>
                  <Typography sx={{ color: "#0f172a", fontWeight: 600, wordBreak: "break-word" }}>
                    {account?.username || "No disponible"}
                  </Typography>
                </Paper>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    border: "1px solid #e2e8f0",
                    bgcolor: "#f8fafc",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                    <BusinessOutlinedIcon sx={{ color: "#1565c0" }} />
                    <Typography sx={{ fontWeight: 700, color: "#334155", fontSize: 14 }}>
                      Organización
                    </Typography>
                  </Box>
                  <Typography sx={{ color: "#0f172a", fontWeight: 600 }}>
                    {company}
                  </Typography>
                </Paper>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    border: "1px solid #e2e8f0",
                    bgcolor: "#f8fafc",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                    <BadgeOutlinedIcon sx={{ color: "#1565c0" }} />
                    <Typography sx={{ fontWeight: 700, color: "#334155", fontSize: 14 }}>
                      ID de cuenta
                    </Typography>
                  </Box>
                  <Typography
                    sx={{
                      color: "#0f172a",
                      fontWeight: 600,
                      wordBreak: "break-word",
                      fontSize: 13.5,
                    }}
                  >
                    {account?.homeAccountId || "No disponible"}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}