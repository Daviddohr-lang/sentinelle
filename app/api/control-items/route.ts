import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiOk, requireApiUser, scopedCompanyWhere } from "@/lib/api";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  id: z.string().optional(),
  label: z.string().min(2),
  category: z.string().min(2),
  coefficient: z.number().min(0).default(1),
  severity: z.enum(["MINEURE", "MAJEURE", "CRITIQUE"]).default("MINEURE"),
  color: z.string().default("#f59e0b"),
  correctionDelayHours: z.number().int().min(0).optional(),
  blocking: z.boolean().default(false),
  recommendedAction: z.string().optional(),
  autoNotify: z.boolean().default(false),
  clientVisible: z.boolean().default(true),
  impactsGlobalScore: z.boolean().default(true),
  photoRequirement: z.enum(["NONE", "OPTIONAL", "REQUIRED"]).default("OPTIONAL"),
  fileRequirement: z.enum(["NONE", "OPTIONAL", "REQUIRED"]).default("NONE"),
  voiceRequirement: z.enum(["NONE", "OPTIONAL", "REQUIRED"]).default("OPTIONAL"),
  active: z.boolean().default(true),
  sortOrder: z.number().int().default(0)
});

export async function GET(request: NextRequest) {
  const context = await requireApiUser(request, "controls.read");
  if ("status" in context) return context;
  const items = await prisma.controlItemDefinition.findMany({
    where: scopedCompanyWhere(context.user),
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }]
  });
  return apiOk({ items });
}

export async function POST(request: NextRequest) {
  const context = await requireApiUser(request, "company.manage");
  if ("status" in context) return context;
  if (!context.user.companyId) return apiError("Entreprise requise", 400);
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return apiError("Item de contrôle invalide", 400, parsed.error.flatten());

  const item = await prisma.controlItemDefinition.create({
    data: {
      ...parsed.data,
      companyId: context.user.companyId
    }
  });
  return apiOk({ item }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const context = await requireApiUser(request, "company.manage");
  if ("status" in context) return context;
  const parsed = schema.extend({ id: z.string() }).safeParse(await request.json());
  if (!parsed.success) return apiError("Item de contrôle invalide", 400, parsed.error.flatten());

  const current = await prisma.controlItemDefinition.findFirst({ where: { id: parsed.data.id, ...scopedCompanyWhere(context.user) } });
  if (!current) return apiError("Item introuvable", 404);

  const { id, ...data } = parsed.data;
  const item = await prisma.controlItemDefinition.update({
    where: { id },
    data
  });
  return apiOk({ item });
}

export async function DELETE(request: NextRequest) {
  const context = await requireApiUser(request, "company.manage");
  if ("status" in context) return context;
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return apiError("Identifiant requis", 400);
  const current = await prisma.controlItemDefinition.findFirst({ where: { id, ...scopedCompanyWhere(context.user) } });
  if (!current) return apiError("Item introuvable", 404);
  const item = await prisma.controlItemDefinition.update({ where: { id }, data: { active: false } });
  return apiOk({ item });
}
