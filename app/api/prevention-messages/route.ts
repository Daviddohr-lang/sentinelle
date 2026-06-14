/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiOk, requireApiUser } from "@/lib/api";
import type { SessionUser } from "@/lib/auth";
import {
  createLocalPreventionMessage,
  listLocalPreventionMessages,
  LocalStoreError,
  updateLocalPreventionMessage,
  withDatabaseFallback
} from "@/lib/local-store";
import { prisma } from "@/lib/prisma";

const optionalText = z.string().nullish().transform((value) => value ?? undefined);
const optionalDate = z.string().nullish().transform((value) => value ?? undefined);

const messageSchema = z.object({
  id: z.string().optional(),
  companyId: z.string().optional().nullable(),
  title: z.string().min(3),
  theme: optionalText,
  body: z.string().min(10),
  question: z.string().min(3),
  expectedAnswer: z.string().min(2),
  active: z.boolean().default(true),
  startsAt: optionalDate,
  endsAt: optionalDate
});

function canManagePrevention(user: SessionUser) {
  return user.role === "SUPER_ADMIN" || user.role === "COMPANY_ADMIN" || user.role === "QUALITY_CONTROLLER";
}

function localError(error: unknown) {
  if (error instanceof LocalStoreError) return apiError(error.message, error.status);
  throw error;
}

function scopedWhere(user: SessionUser) {
  if (user.role === "SUPER_ADMIN") return {};
  return { OR: [{ companyId: user.companyId }, { companyId: null }] };
}

function activeWhere(now: Date) {
  return {
    active: true,
    AND: [
      { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
      { OR: [{ endsAt: null }, { endsAt: { gte: now } }] }
    ]
  };
}

function mapDate(value?: string | null) {
  return value ? new Date(value) : null;
}

export async function GET(request: NextRequest) {
  const context = await requireApiUser(request);
  if ("status" in context) return context;
  const activeOnly = request.nextUrl.searchParams.get("activeOnly") === "1";
  const pendingOnly = request.nextUrl.searchParams.get("pending") === "1";

  return withDatabaseFallback(
    async () => {
      const db = prisma as any;
      const now = new Date();
      const messages = await db.preventionMessage.findMany({
        where: {
          AND: [scopedWhere(context.user), activeOnly ? activeWhere(now) : {}]
        },
        include: {
          acknowledgements: {
            where: { userId: context.user.id, validated: true },
            select: { id: true }
          }
        },
        orderBy: [{ active: "desc" }, { createdAt: "desc" }]
      });
      const mapped = messages.map((message: any) => ({
        ...message,
        theme: message.theme ?? "Général",
        acknowledged: Boolean(message.acknowledgements?.length)
      }));
      return apiOk({
        canManage: canManagePrevention(context.user),
        messages: pendingOnly ? mapped.filter((message: any) => !message.acknowledged) : mapped
      });
    },
    async () =>
      apiOk({
        canManage: canManagePrevention(context.user),
        messages: await listLocalPreventionMessages(context.user, { activeOnly, pendingOnly })
      }),
    "GET /api/prevention-messages"
  );
}

export async function POST(request: NextRequest) {
  const context = await requireApiUser(request);
  if ("status" in context) return context;
  if (!canManagePrevention(context.user)) return apiError("Permission insuffisante", 403);

  const parsed = messageSchema.safeParse(await request.json());
  if (!parsed.success) return apiError("Message de prévention invalide", 400, parsed.error.flatten());

  const companyId = context.user.role === "SUPER_ADMIN" ? parsed.data.companyId ?? context.user.companyId ?? null : context.user.companyId;
  if (context.user.role !== "SUPER_ADMIN" && !companyId) return apiError("Entreprise requise", 400);

  return withDatabaseFallback(
    async () => {
      const db = prisma as any;
      const message = await db.preventionMessage.create({
        data: {
          companyId,
          title: parsed.data.title,
          theme: parsed.data.theme ?? "Général",
          body: parsed.data.body,
          question: parsed.data.question,
          expectedAnswer: parsed.data.expectedAnswer.trim().toLowerCase(),
          active: parsed.data.active,
          startsAt: mapDate(parsed.data.startsAt),
          endsAt: mapDate(parsed.data.endsAt)
        }
      });
      return apiOk({ message }, { status: 201 });
    },
    async () => {
      try {
        const message = await createLocalPreventionMessage(context.user, { ...parsed.data, companyId });
        return apiOk({ message }, { status: 201 });
      } catch (error) {
        return localError(error);
      }
    },
    "POST /api/prevention-messages"
  );
}

export async function PATCH(request: NextRequest) {
  const context = await requireApiUser(request);
  if ("status" in context) return context;
  if (!canManagePrevention(context.user)) return apiError("Permission insuffisante", 403);

  const parsed = messageSchema.partial().extend({ id: z.string() }).safeParse(await request.json());
  if (!parsed.success) return apiError("Message de prévention invalide", 400, parsed.error.flatten());
  const { id, ...payload } = parsed.data;

  return withDatabaseFallback(
    async () => {
      const db = prisma as any;
      const current = await db.preventionMessage.findUnique({ where: { id } });
      if (!current) return apiError("Message de prévention introuvable", 404);
      if (context.user.role !== "SUPER_ADMIN" && current.companyId !== context.user.companyId) return apiError("Accès message interdit", 403);
      const data: Record<string, unknown> = {};
      if (payload.companyId !== undefined && context.user.role === "SUPER_ADMIN") data.companyId = payload.companyId;
      if (payload.title !== undefined) data.title = payload.title;
      if (payload.theme !== undefined) data.theme = payload.theme ?? "Général";
      if (payload.body !== undefined) data.body = payload.body;
      if (payload.question !== undefined) data.question = payload.question;
      if (payload.expectedAnswer !== undefined) data.expectedAnswer = payload.expectedAnswer.trim().toLowerCase();
      if (payload.active !== undefined) data.active = payload.active;
      if (payload.startsAt !== undefined) data.startsAt = mapDate(payload.startsAt);
      if (payload.endsAt !== undefined) data.endsAt = mapDate(payload.endsAt);
      const message = await db.preventionMessage.update({ where: { id }, data });
      return apiOk({ message });
    },
    async () => {
      try {
        const message = await updateLocalPreventionMessage(context.user, id, payload);
        return apiOk({ message });
      } catch (error) {
        return localError(error);
      }
    },
    "PATCH /api/prevention-messages"
  );
}
