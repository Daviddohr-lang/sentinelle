import { Archive, Download, FileCheck2, FileWarning } from "lucide-react";
import { Badge, DataTable, PageHeader, Section, StatCard } from "@/components/ui";
import { demoDocuments } from "@/lib/demo-data";
import { daysUntil } from "@/lib/utils";

export default function DocumentsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Gestion documentaire"
        subtitle="Documents agents, entreprise, clients, sites, consignes et justificatifs réglementaires avec alertes d'échéance."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Documents valides" value="31" trend="Consultation selon droits" icon={FileCheck2} />
        <StatCard label="Expirants bientôt" value="12" trend="Alerte 4 mois avant" icon={FileWarning} />
        <StatCard label="Archives" value="7" trend="Traçabilité conservée" icon={Archive} />
      </div>

      <Section title="Registre documentaire">
        <DataTable
          columns={["Document", "Catégorie", "Statut", "Périmètre", "Visibilité", "Échéance", "Action"]}
          rows={demoDocuments.map((document) => {
            const remaining = daysUntil(document.expiresAt);
            return [
              document.title,
              document.category,
              <Badge key={`${document.id}-status`}>{document.status}</Badge>,
              document.scope.replaceAll("_", " ").toLowerCase(),
              document.visibility.replaceAll("_", " ").toLowerCase(),
              remaining === null ? "Non applicable" : `${remaining} jour(s)`,
              <button key={`${document.id}-download`} className="button-secondary h-9">
                <Download className="h-4 w-4" />
                Télécharger
              </button>
            ];
          })}
        />
      </Section>
    </div>
  );
}
