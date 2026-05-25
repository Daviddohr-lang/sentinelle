import { BellRing, Bot, DatabaseZap, Moon, ShieldCheck } from "lucide-react";
import { PageHeader, Section, StatCard } from "@/components/ui";
import { demoPrevention } from "@/lib/demo-data";

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

      <Section title="Messages de prévention" action={<span id="messages" />}>
        <div className="surface rounded-lg p-5">
          <div className="flex items-start gap-3">
            <span className="rounded-lg bg-sentinel-50 p-2 text-sentinel-700 dark:bg-sentinel-500/15 dark:text-sentinel-100">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink-950 dark:text-white">{demoPrevention.title}</p>
              <p className="mt-2 text-sm leading-6 text-ink-500 dark:text-ink-300">{demoPrevention.body}</p>
              <p className="mt-4 text-sm font-medium text-ink-700 dark:text-ink-200">{demoPrevention.question}</p>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Mode hors ligne et synchronisation">
        <div className="surface rounded-lg p-5">
          <p className="text-sm leading-6 text-ink-600 dark:text-ink-300">
            Les contrôles terrain peuvent être mis en file locale lorsque le réseau est absent. L'API /api/sync stocke les événements pour réconciliation et audit au retour réseau.
          </p>
        </div>
      </Section>
    </div>
  );
}
