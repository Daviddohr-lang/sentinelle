import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPercent(value: number) {
  return `${Math.round(value)} %`;
}

export function initials(firstName?: string, lastName?: string) {
  return `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase() || "SE";
}

export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function daysUntil(date?: string | Date | null) {
  if (!date) return null;
  const target = typeof date === "string" ? new Date(date) : date;
  const diff = target.getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function severityClass(severity: string) {
  switch (severity) {
    case "CRITIQUE":
      return "bg-red-950 text-red-50 ring-red-700/40 dark:bg-red-500/15 dark:text-red-100";
    case "MAJEURE":
      return "bg-red-100 text-red-800 ring-red-200 dark:bg-red-500/15 dark:text-red-100";
    case "MINEURE":
      return "bg-amber-100 text-amber-800 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-100";
    default:
      return "bg-ink-100 text-ink-700 ring-ink-200 dark:bg-white/10 dark:text-ink-100";
  }
}

export function statusClass(status: string) {
  const normalized = status.toLowerCase();
  if (normalized.includes("clot") || normalized.includes("valide") || normalized.includes("corrige")) {
    return "bg-emerald-100 text-emerald-800 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-100";
  }
  if (normalized.includes("refus") || normalized.includes("expire") || normalized.includes("critique")) {
    return "bg-red-100 text-red-800 ring-red-200 dark:bg-red-500/15 dark:text-red-100";
  }
  if (normalized.includes("attente") || normalized.includes("cours") || normalized.includes("demande")) {
    return "bg-amber-100 text-amber-800 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-100";
  }
  return "bg-ink-100 text-ink-700 ring-ink-200 dark:bg-white/10 dark:text-ink-100";
}
