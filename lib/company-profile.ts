import type { SessionUser } from "@/lib/auth";
import { SECURITY_COMPANY_LEGAL_NOTICE } from "@/lib/constants";
import { demoCompany } from "@/lib/demo-data";
import { getLocalCompanyProfile } from "@/lib/local-store";
import { prisma } from "@/lib/prisma";

export type ShellCompanyProfile = {
  id: string;
  name: string;
  logoUrl: string | null;
  siret: string | null;
  cnapsAuthorizationNumber: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  legalNotice: string;
};

function normalizeCompanyProfile(company: Partial<Omit<ShellCompanyProfile, "legalNotice">> & { id?: string | null; name?: string | null; legalNotice?: string | null }): ShellCompanyProfile {
  return {
    id: company.id ?? demoCompany.id,
    name: company.name ?? demoCompany.name,
    logoUrl: company.logoUrl ?? demoCompany.logoUrl ?? null,
    siret: company.siret ?? demoCompany.siret ?? null,
    cnapsAuthorizationNumber: company.cnapsAuthorizationNumber ?? demoCompany.cnapsAuthorizationNumber ?? null,
    address: company.address ?? demoCompany.address ?? null,
    phone: company.phone ?? demoCompany.phone ?? null,
    website: company.website ?? demoCompany.website ?? null,
    legalNotice: company.legalNotice ?? demoCompany.legalNotice ?? SECURITY_COMPANY_LEGAL_NOTICE
  };
}

export function fallbackCompanyProfile() {
  return normalizeCompanyProfile(demoCompany);
}

export async function getShellCompanyProfile(user: SessionUser) {
  try {
    const company = await prisma.company.findFirst({
      where: user.role === "SUPER_ADMIN" ? { status: "ACTIVE" } : { id: user.companyId ?? "__none__" },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        logoUrl: true,
        siret: true,
        cnapsAuthorizationNumber: true,
        address: true,
        phone: true,
        website: true,
        legalNotice: true
      }
    });

    if (company) return normalizeCompanyProfile(company);
  } catch (error) {
    if (process.env.NODE_ENV === "production" && process.env.DEMO_MODE !== "true") {
      console.error(error);
    }
  }

  try {
    const localCompany = await getLocalCompanyProfile(user);
    if (localCompany) return normalizeCompanyProfile(localCompany);
  } catch (error) {
    if (process.env.NODE_ENV === "production" && process.env.DEMO_MODE !== "true") {
      console.error(error);
    }
  }

  return fallbackCompanyProfile();
}
