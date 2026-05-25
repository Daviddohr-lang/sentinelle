import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiOk, requireApiUser } from "@/lib/api";
import { dashboardStats, demoNonConformities, qualityEvolution } from "@/lib/demo-data";

const schema = z.object({
  scope: z.enum(["rapport", "controle", "mensuel", "appel_offres", "recurrences"]).default("mensuel"),
  prompt: z.string().max(2000).optional()
});

export async function POST(request: NextRequest) {
  const context = await requireApiUser(request, "ai.use");
  if ("status" in context) return context;

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return apiError("Demande IA invalide", 400, parsed.error.flatten());

  const enabled = process.env.AI_FEATURES_ENABLED === "true";
  const recurring = demoNonConformities.reduce<Record<string, number>>((acc, item) => {
    acc[item.itemLabel] = (acc[item.itemLabel] ?? 0) + 1;
    return acc;
  }, {});

  return apiOk({
    enabled,
    mode: enabled ? "pret-connecteur" : "simulation-desactivable",
    scope: parsed.data.scope,
    summary:
      "La tendance qualite est positive, mais la tracabilite main courante et les documents expirants doivent rester prioritaires sur les sites a activite nocturne.",
    recommendations: [
      "Planifier un rappel cible sur la main courante pour les agents des sites logistiques.",
      "Declencher les relances documentaires quatre mois avant echeance, puis a J-30.",
      "Utiliser les notes et volumes de controle dans les dossiers d'appels d'offres pour prouver la demarche qualite."
    ],
    signals: {
      dashboardStats,
      qualityEvolution,
      recurring
    }
  });
}
