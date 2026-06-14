import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export const fileScopes = ["document", "evidence", "signature", "report"] as const;
export type FileScope = (typeof fileScopes)[number];

export type StoredFile = {
  id: string;
  fileName: string;
  mimeType: string;
  url: string;
  driver: "filesystem";
  storagePath: string;
};

function storageRoot() {
  return path.resolve(process.env.FILE_STORAGE_PATH ?? "./storage");
}

function safeName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function ensureInside(basePath: string, candidate: string) {
  const relative = path.relative(basePath, candidate);
  return relative && !relative.startsWith("..") && !path.isAbsolute(relative);
}

export function getStorageStatus() {
  return {
    driver: "filesystem" as const,
    path: storageRoot(),
    persistent: process.env.NODE_ENV === "production" || Boolean(process.env.FILE_STORAGE_PATH)
  };
}

export async function saveManagedFile(input: {
  companyId: string;
  scope: FileScope;
  fileName: string;
  mimeType: string;
  content: Buffer;
}): Promise<StoredFile> {
  const root = storageRoot();
  const companyRoot = path.join(root, input.companyId, input.scope);
  await mkdir(companyRoot, { recursive: true });

  const fileId = `${randomUUID()}-${safeName(input.fileName)}`;
  const fullPath = path.join(companyRoot, fileId);
  if (!ensureInside(companyRoot, fullPath)) {
    throw new Error("Nom de fichier refuse");
  }

  await writeFile(fullPath, input.content);

  return {
    id: fileId,
    fileName: input.fileName,
    mimeType: input.mimeType,
    url: `/api/files/${fileId}`,
    driver: "filesystem",
    storagePath: fullPath
  };
}

export async function readManagedFile(input: { companyId: string; id: string }) {
  const root = storageRoot();
  const companyRoot = path.join(root, input.companyId);

  for (const scope of fileScopes) {
    const candidate = path.join(companyRoot, scope, input.id);
    if (!ensureInside(companyRoot, candidate)) continue;

    try {
      const buffer = await readFile(candidate);
      return {
        buffer,
        fileName: input.id,
        mimeType: "application/octet-stream"
      };
    } catch {
      // Le fichier peut appartenir a un autre scope autorise.
    }
  }

  return null;
}
