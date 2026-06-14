/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiOk, requireApiUser, scopedCompanyWhere } from "@/lib/api";
import {
  archiveLocalQcmBank,
  archiveLocalQcmQuestion,
  authorizeLocalQcmResume,
  completeLocalQcmSession,
  createLocalQcmBank,
  createLocalQcmQuestion,
  generateLocalQcmSessions,
  interruptLocalQcmSession,
  listLocalQcmData,
  LocalStoreError,
  startLocalQcmSession,
  submitLocalQcmAnswer,
  updateLocalQcmBank,
  updateLocalQcmQuestion,
  withDatabaseFallback
} from "@/lib/local-store";
import { prisma } from "@/lib/prisma";

const bankSchema = z.object({
  companyId: z.string().optional().nullable(),
  type: z.enum(["ENTREPRISE", "METIER", "CLIENT_SITE"]),
  title: z.string().min(3),
  description: z.string().optional().nullable(),
  qualification: z.string().optional().nullable(),
  clientId: z.string().optional().nullable(),
  siteId: z.string().optional().nullable(),
  questionCountPerSession: z.number().int().min(1).max(30).default(10),
  timePerQuestionSeconds: z.number().int().min(15).max(300).default(60),
  passingScore: z.number().int().min(0).max(100).default(80),
  coefficient: z.number().int().min(1).max(3).optional(),
  guidanceTitle: z.string().optional().nullable(),
  guidanceBody: z.string().optional().nullable()
});

const choiceSchema = z.object({
  label: z.string().min(1),
  isCorrect: z.boolean()
});

const questionSchema = z.object({
  bankId: z.string(),
  label: z.string().min(3),
  type: z.enum(["CHOIX_UNIQUE", "CHOIX_MULTIPLE"]).default("CHOIX_UNIQUE"),
  choices: z.array(choiceSchema).min(2),
  explanation: z.string().optional().nullable(),
  difficulty: z.enum(["FACILE", "MOYEN", "DIFFICILE"]).optional().nullable(),
  active: z.boolean().default(true)
});

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create-bank"), bank: bankSchema }),
  z.object({ action: z.literal("update-bank"), id: z.string(), bank: bankSchema.partial() }),
  z.object({ action: z.literal("archive-bank"), id: z.string() }),
  z.object({ action: z.literal("create-question"), question: questionSchema }),
  z.object({ action: z.literal("update-question"), id: z.string(), question: questionSchema.partial() }),
  z.object({ action: z.literal("archive-question"), id: z.string() }),
  z.object({
    action: z.literal("generate-sessions"),
    agentId: z.string(),
    controlId: z.string().optional().nullable(),
    clientId: z.string().optional().nullable(),
    siteId: z.string().optional().nullable(),
    qualification: z.string().optional().nullable(),
    categories: z.array(z.enum(["ENTREPRISE", "METIER", "CLIENT_SITE"])).min(1).max(3),
    launchTiming: z.enum(["PENDANT_CONTROLE", "FIN_CONTROLE", "APRES_CONTROLE"]).default("PENDANT_CONTROLE"),
    delayHours: z.number().int().min(0).max(2160).optional().nullable()
  }),
  z.object({ action: z.literal("start-session"), sessionId: z.string() }),
  z.object({
    action: z.literal("submit-answer"),
    sessionId: z.string(),
    questionId: z.string(),
    selectedChoiceIds: z.array(z.string()).default([]),
    timeSpentSeconds: z.number().int().min(0).max(3600).optional().nullable(),
    timedOut: z.boolean().default(false)
  }),
  z.object({ action: z.literal("complete-session"), sessionId: z.string() }),
  z.object({ action: z.literal("interrupt-session"), sessionId: z.string(), cause: z.string().default("Interruption déclarée") }),
  z.object({ action: z.literal("authorize-resume"), sessionId: z.string() })
]);

function localError(error: unknown) {
  if (error instanceof LocalStoreError) return apiError(error.message, error.status);
  throw error;
}

