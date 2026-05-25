import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiOk, requireApiUser, scopedCompanyWhere } from "@/lib/api";
import { archiveLocalClient, createLocalClient, listLocalClients, LocalStoreError, updateLocalClient, withDatabaseFallback } from "@/lib/local-store";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  companyId: z.string().optional(),
  name: z.string().min(2),
  reference: z.string().min(2),
  contactName: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  address: z.string().optional()
});

async function resolveWritableCompanyId(userCompanyId: string | null, role: string, requestedCompanyId?: string | null) {
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
      const clients = await prisma.client.findMany({ where: { ...scopedCompanyWhere(context.user), active: true }, orderBy: { name: "asc" } });
      return apiOk({ clients });
    },
    async () => apiOk({ clients: await listLocalClients(context.user) }),
    "GET /api/clients"
  );
}

export async function POST(request: NextRequest) {
  const context = await requireApiUser(request, "company.manage");
  if ("status" in context) return context;
  if (!context.user.companyId && context.user.role !== "SUPER_ADMIN") return apiError("Entreprise requise", 400);
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return apiError("Client invalide", 400, parsed.error.flatten());
  const { companyId: bodyCompanyId, ...data } = parsed.data;
  const requestedCompanyId = request.nextUrl.searchParams.get("companyId") ?? bodyCompanyId;

  return withDatabaseFallback(
    async () => {
      const companyId = await resolveWritableCompanyId(context.user.companyId, context.user.role, requestedCompanyId);
      if (!companyId) return apiError("Entreprise requise", 400);
      const client = await prisma.client.create({ data: { ...data, companyId } });
      return apiOk({ client }, { status: 201 });
    },
    async () => {
      try {
        const client = await createLocalClient(context.user, data, requestedCompanyId);
        return apiOk({ client }, { status: 201 });
      } catch (error) {
        if (error instanceof LocalStoreError) return apiError(error.message, error.status);
        throw error;
      }
    },
    "POST /api/clients"
  );
}

export async function PATCH(request: NextRequest) {
  const context = await requireApiUser(request, "company.manage");
  if ("status" in context) return context;
  const parsed = schema.partial().extend({ id: z.string() }).safeParse(await request.json());
  if (!parsed.success) return apiError("Client invalide", 400, parsed.error.flatten());
  const { id, ...data } = parsed.data;
  return withDatabaseFallback(
    async () => {
      const current = await prisma.client.findFirst({ where: { id, ...scopedCompanyWhere(context.user) } });
      if (!current) return apiError("Client introuvable", 404);
      const client = await prisma.client.update({ where: { id }, data });
      return apiOk({ client });
    },
    async () => {
      try {
        const client = await updateLocalClient(context.user, id, data);
        return apiOk({ client });
      } catch (error) {
        if (error instanceof LocalStoreError) return apiError(error.message, error.status);
        throw error;
      }
    },
    "PATCH /api/clients"
  );
}

export async function DELETE(request: NextRequest) {
  const context = await requireApiUser(request, "company.manage");
  if ("status" in context) return context;
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return apiError("Identifiant requis", 400);
  return withDatabaseFallback(
    async () => {
      const current = await prisma.client.findFirst({ where: { id, ...scopedCompanyWhere(context.user) } });
      if (!current) return apiError("Client introuvable", 404);
      const client = await prisma.client.update({ where: { id }, data: { active: false, archivedAt: new Date() } });
      return apiOk({ client });
    },
    async () => {
      try {
        const client = await archiveLocalClient(context.user, id);
        return apiOk({ client });
      } catch (error) {
        if (error instanceof LocalStoreError) return apiError(error.message, error.status);
        throw error;
      }
    },
    "DELETE /api/clients"
  );
}
