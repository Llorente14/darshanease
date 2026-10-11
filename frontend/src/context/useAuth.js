import { createContext, useContext } from "react";

// React context lives in its own non-component file so the provider file
// stays a Fast Refresh component boundary (react-refresh rule).
export const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
