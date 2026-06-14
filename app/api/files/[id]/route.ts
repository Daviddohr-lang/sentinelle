import type { NextRequest } from "next/server";
import { apiError, requireApiUser } from "@/lib/api";
import { readManagedFile } from "@/lib/storage";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = await requireApiUser(request, "documents.read");
  if ("status" in context) return context;
  if (!context.user.companyId) return apiError("Entreprise requise", 400);

  const { id } = await params;
  const file = await readManagedFile({ companyId: context.user.companyId, id });
  if (file) {
    return new Response(file.buffer, {
      headers: {
        "content-type": file.mimeType,
        "content-disposition": `attachment; filename="${file.fileName.replace(/"/g, "")}"`
      }
    });
  }

  return apiError("Fichier introuvable", 404);
}
