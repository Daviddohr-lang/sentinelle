import { Clock, MessageSquare, ShieldAlert } from "lucide-react";
import { Badge, DataTable, PageHeader, Section, StatCard } from "@/components/ui";
import { demoNonConformities } from "@/lib/demo-data";

export default function NonConformitiesPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Non-conformités"
        subtitle="Workflow de validation, notification maîtrisée, suivi des corrections, preuves et clôture contrôlée."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Ouvertes" value={demoNonConformities.length} trend="Validation avant notification" icon={ShieldAlert} />
        <StatCard label="Échéance critique" value="2" trend="Moins de 48h" icon={Clock} />
        <StatCard label="Commentaires" value="14" trend="Historique conservé" icon={MessageSquare} />
      </div>

      <Section title="Registre des non-conformités">
        <DataTable
          columns={["Titre", "Gravité", "Statut", "Agent", "Site", "Client", "Échéance", "Preuves"]}
          rows={demoNonConformities.map((item) => [
            <div key={`${item.id}-title`}>
              <p className="font-semibold text-ink-950 dark:text-white">{item.title}</p>
              <p className="mt-1 text-xs text-ink-500 dark:text-ink-300">{item.description}</p>
            </div>,
            <Badge key={`${item.id}-severity`} tone="severity">
              {item.severity}
            </Badge>,
            <Badge key={`${item.id}-status`}>{item.status}</Badge>,
            item.agentName,
            item.siteName,
            item.clientName,
            item.dueAt ? new Date(item.dueAt).toLocaleDateString("fr-FR") : "Sans échéance",
            `${item.evidenceCount} preuve(s)`
          ])}
        />
      </Section>

      <Section title="Workflow appliqué">
        <div className="surface grid gap-4 rounded-lg p-5 md:grid-cols-3">
          {[
            ["Constat", "Le contrôleur constate, qualifie et rattache l'item, l'agent, le site et le contrôle."],
            ["Validation", "L'administrateur ou le contrôleur valide avant toute notification externe."],
            ["Levée", "La correction est suivie, commentée, signée puis clôturée après contrôle."]
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
