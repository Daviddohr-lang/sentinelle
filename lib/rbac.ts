import type { Role } from "@prisma/client";

export type Permission =
  | "platform.manage"
  | "company.manage"
  | "users.manage"
  | "controls.read"
  | "controls.write"
  | "controls.validate"
  | "nonconformities.read"
  | "nonconformities.write"
  | "nonconformities.validate"
  | "documents.read"
  | "documents.write"
  | "qcm.read"
  | "qcm.write"
  | "reports.full"
  | "reports.client"
  | "planning.manage"
  | "stats.read"
  | "search.global"
  | "ai.use";

const permissionsByRole: Record<Role, Permission[]> = {
  SUPER_ADMIN: [
    "platform.manage",
    "company.manage",
    "users.manage",
    "controls.read",
    "controls.write",
    "controls.validate",
    "nonconformities.read",
    "nonconformities.write",
    "nonconformities.validate",
    "documents.read",
    "documents.write",
    "qcm.read",
    "qcm.write",
    "reports.full",
    "reports.client",
    "planning.manage",
    "stats.read",
    "search.global",
    "ai.use"
  ],
  COMPANY_ADMIN: [
    "company.manage",
    "users.manage",
    "controls.read",
    "controls.write",
    "controls.validate",
    "nonconformities.read",
    "nonconformities.write",
    "nonconformities.validate",
    "documents.read",
    "documents.write",
    "qcm.read",
    "qcm.write",
    "reports.full",
    "reports.client",
    "planning.manage",
    "stats.read",
    "search.global",
    "ai.use"
  ],
  QUALITY_CONTROLLER: [
    "controls.read",
    "controls.write",
    "nonconformities.read",
    "nonconformities.write",
    "documents.read",
    "documents.write",
    "qcm.read",
    "qcm.write",
    "reports.full",
    "reports.client",
    "planning.manage",
    "stats.read",
    "search.global",
    "ai.use"
  ],
  AGENT: ["controls.read", "documents.read", "qcm.read", "stats.read"],
  BUSINESS_OWNER: [
    "controls.read",
    "nonconformities.read",
    "documents.read",
    "reports.full",
    "reports.client",
    "planning.manage",
    "stats.read",
    "search.global"
  ],
  CLIENT: ["controls.read", "documents.read", "reports.client", "planning.manage", "stats.read"]
};

export function hasPermission(role: Role, permission: Permission) {
  return permissionsByRole[role]?.includes(permission) ?? false;
}

export function assertPermission(role: Role, permission: Permission) {
  if (!hasPermission(role, permission)) {
    throw new Error("Permission insuffisante");
  }
}

export function canAccessCompany(role: Role, userCompanyId: string | null | undefined, targetCompanyId: string | null | undefined) {
  if (role === "SUPER_ADMIN") return true;
  return Boolean(userCompanyId && targetCompanyId && userCompanyId === targetCompanyId);
}

export function roleHome(role: Role) {
  switch (role) {
    case "AGENT":
      return "/qcm";
    case "CLIENT":
      return "/rapports";
    case "QUALITY_CONTROLLER":
      return "/controles";
    case "BUSINESS_OWNER":
      return "/statistiques";
    default:
      return "/";
  }
}
