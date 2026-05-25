import { Activity, BarChart3, FileSpreadsheet, Users } from "lucide-react";
import { EvolutionChart, SeverityBars } from "@/components/simple-chart";
import { PageHeader, Section, StatCard } from "@/components/ui";
import { dashboardStats, qualityEvolution, severityStats } from "@/lib/demo-data";

export default function StatisticsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Tableaux de bord statistiques"
        subtitle="Indicateurs par entreprise, client, site, agent, documents, QCM, fréquence d'utilisation et exports."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Connexions" value={dashboardStats.monthlyLogins} trend="Activité mensuelle" icon={Activity} />
        <StatCard label="QCM réalisés" value={dashboardStats.qcmCompleted} trend={`Score moyen ${dashboardStats.qcmAverageScore} %`} icon={Users} />
        <StatCard label="Exports disponibles" value="3" trend="Excel, CSV, PDF" icon={FileSpreadsheet} />
        <StatCard label="Score qualité" value={`${dashboardStats.averageScore} %`} trend="Tous sites consolidés" icon={BarChart3} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <Section title="Progression qualité annuelle">
          <EvolutionChart data={qualityEvolution} />
        </Section>
        <Section title="Non-conformités par gravité">
          <SeverityBars data={severityStats} />
        </Section>
      </div>

      <Section title="Synthèse mensuelle direction">
        <div className="surface grid gap-4 rounded-lg p-5 md:grid-cols-3">
          {[
            ["Analyse automatique", "La qualité progresse, avec une récurrence sur la traçabilité main courante."],
            ["Sites à surveiller", "Priorité aux sites logistiques de nuit et aux postes isolés."],
            ["Recommandations", "Briefing ciblé, contrôle documentaire et QCM client renforcé."]
          ].map(([title, text]) => (
            <div key={title} className="rounded-lg bg-ink-50 p-4 dark:bg-white/5">
              <p className="text-sm font-semibold text-ink-950 dark:text-white">{title}</p>
              <p className="mt-2 text-sm leading-6 text-ink-500 dark:text-ink-300">{text}</p>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
