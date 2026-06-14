/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiOk, requireApiUser, scopedCompanyWhere } from "@/lib/api";
import { calculateControlScore } from "@/lib/control-template-library";
import { createLocalDynamicControlSession, LocalStoreError, withDatabaseFallback } from "@/lib/local-store";
import { prisma } from "@/lib/prisma";

const itemResultSchema = z.object({
  itemDefinitionId: z.string(),
  score: z.number().min(0).max(100),
  comment: z.string().optional()
});

const controlSchema = z.object({
  type: z.enum(["PROGRAMME", "INOPINE"]),
  plannedAt: z.string().optional(),
  startedAt: z.string().optional(),
  agentId: z.string(),
  clientId: z.string(),
  siteId: z.string(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  detectedAddress: z.string().optional(),
  observations: z.string().optional(),
  agentSignature: z.string().optional(),
  controllerSignature: z.string().optional(),
  itemResults: z.array(itemResultSchema).min(1)
});

const dynamicPointResultSchema = z.object({
  criterionId: z.string(),
  pointId: z.string(),
  responseOptionId: z.string(),
  observation: z.string().optional().nullable()
});

const dynamicControlSchema = z.object({
  type: z.enum(["PROGRAMME", "INOPINE"]),
  templateId: z.string(),
  selectedCriterionIds: z.array(z.string()).min(1),
  pointResults: z.array(dynamicPointResultSchema).min(1),
  plannedAt: z.string().optional(),
  startedAt: z.string().optional(),
  agentId: z.string(),
  clientId: z.string(),
  siteId: z.string(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  detectedAddress: z.string().optional().nullable(),
  observations: z.string().optional().nullable(),
  agentSignature: z.string().optional().nullable(),
  controllerSignature: z.string().optional().nullable(),
  qcmCategories: z.array(z.enum(["ENTREPRISE", "METIER", "CLIENT_SITE"])).default([])
});

function dueDate(hours?: number | null) {
  if (hours === null || hours === undefined) return undefined;
  const date = new Date();
  date.setHours(date.getHours() + hours);
  return date;
}

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
    controlSession?: unknown;
  };
  if (!db.controlTemplate || !db.controlCriterion || !db.controlPoint || !db.controlPointResponseOption || !db.controlSession) {
    throw new Error("Prisma Client could not locate generated control library models");
  }
  return prisma as any;
}

export async function GET(request: NextRequest) {
  const context = await requireApiUser(request, "controls.read");
  if ("status" in context) return context;

  const controls = await prisma.control.findMany({
    where: scopedCompanyWhere(context.user),
    include: {
      agent: true,
      client: true,
      site: true,
      controller: true,
      itemResults: { include: { itemDefinition: true } },
      nonConformities: true
    },
    orderBy: { startedAt: "desc" }
  });
  return apiOk({ controls });
}

