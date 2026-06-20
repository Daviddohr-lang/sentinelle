import { hash } from "bcryptjs";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiOk } from "@/lib/api";
import { secureCookieOptions, sessionCookieName, signSession } from "@/lib/auth";
import { hashInvitationToken } from "@/lib/invitations";
import { prisma } from "@/lib/prisma";

const acceptSchema = z.object({
  password: z.string().min(12),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional()
});

async function loadPendingInvitation(token: string) {
  const tokenHash = hashInvitationToken(token);
  const invitation = await prisma.userInvitation.findUnique({
    where: { tokenHash },
    include: {
      company: { select: { id: true, name: true } },
      createdUser: true
    }
  });

  if (!invitation) return { error: apiError("Invitation introuvable", 404) };

  if (invitation.status !== "PENDING") {
    return { error: apiError("Cette invitation n'est plus active", invitation.status === "ACCEPTED" ? 409 : 410) };
  }

  if (invitation.expiresAt < new Date()) {
    await prisma.userInvitation.update({ where: { id: invitation.id }, data: { status: "EXPIRED" } });
    return { error: apiError("Cette invitation a expiré", 410) };
  }

  return { invitation };
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const loaded = await loadPendingInvitation(token);
  if (loaded.error) return loaded.error;

  const invitation = loaded.invitation;
  return apiOk({
    invitation: {
      email: invitation.email,
      firstName: invitation.firstName,
      lastName: invitation.lastName,
      role: invitation.role,
      companyName: invitation.company?.name ?? "Plateforme SENTINELLE",
      expiresAt: invitation.expiresAt
    }
  });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const parsed = acceptSchema.safeParse(await request.json());
  if (!parsed.success) return apiError("Activation invalide", 400, parsed.error.flatten());

  const loaded = await loadPendingInvitation(token);
  if (loaded.error) return loaded.error;
  const invitation = loaded.invitation;

  const passwordHash = await hash(parsed.data.password, 12);
  const firstName = parsed.data.firstName?.trim() || invitation.firstName;
  const lastName = parsed.data.lastName?.trim() || invitation.lastName;

  const user = invitation.createdUser
    ? await prisma.user.update({
        where: { id: invitation.createdUser.id },
        data: {
          companyId: invitation.companyId,
          email: invitation.email,
          firstName,
          lastName,
          phone: parsed.data.phone?.trim() || invitation.createdUser.phone,
          role: invitation.role,
          status: "ACTIVE",
          passwordHash,
          emailVerifiedAt: new Date(),
          archivedAt: null
        }
      })
    : await prisma.user.create({
        data: {
          companyId: invitation.companyId,
          email: invitation.email,
          firstName,
          lastName,
          phone: parsed.data.phone?.trim() || undefined,
          role: invitation.role,
          status: "ACTIVE",
          passwordHash,
          emailVerifiedAt: new Date()
        }
      });

  await prisma.userInvitation.update({
    where: { id: invitation.id },
    data: {
      status: "ACCEPTED",
      acceptedAt: new Date(),
      createdUserId: user.id,
      lastEmailError: null
    }
  });

  if (user.role === "AGENT" && user.companyId) {
    const agent = await prisma.agent.findFirst({
      where: { companyId: user.companyId, email: user.email, OR: [{ userId: null }, { userId: user.id }] },
      select: { id: true }
    });
    if (agent) {
      await prisma.agent.update({ where: { id: agent.id }, data: { userId: user.id } });
    }
  }

  await prisma.auditLog.create({
    data: {
      companyId: user.companyId,
      actorId: user.id,
      action: "VALIDATE",
      entity: "UserInvitation",
      entityId: invitation.id,
      after: { email: user.email, role: user.role }
    }
  });

  const tokenSession = await signSession({
    id: user.id,
    companyId: user.companyId,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role
  });
  const response = NextResponse.json({ user });
  response.cookies.set(sessionCookieName, tokenSession, secureCookieOptions());
  return response;
}
