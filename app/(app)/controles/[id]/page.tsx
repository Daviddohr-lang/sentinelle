import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, History, MapPin, Send, ShieldAlert, TrendingUp, UserRound } from "lucide-react";
import { Badge, PageHeader, ProgressBar, Section, StatCard } from "@/components/ui";
import { buildAgentQualityTimeline, buildControlQualityRows, complianceLevelSettings, qcmStatusLabel } from "@/lib/control-quality";
import { demoControls, demoDocuments, demoNonConformities, demoQcmSessions } from "@/lib/demo-data";
import { cn } from "@/lib/utils";

function formatDate(value?: string | null) {
  if (!value) return "Non renseigné";
  return new Date(value).toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "short" });
}

function levelClass(key: keyof typeof complianceLevelSettings) {
  if (key === "CONFORME") return "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-100";
  if (key === "RESERVE") return "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/15 dark:text-yellow-100";
  if (key === "NC_MINEURE") return "bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-100";
  if (key === "NC_MAJEURE") return "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-100";
  return "bg-red-950 text-red-50 dark:bg-red-500/20 dark:text-red-50";
}

export default async function ControlDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = buildControlQualityRows({
    controls: demoControls,
    nonConformities: demoNonConformities,
    documents: demoDocuments,
    qcmSessions: demoQcmSessions
  });
  const row = rows.find((item) => item.control.id === id);
  if (!row) notFound();

  const control = row.control;
  const level = complianceLevelSettings[row.complianceLevel];
  const timeline = buildAgentQualityTimeline(rows, control.agentName);

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Contrôle - ${control.siteName}`}
        subtitle="Fiche complète du contrôle qualité avec note, QCM, non-conformités, documents et historique agent."
        action={
          <Link href="/controles" className="button-secondary">
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Note globale" value={`${control.globalScore} %`} trend={row.progression === null ? "Premier contrôle connu" : `${row.progression > 0 ? "+" : ""}${row.progression} pts`} icon={TrendingUp} />
        <StatCard label="Non-conformités" value={row.nonConformities.length} trend={row.nearestDueAt ? `Échéance ${formatDate(row.nearestDueAt)}` : "Aucune échéance"} icon={ShieldAlert} />
        <StatCard label="QCM suivis" value={`${row.qcm.filter((qcm) => qcm.status !== "non_envoye").length}/3`} trend="OPS, métier, site/client" icon={Send} />
        <StatCard label="Documents liés" value={row.documents.length} trend="Agent, site ou client" icon={FileText} />
      </div>

      <Section title="Résumé opérationnel">
        <div className="surface rounded-lg p-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[
              ["Agent", control.agentName],
              ["Client", control.clientName],
              ["Site", control.siteName],
              ["Contrôleur", control.controllerName],
              ["Date", formatDate(control.startedAt)],
              ["Adresse détectée", control.detectedAddress]
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg bg-ink-50 p-4 dark:bg-white/5">
                <p className="label">{label}</p>
                <p className="mt-2 font-semibold text-ink-950 dark:text-white">{value}</p>
              </div>
            ))}
          </div>
          <div className={cn("mt-5 rounded-lg p-4 text-sm font-semibold", levelClass(row.complianceLevel))}>{level.label}</div>
        </div>
      </Section>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Section title="Détail de la note">
          <div className="surface rounded-lg p-5">
            <div className="mb-5">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span>Note actuelle</span>
                <strong>{control.globalScore} %</strong>
              </div>
              <ProgressBar value={control.globalScore} tone={control.globalScore < 75 ? "red" : control.globalScore < 85 ? "amber" : "sentinel"} />
            </div>
            <div className="space-y-3">
              {control.itemResults.map((item) => (
                <div key={item.itemId} className="rounded-lg border border-ink-200 p-4 dark:border-white/10">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-ink-950 dark:text-white">{item.label}</p>
                      <p className="mt-1 text-sm text-ink-500 dark:text-ink-300">
                        Impact sur la note : {item.compliant ? "positif" : "non-conformité liée possible"}
                      </p>
                    </div>
                    <span className="font-semibold">{item.score} %</span>
                  </div>
                  <div className="mt-3">
                    <ProgressBar value={item.score} tone={item.score < 75 ? "red" : item.score < 85 ? "amber" : "sentinel"} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-lg bg-ink-50 p-4 text-sm leading-6 text-ink-700 dark:bg-white/5 dark:text-ink-200">
              <p className="font-semibold text-ink-950 dark:text-white">Commentaire contrôleur</p>
              <p className="mt-1">{control.observations}</p>
            </div>
          </div>
        </Section>

        <Section title="Navigation croisée">
          <div className="surface space-y-3 rounded-lg p-5">
            <Link href={`/agents?agent=${encodeURIComponent(control.agentName)}`} className="flex items-center justify-between rounded-lg bg-ink-50 px-4 py-3 text-sm font-semibold dark:bg-white/5">
              <span className="inline-flex items-center gap-2">
                <UserRound className="h-4 w-4" />
                Fiche agent
              </span>
              <span>{control.agentName}</span>
            </Link>
            <Link href={`/clients-sites?site=${encodeURIComponent(control.siteName)}`} className="flex items-center justify-between rounded-lg bg-ink-50 px-4 py-3 text-sm font-semibold dark:bg-white/5">
              <span className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Fiche site
              </span>
              <span>{control.siteName}</span>
            </Link>
            <Link href="/non-conformites" className="flex items-center justify-between rounded-lg bg-ink-50 px-4 py-3 text-sm font-semibold dark:bg-white/5">
              <span className="inline-flex items-center gap-2">
                <ShieldAlert className="h-4 w-4" />
                Module non-conformités
              </span>
              <span>{row.nonConformities.length}</span>
            </Link>
            <Link href={`/qcm?controlId=${control.id}`} className="flex items-center justify-between rounded-lg bg-ink-50 px-4 py-3 text-sm font-semibold dark:bg-white/5">
              <span className="inline-flex items-center gap-2">
                <Send className="h-4 w-4" />
                Gestion QCM
              </span>
              <span>Ouvrir</span>
            </Link>
          </div>
        </Section>
      </div>

      <Section title="QCM du contrôle">
        <div className="grid gap-4 md:grid-cols-3">
          {row.qcm.map((qcm) => (
            <div key={qcm.category} className="surface rounded-lg p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink-950 dark:text-white">{qcm.label}</p>
                  <p className="mt-1 text-sm text-ink-500 dark:text-ink-300">{qcm.score === null ? "Score non disponible" : `${qcm.score} %`}</p>
                </div>
                <Badge>{qcmStatusLabel(qcm.status)}</Badge>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Non-conformités liées">
        <div className="grid gap-4 lg:grid-cols-2">
          {row.nonConformities.length ? (
            row.nonConformities.map((nc) => (
              <div key={nc.id} className="surface rounded-lg p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink-950 dark:text-white">{nc.title}</p>
                    <p className="mt-2 text-sm leading-6 text-ink-500 dark:text-ink-300">{nc.description}</p>
                  </div>
                  <Badge tone="severity">{nc.severity}</Badge>
                </div>
                <div className="mt-4 grid gap-2 text-sm text-ink-600 dark:text-ink-300 sm:grid-cols-2">
                  <span>Statut : {nc.status}</span>
                  <span>Échéance : {formatDate(nc.dueAt)}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="surface rounded-lg p-6 text-sm text-ink-500 dark:text-ink-300">Aucune non-conformité liée.</div>
          )}
        </div>
      </Section>

      <Section title="Historique qualité agent">
        <div className="surface rounded-lg p-5">
          <div className="space-y-3">
            {timeline.map((item) => (
              <Link key={item.controlId} href={`/controles/${item.controlId}`} className="flex items-center justify-between gap-3 rounded-lg border border-ink-200 p-4 dark:border-white/10">
                <div>
                  <p className="font-semibold text-ink-950 dark:text-white">
                    <History className="mr-2 inline h-4 w-4" />
                    {formatDate(item.date)}
                  </p>
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
      </Section>
    </div>
  );
}
