import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiOk, requireApiUser, scopedCompanyWhere } from "@/lib/api";
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

function dueDate(hours?: number | null) {
  if (hours === null || hours === undefined) return undefined;
  const date = new Date();
  date.setHours(date.getHours() + hours);
  return date;
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
  if (!context.user.companyId) return apiError("Entreprise requise", 400);

  const parsed = controlSchema.safeParse(await request.json());
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
