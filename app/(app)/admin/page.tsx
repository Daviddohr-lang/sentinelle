import { Bell, Building2, FileSpreadsheet, ListChecks, Lock, Settings, Users } from "lucide-react";
import Link from "next/link";
import { PageHeader, Section, StatCard } from "@/components/ui";
import { CompanyIdentityManager } from "@/components/company-identity-manager";
import { UsersInvitationsManager } from "@/components/users-invitations-manager";
import { demoClients } from "@/lib/demo-data";
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
        <StatCard label="Utilisateurs" value="Gestion" trend="Invitations et rôles" icon={Users} />
        <StatCard label="Référentiel OPS" value="80" trend="12 thématiques dynamiques" icon={ListChecks} />
        <StatCard label="Alertes" value="9" trend="Documents et terrain" icon={Bell} />
      </div>

      <Section title="Identité entreprise">
        <CompanyIdentityManager />
      </Section>

      <Section title="Utilisateurs et permissions">
        <UsersInvitationsManager currentUserRole={user.role} />
      </Section>

      <Section title="Critères de contrôle qualité">
        <div className="surface flex flex-col gap-4 rounded-lg p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-ink-950 dark:text-white">Rubrique métier dédiée</p>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-500 dark:text-ink-300">
              Le référentiel des contrôles se gère maintenant dans une rubrique séparée : thématiques, points à contrôler, choix de réponse, incidences, notes, non-conformités et rapports.
            </p>
          </div>
          <Link href="/criteres-controle" className="button-primary">
            <ListChecks className="h-4 w-4" />
            Ouvrir les critères
          </Link>
        </div>
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

      <Section title="Imports Excel">
        <div className="surface flex flex-col gap-4 rounded-lg p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-ink-950 dark:text-white">Modèles standards et import contrôlé</p>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-500 dark:text-ink-300">
              Importez agents, clients, sites, QCM et points de contrôle depuis des fichiers Excel, avec prévisualisation, détection des erreurs et choix sur les doublons.
            </p>
          </div>
          <Link href="/imports" className="button-primary">
            <FileSpreadsheet className="h-4 w-4" />
            Ouvrir les imports
          </Link>
        </div>
      </Section>
    </div>
  );
}
