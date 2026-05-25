import type { NextRequest } from "next/server";
import { apiOk, requireApiUser, scopedCompanyWhere } from "@/lib/api";
import { demoSearch } from "@/lib/demo-data";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const context = await requireApiUser(request, "search.global");
  if ("status" in context) return context;

  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!query) return apiOk({ results: [] });

  try {
    const scope = scopedCompanyWhere(context.user);
    const [agents, clients, sites, controls, documents, nonConformities, qcms] = await Promise.all([
      prisma.agent.findMany({
        where: { ...scope, OR: [{ firstName: { contains: query, mode: "insensitive" } }, { lastName: { contains: query, mode: "insensitive" } }, { matricule: { contains: query, mode: "insensitive" } }] },
        take: 8
      }),
      prisma.client.findMany({ where: { ...scope, name: { contains: query, mode: "insensitive" } }, take: 8 }),
      prisma.site.findMany({ where: { ...scope, name: { contains: query, mode: "insensitive" } }, take: 8 }),
      prisma.control.findMany({ where: scope, take: 8, include: { agent: true, site: true } }),
      prisma.document.findMany({ where: { ...scope, title: { contains: query, mode: "insensitive" } }, take: 8 }),
      prisma.nonConformity.findMany({ where: { ...scope, title: { contains: query, mode: "insensitive" } }, take: 8 }),
      prisma.qcm.findMany({ where: { ...scope, title: { contains: query, mode: "insensitive" } }, take: 8 })
    ]);

    return apiOk({
      results: [
        ...agents.map((agent) => ({ type: "Agent", title: `${agent.firstName} ${agent.lastName}`, detail: agent.matricule, href: "/agents" })),
        ...clients.map((client) => ({ type: "Client", title: client.name, detail: client.reference, href: "/clients-sites" })),
        ...sites.map((site) => ({ type: "Site", title: site.name, detail: site.address, href: "/clients-sites" })),
        ...controls.map((control) => ({ type: "Controle", title: control.site.name, detail: `${control.agent.firstName} ${control.agent.lastName}`, href: "/controles" })),
        ...documents.map((document) => ({ type: "Document", title: document.title, detail: document.status, href: "/documents" })),
        ...nonConformities.map((nc) => ({ type: "Non-conformite", title: nc.title, detail: nc.status, href: "/non-conformites" })),
        ...qcms.map((qcm) => ({ type: "QCM", title: qcm.title, detail: qcm.type, href: "/qcm" }))
      ]
    });
  } catch {
    return apiOk({ results: demoSearch(query) });
  }
}
