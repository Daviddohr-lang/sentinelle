/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextRequest } from "next/server";
import { apiError, requireApiUser } from "@/lib/api";
import { readLocalStore } from "@/lib/local-store";
import { generateControlReportPdf, type ControlReportAudience, type ControlReportBar, type ControlReportPdfInput } from "@/lib/pdf";
import { prisma } from "@/lib/prisma";

const reportDefinitions: Record<
  string,
  {
    title: string;
    audience: ControlReportAudience;
    fileSlug: string;
  }
> = {
  COMPLET_INTERNE: {
    title: "Rapport complet interne",
    audience: "INTERNE",
    fileSlug: "interne"
  },
  RAPPORT_AGENT: {
    title: "Rapport agent",
    audience: "AGENT",
    fileSlug: "agent"
  },
  RAPPORT_DIRECTION: {
    title: "Rapport direction",
    audience: "DIRECTION",
    fileSlug: "direction"
  },
  SIMPLIFIE_CLIENT: {
    title: "Rapport client simplifié",
    audience: "CLIENT",
    fileSlug: "client"
  }
};

const SECURITY_COMPANY_LEGAL_NOTICE =
  "Article L612-14 du CSI : L'autorisation d'exercice ne confère aucune prérogative de puissance publique à l'entreprise ou aux personnes qui en bénéficient.";

