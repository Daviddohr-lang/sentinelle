import type { NextRequest } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiError, apiOk, requireApiUser, scopedCompanyWhere } from "@/lib/api";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  scope: z.enum(["AGENT", "ENTREPRISE", "CLIENT", "SITE", "CONSIGNE_SITE", "RAPPORT_AUDIT", "JUSTIFICATIF_REGLEMENTAIRE"]),
  title: z.string().min(2),
  category: z.string().min(2),
  description: z.string().optional(),
  fileUrl: z.string().optional(),
  fileName: z.string().optional(),
  mimeType: z.string().optional(),
  expiresAt: z.string().optional(),
  agentId: z.string().optional(),
  clientId: z.string().optional(),
  siteId: z.string().optional(),
  visibility: z.enum(["INTERNE", "AGENT", "CLIENT_AUTORISE", "DIRECTION", "PUBLIC_CONTROLE"]).default("INTERNE"),
  allowedRoles: z.array(z.nativeEnum(Role)).default([])
});

export async function GET(request: NextRequest) {
  const context = await requireApiUser(request, "documents.read");
  if ("status" in context) return context;

  const scope = scopedCompanyWhere(context.user);
  const role = context.user.role;
  if (role === "AGENT") {
    const agent = await prisma.agent.findUnique({
      where: { userId: context.user.id },
      include: { assignments: true }
    });
    const siteIds = agent?.assignments.map((assignment) => assignment.siteId) ?? [];
    const documents = await prisma.document.findMany({
      where: {
        ...scope,
        OR: [
          { agentId: agent?.id ?? "__none__" },
          { siteId: { in: siteIds }, allowedRoles: { has: "AGENT" } },
          { siteId: { in: siteIds }, scope: "CONSIGNE_SITE" }
        ]
      },
      orderBy: [{ status: "asc" }, { expiresAt: "asc" }]
    });
    return apiOk({ documents });
  }

  const roleFilter =
    role === "SUPER_ADMIN" || role === "COMPANY_ADMIN" || role === "QUALITY_CONTROLLER" || role === "BUSINESS_OWNER"
      ? {}
      : {
          OR: [
            { allowedRoles: { has: role } },
            role === "CLIENT" ? { visibility: "CLIENT_AUTORISE" as const } : { visibility: "AGENT" as const }
          ]
        };

  const documents = await prisma.document.findMany({
    where: { ...scope, ...roleFilter },
    orderBy: [{ status: "asc" }, { expiresAt: "asc" }]
  });
  return apiOk({ documents });
}

export async function POST(request: NextRequest) {
  const context = await requireApiUser(request, "documents.write");
  if ("status" in context) return context;
  if (!context.user.companyId) return apiError("Entreprise requise", 400);
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return apiError("Document invalide", 400, parsed.error.flatten());

  const document = await prisma.document.create({
    data: {
      ...parsed.data,
      companyId: context.user.companyId,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : undefined,
      tags: [],
      status: parsed.data.expiresAt && new Date(parsed.data.expiresAt) < new Date() ? "EXPIRE" : "EN_ATTENTE_VALIDATION"
    }
  });
  return apiOk({ document }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const context = await requireApiUser(request, "documents.write");
  if ("status" in context) return context;
  const parsed = schema.partial().extend({ id: z.string(), status: z.enum(["VALIDE", "EN_ATTENTE_VALIDATION", "MANQUANT", "EXPIRANT_BIENTOT", "EXPIRE", "REFUSE", "ARCHIVE"]).optional() }).safeParse(await request.json());
  if (!parsed.success) return apiError("Document invalide", 400, parsed.error.flatten());
  const current = await prisma.document.findFirst({ where: { id: parsed.data.id, ...scopedCompanyWhere(context.user) } });
  if (!current) return apiError("Document introuvable", 404);
  const { id, expiresAt, ...data } = parsed.data;
  const document = await prisma.document.update({
    where: { id },
    data: {
      ...data,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      validatedAt: data.status === "VALIDE" ? new Date() : undefined,
      validatedById: data.status === "VALIDE" ? context.user.id : undefined
    }
  });
  return apiOk({ document });
}

export async function DELETE(request: NextRequest) {
  const context = await requireApiUser(request, "documents.write");
  if ("status" in context) return context;
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return apiError("Identifiant requis", 400);
  const current = await prisma.document.findFirst({ where: { id, ...scopedCompanyWhere(context.user) } });
  if (!current) return apiError("Document introuvable", 404);
  const document = await prisma.document.update({ where: { id }, data: { status: "ARCHIVE", archivedAt: new Date() } });
  return apiOk({ document });
}
