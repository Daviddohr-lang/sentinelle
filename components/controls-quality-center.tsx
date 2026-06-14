"use client";

import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  ClipboardCheck,
  FileText,
  Filter,
  ListChecks,
  MapPin,
  Plus,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  TrendingUp,
  UserRoundCheck,
  X
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge, PageHeader, ProgressBar, Section, StatCard } from "@/components/ui";
import {
  buildAgentQualityTimeline,
  buildControlDashboard,
  buildControlQualityRows,
  complianceLevelSettings,
  qcmStatusLabel,
  type ComplianceLevelKey,
  type ControlQualityRow,
  type QcmCategoryKey,
  type QcmSessionLike
} from "@/lib/control-quality";
import { demoControls, demoDocuments, demoNonConformities } from "@/lib/demo-data";
import { cn, daysUntil } from "@/lib/utils";

type DrawerTab = "resume" | "qcm" | "note" | "nc" | "plan" | "history";
type DrawerIntent = DrawerTab;

type Filters = {
  query: string;
  agent: string;
  site: string;
  client: string;
  controller: string;
  complianceLevel: string;
  minScore: string;
  maxScore: string;
  hasNc: string;
  hasQcm: string;
  date: string;
};

const initialFilters: Filters = {
  query: "",
  agent: "",
  site: "",
  client: "",
  controller: "",
  complianceLevel: "",
  minScore: "",
  maxScore: "",
  hasNc: "",
  hasQcm: "",
  date: ""
};

const qcmOrder: QcmCategoryKey[] = ["ENTREPRISE", "METIER", "CLIENT_SITE"];

function formatDate(value?: string | null) {
  if (!value) return "Non renseigné";
  return new Date(value).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

function unique(values: string[]) {
  return [...new Set(values)].filter(Boolean).sort((a, b) => a.localeCompare(b, "fr"));
}

function levelClass(level: ComplianceLevelKey) {
  switch (level) {
    case "CONFORME":
      return "bg-emerald-100 text-emerald-800 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-100";
    case "RESERVE":
      return "bg-yellow-100 text-yellow-800 ring-yellow-200 dark:bg-yellow-500/15 dark:text-yellow-100";
    case "NC_MINEURE":
      return "bg-orange-100 text-orange-800 ring-orange-200 dark:bg-orange-500/15 dark:text-orange-100";
    case "NC_MAJEURE":
      return "bg-red-100 text-red-800 ring-red-200 dark:bg-red-500/15 dark:text-red-100";
    case "NC_CRITIQUE":
      return "bg-red-950 text-red-50 ring-red-700/40 dark:bg-red-500/20 dark:text-red-50";
  }
}

function qcmBadgeClass(status: string) {
  if (status === "valide" || status === "termine") return "bg-emerald-100 text-emerald-800 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-100";
  if (status === "interrompu") return "bg-red-100 text-red-800 ring-red-200 dark:bg-red-500/15 dark:text-red-100";
  if (status === "envoye" || status === "commence") return "bg-amber-100 text-amber-800 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-100";
  return "bg-ink-100 text-ink-700 ring-ink-200 dark:bg-white/10 dark:text-ink-100";
}

function hasQcm(row: ControlQualityRow) {
  return row.qcm.some((qcm) => qcm.status !== "non_envoye");
}

function nearestDueLabel(row: ControlQualityRow) {
  if (!row.nearestDueAt) return "Aucune échéance";
  const days = daysUntil(row.nearestDueAt);
  if (days === null) return formatDate(row.nearestDueAt);
  if (days < 0) return `En retard de ${Math.abs(days)} j`;
  if (days === 0) return "Aujourd'hui";
  return `Dans ${days} j`;
}

function filteredRows(rows: ControlQualityRow[], filters: Filters) {
  const query = filters.query.trim().toLowerCase();
  return rows.filter((row) => {
    const control = row.control;
    const text = `${control.agentName} ${control.siteName} ${control.clientName} ${control.controllerName} ${control.status}`.toLowerCase();
    if (query && !text.includes(query)) return false;
    if (filters.agent && control.agentName !== filters.agent) return false;
    if (filters.site && control.siteName !== filters.site) return false;
    if (filters.client && control.clientName !== filters.client) return false;
    if (filters.controller && control.controllerName !== filters.controller) return false;
    if (filters.complianceLevel && row.complianceLevel !== filters.complianceLevel) return false;
    if (filters.minScore && control.globalScore < Number(filters.minScore)) return false;
    if (filters.maxScore && control.globalScore > Number(filters.maxScore)) return false;
    if (filters.hasNc === "yes" && row.nonConformities.length === 0) return false;
    if (filters.hasNc === "no" && row.nonConformities.length > 0) return false;
    if (filters.hasQcm === "yes" && !hasQcm(row)) return false;
    if (filters.hasQcm === "no" && hasQcm(row)) return false;
    if (filters.date && !control.startedAt.startsWith(filters.date)) return false;
    return true;
  });
}

function MiniEvolution({ row }: { row: ControlQualityRow }) {
  const values = [row.previousScore ?? row.control.globalScore, row.control.globalScore, row.annualAverage, row.siteAverage, row.companyAverage];
  return (
    <div className="flex h-20 items-end gap-2">
      {values.map((value, index) => (
        <div key={index} className="flex flex-1 flex-col items-center gap-1">
          <div className="w-full rounded-t bg-sentinel-600 dark:bg-sentinel-300" style={{ height: `${Math.max(12, value * 0.62)}px` }} />
          <span className="text-[10px] font-semibold text-ink-500 dark:text-ink-300">{value}%</span>
        </div>
      ))}
    </div>
  );
}

function ActionButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="button-secondary h-9 px-3">
      {children}
    </button>
  );
}

