"use client";

import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

export function OfflineBanner() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    async function flushQueue() {
      const raw = localStorage.getItem("sentinelle-offline-controls");
      if (!raw) return;
      const queued = JSON.parse(raw) as Array<{ payload: Record<string, unknown>; queuedAt: string }>;
      if (!queued.length) return;
      const response = await fetch("/api/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          deviceId: localStorage.getItem("sentinelle-device-id") ?? crypto.randomUUID(),
          events: queued.map((item) => ({
            entity: "Control",
            operation: "create",
            payload: { ...item.payload, queuedAt: item.queuedAt }
          }))
        })
      });
      if (response.ok) localStorage.removeItem("sentinelle-offline-controls");
    }
    const update = () => {
      const isOnline = navigator.onLine;
      setOnline(isOnline);
      if (isOnline) flushQueue().catch(() => undefined);
    };
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (online) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto flex max-w-xl items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 shadow-soft dark:border-amber-400/30 dark:bg-amber-500/15 dark:text-amber-100">
      <WifiOff className="h-4 w-4" />
      Mode hors ligne actif. Les actions terrain sont conservees et seront synchronisees au retour reseau.
    </div>
  );
}
