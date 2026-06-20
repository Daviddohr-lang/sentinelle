import type { NextRequest } from "next/server";
import { apiError, apiOk, requireApiUser, scopedCompanyWhere } from "@/lib/api";
import { isImportType, parseImportWorkbook } from "@/lib/import-excel";
import { prisma } from "@/lib/prisma";

async function resolveCompanyId(user: { companyId: string | null; role: string }) {
  if (user.companyId) return user.companyId;
  if (user.role !== "SUPER_ADMIN") return null;
  try {
    const company = await prisma.company.findFirst({ where: { status: "ACTIVE" }, orderBy: { createdAt: "asc" }, select: { id: true, name: true } });
    return company?.id ?? null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const context = await requireApiUser(request, "company.manage");
  if ("status" in context) return context;

  const formData = await request.formData();
  const type = String(formData.get("type") ?? "");
  const file = formData.get("file");
  if (!isImportType(type)) return apiError("Type d'import inconnu", 400);
  if (!(file instanceof File)) return apiError("Fichier Excel requis", 400);

  const buffer = Buffer.from(await file.arrayBuffer());
  const rows = parseImportWorkbook(buffer, type);
  const companyId = await resolveCompanyId(context.user);
  const globalErrors: string[] = [];
  if (!companyId) globalErrors.push("Créez d'abord une entreprise active avant d'importer des données.");

  const enrichedRows = await Promise.all(
    rows.map(async (row) => {
      if (!companyId || row.errors.length) return { ...row, exists: false, existingId: null, operation: row.errors.length ? "erreur" : "creation" };
      if (type === "agents") {
        const data = row.data as { email?: string; matricule?: string };
        const existing = await prisma.agent.findFirst({
          where: {
            companyId,
            active: true,
            OR: [{ email: data.email || "__none__" }, { matricule: data.matricule || "__none__" }]
          },
          select: { id: true }
        });
        return { ...row, exists: Boolean(existing), existingId: existing?.id ?? null, operation: existing ? "doublon" : "creation" };
      }
      if (type === "clients-sites") {
        const data = row.data as { client?: { reference?: string }; site?: { reference?: string } | null };
        const existingClient = await prisma.client.findFirst({ where: { companyId, reference: data.client?.reference || "__none__", active: true }, select: { id: true } });
        const existingSite = data.site ? await prisma.site.findFirst({ where: { companyId, reference: data.site.reference || "__none__", active: true }, select: { id: true } }) : null;
        return { ...row, exists: Boolean(existingClient || existingSite), existingId: existingSite?.id ?? existingClient?.id ?? null, operation: existingClient || existingSite ? "doublon" : "creation" };
      }
      if (type === "qcm") {
        const data = row.data as { bankTitle?: string; question?: string };
        const existing = await prisma.qcmQuestion.findFirst({
          where: {
            ...scopedCompanyWhere(context.user),
            label: data.question || "__none__",
            bank: { title: data.bankTitle || "__none__" }
          },
          select: { id: true }
        });
        return { ...row, exists: Boolean(existing), existingId: existing?.id ?? null, operation: existing ? "doublon" : "creation" };
      }
      const data = row.data as { templateTitle?: string; criterionLabel?: string; pointLabel?: string; responseLabel?: string };
      const existing = await prisma.controlPointResponseOption.findFirst({
        where: {
          ...scopedCompanyWhere(context.user),
          label: data.responseLabel || "__none__",
          point: {
            label: data.pointLabel || "__none__",
            criterion: {
              label: data.criterionLabel || "__none__",
              template: { title: data.templateTitle || "__none__" }
            }
          }
        },
        select: { id: true }
      });
      return { ...row, exists: Boolean(existing), existingId: existing?.id ?? null, operation: existing ? "doublon" : "creation" };
    })
  );

  return apiOk({
    type,
    filename: file.name,
    companyId,
    globalErrors,
    rows: enrichedRows,
    summary: {
      total: enrichedRows.length,
      errors: enrichedRows.filter((row) => row.errors.length).length + globalErrors.length,
      warnings: enrichedRows.reduce((sum, row) => sum + row.warnings.length, 0),
      duplicates: enrichedRows.filter((row) => row.exists).length,
      creatable: enrichedRows.filter((row) => !row.exists && !row.errors.length).length
    }
  });
}
