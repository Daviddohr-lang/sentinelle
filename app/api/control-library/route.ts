/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiOk, requireApiUser, scopedCompanyWhere } from "@/lib/api";
import {
  archiveLocalControlCriterion,
  archiveLocalControlResponseOption,
  archiveLocalControlTemplate,
  archiveLocalControlPoint,
  createLocalControlCriterion,
  createLocalControlResponseOption,
  createLocalControlTemplate,
  createLocalControlPoint,
  listLocalControlLibrary,
  LocalStoreError,
  updateLocalControlCriterion,
  updateLocalControlResponseOption,
  updateLocalControlTemplate,
  updateLocalControlPoint,
  withDatabaseFallback
} from "@/lib/local-store";
import { prisma } from "@/lib/prisma";

const pointSchema = z.object({
  criterionId: z.string(),
  label: z.string().min(3),
  coefficient: z.number().min(0).max(10).optional(),
  defaultSeverity: z.enum(["MINEURE", "MAJEURE", "CRITIQUE"]).optional(),
  blocking: z.boolean().optional(),
  defaultCorrectiveAction: z.string().optional().nullable(),
  defaultCorrectionDelayHours: z.number().int().min(0).max(2160).optional().nullable(),
  photoRequirement: z.enum(["NONE", "OPTIONAL", "REQUIRED"]).optional(),
  fileRequirement: z.enum(["NONE", "OPTIONAL", "REQUIRED"]).optional(),
  voiceRequirement: z.enum(["NONE", "OPTIONAL", "REQUIRED"]).optional(),
  visibleInAgentReport: z.boolean().optional(),
  visibleInDirectionReport: z.boolean().optional(),
  visibleInClientReport: z.boolean().optional()
});

const templateSchema = z.object({
  companyId: z.string().optional().nullable(),
  title: z.string().min(3),
  description: z.string().optional().nullable()
});

const criterionSchema = z.object({
  templateId: z.string(),
  label: z.string().min(3),
  description: z.string().optional().nullable(),
  coefficient: z.number().min(0).max(10).optional()
});

const responseOptionSchema = z.object({
  pointId: z.string(),
  status: z.enum(["CONFORME", "NON_CONFORME", "SANS_OBJET"]).default("CONFORME"),
  label: z.string().min(3),
  impactLevel: z.enum(["VERT", "JAUNE", "ORANGE", "ROUGE", "CRITIQUE"]).default("VERT"),
  severity: z.enum(["MINEURE", "MAJEURE", "CRITIQUE"]).default("MINEURE"),
  score: z.number().int().min(0).max(100).default(100),
  affectsScore: z.boolean().default(true),
  affectsCompliance: z.boolean().default(true),
  correctiveAction: z.string().optional().nullable(),
  correctionDelayHours: z.number().int().min(0).max(2160).optional().nullable(),
  blocking: z.boolean().default(false),
  notificationRequired: z.boolean().default(false),
  visibleInAgentReport: z.boolean().default(true),
  visibleInDirectionReport: z.boolean().default(true),
  visibleInClientReport: z.boolean().default(true)
});

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create-template"), template: templateSchema }),
  z.object({ action: z.literal("update-template"), id: z.string(), template: templateSchema.partial() }),
  z.object({ action: z.literal("archive-template"), id: z.string() }),
  z.object({ action: z.literal("create-criterion"), criterion: criterionSchema }),
  z.object({ action: z.literal("update-criterion"), id: z.string(), criterion: criterionSchema.partial() }),
  z.object({ action: z.literal("archive-criterion"), id: z.string() }),
  z.object({ action: z.literal("create-point"), point: pointSchema }),
  z.object({ action: z.literal("update-point"), id: z.string(), point: pointSchema.partial() }),
  z.object({ action: z.literal("archive-point"), id: z.string() }),
  z.object({ action: z.literal("create-response-option"), responseOption: responseOptionSchema }),
  z.object({ action: z.literal("update-response-option"), id: z.string(), responseOption: responseOptionSchema.partial() }),
  z.object({ action: z.literal("archive-response-option"), id: z.string() })
]);

