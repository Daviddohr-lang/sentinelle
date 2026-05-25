import { describe, expect, it } from "vitest";
import { canAccessCompany, hasPermission } from "@/lib/rbac";

describe("RBAC SENTINELLE", () => {
  it("autorise le super administrateur a travers les entreprises", () => {
    expect(canAccessCompany("SUPER_ADMIN", null, "cmp_2")).toBe(true);
    expect(hasPermission("SUPER_ADMIN", "platform.manage")).toBe(true);
  });

  it("bloque l'acces inter-entreprise pour un administrateur entreprise", () => {
    expect(canAccessCompany("COMPANY_ADMIN", "cmp_1", "cmp_2")).toBe(false);
    expect(canAccessCompany("COMPANY_ADMIN", "cmp_1", "cmp_1")).toBe(true);
  });

  it("limite le client aux rapports simplifies", () => {
    expect(hasPermission("CLIENT", "reports.client")).toBe(true);
    expect(hasPermission("CLIENT", "reports.full")).toBe(false);
  });
});
