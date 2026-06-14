"use client";

import { useEffect } from "react";

export function ServiceWorker() {
  useEffect(() => {
    const isLocalHost = ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
    if ("serviceWorker" in navigator && (process.env.NODE_ENV === "production" || isLocalHost)) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  return null;
}
