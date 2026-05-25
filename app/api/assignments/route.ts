import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiOk, requireApiUser, scopedCompanyWhere } from "@/lib/api";
import { archiveLocalAssignment, createLocalAssignment, listLocalAssignments, LocalStoreError, updateLocalAssignment, withDatabaseFallback } from "@/lib/local-store";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  agentId: z.string(),
  clientId: z.string(),
  siteId: z.string(),
  jobTitle: z.string().min(2),
  customJobTitle: z.string().optional(),
  startsAt: z.string(),
  endsAt: z.string().optional(),
  status: z.enum(["ACTIVE", "PLANNED", "ENDED", "ARCHIVED"]).optional()
});

export async function GET(request: NextRequest) {
  const context = await requireApiUser(request, "controls.read");
  if ("status" in context) return context;
  return withDatabaseFallback(
    async () => {
      const assignments = await prisma.assignment.findMany({
        where: { ...scopedCompanyWhere(context.user), status: { not: "ARCHIVED" } },
        include: { agent: true, client: true, site: true },
        orderBy: { startsAt: "desc" }
      });
      return apiOk({ assignments });
    },
    async () => apiOk({ assignments: await listLocalAssignments(context.user) }),
    "GET /api/assignments"
  );
}

export async function POST(request: NextRequest) {
  const context = await requireApiUser(request, "company.manage");
  if ("status" in context) return context;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return apiError("Affectation invalide", 400, parsed.error.flatten());

  return withDatabaseFallback(
    async () => {
      const scope = scopedCompanyWhere(context.user);
      const [agent, client, site] = await Promise.all([
        prisma.agent.findFirst({ where: { id: parsed.data.agentId, ...scope, active: true } }),
        prisma.client.findFirst({ where: { id: parsed.data.clientId, ...scope, active: true } }),
        prisma.site.findFirst({ where: { id: parsed.data.siteId, clientId: parsed.data.clientId, ...scope, active: true } })
      ]);
      if (!agent || !client || !site) return apiError("Agent, client ou site introuvable", 404);
      if (agent.companyId !== client.companyId || agent.companyId !== site.companyId) {
        return apiError("Agent, client et site doivent appartenir a la meme entreprise", 400);
      }

      const assignment = await prisma.assignment.create({
        data: {
          ...parsed.data,
          companyId: agent.companyId,
          startsAt: new Date(parsed.data.startsAt),
          endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : undefined
        },
        include: { agent: true, client: true, site: true }
      });

      return apiOk({ assignment }, { status: 201 });
    },
    async () => {
      try {
        const assignment = await createLocalAssignment(context.user, parsed.data);
        return apiOk({ assignment }, { status: 201 });
      } catch (error) {
        if (error instanceof LocalStoreError) return apiError(error.message, error.status);
        throw error;
      }
    },
    "POST /api/assignments"
  );
}

export async function PATCH(request: NextRequest) {
  const context = await requireApiUser(request, "company.manage");
  if ("status" in context) return context;
  const parsed = schema.partial().extend({ id: z.string() }).safeParse(await request.json());
  if (!parsed.success) return apiError("Affectation invalide", 400, parsed.error.flatten());
  const { id, startsAt, endsAt, ...data } = parsed.data;

  return withDatabaseFallback(
    async () => {
      const current = await prisma.assignment.findFirst({ where: { id, ...scopedCompanyWhere(context.user) } });
      if (!current) return apiError("Affectation introuvable", 404);

      const assignment = await prisma.assignment.update({
        where: { id },
        data: {
          ...data,
          startsAt: startsAt ? new Date(startsAt) : undefined,
          endsAt: endsAt ? new Date(endsAt) : undefined
        },
        include: { agent: true, client: true, site: true }
      });

      return apiOk({ assignment });
    },
    async () => {
      try {
        const assignment = await updateLocalAssignment(context.user, id, { ...data, startsAt, endsAt });
        return apiOk({ assignment });
      } catch (error) {
        if (error instanceof LocalStoreError) return apiError(error.message, error.status);
        throw error;
      }
    },
    "PATCH /api/assignments"
  );
}

export async function DELETE(request: NextRequest) {
  const context = await requireApiUser(request, "company.manage");
  if ("status" in context) return context;
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return apiError("Identifiant requis", 400);

  return withDatabaseFallback(
    async () => {
      const current = await prisma.assignment.findFirst({ where: { id, ...scopedCompanyWhere(context.user) } });
      if (!current) return apiError("Affectation introuvable", 404);
      const assignment = await prisma.assignment.update({ where: { id }, data: { status: "ARCHIVED", endsAt: new Date() }, include: { agent: true, client: true, site: true } });
      return apiOk({ assignment });
    },
    async () => {
      try {
        const assignment = await archiveLocalAssignment(context.user, id);
        return apiOk({ assignment });
      } catch (error) {
        if (error instanceof LocalStoreError) return apiError(error.message, error.status);
        throw error;
      }
    },
    "DELETE /api/assignments"
  );
}
