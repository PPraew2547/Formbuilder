import {
  createContext,
  useContext,
  useState,
  useEffect,
} from "react";
import type { ReactNode } from "react";

export interface User {
  id:    string;
  name:  string;
  email: string;
  token: string;
}

interface AuthCtx {
  user:    User | null;
  loading: boolean;
  login:   (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout:  () => void;
}

const AuthContext = createContext<AuthCtx>({
  user:    null,
  loading: false,
  login:   async () => ({ ok: false }),
  logout:  () => undefined,
});

const STORAGE_KEY = "fb_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  /* Restore session on mount */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setUser(JSON.parse(raw) as User);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  const login = async (
    email: string,
    password: string,
  ): Promise<{ ok: boolean; error?: string }> => {
    /* ── Replace block below with real fetch when backend is ready ──────
    try {
      const res = await fetch("/api/auth/login", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const err = await res.json() as { message?: string };
        return { ok: false, error: err.message ?? "Login failed" };
      }
      const data = await res.json() as User;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setUser(data);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: (e as Error).message ?? "Network error" };
    }
    ──────────────────────────────────────────────────────────────────── */

    /* MOCK — remove when backend ready */
    if (!email || !password) {
      return { ok: false, error: "Email and password are required." };
    }
    const mock: User = { id: "u1", name: "Admin", email, token: "mock-token" };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mock));
    setUser(mock);
    return { ok: true };
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
