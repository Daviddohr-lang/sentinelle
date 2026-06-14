import { demoControls, demoDocuments, demoNonConformities } from "@/lib/demo-data";

export type ComplianceLevelKey = "CONFORME" | "RESERVE" | "NC_MINEURE" | "NC_MAJEURE" | "NC_CRITIQUE";
export type QcmCategoryKey = "ENTREPRISE" | "METIER" | "CLIENT_SITE";

export const complianceLevelSettings: Record<
  ComplianceLevelKey,
  {
    label: string;
    shortLabel: string;
    color: string;
    minScore: number;
    maxScore: number;
    statisticKey: string;
  }
> = {
  CONFORME: {
    label: "🟢 Conforme",
    shortLabel: "Conforme",
    color: "emerald",
    minScore: 95,
    maxScore: 100,
    statisticKey: "conforme"
  },
  RESERVE: {
    label: "🟡 Conforme avec réserve",
    shortLabel: "Avec réserve",
    color: "yellow",
    minScore: 85,
    maxScore: 94,
    statisticKey: "reserve"
  },
  NC_MINEURE: {
    label: "🟠 Non-conformité mineure",
    shortLabel: "NC mineure",
    color: "orange",
    minScore: 75,
    maxScore: 84,
    statisticKey: "nc_mineure"
  },
  NC_MAJEURE: {
    label: "🔴 Non-conformité majeure",
    shortLabel: "NC majeure",
    color: "red",
    minScore: 50,
    maxScore: 74,
    statisticKey: "nc_majeure"
  },
  NC_CRITIQUE: {
    label: "🚨 Non-conformité critique",
    shortLabel: "NC critique",
    color: "critical",
    minScore: 0,
    maxScore: 49,
    statisticKey: "nc_critique"
  }
};

export const qcmCategories: Array<{ key: QcmCategoryKey; label: string; coefficient: number }> = [
  { key: "ENTREPRISE", label: "QCM OPS", coefficient: 1 },
  { key: "METIER", label: "QCM métier", coefficient: 2 },
  { key: "CLIENT_SITE", label: "QCM site/client", coefficient: 3 }
];

export type ControlDemo = (typeof demoControls)[number];
export type NonConformityDemo = (typeof demoNonConformities)[number];
export type DocumentDemo = (typeof demoDocuments)[number];

export type QcmSessionLike = {
  id: string;
  controlId?: string | null;
  agentId?: string | null;
  agentName?: string | null;
  bankType?: QcmCategoryKey | string | null;
  qcmTitle?: string | null;
  bankTitle?: string | null;
  status: string;
  score?: number | null;
  passed?: boolean | null;
  completedAt?: string | null;
  resumeCount?: number | null;
  timedOutCount?: number | null;
};

export type ControlQualityRow = {
  control: ControlDemo;
  complianceLevel: ComplianceLevelKey;
  nonConformities: NonConformityDemo[];
  nearestDueAt: string | null;
  previousControl: ControlDemo | null;
  previousScore: number | null;
  progression: number | null;
  annualAverage: number;
  siteAverage: number;
  companyAverage: number;
  qcm: Array<{
    category: QcmCategoryKey;
    label: string;
    status: "non_envoye" | "envoye" | "commence" | "interrompu" | "termine" | "valide";
    score: number | null;
    session?: QcmSessionLike;
  }>;
  documents: DocumentDemo[];
};

function severityRank(severity: string) {
  if (severity === "CRITIQUE") return 3;
  if (severity === "MAJEURE") return 2;
  if (severity === "MINEURE") return 1;
  return 0;
}

