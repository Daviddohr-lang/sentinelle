import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiOk, requireApiUser } from "@/lib/api";
import { saveManagedFile } from "@/lib/storage";

const uploadSchema = z.object({
  fileName: z.string().min(1),
  mimeType: z.string().min(3),
  contentBase64: z.string().min(1),
  scope: z.enum(["evidence", "document", "signature", "report"]).default("document")
});

export async function POST(request: NextRequest) {
  const context = await requireApiUser(request, "documents.write");
  if ("status" in context) return context;
  if (!context.user.companyId) return apiError("Entreprise requise", 400);

  const parsed = uploadSchema.safeParse(await request.json());
  if (!parsed.success) return apiError("Fichier invalide", 400, parsed.error.flatten());

  try {
    const file = await saveManagedFile({
      companyId: context.user.companyId,
      scope: parsed.data.scope,
      fileName: parsed.data.fileName,
      mimeType: parsed.data.mimeType,
      content: Buffer.from(parsed.data.contentBase64, "base64")
    });
    return apiOk({ file });
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Stockage fichier impossible", 400);
  }
}
