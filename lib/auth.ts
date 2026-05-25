import { jwtVerify, SignJWT } from "jose";
import type { NextRequest } from "next/server";
import type { Role } from "@prisma/client";

export const sessionCookieName = "sentinelle_session";

export type SessionUser = {
  id: string;
  companyId: string | null;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
};

const fallbackSecret = "sentinelle-dev-secret-change-me-minimum-32-chars";

function secret() {
  return new TextEncoder().encode(process.env.AUTH_SECRET || fallbackSecret);
}

export async function signSession(user: SessionUser) {
  return new SignJWT(user)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret());
}

export async function verifySession(token?: string | null): Promise<SessionUser | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      id: String(payload.id),
      companyId: payload.companyId ? String(payload.companyId) : null,
      email: String(payload.email),
      firstName: String(payload.firstName),
      lastName: String(payload.lastName),
      role: payload.role as Role
    };
  } catch {
    return null;
  }
}

export async function getSessionFromRequest(request: NextRequest) {
  const headerToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const cookieToken = request.cookies.get(sessionCookieName)?.value;
  return verifySession(headerToken || cookieToken);
}

export async function getSessionFromCookies() {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  return verifySession(cookieStore.get(sessionCookieName)?.value);
}

export function secureCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12
  };
}
