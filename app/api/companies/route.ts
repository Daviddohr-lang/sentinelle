import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiOk, requireApiUser } from "@/lib/api";
import { SECURITY_COMPANY_LEGAL_NOTICE } from "@/lib/constants";
import { createLocalCompany, listLocalCompanies, LocalStoreError, updateLocalCompany, withDatabaseFallback } from "@/lib/local-store";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

const optionalText = z.string().nullish().transform((value) => value ?? undefined);

const schema = z.object({
  id: z.string().optional(),
  name: z.string().min(2),
  slug: optionalText,
  siret: optionalText,
  cnapsAuthorizationNumber: optionalText,
  address: optionalText,
  phone: optionalText,
  website: optionalText,
  legalNotice: optionalText,
  logoUrl: optionalText
});

export async function GET(request: NextRequest) {
  const context = await requireApiUser(request, "company.manage");
  if ("status" in context) return context;
  return withDatabaseFallback(
    async () => {
      const where = context.user.role === "SUPER_ADMIN" ? {} : { id: context.user.companyId ?? "" };
      const companies = await prisma.company.findMany({ where, orderBy: { name: "asc" } });
      return apiOk({ companies });
    },
    async () => apiOk({ companies: await listLocalCompanies(context.user) }),
    "GET /api/companies"
  );
}

export async function POST(request: NextRequest) {
  const context = await requireApiUser(request, "platform.manage");
  if ("status" in context) return context;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return apiError("Entreprise invalide", 400, parsed.error.flatten());

  const data = {
    name: parsed.data.name,
    slug: parsed.data.slug ?? slugify(parsed.data.name),
    siret: parsed.data.siret,
    cnapsAuthorizationNumber: parsed.data.cnapsAuthorizationNumber,
    address: parsed.data.address,
    phone: parsed.data.phone,
    website: parsed.data.website,
    legalNotice: parsed.data.legalNotice ?? SECURITY_COMPANY_LEGAL_NOTICE,
    logoUrl: parsed.data.logoUrl
  };

  return withDatabaseFallback(
    async () => {
      const company = await prisma.company.create({ data });
      return apiOk({ company }, { status: 201 });
    },
    async () => {
      try {
        const company = await createLocalCompany(data);
        return apiOk({ company }, { status: 201 });
      } catch (error) {
        if (error instanceof LocalStoreError) return apiError(error.message, error.status);
        throw error;
      }
    },
    "POST /api/companies"
  );
}

export async function PATCH(request: NextRequest) {
  const context = await requireApiUser(request, "company.manage");
  if ("status" in context) return context;
  const parsed = schema.extend({ id: z.string() }).safeParse(await request.json());
  if (!parsed.success) return apiError("Entreprise invalide", 400, parsed.error.flatten());
  if (context.user.role !== "SUPER_ADMIN" && parsed.data.id !== context.user.companyId) return apiError("Acces refuse", 403);

  const { id, ...payload } = parsed.data;
  const data = {
    name: payload.name,
    slug: payload.slug ?? slugify(payload.name),
    siret: payload.siret,
    cnapsAuthorizationNumber: payload.cnapsAuthorizationNumber,
    address: payload.address,
    phone: payload.phone,
    website: payload.website,
    legalNotice: payload.legalNotice ?? SECURITY_COMPANY_LEGAL_NOTICE,
    logoUrl: payload.logoUrl
  };

  return withDatabaseFallback(
    async () => {
      const company = await prisma.company.update({ where: { id }, data });
      return apiOk({ company });
    },
    async () => {
      try {
        const company = await updateLocalCompany(context.user, id, data);
        return apiOk({ company });
      } catch (error) {
        if (error instanceof LocalStoreError) return apiError(error.message, error.status);
        throw error;
      }
    },
    "PATCH /api/companies"
  );
}
