import { useEffect, useRef } from "react";
import socket from "../services/socket";

// Calls onUpdate({ slotId, availableSeats, status }) for every "slot:updated" event.
// Generic on purpose: no page-specific logic, so the booking form (USN-5) can reuse it.
export function useSlotUpdates(onUpdate) {
  // Keep the latest callback in a ref so the listener is registered once, not on every render
  const onUpdateRef = useRef(onUpdate);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    const handler = (payload) => onUpdateRef.current(payload);
    socket.on("slot:updated", handler);
    return () => {
      socket.off("slot:updated", handler);
    };
  }, []);
}
