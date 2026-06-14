import { MessagesSquare } from "lucide-react";
import { PreventionMessagesManager } from "@/components/prevention-messages-manager";
import { PageHeader } from "@/components/ui";

export default function PreventionPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Prévention"
        subtitle="Création, ciblage thématique, diffusion et suivi des messages de prévention lus par les agents."
        action={
          <span className="inline-flex items-center gap-2 rounded-lg bg-sentinel-50 px-3 py-2 text-sm font-semibold text-sentinel-800 dark:bg-sentinel-500/15 dark:text-sentinel-100">
            <MessagesSquare className="h-4 w-4" />
            Messages agents
          </span>
        }
      />
      <PreventionMessagesManager />
    </div>
  );
}
