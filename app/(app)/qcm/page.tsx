import { CheckCircle2, ClipboardList, Send } from "lucide-react";
import { Badge, DataTable, PageHeader, ProgressBar, Section, StatCard } from "@/components/ui";
import { demoQcmSessions, demoQcms } from "@/lib/demo-data";

export default function QcmPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="QCM agents"
        subtitle="QCM OPS, ligne métier et client, envoyés pendant le contrôle et historisés dans le dossier agent."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="QCM actifs" value={demoQcms.length} trend="OPS, métier, client" icon={ClipboardList} />
        <StatCard label="Réussite moyenne" value="84 %" trend="Seuil de réussite 80 %" icon={CheckCircle2} />
        <StatCard label="Sessions en cours" value="1" trend="Résultat temps réel" icon={Send} />
      </div>

      <Section title="Bibliothèque QCM">
        <DataTable
          columns={["Titre", "Type", "Coefficient", "Questions", "Seuil", "Réussite"]}
          rows={demoQcms.map((qcm) => [
            qcm.title,
            <Badge key={`${qcm.id}-type`} tone="neutral">
              {qcm.type}
            </Badge>,
            `x${qcm.coefficient}`,
            qcm.questions,
            `${qcm.minimumScore} %`,
            <div key={`${qcm.id}-success`} className="min-w-32">
              <div className="mb-1 font-semibold">{qcm.successRate} %</div>
              <ProgressBar value={qcm.successRate} />
            </div>
          ])}
        />
      </Section>

      <Section title="Historique agent">
        <DataTable
          columns={["Agent", "QCM", "Statut", "Score", "Résultat"]}
          rows={demoQcmSessions.map((session) => [
            session.agentName,
            session.qcmTitle,
            <Badge key={`${session.id}-status`}>{session.status}</Badge>,
            session.score === null ? "En attente" : `${session.score} %`,
            session.passed === null ? "Non clôturé" : session.passed ? "Réussi" : "Échec conservé"
          ])}
        />
      </Section>
    </div>
  );
}
