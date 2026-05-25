import type { NextRequest } from "next/server";
import { apiOk, requireApiUser, scopedCompanyWhere } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import {
  dashboardStats,
  demoAgents,
  demoAssignments,
  demoClients,
  demoCompany,
  demoControlItems,
  demoControls,
  demoDocuments,
  demoNonConformities,
  demoNotifications,
  demoPlanning,
  demoQcmSessions,
  demoQcms,
  demoReports,
  demoSites,
  qualityEvolution,
  severityStats
} from "@/lib/demo-data";

export async function GET(request: NextRequest) {
  const context = await requireApiUser(request);
  if ("status" in context) return context;

  try {
    const scope = scopedCompanyWhere(context.user);
    const [
      companies,
      clients,
      sites,
      agents,
      controlItems,
      controls,
      nonConformities,
      documents,
      qcms,
      qcmSessions,
      planning,
      reports,
      notifications
    ] = await Promise.all([
      context.user.role === "SUPER_ADMIN" ? prisma.company.findMany({ take: 20 }) : prisma.company.findMany({ where: { id: context.user.companyId ?? "" } }),
      prisma.client.findMany({ where: scope, take: 50, orderBy: { name: "asc" } }),
      prisma.site.findMany({ where: scope, take: 50, orderBy: { name: "asc" } }),
      prisma.agent.findMany({ where: scope, take: 50, orderBy: { lastName: "asc" } }),
      prisma.controlItemDefinition.findMany({ where: scope, take: 100, orderBy: { sortOrder: "asc" } }),
      prisma.control.findMany({
        where: scope,
        take: 25,
        orderBy: { startedAt: "desc" },
        include: { agent: true, client: true, site: true, controller: true, itemResults: { include: { itemDefinition: true } } }
      }),
      prisma.nonConformity.findMany({ where: scope, take: 25, orderBy: { createdAt: "desc" }, include: { agent: true, client: true, site: true, itemDefinition: true } }),
      prisma.document.findMany({ where: scope, take: 50, orderBy: { updatedAt: "desc" } }),
      prisma.qcm.findMany({ where: scope, take: 50, include: { questions: true } }),
      prisma.qcmSession.findMany({ where: scope, take: 30, include: { qcm: true, agent: true } }),
      prisma.planningRequest.findMany({ where: scope, take: 30, orderBy: { requestedStart: "asc" } }),
      prisma.report.findMany({ where: scope, take: 30, orderBy: { createdAt: "desc" } }),
      prisma.notification.findMany({
        where: {
          OR: [{ userId: context.user.id }, { targetRole: context.user.role }],
          ...(context.user.role === "SUPER_ADMIN" ? {} : { companyId: context.user.companyId })
        },
        take: 20,
        orderBy: { createdAt: "desc" }
      })
    ]);

    return apiOk({
      source: "database",
      companies,
      clients,
      sites,
      agents,
      assignments: [],
      controlItems,
      controls: controls.map((control) => ({
        ...control,
        controllerName: `${control.controller.firstName} ${control.controller.lastName}`,
        agentName: `${control.agent.firstName} ${control.agent.lastName}`,
        clientName: control.client.name,
        siteName: control.site.name,
        itemResults: control.itemResults.map((item) => ({
          itemId: item.itemDefinitionId,
          label: item.itemDefinition.label,
          score: item.score,
          compliant: item.compliant
        }))
      })),
      nonConformities,
      documents,
      qcms: qcms.map((qcm) => ({ ...qcm, questions: qcm.questions.length })),
      qcmSessions,
      planning,
      reports,
      notifications,
      dashboardStats,
      qualityEvolution,
      severityStats
    });
  } catch {
    return apiOk({
      source: "demo",
      companies: [demoCompany],
      clients: demoClients,
      sites: demoSites,
      agents: demoAgents,
      assignments: demoAssignments,
      controlItems: demoControlItems,
      controls: demoControls,
      nonConformities: demoNonConformities,
      documents: demoDocuments,
      qcms: demoQcms,
      qcmSessions: demoQcmSessions,
      planning: demoPlanning,
      reports: demoReports,
      notifications: demoNotifications,
      dashboardStats,
      qualityEvolution,
      severityStats
    });
  }
}
