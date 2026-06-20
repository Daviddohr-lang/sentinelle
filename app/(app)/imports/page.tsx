import { ImportsManager } from "@/components/imports-manager";
import { PageHeader } from "@/components/ui";
import { getSessionFromCookies } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";

export default async function ImportsPage() {
  const user = await getSessionFromCookies();
  if (!user || !hasPermission(user.role, "company.manage")) {
    return (
      <div className="space-y-8">
        <PageHeader title="Accès refusé" subtitle="Les imports Excel sont réservés aux administrateurs autorisés." />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Imports Excel" subtitle="Modèles SENTINELLE, prévisualisation, contrôle des erreurs et import validé des agents, clients, sites, QCM et points de contrôle." />
      <ImportsManager />
    </div>
  );
}

