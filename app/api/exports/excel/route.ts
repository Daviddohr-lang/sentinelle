import type { NextRequest } from "next/server";
import * as XLSX from "xlsx";
import { requireApiUser } from "@/lib/api";
import { demoControls, demoDocuments, demoNonConformities, demoQcmSessions } from "@/lib/demo-data";

export async function GET(request: NextRequest) {
  const context = await requireApiUser(request, "stats.read");
  if ("status" in context) return context;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      demoControls.map((control) => ({
        date: control.startedAt,
        type: control.type,
        statut: control.status,
        agent: control.agentName,
        client: control.clientName,
        site: control.siteName,
        note: control.globalScore
      }))
    ),
    "Controles"
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(demoNonConformities),
    "Non-conformites"
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(demoDocuments),
    "Documents"
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(demoQcmSessions),
    "QCM"
  );

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
  const body = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
  return new Response(body, {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": 'attachment; filename="sentinelle-export.xlsx"'
    }
  });
}
