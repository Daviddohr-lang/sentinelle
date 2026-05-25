import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiOk, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  id: z.string(),
  read: z.boolean().optional(),
  acknowledged: z.boolean().optional()
});

export async function GET(request: NextRequest) {
  const context = await requireApiUser(request);
  if ("status" in context) return context;
  const notifications = await prisma.notification.findMany({
    where: {
      OR: [{ userId: context.user.id }, { targetRole: context.user.role }],
      ...(context.user.role === "SUPER_ADMIN" ? {} : { companyId: context.user.companyId })
    },
    orderBy: { createdAt: "desc" },
    take: 50
  });
  return apiOk({ notifications });
}

export async function PATCH(request: NextRequest) {
  const context = await requireApiUser(request);
  if ("status" in context) return context;
  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) return apiError("Notification invalide", 400, parsed.error.flatten());
  const current = await prisma.notification.findFirst({
    where: {
      id: parsed.data.id,
      OR: [{ userId: context.user.id }, { targetRole: context.user.role }],
      ...(context.user.role === "SUPER_ADMIN" ? {} : { companyId: context.user.companyId })
    }
  });
  if (!current) return apiError("Notification introuvable", 404);
  const notification = await prisma.notification.update({
    where: { id: parsed.data.id },
    data: {
      readAt: parsed.data.read ? new Date() : undefined,
      acknowledgedAt: parsed.data.acknowledged ? new Date() : undefined
    }
  });
  return apiOk({ notification });
}
