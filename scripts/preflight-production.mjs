import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

function loadEnvFile(fileName) {
  const filePath = path.join(process.cwd(), fileName);
  if (!existsSync(filePath)) return;
  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const rawValue = trimmed.slice(index + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, "");
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFile(".env.production");
loadEnvFile(".env");

const requiredChecks = [
  {
    name: "DATABASE_URL",
    ok: () => /^(postgresql|postgres):\/\//.test(process.env.DATABASE_URL ?? ""),
    hint: "doit pointer vers une base PostgreSQL"
  },
  {
    name: "AUTH_SECRET",
    ok: () => {
      const value = process.env.AUTH_SECRET ?? "";
      return value.length >= 32 && !value.includes("changez-moi") && !value.includes("remplacer");
    },
    hint: "doit etre une cle longue, aleatoire et secrete"
  },
  {
    name: "APP_URL",
    ok: () => /^https?:\/\//.test(process.env.APP_URL ?? ""),
    hint: "doit contenir l'URL publique de SENTINELLE"
  },
  {
    name: "LOCAL_DATASTORE_DISABLED",
    ok: () => process.env.LOCAL_DATASTORE_DISABLED === "true",
    hint: "doit valoir true en production"
  },
  {
    name: "FILE_STORAGE_PATH",
    ok: () => Boolean(process.env.FILE_STORAGE_PATH),
    hint: "doit pointer vers un volume persistant"
  }
];

const failures = requiredChecks.filter((check) => !check.ok());

if (failures.length) {
  console.error("Preflight production echoue :");
  for (const failure of failures) {
    console.error(`- ${failure.name} : ${failure.hint}`);
  }
  process.exit(1);
}

console.log("Preflight production OK : configuration minimale exploitable.");
