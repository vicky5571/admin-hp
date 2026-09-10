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
    // Purge any legacy token from localStorage
    localStorage.removeItem("token");

    const checkSession = async () => {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch {
          localStorage.removeItem("user");
        }
      }

      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000"}/api/v1/me`,
          {
            credentials: "include",
          },
        );
        if (res.ok) {
          const json = await res.json().catch(() => null);
          const me = json?.data ?? json;
          if (me && me.id) {
            setUser(me);
            setToken("cookie-session");
            localStorage.setItem("user", JSON.stringify(me));
          }
        } else if (res.status === 401) {
          setUser(null);
          setToken(null);
          localStorage.removeItem("user");
        }
      } catch {
        // Network offline or server unreachable - keep optimistic user from localStorage
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  const handleLogin = async (username: string, password: string) => {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000"}/api/v1/auth/login`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      },
    );

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(json?.error?.message ?? "Login failed");
    }

    const { user } = json.data;
    localStorage.removeItem("token");
    localStorage.setItem("user", JSON.stringify(user));
    setToken("cookie-session");
    setUser(user);
    router.push("/");
  };

  const handleLogout = async () => {
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000"}/api/v1/auth/logout`,
        {
          method: "POST",
          credentials: "include",
        },
      );
    } catch {
      // ignore network errors
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setToken(null);
      setUser(null);
      router.push("/login");
    }
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
