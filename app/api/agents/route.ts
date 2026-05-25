import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiOk, requireApiUser, scopedCompanyWhere } from "@/lib/api";
import { archiveLocalAgent, createLocalAgent, listLocalAgents, LocalStoreError, updateLocalAgent, withDatabaseFallback } from "@/lib/local-store";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  companyId: z.string().optional(),
  photoUrl: z.string().optional(),
  civility: z.enum(["MONSIEUR", "MADAME"]).optional(),
  matricule: z.string().min(2),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  birthDate: z.string().optional(),
  birthPlace: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  professionalCardNumber: z.string().optional(),
  professionalCardExpiresAt: z.string().optional(),
  sstExpiresAt: z.string().optional(),
  ssiapExpiresAt: z.string().optional(),
  diplomas: z.array(z.string()).optional(),
  eligibleJobTitles: z.array(z.string()).optional(),
  contractType: z.enum(["CDD", "CDI", "APPRENTI"]).optional(),
  hiredAt: z.string().optional(),
  notes: z.string().optional()
});

async function resolveWritableCompanyId(userCompanyId: string | null, role: string, requestedCompanyId?: string) {
  if (userCompanyId) return userCompanyId;
  if (role !== "SUPER_ADMIN") return null;
  if (requestedCompanyId) return requestedCompanyId;
  const company = await prisma.company.findFirst({ where: { status: "ACTIVE" }, orderBy: { createdAt: "asc" }, select: { id: true } });
  return company?.id ?? null;
}

export async function GET(request: NextRequest) {
  const context = await requireApiUser(request, "controls.read");
  if ("status" in context) return context;
  return withDatabaseFallback(
    async () => {
      const agents = await prisma.agent.findMany({ where: { ...scopedCompanyWhere(context.user), active: true }, orderBy: [{ lastName: "asc" }, { firstName: "asc" }] });
      return apiOk({ agents });
    },
    async () => apiOk({ agents: await listLocalAgents(context.user) }),
    "GET /api/agents"
  );
}

export async function POST(request: NextRequest) {
  const context = await requireApiUser(request, "company.manage");
  if ("status" in context) return context;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return apiError("Agent invalide", 400, parsed.error.flatten());
  const { companyId: requestedCompanyId, professionalCardExpiresAt, sstExpiresAt, ssiapExpiresAt, birthDate, hiredAt, ...data } = parsed.data;
  return withDatabaseFallback(
    async () => {
      const companyId = await resolveWritableCompanyId(context.user.companyId, context.user.role, requestedCompanyId);
      if (!companyId) return apiError("Entreprise requise", 400);
      const agent = await prisma.agent.create({
        data: {
          ...data,
          companyId,
          birthDate: birthDate ? new Date(birthDate) : undefined,
          professionalCardExpiresAt: professionalCardExpiresAt ? new Date(professionalCardExpiresAt) : undefined,
          sstExpiresAt: sstExpiresAt ? new Date(sstExpiresAt) : undefined,
          ssiapExpiresAt: ssiapExpiresAt ? new Date(ssiapExpiresAt) : undefined,
          hiredAt: hiredAt ? new Date(hiredAt) : undefined
        }
      });
      return apiOk({ agent }, { status: 201 });
    },
    async () => {
      try {
        const agent = await createLocalAgent(context.user, parsed.data, requestedCompanyId);
        return apiOk({ agent }, { status: 201 });
      } catch (error) {
        if (error instanceof LocalStoreError) return apiError(error.message, error.status);
        throw error;
      }
    },
    "POST /api/agents"
  );
}

export async function PATCH(request: NextRequest) {
  const context = await requireApiUser(request, "company.manage");
  if ("status" in context) return context;
  const parsed = schema.partial().extend({ id: z.string() }).safeParse(await request.json());
  if (!parsed.success) return apiError("Agent invalide", 400, parsed.error.flatten());
  const { id, professionalCardExpiresAt, sstExpiresAt, ssiapExpiresAt, birthDate, hiredAt, ...data } = parsed.data;
  delete data.companyId;
  return withDatabaseFallback(
    async () => {
      const current = await prisma.agent.findFirst({ where: { id, ...scopedCompanyWhere(context.user) } });
      if (!current) return apiError("Agent introuvable", 404);
      const agent = await prisma.agent.update({
        where: { id },
        data: {
          ...data,
          birthDate: birthDate ? new Date(birthDate) : undefined,
          professionalCardExpiresAt: professionalCardExpiresAt ? new Date(professionalCardExpiresAt) : undefined,
          sstExpiresAt: sstExpiresAt ? new Date(sstExpiresAt) : undefined,
          ssiapExpiresAt: ssiapExpiresAt ? new Date(ssiapExpiresAt) : undefined,
          hiredAt: hiredAt ? new Date(hiredAt) : undefined
        }
      });
      return apiOk({ agent });
    },
    async () => {
      try {
        const agent = await updateLocalAgent(context.user, id, { ...data, professionalCardExpiresAt, sstExpiresAt, ssiapExpiresAt, birthDate, hiredAt });
        return apiOk({ agent });
      } catch (error) {
        if (error instanceof LocalStoreError) return apiError(error.message, error.status);
        throw error;
      }
    },
    "PATCH /api/agents"
  );
}

export async function DELETE(request: NextRequest) {
  const context = await requireApiUser(request, "company.manage");
  if ("status" in context) return context;
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return apiError("Identifiant requis", 400);
  return withDatabaseFallback(
    async () => {
      const current = await prisma.agent.findFirst({ where: { id, ...scopedCompanyWhere(context.user) } });
      if (!current) return apiError("Agent introuvable", 404);
      const agent = await prisma.agent.update({ where: { id }, data: { active: false, archivedAt: new Date() } });
      return apiOk({ agent });
    },
    async () => {
      try {
        const agent = await archiveLocalAgent(context.user, id);
        return apiOk({ agent });
      } catch (error) {
        if (error instanceof LocalStoreError) return apiError(error.message, error.status);
        throw error;
      }
    },
    "DELETE /api/agents"
  );
}
