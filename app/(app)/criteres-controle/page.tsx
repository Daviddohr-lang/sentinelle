import { ArrowRight, ClipboardCheck, Layers3, ListChecks, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { ControlLibraryManager } from "@/components/control-library-manager";
import { PageHeader, Section } from "@/components/ui";
import { getSessionFromCookies } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";

export default async function ControlCriteriaPage() {
  const user = await getSessionFromCookies();
  if (!user || !hasPermission(user.role, "controls.write")) {
    return (
      <div className="space-y-8">
        <PageHeader title="Accès refusé" subtitle="Cette rubrique est réservée aux administrateurs et contrôleurs qualité autorisés." />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Critères de contrôle"
        subtitle="Référentiel opérationnel utilisé pendant les contrôles terrain : thématiques, points à contrôler, réponses possibles, incidences, notes, non-conformités et rapports."
        action={
          <Link href="/controles/nouveau" className="button-primary">
            <ClipboardCheck className="h-4 w-4" />
            Utiliser dans un contrôle
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {[
          [Layers3, "1. Thématiques", "Créez les familles de contrôle : tenue, prise de service, main courante, déontologie, ronde, intervention."],
          [ListChecks, "2. Points à contrôler", "Ajoutez les points concrets que le contrôleur devra vérifier sur tablette, mobile ou PC."],
          [ShieldAlert, "3. Réponses et incidences", "Paramétrez les choix, la note, la gravité, le délai, les preuves, l'alerte et les rapports concernés."]
        ].map(([Icon, title, text]) => {
          const Component = Icon as typeof Layers3;
          return (
            <div key={String(title)} className="surface rounded-lg p-5">
              <Component className="h-5 w-5 text-sentinel-700 dark:text-sentinel-200" />
              <p className="mt-3 text-sm font-semibold text-ink-950 dark:text-white">{String(title)}</p>
              <p className="mt-2 text-sm leading-6 text-ink-500 dark:text-ink-300">{String(text)}</p>
            </div>
          );
        })}
      </div>

      <Section
        title="Bibliothèque dynamique"
        action={
          <Link href="/controles" className="inline-flex items-center gap-2 text-sm font-semibold text-sentinel-800 dark:text-sentinel-100">
            Retour aux contrôles
            <ArrowRight className="h-4 w-4" />
          </Link>
        }
      >
        <ControlLibraryManager />
      </Section>
    </div>
  );
}
