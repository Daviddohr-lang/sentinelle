import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiOk, requireApiUser } from "@/lib/api";
import { demoUsers } from "@/lib/demo-data";
import { sendInvitationEmail } from "@/lib/email";
import { buildInvitationUrl, createInvitationToken, createTemporaryPasswordHash, hashInvitationToken, invitationExpiry } from "@/lib/invitations";
import { prisma } from "@/lib/prisma";

const roles = ["SUPER_ADMIN", "COMPANY_ADMIN", "QUALITY_CONTROLLER", "AGENT", "BUSINESS_OWNER", "CLIENT"] as const;

const inviteSchema = z.object({
  invitations: z
    .array(
      z.object({
        email: z.string().email(),
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        role: z.enum(roles),
        companyId: z.string().nullish()
      })
    )
    .min(1)
    .max(100)
});

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function canInviteRole(actorRole: string, invitedRole: string) {
  if (invitedRole === "SUPER_ADMIN") return actorRole === "SUPER_ADMIN";
  return ["SUPER_ADMIN", "COMPANY_ADMIN", "BUSINESS_OWNER"].includes(actorRole);
}

function fallbackUsers() {
  return demoUsers.map((user) => ({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    status: "ACTIVE",
    companyName: user.companyId ?? "Démonstration",
    lastLoginAt: null
  }));
}

export async function GET(request: NextRequest) {
  const context = await requireApiUser(request, "users.manage");
  if ("status" in context) return context;

  try {
    const userWhere = context.user.role === "SUPER_ADMIN" ? {} : { companyId: context.user.companyId ?? "__none__" };
    const invitationWhere = context.user.role === "SUPER_ADMIN" ? {} : { companyId: context.user.companyId ?? "__none__" };
    const [companies, users, invitations] = await Promise.all([
      prisma.company.findMany({
        where: context.user.role === "SUPER_ADMIN" ? { archivedAt: null } : { id: context.user.companyId ?? "__none__" },
        orderBy: { name: "asc" },
        select: { id: true, name: true }
      }),
      prisma.user.findMany({
        where: userWhere,
        orderBy: [{ createdAt: "desc" }],
        take: 200,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          status: true,
          lastLoginAt: true,
          company: { select: { name: true } }
        }
      }),
      prisma.userInvitation.findMany({
        where: invitationWhere,
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          status: true,
          expiresAt: true,
          sentAt: true,
          acceptedAt: true,
          lastEmailError: true,
          company: { select: { name: true } },
          invitedBy: { select: { firstName: true, lastName: true } }
        }
      })
    ]);

    return apiOk({
      companies,
      users: users.map((user) => ({ ...user, companyName: user.company?.name ?? "Plateforme" })),
      invitations: invitations.map((invitation) => ({
        ...invitation,
        companyName: invitation.company?.name ?? "Plateforme",
        invitedByName: invitation.invitedBy ? `${invitation.invitedBy.firstName} ${invitation.invitedBy.lastName}` : "-"
      }))
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      return apiOk({ companies: [], users: fallbackUsers(), invitations: [], warning: "Base locale indisponible : affichage de démonstration." });
    }
    console.error(error);
    return apiError("Chargement des utilisateurs impossible", 503);
  }
}

export async function POST(request: NextRequest) {
  const context = await requireApiUser(request, "users.manage");
  if ("status" in context) return context;

  const parsed = inviteSchema.safeParse(await request.json());
  if (!parsed.success) return apiError("Invitations invalides", 400, parsed.error.flatten());

  const results = [];

  for (const input of parsed.data.invitations) {
    const email = normalizeEmail(input.email);
    const firstName = input.firstName.trim();
    const lastName = input.lastName.trim();
    const role = input.role;
    const companyId = context.user.role === "SUPER_ADMIN" ? input.companyId ?? null : context.user.companyId;

    if (!canInviteRole(context.user.role, role)) {
      results.push({ email, status: "refusé", message: "Rôle non autorisé pour votre compte" });
      continue;
    }

    if (role !== "SUPER_ADMIN" && !companyId) {
      results.push({ email, status: "refusé", message: "Entreprise requise pour ce rôle" });
      continue;
    }

    try {
      const company = companyId
        ? await prisma.company.findFirst({
            where: { id: companyId, archivedAt: null },
            select: { id: true, name: true }
          })
        : null;

      if (role !== "SUPER_ADMIN" && !company) {
        results.push({ email, status: "refusé", message: "Entreprise introuvable" });
        continue;
      }

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing?.status === "ACTIVE") {
        results.push({ email, status: "refusé", message: "Un utilisateur actif existe déjà avec cet email" });
        continue;
      }
      if (existing?.companyId && context.user.role !== "SUPER_ADMIN" && existing.companyId !== companyId) {
        results.push({ email, status: "refusé", message: "Cet email est déjà rattaché à une autre entreprise" });
        continue;
      }

      const passwordHash = await createTemporaryPasswordHash();
      const user = existing
        ? await prisma.user.update({
            where: { id: existing.id },
            data: {
              companyId,
              email,
              firstName,
              lastName,
              role,
              status: "INVITED",
              passwordHash,
              emailVerifiedAt: null,
              archivedAt: null
            }
          })
        : await prisma.user.create({
            data: {
              companyId,
              email,
              firstName,
              lastName,
              role,
              status: "INVITED",
              passwordHash
            }
          });

      const token = createInvitationToken();
      const activationUrl = buildInvitationUrl(token, request);
      const expiresAt = invitationExpiry();
      const invitation = await prisma.userInvitation.create({
        data: {
          companyId,
          email,
          firstName,
          lastName,
          role,
          tokenHash: hashInvitationToken(token),
          expiresAt,
          invitedById: context.user.id,
          createdUserId: user.id,
          metadata: { source: "administration", delivery: "email" }
        }
      });

      const delivery = await sendInvitationEmail({
        to: { email, name: `${firstName} ${lastName}` },
        inviterName: `${context.user.firstName} ${context.user.lastName}`,
        companyName: company?.name ?? "la plateforme SENTINELLE",
        activationUrl,
        expiresAt
      });

      await prisma.userInvitation.update({
        where: { id: invitation.id },
        data: {
          sentAt: delivery.sent ? new Date() : null,
          lastEmailError: delivery.sent ? null : delivery.message ?? "Email non envoyé"
        }
      });

      await prisma.auditLog.create({
        data: {
          companyId,
          actorId: context.user.id,
          action: "CREATE",
          entity: "UserInvitation",
          entityId: invitation.id,
          after: { email, role, delivery: delivery.sent ? "sent" : "pending" }
        }
      });

      results.push({
        email,
        status: delivery.sent ? "envoyé" : "créé",
        message: delivery.sent ? "Invitation envoyée par email" : delivery.message,
        activationUrl: delivery.sent ? null : activationUrl
      });
    } catch (error) {
      console.error(error);
      results.push({ email, status: "erreur", message: error instanceof Error ? error.message : "Invitation impossible" });
    }
  }

  return apiOk({ results }, { status: 201 });
}
