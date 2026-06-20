/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiOk, requireApiUser } from "@/lib/api";
import type { DuplicateMode, ParsedImportRow } from "@/lib/import-excel";
import { importTypes } from "@/lib/import-excel";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  type: z.enum(importTypes),
  duplicateMode: z.enum(["skip", "update", "reject"]).default("skip"),
  rows: z.array(
    z.object({
      rowNumber: z.number(),
      key: z.string(),
      label: z.string(),
      data: z.record(z.unknown()),
      errors: z.array(z.string()).default([]),
      warnings: z.array(z.string()).default([])
    })
  )
});

async function resolveCompanyId(user: { companyId: string | null; role: string }) {
  if (user.companyId) return user.companyId;
  if (user.role !== "SUPER_ADMIN") return null;
  try {
    const company = await prisma.company.findFirst({ where: { status: "ACTIVE" }, orderBy: { createdAt: "asc" }, select: { id: true } });
    return company?.id ?? null;
  } catch {
    return null;
  }
}

function toDate(value: unknown) {
  return typeof value === "string" && value ? new Date(value) : undefined;
}

function clean<T extends Record<string, unknown>>(data: T) {
  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== null && value !== undefined && value !== "")) as T;
}

async function handleExisting(mode: DuplicateMode, existingId?: string | null) {
  if (!existingId) return "create";
  if (mode === "skip") return "skip";
  if (mode === "reject") return "reject";
  return "update";
}

export async function POST(request: NextRequest) {
  const context = await requireApiUser(request, "company.manage");
  if ("status" in context) return context;
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) return apiError("Import invalide", 400, parsed.error.flatten());

  const companyId = await resolveCompanyId(context.user);
  if (!companyId) return apiError("Créez d'abord une entreprise active avant d'importer des données.", 400);

  const invalidRows = parsed.data.rows.filter((row) => row.errors.length);
  if (invalidRows.length) return apiError("Certaines lignes contiennent des erreurs. Corrigez le fichier ou retirez ces lignes avant import.", 400, { invalidRows: invalidRows.map((row) => row.rowNumber) });

  const report =
    parsed.data.type === "agents"
      ? await importAgents(companyId, parsed.data.rows, parsed.data.duplicateMode)
      : parsed.data.type === "clients-sites"
        ? await importClientsSites(companyId, parsed.data.rows, parsed.data.duplicateMode)
        : parsed.data.type === "qcm"
          ? await importQcm(companyId, parsed.data.rows, parsed.data.duplicateMode)
          : await importControlPoints(companyId, parsed.data.rows, parsed.data.duplicateMode);

  return apiOk({ type: parsed.data.type, report });
}

async function importAgents(companyId: string, rows: ParsedImportRow[], duplicateMode: DuplicateMode) {
  const report = baseReport();
  for (const row of rows) {
    const data = row.data as any;
    const existing = await prisma.agent.findFirst({
      where: {
        companyId,
        active: true,
        OR: [{ email: data.email || "__none__" }, { matricule: data.matricule || "__none__" }]
      },
      select: { id: true }
    });
    const action = await handleExisting(duplicateMode, existing?.id);
    if (action === "skip") {
      report.skipped++;
      continue;
    }
    if (action === "reject") {
      report.rejected++;
      report.errors.push(`Ligne ${row.rowNumber}: agent déjà existant`);
      continue;
    }
    const payload = clean({
      companyId,
      matricule: data.matricule,
      civility: data.civility,
      firstName: data.firstName,
      lastName: data.lastName,
      birthDate: toDate(data.birthDate),
      birthPlace: data.birthPlace,
      email: data.email,
      phone: data.phone,
      professionalCardNumber: data.professionalCardNumber,
      professionalCardExpiresAt: toDate(data.professionalCardExpiresAt),
      sstExpiresAt: toDate(data.sstExpiresAt),
      ssiapExpiresAt: toDate(data.ssiapExpiresAt),
      diplomas: data.diplomas ?? [],
      eligibleJobTitles: data.eligibleJobTitles ?? [],
      contractType: data.contractType,
      hiredAt: toDate(data.hiredAt),
      notes: data.notes
    });
    if (action === "update" && existing) {
      await prisma.agent.update({ where: { id: existing.id }, data: payload });
      report.updated++;
    } else {
      await prisma.agent.create({ data: payload as any });
      report.created++;
    }
  }
  return report;
}

