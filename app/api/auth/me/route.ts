import type { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/api";
import { getSessionFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await getSessionFromRequest(request);
  if (!user) return apiError("Authentification requise", 401);
  return apiOk({ user });
}