function requireGeneratedQcmClient() {
  const db = prisma as unknown as {
    qcmBank?: unknown;
    qcmQuestion?: unknown;
    qcmSession?: unknown;
  };
  if (!db.qcmBank || !db.qcmQuestion || !db.qcmSession) {
    throw new Error("Prisma Client could not locate generated QCM bank models");
  }
  return prisma as any;
}

function mapDbSession(session: any) {
  return {
    ...session,
    selectedQuestionIds: session.questionIds ?? [],
    bankTitle: session.bank?.title,
    bankType: session.bank?.type,
    coefficient: session.bank?.coefficient,
    passingScore: session.bank?.passingScore,
    timePerQuestionSeconds: session.bank?.timePerQuestionSeconds,
    guidanceTitle: session.bank?.guidanceTitle,
    guidanceBody: session.bank?.guidanceBody,
    agentName: session.agent ? `${session.agent.firstName} ${session.agent.lastName}` : null,
    answers: session.answers ?? [],
    interruptions: session.interruptions ?? []
  };
}

function normalizeComparable(value?: string | null) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

function shuffleIds<T extends { id: string }>(items: T[], take: number) {
  return [...items]
    .sort(() => Math.random() - 0.5)
    .slice(0, take)
    .map((item) => item.id);
}

function isDbAnswerCorrect(question: any, selectedChoiceIds: string[], timedOut: boolean) {
  if (timedOut) return false;
  const expected = question.choices.filter((choice: any) => choice.isCorrect).map((choice: any) => choice.id).sort();
  const selected = [...selectedChoiceIds].sort();
  return expected.length === selected.length && expected.every((choiceId: string, index: number) => choiceId === selected[index]);
}

export async function GET(request: NextRequest) {
  const context = await requireApiUser(request, "qcm.read");
  if ("status" in context) return context;

  return withDatabaseFallback(
    async () => {
      const db = requireGeneratedQcmClient();
      const scope = scopedCompanyWhere(context.user);
      const [banks, questions, sessions, agents, clients, sites, controls, settings] = await Promise.all([
        db.qcmBank.findMany({
          where: scope,
          include: { client: true, site: true, questions: { where: { archivedAt: null } }, sessions: true },
          orderBy: { updatedAt: "desc" }
        }),
        db.qcmQuestion.findMany({ where: { ...scope, archivedAt: null }, include: { choices: true }, orderBy: { sortOrder: "asc" } }),
        db.qcmSession.findMany({
          where: scope,
          take: 100,
          include: { bank: true, agent: true, answers: true, interruptions: true, control: { include: { client: true, site: true } } },
          orderBy: { createdAt: "desc" }
        }),
        db.agent.findMany({ where: { ...scope, active: true }, orderBy: { lastName: "asc" } }),
        db.client.findMany({ where: { ...scope, active: true }, orderBy: { name: "asc" } }),
        db.site.findMany({ where: { ...scope, active: true }, orderBy: { name: "asc" } }),
        db.control.findMany({ where: scope, take: 50, include: { agent: true, client: true, site: true }, orderBy: { startedAt: "desc" } }),
        db.qcmSetting.findMany({ where: scope })
      ]);
      const completed = sessions.filter((session: any) => session.status === "TERMINE" && typeof session.score === "number");
      return apiOk({
        source: "database",
        banks: banks.map((bank: any) => ({
          ...bank,
          questionsCount: bank.questions?.length ?? 0,
          activeQuestionsCount: bank.questions?.filter((question: any) => question.active).length ?? 0,
          successRate: null
        })),
        questions:
          context.user.role === "AGENT"
            ? questions.map((question: any) => ({
                ...question,
                explanation: null,
                choices: question.choices.map((choice: any) => ({ ...choice, isCorrect: false }))
              }))
            : questions,
        sessions: sessions.map(mapDbSession),
        agents,
        clients,
        sites,
        controls,
        settings,
        stats: {
          bankCount: banks.length,
          questionCount: questions.length,
          activeSessions: sessions.filter((session: any) => ["ENVOYE", "EN_COURS", "INTERROMPU"].includes(session.status)).length,
          completedSessions: completed.length,
          averageScore: completed.length ? Math.round(completed.reduce((sum: number, session: any) => sum + session.score, 0) / completed.length) : 0,
          interrupted: sessions.filter((session: any) => session.status === "INTERROMPU").length
        }
      });
    },
    async () => apiOk({ source: "local", ...(await listLocalQcmData(context.user)) }),
    "GET /api/qcms"
  );
}