async function importClientsSites(companyId: string, rows: ParsedImportRow[], duplicateMode: DuplicateMode) {
  const report = baseReport();
  for (const row of rows) {
    const data = row.data as any;
    const clientData = data.client;
    const siteData = data.site;
    const existingClient = await prisma.client.findFirst({ where: { companyId, reference: clientData.reference, active: true }, select: { id: true } });
    const clientAction = await handleExisting(duplicateMode, existingClient?.id);
    if (clientAction === "reject") {
      report.rejected++;
      report.errors.push(`Ligne ${row.rowNumber}: client déjà existant`);
      continue;
    }
    let clientId = existingClient?.id;
    if (clientAction === "update" && existingClient) {
      await prisma.client.update({ where: { id: existingClient.id }, data: clean(clientData) });
      report.updated++;
    } else if (!existingClient) {
      const client = await prisma.client.create({ data: { ...clean(clientData), companyId } });
      clientId = client.id;
      report.created++;
    } else {
      report.skipped++;
    }
    if (!siteData || !clientId) continue;
    const existingSite = await prisma.site.findFirst({ where: { companyId, reference: siteData.reference, active: true }, select: { id: true } });
    const siteAction = await handleExisting(duplicateMode, existingSite?.id);
    if (siteAction === "reject") {
      report.rejected++;
      report.errors.push(`Ligne ${row.rowNumber}: site déjà existant`);
      continue;
    }
    const sitePayload = clean({
      companyId,
      clientId,
      name: siteData.name,
      reference: siteData.reference,
      address: siteData.address,
      latitude: siteData.latitude,
      longitude: siteData.longitude,
      riskLevel: siteData.riskLevel
    });
    if (siteAction === "update" && existingSite) {
      await prisma.site.update({ where: { id: existingSite.id }, data: sitePayload });
      report.updated++;
    } else if (!existingSite) {
      await prisma.site.create({ data: sitePayload as any });
      report.created++;
    } else {
      report.skipped++;
    }
  }
  return report;
}

async function importQcm(companyId: string, rows: ParsedImportRow[], duplicateMode: DuplicateMode) {
  const report = baseReport();
  const grouped = new Map<string, ParsedImportRow[]>();
  for (const row of rows) {
    const data = row.data as any;
    const key = `${data.bankTitle}||${data.question}`;
    grouped.set(key, [...(grouped.get(key) ?? []), row]);
  }
  for (const questionRows of grouped.values()) {
    const first = questionRows[0].data as any;
    let bank = await prisma.qcmBank.findFirst({ where: { companyId, title: first.bankTitle, active: true } });
    if (!bank) {
      bank = await prisma.qcmBank.create({
        data: {
          companyId,
          title: first.bankTitle,
          type: first.bankType,
          qualification: first.qualification,
          coefficient: first.bankType === "ENTREPRISE" ? 1 : first.bankType === "METIER" ? 2 : 3
        }
      });
      report.created++;
    }
    const existingQuestion = await prisma.qcmQuestion.findFirst({ where: { companyId, bankId: bank.id, label: first.question, active: true }, select: { id: true } });
    const action = await handleExisting(duplicateMode, existingQuestion?.id);
    if (action === "skip") {
      report.skipped++;
      continue;
    }
    if (action === "reject") {
      report.rejected++;
      report.errors.push(`Question déjà existante: ${first.question}`);
      continue;
    }
    const choices = questionRows.map((row) => row.data as any).map((data) => ({ label: data.answer, isCorrect: Boolean(data.correct) }));
    if (choices.length < 2) {
      report.rejected++;
      report.errors.push(`Question ${first.question}: au moins deux réponses sont requises`);
      continue;
    }
    if (action === "update" && existingQuestion) {
      await prisma.qcmChoice.deleteMany({ where: { questionId: existingQuestion.id } });
      await prisma.qcmQuestion.update({
        where: { id: existingQuestion.id },
        data: {
          type: first.questionType,
          explanation: first.explanation,
          difficulty: first.difficulty,
          active: Boolean(first.active),
          choices: { create: choices }
        }
      });
      report.updated++;
    } else {
      await prisma.qcmQuestion.create({
        data: {
          companyId,
          bankId: bank.id,
          label: first.question,
          type: first.questionType,
          category: bank.type,
          qualification: bank.qualification,
          clientId: bank.clientId,
          siteId: bank.siteId,
          explanation: first.explanation,
          difficulty: first.difficulty,
          active: Boolean(first.active),
          choices: { create: choices }
        }
      });
      report.created++;
    }
  }
  return report;
}

