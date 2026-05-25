import Link from "next/link";
import { Search } from "lucide-react";
import { PageHeader, Section } from "@/components/ui";
import { demoSearch } from "@/lib/demo-data";

export default async function SearchPage({ searchParams }: { searchParams?: Promise<{ q?: string }> }) {
  const params = await searchParams;
  const query = params?.q ?? "";
  const results = query ? demoSearch(query) : demoSearch("glisy").slice(0, 8);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Recherche globale"
        subtitle="Recherche transversale agents, clients, sites, contrôles, rapports, documents, non-conformités, QCM et notifications."
      />

      <form className="surface flex gap-3 rounded-lg p-4">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input name="q" defaultValue={query} className="field pl-9" placeholder="Rechercher dans SENTINELLE" />
        </div>
        <button className="button-primary">Rechercher</button>
      </form>

      <Section title="Résultats">
        <div className="grid gap-3">
          {results.map((result) => (
            <Link key={`${result.type}-${result.title}`} href={result.href} className="surface rounded-lg p-4 hover:border-sentinel-300 dark:hover:border-sentinel-400/40">
              <p className="text-sm font-semibold text-ink-950 dark:text-white">{result.title}</p>
              <p className="mt-1 text-sm text-ink-500 dark:text-ink-300">
                {result.type} · {result.detail}
              </p>
            </Link>
          ))}
        </div>
      </Section>
    </div>
  );
}
