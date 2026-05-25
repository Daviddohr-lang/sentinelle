import type { NextRequest } from "next/server";
import { requireApiUser } from "@/lib/api";
import { demoControls, demoNonConformities } from "@/lib/demo-data";

function escapeCsv(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(request: NextRequest) {
  const context = await requireApiUser(request, "stats.read");
  if ("status" in context) return context;

  const type = request.nextUrl.searchParams.get("type") ?? "controles";
  const rows: Array<Record<string, unknown>> =
    type === "non-conformites"
      ? demoNonConformities.map((nc) => ({
          titre: nc.title,
          gravite: nc.severity,
          statut: nc.status,
          agent: nc.agentName,
          site: nc.siteName,
          echeance: nc.dueAt
        }))
      : demoControls.map((control) => ({
          date: control.startedAt,
          type: control.type,
          statut: control.status,
          agent: control.agentName,
          client: control.clientName,
          site: control.siteName,
          note: control.globalScore
        }));

  const headers = Object.keys(rows[0] ?? { message: "Aucune donnee" });
  const csv = [headers.join(","), ...rows.map((row) => headers.map((key) => escapeCsv(row[key as keyof typeof row])).join(","))].join("\n");

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="sentinelle-${type}.csv"`
    }
  });
}
