import { ControlForm } from "@/components/control-form";
import { PageHeader } from "@/components/ui";

export default function NewControlPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Nouveau contrôle terrain"
        subtitle="Le lancement capture la date, l'heure et la position. Les preuves restent facultatives sauf item configuré comme obligatoire."
      />
      <ControlForm />
    </div>
  );
}
