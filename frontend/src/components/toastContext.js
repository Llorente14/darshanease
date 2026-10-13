import { createContext, useContext } from "react";

// Context + hook live in a non-component file so Toast.jsx stays a Fast Refresh boundary (same pattern as useAuth).
export const ToastContext = createContext(null);

// toast.success(message)   -> green toast, auto-dismiss after 4s
// toast.error(messageOrErr) -> red toast, 6s, close button. An axios error shows its API "message".
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
