import { createHash, randomBytes } from "node:crypto";
import { hash } from "bcryptjs";
import type { NextRequest } from "next/server";

export const invitationValidityDays = 14;

export function createInvitationToken() {
  return randomBytes(32).toString("base64url");
}

export function hashInvitationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function invitationExpiry(days = invitationValidityDays) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + days);
  return expiresAt;
}

export async function createTemporaryPasswordHash() {
  return hash(randomBytes(36).toString("base64url"), 12);
}

export function resolveAppUrl(request?: NextRequest) {
  const configured = process.env.APP_URL?.replace(/\/$/, "");
  if (configured) return configured;
  if (!request) return "http://localhost:3000";
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "localhost:3000";
  const protocol = request.headers.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}

export function buildInvitationUrl(token: string, request?: NextRequest) {
  return `${resolveAppUrl(request)}/invitation/${encodeURIComponent(token)}`;
}
