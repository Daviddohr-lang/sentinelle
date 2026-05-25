import { Building2, MapPinned, ShieldCheck } from "lucide-react";
import { DataTable, PageHeader, Section, StatCard } from "@/components/ui";
import { demoClients, demoSites } from "@/lib/demo-data";

export default function ClientsSitesPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Clients et sites"
        subtitle="Gestion des clients, sites, consignes, documents autorisés et périmètres visibles côté client."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Clients" value={demoClients.length} trend="Contacts et référentiels" icon={Building2} />
        <StatCard label="Sites" value={demoSites.length} trend="Consignes et plans" icon={MapPinned} />
        <StatCard label="Visibilité client" value="Contrôlée" trend="Rapports simplifiés" icon={ShieldCheck} />
      </div>

      <Section title="Clients">
        <DataTable
          columns={["Référence", "Nom", "Contact", "Email", "Adresse"]}
          rows={demoClients.map((client) => [client.reference, client.name, client.contactName, client.contactEmail, client.address])}
        />
      </Section>

      <Section title="Sites">
        <DataTable
          columns={["Référence", "Site", "Client", "Adresse", "Risque"]}
          rows={demoSites.map((site) => [
            site.reference,
            site.name,
            demoClients.find((client) => client.id === site.clientId)?.name ?? site.clientId,
            site.address,
            site.riskLevel
          ])}
        />
      </Section>
    </div>
  );
}
