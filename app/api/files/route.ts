import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiOk, requireApiUser } from "@/lib/api";

const uploadSchema = z.object({
  fileName: z.string().min(1),
  mimeType: z.string().min(3),
  contentBase64: z.string().min(1),
  scope: z.enum(["evidence", "document", "signature", "report"]).default("document")
});

function safeName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function POST(request: NextRequest) {
  const context = await requireApiUser(request, "documents.write");
  if ("status" in context) return context;
  if (!context.user.companyId) return apiError("Entreprise requise", 400);

  const parsed = uploadSchema.safeParse(await request.json());
  if (!parsed.success) return apiError("Fichier invalide", 400, parsed.error.flatten());

  const storageRoot = path.resolve(process.env.FILE_STORAGE_PATH ?? "./storage");
  const companyRoot = path.join(storageRoot, context.user.companyId, parsed.data.scope);
  await mkdir(companyRoot, { recursive: true });

  const fileId = `${randomUUID()}-${safeName(parsed.data.fileName)}`;
  const fullPath = path.join(companyRoot, fileId);
  if (!fullPath.startsWith(companyRoot)) return apiError("Nom de fichier refuse", 400);

  await writeFile(fullPath, Buffer.from(parsed.data.contentBase64, "base64"));
  return apiOk({
    file: {
      id: fileId,
      fileName: parsed.data.fileName,
      mimeType: parsed.data.mimeType,
      url: `/api/files/${fileId}`,
      storagePath: fullPath
    }
  });
}
