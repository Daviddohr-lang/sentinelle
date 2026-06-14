import { spawnSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { bootstrapMinimal } from "./bootstrap-minimal.mjs";

const prisma = new PrismaClient();

try {
  const users = await prisma.user.count();
  const seedProfile = process.env.SEED_PROFILE || (process.env.NODE_ENV === "production" ? "minimal" : "demo");

  if (users > 0) {
    console.log(`Base deja initialisee: ${users} utilisateur(s) trouve(s).`);
    process.exit(0);
  }

  if (seedProfile === "minimal") {
    console.log("Base vide: lancement du seed minimal SENTINELLE.");
    await bootstrapMinimal(prisma);
    process.exit(0);
  }

  console.log("Base vide: lancement du seed demo SENTINELLE.");
  const result = spawnSync("npm", ["run", "db:seed"], {
    stdio: "inherit",
    env: process.env
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
} catch (error) {
  console.error("Initialisation de la base impossible.", error);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
