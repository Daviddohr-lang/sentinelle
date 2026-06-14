/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiOk, requireApiUser } from "@/lib/api";
import type { SessionUser } from "@/lib/auth";
import { readLocalStore, scopedLocalCompanies, withDatabaseFallback, writeLocalStore } from "@/lib/local-store";
import { prisma } from "@/lib/prisma";

const defaultThemes = ["Vigilance", "Traçabilité", "Main courante", "Tenue", "Déontologie", "Relation client", "Sécurité incendie", "Intervention", "RGPD", "Consignes site"];

const themeSchema = z.object({
  name: z.string().min(2),
  companyId: z.string().optional().nullable()
});

function canManagePrevention(user: SessionUser) {
  return user.role === "SUPER_ADMIN" || user.role === "COMPANY_ADMIN" || user.role === "QUALITY_CONTROLLER";
}

function normalizeTheme(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function uniqueThemes(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  return values
    .map((value) => normalizeTheme(value ?? ""))
    .filter(Boolean)
    .filter((theme) => {
      const key = theme
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.localeCompare(b, "fr"));
}

function settingsRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function themesFromSettings(value: unknown) {
  const settings = settingsRecord(value);
  return Array.isArray(settings.preventionThemes) ? settings.preventionThemes.filter((theme): theme is string => typeof theme === "string") : [];
}

function targetCompanyId(user: SessionUser, requestedCompanyId?: string | null) {
  return user.role === "SUPER_ADMIN" ? requestedCompanyId ?? user.companyId ?? null : user.companyId;
}

export async function GET(request: NextRequest) {
  const context = await requireApiUser(request);
  if ("status" in context) return context;

  return withDatabaseFallback(
    async () => {
      const db = prisma as any;
      const companyWhere = context.user.role === "SUPER_ADMIN" ? {} : { id: context.user.companyId ?? "__none__" };
      const messageWhere = context.user.role === "SUPER_ADMIN" ? {} : { OR: [{ companyId: context.user.companyId }, { companyId: null }] };
      const [companies, messages] = await Promise.all([
        db.company.findMany({ where: companyWhere, select: { settings: true } }),
        db.preventionMessage.findMany({ where: messageWhere, select: { theme: true } })
      ]);
      const customThemes = companies.flatMap((company: { settings: unknown }) => themesFromSettings(company.settings));
      const messageThemes = messages.map((message: { theme?: string | null }) => message.theme);
      return apiOk({ themes: uniqueThemes([...defaultThemes, ...customThemes, ...messageThemes]), canManage: canManagePrevention(context.user) });
    },
    async () => {
      const store = await readLocalStore();
      const companies = scopedLocalCompanies(store.companies, context.user);
      const companyIds = new Set(companies.map((company) => company.id));
      const customThemes = companies.flatMap((company) => themesFromSettings(company.settings));
      const messageThemes = store.preventionMessages.filter((message) => !message.companyId || context.user.role === "SUPER_ADMIN" || companyIds.has(message.companyId)).map((message) => message.theme);
      return apiOk({ themes: uniqueThemes([...defaultThemes, ...customThemes, ...messageThemes]), canManage: canManagePrevention(context.user) });
    },
    "GET /api/prevention-themes"
  );
}

export async function POST(request: NextRequest) {
  const context = await requireApiUser(request);
  if ("status" in context) return context;
  if (!canManagePrevention(context.user)) return apiError("Permission insuffisante", 403);

  const parsed = themeSchema.safeParse(await request.json());
  if (!parsed.success) return apiError("Thématique invalide", 400, parsed.error.flatten());
  const theme = normalizeTheme(parsed.data.name);
  const companyId = targetCompanyId(context.user, parsed.data.companyId);
  if (!companyId) return apiError("Entreprise requise", 400);

  return withDatabaseFallback(
    async () => {
      const db = prisma as any;
      const company = await db.company.findUnique({ where: { id: companyId }, select: { id: true, settings: true } });
      if (!company) return apiError("Entreprise introuvable", 404);
      if (context.user.role !== "SUPER_ADMIN" && company.id !== context.user.companyId) return apiError("Accès entreprise interdit", 403);
      const settings = settingsRecord(company.settings);
      const themes = uniqueThemes([...themesFromSettings(settings), theme]);
      const updated = await db.company.update({
        where: { id: company.id },
        data: { settings: { ...settings, preventionThemes: themes } },
        select: { settings: true }
      });
      return apiOk({ themes: uniqueThemes([...defaultThemes, ...themesFromSettings(updated.settings)]), theme });
    },
    async () => {
      const store = await readLocalStore();
      const companyIndex = store.companies.findIndex((company) => company.id === companyId);
      if (companyIndex === -1) return apiError("Entreprise introuvable", 404);
      if (context.user.role !== "SUPER_ADMIN" && store.companies[companyIndex].id !== context.user.companyId) return apiError("Accès entreprise interdit", 403);
      const settings = settingsRecord(store.companies[companyIndex].settings);
      const themes = uniqueThemes([...themesFromSettings(settings), theme]);
      store.companies[companyIndex] = {
        ...store.companies[companyIndex],
        settings: { ...settings, preventionThemes: themes },
        updatedAt: new Date().toISOString()
      };
      await writeLocalStore(store);
      return apiOk({ themes: uniqueThemes([...defaultThemes, ...themes]), theme });
    },
    "POST /api/prevention-themes"
  );
}