async function importControlPoints(companyId: string, rows: ParsedImportRow[], duplicateMode: DuplicateMode) {
  const report = baseReport();
  for (const row of rows) {
    const data = row.data as any;
    let template = await prisma.controlTemplate.findFirst({ where: { companyId, title: data.templateTitle, active: true, archivedAt: null } });
    if (!template) {
      template = await prisma.controlTemplate.create({ data: { companyId, title: data.templateTitle, description: "Modele importe depuis Excel" } });
      report.created++;
    }
    let criterion = await prisma.controlCriterion.findFirst({ where: { companyId, templateId: template.id, label: data.criterionLabel, active: true, archivedAt: null } });
    if (!criterion) {
      criterion = await prisma.controlCriterion.create({
        data: {
          companyId,
          templateId: template.id,
          label: data.criterionLabel,
          coefficient: data.criterionCoefficient,
          sortOrder: await prisma.controlCriterion.count({ where: { templateId: template.id } })
        }
      });
      report.created++;
    }
    let point = await prisma.controlPoint.findFirst({ where: { companyId, criterionId: criterion.id, label: data.pointLabel, active: true, archivedAt: null } });
    if (!point) {
      point = await prisma.controlPoint.create({
        data: {
          companyId,
          criterionId: criterion.id,
          label: data.pointLabel,
          coefficient: data.pointCoefficient,
          defaultSeverity: data.severity,
          blocking: data.blocking,
          defaultCorrectiveAction: data.correctiveAction,
          defaultCorrectionDelayHours: data.correctionDelayHours,
          photoRequirement: data.photoRequirement,
          fileRequirement: data.fileRequirement,
          voiceRequirement: data.voiceRequirement,
          visibleInAgentReport: data.visibleInAgentReport,
          visibleInDirectionReport: data.visibleInDirectionReport,
          visibleInClientReport: data.visibleInClientReport,
          sortOrder: await prisma.controlPoint.count({ where: { criterionId: criterion.id } })
        }
      });
      report.created++;
    }
    const existing = await prisma.controlPointResponseOption.findFirst({
      where: { companyId, pointId: point.id, label: data.responseLabel, status: data.responseStatus, active: true, archivedAt: null },
      select: { id: true }
    });
    const action = await handleExisting(duplicateMode, existing?.id);
    if (action === "skip") {
      report.skipped++;
      continue;
    }
    if (action === "reject") {
      report.rejected++;
      report.errors.push(`Ligne ${row.rowNumber}: réponse déjà existante`);
      continue;
    }
    const payload = {
      companyId,
      pointId: point.id,
      status: data.responseStatus,
      label: data.responseLabel,
      impactLevel: data.impactLevel,
      severity: data.severity,
      score: Math.round(Number(data.score ?? 100)),
      affectsScore: true,
      affectsCompliance: data.responseStatus !== "SANS_OBJET",
      correctiveAction: data.correctiveAction,
      correctionDelayHours: data.correctionDelayHours,
      blocking: data.blocking,
      notificationRequired: data.blocking || data.severity === "CRITIQUE",
      visibleInAgentReport: data.visibleInAgentReport,
      visibleInDirectionReport: data.visibleInDirectionReport,
      visibleInClientReport: data.visibleInClientReport,
      sortOrder: await prisma.controlPointResponseOption.count({ where: { pointId: point.id } })
    };
    if (action === "update" && existing) {
      await prisma.controlPointResponseOption.update({ where: { id: existing.id }, data: payload });
      report.updated++;
    } else {
      await prisma.controlPointResponseOption.create({ data: payload });
      report.created++;
    }
  }
  return report;
}

function baseReport() {
  return { created: 0, updated: 0, skipped: 0, rejected: 0, errors: [] as string[] };
}
