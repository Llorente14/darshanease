import { useCallback, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ToastContext } from "./toastContext";

const MAX_VISIBLE = 3;
const SUCCESS_MS = 4000;
const ERROR_MS = 6000;
const FALLBACK_ERROR = "Something went wrong. Please try again.";
const EASE = [0.22, 1, 0.36, 1];

const errorText = (input) => {
  if (typeof input === "string" && input) return input;
  return input?.response?.data?.message || FALLBACK_ERROR;
};

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((list) => list.filter((item) => item.id !== id));
  }, []);

  const push = useCallback(
    (type, message) => {
      nextId.current += 1;
      const id = nextId.current;
      // Newest first; anything past the limit is dropped (and its timer cleared)
      setToasts((list) => {
        const next = [{ id, type, message }, ...list];
        for (const dropped of next.slice(MAX_VISIBLE)) {
          clearTimeout(timers.current.get(dropped.id));
          timers.current.delete(dropped.id);
        }
        return next.slice(0, MAX_VISIBLE);
      });
      timers.current.set(id, setTimeout(() => dismiss(id), type === "error" ? ERROR_MS : SUCCESS_MS));
    },
    [dismiss]
  );

  const api = useMemo(
    () => ({
      success: (message) => push("success", message),
      error: (input) => push("error", errorText(input)),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-region">
        <AnimatePresence initial={false}>
          {toasts.map((item) => (
            <motion.div
              key={item.id}
              className={`toast toast-${item.type}`}
              role={item.type === "error" ? "alert" : "status"}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.2, ease: EASE }}
            >
              <p>{item.message}</p>
              {item.type === "error" && (
                <button type="button" className="toast-close" aria-label="Dismiss message" onClick={() => dismiss(item.id)}>
                  <CloseIcon />
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
