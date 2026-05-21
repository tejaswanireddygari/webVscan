import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, tokenStore } from "./api";

type User = { id: number; email: string; name: string };

type AuthCtx = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = tokenStore.get();
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .me()
      .then((u) => setUser({ id: u.id, email: u.email, name: u.email.split("@")[0] }))
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const { access_token } = await api.login(email, password);
    tokenStore.set(access_token);
    const u = await api.me();
    setUser({ id: u.id, email: u.email, name: u.email.split("@")[0] });
  };

  const register = async (email: string, password: string) => {
    await api.register(email, password);
    await login(email, password);
  };

  const logout = () => {
    tokenStore.clear();
    setUser(null);
  };

  return (
    <Ctx.Provider value={{ user, loading, login, register, logout }}>{children}</Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("AuthProvider missing");
  return c;
}
