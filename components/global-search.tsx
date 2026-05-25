"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { demoSearch } from "@/lib/demo-data";

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const results = useMemo(() => (query.trim().length >= 2 ? demoSearch(query).slice(0, 6) : []), [query]);

  return (
    <div className="relative flex-1">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="field h-10 pl-9"
        placeholder="Recherche globale"
        aria-label="Recherche globale"
      />
      {results.length ? (
        <div className="surface absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-lg">
          {results.map((result) => (
            <Link key={`${result.type}-${result.title}`} href={result.href} onClick={() => setQuery("")} className="block border-b border-ink-100 px-4 py-3 last:border-0 hover:bg-ink-50 dark:border-white/10 dark:hover:bg-white/10">
              <p className="text-sm font-semibold text-ink-950 dark:text-white">{result.title}</p>
              <p className="mt-1 text-xs text-ink-500 dark:text-ink-300">
                {result.type} · {result.detail}
              </p>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
