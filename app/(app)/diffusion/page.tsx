import { CheckCircle2, Database, FolderLock, Rocket, Server, ShieldCheck, TriangleAlert } from "lucide-react";
import { PwaInstallCard } from "@/components/pwa-install-card";
import { Badge, PageHeader, Section, StatCard } from "@/components/ui";
import { getSessionFromCookies } from "@/lib/auth";
import { getStorageStatus } from "@/lib/storage";
import { hasPermission } from "@/lib/rbac";

function readinessTone(ready: boolean) {
  return ready ? "VALIDE" : "A_VERIFIER";
}

export default async function DiffusionPage() {
  const user = await getSessionFromCookies();
  if (!user || !hasPermission(user.role, "company.manage")) {
    return (
      <div className="space-y-8">
        <PageHeader title="Accès refusé" subtitle="La préparation de diffusion est réservée aux administrateurs autorisés." />
      </div>
    );
  }

  const storage = getStorageStatus();
  const databaseConfigured = Boolean(process.env.DATABASE_URL?.startsWith("postgresql://") || process.env.DATABASE_URL?.startsWith("postgres://"));
  const localStoreDisabled = process.env.LOCAL_DATASTORE_DISABLED === "true";
  const authSecretConfigured = Boolean(process.env.AUTH_SECRET && process.env.AUTH_SECRET.length >= 32 && !process.env.AUTH_SECRET.includes("changez-moi"));
  const appUrlConfigured = Boolean(process.env.APP_URL);

  const checks = [
    ["Base PostgreSQL", databaseConfigured, "DATABASE_URL"],
    ["Persistance locale désactivée", localStoreDisabled, "LOCAL_DATASTORE_DISABLED=true"],
    ["Secret d’authentification robuste", authSecretConfigured, "AUTH_SECRET"],
    ["URL publique renseignée", appUrlConfigured, "APP_URL"],
    ["Stockage fichiers persistant", storage.persistent, "FILE_STORAGE_PATH"]
  ] as const;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Diffusion"
        subtitle="Préparation de SENTINELLE pour installation PWA, hébergement, stockage persistant et exploitation au-delà du poste local."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Installation" value="PWA" trend="Bureau, tablette, mobile" icon={Rocket} />
        <StatCard label="Données métier" value={databaseConfigured ? "PostgreSQL" : "À configurer"} trend="DATABASE_URL" icon={Database} />
        <StatCard label="Fichiers" value={storage.driver} trend={storage.persistent ? "Volume persistant" : "Chemin local"} icon={FolderLock} />
        <StatCard label="Sécurité" value={authSecretConfigured ? "Prête" : "À renforcer"} trend="Cookies HttpOnly + RBAC" icon={ShieldCheck} />
      </div>

      <Section title="Installation de l’application">
        <PwaInstallCard />
      </Section>

      <Section title="Préparation production">
        <div className="surface overflow-hidden rounded-lg">
          <div className="divide-y divide-ink-100 dark:divide-white/10">
            {checks.map(([label, ready, detail]) => (
              <div key={label} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className={ready ? "text-emerald-600 dark:text-emerald-300" : "text-amber-600 dark:text-amber-300"}>
                    {ready ? <CheckCircle2 className="h-5 w-5" /> : <TriangleAlert className="h-5 w-5" />}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-ink-950 dark:text-white">{label}</p>
                    <p className="mt-1 text-sm text-ink-500 dark:text-ink-300">{detail}</p>
                  </div>
                </div>
                <Badge tone={ready ? "status" : "neutral"}>{readinessTone(ready)}</Badge>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Commandes de diffusion">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="surface rounded-lg p-5">
            <Server className="h-5 w-5 text-sentinel-700 dark:text-sentinel-200" />
            <p className="mt-3 text-sm font-semibold text-ink-950 dark:text-white">Serveur Docker</p>
            <pre className="mt-4 overflow-x-auto rounded-lg bg-ink-950 p-4 text-xs leading-6 text-ink-50">
              <code>{`cp .env.production.example .env.production
docker compose -f docker-compose.production.yml up -d --build`}</code>
            </pre>
          </div>
          <div className="surface rounded-lg p-5">
            <Database className="h-5 w-5 text-sentinel-700 dark:text-sentinel-200" />
            <p className="mt-3 text-sm font-semibold text-ink-950 dark:text-white">Base de données</p>
            <pre className="mt-4 overflow-x-auto rounded-lg bg-ink-950 p-4 text-xs leading-6 text-ink-50">
              <code>{`npm run preflight:prod
npm run db:migrate
npm run build
npm run start`}</code>
            </pre>
          </div>
        </div>
      </Section>
    </div>
  );
}
