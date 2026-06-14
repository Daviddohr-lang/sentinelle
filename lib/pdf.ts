import { jsPDF } from "jspdf";

function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function stripUnsafe(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function generateAuditPdf(input: {
  title: string;
  subtitle?: string;
  lines: string[];
}) {
  const contentLines = [
    "BT",
    "/F1 20 Tf",
    "50 790 Td",
    `(${escapePdfText(stripUnsafe(input.title))}) Tj`,
    "/F1 11 Tf",
    "0 -24 Td",
    `(${escapePdfText(stripUnsafe(input.subtitle ?? "Rapport genere par SENTINELLE"))}) Tj`,
    ...input.lines.flatMap((line) => ["0 -18 Td", `(${escapePdfText(stripUnsafe(line).slice(0, 95))}) Tj`]),
    "ET"
  ].join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${contentLines.length} >>\nstream\n${contentLines}\nendstream`
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${offset.toString().padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new TextEncoder().encode(pdf);
}

export type ControlReportAudience = "CLIENT" | "AGENT" | "DIRECTION" | "INTERNE";

export type ControlReportBar = {
  label: string;
  value: number;
  tone?: "good" | "warning" | "danger" | "critical" | "neutral";
};

export type ControlReportPdfInput = {
  title: string;
  subtitle?: string;
  audience: ControlReportAudience;
  company?: {
    name?: string | null;
    logoUrl?: string | null;
    siret?: string | null;
    cnapsAuthorizationNumber?: string | null;
    address?: string | null;
    phone?: string | null;
    website?: string | null;
    legalNotice?: string | null;
  } | null;
  meta: Array<{ label: string; value: string | number | null | undefined }>;
  summary: string[];
  globalScore: number;
  complianceLevel?: string | null;
  criterionScores: ControlReportBar[];
  qcmScores?: ControlReportBar[];
  nonConformities?: string[];
  prescriptions?: string[];
  footer?: string;
};

function toneForScore(value: number): ControlReportBar["tone"] {
  if (value < 50) return "critical";
  if (value < 70) return "danger";
  if (value < 85) return "warning";
  return "good";
}

type Rgb = [number, number, number];

function toneRgb(tone: ControlReportBar["tone"]): Rgb {
  if (tone === "critical") return [127, 29, 29];
  if (tone === "danger") return [220, 38, 38];
  if (tone === "warning") return [217, 119, 6];
  if (tone === "neutral") return [100, 116, 139];
  return [4, 120, 87];
}

function setFill(doc: jsPDF, rgb: Rgb) {
  doc.setFillColor(rgb[0], rgb[1], rgb[2]);
}

function setText(doc: jsPDF, rgb: Rgb) {
  doc.setTextColor(rgb[0], rgb[1], rgb[2]);
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function cleanPdfText(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function imageFormat(logoUrl: string) {
  const lower = logoUrl.toLowerCase();
  if (lower.startsWith("data:image/jpeg") || lower.startsWith("data:image/jpg") || lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "JPEG";
  if (lower.startsWith("data:image/png") || lower.endsWith(".png")) return "PNG";
  if (lower.startsWith("data:image/webp") || lower.endsWith(".webp")) return "WEBP";
  return "PNG";
}

function companyInitials(name?: string | null) {
  const words = cleanPdfText(name || "SENTINELLE").split(" ").filter(Boolean);
  return words
    .slice(0, 3)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

export function generateControlReportPdf(input: ControlReportPdfInput) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const brand: Rgb = [6, 78, 59];
  const brandSoft: Rgb = [209, 250, 229];
  const ink: Rgb = [17, 24, 39];
  const muted: Rgb = [100, 116, 139];
  const line: Rgb = [216, 222, 231];
  const soft: Rgb = [245, 247, 250];

  const text = (value: unknown, x: number, y: number, size = 9, color: Rgb = ink, style: "normal" | "bold" = "normal", maxWidth?: number) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    setText(doc, color);
    const safe = cleanPdfText(value);
    if (maxWidth) {
      doc.text(doc.splitTextToSize(safe, maxWidth), x, y);
      return;
    }
    doc.text(safe, x, y);
  };

  const roundedPanel = (x: number, y: number, width: number, height: number, fill: Rgb = [255, 255, 255]) => {
    setFill(doc, fill);
    doc.setDrawColor(line[0], line[1], line[2]);
    doc.roundedRect(x, y, width, height, 2, 2, "FD");
  };

  const bar = (x: number, y: number, width: number, label: string, value: number, tone?: ControlReportBar["tone"]) => {
    const normalized = clampPercent(value);
    text(label, x, y, 7.5, [51, 65, 85], "bold", width - 16);
    text(`${normalized} %`, x + width - 12, y, 7.5, ink, "bold");
    setFill(doc, [229, 231, 235]);
    doc.roundedRect(x, y + 3, width, 3.4, 1.7, 1.7, "F");
    setFill(doc, toneRgb(tone ?? toneForScore(normalized)));
    doc.roundedRect(x, y + 3, Math.max(1.5, (width * normalized) / 100), 3.4, 1.7, 1.7, "F");
  };

  const bulletList = (items: string[], x: number, y: number, width: number, maxItems: number) => {
    let currentY = y;
    items.slice(0, maxItems).forEach((item) => {
      const lines = doc.splitTextToSize(`- ${cleanPdfText(item)}`, width);
      text(lines.join("\n"), x, currentY, 7.2, [32, 36, 43], "normal", width);
      currentY += Math.max(5, lines.length * 3.8);
    });
    return currentY;
  };

  setFill(doc, brand);
  doc.rect(0, 0, pageWidth, 39, "F");
  setFill(doc, [255, 255, 255]);
  doc.roundedRect(margin, 8, 23, 23, 2, 2, "F");
  if (input.company?.logoUrl) {
    try {
      doc.addImage(input.company.logoUrl, imageFormat(input.company.logoUrl), margin + 2, 10, 19, 19, undefined, "FAST");
    } catch {
      text(companyInitials(input.company.name), margin + 4, 22, 9, brand, "bold");
    }
  } else {
    text(companyInitials(input.company?.name), margin + 4, 22, 9, brand, "bold");
  }
  text(input.company?.name ?? "SENTINELLE", margin + 29, 15, 13, [255, 255, 255], "bold", 98);
  const companyLines = [
    input.company?.siret ? `SIRET ${input.company.siret}` : null,
    input.company?.cnapsAuthorizationNumber ? `CNAPS ${input.company.cnapsAuthorizationNumber}` : null,
    input.company?.address,
    [input.company?.phone, input.company?.website].filter(Boolean).join(" - ")
  ].filter(Boolean) as string[];
  text(companyLines.join("\n"), margin + 29, 21, 6.8, brandSoft, "normal", 104);
  text("SENTINELLE", pageWidth - margin - 41, 17, 12, [255, 255, 255], "bold");
  text(`Rapport ${input.audience.toLowerCase()}`, pageWidth - margin - 41, 24, 7, brandSoft, "bold");

  text(input.title, margin, 50, 18, ink, "bold", 122);
  text(input.subtitle ?? "Contrôle qualité terrain", margin, 58, 8.5, muted, "normal", 124);

  const metaY = 68;
  const metaRows = Math.ceil(input.meta.length / 2);
  const metaHeight = Math.max(42, 13 + metaRows * 10.5);
  roundedPanel(margin, metaY, pageWidth - margin * 2, metaHeight);
  text("Informations du contrôle", margin + 5, metaY + 8, 9, [4, 120, 87], "bold");
  input.meta.forEach((item, index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = margin + 5 + column * ((pageWidth - margin * 2 - 10) / 2);
    const y = metaY + 18 + row * 10.5;
    text(`${item.label}`, x, y, 6.4, muted, "bold");
    text(item.value ?? "-", x + 29, y, 7.1, ink, "normal", 54);
  });

  const topPanelsY = metaY + metaHeight + 8;
  const leftWidth = 84;
  const rightWidth = pageWidth - margin * 2 - leftWidth - 7;
  roundedPanel(margin, topPanelsY, leftWidth, 35, soft);
  text("Note globale", margin + 5, topPanelsY + 8, 9, [4, 120, 87], "bold");
  setText(doc, toneRgb(toneForScore(input.globalScore)));
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text(`${Math.round(input.globalScore)} %`, margin + 5, topPanelsY + 21);
  text(input.complianceLevel ?? "Niveau non calculé", margin + 42, topPanelsY + 20, 7.4, [32, 36, 43], "bold", 35);
  bar(margin + 5, topPanelsY + 27, leftWidth - 10, "Évaluation globale", input.globalScore);

  roundedPanel(margin + leftWidth + 7, topPanelsY, rightWidth, 35);
  text("Synthèse", margin + leftWidth + 12, topPanelsY + 8, 9, [4, 120, 87], "bold");
  bulletList(input.summary, margin + leftWidth + 12, topPanelsY + 16, rightWidth - 15, 4);

  const chartY = topPanelsY + 46;
  const halfWidth = (pageWidth - margin * 2 - 7) / 2;
  roundedPanel(margin, chartY, halfWidth, 76);
  text("Graphique des notes par critère", margin + 5, chartY + 8, 9, ink, "bold");
  input.criterionScores.slice(0, 6).forEach((item, index) => bar(margin + 5, chartY + 18 + index * 9, halfWidth - 10, item.label, item.value, item.tone));

  roundedPanel(margin + halfWidth + 7, chartY, halfWidth, 76);
  text("QCM et indicateurs", margin + halfWidth + 12, chartY + 8, 9, ink, "bold");
  const qcmBars = input.qcmScores?.length ? input.qcmScores : [{ label: "QCM non realise ou non disponible", value: 0, tone: "neutral" as const }];
  qcmBars.slice(0, 6).forEach((item, index) => bar(margin + halfWidth + 12, chartY + 18 + index * 9, halfWidth - 17, item.label, item.value, item.tone));

  const listY = chartY + 86;
  roundedPanel(margin, listY, halfWidth, 55);
  text("Constats et non-conformités", margin + 5, listY + 8, 9, ink, "bold");
  const nonConformities = input.nonConformities?.length ? input.nonConformities : ["Aucune non-conformite affichee pour ce destinataire."];
  bulletList(nonConformities, margin + 5, listY + 17, halfWidth - 10, 6);

  roundedPanel(margin + halfWidth + 7, listY, halfWidth, 55);
  text("Prescriptions du contrôleur", margin + halfWidth + 12, listY + 8, 9, ink, "bold");
  const prescriptions = input.prescriptions?.length ? input.prescriptions : ["Aucune prescription corrective prioritaire."];
  bulletList(prescriptions, margin + halfWidth + 12, listY + 17, halfWidth - 17, 6);

  const legalY = 274;
  setFill(doc, [248, 250, 252]);
  doc.roundedRect(margin, legalY, pageWidth - margin * 2, 13, 2, 2, "F");
  const legalNotice =
    input.company?.legalNotice ??
    input.footer ??
    "Rapport généré automatiquement par SENTINELLE. Les versions client excluent sanctions, commentaires RH et données internes.";
  text(legalNotice, margin + 4, legalY + 5, 6.4, [53, 57, 69], "normal", pageWidth - margin * 2 - 8);
  text(input.footer ?? "Rapport généré automatiquement par SENTINELLE.", margin, 294, 6, muted, "normal", pageWidth - margin * 2);

  return new Uint8Array(doc.output("arraybuffer"));
}
