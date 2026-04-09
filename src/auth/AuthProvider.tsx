import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { AccountInfo } from "@azure/msal-browser";
import { PublicClientApplication } from "@azure/msal-browser";
import { MsalProvider } from "@azure/msal-react";
import { msalConfig, loginRequest } from "./msalConfig";

type AppRole = "admin" | "user";

type AuthUser = {
  name: string;
  email: string;
  roles: string[];
  appRole: AppRole;
  account: AccountInfo;
};

type AuthContextType = {
  user: AuthUser | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
};

const msalInstance = new PublicClientApplication(msalConfig);

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function normalizeRole(roles: string[]): AppRole {
  const rolesLower = roles.map((r) => r.toLowerCase());

  if (rolesLower.includes("admin")) return "admin";
  return "user";
}

function buildUserFromAccount(account: AccountInfo | null): AuthUser | null {
  if (!account) {
    console.warn("No hay cuenta activa para construir el usuario.");
    return null;
  }

  const claims = account.idTokenClaims as Record<string, unknown> | undefined;
  const tokenRoles = claims?.roles;
  const roles = Array.isArray(tokenRoles)
    ? tokenRoles.filter((r): r is string => typeof r === "string")
    : [];

  const appRole = normalizeRole(roles);

  console.log("========== AUTH DEBUG ==========");
  console.log("Cuenta autenticada:", account);
  console.log("Username:", account.username);
  console.log("Name:", account.name);
  console.log("ID Token Claims:", claims);
  console.log("Roles recibidos en token:", roles);
  console.log("Rol normalizado en app:", appRole);
  console.log("================================");

  return {
    name: account.name || "Usuario",
    email: account.username || "",
    roles,
    appRole,
    account,
  };
}

function AuthProviderInner({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        console.log("Inicializando MSAL...");

        await msalInstance.initialize();

        console.log("Procesando respuesta de redirect...");
        const response = await msalInstance.handleRedirectPromise();

        if (response?.account) {
          console.log("Login por redirect exitoso.");
          console.log("Response completa:", response);

          msalInstance.setActiveAccount(response.account);

          const builtUser = buildUserFromAccount(response.account);
          console.log("Usuario construido desde response.account:", builtUser);

          setUser(builtUser);
        } else {
          console.log("No vino response.account, buscando cuenta activa o previa...");

          const active = msalInstance.getActiveAccount();
          const account = active || msalInstance.getAllAccounts()[0] || null;

          console.log("Cuenta activa encontrada:", active);
          console.log("Primera cuenta disponible:", msalInstance.getAllAccounts()[0] || null);

          if (account) {
            msalInstance.setActiveAccount(account);

            const builtUser = buildUserFromAccount(account);
            console.log("Usuario construido desde cuenta almacenada:", builtUser);

            setUser(builtUser);
          } else {
            console.warn("No hay cuentas almacenadas en MSAL.");
          }
        }
      } catch (error) {
        console.error("Error inicializando autenticación:", error);
      } finally {
        console.log("Finalizó inicialización de autenticación.");
        setLoading(false);
      }
    };

    void init();
  }, []);

  const login = async () => {
    try {
      console.log("Iniciando login con Microsoft...");
      await msalInstance.loginRedirect(loginRequest);
    } catch (error) {
      console.error("Error al iniciar login:", error);
    }
  };

  const logout = async () => {
    try {
      const account = msalInstance.getActiveAccount();
      console.log("Cerrando sesión. Cuenta activa:", account);

      await msalInstance.logoutRedirect({
        account: account || undefined,
      });
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  useEffect(() => {
    console.log("Estado actual de user:", user);
    console.log("Estado actual de loading:", loading);
    console.log("Está autenticado:", !!user);
  }, [user, loading]);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
      isAuthenticated: !!user,
    }),
    [user, loading]
  );

  return (
    <MsalProvider instance={msalInstance}>
      <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    </MsalProvider>
  );
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  return <AuthProviderInner>{children}</AuthProviderInner>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }

  return context;
}