import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiOk, requireApiUser, scopedCompanyWhere } from "@/lib/api";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  agentId: z.string(),
  clientId: z.string(),
  siteId: z.string(),
  jobTitle: z.string().min(2),
  customJobTitle: z.string().optional(),
  startsAt: z.string(),
  endsAt: z.string().optional()
});

export async function GET(request: NextRequest) {
  const context = await requireApiUser(request, "controls.read");
  if ("status" in context) return context;
  const assignments = await prisma.assignment.findMany({
    where: scopedCompanyWhere(context.user),
    include: { agent: true, client: true, site: true },
    orderBy: { startsAt: "desc" }
  });
  return apiOk({ assignments });
}

export async function POST(request: NextRequest) {
  const context = await requireApiUser(request, "company.manage");
  if ("status" in context) return context;
  if (!context.user.companyId) return apiError("Entreprise requise", 400);
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return apiError("Affectation invalide", 400, parsed.error.flatten());

  const assignment = await prisma.assignment.create({
    data: {
      ...parsed.data,
      companyId: context.user.companyId,
      startsAt: new Date(parsed.data.startsAt),
      endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : undefined
    }
  });

  return apiOk({ assignment }, { status: 201 });
}
