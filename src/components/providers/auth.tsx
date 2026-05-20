import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api } from "@/convex/_generated/api.js";
import { convexClient } from "@/components/providers/convex.tsx";

type AuthRole = "admin" | "user";

export interface LocalAuthUser {
  id: string;
  name: string;
  email: string;
  role: AuthRole;
}

interface AuthContextValue {
  user: LocalAuthUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  signin: (args: { email: string; password: string }) => Promise<void>;
  signup: (args: { name: string; email: string; password: string }) => Promise<void>;
  signout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const SESSION_KEY = "labstock-auth-session";

function getStoredSession(): LocalAuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(SESSION_KEY);
    return value ? (JSON.parse(value) as LocalAuthUser) : null;
  } catch {
    return null;
  }
}

function setStoredSession(user: LocalAuthUser) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

function clearStoredSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LocalAuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = getStoredSession();
    if (session) {
      setUser(session);
    }
    setLoading(false);
  }, []);

  const signin = useCallback(async ({ email, password }: {
    email: string;
    password: string;
  }) => {
    const normalizedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (!normalizedEmail || !trimmedPassword) {
      throw new Error("Email and password are required.");
    }

    setLoading(true);
    try {
      const authUser = await convexClient.mutation(api.users.authenticate, {
        email: normalizedEmail,
        password: trimmedPassword,
      });

      if (!authUser) {
        throw new Error("Invalid credentials.");
      }

      const sessionUser: LocalAuthUser = {
        id: authUser._id,
        name: authUser.name,
        email: authUser.email,
        role: authUser.role,
      };

      setUser(sessionUser);
      setStoredSession(sessionUser);
    } finally {
      setLoading(false);
    }
  }, []);

  const signup = useCallback(async ({ name, email, password }: {
    name: string;
    email: string;
    password: string;
  }) => {
    const normalizedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (!name.trim() || !normalizedEmail || !trimmedPassword) {
      throw new Error("Name, email, and password are required.");
    }

    setLoading(true);
    try {
      await convexClient.mutation(api.users.create, {
        name: name.trim(),
        email: normalizedEmail,
        password: trimmedPassword,
        role: "user",
        status: "active",
      });

      // Auto sign in after signup
      await signin({ email: normalizedEmail, password: trimmedPassword });
    } finally {
      setLoading(false);
    }
  }, [signin]);

  const signout = useCallback(() => {
    clearStoredSession();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      loading,
      signin,
      signup,
      signout,
    }),
    [loading, signin, signup, signout, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