export async function POST(request: NextRequest) {
  const context = await requireApiUser(request, "qcm.read");
  if ("status" in context) return context;
  const parsed = actionSchema.safeParse(await request.json());
  if (!parsed.success) return apiError("Action QCM invalide", 400, parsed.error.flatten());
  const writeActions = ["create-bank", "update-bank", "archive-bank", "create-question", "update-question", "archive-question", "generate-sessions", "authorize-resume"];
  if (writeActions.includes(parsed.data.action) && !["SUPER_ADMIN", "COMPANY_ADMIN", "QUALITY_CONTROLLER"].includes(context.user.role)) {
    return apiError("Permission insuffisante", 403);
  }

  return withDatabaseFallback(
    async () => {
      const db = requireGeneratedQcmClient();
      if (parsed.data.action === "create-bank") {
        const companyId = context.user.companyId ?? parsed.data.bank.companyId;
        if (!companyId) return apiError("Entreprise requise", 400);
        const bank = await db.qcmBank.create({ data: { ...parsed.data.bank, companyId, coefficient: parsed.data.bank.coefficient ?? (parsed.data.bank.type === "ENTREPRISE" ? 1 : parsed.data.bank.type === "METIER" ? 2 : 3) } });
        return apiOk({ bank }, { status: 201 });
      }
      if (parsed.data.action === "update-bank") {
        const bank = await db.qcmBank.update({ where: { id: parsed.data.id }, data: parsed.data.bank });
        return apiOk({ bank });
      }
      if (parsed.data.action === "archive-bank") {
        const bank = await db.qcmBank.update({ where: { id: parsed.data.id }, data: { active: false, archivedAt: new Date() } });
        return apiOk({ bank });
      }
      if (parsed.data.action === "create-question") {
        const bank = await db.qcmBank.findFirst({ where: { id: parsed.data.question.bankId, ...scopedCompanyWhere(context.user) } });
        if (!bank) return apiError("Banque QCM introuvable", 404);
        const question = await db.qcmQuestion.create({
          data: {
            companyId: bank.companyId,
            bankId: bank.id,
            label: parsed.data.question.label,
            type: parsed.data.question.type,
            category: bank.type,
            qualification: bank.qualification,
            clientId: bank.clientId,
            siteId: bank.siteId,
            explanation: parsed.data.question.explanation,
            difficulty: parsed.data.question.difficulty,
            active: parsed.data.question.active,
            choices: { create: parsed.data.question.choices }
          },
          include: { choices: true }
        });
        return apiOk({ question }, { status: 201 });
      }
      if (parsed.data.action === "update-question") {
        const { choices, ...questionData } = parsed.data.question as any;
        const question = await db.qcmQuestion.update({ where: { id: parsed.data.id }, data: questionData, include: { choices: true } });
        return apiOk({ question, choicesIgnored: choices?.length ?? 0 });
      }
      if (parsed.data.action === "archive-question") {
        const question = await db.qcmQuestion.update({ where: { id: parsed.data.id }, data: { active: false, archivedAt: new Date() } });
        return apiOk({ question });
      }
      if (parsed.data.action === "generate-sessions") {
        const agent = await db.agent.findFirst({ where: { id: parsed.data.agentId, ...scopedCompanyWhere(context.user), active: true } });
        if (!agent) return apiError("Agent introuvable", 404);
        const control = parsed.data.controlId
          ? await db.control.findFirst({ where: { id: parsed.data.controlId, ...scopedCompanyWhere(context.user) }, include: { client: true, site: true } })
          : null;
        const assignment = await db.assignment.findFirst({ where: { agentId: agent.id, status: "ACTIVE" }, orderBy: { startsAt: "desc" } });
        const clientId = parsed.data.clientId ?? control?.clientId ?? assignment?.clientId ?? null;
        const siteId = parsed.data.siteId ?? control?.siteId ?? assignment?.siteId ?? null;
        const qualification = parsed.data.qualification ?? assignment?.jobTitle ?? agent.eligibleJobTitles?.[0] ?? "APS";
        const availableAt = new Date();
        if (parsed.data.launchTiming === "APRES_CONTROLE" && parsed.data.delayHours) availableAt.setHours(availableAt.getHours() + parsed.data.delayHours);

        const sessions = [];
        for (const category of parsed.data.categories) {
          const banks = await db.qcmBank.findMany({
            where: { companyId: agent.companyId, type: category, active: true, archivedAt: null },
            include: { questions: { where: { active: true, archivedAt: null }, include: { choices: true } } }
          });
          const bank =
            category === "ENTREPRISE"
              ? banks[0]
              : category === "METIER"
                ? banks.find((item: any) => normalizeComparable(item.qualification) === normalizeComparable(qualification)) ?? banks[0]
                : banks.find((item: any) => item.siteId && item.siteId === siteId) ?? banks.find((item: any) => item.clientId && item.clientId === clientId) ?? banks[0];
          if (!bank) return apiError(`Aucune banque active pour la categorie ${category}`, 404);
          if (bank.questions.length < 30) return apiError(`La banque "${bank.title}" doit contenir au moins 30 questions actives avant generation`, 400);
          if (bank.questions.length < bank.questionCountPerSession) return apiError(`La banque "${bank.title}" ne contient pas assez de questions actives`, 400);
          const session = await db.qcmSession.create({
            data: {
              companyId: agent.companyId,
              bankId: bank.id,
              controlId: parsed.data.controlId ?? undefined,
              agentId: agent.id,
              clientId,
              siteId,
              qualification,
              launchTiming: parsed.data.launchTiming,
              availableAt,
              status: "ENVOYE",
              questionIds: shuffleIds(bank.questions, bank.questionCountPerSession),
              sentById: context.user.id
            },
            include: { bank: true, agent: true, answers: true, interruptions: true }
          });
          sessions.push(mapDbSession(session));
        }
        return apiOk({ sessions }, { status: 201 });
      }
      if (parsed.data.action === "start-session") {
        const session = await db.qcmSession.findFirst({ where: { id: parsed.data.sessionId, ...scopedCompanyWhere(context.user) } });
        if (!session) return apiError("Session QCM introuvable", 404);
        if (session.status === "INTERROMPU" && !session.resumeAllowed) return apiError("Reprise non autorisee", 403);
        const updated = await db.qcmSession.update({
          where: { id: session.id },
          data: {
            status: "EN_COURS",
            startedAt: session.startedAt ?? new Date(),
            interruptedAt: null,
            interruptionReason: null,
            resumeAllowed: false,
            resumeCount: session.status === "INTERROMPU" ? session.resumeCount + 1 : session.resumeCount
          },
          include: { bank: true, agent: true, answers: true, interruptions: true }
        });
        if (session.status === "INTERROMPU") {
          const interruption = await db.qcmInterruption.findFirst({ where: { sessionId: session.id, resumedAt: null }, orderBy: { interruptedAt: "desc" } });
          if (interruption) await db.qcmInterruption.update({ where: { id: interruption.id }, data: { resumedAt: new Date() } });
        }
        return apiOk({ session: mapDbSession(updated) });
      }
      if (parsed.data.action === "submit-answer") {
        const session = await db.qcmSession.findFirst({ where: { id: parsed.data.sessionId, ...scopedCompanyWhere(context.user) }, include: { bank: true } });
        if (!session) return apiError("Session QCM introuvable", 404);
        if (session.status !== "EN_COURS") return apiError("La session QCM n'est pas en cours", 400);
        const question = await db.qcmQuestion.findFirst({ where: { id: parsed.data.questionId, bankId: session.bankId }, include: { choices: true } });
        if (!question || !session.questionIds.includes(question.id)) return apiError("Question QCM introuvable", 404);
        const timeSpentSeconds = Math.max(0, Math.round(parsed.data.timeSpentSeconds ?? 0));
        const timedOut = Boolean(parsed.data.timedOut || timeSpentSeconds > session.bank.timePerQuestionSeconds);
        const selectedChoiceIds = timedOut ? [] : parsed.data.selectedChoiceIds;
        const isCorrect = isDbAnswerCorrect(question, selectedChoiceIds, timedOut);
        const answer = await db.qcmAnswer.upsert({
          where: { sessionId_questionId: { sessionId: session.id, questionId: question.id } },
          update: { selectedChoiceIds, isCorrect, timedOut, timeSpentSeconds, pointsAwarded: isCorrect ? question.points : 0 },
          create: { sessionId: session.id, questionId: question.id, selectedChoiceIds, isCorrect, timedOut, timeSpentSeconds, pointsAwarded: isCorrect ? question.points : 0 }
        });
        const questionPosition = session.questionIds.indexOf(question.id);
        const updated = await db.qcmSession.update({
          where: { id: session.id },
          data: { currentQuestionIndex: Math.min(session.questionIds.length, Math.max(session.currentQuestionIndex, questionPosition + 1)) },
          include: { bank: true, agent: true, answers: true, interruptions: true }
        });
        return apiOk({ session: mapDbSession(updated), answer });
      }
      if (parsed.data.action === "complete-session") {
        const session = await db.qcmSession.findFirst({ where: { id: parsed.data.sessionId, ...scopedCompanyWhere(context.user) }, include: { bank: true, answers: true, interruptions: true } });
        if (!session) return apiError("Session QCM introuvable", 404);
        const selectedQuestions = await db.qcmQuestion.findMany({ where: { id: { in: session.questionIds } }, include: { choices: true } });
        const answerByQuestion = new Map<string, any>(session.answers.map((answer: any) => [answer.questionId, answer]));
        const correctAnswers = selectedQuestions.filter((question: any) => answerByQuestion.get(question.id)?.isCorrect).length;
        const timedOutQuestions = selectedQuestions.filter((question: any) => answerByQuestion.get(question.id)?.timedOut || !answerByQuestion.has(question.id)).length;
        const score = selectedQuestions.length ? Math.round((correctAnswers / selectedQuestions.length) * 100) : 0;
        const passed = score >= session.bank.passingScore;
        const updated = await db.qcmSession.update({
          where: { id: session.id },
          data: { status: "TERMINE", score, passed, weightedScore: score * session.bank.coefficient, currentQuestionIndex: selectedQuestions.length, completedAt: new Date() },
          include: { bank: true, agent: true, answers: true, interruptions: true }
        });
        await db.qcmResult.upsert({
          where: { sessionId: session.id },
          update: { score, passed, weightedScore: score * session.bank.coefficient, correctAnswers, totalQuestions: selectedQuestions.length, timedOutQuestions, interruptionCount: session.interruptions.length },
          create: { sessionId: session.id, companyId: session.companyId, score, passed, weightedScore: score * session.bank.coefficient, correctAnswers, totalQuestions: selectedQuestions.length, timedOutQuestions, interruptionCount: session.interruptions.length }
        });
        return apiOk({ session: mapDbSession(updated) });
      }
      if (parsed.data.action === "interrupt-session") {
        const session = await db.qcmSession.findFirst({ where: { id: parsed.data.sessionId, ...scopedCompanyWhere(context.user) } });
        if (!session) return apiError("Session QCM introuvable", 404);
        await db.qcmInterruption.create({ data: { sessionId: session.id, cause: parsed.data.cause } });
        const updated = await db.qcmSession.update({
          where: { id: session.id },
          data: { status: "INTERROMPU", interruptedAt: new Date(), interruptionReason: parsed.data.cause, resumeAllowed: false },
          include: { bank: true, agent: true, answers: true, interruptions: true }
        });
        return apiOk({ session: mapDbSession(updated) });
      }
      if (parsed.data.action === "authorize-resume") {
        const session = await db.qcmSession.findFirst({ where: { id: parsed.data.sessionId, ...scopedCompanyWhere(context.user) } });
        if (!session) return apiError("Session QCM introuvable", 404);
        const interruption = await db.qcmInterruption.findFirst({ where: { sessionId: session.id, authorizedById: null }, orderBy: { interruptedAt: "desc" } });
        if (interruption) await db.qcmInterruption.update({ where: { id: interruption.id }, data: { authorizedById: context.user.id } });
        const updated = await db.qcmSession.update({
          where: { id: session.id },
          data: { resumeAllowed: true },
          include: { bank: true, agent: true, answers: true, interruptions: true }
        });
        return apiOk({ session: mapDbSession(updated) });
      }
      return apiError("Action QCM non supportee", 400);
    },
    async () => {
      try {
        if (parsed.data.action === "create-bank") return apiOk({ bank: await createLocalQcmBank(context.user, parsed.data.bank) }, { status: 201 });
        if (parsed.data.action === "update-bank") return apiOk({ bank: await updateLocalQcmBank(context.user, parsed.data.id, parsed.data.bank) });
        if (parsed.data.action === "archive-bank") return apiOk({ bank: await archiveLocalQcmBank(context.user, parsed.data.id) });
        if (parsed.data.action === "create-question") return apiOk({ question: await createLocalQcmQuestion(context.user, parsed.data.question) }, { status: 201 });
        if (parsed.data.action === "update-question") return apiOk({ question: await updateLocalQcmQuestion(context.user, parsed.data.id, parsed.data.question) });
        if (parsed.data.action === "archive-question") return apiOk({ question: await archiveLocalQcmQuestion(context.user, parsed.data.id) });
        if (parsed.data.action === "generate-sessions") return apiOk({ sessions: await generateLocalQcmSessions(context.user, parsed.data) }, { status: 201 });
        if (parsed.data.action === "start-session") return apiOk({ session: await startLocalQcmSession(context.user, parsed.data.sessionId) });
        if (parsed.data.action === "submit-answer") return apiOk(await submitLocalQcmAnswer(context.user, parsed.data));
        if (parsed.data.action === "complete-session") return apiOk({ session: await completeLocalQcmSession(context.user, parsed.data.sessionId) });
        if (parsed.data.action === "interrupt-session") return apiOk({ session: await interruptLocalQcmSession(context.user, parsed.data.sessionId, parsed.data.cause) });
        if (parsed.data.action === "authorize-resume") return apiOk({ session: await authorizeLocalQcmResume(context.user, parsed.data.sessionId) });
      } catch (error) {
        return localError(error);
      }
    },
    "POST /api/qcms"
  );
}

export async function PATCH(request: NextRequest) {
  const context = await requireApiUser(request, "qcm.write");
  if ("status" in context) return context;
  const parsed = bankSchema.partial().extend({ id: z.string() }).safeParse(await request.json());
  if (!parsed.success) return apiError("Banque QCM invalide", 400, parsed.error.flatten());
  try {
    const { id, ...bank } = parsed.data;
    return apiOk({ bank: await updateLocalQcmBank(context.user, id, bank) });
  } catch (error) {
    return localError(error);
  }
}

export async function DELETE(request: NextRequest) {
  const context = await requireApiUser(request, "qcm.write");
  if ("status" in context) return context;
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return apiError("Identifiant requis", 400);
  try {
    return apiOk({ bank: await archiveLocalQcmBank(context.user, id) });
  } catch (error) {
    return localError(error);
  }
}
