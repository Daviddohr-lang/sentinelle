import { CalendarDays, Clock, Plus, Repeat } from "lucide-react";
import { Badge, DataTable, PageHeader, Section, StatCard } from "@/components/ui";
import { demoPlanning } from "@/lib/demo-data";

export default function PlanningPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Planning des contrôles"
        subtitle="Vues mensuelle, hebdomadaire et journalière préparées pour planifier, accepter, reporter ou refuser les demandes."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Contrôles à venir" value="8" trend="Vue hebdomadaire" icon={CalendarDays} />
        <StatCard label="Demandes direction" value="2" trend="Plages dates et horaires" icon={Clock} />
        <StatCard label="Rappels actifs" value="6" trend="Automatisation prête" icon={Repeat} />
      </div>

      <Section title="Demandes et planifications">
        <DataTable
          columns={["Titre", "Site", "Agent", "Fenêtre", "Période", "Statut"]}
          rows={demoPlanning.map((event) => [
            event.title,
            event.siteName,
            event.agentName,
            event.preferredTimeWindow,
            `${new Date(event.requestedStart).toLocaleDateString("fr-FR")} - ${new Date(event.requestedEnd).toLocaleDateString("fr-FR")}`,
            <Badge key={event.id}>{event.status}</Badge>
          ])}
        />
      </Section>

      <Section title="Création rapide de demande">
        <div className="surface grid gap-4 rounded-lg p-5 lg:grid-cols-4">
          <div>
            <label className="label">Site ou agent</label>
            <input className="field mt-2" defaultValue="Intermarché Glisy - Galerie" />
          </div>
          <div>
            <label className="label">Plage de dates</label>
            <input className="field mt-2" defaultValue="05/06/2026 - 12/06/2026" />
          </div>
          <div>
            <label className="label">Plage horaire</label>
            <input className="field mt-2" defaultValue="20h - 2h" />
          </div>
          <div className="flex items-end">
            <button className="button-primary w-full">
              <Plus className="h-4 w-4" />
              Demander
            </button>
          </div>
        </div>
      </Section>
    </div>
  );
}
