import { useCallback, useEffect, useState } from "react";
import { AuthContext } from "./useAuth";
import { register as registerService } from "../services/authService";

const USER_KEY = "darshanease_user";
const TOKEN_KEY = "darshanease_token";

// All localStorage access is wrapped in try/catch (private mode, quotas, etc.)
const readStorage = (key) => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeStorage = (key, value) => {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage unavailable — session stays in memory only */
  }
};

const removeStorage = (key) => {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
};

const readSession = () => {
  const rawToken = readStorage(TOKEN_KEY);
  const rawUser = readStorage(USER_KEY);
  if (rawToken && rawUser) {
    try {
      const user = JSON.parse(rawUser);
      if (user && typeof user === "object") {
        return { user, token: rawToken };
      }
    } catch {
      /* corrupted payload — drop it below */
    }
    removeStorage(USER_KEY);
    removeStorage(TOKEN_KEY);
  }
  return { user: null, token: null };
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount, restore the persisted session (loading=true until done)
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      const session = readSession();
      if (cancelled) return;
      setUser(session.user);
      setToken(session.token);
      setLoading(false);
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  // Register: calls the API, persists the session, rethrows failures
  const register = useCallback(async (payload) => {
    const result = await registerService(payload);
    const { user: newUser, token: newToken } = result.data;
    setUser(newUser);
    setToken(newToken);
    writeStorage(TOKEN_KEY, newToken);
    writeStorage(USER_KEY, JSON.stringify(newUser));
    return result;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    removeStorage(USER_KEY);
    removeStorage(TOKEN_KEY);
  }, []);

  const value = { user, token, loading, register, logout };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
