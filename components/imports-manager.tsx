"use client";

import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { Badge, DataTable } from "@/components/ui";

type ImportType = "agents" | "clients-sites" | "qcm" | "control-points";
type DuplicateMode = "skip" | "update" | "reject";

type PreviewRow = {
  rowNumber: number;
  key: string;
  label: string;
  data: Record<string, unknown>;
  errors: string[];
  warnings: string[];
  exists?: boolean;
  operation?: string;
};

type PreviewResponse = {
  type: ImportType;
  filename: string;
  companyId: string | null;
  globalErrors: string[];
  rows: PreviewRow[];
  summary: {
    total: number;
    errors: number;
    warnings: number;
    duplicates: number;
    creatable: number;
  };
};

type ImportReport = {
  created: number;
  updated: number;
  skipped: number;
  rejected: number;
  errors: string[];
};

const importTypeOptions: Array<{ value: ImportType; label: string; description: string }> = [
  { value: "agents", label: "Agents", description: "Agents, qualifications, cartes professionnelles et échéances." },
  { value: "clients-sites", label: "Clients & sites", description: "Clients et création automatique des sites associés." },
  { value: "qcm", label: "QCM", description: "Banques de questions, questions et réponses possibles." },
  { value: "control-points", label: "Points de contrôle", description: "Thématiques, points, réponses, gravité, délai et incidences." }
];

const duplicateModes: Array<{ value: DuplicateMode; label: string; description: string }> = [
  { value: "skip", label: "Ignorer les doublons", description: "Les lignes déjà existantes ne sont pas modifiées." },
  { value: "update", label: "Mettre à jour", description: "Les lignes déjà existantes sont actualisées avec le fichier Excel." },
  { value: "reject", label: "Refuser les doublons", description: "L'import signale une erreur si une donnée existe déjà." }
];

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error ?? "Action impossible");
  return body as T;
}

