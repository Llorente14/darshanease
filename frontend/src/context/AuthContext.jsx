import { useCallback, useEffect, useState } from "react";
import { AuthContext } from "./useAuth";
import {
  register as registerService,
  login as loginService,
  getMe,
} from "../services/authService";
import { setUnauthorizedHandler } from "../services/api";

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

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    removeStorage(USER_KEY);
    removeStorage(TOKEN_KEY);
  }, []);

  // Register unauthorized handler so any 401 from api.js clears the session
  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout();
    });
    return () => {
      setUnauthorizedHandler(null);
    };
  }, [logout]);

  // Session verification on app start:
  // if a stored token exists, call getMe(); on 401 clear session;
  // on network/other errors keep stored session.
  useEffect(() => {
    let cancelled = false;

    const verifySession = async () => {
      const session = readSession();

      if (!session.token) {
        if (!cancelled) {
          setUser(null);
          setToken(null);
          setLoading(false);
        }
        return;
      }

      // Initialize state with stored session
      if (!cancelled) {
        setUser(session.user);
        setToken(session.token);
        setLoading(true);
      }

      try {
        const result = await getMe();
        const freshUser = result.data?.user || result.user || session.user;
        if (!cancelled) {
          setUser(freshUser);
          setToken(session.token);
          writeStorage(USER_KEY, JSON.stringify(freshUser));
        }
      } catch (error) {
        if (error?.response?.status === 401) {
          if (!cancelled) {
            logout();
          }
        } else {
          // Network or server error: keep the stored session (do not log out offline users)
          if (!cancelled) {
            setUser(session.user);
            setToken(session.token);
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    verifySession();

    return () => {
      cancelled = true;
    };
  }, [logout]);

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

  // Login: calls the API, persists the session, rethrows failures
  const login = useCallback(async (payload) => {
    const result = await loginService(payload);
    const { user: newUser, token: newToken } = result.data;
    setUser(newUser);
    setToken(newToken);
    writeStorage(TOKEN_KEY, newToken);
    writeStorage(USER_KEY, JSON.stringify(newUser));
    return result;
  }, []);

  const isAuthenticated = Boolean(token);

  const value = {
    isAuthenticated,
    user,
    token,
    loading,
    register,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
