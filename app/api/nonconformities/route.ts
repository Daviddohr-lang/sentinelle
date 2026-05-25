import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiOk, requireApiUser, scopedCompanyWhere } from "@/lib/api";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(3),
  severity: z.enum(["MINEURE", "MAJEURE", "CRITIQUE"]),
  itemDefinitionId: z.string().optional(),
  agentId: z.string().optional(),
  clientId: z.string(),
  siteId: z.string(),
  controlId: z.string().optional(),
  dueAt: z.string().optional(),
  delayLabel: z.string().optional(),
  internalOnly: z.boolean().default(true)
});

const patchSchema = z.object({
  id: z.string(),
  status: z.enum(["OUVERTE", "EN_COURS", "CORRIGEE", "VALIDEE", "REFUSEE", "CLOTUREE"]).optional(),
  validate: z.boolean().optional(),
  close: z.boolean().optional(),
  comment: z.string().optional()
});

export async function GET(request: NextRequest) {
  const context = await requireApiUser(request, "nonconformities.read");
  if ("status" in context) return context;
  const nonConformities = await prisma.nonConformity.findMany({
    where: scopedCompanyWhere(context.user),
    include: { agent: true, client: true, site: true, itemDefinition: true, comments: true, evidences: true },
    orderBy: { createdAt: "desc" }
  });
  return apiOk({ nonConformities });
}

export async function POST(request: NextRequest) {
  const context = await requireApiUser(request, "nonconformities.write");
  if ("status" in context) return context;
  if (!context.user.companyId) return apiError("Entreprise requise", 400);
  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) return apiError("Non-conformite invalide", 400, parsed.error.flatten());

  const nonConformity = await prisma.nonConformity.create({
    data: {
      ...parsed.data,
      companyId: context.user.companyId,
      dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : undefined
    }
  });
  return apiOk({ nonConformity }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const context = await requireApiUser(request, "nonconformities.validate");
  if ("status" in context) return context;
  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) return apiError("Mise a jour invalide", 400, parsed.error.flatten());

  const current = await prisma.nonConformity.findFirst({ where: { id: parsed.data.id, ...scopedCompanyWhere(context.user) } });
  if (!current) return apiError("Non-conformite introuvable", 404);

  const status = parsed.data.close ? "CLOTUREE" : parsed.data.validate ? "VALIDEE" : parsed.data.status;
  const nonConformity = await prisma.nonConformity.update({
    where: { id: parsed.data.id },
    data: {
      status,
      validatedAt: parsed.data.validate ? new Date() : undefined,
      validatedById: parsed.data.validate ? context.user.id : undefined,
      closedAt: parsed.data.close ? new Date() : undefined,
      comments: parsed.data.comment
        ? {
            create: {
              authorName: `${context.user.firstName} ${context.user.lastName}`,
              body: parsed.data.comment,
              internal: true
            }
          }
        : undefined
    }
  });

  if (parsed.data.validate) {
    await prisma.notification.create({
      data: {
        companyId: current.companyId,
        targetRole: current.internalOnly ? "BUSINESS_OWNER" : "CLIENT",
        type: "NON_CONFORMITE_VALIDEE",
        title: "Non-conformite validee",
        message: current.internalOnly
          ? `${current.title} a ete validee et doit etre traitee.`
          : `${current.title} a ete validee avec une action de suivi.`
      }
    });
  }

  return apiOk({ nonConformity });
}
