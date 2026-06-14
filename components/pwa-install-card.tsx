"use client";

import { CheckCircle2, Download, MonitorDown, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

export function PwaInstallCard() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [status, setStatus] = useState("Prête à installer");

  useEffect(() => {
    setInstalled(isStandalone());
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setStatus("Installation disponible");
    };
    const handleInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
      setStatus("Installée");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  async function install() {
    if (!installPrompt) {
      setStatus("Utiliser le bouton installer du navigateur");
      return;
    }
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setStatus("Installation acceptée");
      setInstalled(true);
    } else {
      setStatus("Installation annulée");
    }
    setInstallPrompt(null);
  }

  return (
    <div className="surface rounded-lg p-5">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-3xl">
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-sentinel-50 p-2 text-sentinel-700 dark:bg-sentinel-500/15 dark:text-sentinel-100">
              {installed ? <CheckCircle2 className="h-5 w-5" /> : <MonitorDown className="h-5 w-5" />}
            </span>
            <div>
              <p className="text-sm font-semibold text-ink-950 dark:text-white">Application installable</p>
              <p className="mt-1 text-xs font-medium text-sentinel-700 dark:text-sentinel-200">{status}</p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-ink-600 dark:text-ink-300">
            SENTINELLE peut être installée sur ordinateur, tablette ou smartphone comme une application autonome, tout en restant connectée au serveur sécurisé.
          </p>
        </div>
        <button type="button" className="button-primary w-full sm:w-auto" onClick={install} disabled={installed}>
          {installed ? <CheckCircle2 className="h-4 w-4" /> : <Download className="h-4 w-4" />}
          {installed ? "Déjà installée" : "Installer SENTINELLE"}
        </button>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-ink-200 bg-ink-50 p-4 dark:border-white/10 dark:bg-white/5">
          <MonitorDown className="h-4 w-4 text-sentinel-700 dark:text-sentinel-200" />
          <p className="mt-2 text-sm font-semibold text-ink-950 dark:text-white">Poste de travail</p>
          <p className="mt-1 text-sm leading-6 text-ink-500 dark:text-ink-300">Installation depuis Chrome, Edge ou Safari lorsque l’icône d’installation apparaît dans la barre d’adresse.</p>
        </div>
        <div className="rounded-lg border border-ink-200 bg-ink-50 p-4 dark:border-white/10 dark:bg-white/5">
          <Smartphone className="h-4 w-4 text-sentinel-700 dark:text-sentinel-200" />
          <p className="mt-2 text-sm font-semibold text-ink-950 dark:text-white">Mobile terrain</p>
          <p className="mt-1 text-sm leading-6 text-ink-500 dark:text-ink-300">Ajout à l’écran d’accueil pour les contrôleurs et agents, avec cache applicatif et synchronisation réseau.</p>
        </div>
      </div>
    </div>
  );
}
