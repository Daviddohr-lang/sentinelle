/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiOk, requireApiUser } from "@/lib/api";
import type { SessionUser } from "@/lib/auth";
import { acknowledgeLocalPreventionMessage, LocalStoreError, withDatabaseFallback } from "@/lib/local-store";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  messageId: z.string(),
  answer: z.string().min(1)
});

function normalizeComparable(value?: string | null) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
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

function localError(error: unknown) {
  if (error instanceof LocalStoreError) return apiError(error.message, error.status);
  throw error;
}

export async function POST(request: NextRequest) {
  const context = await requireApiUser(request);
  if ("status" in context) return context;

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return apiError("Validation prévention invalide", 400, parsed.error.flatten());

  return withDatabaseFallback(
    async () => {
      const db = prisma as any;
      const message = await db.preventionMessage.findFirst({
        where: {
          id: parsed.data.messageId,
          AND: [scopedWhere(context.user), activeWhere(new Date())]
        }
      });
      if (!message) return apiError("Message de prévention introuvable", 404);
      const validated = normalizeComparable(parsed.data.answer).includes(normalizeComparable(message.expectedAnswer));
      const acknowledgement = await db.preventionAcknowledgement.create({
        data: {
          messageId: message.id,
          userId: context.user.id,
          companyId: message.companyId ?? context.user.companyId,
          answer: parsed.data.answer,
          validated
        }
      });
      return apiOk({ acknowledgement, validated, expectedAnswer: validated ? undefined : message.expectedAnswer });
    },
    async () => {
      try {
        const result = await acknowledgeLocalPreventionMessage(context.user, parsed.data.messageId, parsed.data.answer);
        return apiOk(result);
      } catch (error) {
        return localError(error);
      }
    },
    "POST /api/prevention-messages/acknowledge"
  );
}
