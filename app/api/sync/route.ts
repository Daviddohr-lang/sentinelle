import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiOk, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";

const syncSchema = z.object({
  deviceId: z.string().min(3),
  events: z.array(
    z.object({
      entity: z.string(),
      entityId: z.string().optional(),
      operation: z.enum(["create", "update", "delete", "archive"]),
      payload: z.record(z.unknown())
    })
  )
});

export async function POST(request: NextRequest) {
  const context = await requireApiUser(request);
  if ("status" in context) return context;

  const parsed = syncSchema.safeParse(await request.json());
  if (!parsed.success) return apiError("Lot de synchronisation invalide", 400, parsed.error.flatten());
  if (!context.user.companyId && context.user.role !== "SUPER_ADMIN") return apiError("Entreprise introuvable", 400);

  try {
    const companyId = context.user.companyId ?? String(parsed.data.events[0]?.payload.companyId ?? "");
    const events = await prisma.syncEvent.createMany({
      data: parsed.data.events.map((event) => ({
        companyId,
        userId: context.user.id,
        deviceId: parsed.data.deviceId,
        entity: event.entity,
        entityId: event.entityId,
        operation: event.operation,
        payload: event.payload,
        status: "PENDING"
      }))
    });
    return apiOk({ accepted: events.count, status: "PENDING" }, { status: 202 });
  } catch {
    return apiOk({ accepted: parsed.data.events.length, status: "LOCAL_DEMO", message: "Evenements conserves cote client en mode demo." }, { status: 202 });
  }
}
