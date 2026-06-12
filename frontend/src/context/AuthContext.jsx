import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api from "@/lib/api";

const AuthContext = createContext(null);

// Auth is fully cookie-based. The backend sets two httpOnly cookies:
//   - access_token  (SameSite=None; Secure; 12h)
//   - refresh_token (SameSite=None; Secure; 7d)
// Because they are httpOnly, JavaScript cannot read them — that closes the
// XSS-token-theft hole that the previous localStorage / sessionStorage flow had.
// We rely on axios `withCredentials: true` (set in lib/api.js) to send them.

export function AuthProvider({ children }) {
  // null = checking, false = anon, object = signed-in user
  const [user, setUser] = useState(null);

  // Resolve current user once on mount via the auth cookie.
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
    // Cookie is set by the response; we only need the returned user object.
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch (err) {
      // Network failure at sign-out is non-fatal — log only in development
      // so ops have visibility locally without leaking noise to production users.
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.warn("Logout request failed (clearing local session anyway):", err?.message || err);
      }
    }
    setUser(false);
  }, []);

  const value = useMemo(() => ({ user, login, logout, setUser }), [user, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
