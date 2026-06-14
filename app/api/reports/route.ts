import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiOk, requireApiUser, scopedCompanyWhere } from "@/lib/api";
import { demoControls } from "@/lib/demo-data";
import { readLocalStore } from "@/lib/local-store";
import { generateAuditPdf } from "@/lib/pdf";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  controlId: z.string(),
  type: z.enum(["COMPLET_INTERNE", "SIMPLIFIE_CLIENT", "RAPPORT_AGENT", "RAPPORT_DIRECTION"]).default("COMPLET_INTERNE"),
  sendToAgent: z.boolean().default(false),
  sendToManager: z.boolean().default(false),
  sendToClient: z.boolean().default(false),
  download: z.boolean().default(false)
});

export async function GET(request: NextRequest) {
  const context = await requireApiUser(request, "reports.client");
  if ("status" in context) return context;
  const reports = await prisma.report.findMany({
    where: {
      ...scopedCompanyWhere(context.user),
      ...(context.user.role === "CLIENT" ? { visibility: { in: ["CLIENT_SIMPLIFIE", "CLIENT_COMPLET_APPROUVE"] } } : {})
    },
    include: { control: true },
    orderBy: { createdAt: "desc" }
  });
  return apiOk({ reports });
}

export async function POST(request: NextRequest) {
  const context = await requireApiUser(request, "reports.client");
  if ("status" in context) return context;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return apiError("Demande de rapport invalide", 400, parsed.error.flatten());
  if (parsed.data.type !== "SIMPLIFIE_CLIENT" && context.user.role === "CLIENT") return apiError("Rapport complet non autorise", 403);

  const demoControl = demoControls.find((control) => control.id === parsed.data.controlId) ?? demoControls[0];
  let qcmLines: string[] = [];
  try {
    const store = await readLocalStore();
    const sessions = store.qcmSessions.filter((session) => session.controlId === parsed.data.controlId);
    qcmLines = sessions.map((session) => {
      const bank = store.qcmBanks.find((item) => item.id === session.bankId);
      const interruptions = store.qcmInterruptions.filter((item) => item.sessionId === session.id);
      return `${bank?.title ?? "QCM"}: ${session.score ?? "en attente"} % - statut ${session.status}${interruptions.length ? ` - interruptions ${interruptions.length}` : ""}`;
    });
  } catch {
    qcmLines = [];
  }
  const pdf = generateAuditPdf({
    title:
      parsed.data.type === "COMPLET_INTERNE"
        ? "Rapport complet interne"
        : parsed.data.type === "RAPPORT_AGENT"
          ? "Rapport agent"
          : parsed.data.type === "RAPPORT_DIRECTION"
            ? "Rapport direction"
            : "Rapport simplifie client",
    subtitle: `${demoControl.siteName} - ${demoControl.agentName}`,
    lines:
      parsed.data.type === "COMPLET_INTERNE" || parsed.data.type === "RAPPORT_AGENT" || parsed.data.type === "RAPPORT_DIRECTION"
        ? [
            `Controle: ${demoControl.type} - statut ${demoControl.status}`,
            `Controleur: ${demoControl.controllerName}`,
            `Note globale: ${demoControl.globalScore} %`,
            `Observations: ${demoControl.observations}`,
            ...(qcmLines.length ? ["Resultats QCM:", ...qcmLines] : ["Resultats QCM: aucun QCM lie au controle"]),
            "Non-conformites, preuves, signatures et historique inclus selon droits internes."
          ]
        : [
            `Date et lieu: ${demoControl.startedAt} - ${demoControl.detectedAddress}`,
            `Agent: ${demoControl.agentName}`,
            `Controleur: ${demoControl.controllerName}`,
            `Note globale: ${demoControl.globalScore} %`,
            ...(qcmLines.length ? qcmLines.map((line) => line.replace(/ - interruptions .+$/, "")) : ["Resultats QCM: non disponibles"]),
            "Synthese client sans information RH sensible ni sanction."
          ]
  });

  if (parsed.data.download) {
    return new Response(pdf, {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="sentinelle-${parsed.data.type.toLowerCase()}.pdf"`
      }
    });
  }

  try {
    if (!context.user.companyId) throw new Error("Entreprise requise");
    const report = await prisma.report.create({
      data: {
        companyId: context.user.companyId,
        controlId: parsed.data.controlId,
        type: parsed.data.type,
        visibility: parsed.data.type === "SIMPLIFIE_CLIENT" ? "CLIENT_SIMPLIFIE" : parsed.data.type === "RAPPORT_AGENT" ? "AGENT" : "DIRECTION",
        title:
          parsed.data.type === "COMPLET_INTERNE"
            ? "Rapport complet interne"
            : parsed.data.type === "RAPPORT_AGENT"
              ? "Rapport agent"
              : parsed.data.type === "RAPPORT_DIRECTION"
                ? "Rapport direction"
                : "Rapport simplifie client",
        generatedById: context.user.id,
        sentToAgent: parsed.data.sendToAgent,
        sentToManager: parsed.data.sendToManager,
        sentToClient: parsed.data.sendToClient
      }
    });
    return apiOk({ report, pdfPreviewBytes: pdf.length }, { status: 201 });
  } catch {
    return apiOk({ report: { id: "demo-report", type: parsed.data.type }, pdfPreviewBytes: pdf.length }, { status: 201 });
  }
}
