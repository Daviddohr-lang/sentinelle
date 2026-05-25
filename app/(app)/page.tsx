import { AlertTriangle, BarChart3, ClipboardCheck, FileWarning, ShieldCheck, UserCheck } from "lucide-react";
import Link from "next/link";
import { EvolutionChart, SeverityBars } from "@/components/simple-chart";
import { Badge, DataTable, PageHeader, ProgressBar, Section, StatCard } from "@/components/ui";
import type { Role } from "@prisma/client";
import {
  dashboardStats,
  demoControls,
  demoDocuments,
  demoNonConformities,
  getRoleDashboard,
  qualityEvolution,
  severityStats
} from "@/lib/demo-data";
import { getSessionFromCookies } from "@/lib/auth";

export default async function DashboardPage() {
  const user = await getSessionFromCookies();
  const roleDashboard = getRoleDashboard((user?.role ?? "COMPANY_ADMIN") as Role);

  return (
    <div className="space-y-8">
      <PageHeader
        title={roleDashboard.title}
        subtitle={roleDashboard.subtitle}
        action={
          <Link href="/controles/nouveau" className="button-primary">
            Nouveau contrôle
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Contrôles réalisés" value={dashboardStats.controls} trend="+14 ce mois" icon={ClipboardCheck} />
        <StatCard label="Note moyenne" value={`${dashboardStats.averageScore} %`} trend="+7 pts depuis janvier" icon={BarChart3} />
        <StatCard label="Non-conformités ouvertes" value={dashboardStats.nonConformitiesOpen} trend="2 échéances < 48h" icon={AlertTriangle} />
        <StatCard label="Documents expirants" value={dashboardStats.documentsExpiring} trend="Alerte à 4 mois active" icon={FileWarning} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <Section title="Évolution qualité">
          <EvolutionChart data={qualityEvolution} />
        </Section>
        <Section title="Gravité des non-conformités">
          <SeverityBars data={severityStats} />
        </Section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Section title="Contrôles récents">
          <DataTable
            columns={["Date", "Site", "Agent", "Statut", "Note"]}
            rows={demoControls.map((control) => [
              new Date(control.startedAt).toLocaleDateString("fr-FR"),
              control.siteName,
              control.agentName,
              <Badge key={control.id}>{control.status}</Badge>,
              <div key={`${control.id}-score`} className="min-w-32">
                <div className="mb-1 text-sm font-semibold">{control.globalScore} %</div>
                <ProgressBar value={control.globalScore} />
              </div>
            ])}
          />
        </Section>

        <Section title="Priorités opérationnelles">
          <div className="surface divide-y divide-ink-100 rounded-lg dark:divide-white/10">
            {roleDashboard.highlights.map((highlight) => (
              <div key={highlight} className="flex items-center gap-3 p-4">
                <span className="rounded-lg bg-sentinel-50 p-2 text-sentinel-700 dark:bg-sentinel-500/15 dark:text-sentinel-100">
                  <ShieldCheck className="h-4 w-4" />
                </span>
                <span className="text-sm font-medium text-ink-700 dark:text-ink-200">{highlight}</span>
              </div>
            ))}
          </div>
        </Section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Section title="Non-conformités à suivre">
          <DataTable
            columns={["Titre", "Gravité", "Statut", "Échéance"]}
            rows={demoNonConformities.map((item) => [
              item.title,
              <Badge key={`${item.id}-severity`} tone="severity">
                {item.severity}
              </Badge>,
              <Badge key={`${item.id}-status`}>{item.status}</Badge>,
              item.dueAt ? new Date(item.dueAt).toLocaleDateString("fr-FR") : "Sans échéance"
            ])}
          />
        </Section>
        <Section title="Documents sensibles">
          <DataTable
            columns={["Document", "Statut", "Périmètre", "Échéance"]}
            rows={demoDocuments.map((document) => [
              document.title,
              <Badge key={document.id}>{document.status}</Badge>,
              document.scope.replaceAll("_", " ").toLowerCase(),
              document.expiresAt ? new Date(document.expiresAt).toLocaleDateString("fr-FR") : "Non applicable"
            ])}
          />
        </Section>
      </div>

      <Section title="Préparation appels d'offres">
        <div className="surface grid gap-4 rounded-lg p-5 md:grid-cols-3">
          {[
            ["Traçabilité", "Contrôles horodatés, géolocalisés, signés et exportables."],
            ["Conformité", "Suivi CNAPS, documents, habilitations et échéances réglementaires."],
            ["Performance", "Notes, récurrences, QCM et synthèses direction consolidées."]
          ].map(([title, text]) => (
            <div key={title} className="rounded-lg bg-ink-50 p-4 dark:bg-white/5">
              <UserCheck className="h-5 w-5 text-sentinel-700 dark:text-sentinel-200" />
              <p className="mt-3 text-sm font-semibold text-ink-950 dark:text-white">{title}</p>
              <p className="mt-2 text-sm leading-6 text-ink-500 dark:text-ink-300">{text}</p>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
