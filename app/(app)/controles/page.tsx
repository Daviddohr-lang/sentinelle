import { Camera, FileDown, MapPin, Plus, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { Badge, DataTable, PageHeader, ProgressBar, Section, StatCard } from "@/components/ui";
import { demoControlItems, demoControls } from "@/lib/demo-data";

export default function ControlsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Contrôles qualité"
        subtitle="Suivi des contrôles programmés ou inopinés, avec géolocalisation, preuves, signatures et génération de rapports."
        action={
          <Link href="/controles/nouveau" className="button-primary">
            <Plus className="h-4 w-4" />
            Lancer un contrôle
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Contrôles validés" value="47" trend="77 % du volume mensuel" icon={ShieldAlert} />
        <StatCard label="Preuves terrain" value="28" trend="Photos, fichiers, vocal" icon={Camera} />
        <StatCard label="Rapports PDF" value="32" trend="Interne et client" icon={FileDown} />
      </div>

      <Section title="Historique des contrôles">
        <DataTable
          columns={["Date", "Type", "Site", "Agent", "Contrôleur", "Statut", "Note"]}
          rows={demoControls.map((control) => [
            new Date(control.startedAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }),
            control.type === "INOPINE" ? "Inopiné" : "Programmé",
            <span key={`${control.id}-site`} className="inline-flex items-center gap-2">
              <MapPin className="h-4 w-4 text-sentinel-700" />
              {control.siteName}
            </span>,
            control.agentName,
            control.controllerName,
            <Badge key={`${control.id}-status`}>{control.status}</Badge>,
            <div key={`${control.id}-score`} className="min-w-32">
              <div className="mb-1 font-semibold">{control.globalScore} %</div>
              <ProgressBar value={control.globalScore} tone={control.globalScore < 75 ? "amber" : "sentinel"} />
            </div>
          ])}
        />
      </Section>

      <Section title="Items paramétrables actifs">
        <div className="grid gap-4 lg:grid-cols-2">
          {demoControlItems.map((item) => (
            <div key={item.id} className="surface rounded-lg p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink-950 dark:text-white">{item.label}</p>
                  <p className="mt-1 text-sm text-ink-500 dark:text-ink-300">{item.category}</p>
                </div>
                <Badge tone="severity">{item.severity}</Badge>
              </div>
              <div className="mt-4 grid gap-3 text-sm text-ink-600 dark:text-ink-300 sm:grid-cols-2">
                <span>Coefficient : {item.coefficient}</span>
                <span>Délai : {item.correctionDelayHours === 0 ? "immédiat" : `${item.correctionDelayHours ?? 48}h`}</span>
                <span>Photo : {item.photoRequirement.toLowerCase()}</span>
                <span>{item.blocking ? "Item bloquant" : "Non bloquant"}</span>
              </div>
              <p className="mt-4 text-sm leading-6 text-ink-500 dark:text-ink-300">{item.recommendedAction}</p>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