function qcmCategoryFromSession(session: QcmSessionLike): QcmCategoryKey {
  if (session.bankType === "ENTREPRISE") return "ENTREPRISE";
  if (session.bankType === "METIER") return "METIER";
  if (session.bankType === "CLIENT_SITE") return "CLIENT_SITE";
  const title = `${session.bankTitle ?? ""} ${session.qcmTitle ?? ""}`.toLowerCase();
  if (title.includes("client") || title.includes("site")) return "CLIENT_SITE";
  if (title.includes("metier") || title.includes("métier") || title.includes("aps") || title.includes("ssiap")) return "METIER";
  return "ENTREPRISE";
}

function qcmStatus(session?: QcmSessionLike): ControlQualityRow["qcm"][number]["status"] {
  if (!session) return "non_envoye";
  if (session.status === "ENVOYE") return "envoye";
  if (session.status === "EN_COURS") return "commence";
  if (session.status === "INTERROMPU") return "interrompu";
  if (session.status === "TERMINE" && session.passed) return "valide";
  if (session.status === "TERMINE") return "termine";
  return "envoye";
}

export function qcmStatusLabel(status: ControlQualityRow["qcm"][number]["status"]) {
  switch (status) {
    case "non_envoye":
      return "non envoyé";
    case "envoye":
      return "envoyé";
    case "commence":
      return "commencé";
    case "interrompu":
      return "interrompu";
    case "termine":
      return "terminé";
    case "valide":
      return "validé";
  }
}

function resolveComplianceLevel(control: ControlDemo, nonConformities: NonConformityDemo[]): ComplianceLevelKey {
  const maxSeverity = Math.max(0, ...nonConformities.map((item) => severityRank(item.severity)));
  if (maxSeverity >= 3 || control.globalScore < 50) return "NC_CRITIQUE";
  if (maxSeverity >= 2 || control.globalScore < 75) return "NC_MAJEURE";
  if (maxSeverity >= 1 || control.globalScore < 85) return "NC_MINEURE";
  if (control.globalScore < 95 || control.itemResults.some((item) => !item.compliant)) return "RESERVE";
  return "CONFORME";
}

function nearestDue(nonConformities: NonConformityDemo[]) {
  const dates = nonConformities
    .map((item) => item.dueAt)
    .filter(Boolean)
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  return dates[0] ?? null;
}

function average(values: number[]) {
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
}

function matchQcmSessions(control: ControlDemo, qcmSessions: QcmSessionLike[]) {
  return qcmSessions.filter((session) => {
    if (session.controlId && session.controlId === control.id) return true;
    if (session.agentId && session.agentId === control.agentId) return true;
    if (session.agentName && session.agentName === control.agentName) return true;
    return false;
  });
}

export function buildControlQualityRows(input?: {
  controls?: ControlDemo[];
  nonConformities?: NonConformityDemo[];
  documents?: DocumentDemo[];
  qcmSessions?: QcmSessionLike[];
}) {
  const controls = input?.controls ?? demoControls;
  const nonConformities = input?.nonConformities ?? demoNonConformities;
  const documents = input?.documents ?? demoDocuments;
  const qcmSessions = input?.qcmSessions ?? [];
  const companyAverage = average(controls.map((control) => control.globalScore));

  return controls
    .map((control) => {
      const linkedNonConformities = nonConformities.filter(
        (item) => item.agentName === control.agentName && item.siteName === control.siteName
      );
      const sameAgentControls = controls
        .filter((item) => item.agentId === control.agentId)
        .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());
      const previousControl =
        [...sameAgentControls].reverse().find((item) => new Date(item.startedAt).getTime() < new Date(control.startedAt).getTime()) ?? null;
      const sameYearAgentControls = sameAgentControls.filter((item) => new Date(item.startedAt).getFullYear() === new Date(control.startedAt).getFullYear());
      const sameSiteControls = controls.filter((item) => item.siteId === control.siteId);
      const sessions = matchQcmSessions(control, qcmSessions);
      const qcm = qcmCategories.map((category) => {
        const session = sessions.find((item) => qcmCategoryFromSession(item) === category.key);
        return {
          category: category.key,
          label: category.label,
          status: qcmStatus(session),
          score: typeof session?.score === "number" ? session.score : null,
          session
        };
      });

      return {
        control,
        complianceLevel: resolveComplianceLevel(control, linkedNonConformities),
        nonConformities: linkedNonConformities,
        nearestDueAt: nearestDue(linkedNonConformities),
        previousControl,
        previousScore: previousControl?.globalScore ?? null,
        progression: previousControl ? control.globalScore - previousControl.globalScore : null,
        annualAverage: average(sameYearAgentControls.map((item) => item.globalScore)),
        siteAverage: average(sameSiteControls.map((item) => item.globalScore)),
        companyAverage,
        qcm,
        documents: documents.filter((document) => document.owner === control.agentName || document.owner === control.clientName || document.owner === control.siteName)
      } satisfies ControlQualityRow;
    })
    .sort((a, b) => new Date(b.control.startedAt).getTime() - new Date(a.control.startedAt).getTime());
}

