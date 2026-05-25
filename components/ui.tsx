import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import Link from "next/link";
import { cn, severityClass, statusClass } from "@/lib/utils";

export function PageHeader({
  title,
  subtitle,
  action
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="label">SENTINELLE</p>
        <h1 className="mt-2 text-2xl font-semibold text-ink-950 dark:text-white">{title}</h1>
        {subtitle ? <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-600 dark:text-ink-300">{subtitle}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  );
}

export function StatCard({ label, value, trend, icon: Icon }: { label: string; value: string | number; trend?: string; icon: LucideIcon }) {
  return (
    <div className="surface rounded-lg p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-ink-500 dark:text-ink-300">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-ink-950 dark:text-white">{value}</p>
        </div>
        <span className="rounded-lg bg-sentinel-50 p-2 text-sentinel-700 dark:bg-sentinel-500/15 dark:text-sentinel-100">
          <Icon className="h-5 w-5" />
        </span>
      </div>
      {trend ? <p className="mt-3 text-xs font-medium text-sentinel-700 dark:text-sentinel-200">{trend}</p> : null}
    </div>
  );
}

export function Badge({ children, tone = "status" }: { children: ReactNode; tone?: "status" | "severity" | "neutral" }) {
  const value = String(children);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
        tone === "severity" ? severityClass(value) : tone === "status" ? statusClass(value) : "bg-ink-100 text-ink-700 ring-ink-200 dark:bg-white/10 dark:text-ink-100"
      )}
    >
      {value.replaceAll("_", " ").toLowerCase()}
    </span>
  );
}

export function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-ink-950 dark:text-white">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function EmptyState({ title, description, href, actionLabel }: { title: string; description: string; href?: string; actionLabel?: string }) {
  return (
    <div className="surface rounded-lg p-8 text-center">
      <h3 className="text-base font-semibold text-ink-950 dark:text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-500 dark:text-ink-300">{description}</p>
      {href && actionLabel ? (
        <Link href={href} className="button-primary mt-5">
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

export function ProgressBar({ value, tone = "sentinel" }: { value: number; tone?: "sentinel" | "amber" | "red" }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100 dark:bg-white/10">
      <div
        className={cn("h-full rounded-full", tone === "red" ? "bg-red-600" : tone === "amber" ? "bg-amber-500" : "bg-sentinel-600")}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

export function DataTable({
  columns,
  rows
}: {
  columns: string[];
  rows: Array<Array<ReactNode>>;
}) {
  return (
    <div className="surface overflow-hidden rounded-lg">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-ink-200 text-sm dark:divide-white/10">
          <thead className="bg-ink-50 text-left text-xs font-semibold uppercase text-ink-500 dark:bg-white/5 dark:text-ink-300">
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-4 py-3">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100 dark:divide-white/10">
            {rows.map((row, index) => (
              <tr key={index} className="align-top">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-4 py-3 text-ink-700 dark:text-ink-200">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
