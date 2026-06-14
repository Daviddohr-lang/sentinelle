"use client";

import { Download, Eye, FileText, RefreshCw, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Badge, ProgressBar } from "@/components/ui";

type ReportLink = {
  type: string;
  label: string;
  url: string;
};

type ReportForm = {
  id: string;
  startedAt?: string | null;
  completedAt?: string | null;
  agentName: string;
  clientName: string;
  siteName: string;
  globalScore: number;
  complianceLevel: string;
  nonConformitiesCount: number;
  reports: ReportLink[];
};

export function ReportFormsManager() {
  const [forms, setForms] = useState<ReportForm[]>([]);
  const [status, setStatus] = useState("Chargement des formulaires PDF...");
  const [downloadState, setDownloadState] = useState<Record<string, { message: string; url?: string }>>({});
  const blobUrlsRef = useRef<string[]>([]);

  async function loadForms() {
    setStatus("Chargement des formulaires PDF...");
    try {
      const response = await fetch("/api/reports/forms");
      if (!response.ok) throw new Error("Rapports indisponibles");
      const data = await response.json();
      setForms(data.forms ?? []);
      setStatus(`${data.forms?.length ?? 0} contrôle(s) avec formulaire PDF disponible.`);
    } catch {
      setStatus("Impossible de charger les formulaires PDF.");
    }
  }

  useEffect(() => {
    loadForms();
  }, []);

  useEffect(() => {
    const blobUrls = blobUrlsRef.current;
    return () => {
      blobUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  function downloadUrl(url: string) {
    return `${url}${url.includes("?") ? "&" : "?"}download=1`;
  }

  function previewUrl(url: string) {
    return `${url}${url.includes("?") ? "&" : "?"}preview=1`;
  }

  function reportKey(form: ReportForm, report: ReportLink) {
    return `${form.id}-${report.type}`;
  }

  function reportFileName(form: ReportForm, report: ReportLink) {
    const label = `${form.siteName}-${form.agentName}-${report.label}`
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase();
    return `sentinelle-${label || report.type.toLowerCase()}.pdf`;
  }

  async function handleDownload(form: ReportForm, report: ReportLink) {
    const key = reportKey(form, report);
    setDownloadState((current) => ({ ...current, [key]: { message: "Génération du PDF..." } }));

    try {
      const response = await fetch(downloadUrl(report.url));
      if (!response.ok) throw new Error("PDF indisponible");

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      blobUrlsRef.current.push(objectUrl);

      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = reportFileName(form, report);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      setDownloadState((current) => ({
        ...current,
        [key]: {
          message: "PDF généré. Si aucun fichier n'apparaît, ouvrez le PDF avec le lien de secours.",
          url: objectUrl
        }
      }));
    } catch {
      setDownloadState((current) => ({
        ...current,
        [key]: {
          message: "Téléchargement impossible depuis ce navigateur. Utilisez l'aperçu puis Imprimer / enregistrer en PDF."
        }
      }));
    }
  }

  return (
    <div className="space-y-4">
      <div className="surface rounded-lg p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-ink-950 dark:text-white">
              <ShieldCheck className="h-4 w-4 text-sentinel-700 dark:text-sentinel-200" />
              Formulaires PDF par destinataire
            </p>
            <p className="mt-1 text-sm text-ink-500 dark:text-ink-300">{status}</p>
          </div>
          <button type="button" onClick={loadForms} className="button-secondary">
            <RefreshCw className="h-4 w-4" />
            Actualiser
          </button>
        </div>
      </div>

      {forms.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {forms.map((form) => (
            <div key={form.id} className="surface rounded-lg p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-ink-950 dark:text-white">{form.siteName}</p>
                  <p className="mt-1 text-sm text-ink-500 dark:text-ink-300">
                    {form.clientName} · {form.agentName}
                  </p>
                </div>
                <Badge tone="neutral">{form.complianceLevel}</Badge>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-[120px_1fr] sm:items-center">
                <div>
                  <p className="text-xs font-semibold uppercase text-ink-500 dark:text-ink-300">Note globale</p>
                  <p className="mt-1 text-2xl font-semibold text-ink-950 dark:text-white">{form.globalScore} %</p>
                </div>
                <ProgressBar value={form.globalScore} tone={form.globalScore < 70 ? "red" : form.globalScore < 85 ? "amber" : "sentinel"} />
              </div>
              <div className="mt-4 grid gap-3">
                {form.reports.map((report) => {
                  const key = reportKey(form, report);
                  const currentDownload = downloadState[key];
                  return (
                    <div key={report.type} className="rounded-lg border border-ink-200 p-3 dark:border-white/10">
                      <p className="mb-2 text-xs font-semibold uppercase text-ink-500 dark:text-ink-300">{report.label}</p>
                      <div className="flex flex-wrap gap-2">
                        <a href={previewUrl(report.url)} className="button-secondary">
                          <Eye className="h-4 w-4" />
                          Voir l&apos;aperçu
                        </a>
                        <button type="button" onClick={() => void handleDownload(form, report)} className="button-secondary">
                          <Download className="h-4 w-4" />
                          Télécharger
                        </button>
                        {currentDownload?.url ? (
                          <a href={currentDownload.url} target="_blank" rel="noreferrer" className="button-secondary">
                            Ouvrir le PDF
                          </a>
                        ) : null}
                      </div>
                      {currentDownload?.message ? <p className="mt-2 text-xs font-medium text-ink-500 dark:text-ink-300">{currentDownload.message}</p> : null}
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 flex items-center gap-2 text-xs font-medium text-ink-500 dark:text-ink-300">
                <FileText className="h-4 w-4" />
                PDF généré à partir des constats, notes, QCM et prescriptions du contrôle.
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="surface rounded-lg p-8 text-center">
          <p className="text-sm font-semibold text-ink-950 dark:text-white">Aucun formulaire PDF disponible pour ce profil.</p>
          <p className="mt-2 text-sm text-ink-500 dark:text-ink-300">Un contrôle dynamique doit être enregistré pour générer les rapports par destinataire.</p>
        </div>
      )}
    </div>
  );
}
