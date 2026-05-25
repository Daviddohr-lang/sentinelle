import { compare } from "bcryptjs";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { secureCookieOptions, sessionCookieName, signSession, type SessionUser } from "@/lib/auth";
import { demoUsers } from "@/lib/demo-data";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export async function POST(request: NextRequest) {
  const parsed = loginSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Identifiants invalides" }, { status: 400 });
  }

  const { email, password } = parsed.data;
  let sessionUser: SessionUser | null = null;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        companyId: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        passwordHash: true
      }
    });

    if (user && user.status === "ACTIVE" && (await compare(password, user.passwordHash))) {
      await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
      await prisma.auditLog.create({
        data: {
          companyId: user.companyId,
          actorId: user.id,
          action: "LOGIN",
          entity: "User",
          entityId: user.id,
          ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
          userAgent: request.headers.get("user-agent") ?? undefined
        }
      });
      sessionUser = {
        id: user.id,
        companyId: user.companyId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      };
    }
  } catch (error) {
    if (process.env.NODE_ENV === "production" && process.env.DEMO_MODE !== "true") {
      console.error(error);
      return NextResponse.json({ error: "Service d'authentification indisponible" }, { status: 503 });
    }
  }

  if (!sessionUser && (process.env.DEMO_MODE === "true" || process.env.NODE_ENV !== "production")) {
    const demo = demoUsers.find((user) => user.email === email);
    if (demo && password === "Sentinelle2026!") {
      sessionUser = demo;
    }
  }

  if (!sessionUser) {
    return NextResponse.json({ error: "Email ou mot de passe incorrect" }, { status: 401 });
  }

  const token = await signSession(sessionUser);
  const response = NextResponse.json({ user: sessionUser });
  response.cookies.set(sessionCookieName, token, secureCookieOptions());
  return response;
}