function localError(error: unknown) {
  if (error instanceof LocalStoreError) return apiError(error.message, error.status);
  throw error;
}

function requireGeneratedControlClient() {
  const db = prisma as unknown as {
    controlTemplate?: unknown;
    controlCriterion?: unknown;
    controlPoint?: unknown;
    controlPointResponseOption?: unknown;
  };
  if (!db.controlTemplate || !db.controlCriterion || !db.controlPoint || !db.controlPointResponseOption) {
    throw new Error("Prisma Client could not locate generated control library models");
  }
  return prisma as any;
}

export async function GET(request: NextRequest) {
  const context = await requireApiUser(request, "controls.read");
  if ("status" in context) return context;

  return withDatabaseFallback(
    async () => {
      const db = requireGeneratedControlClient();
      const scope = scopedCompanyWhere(context.user);
      const templates = await db.controlTemplate.findMany({ where: { ...scope, active: true, archivedAt: null }, orderBy: { updatedAt: "desc" } });
      const templateIds = templates.map((template: { id: string }) => template.id);
      const criteria = await db.controlCriterion.findMany({
        where: { templateId: { in: templateIds }, active: true, archivedAt: null },
        orderBy: { sortOrder: "asc" }
      });
      const criterionIds = criteria.map((criterion: { id: string }) => criterion.id);
      const points = await db.controlPoint.findMany({
        where: { criterionId: { in: criterionIds }, active: true, archivedAt: null },
        orderBy: { sortOrder: "asc" }
      });
      const pointIds = points.map((point: { id: string }) => point.id);
      const responseOptions = await db.controlPointResponseOption.findMany({
        where: { pointId: { in: pointIds }, active: true, archivedAt: null },
        orderBy: { sortOrder: "asc" }
      });
      const [agents, clients, sites, sessions] = await Promise.all([
        db.agent.findMany({ where: { ...scope, active: true }, orderBy: { lastName: "asc" } }),
        db.client.findMany({ where: { ...scope, active: true }, orderBy: { name: "asc" } }),
        db.site.findMany({ where: { ...scope, active: true }, orderBy: { name: "asc" } }),
        db.controlSession.findMany({
          where: scope,
          take: 50,
          include: { agent: true, client: true, site: true, criterionResults: true, pointResults: true, reports: true },
          orderBy: { startedAt: "desc" }
        })
      ]);
      return apiOk({
        source: "database",
        templates,
        criteria,
        points,
        responseOptions,
        agents,
        clients,
        sites,
        sessions,
        stats: {
          templates: templates.length,
          criteria: criteria.length,
          points: points.length,
          responseOptions: responseOptions.length,
          sessions: sessions.length
        }
      });
    },
    async () => apiOk({ source: "local", ...(await listLocalControlLibrary(context.user)) }),
    "GET /api/control-library"
  );
}

