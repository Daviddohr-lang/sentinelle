import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiOk, requireApiUser, scopedCompanyWhere } from "@/lib/api";
import { archiveLocalSite, createLocalSite, listLocalSites, LocalStoreError, updateLocalSite, withDatabaseFallback } from "@/lib/local-store";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  clientId: z.string(),
  name: z.string().min(2),
  reference: z.string().min(2),
  address: z.string().min(2),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  riskLevel: z.string().optional()
});

export async function GET(request: NextRequest) {
  const context = await requireApiUser(request, "controls.read");
  if ("status" in context) return context;
  return withDatabaseFallback(
    async () => {
      const sites = await prisma.site.findMany({ where: { ...scopedCompanyWhere(context.user), active: true }, include: { client: true }, orderBy: { name: "asc" } });
      return apiOk({ sites });
    },
    async () => apiOk({ sites: await listLocalSites(context.user) }),
    "GET /api/sites"
  );
}

export async function POST(request: NextRequest) {
  const context = await requireApiUser(request, "company.manage");
  if ("status" in context) return context;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return apiError("Site invalide", 400, parsed.error.flatten());
  return withDatabaseFallback(
    async () => {
      const client = await prisma.client.findFirst({ where: { id: parsed.data.clientId, ...scopedCompanyWhere(context.user), active: true } });
      if (!client) return apiError("Client introuvable", 404);
      const site = await prisma.site.create({ data: { ...parsed.data, companyId: client.companyId }, include: { client: true } });
      return apiOk({ site }, { status: 201 });
    },
    async () => {
      try {
        const site = await createLocalSite(context.user, parsed.data);
        return apiOk({ site }, { status: 201 });
      } catch (error) {
        if (error instanceof LocalStoreError) return apiError(error.message, error.status);
        throw error;
      }
    },
    "POST /api/sites"
  );
}

export async function PATCH(request: NextRequest) {
  const context = await requireApiUser(request, "company.manage");
  if ("status" in context) return context;
  const parsed = schema.partial().extend({ id: z.string() }).safeParse(await request.json());
  if (!parsed.success) return apiError("Site invalide", 400, parsed.error.flatten());
  const { id, ...data } = parsed.data;
  return withDatabaseFallback(
    async () => {
      const current = await prisma.site.findFirst({ where: { id, ...scopedCompanyWhere(context.user) } });
      if (!current) return apiError("Site introuvable", 404);
      if (data.clientId && data.clientId !== current.clientId) {
        const client = await prisma.client.findFirst({ where: { id: data.clientId, companyId: current.companyId, active: true } });
        if (!client) return apiError("Client introuvable", 404);
      }
      const site = await prisma.site.update({ where: { id }, data, include: { client: true } });
      return apiOk({ site });
    },
    async () => {
      try {
        const site = await updateLocalSite(context.user, id, data);
        return apiOk({ site });
      } catch (error) {
        if (error instanceof LocalStoreError) return apiError(error.message, error.status);
        throw error;
      }
    },
    "PATCH /api/sites"
  );
}

export async function DELETE(request: NextRequest) {
  const context = await requireApiUser(request, "company.manage");
  if ("status" in context) return context;
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return apiError("Identifiant requis", 400);
  return withDatabaseFallback(
    async () => {
      const current = await prisma.site.findFirst({ where: { id, ...scopedCompanyWhere(context.user) } });
      if (!current) return apiError("Site introuvable", 404);
      const site = await prisma.site.update({ where: { id }, data: { active: false, archivedAt: new Date() } });
      return apiOk({ site });
    },
    async () => {
      try {
        const site = await archiveLocalSite(context.user, id);
        return apiOk({ site });
      } catch (error) {
        if (error instanceof LocalStoreError) return apiError(error.message, error.status);
        throw error;
      }
    },
    "DELETE /api/sites"
  );
}
