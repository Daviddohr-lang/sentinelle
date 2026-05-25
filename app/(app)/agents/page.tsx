import { BadgeCheck, ClipboardCheck, FileWarning, UserRoundCheck } from "lucide-react";
import { Badge, DataTable, PageHeader, ProgressBar, Section, StatCard } from "@/components/ui";
import { demoAgents, demoAssignments } from "@/lib/demo-data";
import { daysUntil } from "@/lib/utils";

export default function AgentsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Agents"
        subtitle="Dossiers agents, affectations, progression qualité, documents réglementaires et accès aux consignes de site."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Agents actifs" value={demoAgents.length} trend="Données par entreprise" icon={UserRoundCheck} />
        <StatCard label="Affectations" value={demoAssignments.length} trend="Historique conservé" icon={ClipboardCheck} />
        <StatCard label="Cartes à surveiller" value="2" trend="Alerte avant échéance" icon={FileWarning} />
      </div>

      <Section title="Registre agents">
        <DataTable
          columns={["Matricule", "Agent", "Carte pro", "SST", "SSIAP", "Score qualité"]}
          rows={demoAgents.map((agent) => [
            agent.matricule,
            `${agent.firstName} ${agent.lastName}`,
            agent.professionalCardExpiresAt ? `${daysUntil(agent.professionalCardExpiresAt)} j` : "Manquante",
            agent.sstExpiresAt ? `${daysUntil(agent.sstExpiresAt)} j` : "Manquant",
            agent.ssiapExpiresAt ? `${daysUntil(agent.ssiapExpiresAt)} j` : "Non applicable",
            <div key={agent.id} className="min-w-32">
              <div className="mb-1 flex items-center gap-2 font-semibold">
                <BadgeCheck className="h-4 w-4 text-sentinel-700" />
                {agent.qualityScore} %
              </div>
              <ProgressBar value={agent.qualityScore} tone={agent.qualityScore < 80 ? "amber" : "sentinel"} />
            </div>
          ])}
        />
      </Section>

      <Section title="Affectations">
        <DataTable
          columns={["Agent", "Client", "Site", "Poste", "Début", "Statut"]}
          rows={demoAssignments.map((assignment) => {
            const agent = demoAgents.find((item) => item.id === assignment.agentId);
            return [
              agent ? `${agent.firstName} ${agent.lastName}` : assignment.agentId,
              assignment.clientId,
              assignment.siteId,
              assignment.jobTitle,
              new Date(assignment.startsAt).toLocaleDateString("fr-FR"),
              <Badge key={assignment.id}>{assignment.status}</Badge>
            ];
          })}
        />
      </Section>
    </div>
  );
}