export async function POST(request: NextRequest) {
  const context = await requireApiUser(request, "controls.write");
  if ("status" in context) return context;
  if (!["SUPER_ADMIN", "COMPANY_ADMIN", "QUALITY_CONTROLLER"].includes(context.user.role)) {
    return apiError("Permission insuffisante", 403);
  }
  const parsed = actionSchema.safeParse(await request.json());
  if (!parsed.success) return apiError("Action référentiel contrôle invalide", 400, parsed.error.flatten());

  return withDatabaseFallback(
    async () => {
      const db = requireGeneratedControlClient();
      if (parsed.data.action === "create-template") {
        const companyId = context.user.companyId ?? parsed.data.template.companyId;
        if (!companyId) return apiError("Entreprise requise", 400);
        const template = await db.controlTemplate.create({
          data: {
            companyId,
            title: parsed.data.template.title,
            description: parsed.data.template.description,
            reportRules: {
              reportTypes: ["COMPLET_INTERNE", "RAPPORT_AGENT", "RAPPORT_DIRECTION", "SIMPLIFIE_CLIENT"],
              qcmIncluded: true
            }
          }
        });
        return apiOk({ template }, { status: 201 });
      }
      if (parsed.data.action === "update-template") {
        const template = await db.controlTemplate.update({ where: { id: parsed.data.id }, data: parsed.data.template });
        return apiOk({ template });
      }
      if (parsed.data.action === "archive-template") {
        const template = await db.controlTemplate.update({ where: { id: parsed.data.id }, data: { active: false, archivedAt: new Date() } });
        return apiOk({ template });
      }
      if (parsed.data.action === "create-criterion") {
        const template = await db.controlTemplate.findFirst({ where: { id: parsed.data.criterion.templateId, ...scopedCompanyWhere(context.user), active: true, archivedAt: null } });
        if (!template) return apiError("Modèle de contrôle introuvable", 404);
        const criterion = await db.controlCriterion.create({
          data: {
            companyId: template.companyId,
            templateId: template.id,
            label: parsed.data.criterion.label,
            description: parsed.data.criterion.description,
            coefficient: parsed.data.criterion.coefficient ?? 1
          }
        });
        return apiOk({ criterion }, { status: 201 });
      }
      if (parsed.data.action === "update-criterion") {
        const criterion = await db.controlCriterion.update({ where: { id: parsed.data.id }, data: parsed.data.criterion });
        return apiOk({ criterion });
      }
      if (parsed.data.action === "archive-criterion") {
        const criterion = await db.controlCriterion.update({ where: { id: parsed.data.id }, data: { active: false, archivedAt: new Date() } });
        return apiOk({ criterion });
      }
      if (parsed.data.action === "create-point") {
        const criterion = await db.controlCriterion.findFirst({ where: { id: parsed.data.point.criterionId, ...scopedCompanyWhere(context.user) } });
        if (!criterion) return apiError("Critère de contrôle introuvable", 404);
        const point = await db.controlPoint.create({
          data: {
            companyId: criterion.companyId,
            criterionId: criterion.id,
            label: parsed.data.point.label,
            coefficient: parsed.data.point.coefficient ?? 1,
            defaultSeverity: parsed.data.point.defaultSeverity ?? "MINEURE",
            blocking: parsed.data.point.blocking ?? false,
            defaultCorrectiveAction: parsed.data.point.defaultCorrectiveAction,
            defaultCorrectionDelayHours: parsed.data.point.defaultCorrectionDelayHours ?? 48,
            photoRequirement: parsed.data.point.photoRequirement ?? "OPTIONAL",
            fileRequirement: parsed.data.point.fileRequirement ?? "NONE",
            voiceRequirement: parsed.data.point.voiceRequirement ?? "OPTIONAL",
            visibleInAgentReport: parsed.data.point.visibleInAgentReport ?? true,
            visibleInDirectionReport: parsed.data.point.visibleInDirectionReport ?? true,
            visibleInClientReport: parsed.data.point.visibleInClientReport ?? true
          }
        });
        await db.controlPointResponseOption.createMany({
          data: [
            {
              companyId: criterion.companyId,
              pointId: point.id,
              status: "CONFORME",
              label: "Conforme : exigence respectée",
              impactLevel: "VERT",
              severity: "MINEURE",
              score: 100,
              affectsScore: true,
              affectsCompliance: true,
              sortOrder: 0
            },
            {
              companyId: criterion.companyId,
              pointId: point.id,
              status: "NON_CONFORME",
              label: `Non conforme : ${point.label.toLowerCase()}`,
              impactLevel: point.blocking ? "CRITIQUE" : point.defaultSeverity === "MAJEURE" ? "ROUGE" : "ORANGE",
              severity: point.blocking ? "CRITIQUE" : point.defaultSeverity,
              score: point.blocking ? 0 : point.defaultSeverity === "MAJEURE" ? 35 : 60,
              affectsScore: true,
              affectsCompliance: true,
              correctiveAction: point.defaultCorrectiveAction,
              correctionDelayHours: point.defaultCorrectionDelayHours,
              blocking: point.blocking,
              notificationRequired: point.blocking,
              visibleInAgentReport: point.visibleInAgentReport,
              visibleInDirectionReport: point.visibleInDirectionReport,
              visibleInClientReport: point.visibleInClientReport,
              sortOrder: 1
            },
            {
              companyId: criterion.companyId,
              pointId: point.id,
              status: "SANS_OBJET",
              label: "Sans objet : exigence non applicable",
              impactLevel: "JAUNE",
              severity: "MINEURE",
              score: 100,
              affectsScore: false,
              affectsCompliance: false,
              sortOrder: 2
            }
          ]
        });
        return apiOk({ point }, { status: 201 });
      }
      if (parsed.data.action === "update-point") {
        const point = await db.controlPoint.update({ where: { id: parsed.data.id }, data: parsed.data.point });
        return apiOk({ point });
      }
      if (parsed.data.action === "archive-point") {
        const point = await db.controlPoint.update({ where: { id: parsed.data.id }, data: { active: false, archivedAt: new Date() } });
        return apiOk({ point });
      }
      if (parsed.data.action === "create-response-option") {
        const point = await db.controlPoint.findFirst({ where: { id: parsed.data.responseOption.pointId, ...scopedCompanyWhere(context.user) } });
        if (!point) return apiError("Point de contrôle introuvable", 404);
        const responseOption = await db.controlPointResponseOption.create({
          data: {
            ...parsed.data.responseOption,
            companyId: point.companyId,
            pointId: point.id
          }
        });
        return apiOk({ responseOption }, { status: 201 });
      }
      if (parsed.data.action === "update-response-option") {
        const responseOption = await db.controlPointResponseOption.update({ where: { id: parsed.data.id }, data: parsed.data.responseOption });
        return apiOk({ responseOption });
      }
      if (parsed.data.action === "archive-response-option") {
        const responseOption = await db.controlPointResponseOption.update({ where: { id: parsed.data.id }, data: { active: false, archivedAt: new Date() } });
        return apiOk({ responseOption });
      }
      return apiError("Action référentiel non supportée", 400);
    },
    async () => {
      try {
        if (parsed.data.action === "create-template") return apiOk({ template: await createLocalControlTemplate(context.user, parsed.data.template) }, { status: 201 });
        if (parsed.data.action === "update-template") {
          const template = { ...parsed.data.template, companyId: undefined };
          return apiOk({ template: await updateLocalControlTemplate(context.user, parsed.data.id, template) });
        }
        if (parsed.data.action === "archive-template") return apiOk({ template: await archiveLocalControlTemplate(context.user, parsed.data.id) });
        if (parsed.data.action === "create-criterion") return apiOk({ criterion: await createLocalControlCriterion(context.user, parsed.data.criterion) }, { status: 201 });
        if (parsed.data.action === "update-criterion") return apiOk({ criterion: await updateLocalControlCriterion(context.user, parsed.data.id, parsed.data.criterion) });
        if (parsed.data.action === "archive-criterion") return apiOk({ criterion: await archiveLocalControlCriterion(context.user, parsed.data.id) });
        if (parsed.data.action === "create-point") return apiOk(await createLocalControlPoint(context.user, parsed.data.point), { status: 201 });
        if (parsed.data.action === "update-point") return apiOk({ point: await updateLocalControlPoint(context.user, parsed.data.id, parsed.data.point) });
        if (parsed.data.action === "archive-point") return apiOk({ point: await archiveLocalControlPoint(context.user, parsed.data.id) });
        if (parsed.data.action === "create-response-option") return apiOk({ responseOption: await createLocalControlResponseOption(context.user, parsed.data.responseOption) }, { status: 201 });
        if (parsed.data.action === "update-response-option") return apiOk({ responseOption: await updateLocalControlResponseOption(context.user, parsed.data.id, parsed.data.responseOption) });
        if (parsed.data.action === "archive-response-option") return apiOk({ responseOption: await archiveLocalControlResponseOption(context.user, parsed.data.id) });
      } catch (error) {
        return localError(error);
      }
    },
    "POST /api/control-library"
  );
}