function ControlDrawer({
  row,
  rows,
  activeTab,
  onTabChange,
  onClose
}: {
  row: ControlQualityRow | null;
  rows: ControlQualityRow[];
  activeTab: DrawerTab;
  onTabChange: (tab: DrawerTab) => void;
  onClose: () => void;
}) {
  const timeline = row ? buildAgentQualityTimeline(rows, row.control.agentName) : [];
  if (!row) return null;
  const control = row.control;
  const level = complianceLevelSettings[row.complianceLevel];
  const tabs: Array<{ id: DrawerTab; label: string }> = [
    { id: "resume", label: "Résumé" },
    { id: "qcm", label: "QCM" },
    { id: "note", label: "Note" },
    { id: "nc", label: "NC" },
    { id: "plan", label: "Plan" },
    { id: "history", label: "Historique" }
  ];

  return (
    <div className="fixed inset-0 z-50">
      <button type="button" className="absolute inset-0 bg-ink-950/40" aria-label="Fermer le panneau" onClick={onClose} />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-3xl flex-col border-l border-ink-200 bg-white shadow-2xl dark:border-white/10 dark:bg-ink-950">
        <div className="border-b border-ink-200 p-5 dark:border-white/10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="label">Contrôle qualité</p>
              <h2 className="mt-2 text-xl font-semibold text-ink-950 dark:text-white">{control.siteName}</h2>
              <p className="mt-1 text-sm text-ink-500 dark:text-ink-300">
                {control.agentName} - {formatDate(control.startedAt)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/controles/${control.id}`} className="button-primary">
                Ouvrir
                <ArrowUpRight className="h-4 w-4" />
              </Link>
              <button type="button" onClick={onClose} className="button-secondary h-10 w-10 p-0" aria-label="Fermer">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "h-9 rounded-lg px-3 text-sm font-semibold transition",
                  activeTab === tab.id ? "bg-sentinel-700 text-white" : "bg-ink-100 text-ink-700 hover:bg-ink-200 dark:bg-white/10 dark:text-ink-100"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === "resume" ? (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ["Agent", control.agentName],
                  ["Client", control.clientName],
                  ["Site", control.siteName],
                  ["Contrôleur", control.controllerName],
                  ["Date et heure", formatDate(control.startedAt)],
                  ["Géolocalisation", control.detectedAddress]
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg bg-ink-50 p-3 dark:bg-white/5">
                    <p className="label">{label}</p>
                    <p className="mt-1 text-sm font-semibold text-ink-950 dark:text-white">{value}</p>
                  </div>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <button type="button" onClick={() => onTabChange("note")} className="rounded-lg border border-ink-200 p-4 text-left dark:border-white/10">
                  <p className="label">Note</p>
                  <p className="mt-2 text-2xl font-semibold text-ink-950 dark:text-white">{control.globalScore} %</p>
                  <ProgressBar value={control.globalScore} tone={control.globalScore < 75 ? "red" : control.globalScore < 85 ? "amber" : "sentinel"} />
                </button>
                <button type="button" onClick={() => onTabChange("nc")} className="rounded-lg border border-ink-200 p-4 text-left dark:border-white/10">
                  <p className="label">Non-conformités</p>
                  <p className="mt-2 text-2xl font-semibold text-ink-950 dark:text-white">{row.nonConformities.length}</p>
                  <p className="mt-2 text-xs text-ink-500 dark:text-ink-300">{nearestDueLabel(row)}</p>
                </button>
                <button type="button" onClick={() => onTabChange("qcm")} className="rounded-lg border border-ink-200 p-4 text-left dark:border-white/10">
                  <p className="label">QCM</p>
                  <p className="mt-2 text-2xl font-semibold text-ink-950 dark:text-white">{row.qcm.filter((qcm) => qcm.status !== "non_envoye").length}/3</p>
                  <p className="mt-2 text-xs text-ink-500 dark:text-ink-300">OPS, métier, site/client</p>
                </button>
              </div>
              <div className={cn("rounded-lg px-4 py-3 text-sm font-semibold ring-1 ring-inset", levelClass(row.complianceLevel))}>{level.label}</div>
              <div className="rounded-lg border border-ink-200 p-4 dark:border-white/10">
                <p className="label">Documents liés</p>
                <div className="mt-3 grid gap-2">
                  {row.documents.length ? (
                    row.documents.map((document) => (
                      <Link key={document.id} href="/documents" className="flex items-center justify-between rounded-lg bg-ink-50 px-3 py-2 text-sm dark:bg-white/5">
                        <span>{document.title}</span>
                        <Badge>{document.status}</Badge>
                      </Link>
                    ))
                  ) : (
                    <p className="text-sm text-ink-500 dark:text-ink-300">Aucun document directement lié.</p>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === "qcm" ? (
            <div className="space-y-4">
              {qcmOrder.map((category) => {
                const qcm = row.qcm.find((item) => item.category === category);
                if (!qcm) return null;
                return (
                  <div key={category} className="rounded-lg border border-ink-200 p-4 dark:border-white/10">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-semibold text-ink-950 dark:text-white">{qcm.label}</p>
                        <p className="mt-1 text-sm text-ink-500 dark:text-ink-300">
                          Score : {qcm.score === null ? "non disponible" : `${qcm.score} %`}
                        </p>
                      </div>
                      <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset", qcmBadgeClass(qcm.status))}>
                        {qcmStatusLabel(qcm.status)}
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link href={`/qcm?controlId=${control.id}`} className="button-secondary h-9 px-3">
                        Relancer
                      </Link>
                      <ActionButton onClick={() => onTabChange("history")}>Consulter historique</ActionButton>
                      <ActionButton onClick={() => onTabChange("plan")}>Modifier l&apos;échéance</ActionButton>
                      <Link href="/parametres" className="button-secondary h-9 px-3">
                        Notifications
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}

          {activeTab === "note" ? (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-5">
                {[
                  ["Précédente", row.previousScore === null ? "N/A" : `${row.previousScore} %`],
                  ["Actuelle", `${control.globalScore} %`],
                  ["Progression", row.progression === null ? "N/A" : `${row.progression > 0 ? "+" : ""}${row.progression} pts`],
                  ["Moy. annuelle", `${row.annualAverage} %`],
                  ["Moy. site", `${row.siteAverage} %`]
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg bg-ink-50 p-3 dark:bg-white/5">
                    <p className="label">{label}</p>
                    <p className="mt-1 font-semibold text-ink-950 dark:text-white">{value}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-lg border border-ink-200 p-4 dark:border-white/10">
                <p className="label">Graphique d&apos;évolution</p>
                <MiniEvolution row={row} />
                <p className="mt-2 text-xs text-ink-500 dark:text-ink-300">Précédente, actuelle, moyenne annuelle, moyenne site, moyenne entreprise.</p>
              </div>
              <div className="space-y-3">
                {control.itemResults.map((item) => {
                  const definitionImpact = item.score - control.globalScore;
                  return (
                    <button key={item.itemId} type="button" onClick={() => onTabChange("nc")} className="w-full rounded-lg border border-ink-200 p-4 text-left dark:border-white/10">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-ink-950 dark:text-white">{item.label}</p>
                          <p className="mt-1 text-sm text-ink-500 dark:text-ink-300">
                            Impact relatif : {definitionImpact > 0 ? "+" : ""}
                            {definitionImpact} pts - coefficient visible dans le référentiel actif
                          </p>
                        </div>
                        <span className="font-semibold">{item.score} %</span>
                      </div>
                      <ProgressBar value={item.score} tone={item.score < 75 ? "red" : item.score < 85 ? "amber" : "sentinel"} />
                    </button>
                  );
                })}
              </div>
              <div className="rounded-lg bg-ink-50 p-4 text-sm leading-6 text-ink-700 dark:bg-white/5 dark:text-ink-200">
                <p className="font-semibold text-ink-950 dark:text-white">Commentaires du contrôleur</p>
                <p className="mt-1">{control.observations}</p>
              </div>
            </div>
          ) : null}

          {activeTab === "nc" ? (
            <div className="space-y-4">
              {row.nonConformities.length ? (
                row.nonConformities.map((nc) => (
                  <div key={nc.id} className="rounded-lg border border-ink-200 p-4 dark:border-white/10">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-semibold text-ink-950 dark:text-white">{nc.title}</p>
                        <p className="mt-1 text-sm leading-6 text-ink-500 dark:text-ink-300">{nc.description}</p>
                      </div>
                      <Badge tone="severity">{nc.severity}</Badge>
                    </div>
                    <div className="mt-4 grid gap-2 text-sm text-ink-600 dark:text-ink-300 sm:grid-cols-2">
                      <span>Statut : {nc.status}</span>
                      <span>Échéance : {formatDate(nc.dueAt)}</span>
                      <span>Agent : {nc.agentName}</span>
                      <span>Site : {nc.siteName}</span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link href="/non-conformites" className="button-secondary h-9 px-3">
                        Fiche NC
                      </Link>
                      <Link href={`/agents?agent=${encodeURIComponent(nc.agentName)}`} className="button-secondary h-9 px-3">
                        Agent
                      </Link>
                      <Link href={`/clients-sites?site=${encodeURIComponent(nc.siteName)}`} className="button-secondary h-9 px-3">
                        Site
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-ink-200 p-6 text-sm text-ink-500 dark:border-white/10 dark:text-ink-300">Aucune non-conformité liée à ce contrôle.</div>
              )}
            </div>
          ) : null}

          {activeTab === "plan" ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-ink-200 p-4 dark:border-white/10">
                <p className="font-semibold text-ink-950 dark:text-white">Plan d&apos;action</p>
                <div className="mt-4 space-y-3">
                  {row.nonConformities.map((nc) => (
                    <div key={nc.id} className="rounded-lg bg-ink-50 p-3 dark:bg-white/5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-ink-950 dark:text-white">{nc.title}</p>
                          <p className="mt-1 text-xs text-ink-500 dark:text-ink-300">Correction suivie jusqu&apos;à validation et clôture.</p>
                        </div>
                        <Badge>{nc.status}</Badge>
                      </div>
                    </div>
                  ))}
                  {!row.nonConformities.length ? <p className="text-sm text-ink-500 dark:text-ink-300">Aucun plan d&apos;action ouvert.</p> : null}
                </div>
              </div>
              <div className="rounded-lg bg-sentinel-50 p-4 text-sm leading-6 text-sentinel-900 dark:bg-sentinel-500/10 dark:text-sentinel-100">
                Navigation croisée : Contrôle vers NC, agent, site, client et historique qualité, sans perdre le contexte de pilotage.
              </div>
            </div>
          ) : null}

          {activeTab === "history" ? (
            <div className="space-y-4">
              <p className="text-sm text-ink-500 dark:text-ink-300">Historique qualité de {control.agentName} depuis son premier contrôle connu.</p>
              <div className="space-y-3">
                {timeline.map((item) => (
                  <Link key={item.controlId} href={`/controles/${item.controlId}`} className="flex items-center justify-between gap-3 rounded-lg border border-ink-200 p-4 dark:border-white/10">
                    <div>
                      <p className="font-semibold text-ink-950 dark:text-white">{formatDate(item.date)}</p>
                      <p className="mt-1 text-sm text-ink-500 dark:text-ink-300">{item.siteName}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-ink-950 dark:text-white">{item.score} %</p>
                      <p className="text-xs text-ink-500 dark:text-ink-300">{item.delta === null ? "Premier contrôle" : `${item.delta > 0 ? "+" : ""}${item.delta} pts`}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

export function ControlsQualityCenter() {
  const [qcmSessions, setQcmSessions] = useState<QcmSessionLike[]>([]);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [selectedControlId, setSelectedControlId] = useState<string | null>(demoControls[0]?.id ?? null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>("resume");

  useEffect(() => {
    let ignore = false;
    async function loadQcm() {
      try {
        const response = await fetch("/api/qcms", { cache: "no-store" });
        if (!response.ok) return;
        const payload = await response.json();
        if (!ignore) setQcmSessions(payload.sessions ?? []);
      } catch {
        if (!ignore) setQcmSessions([]);
      }
    }
    void loadQcm();
    return () => {
      ignore = true;
    };
  }, []);

  const rows = useMemo(
    () => buildControlQualityRows({ controls: demoControls, nonConformities: demoNonConformities, documents: demoDocuments, qcmSessions }),
    [qcmSessions]
  );
  const visibleRows = useMemo(() => filteredRows(rows, filters), [filters, rows]);
  const dashboard = useMemo(() => buildControlDashboard(rows), [rows]);
  const selectedRow = rows.find((row) => row.control.id === selectedControlId) ?? rows[0] ?? null;

  const filterOptions = useMemo(
    () => ({
      agents: unique(rows.map((row) => row.control.agentName)),
      sites: unique(rows.map((row) => row.control.siteName)),
      clients: unique(rows.map((row) => row.control.clientName)),
      controllers: unique(rows.map((row) => row.control.controllerName))
    }),
    [rows]
  );

  function openDrawer(controlId: string, intent: DrawerIntent) {
    setSelectedControlId(controlId);
    setDrawerTab(intent);
    setDrawerOpen(true);
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Contrôles qualité"
        subtitle="Centre de pilotage qualité : conformité, QCM, non-conformités, échéances, évolution et navigation croisée."
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/criteres-controle" className="button-secondary">
              <ListChecks className="h-4 w-4" />
              Critères
            </Link>
            <Link href="/controles/nouveau" className="button-primary">
              <Plus className="h-4 w-4" />
              Lancer un contrôle
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Contrôles du mois" value={dashboard.controlsThisMonth} trend="Historique qualité actif" icon={ClipboardCheck} />
        <StatCard label="Conformité moyenne" value={`${dashboard.averageCompliance} %`} trend="Tous sites confondus" icon={TrendingUp} />
        <StatCard label="NC ouvertes" value={dashboard.openNonConformities} trend={`${dashboard.criticalNonConformities} critique(s)`} icon={ShieldAlert} />
        <StatCard label="QCM en attente" value={dashboard.pendingQcm} trend="Envoyés, commencés ou interrompus" icon={UserRoundCheck} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="surface rounded-lg p-5">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-sentinel-700 dark:text-sentinel-200" />
            <h2 className="text-base font-semibold text-ink-950 dark:text-white">Top agents</h2>
          </div>
          <div className="mt-4 space-y-3">
            {dashboard.topAgents.slice(0, 3).map((agent) => (
              <button key={agent.agentName} type="button" onClick={() => setFilters((current) => ({ ...current, agent: agent.agentName }))} className="w-full text-left">
                <div className="mb-1 flex justify-between text-sm">
                  <span>{agent.agentName}</span>
                  <span className="font-semibold">{agent.average} %</span>
                </div>
                <ProgressBar value={agent.average} />
              </button>
            ))}
          </div>
        </div>
        <div className="surface rounded-lg p-5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <h2 className="text-base font-semibold text-ink-950 dark:text-white">Sites sensibles</h2>
          </div>
          <div className="mt-4 space-y-3">
            {dashboard.sensitiveSites.slice(0, 3).map((site) => (
              <button key={site.siteName} type="button" onClick={() => setFilters((current) => ({ ...current, site: site.siteName }))} className="flex w-full items-center justify-between rounded-lg bg-ink-50 px-3 py-2 text-left text-sm dark:bg-white/5">
                <span>{site.siteName}</span>
                <span className="font-semibold">{site.nonConformities} NC</span>
              </button>
            ))}
          </div>
        </div>
        <div className="surface rounded-lg p-5">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-sentinel-700 dark:text-sentinel-200" />
            <h2 className="text-base font-semibold text-ink-950 dark:text-white">Alertes qualité</h2>
          </div>
          <div className="mt-4 grid gap-3 text-sm text-ink-600 dark:text-ink-300">
            <Link href="/documents" className="flex justify-between rounded-lg bg-ink-50 px-3 py-2 dark:bg-white/5">
              <span>Documents expirants</span>
              <strong>{dashboard.expiringDocuments}</strong>
            </Link>
            <button type="button" onClick={() => setFilters((current) => ({ ...current, hasNc: "yes" }))} className="flex justify-between rounded-lg bg-ink-50 px-3 py-2 text-left dark:bg-white/5">
              <span>Contrôles avec NC</span>
              <strong>{rows.filter((row) => row.nonConformities.length).length}</strong>
            </button>
            <button type="button" onClick={() => setFilters((current) => ({ ...current, hasQcm: "yes" }))} className="flex justify-between rounded-lg bg-ink-50 px-3 py-2 text-left dark:bg-white/5">
              <span>Contrôles avec QCM</span>
              <strong>{rows.filter(hasQcm).length}</strong>
            </button>
          </div>
        </div>
      </div>

      <Section title="Filtres intelligents" action={<SlidersHorizontal className="h-4 w-4 text-ink-500" />}>
        <div className="surface rounded-lg p-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <div className="xl:col-span-2">
              <label className="label">Recherche</label>
              <div className="relative mt-2">
                <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-ink-400" />
                <input value={filters.query} onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))} className="field pl-9" placeholder="Agent, site, client..." />
              </div>
            </div>
            {[
              ["agent", "Agent", filterOptions.agents],
              ["site", "Site", filterOptions.sites],
              ["client", "Client", filterOptions.clients],
              ["controller", "Contrôleur", filterOptions.controllers]
            ].map(([key, label, options]) => (
              <div key={key as string}>
                <label className="label">{label as string}</label>
                <select value={filters[key as keyof Filters]} onChange={(event) => setFilters((current) => ({ ...current, [key as string]: event.target.value }))} className="field mt-2">
                  <option value="">Tous</option>
                  {(options as string[]).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            <div>
              <label className="label">Niveau</label>
              <select value={filters.complianceLevel} onChange={(event) => setFilters((current) => ({ ...current, complianceLevel: event.target.value }))} className="field mt-2">
                <option value="">Tous</option>
                {Object.entries(complianceLevelSettings).map(([key, setting]) => (
                  <option key={key} value={key}>
                    {setting.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Note min.</label>
              <input type="number" value={filters.minScore} onChange={(event) => setFilters((current) => ({ ...current, minScore: event.target.value }))} className="field mt-2" />
            </div>
            <div>
              <label className="label">Note max.</label>
              <input type="number" value={filters.maxScore} onChange={(event) => setFilters((current) => ({ ...current, maxScore: event.target.value }))} className="field mt-2" />
            </div>
            <div>
              <label className="label">Présence NC</label>
              <select value={filters.hasNc} onChange={(event) => setFilters((current) => ({ ...current, hasNc: event.target.value }))} className="field mt-2">
                <option value="">Tous</option>
                <option value="yes">Avec NC</option>
                <option value="no">Sans NC</option>
              </select>
            </div>
            <div>
              <label className="label">Présence QCM</label>
              <select value={filters.hasQcm} onChange={(event) => setFilters((current) => ({ ...current, hasQcm: event.target.value }))} className="field mt-2">
                <option value="">Tous</option>
                <option value="yes">Avec QCM</option>
                <option value="no">Sans QCM</option>
              </select>
            </div>
            <div>
              <label className="label">Date</label>
              <input type="date" value={filters.date} onChange={(event) => setFilters((current) => ({ ...current, date: event.target.value }))} className="field mt-2" />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setFilters(initialFilters)} className="button-secondary">
              <Filter className="h-4 w-4" />
              Réinitialiser
            </button>
            <span className="text-sm text-ink-500 dark:text-ink-300">{visibleRows.length} contrôle(s) affiché(s)</span>
          </div>
        </div>
      </Section>

      <Section title="Historique des contrôles">
        <div className="surface overflow-hidden rounded-lg">
          <div className="overflow-x-auto">
            <table className="min-w-[1280px] divide-y divide-ink-200 text-sm dark:divide-white/10">
              <thead className="bg-ink-50 text-left text-xs font-semibold uppercase text-ink-500 dark:bg-white/5 dark:text-ink-300">
                <tr>
                  {["Date", "Site", "Agent", "Statut", "Niveau de conformité", "Note", "NC", "Échéance", "Évolution", "QCM", "Ouvrir"].map((column) => (
                    <th key={column} className="px-4 py-3">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100 dark:divide-white/10">
                {visibleRows.map((row) => {
                  const control = row.control;
                  const level = complianceLevelSettings[row.complianceLevel];
                  return (
                    <tr key={control.id} className="align-top hover:bg-ink-50/70 dark:hover:bg-white/5">
                      <td className="px-4 py-3">
                        <button type="button" onClick={() => openDrawer(control.id, "resume")} className="text-left font-semibold text-ink-800 hover:text-sentinel-800 dark:text-ink-100">
                          {formatDate(control.startedAt)}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <button type="button" onClick={() => openDrawer(control.id, "history")} className="inline-flex items-center gap-2 text-left text-ink-700 hover:text-sentinel-800 dark:text-ink-200">
                          <MapPin className="h-4 w-4 text-sentinel-700" />
                          {control.siteName}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <button type="button" onClick={() => openDrawer(control.id, "history")} className="font-semibold text-sentinel-800 hover:underline dark:text-sentinel-100">
                          {control.agentName}
                        </button>
                        <p className="mt-1 text-xs text-ink-500 dark:text-ink-300">{control.clientName}</p>
                      </td>
                      <td className="px-4 py-3">
                        <button type="button" onClick={() => openDrawer(control.id, control.status === "EN_ATTENTE_QCM" ? "qcm" : "resume")}>
                          <Badge>{control.status}</Badge>
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <button type="button" onClick={() => setFilters((current) => ({ ...current, complianceLevel: row.complianceLevel }))} className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset", levelClass(row.complianceLevel))}>
                          {level.label}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <button type="button" onClick={() => openDrawer(control.id, "note")} className="min-w-32 text-left">
                          <div className="mb-1 font-semibold text-ink-950 dark:text-white">{control.globalScore} %</div>
                          <ProgressBar value={control.globalScore} tone={control.globalScore < 75 ? "red" : control.globalScore < 85 ? "amber" : "sentinel"} />
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <button type="button" onClick={() => openDrawer(control.id, "nc")} className="font-semibold text-ink-800 hover:text-sentinel-800 dark:text-ink-100">
                          {row.nonConformities.length}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <button type="button" onClick={() => openDrawer(control.id, "plan")} className="text-left text-ink-700 hover:text-sentinel-800 dark:text-ink-200">
                          {nearestDueLabel(row)}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <button type="button" onClick={() => openDrawer(control.id, "history")} className={cn("font-semibold", row.progression === null ? "text-ink-500" : row.progression >= 0 ? "text-emerald-700 dark:text-emerald-200" : "text-red-700 dark:text-red-200")}>
                          {row.progression === null ? "Premier" : `${row.progression > 0 ? "+" : ""}${row.progression} pts`}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <button type="button" onClick={() => openDrawer(control.id, "qcm")} className="flex flex-wrap gap-1">
                          {row.qcm.map((qcm) => (
                            <span key={qcm.category} className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset", qcmBadgeClass(qcm.status))}>
                              {qcmStatusLabel(qcm.status)}
                            </span>
                          ))}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/controles/${control.id}`} className="button-secondary h-9 px-3">
                          Ouvrir
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      <Section title="Niveaux de conformité paramétrables">
        <div className="grid gap-3 lg:grid-cols-5">
          {Object.entries(complianceLevelSettings).map(([key, setting]) => (
            <button key={key} type="button" onClick={() => setFilters((current) => ({ ...current, complianceLevel: key }))} className={cn("rounded-lg p-4 text-left ring-1 ring-inset", levelClass(key as ComplianceLevelKey))}>
              <p className="font-semibold">{setting.label}</p>
              <p className="mt-2 text-xs">Seuil {setting.minScore}-{setting.maxScore} %, clé stats {setting.statisticKey}</p>
              <p className="mt-3 text-2xl font-semibold">{dashboard.byComplianceLevel[key as ComplianceLevelKey]}</p>
            </button>
          ))}
        </div>
      </Section>

      {drawerOpen ? <ControlDrawer row={selectedRow} rows={rows} activeTab={drawerTab} onTabChange={setDrawerTab} onClose={() => setDrawerOpen(false)} /> : null}
    </div>
  );
}
