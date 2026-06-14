/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextRequest } from "next/server";
import { apiError, apiOk, requireApiUser } from "@/lib/api";
import { readLocalStore, withDatabaseFallback } from "@/lib/local-store";
import { prisma } from "@/lib/prisma";

const allReportTypes = [
  { type: "COMPLET_INTERNE", label: "Rapport complet interne" },
  { type: "RAPPORT_AGENT", label: "Rapport agent" },
  { type: "RAPPORT_DIRECTION", label: "Rapport direction" },
  { type: "SIMPLIFIE_CLIENT", label: "Rapport client simplifié" }
];

function personName(person?: { firstName?: string | null; lastName?: string | null } | null) {
  return [person?.firstName, person?.lastName].filter(Boolean).join(" ") || null;
}

function allowedReportsForUser(user: { id: string; email: string; role: string; companyId: string | null }, session: any) {
  if (user.role !== "SUPER_ADMIN" && session.companyId !== user.companyId) return [];
  if (user.role === "SUPER_ADMIN" || user.role === "COMPANY_ADMIN" || user.role === "QUALITY_CONTROLLER" || user.role === "BUSINESS_OWNER") return allReportTypes;
  if (user.role === "AGENT" && (session.agent?.userId === user.id || session.agent?.email === user.email)) {
    return allReportTypes.filter((report) => report.type === "RAPPORT_AGENT");
  }
  if (user.role === "CLIENT" && session.client?.contactEmail === user.email) {
    return allReportTypes.filter((report) => report.type === "SIMPLIFIE_CLIENT");
  }
  return [];
}

function mapSession(user: { id: string; email: string; role: string; companyId: string | null }, session: any) {
  const reports = allowedReportsForUser(user, session);
  if (!reports.length) return null;
  return {
    id: session.id,
    controlId: session.controlId,
    companyId: session.companyId,
    startedAt: session.startedAt,
    completedAt: session.completedAt,
    agentName: session.agentName ?? personName(session.agent) ?? "Agent archivé",
    clientName: session.clientName ?? session.client?.name ?? "Client archivé",
    siteName: session.siteName ?? session.site?.name ?? "Site archivé",
    globalScore: Math.round(session.globalScore ?? 0),
    complianceLevel: session.complianceLevel ?? "Non calculé",
    nonConformitiesCount: session.pointResults?.filter((result: any) => result.status === "NON_CONFORME").length ?? 0,
    reports: reports.map((report) => ({
      ...report,
      url: `/api/reports/control/${session.id}?type=${report.type}`
    }))
  };
}

async function databaseSessions() {
  const db = prisma as any;
  if (!db.controlSession) throw new Error("Prisma Client could not locate generated control session model");
  return db.controlSession.findMany({
    take: 80,
    include: {
      agent: true,
      client: true,
      site: true,
      pointResults: true
    },
    orderBy: { startedAt: "desc" }
  });
}

async function localSessions() {
  const store = await readLocalStore();
  return store.controlSessions
    .slice()
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    .map((session) => ({
      ...session,
      agent: store.agents.find((agent) => agent.id === session.agentId),
      client: store.clients.find((client) => client.id === session.clientId),
      site: store.sites.find((site) => site.id === session.siteId),
      pointResults: store.controlPointResults.filter((result) => result.sessionId === session.id)
    }));
}

export async function GET(request: NextRequest) {
  const context = await requireApiUser(request);
  if ("status" in context) return context;
  if (!["SUPER_ADMIN", "COMPANY_ADMIN", "QUALITY_CONTROLLER", "BUSINESS_OWNER", "AGENT", "CLIENT"].includes(context.user.role)) {
    return apiError("Permission insuffisante", 403);
  }

  const sessions = (await withDatabaseFallback(
    databaseSessions,
    localSessions,
    "GET /api/reports/forms"
  )) as any[];
  const forms = sessions.map((session) => mapSession(context.user, session)).filter(Boolean);
  return apiOk({ forms });
}
