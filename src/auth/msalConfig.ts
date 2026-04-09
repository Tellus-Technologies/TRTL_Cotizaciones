import type { Configuration } from "@azure/msal-browser";
import { LogLevel } from "@azure/msal-browser";

const clientId = import.meta.env.VITE_AZURE_CLIENT_ID;
const tenantId = import.meta.env.VITE_AZURE_TENANT_ID;
const redirectUri = import.meta.env.VITE_AZURE_REDIRECT_URI;
const postLogoutRedirectUri =
  import.meta.env.VITE_AZURE_POST_LOGOUT_REDIRECT_URI;

console.log("CLIENT_ID:", clientId);
console.log("TENANT_ID:", tenantId);
console.log("REDIRECT_URI:", redirectUri);
console.log("POST_LOGOUT_REDIRECT_URI:", postLogoutRedirectUri);

if (!clientId || !tenantId || !redirectUri || !postLogoutRedirectUri) {
  throw new Error(
    "Faltan variables de entorno de Azure. Revisa tu archivo .env"
  );
}

export const msalConfig: Configuration = {
  auth: {
    clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri,
    postLogoutRedirectUri,
  },
  cache: {
    cacheLocation: "localStorage",
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;

        switch (level) {
          case LogLevel.Error:
            console.error(message);
            break;
          case LogLevel.Info:
            console.info(message);
            break;
          case LogLevel.Verbose:
            console.debug(message);
            break;
          case LogLevel.Warning:
            console.warn(message);
            break;
          default:
            break;
        }
      },
    },
  },
};

export const loginRequest = {
  scopes: ["openid", "profile", "email", "User.Read"],
};