export async function POST(request: NextRequest) {
  const context = await requireApiUser(request, "controls.write");
  if ("status" in context) return context;
  const payload = await request.json();

  if (payload && typeof payload === "object" && "templateId" in payload) {
    const parsed = dynamicControlSchema.safeParse(payload);
    if (!parsed.success) return apiError("Controle dynamique invalide", 400, parsed.error.flatten());

    return withDatabaseFallback(
      async () => {
        const db = requireGeneratedControlClient();
        const template = await db.controlTemplate.findFirst({ where: { id: parsed.data.templateId, ...scopedCompanyWhere(context.user), active: true, archivedAt: null } });
        if (!template) return apiError("Modèle de contrôle introuvable", 404);
        const [criteria, points, responseOptions] = await Promise.all([
          db.controlCriterion.findMany({ where: { templateId: template.id, active: true, archivedAt: null } }),
          db.controlPoint.findMany({ where: { companyId: template.companyId, active: true, archivedAt: null } }),
          db.controlPointResponseOption.findMany({ where: { companyId: template.companyId, active: true, archivedAt: null } })
        ]);
        const score = calculateControlScore(
          {
            controlCriteria: criteria,
            controlPoints: points,
            controlPointResponseOptions: responseOptions
          },
          parsed.data.selectedCriterionIds,
          parsed.data.pointResults
        );
        const optionById = new Map<string, any>(responseOptions.map((option: any) => [String(option.id), option]));
        const pointById = new Map<string, any>(points.map((point: any) => [String(point.id), point]));
        const control = await db.control.create({
          data: {
            companyId: template.companyId,
            type: parsed.data.type,
            plannedAt: parsed.data.plannedAt ? new Date(parsed.data.plannedAt) : undefined,
            startedAt: parsed.data.startedAt ? new Date(parsed.data.startedAt) : new Date(),
            completedAt: new Date(),
            controllerId: context.user.id,
            agentId: parsed.data.agentId,
            clientId: parsed.data.clientId,
            siteId: parsed.data.siteId,
            latitude: parsed.data.latitude ?? undefined,
            longitude: parsed.data.longitude ?? undefined,
            detectedAddress: parsed.data.detectedAddress ?? undefined,
            observations: parsed.data.observations ?? undefined,
            agentSignature: parsed.data.agentSignature ?? undefined,
            controllerSignature: parsed.data.controllerSignature ?? undefined,
            globalScore: score.globalScore,
            status: parsed.data.qcmCategories.length ? "EN_ATTENTE_QCM" : "A_VALIDER"
          },
          include: { agent: true, client: true, site: true }
        });
        const session = await db.controlSession.create({
          data: {
            companyId: template.companyId,
            controlId: control.id,
            templateId: template.id,
            agentId: parsed.data.agentId,
            clientId: parsed.data.clientId,
            siteId: parsed.data.siteId,
            type: parsed.data.type,
            status: control.status,
            selectedCriterionIds: parsed.data.selectedCriterionIds,
            globalScore: score.globalScore,
            complianceLevel: score.complianceLevel,
            startedAt: control.startedAt,
            completedAt: control.completedAt,
            metadata: {
              qcmCategories: parsed.data.qcmCategories,
              qcmFeedsScore: true,
              controllerId: context.user.id
            }
          }
        });
        await db.controlCriterionResult.createMany({
          data: score.criterionScores.map((criterion) => ({
            sessionId: session.id,
            criterionId: criterion.criterionId,
            score: criterion.score
          }))
        });
        const pointResultByPoint = new Map<string, string>();
        for (const result of parsed.data.pointResults) {
          const option = optionById.get(result.responseOptionId);
          const point = pointById.get(result.pointId);
          if (!option || !point) continue;
          const pointResult = await db.controlPointResult.create({
            data: {
              sessionId: session.id,
              criterionId: result.criterionId,
              pointId: result.pointId,
              responseOptionId: result.responseOptionId,
              status: option.status,
              score: option.score,
              impactLevel: option.impactLevel,
              severity: option.severity,
              blockingTriggered: option.blocking,
              observation: result.observation,
              correctiveAction: option.correctiveAction ?? point.defaultCorrectiveAction,
              correctionDelayHours: option.correctionDelayHours ?? point.defaultCorrectionDelayHours,
              reportVisibility: {
                agent: option.visibleInAgentReport,
                direction: option.visibleInDirectionReport,
                client: option.visibleInClientReport
              }
            }
          });
          pointResultByPoint.set(result.pointId, pointResult.id);
          if (option.status === "NON_CONFORME") {
            const nonConformity = await db.nonConformity.create({
              data: {
                companyId: template.companyId,
                title: `${point.label} non conforme`,
                description: result.observation ?? option.correctiveAction ?? `Écart détecté pendant le contrôle dynamique.`,
                severity: option.blocking ? "CRITIQUE" : option.severity,
                status: "OUVERTE",
                agentId: control.agentId,
                clientId: control.clientId,
                siteId: control.siteId,
                controlId: control.id,
                dueAt: dueDate(option.correctionDelayHours ?? point.defaultCorrectionDelayHours),
                delayLabel: option.correctionDelayHours === 0 ? "immédiat" : `${option.correctionDelayHours ?? point.defaultCorrectionDelayHours ?? 48}h`,
                internalOnly: !option.visibleInClientReport
              }
            });
            await db.controlNonConformityLink.create({ data: { pointResultId: pointResult.id, nonConformityId: nonConformity.id } });
            await db.correctiveAction.create({
              data: {
                companyId: template.companyId,
                sessionId: session.id,
                nonConformityId: nonConformity.id,
                title: `Action corrective - ${point.label}`,
                description: option.correctiveAction ?? point.defaultCorrectiveAction,
                severity: option.severity,
                dueAt: dueDate(option.correctionDelayHours ?? point.defaultCorrectionDelayHours),
                status: "OUVERTE"
              }
            });
            if (option.blocking) {
              await db.notification.create({
                data: {
                  companyId: template.companyId,
                  targetRole: "BUSINESS_OWNER",
                  type: "ALERTE_CRITIQUE",
                  title: "Alerte critique contrôle qualité",
                  message: `${point.label} constaté pour ${control.agent.firstName} ${control.agent.lastName} sur ${control.site.name}.`
                }
              });
            }
          }
        }
        await db.controlReport.createMany({
          data: [
            { type: "COMPLET_INTERNE", title: "Rapport complet interne" },
            { type: "RAPPORT_AGENT", title: "Rapport agent" },
            { type: "RAPPORT_DIRECTION", title: "Rapport direction" },
            { type: "SIMPLIFIE_CLIENT", title: "Rapport client simplifié" }
          ].map((report) => ({
            companyId: template.companyId,
            sessionId: session.id,
            type: report.type,
            title: report.title,
            fileUrl: `/api/reports/control/${session.id}?type=${report.type}`,
            payload: {
              globalScore: score.globalScore,
              complianceLevel: score.complianceLevel,
              nonConformitiesCount: score.nonConformingResults.length,
              criticalAlertsCount: score.criticalAlerts.length,
              qcmIncluded: true
            }
          }))
        });
        const signatures = [
          parsed.data.agentSignature
            ? {
                companyId: template.companyId,
                sessionId: session.id,
                role: "agent",
                signerName: `${control.agent.firstName} ${control.agent.lastName}`,
                dataUrl: parsed.data.agentSignature
              }
            : null,
          parsed.data.controllerSignature
            ? {
                companyId: template.companyId,
                sessionId: session.id,
                role: "controleur",
                signerName: `${context.user.firstName} ${context.user.lastName}`,
                dataUrl: parsed.data.controllerSignature
              }
            : null
        ].filter(Boolean);
        if (signatures.length) await db.controlSignature.createMany({ data: signatures });
        return apiOk(
          {
            control,
            session,
            generatedNonConformities: score.nonConformingResults.length,
            criticalAlerts: score.criticalAlerts.length,
            pointResultCount: pointResultByPoint.size
          },
          { status: 201 }
        );
      },
      async () => {
        try {
          return apiOk(await createLocalDynamicControlSession(context.user, parsed.data), { status: 201 });
        } catch (error) {
          return localError(error);
        }
      },
      "POST /api/controls dynamic"
    );
  }

  if (!context.user.companyId) return apiError("Entreprise requise", 400);

  const parsed = controlSchema.safeParse(payload);
  if (!parsed.success) return apiError("Controle invalide", 400, parsed.error.flatten());

  const definitions = await prisma.controlItemDefinition.findMany({
    where: {
      id: { in: parsed.data.itemResults.map((item) => item.itemDefinitionId) },
      ...scopedCompanyWhere(context.user)
    }
  });

  if (definitions.length !== parsed.data.itemResults.length) {
    return apiError("Un ou plusieurs items sont introuvables", 404);
  }

  const byId = new Map(definitions.map((definition) => [definition.id, definition]));
  const weighted = parsed.data.itemResults.reduce(
    (acc, item) => {
      const definition = byId.get(item.itemDefinitionId);
      const coefficient = definition?.impactsGlobalScore ? definition.coefficient : 0;
      return {
        score: acc.score + item.score * coefficient,
        coefficient: acc.coefficient + coefficient
      };
    },
    { score: 0, coefficient: 0 }
  );
  const globalScore = weighted.coefficient ? Math.round(weighted.score / weighted.coefficient) : 0;

  const control = await prisma.control.create({
    data: {
      companyId: context.user.companyId,
      type: parsed.data.type,
      plannedAt: parsed.data.plannedAt ? new Date(parsed.data.plannedAt) : undefined,
      startedAt: parsed.data.startedAt ? new Date(parsed.data.startedAt) : new Date(),
      controllerId: context.user.id,
      agentId: parsed.data.agentId,
      clientId: parsed.data.clientId,
      siteId: parsed.data.siteId,
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude,
      detectedAddress: parsed.data.detectedAddress,
      observations: parsed.data.observations,
      agentSignature: parsed.data.agentSignature,
      controllerSignature: parsed.data.controllerSignature,
      globalScore,
      status: "A_VALIDER",
      itemResults: {
        create: parsed.data.itemResults.map((item) => {
          const definition = byId.get(item.itemDefinitionId);
          const blockingTriggered = Boolean(definition?.blocking && item.score < 100);
          return {
            itemDefinitionId: item.itemDefinitionId,
            score: item.score,
            compliant: item.score >= 80 && !blockingTriggered,
            comment: item.comment,
            blockingTriggered,
            evidenceRequired:
              definition?.photoRequirement === "REQUIRED" ||
              definition?.fileRequirement === "REQUIRED" ||
              definition?.voiceRequirement === "REQUIRED"
          };
        })
      }
    },
    include: { itemResults: { include: { itemDefinition: true } }, agent: true, client: true, site: true }
  });

  const nonCompliantItems = control.itemResults.filter((item) => !item.compliant || item.blockingTriggered);
  for (const item of nonCompliantItems) {
    await prisma.nonConformity.create({
      data: {
        companyId: context.user.companyId,
        title: `${item.itemDefinition.label} non conforme`,
        description: item.comment ?? `Score ${item.score} % constate pendant le controle.`,
        severity: item.blockingTriggered ? "CRITIQUE" : item.itemDefinition.severity,
        status: "OUVERTE",
        itemDefinitionId: item.itemDefinitionId,
        itemResultId: item.id,
        agentId: control.agentId,
        clientId: control.clientId,
        siteId: control.siteId,
        controlId: control.id,
        dueAt: dueDate(item.itemDefinition.correctionDelayHours),
        delayLabel: item.itemDefinition.correctionDelayHours === 0 ? "immediat" : `${item.itemDefinition.correctionDelayHours ?? 48}h`,
        internalOnly: !item.itemDefinition.clientVisible
      }
    });

    if (item.blockingTriggered) {
      await prisma.notification.create({
        data: {
          companyId: context.user.companyId,
          targetRole: "BUSINESS_OWNER",
          type: "ALERTE_CRITIQUE",
          title: "Alerte critique terrain",
          message: `${item.itemDefinition.label} constate pour ${control.agent.firstName} ${control.agent.lastName} sur ${control.site.name}.`
        }
      });
    }
  }

  return apiOk({ control, generatedNonConformities: nonCompliantItems.length }, { status: 201 });
}