export function buildControlDashboard(rows: ControlQualityRow[]) {
  const month = new Date().getMonth();
  const year = new Date().getFullYear();
  const monthRows = rows.filter((row) => {
    const date = new Date(row.control.startedAt);
    return date.getMonth() === month && date.getFullYear() === year;
  });
  const openNonConformities = rows.flatMap((row) => row.nonConformities).filter((item) => !["CLOTUREE", "VALIDEE"].includes(item.status));
  const sensitiveSites = Object.entries(
    rows.reduce<Record<string, { score: number[]; count: number }>>((acc, row) => {
      acc[row.control.siteName] ??= { score: [], count: 0 };
      acc[row.control.siteName].score.push(row.control.globalScore);
      acc[row.control.siteName].count += row.nonConformities.length;
      return acc;
    }, {})
  )
    .map(([siteName, value]) => ({ siteName, average: average(value.score), nonConformities: value.count }))
    .sort((a, b) => b.nonConformities - a.nonConformities || a.average - b.average);
  const topAgents = Object.entries(
    rows.reduce<Record<string, number[]>>((acc, row) => {
      acc[row.control.agentName] ??= [];
      acc[row.control.agentName].push(row.control.globalScore);
      return acc;
    }, {})
  )
    .map(([agentName, scores]) => ({ agentName, average: average(scores) }))
    .sort((a, b) => b.average - a.average);

  return {
    controlsThisMonth: monthRows.length || rows.length,
    averageCompliance: average(rows.map((row) => row.control.globalScore)),
    topAgents,
    sensitiveSites,
    openNonConformities: openNonConformities.length,
    criticalNonConformities: openNonConformities.filter((item) => item.severity === "CRITIQUE").length,
    expiringDocuments: demoDocuments.filter((document) => document.status === "EXPIRANT_BIENTOT" || document.status === "EXPIRE").length,
    pendingQcm: rows.flatMap((row) => row.qcm).filter((qcm) => ["envoye", "commence", "interrompu"].includes(qcm.status)).length,
    byComplianceLevel: rows.reduce<Record<ComplianceLevelKey, number>>(
      (acc, row) => {
        acc[row.complianceLevel] += 1;
        return acc;
      },
      { CONFORME: 0, RESERVE: 0, NC_MINEURE: 0, NC_MAJEURE: 0, NC_CRITIQUE: 0 }
    )
  };
}

export function buildAgentQualityTimeline(rows: ControlQualityRow[], agentName: string) {
  return rows
    .filter((row) => row.control.agentName === agentName)
    .sort((a, b) => new Date(a.control.startedAt).getTime() - new Date(b.control.startedAt).getTime())
    .map((row, index, list) => ({
      controlId: row.control.id,
      date: row.control.startedAt,
      score: row.control.globalScore,
      complianceLevel: row.complianceLevel,
      delta: index === 0 ? null : row.control.globalScore - list[index - 1].control.globalScore,
      siteName: row.control.siteName
    }));
}
