"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      // Without this, some browsers cache sw.js itself via the HTTP cache,
      // so a new deploy's service worker can take up to 24h to be noticed.
      navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).catch(() => {
        /* offline caching is a progressive enhancement — safe to ignore */
      });
    }
  }, []);
  return null;
}
