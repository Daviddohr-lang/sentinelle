import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { PreventionGate } from "@/components/prevention-gate";
import { getSessionFromCookies } from "@/lib/auth";
import { getShellCompanyProfile } from "@/lib/company-profile";

export default async function AuthenticatedLayout({ children }: { children: ReactNode }) {
  const user = await getSessionFromCookies();
  if (!user) redirect("/login");
  const companyProfile = await getShellCompanyProfile(user);

  return (
    <AppShell user={user} companyProfile={companyProfile}>
      <PreventionGate enabled={user.role === "AGENT"} />
      {children}
    </AppShell>
  );
}
