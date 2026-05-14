import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type User = { email: string; name: string };
type AuthCtx = {
  user: User | null;
  login: (email: string, name?: string) => void;
  logout: () => void;
};

const Ctx = createContext<AuthCtx | null>(null);
const KEY = "vulnscan_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch {}
  }, []);
  const login = (email: string, name = email.split("@")[0]) => {
    const u = { email, name };
    localStorage.setItem(KEY, JSON.stringify(u));
    setUser(u);
  };
  const logout = () => {
    localStorage.removeItem(KEY);
    setUser(null);
  };
  return <Ctx.Provider value={{ user, login, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("AuthProvider missing");
  return c;
}
