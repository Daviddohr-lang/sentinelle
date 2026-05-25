import { readFile } from "fs/promises";
import path from "path";
import type { NextRequest } from "next/server";
import { apiError, requireApiUser } from "@/lib/api";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = await requireApiUser(request, "documents.read");
  if ("status" in context) return context;
  if (!context.user.companyId) return apiError("Entreprise requise", 400);

  const { id } = await params;
  const storageRoot = path.resolve(process.env.FILE_STORAGE_PATH ?? "./storage");
  const companyRoot = path.join(storageRoot, context.user.companyId);
  const matches = ["document", "evidence", "signature", "report"].map((scope) => path.join(companyRoot, scope, id));

  for (const candidate of matches) {
    try {
      if (!candidate.startsWith(companyRoot)) continue;
      const file = await readFile(candidate);
      return new Response(file, {
        headers: {
          "content-type": "application/octet-stream",
          "content-disposition": `attachment; filename="${id.replace(/"/g, "")}"`
        }
      });
    } catch {
      // Continue avec les autres scopes autorises.
    }
  }

  return apiError("Fichier introuvable", 404);
}
