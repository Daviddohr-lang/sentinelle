import Link from "next/link";
import { BellRing, Bot, DatabaseZap, MessagesSquare, Moon, Rocket } from "lucide-react";
import { PageHeader, Section, StatCard } from "@/components/ui";

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Paramètres"
        subtitle="Préférences plateforme, notifications, mode sombre, PWA, synchronisation hors ligne et module IA."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="PWA" value="Prête" trend="Manifest + service worker" icon={DatabaseZap} />
        <StatCard label="Mode sombre" value="Actif" trend="Préférence locale" icon={Moon} />
        <StatCard label="Notifications" value="8 types" trend="Lu, non lu, accusé" icon={BellRing} />
        <StatCard label="IA" value="Simulée" trend="Désactivable" icon={Bot} />
      </div>

      <Section title="Notifications internes">
        <div className="surface grid gap-3 rounded-lg p-5 md:grid-cols-2">
          {[
            "QCM à réaliser",
            "Document expirant",
            "Document manquant",
            "Non-conformité validée",
            "Contrôle planifié",
            "Demande de contrôle",
            "Rapport disponible",
            "Message prévention validé"
          ].map((item) => (
            <label key={item} className="flex items-center gap-3 rounded-lg bg-ink-50 p-3 text-sm font-medium text-ink-700 dark:bg-white/5 dark:text-ink-200">
              <input type="checkbox" defaultChecked className="h-4 w-4 accent-sentinel-700" />
              {item}
            </label>
          ))}
        </div>
      </Section>

      <Section title="Messages de prévention">
        <div className="surface flex flex-col gap-4 rounded-lg p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-ink-950 dark:text-white">Bibliothèque de prévention</p>
            <p className="mt-2 text-sm leading-6 text-ink-500 dark:text-ink-300">Les messages agents, questions de validation et thématiques sont maintenant gérés dans un espace dédié.</p>
          </div>
          <Link href="/prevention" className="button-primary">
            <MessagesSquare className="h-4 w-4" />
            Ouvrir prévention
          </Link>
        </div>
      </Section>

      <Section title="Mode hors ligne et synchronisation">
        <div className="surface rounded-lg p-5">
          <p className="text-sm leading-6 text-ink-600 dark:text-ink-300">
            Les contrôles terrain peuvent être mis en file locale lorsque le réseau est absent. L&apos;API /api/sync stocke les événements pour réconciliation et audit au retour réseau.
          </p>
        </div>
      </Section>

      <Section title="Diffusion et installation">
        <div className="surface flex flex-col gap-4 rounded-lg p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-ink-950 dark:text-white">Application installable</p>
            <p className="mt-2 text-sm leading-6 text-ink-500 dark:text-ink-300">Préparation PWA, stockage persistant, PostgreSQL et commandes de déploiement.</p>
          </div>
          <Link href="/diffusion" className="button-primary">
            <Rocket className="h-4 w-4" />
            Ouvrir diffusion
          </Link>
        </div>
      </Section>
    </div>
  );
}
