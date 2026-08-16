"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";

interface AuthUser {
  id: number;
  username: string;
  fullName: string;
  role: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const handleLogin = async (username: string, password: string) => {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000"}/api/v1/auth/login`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      },
    );

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(json?.error?.message ?? "Login failed");
    }

    const { token, user } = json.data;
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    setToken(token);
    setUser(user);
    router.push("/");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login: handleLogin,
        logout: handleLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
