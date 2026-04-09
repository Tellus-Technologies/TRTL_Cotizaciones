import React from "react";
import { Navigate } from "react-router-dom";
import { Box, Typography } from "@mui/material";
import { useAuth } from "./AuthProvider";

type RoleRouteProps = {
  allowedRoles: Array<"admin" | "user">;
  children: React.ReactElement;
};

export default function RoleRoute({ allowedRoles, children }: RoleRouteProps) {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) return null;

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.appRole)) {
    return (
      <Box sx={{ p: 6 }}>
        <Typography variant="h4" fontWeight="bold" mb={2}>
          Acceso denegado
        </Typography>
        <Typography>
          No tienes permisos para entrar a esta sección.
        </Typography>
      </Box>
    );
  }

  return children;
}