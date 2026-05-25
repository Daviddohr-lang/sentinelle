import { Bell, Building2, ListChecks, Lock, Settings, Users } from "lucide-react";
import { Badge, DataTable, PageHeader, Section, StatCard } from "@/components/ui";
import { CompanyIdentityManager } from "@/components/company-identity-manager";
import { demoClients, demoControlItems, demoUsers } from "@/lib/demo-data";
import { roleLabels } from "@/lib/constants";
import { getSessionFromCookies } from "@/lib/auth";
import { getShellCompanyProfile } from "@/lib/company-profile";
import { hasPermission } from "@/lib/rbac";

export default async function AdminPage() {
  const user = await getSessionFromCookies();
  if (!user || !hasPermission(user.role, "company.manage")) {
    return (
      <div className="space-y-8">
        <PageHeader title="Accès refusé" subtitle="Cette zone est réservée aux administrateurs autorisés." />
      </div>
    );
  }
  const companyProfile = await getShellCompanyProfile(user);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Administration"
        subtitle="Paramétrage complet des entreprises, utilisateurs, rôles, items, coefficients, alertes, modèles de rapports et messages de prévention."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Entreprise" value={companyProfile.name} trend={companyProfile.cnapsAuthorizationNumber ?? "CNAPS non renseigne"} icon={Building2} />
        <StatCard label="Utilisateurs" value={demoUsers.length} trend="6 rôles métiers" icon={Users} />
        <StatCard label="Items actifs" value={demoControlItems.length} trend="Personnalisables" icon={ListChecks} />
        <StatCard label="Alertes" value="9" trend="Documents et terrain" icon={Bell} />
      </div>

      <Section title="Identité entreprise">
        <CompanyIdentityManager />
      </Section>

      <Section title="Utilisateurs et permissions">
        <DataTable
          columns={["Nom", "Email", "Rôle", "Entreprise", "Statut"]}
          rows={demoUsers.map((user) => [
            `${user.firstName} ${user.lastName}`,
            user.email,
            roleLabels[user.role],
            user.companyId ?? "Plateforme",
            <Badge key={user.id}>ACTIVE</Badge>
          ])}
        />
      </Section>

      <Section title="Items de contrôle">
        <DataTable
          columns={["Libellé", "Catégorie", "Gravité", "Coefficient", "Bloquant", "Notification", "Client"]}
          rows={demoControlItems.map((item) => [
            item.label,
            item.category,
            <Badge key={`${item.id}-severity`} tone="severity">
              {item.severity}
            </Badge>,
            item.coefficient,
            item.blocking ? "Oui" : "Non",
            item.autoNotify ? "Automatique" : "Manuelle",
            item.clientVisible ? "Visible" : "Interne"
          ])}
        />
      </Section>

      <Section title="Référentiels modifiables">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            [Settings, "Paramètres plateforme", "Seuils, délais, logo, informations obligatoires et préférences."],
            [Lock, "Sécurité et RGPD", "Suppression, archivage, journal d'activité et contrôle des accès fichiers."],
            [Building2, "Clients et sites", `${demoClients.length} clients avec consignes, documents et statistiques dédiées.`]
          ].map(([Icon, title, text]) => {
            const Component = Icon as typeof Settings;
            return (
              <div key={String(title)} className="surface rounded-lg p-5">
                <Component className="h-5 w-5 text-sentinel-700 dark:text-sentinel-200" />
                <p className="mt-3 text-sm font-semibold text-ink-950 dark:text-white">{String(title)}</p>
                <p className="mt-2 text-sm leading-6 text-ink-500 dark:text-ink-300">{String(text)}</p>
              </div>
            );
          })}
        </div>
      </Section>
    </div>
  );
}
