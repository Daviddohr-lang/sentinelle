"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Building2, ExternalLink, LogOut, Menu, Shield, X } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import type { SessionUser } from "@/lib/auth";
import type { ShellCompanyProfile } from "@/lib/company-profile";
import { APP_NAME, navItems, roleLabels } from "@/lib/constants";
import { cn, initials } from "@/lib/utils";
import { OfflineBanner } from "@/components/offline-banner";
import { ThemeToggle } from "@/components/theme-toggle";
import { GlobalSearch } from "@/components/global-search";

export function AppShell({ user, companyProfile, children }: { user: SessionUser; companyProfile: ShellCompanyProfile; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const visibleNavItems = navItems.filter((item) => {
    if (user.role === "SUPER_ADMIN" || user.role === "COMPANY_ADMIN") return true;
    if (user.role === "QUALITY_CONTROLLER") return !["/admin", "/imports"].includes(item.href);
    if (user.role === "BUSINESS_OWNER") return !["/admin", "/imports", "/qcm", "/criteres-controle"].includes(item.href);
    if (user.role === "AGENT") return ["/", "/controles", "/qcm", "/documents", "/recherche", "/parametres", "/prevention"].includes(item.href);
    if (user.role === "CLIENT") return ["/", "/planning", "/rapports", "/statistiques", "/documents", "/recherche", "/parametres"].includes(item.href);
    return false;
  });

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const sidebar = (
    <aside className="flex h-full w-72 flex-col border-r border-ink-200 bg-white dark:border-white/10 dark:bg-ink-950">
      <div className="border-b border-ink-200 p-4 dark:border-white/10">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-ink-950 text-white dark:bg-sentinel-500">
            <Shield className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-bold tracking-normal text-ink-950 dark:text-white">{APP_NAME}</p>
            <p className="text-xs text-ink-500 dark:text-ink-300">Qualite & conformite</p>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-ink-200 bg-ink-50 p-3 dark:border-white/10 dark:bg-white/5">
          <div className="flex items-start gap-3">
            {companyProfile.logoUrl ? (
              <span
                className="h-12 w-12 shrink-0 rounded-lg bg-white bg-cover bg-center ring-1 ring-ink-200 dark:bg-ink-950 dark:ring-white/10"
                style={{ backgroundImage: `url(${companyProfile.logoUrl})` }}
                role="img"
                aria-label={`Logo ${companyProfile.name}`}
              />
            ) : (
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white text-sentinel-700 ring-1 ring-ink-200 dark:bg-ink-950 dark:text-sentinel-100 dark:ring-white/10">
                <Building2 className="h-5 w-5" />
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-ink-950 dark:text-white">{companyProfile.name}</p>
              <p className="mt-1 text-[11px] leading-4 text-ink-500 dark:text-ink-300">
                SIRET {companyProfile.siret ?? "non renseigne"}
                <br />
                CNAPS {companyProfile.cnapsAuthorizationNumber ?? "non renseigne"}
              </p>
            </div>
          </div>

          <div className="mt-3 space-y-1 text-[11px] leading-4 text-ink-600 dark:text-ink-300">
            {companyProfile.address ? <p>{companyProfile.address}</p> : null}
            {companyProfile.phone ? <p>{companyProfile.phone}</p> : null}
            {companyProfile.website ? (
              <a href={companyProfile.website} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-1 truncate font-semibold text-sentinel-800 dark:text-sentinel-100">
                <span className="truncate">{companyProfile.website.replace(/^https?:\/\//, "")}</span>
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            ) : null}
          </div>

          <p className="mt-3 border-t border-ink-200 pt-2 text-[10px] leading-4 text-ink-500 dark:border-white/10 dark:text-ink-400">{companyProfile.legalNotice}</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const active = item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={`${item.href}-${item.label}`}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-ink-600 transition hover:bg-ink-100 hover:text-ink-950 dark:text-ink-300 dark:hover:bg-white/10 dark:hover:text-white",
                active && "bg-sentinel-50 text-sentinel-800 dark:bg-sentinel-500/15 dark:text-sentinel-100"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-ink-200 p-4 dark:border-white/10">
        <div className="flex items-center gap-3 rounded-lg bg-ink-50 p-3 dark:bg-white/5">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-sentinel-700 text-sm font-semibold text-white">
            {initials(user.firstName, user.lastName)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink-950 dark:text-white">
              {user.firstName} {user.lastName}
            </p>
            <p className="truncate text-xs text-ink-500 dark:text-ink-300">{roleLabels[user.role]}</p>
          </div>
          <button type="button" onClick={logout} className="rounded-lg p-2 text-ink-500 hover:bg-white hover:text-red-700 dark:hover:bg-white/10" aria-label="Se deconnecter">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-ink-50 dark:bg-ink-950">
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex">{sidebar}</div>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" className="absolute inset-0 bg-ink-950/50" aria-label="Fermer le menu" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0">{sidebar}</div>
        </div>
      ) : null}
      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-ink-200 bg-white/90 px-4 backdrop-blur dark:border-white/10 dark:bg-ink-950/90 sm:px-6">
          <button type="button" className="button-secondary h-10 w-10 p-0 lg:hidden" onClick={() => setOpen((value) => !value)} aria-label="Ouvrir le menu">
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
          <GlobalSearch />
          <ThemeToggle />
        </header>
        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
      <OfflineBanner />
    </div>
  );
}
