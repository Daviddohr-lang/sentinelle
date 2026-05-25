import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiOk, requireApiUser, scopedCompanyWhere } from "@/lib/api";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  title: z.string().min(3),
  controllerId: z.string().optional(),
  agentId: z.string().optional(),
  clientId: z.string().optional(),
  siteId: z.string().optional(),
  requestedStart: z.string(),
  requestedEnd: z.string(),
  preferredTimeWindow: z.string().optional(),
  reason: z.string().optional()
});

export async function GET(request: NextRequest) {
  const context = await requireApiUser(request, "planning.manage");
  if ("status" in context) return context;
  const planning = await prisma.planningRequest.findMany({
    where: scopedCompanyWhere(context.user),
    include: { requester: true, controller: true },
    orderBy: { requestedStart: "asc" }
  });
  return apiOk({ planning });
}

export async function POST(request: NextRequest) {
  const context = await requireApiUser(request, "planning.manage");
  if ("status" in context) return context;
  if (!context.user.companyId) return apiError("Entreprise requise", 400);
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return apiError("Demande de controle invalide", 400, parsed.error.flatten());

  const planning = await prisma.planningRequest.create({
    data: {
      ...parsed.data,
      companyId: context.user.companyId,
      requesterId: context.user.id,
      requestedStart: new Date(parsed.data.requestedStart),
      requestedEnd: new Date(parsed.data.requestedEnd),
      status: context.user.role === "BUSINESS_OWNER" ? "DEMANDE" : "PLANIFIE"
    }
  });
  return apiOk({ planning }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const context = await requireApiUser(request, "planning.manage");
  if ("status" in context) return context;
  const parsed = schema.partial().extend({ id: z.string(), status: z.enum(["DEMANDE", "ACCEPTE", "PLANIFIE", "REALISE", "CLOTURE", "REFUSE", "REPORTE"]).optional() }).safeParse(await request.json());
  if (!parsed.success) return apiError("Mise à jour planning invalide", 400, parsed.error.flatten());
  const current = await prisma.planningRequest.findFirst({ where: { id: parsed.data.id, ...scopedCompanyWhere(context.user) } });
  if (!current) return apiError("Demande introuvable", 404);
  const { id, requestedStart, requestedEnd, ...data } = parsed.data;
  const planning = await prisma.planningRequest.update({
    where: { id },
    data: {
      ...data,
      requestedStart: requestedStart ? new Date(requestedStart) : undefined,
      requestedEnd: requestedEnd ? new Date(requestedEnd) : undefined
    }
  });
  return apiOk({ planning });
}
