import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api from "@/lib/api";

const AuthContext = createContext(null);

const TOKEN_KEY = "devam_token";
// sessionStorage clears when the tab closes — narrower XSS exfiltration window than localStorage.
// Refresh tokens still live in an httpOnly cookie set by the backend.
const tokenStore = {
  get: () => sessionStorage.getItem(TOKEN_KEY),
  set: (t) => sessionStorage.setItem(TOKEN_KEY, t),
  clear: () => sessionStorage.removeItem(TOKEN_KEY),
};

export function AuthProvider({ children }) {
  // null = checking, false = anon, object = signed-in user
  const [user, setUser] = useState(null);

  // Attach token to every outgoing request via a single interceptor.
  useEffect(() => {
    const id = api.interceptors.request.use((cfg) => {
      const t = tokenStore.get();
      if (t) cfg.headers.Authorization = `Bearer ${t}`;
      return cfg;
    });
    return () => api.interceptors.request.eject(id);
  }, []);

  // Resolve current user once on mount.
  useEffect(() => {
    let mounted = true;
    api
      .get("/auth/me")
      .then((res) => {
        if (mounted) setUser(res.data);
      })
      .catch(() => {
        if (mounted) setUser(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    if (data.access_token) tokenStore.set(data.access_token);
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      /* network errors are non-fatal at sign-out */
    }
    tokenStore.clear();
    setUser(false);
  }, []);

  const value = useMemo(() => ({ user, login, logout, setUser }), [user, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
