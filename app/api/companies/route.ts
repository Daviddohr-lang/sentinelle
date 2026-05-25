import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiOk, requireApiUser } from "@/lib/api";
import { SECURITY_COMPANY_LEGAL_NOTICE } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

const schema = z.object({
  id: z.string().optional(),
  name: z.string().min(2),
  slug: z.string().optional(),
  siret: z.string().optional(),
  cnapsAuthorizationNumber: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  legalNotice: z.string().optional(),
  logoUrl: z.string().optional()
});

export async function GET(request: NextRequest) {
  const context = await requireApiUser(request, "company.manage");
  if ("status" in context) return context;
  const where = context.user.role === "SUPER_ADMIN" ? {} : { id: context.user.companyId ?? "" };
  const companies = await prisma.company.findMany({ where, orderBy: { name: "asc" } });
  return apiOk({ companies });
}

export async function POST(request: NextRequest) {
  const context = await requireApiUser(request, "platform.manage");
  if ("status" in context) return context;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return apiError("Entreprise invalide", 400, parsed.error.flatten());

  const company = await prisma.company.create({
    data: {
      name: parsed.data.name,
      slug: parsed.data.slug ?? slugify(parsed.data.name),
      siret: parsed.data.siret,
      cnapsAuthorizationNumber: parsed.data.cnapsAuthorizationNumber,
      address: parsed.data.address,
      phone: parsed.data.phone,
      website: parsed.data.website,
      legalNotice: parsed.data.legalNotice ?? SECURITY_COMPANY_LEGAL_NOTICE,
      logoUrl: parsed.data.logoUrl
    }
  });

  return apiOk({ company }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const context = await requireApiUser(request, "company.manage");
  if ("status" in context) return context;
  const parsed = schema.extend({ id: z.string() }).safeParse(await request.json());
  if (!parsed.success) return apiError("Entreprise invalide", 400, parsed.error.flatten());
  if (context.user.role !== "SUPER_ADMIN" && parsed.data.id !== context.user.companyId) return apiError("Acces refuse", 403);

  const company = await prisma.company.update({
    where: { id: parsed.data.id },
    data: {
      name: parsed.data.name,
      slug: parsed.data.slug ?? slugify(parsed.data.name),
      siret: parsed.data.siret,
      cnapsAuthorizationNumber: parsed.data.cnapsAuthorizationNumber,
      address: parsed.data.address,
      phone: parsed.data.phone,
      website: parsed.data.website,
      legalNotice: parsed.data.legalNotice ?? SECURITY_COMPANY_LEGAL_NOTICE,
      logoUrl: parsed.data.logoUrl
    }
  });
  return apiOk({ company });
}
