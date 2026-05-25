import { Download, FileText, LockKeyhole, Send } from "lucide-react";
import { Badge, DataTable, PageHeader, Section, StatCard } from "@/components/ui";
import { demoReports } from "@/lib/demo-data";

export default function ReportsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Rapports PDF"
        subtitle="Rapports complets internes et rapports simplifiés client avec contrôle fin des destinataires."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Rapports générés" value={demoReports.length} trend="PDF exportable" icon={FileText} />
        <StatCard label="Envois client" value="1" trend="Version simplifiée" icon={Send} />
        <StatCard label="Demandes complètes" value="0" trend="Validation direction requise" icon={LockKeyhole} />
      </div>

      <Section title="Bibliothèque de rapports">
        <DataTable
          columns={["Titre", "Type", "Visibilité", "Agent", "Direction", "Client", "Date", "PDF"]}
          rows={demoReports.map((report) => [
            report.title,
            <Badge key={`${report.id}-type`} tone="neutral">
              {report.type}
            </Badge>,
            report.visibility.replaceAll("_", " ").toLowerCase(),
            report.sentToAgent ? "Envoyé" : "Non",
            report.sentToManager ? "Envoyé" : "Non",
            report.sentToClient ? "Envoyé" : "Non",
            new Date(report.createdAt).toLocaleDateString("fr-FR"),
            <button key={`${report.id}-download`} className="button-secondary h-9">
              <Download className="h-4 w-4" />
              PDF
            </button>
          ])}
        />
      </Section>

      <Section title="Différence de contenu">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="surface rounded-lg p-5">
            <h2 className="font-semibold text-ink-950 dark:text-white">Rapport complet interne</h2>
            <p className="mt-2 text-sm leading-6 text-ink-500 dark:text-ink-300">
              Détails du contrôle, non-conformités, observations internes, preuves, signatures, QCM, analyse et historique utile.
            </p>
          </div>
          <div className="surface rounded-lg p-5">
            <h2 className="font-semibold text-ink-950 dark:text-white">Rapport simplifié client</h2>
            <p className="mt-2 text-sm leading-6 text-ink-500 dark:text-ink-300">
              Date, heure, lieu, agent, contrôleur, notes et synthèse simple, sans sanction ni donnée RH sensible.
            </p>
          </div>
        </div>
      </Section>
    </div>
  );
}
