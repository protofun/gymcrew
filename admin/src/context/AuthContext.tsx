import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { api, ApiError, clearToken, getToken, setToken, type AdminUser } from "../lib/api";

type AuthContextValue = {
  admin: AdminUser | null;
  loading: boolean;
  login: (email: string, password: string, code?: string) => Promise<{ requiresTotp: boolean }>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    api
      .me()
      .then(setAdmin)
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string, code?: string) {
    const result = await api.login(email, password, code);
    if ("requiresTotp" in result) {
      return { requiresTotp: true };
    }
    setToken(result.token);
    setAdmin(result.admin);
    return { requiresTotp: false };
  }

  function logout() {
    clearToken();
    setAdmin(null);
  }

  return <AuthContext.Provider value={{ admin, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export { ApiError };
