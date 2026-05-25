import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiOk, requireApiUser, scopedCompanyWhere } from "@/lib/api";
import { archiveLocalAgent, createLocalAgent, listLocalAgents, LocalStoreError, updateLocalAgent, withDatabaseFallback } from "@/lib/local-store";
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
  if (!context.user.companyId) return apiError("Entreprise requise", 400);
  const companyId = context.user.companyId;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return apiError("Agent invalide", 400, parsed.error.flatten());
  return withDatabaseFallback(
    async () => {
      const agent = await prisma.agent.create({
        data: {
          ...parsed.data,
          companyId,
          professionalCardExpiresAt: parsed.data.professionalCardExpiresAt ? new Date(parsed.data.professionalCardExpiresAt) : undefined,
          sstExpiresAt: parsed.data.sstExpiresAt ? new Date(parsed.data.sstExpiresAt) : undefined,
          ssiapExpiresAt: parsed.data.ssiapExpiresAt ? new Date(parsed.data.ssiapExpiresAt) : undefined
        }
      });
      return apiOk({ agent }, { status: 201 });
    },
    async () => {
      try {
        const agent = await createLocalAgent(context.user, parsed.data);
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
  const { id, professionalCardExpiresAt, sstExpiresAt, ssiapExpiresAt, ...data } = parsed.data;
  return withDatabaseFallback(
    async () => {
      const current = await prisma.agent.findFirst({ where: { id, ...scopedCompanyWhere(context.user) } });
      if (!current) return apiError("Agent introuvable", 404);
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
    },
    async () => {
      try {
        const agent = await updateLocalAgent(context.user, id, { ...data, professionalCardExpiresAt, sstExpiresAt, ssiapExpiresAt });
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
