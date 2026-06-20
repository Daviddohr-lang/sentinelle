import type { NextRequest } from "next/server";
import { apiError, requireApiUser } from "@/lib/api";
import { buildImportTemplate, isImportType } from "@/lib/import-excel";

export async function GET(request: NextRequest) {
  const context = await requireApiUser(request, "company.manage");
  if ("status" in context) return context;

  const type = request.nextUrl.searchParams.get("type") ?? "all";
  if (type !== "all" && !isImportType(type)) return apiError("Type de modèle inconnu", 400);

  const template = buildImportTemplate(type);
  return new Response(new Uint8Array(template.buffer), {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="${template.filename}"`,
      "cache-control": "no-store"
    }
  });
}
