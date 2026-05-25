import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiOk, requireApiUser, scopedCompanyWhere } from "@/lib/api";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().min(2),
  reference: z.string().min(2),
  contactName: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  address: z.string().optional()
});

export async function GET(request: NextRequest) {
  const context = await requireApiUser(request, "controls.read");
  if ("status" in context) return context;
  const clients = await prisma.client.findMany({ where: scopedCompanyWhere(context.user), orderBy: { name: "asc" } });
  return apiOk({ clients });
}

export async function POST(request: NextRequest) {
  const context = await requireApiUser(request, "company.manage");
  if ("status" in context) return context;
  if (!context.user.companyId && context.user.role !== "SUPER_ADMIN") return apiError("Entreprise requise", 400);
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return apiError("Client invalide", 400, parsed.error.flatten());
  const companyId = request.nextUrl.searchParams.get("companyId") ?? context.user.companyId;
  if (!companyId) return apiError("Entreprise requise", 400);

  const client = await prisma.client.create({ data: { ...parsed.data, companyId } });
  return apiOk({ client }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const context = await requireApiUser(request, "company.manage");
  if ("status" in context) return context;
  const parsed = schema.partial().extend({ id: z.string() }).safeParse(await request.json());
  if (!parsed.success) return apiError("Client invalide", 400, parsed.error.flatten());
  const current = await prisma.client.findFirst({ where: { id: parsed.data.id, ...scopedCompanyWhere(context.user) } });
  if (!current) return apiError("Client introuvable", 404);
  const { id, ...data } = parsed.data;
  const client = await prisma.client.update({ where: { id }, data });
  return apiOk({ client });
}

export async function DELETE(request: NextRequest) {
  const context = await requireApiUser(request, "company.manage");
  if ("status" in context) return context;
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return apiError("Identifiant requis", 400);
  const current = await prisma.client.findFirst({ where: { id, ...scopedCompanyWhere(context.user) } });
  if (!current) return apiError("Client introuvable", 404);
  const client = await prisma.client.update({ where: { id }, data: { active: false, archivedAt: new Date() } });
  return apiOk({ client });
}
