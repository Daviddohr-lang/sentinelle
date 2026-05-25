import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiOk, requireApiUser, scopedCompanyWhere } from "@/lib/api";
import { prisma } from "@/lib/prisma";

const qcmSchema = z.object({
  title: z.string().min(3),
  type: z.enum(["OPS", "LIGNE_METIER", "CLIENT"]),
  category: z.string().min(2),
  coefficient: z.number().int().min(1).max(3),
  clientId: z.string().optional(),
  siteId: z.string().optional(),
  jobTitle: z.string().optional(),
  minimumScore: z.number().int().min(0).max(100).default(80),
  questions: z
    .array(
      z.object({
        label: z.string().min(3),
        type: z.enum(["CHOIX_UNIQUE", "CHOIX_MULTIPLE"]).default("CHOIX_UNIQUE"),
        choices: z.array(z.object({ label: z.string().min(1), isCorrect: z.boolean() })).min(2)
      })
    )
    .max(10)
    .default([])
});

const sendSchema = z.object({
  action: z.literal("send-session"),
  qcmId: z.string(),
  agentId: z.string(),
  controlId: z.string().optional()
});

export async function GET(request: NextRequest) {
  const context = await requireApiUser(request, "qcm.read");
  if ("status" in context) return context;
  const qcms = await prisma.qcm.findMany({
    where: scopedCompanyWhere(context.user),
    include: { questions: { include: { choices: true } }, sessions: true },
    orderBy: { updatedAt: "desc" }
  });
  return apiOk({ qcms });
}

export async function POST(request: NextRequest) {
  const context = await requireApiUser(request, "qcm.write");
  if ("status" in context) return context;
  if (!context.user.companyId) return apiError("Entreprise requise", 400);
  const body = await request.json();
  const send = sendSchema.safeParse(body);
  if (send.success) {
    const session = await prisma.qcmSession.create({
      data: {
        companyId: context.user.companyId,
        qcmId: send.data.qcmId,
        agentId: send.data.agentId,
        controlId: send.data.controlId,
        sentById: context.user.id
      }
    });
    await prisma.notification.create({
      data: {
        companyId: context.user.companyId,
        type: "QCM_A_REALISER",
        title: "QCM a realiser",
        message: "Un QCM est disponible dans votre espace agent.",
        payload: { sessionId: session.id, qcmId: send.data.qcmId }
      }
    });
    return apiOk({ session }, { status: 201 });
  }

  const parsed = qcmSchema.safeParse(body);
  if (!parsed.success) return apiError("QCM invalide", 400, parsed.error.flatten());
  if (parsed.data.questions.length > 10) return apiError("Maximum 10 questions par item", 400);

  const qcm = await prisma.qcm.create({
    data: {
      companyId: context.user.companyId,
      title: parsed.data.title,
      type: parsed.data.type,
      category: parsed.data.category,
      coefficient: parsed.data.coefficient,
      clientId: parsed.data.clientId,
      siteId: parsed.data.siteId,
      jobTitle: parsed.data.jobTitle,
      minimumScore: parsed.data.minimumScore,
      questions: {
        create: parsed.data.questions.map((question, index) => ({
          label: question.label,
          type: question.type,
          sortOrder: index,
          choices: { create: question.choices }
        }))
      }
    },
    include: { questions: { include: { choices: true } } }
  });
  return apiOk({ qcm }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const context = await requireApiUser(request, "qcm.write");
  if ("status" in context) return context;
  const parsed = qcmSchema.partial().extend({ id: z.string() }).safeParse(await request.json());
  if (!parsed.success) return apiError("QCM invalide", 400, parsed.error.flatten());
  const current = await prisma.qcm.findFirst({ where: { id: parsed.data.id, ...scopedCompanyWhere(context.user) } });
  if (!current) return apiError("QCM introuvable", 404);
  const { id, questions, ...data } = parsed.data;
  const qcm = await prisma.qcm.update({ where: { id }, data });
  return apiOk({ qcm, ignoredNestedQuestions: questions?.length ?? 0 });
}

export async function DELETE(request: NextRequest) {
  const context = await requireApiUser(request, "qcm.write");
  if ("status" in context) return context;
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return apiError("Identifiant requis", 400);
  const current = await prisma.qcm.findFirst({ where: { id, ...scopedCompanyWhere(context.user) } });
  if (!current) return apiError("QCM introuvable", 404);
  const qcm = await prisma.qcm.update({ where: { id }, data: { active: false } });
  return apiOk({ qcm });
}