export function ImportsManager() {
  const [type, setType] = useState<ImportType>("agents");
  const [duplicateMode, setDuplicateMode] = useState<DuplicateMode>("skip");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canImport = useMemo(() => {
    if (!preview) return false;
    return preview.globalErrors.length === 0 && preview.rows.length > 0 && preview.rows.every((row) => row.errors.length === 0);
  }, [preview]);

  async function previewFile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setError("Sélectionnez un fichier Excel.");
      return;
    }
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const formData = new FormData();
      formData.set("type", type);
      formData.set("file", file);
      const result = await requestJson<PreviewResponse>("/api/imports/preview", { method: "POST", body: formData });
      setPreview(result);
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : "Prévisualisation impossible");
    } finally {
      setLoading(false);
    }
  }

  async function commitImport() {
    if (!preview) return;
    setImporting(true);
    setError(null);
    setReport(null);
    try {
      const result = await requestJson<{ report: ImportReport }>("/api/imports/commit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: preview.type, duplicateMode, rows: preview.rows })
      });
      setReport(result.report);
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Import impossible");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <form onSubmit={previewFile} className="surface rounded-lg p-5">
          <div className="flex items-start gap-3">
            <span className="rounded-lg bg-sentinel-50 p-2 text-sentinel-700 dark:bg-sentinel-500/15 dark:text-sentinel-100">
              <FileSpreadsheet className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-ink-950 dark:text-white">Importer un fichier Excel</h2>
              <p className="mt-1 text-sm leading-6 text-ink-500 dark:text-ink-300">Prévisualisez les lignes, corrigez les erreurs, puis validez l&apos;import en base.</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="label">Type d&apos;import</span>
              <select className="field mt-2" value={type} onChange={(event) => setType(event.target.value as ImportType)}>
                {importTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="label">Gestion des doublons</span>
              <select className="field mt-2" value={duplicateMode} onChange={(event) => setDuplicateMode(event.target.value as DuplicateMode)}>
                {duplicateModes.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-4 rounded-lg border border-dashed border-ink-300 bg-ink-50 p-5 dark:border-white/15 dark:bg-white/5">
            <label className="flex cursor-pointer flex-col items-center justify-center gap-3 text-center">
              <Upload className="h-6 w-6 text-sentinel-700 dark:text-sentinel-100" />
              <span className="text-sm font-semibold text-ink-950 dark:text-white">{file ? file.name : "Choisir un fichier .xlsx"}</span>
              <span className="text-xs leading-5 text-ink-500 dark:text-ink-300">Les fichiers sont contrôlés avant import. Les lignes avec erreurs ne sont jamais enregistrées.</span>
              <input type="file" accept=".xlsx,.xls" className="sr-only" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
            </label>
          </div>

          {error ? <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:bg-red-500/15 dark:text-red-100">{error}</p> : null}

          <div className="mt-5 flex flex-wrap gap-2">
            <button className="button-primary" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
              Prévisualiser
            </button>
            {preview ? (
              <button type="button" className="button-secondary" disabled={!canImport || importing} onClick={() => void commitImport()}>
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Valider l&apos;import
              </button>
            ) : null}
          </div>
        </form>

        <div className="surface rounded-lg p-5">
          <h2 className="text-base font-semibold text-ink-950 dark:text-white">Modèles standards</h2>
          <p className="mt-2 text-sm leading-6 text-ink-500 dark:text-ink-300">Téléchargez les modèles, conservez les en-têtes, puis importez le fichier rempli.</p>
          <div className="mt-4 grid gap-2">
            <a className="button-primary justify-center" href="/api/imports/templates?type=all">
              <Download className="h-4 w-4" />
              Tous les modèles
            </a>
            {importTypeOptions.map((option) => (
              <a key={option.value} className="button-secondary justify-between" href={`/api/imports/templates?type=${option.value}`}>
                <span>{option.label}</span>
                <Download className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
      </div>

      {preview ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <PreviewStat label="Lignes" value={preview.summary.total} />
            <PreviewStat label="Créations" value={preview.summary.creatable} />
            <PreviewStat label="Doublons" value={preview.summary.duplicates} />
            <PreviewStat label="Alertes" value={preview.summary.warnings} />
            <PreviewStat label="Erreurs" value={preview.summary.errors} tone={preview.summary.errors ? "red" : "green"} />
          </div>

          {preview.globalErrors.length ? (
            <div className="rounded-lg bg-red-50 p-4 text-sm font-semibold text-red-700 dark:bg-red-500/15 dark:text-red-100">
              {preview.globalErrors.map((item) => (
                <p key={item}>{item}</p>
              ))}
            </div>
          ) : null}

          <DataTable
            columns={["Ligne", "État", "Libellé", "Clé", "Erreurs", "Alertes"]}
            rows={preview.rows.slice(0, 100).map((row) => [
              row.rowNumber,
              row.errors.length ? <Badge tone="severity">CRITIQUE</Badge> : row.exists ? <Badge>doublon</Badge> : <Badge>création</Badge>,
              row.label,
              row.key || "non renseigné",
              row.errors.length ? row.errors.join(", ") : "Aucune",
              row.warnings.length ? row.warnings.join(", ") : "Aucune"
            ])}
          />
        </div>
      ) : null}

      {report ? (
        <div className="surface rounded-lg p-5">
          <div className="flex items-start gap-3">
            {report.errors.length ? <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" /> : <CheckCircle2 className="mt-0.5 h-5 w-5 text-sentinel-700 dark:text-sentinel-100" />}
            <div>
              <h2 className="text-base font-semibold text-ink-950 dark:text-white">Rapport d&apos;import</h2>
              <p className="mt-2 text-sm leading-6 text-ink-500 dark:text-ink-300">
                Créés : {report.created} · Mis à jour : {report.updated} · Ignorés : {report.skipped} · Refusés : {report.rejected}
              </p>
              {report.errors.length ? (
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-amber-700 dark:text-amber-100">
                  {report.errors.slice(0, 12).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PreviewStat({ label, value, tone = "neutral" }: { label: string; value: number; tone?: "neutral" | "red" | "green" }) {
  return (
    <div className="surface rounded-lg p-4">
      <p className="text-sm font-medium text-ink-500 dark:text-ink-300">{label}</p>
      <p className={tone === "red" ? "mt-2 text-2xl font-semibold text-red-700 dark:text-red-100" : tone === "green" ? "mt-2 text-2xl font-semibold text-sentinel-700 dark:text-sentinel-100" : "mt-2 text-2xl font-semibold text-ink-950 dark:text-white"}>{value}</p>
    </div>
  );
}
