import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { register as registerService } from "../services/authService";

const AuthContext = createContext(null);

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

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount, restore the persisted session (loading=true until done)
  useEffect(() => {
    const storedToken = readStorage(TOKEN_KEY);
    const storedUser = readStorage(USER_KEY);
    if (storedToken && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
        setToken(storedToken);
      } catch {
        removeStorage(USER_KEY);
        removeStorage(TOKEN_KEY);
      }
    }
    setLoading(false);
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

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
