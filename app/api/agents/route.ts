import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiOk, requireApiUser, scopedCompanyWhere } from "@/lib/api";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  matricule: z.string().min(2),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  professionalCardNumber: z.string().optional(),
  professionalCardExpiresAt: z.string().optional(),
  sstExpiresAt: z.string().optional(),
  ssiapExpiresAt: z.string().optional(),
  notes: z.string().optional()
});

export async function GET(request: NextRequest) {
  const context = await requireApiUser(request, "controls.read");
  if ("status" in context) return context;
  const agents = await prisma.agent.findMany({ where: scopedCompanyWhere(context.user), orderBy: [{ lastName: "asc" }, { firstName: "asc" }] });
  return apiOk({ agents });
}

export async function POST(request: NextRequest) {
  const context = await requireApiUser(request, "company.manage");
  if ("status" in context) return context;
  if (!context.user.companyId) return apiError("Entreprise requise", 400);
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return apiError("Agent invalide", 400, parsed.error.flatten());
  const agent = await prisma.agent.create({
    data: {
      ...parsed.data,
      companyId: context.user.companyId,
      professionalCardExpiresAt: parsed.data.professionalCardExpiresAt ? new Date(parsed.data.professionalCardExpiresAt) : undefined,
      sstExpiresAt: parsed.data.sstExpiresAt ? new Date(parsed.data.sstExpiresAt) : undefined,
      ssiapExpiresAt: parsed.data.ssiapExpiresAt ? new Date(parsed.data.ssiapExpiresAt) : undefined
    }
  });
  return apiOk({ agent }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const context = await requireApiUser(request, "company.manage");
  if ("status" in context) return context;
  const parsed = schema.partial().extend({ id: z.string() }).safeParse(await request.json());
  if (!parsed.success) return apiError("Agent invalide", 400, parsed.error.flatten());
  const current = await prisma.agent.findFirst({ where: { id: parsed.data.id, ...scopedCompanyWhere(context.user) } });
  if (!current) return apiError("Agent introuvable", 404);
  const { id, professionalCardExpiresAt, sstExpiresAt, ssiapExpiresAt, ...data } = parsed.data;
  const agent = await prisma.agent.update({
    where: { id },
    data: {
      ...data,
      professionalCardExpiresAt: professionalCardExpiresAt ? new Date(professionalCardExpiresAt) : undefined,
      sstExpiresAt: sstExpiresAt ? new Date(sstExpiresAt) : undefined,
      ssiapExpiresAt: ssiapExpiresAt ? new Date(ssiapExpiresAt) : undefined
    }
  });
  return apiOk({ agent });
}

export async function DELETE(request: NextRequest) {
  const context = await requireApiUser(request, "company.manage");
  if ("status" in context) return context;
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return apiError("Identifiant requis", 400);
  const current = await prisma.agent.findFirst({ where: { id, ...scopedCompanyWhere(context.user) } });
  if (!current) return apiError("Agent introuvable", 404);
  const agent = await prisma.agent.update({ where: { id }, data: { active: false, archivedAt: new Date() } });
  return apiOk({ agent });
}
