import { createContext, useContext, useEffect, useState } from "react";
import api from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null = checking, false = anon, object = user
  const [token, setToken] = useState(() => localStorage.getItem("devam_token") || null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const { data } = await api.get("/auth/me", { headers });
        if (mounted) setUser(data);
      } catch {
        if (mounted) setUser(false);
      }
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    setUser(data.user);
    if (data.access_token) {
      localStorage.setItem("devam_token", data.access_token);
      setToken(data.access_token);
    }
    return data;
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {}
    localStorage.removeItem("devam_token");
    setToken(null);
    setUser(false);
  };

  // Attach token to every request via interceptor
  useEffect(() => {
    const id = api.interceptors.request.use((cfg) => {
      const t = localStorage.getItem("devam_token");
      if (t) cfg.headers.Authorization = `Bearer ${t}`;
      return cfg;
    });
    return () => api.interceptors.request.eject(id);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
