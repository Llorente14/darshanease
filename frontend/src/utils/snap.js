// The client key is public and may live in the frontend. The server key never does.
const SNAP_CLIENT_KEY = import.meta.env.VITE_MIDTRANS_CLIENT_KEY;
const SNAP_URL = import.meta.env.VITE_MIDTRANS_SNAP_URL;

// One promise for the whole page, so the script tag is added only once
let snapPromise = null;

// Resolves window.snap after Midtrans Snap.js has loaded.
export function loadSnap() {
  if (snapPromise) return snapPromise;

  snapPromise = new Promise((resolve, reject) => {
    if (!SNAP_CLIENT_KEY || !SNAP_URL) {
      reject(new Error("Payment is not configured. Set VITE_MIDTRANS_CLIENT_KEY and VITE_MIDTRANS_SNAP_URL."));
      return;
    }

    const script = document.createElement("script");
    script.src = SNAP_URL;
    script.setAttribute("data-client-key", SNAP_CLIENT_KEY);
    script.onload = () => resolve(window.snap);
    script.onerror = () => {
      script.remove();
      // Clear the cache so the next attempt can load the script again
      snapPromise = null;
      reject(new Error("Could not load the payment script. Check your connection and try again."));
    };
    document.body.appendChild(script);
  });

  return snapPromise;
}