function fileName(type: string, sessionId: string) {
  return `sentinelle-${sessionId}-${reportDefinitions[type]?.fileSlug ?? "rapport"}.pdf`;
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function htmlTone(tone: ControlReportBar["tone"], value: number) {
  const resolved = tone ?? barTone(value);
  if (resolved === "critical") return "#7f1d1d";
  if (resolved === "danger") return "#dc2626";
  if (resolved === "warning") return "#d97706";
  if (resolved === "neutral") return "#64748b";
  return "#047857";
}

function renderHtmlBar(item: ControlReportBar) {
  const value = clampScore(item.value);
  const color = htmlTone(item.tone, value);
  return `
    <div class="bar-row">
      <div class="bar-label"><span>${escapeHtml(item.label)}</span><strong>${value} %</strong></div>
      <div class="bar-track"><span style="width:${value}%;background:${color}"></span></div>
    </div>`;
}

function renderControlReportPreview(input: ControlReportPdfInput, downloadHref: string) {
  const qcmScores = input.qcmScores?.length
    ? input.qcmScores
    : [{ label: "QCM non réalisé ou non disponible", value: 0, tone: "neutral" as const }];
  const nonConformities = input.nonConformities?.length ? input.nonConformities : ["Aucune non-conformité affichée pour ce destinataire."];
  const prescriptions = input.prescriptions?.length ? input.prescriptions : ["Aucune prescription corrective prioritaire."];
  const globalScore = clampScore(input.globalScore);
  const globalTone = htmlTone(barTone(globalScore), globalScore);
  const company = {
    ...input.company,
    legalNotice: input.company?.legalNotice || SECURITY_COMPANY_LEGAL_NOTICE
  };
  const companyLines = [
    company.siret ? `SIRET ${company.siret}` : null,
    company.cnapsAuthorizationNumber ? `CNAPS ${company.cnapsAuthorizationNumber}` : null,
    company.address,
    [company.phone, company.website].filter(Boolean).join(" - ")
  ].filter(Boolean);

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(input.title)} - SENTINELLE</title>
  <style>
    :root {
      color-scheme: light;
      --ink: #111827;
      --muted: #64748b;
      --line: #d8dee7;
      --soft: #f5f7fa;
      --brand: #064e3b;
      --brand-2: #047857;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #eef2f6;
      color: var(--ink);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.45;
    }
    .page {
      width: min(1100px, calc(100% - 32px));
      margin: 24px auto;
      background: #fff;
      border: 1px solid var(--line);
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 20px 55px rgba(15, 23, 42, 0.12);
    }
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      padding: 22px 28px;
      background: var(--brand);
      color: #fff;
    }
    .company-head {
      display: flex;
      align-items: center;
      gap: 14px;
      min-width: 0;
    }
    .logo-box {
      display: grid;
      place-items: center;
      width: 58px;
      height: 58px;
      flex: 0 0 auto;
      overflow: hidden;
      border-radius: 8px;
      background: #fff;
      color: var(--brand);
      font-weight: 900;
    }
    .logo-box img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      padding: 5px;
    }
    .company-name { font-size: 20px; font-weight: 800; letter-spacing: 0; }
    .company-lines { margin-top: 4px; color: #d1fae5; font-size: 12px; font-weight: 600; }
    .brand { font-size: 20px; font-weight: 800; letter-spacing: 0; text-align: right; }
    .audience { color: #d1fae5; font-size: 13px; font-weight: 700; text-transform: uppercase; }
    .legal-strip {
      padding: 10px 28px;
      border-bottom: 1px solid var(--line);
      background: #f8fafc;
      color: #475569;
      font-size: 12px;
      font-weight: 650;
    }
    main { padding: 28px; }
    h1 { margin: 0; font-size: clamp(26px, 3vw, 40px); letter-spacing: 0; }
    h2 { margin: 0 0 14px; font-size: 18px; letter-spacing: 0; }
    p { margin: 0; }
    .subtitle { margin-top: 8px; color: var(--muted); font-size: 15px; }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 20px;
    }
    .button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 40px;
      padding: 0 14px;
      border-radius: 7px;
      border: 1px solid var(--brand-2);
      background: var(--brand-2);
      color: #fff;
      font-weight: 700;
      text-decoration: none;
      cursor: pointer;
    }
    .button.secondary {
      border-color: var(--line);
      background: #fff;
      color: var(--ink);
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
      margin-top: 24px;
    }
    .panel {
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 18px;
      background: #fff;
    }
    .panel.soft { background: var(--soft); }
    .meta {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      margin-top: 24px;
    }
    .meta-item {
      border: 1px solid var(--line);
      border-radius: 7px;
      padding: 12px;
      background: #fff;
    }
    .meta-item span {
      display: block;
      color: var(--muted);
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .meta-item strong { display: block; margin-top: 4px; font-size: 14px; }
    .score {
      display: flex;
      align-items: flex-end;
      gap: 12px;
    }
    .score strong { color: ${globalTone}; font-size: 52px; line-height: 1; }
    .score span { padding-bottom: 7px; color: var(--muted); font-weight: 700; }
    .bar-row + .bar-row { margin-top: 14px; }
    .bar-label {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 6px;
      color: #334155;
      font-size: 13px;
      font-weight: 650;
    }
    .bar-label strong { white-space: nowrap; }
    .bar-track {
      height: 10px;
      overflow: hidden;
      border-radius: 999px;
      background: #e5e7eb;
    }
    .bar-track span {
      display: block;
      min-width: 3px;
      height: 100%;
      border-radius: inherit;
    }
    ul {
      margin: 0;
      padding-left: 18px;
    }
    li + li { margin-top: 7px; }
    footer {
      padding: 18px 28px 26px;
      color: var(--muted);
      font-size: 12px;
      border-top: 1px solid var(--line);
      background: #fff;
    }
    @media (max-width: 760px) {
      .page { width: 100%; margin: 0; border-radius: 0; border-left: 0; border-right: 0; }
      header, main, footer { padding-left: 18px; padding-right: 18px; }
      header { align-items: flex-start; }
      .grid, .meta { grid-template-columns: 1fr; }
      .score strong { font-size: 42px; }
    }
    @media print {
      body { background: #fff; }
      .page { width: 100%; margin: 0; border: 0; box-shadow: none; }
      .actions { display: none; }
    }
  </style>
</head>
<body>
  <article class="page">
    <header>
      <div class="company-head">
        <div class="logo-box">${
          company.logoUrl ? `<img src="${escapeHtml(company.logoUrl)}" alt="Logo ${escapeHtml(company.name ?? "entreprise")}" />` : escapeHtml((company.name ?? "SENTINELLE").split(" ").slice(0, 3).map((word) => word[0]).join("").toUpperCase())
        }</div>
        <div>
          <div class="company-name">${escapeHtml(company.name ?? "SENTINELLE")}</div>
          <div class="company-lines">${companyLines.map(escapeHtml).join("<br />")}</div>
        </div>
      </div>
      <div>
        <div class="brand">SENTINELLE</div>
        <div class="audience">Aperçu ${escapeHtml(input.audience.toLowerCase())}</div>
      </div>
    </header>
    <div class="legal-strip">${escapeHtml(company.legalNotice)}</div>
    <main>
      <h1>${escapeHtml(input.title)}</h1>
      <p class="subtitle">${escapeHtml(input.subtitle ?? "Contrôle qualité terrain")}</p>
      <div class="actions">
        <a class="button" href="${escapeHtml(downloadHref)}">Télécharger le PDF</a>
        <button class="button secondary" type="button" onclick="window.print()">Imprimer / enregistrer en PDF</button>
      </div>
      <section class="meta">
        ${input.meta
          .map(
            (item) => `
          <div class="meta-item">
            <span>${escapeHtml(item.label)}</span>
            <strong>${escapeHtml(item.value ?? "-")}</strong>
          </div>`
          )
          .join("")}
      </section>
      <section class="grid">
        <div class="panel soft">
          <h2>Note globale</h2>
          <div class="score"><strong>${globalScore} %</strong><span>${escapeHtml(input.complianceLevel ?? "Niveau non calculé")}</span></div>
          ${renderHtmlBar({ label: "Évaluation globale", value: globalScore, tone: barTone(globalScore) })}
        </div>
        <div class="panel">
          <h2>Synthèse</h2>
          <ul>${input.summary.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>
        </div>
        <div class="panel">
          <h2>Graphique des notes par critère</h2>
          ${input.criterionScores.slice(0, 12).map(renderHtmlBar).join("")}
        </div>
        <div class="panel">
          <h2>QCM et indicateurs</h2>
          ${qcmScores.map(renderHtmlBar).join("")}
        </div>
        <div class="panel">
          <h2>Constats et non-conformités</h2>
          <ul>${nonConformities.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>
        </div>
        <div class="panel">
          <h2>Prescriptions du contrôleur</h2>
          <ul>${prescriptions.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>
        </div>
      </section>
    </main>
    <footer>${escapeHtml(input.footer ?? "Rapport généré automatiquement par SENTINELLE.")}</footer>
  </article>
</body>
</html>`;
}

function personName(person?: { firstName?: string | null; lastName?: string | null } | null) {
  return [person?.firstName, person?.lastName].filter(Boolean).join(" ") || null;
}

function formatDate(value?: string | Date | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("fr-FR");
}

function formatTime(value?: string | Date | null) {
  if (!value) return "-";
  return new Date(value).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function controllerName(session: any) {
  return (
    session.metadata?.controllerName ??
    personName(session.control?.controller) ??
    session.controllerName ??
    session.control?.controllerName ??
    "Contrôleur non renseigné"
  );
}

function companyProfile(session: any) {
  return {
    name: session.company?.name ?? "SENTINELLE",
    logoUrl: session.company?.logoUrl ?? null,
    siret: session.company?.siret ?? null,
    cnapsAuthorizationNumber: session.company?.cnapsAuthorizationNumber ?? null,
    address: session.company?.address ?? null,
    phone: session.company?.phone ?? null,
    website: session.company?.website ?? null,
    legalNotice: session.company?.legalNotice || SECURITY_COMPANY_LEGAL_NOTICE
  };
}

function hasCompanyAccess(user: { role: string; companyId: string | null }, companyId: string) {
  return user.role === "SUPER_ADMIN" || user.companyId === companyId;
}

function isAgentReportOwner(user: { id: string; email: string; role: string }, session: any) {
  return user.role === "AGENT" && (session.agent?.userId === user.id || session.agent?.email === user.email);
}

function isClientReportOwner(user: { email: string; role: string }, session: any) {
  return user.role === "CLIENT" && session.client?.contactEmail === user.email;
}

function canReadReport(user: { id: string; email: string; role: string; companyId: string | null }, session: any, type: string) {
  if (!hasCompanyAccess(user, session.companyId)) return false;
  if (user.role === "SUPER_ADMIN" || user.role === "COMPANY_ADMIN" || user.role === "QUALITY_CONTROLLER" || user.role === "BUSINESS_OWNER") return true;
  if (user.role === "AGENT") return type === "RAPPORT_AGENT" && isAgentReportOwner(user, session);
  if (user.role === "CLIENT") return type === "SIMPLIFIE_CLIENT" && isClientReportOwner(user, session);
  return false;
}

function visibilityAllowed(result: any, audience: ControlReportAudience) {
  const visibility = result.reportVisibility ?? {};
  if (audience === "CLIENT") return visibility.client === true || result.responseOption?.visibleInClientReport === true;
  if (audience === "AGENT") return visibility.agent !== false && result.responseOption?.visibleInAgentReport !== false;
  return true;
}

function barTone(value: number): ControlReportBar["tone"] {
  if (value < 50) return "critical";
  if (value < 70) return "danger";
  if (value < 85) return "warning";
  return "good";
}

function criterionBars(session: any, audience: ControlReportAudience): ControlReportBar[] {
  const pointResults = (session.pointResults ?? []).filter((result: any) => visibilityAllowed(result, audience));
  const byCriterion = new Map<string, { label: string; scores: number[] }>();
  for (const result of pointResults) {
    const criterionId = result.criterionId ?? result.criterion?.id ?? "critere";
    const label = result.criterion?.label ?? result.criterionResult?.criterion?.label ?? "Critère contrôlé";
    const current = byCriterion.get(criterionId) ?? { label, scores: [] as number[] };
    if (typeof result.score === "number") current.scores.push(result.score);
    byCriterion.set(criterionId, current);
  }
  if (!byCriterion.size && session.criterionResults?.length) {
    return session.criterionResults.map((result: any) => ({
      label: result.criterion?.label ?? "Critère contrôlé",
      value: Math.round(result.score ?? 0),
      tone: barTone(result.score ?? 0)
    }));
  }
  return [...byCriterion.values()].map((item) => {
    const value = item.scores.length ? Math.round(item.scores.reduce((sum, score) => sum + score, 0) / item.scores.length) : 0;
    return { label: item.label, value, tone: barTone(value) };
  });
}

function qcmBars(session: any, audience: ControlReportAudience): ControlReportBar[] {
  if (audience === "CLIENT") {
    return (session.qcmSessions ?? [])
      .filter((qcm: any) => qcm.status === "TERMINE" && typeof qcm.score === "number")
      .map((qcm: any) => ({
        label: qcm.bank?.title ?? qcm.bankTitle ?? qcm.qcm?.title ?? "QCM",
        value: Math.round(qcm.score),
        tone: barTone(qcm.score)
      }));
  }
  return (session.qcmSessions ?? []).map((qcm: any) => ({
    label: qcm.bank?.title ?? qcm.bankTitle ?? qcm.qcm?.title ?? "QCM",
    value: Math.round(qcm.score ?? 0),
    tone: typeof qcm.score === "number" ? barTone(qcm.score) : "neutral"
  }));
}

function reportPointResults(session: any, audience: ControlReportAudience) {
  return (session.pointResults ?? []).filter((result: any) => visibilityAllowed(result, audience));
}

function nonConformityLines(session: any, audience: ControlReportAudience) {
  return reportPointResults(session, audience)
    .filter((result: any) => result.status === "NON_CONFORME")
    .map((result: any) => {
      const severity = audience === "CLIENT" ? "Écart qualité" : result.severity ?? "Écart";
      const delay = result.correctionDelayHours === 0 ? "immédiat" : `${result.correctionDelayHours ?? 48}h`;
      return `${severity} - ${result.point?.label ?? "Point de contrôle"} - délai ${delay}`;
    });
}

function prescriptionLines(session: any, audience: ControlReportAudience) {
  return reportPointResults(session, audience)
    .filter((result: any) => result.status === "NON_CONFORME" || result.correctiveAction)
    .map((result: any) => {
      if (audience === "CLIENT") {
        return result.responseOption?.visibleInClientReport === false ? null : `Suivi qualité prévu sur ${result.point?.label ?? "point contrôlé"}`;
      }
      return `${result.point?.label ?? "Point"}: ${result.correctiveAction ?? "Action corrective à définir"}`;
    })
    .filter(Boolean) as string[];
}

function summaryLines(session: any, audience: ControlReportAudience) {
  const nonConformities = nonConformityLines(session, audience).length;
  const qcms = qcmBars(session, audience).filter((qcm) => qcm.tone !== "neutral").length;
  const base = [
    `Note globale ${Math.round(session.globalScore ?? 0)} %`,
    `${nonConformities} non-conformité(s) visible(s)`,
    `${qcms} QCM terminé(s) rattaché(s)`
  ];
  if (audience === "CLIENT") return [...base, "Version simplifiée sans donnée RH sensible."];
  if (audience === "AGENT") return [...base, "Axes d'amélioration et actions attendues."];
  if (audience === "DIRECTION") return [...base, "Version pilotage avec criticités et prescriptions."];
  return [...base, "Version complète interne avec historique utile."];
}

function reportMeta(session: any, audience: ControlReportAudience) {
  return [
    { label: "Date", value: formatDate(session.startedAt ?? session.completedAt) },
    { label: "Heure début", value: formatTime(session.startedAt) },
    { label: "Heure fin", value: formatTime(session.completedAt) },
    { label: "Contrôleur", value: controllerName(session) },
    { label: "Agent", value: session.agentName ?? personName(session.agent) ?? "Agent archivé" },
    { label: "Client", value: session.clientName ?? session.client?.name ?? "Client archivé" },
    { label: "Site", value: session.siteName ?? session.site?.name ?? "Site archivé" },
    { label: "Contrôle", value: session.type ?? "Contrôle qualité" },
    { label: "Niveau", value: session.complianceLevel ?? "Non calculé" },
    { label: "Destinataire", value: audience === "CLIENT" ? "Client" : audience === "AGENT" ? "Agent" : audience === "DIRECTION" ? "Direction" : "Interne" },
    { label: "Adresse", value: session.detectedAddress ?? session.site?.address ?? "-" }
  ];
}

async function loadDatabaseSession(sessionId: string) {
  const db = prisma as any;
  if (!db.controlSession) return null;
  return db.controlSession.findUnique({
    where: { id: sessionId },
    include: {
      company: true,
      control: { include: { controller: true } },
      agent: true,
      client: true,
      site: true,
      criterionResults: { include: { criterion: true } },
      pointResults: { include: { point: true, responseOption: true, criterion: true } },
      reports: true,
      signatures: true,
      qcmSessions: { include: { bank: true, qcm: true } }
    }
  });
}

async function loadLocalSession(sessionId: string) {
  const store = await readLocalStore();
  const session = store.controlSessions.find((item) => item.id === sessionId);
  if (!session) return null;
  const agent = store.agents.find((item) => item.id === session.agentId);
  const client = store.clients.find((item) => item.id === session.clientId);
  const site = store.sites.find((item) => item.id === session.siteId);
  const company = store.companies.find((item) => item.id === session.companyId);
  const pointResults = store.controlPointResults
    .filter((result) => result.sessionId === session.id)
    .map((result) => ({
      ...result,
      criterion: store.controlCriteria.find((criterion) => criterion.id === result.criterionId),
      point: store.controlPoints.find((point) => point.id === result.pointId),
      responseOption: store.controlPointResponseOptions.find((option) => option.id === result.responseOptionId)
    }));
  const criterionResults = store.controlCriterionResults
    .filter((result) => result.sessionId === session.id)
    .map((result) => ({
      ...result,
      criterion: store.controlCriteria.find((criterion) => criterion.id === result.criterionId)
    }));
  const qcmSessions = store.qcmSessions
    .filter((qcm) => qcm.controlId === session.controlId)
    .map((qcm) => ({
      ...qcm,
      bank: store.qcmBanks.find((bank) => bank.id === qcm.bankId)
    }));
  return {
    ...session,
    agent,
    agentName: personName(agent),
    client,
    clientName: client?.name,
    site,
    siteName: site?.name,
    company,
    controllerName: session.metadata?.controllerName,
    criterionResults,
    pointResults,
    qcmSessions
  };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  const context = await requireApiUser(request);
  if ("status" in context) return context;
  const { sessionId } = await params;
  const type = request.nextUrl.searchParams.get("type") ?? "COMPLET_INTERNE";
  const download = request.nextUrl.searchParams.get("download") === "1";
  const preview = request.nextUrl.searchParams.get("preview") === "1";
  const definition = reportDefinitions[type];
  if (!definition) return apiError("Type de rapport invalide", 400);

  const session = (await loadDatabaseSession(sessionId).catch(() => null)) ?? (await loadLocalSession(sessionId).catch(() => null));
  if (!session) return apiError("Session de contrôle introuvable", 404);
  if (!canReadReport(context.user, session, type)) return apiError("Accès rapport interdit", 403);

  const reportInput: ControlReportPdfInput = {
    title: definition.title,
    subtitle: `${session.siteName ?? session.site?.name ?? "Site"} - ${session.agentName ?? personName(session.agent) ?? "Agent"}`,
    audience: definition.audience,
    company: companyProfile(session),
    meta: reportMeta(session, definition.audience),
    summary: summaryLines(session, definition.audience),
    globalScore: Math.round(session.globalScore ?? 0),
    complianceLevel: session.complianceLevel,
    criterionScores: criterionBars(session, definition.audience),
    qcmScores: qcmBars(session, definition.audience),
    nonConformities: nonConformityLines(session, definition.audience),
    prescriptions: prescriptionLines(session, definition.audience),
    footer:
      definition.audience === "CLIENT"
        ? "Rapport client simplifié : aucune sanction, aucun commentaire RH sensible, aucune donnée interne confidentielle."
        : "Rapport généré automatiquement par SENTINELLE à partir des constats, QCM, signatures et actions correctives du contrôle."
  };

  if (preview) {
    const html = renderControlReportPreview(reportInput, `/api/reports/control/${sessionId}?type=${encodeURIComponent(type)}&download=1`);
    return new Response(html, {
      headers: {
        "content-type": "text/html; charset=utf-8"
      }
    });
  }

  const pdf = generateControlReportPdf(reportInput);

  return new Response(pdf, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `${download ? "attachment" : "inline"}; filename="${fileName(type, sessionId)}"`
    }
  });
}
