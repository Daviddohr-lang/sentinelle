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
