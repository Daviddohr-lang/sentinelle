import { NextResponse, type NextRequest } from "next/server";
import type { Role } from "@prisma/client";
import { getSessionFromRequest, type SessionUser } from "@/lib/auth";
import { hasPermission, type Permission } from "@/lib/rbac";

export type ApiContext = {
  user: SessionUser;
};

export function apiOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function apiError(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status });
}

export async function requireApiUser(request: NextRequest, permission?: Permission): Promise<ApiContext | NextResponse> {
  const user = await getSessionFromRequest(request);
  if (!user) return apiError("Authentification requise", 401);
  if (permission && !hasPermission(user.role as Role, permission)) {
    return apiError("Permission insuffisante", 403);
  }
  return { user };
}

export function scopedCompanyWhere(user: SessionUser) {
  return user.role === "SUPER_ADMIN" ? {} : { companyId: user.companyId ?? "__none__" };
}

export function parsePagination(request: NextRequest) {
  const page = Math.max(1, Number(request.nextUrl.searchParams.get("page") || 1));
  const perPage = Math.min(100, Math.max(1, Number(request.nextUrl.searchParams.get("perPage") || 20)));
  return { page, perPage, skip: (page - 1) * perPage, take: perPage };
}
