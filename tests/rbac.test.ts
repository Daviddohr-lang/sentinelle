import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { canAccessCompany, hasPermission } from "../lib/rbac.ts";

describe("RBAC SENTINELLE", () => {
  it("autorise le super administrateur a travers les entreprises", () => {
    assert.equal(canAccessCompany("SUPER_ADMIN", null, "cmp_2"), true);
    assert.equal(hasPermission("SUPER_ADMIN", "platform.manage"), true);
  });

  it("bloque l'acces inter-entreprise pour un administrateur entreprise", () => {
    assert.equal(canAccessCompany("COMPANY_ADMIN", "cmp_1", "cmp_2"), false);
    assert.equal(canAccessCompany("COMPANY_ADMIN", "cmp_1", "cmp_1"), true);
  });

  it("limite le client aux rapports simplifies", () => {
    assert.equal(hasPermission("CLIENT", "reports.client"), true);
    assert.equal(hasPermission("CLIENT", "reports.full"), false);
  });
});
