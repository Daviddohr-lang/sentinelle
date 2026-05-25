import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Prisma } from "@prisma/client";
import type { SessionUser } from "@/lib/auth";
import { demoAgents, demoAssignments, demoClients, demoSites } from "@/lib/demo-data";

type JsonRecord = Record<string, unknown>;

export type LocalClient = {
  id: string;
  companyId: string;
  name: string;
  reference: string;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  address?: string | null;
  settings?: JsonRecord | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
};

export type LocalSite = {
  id: string;
  companyId: string;
  clientId: string;
  name: string;
  reference: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  timezone: string;
  riskLevel?: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
  client?: LocalClient;
};

export type LocalAgent = {
  id: string;
  companyId: string;
  userId?: string | null;
  matricule: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  professionalCardNumber?: string | null;
  professionalCardExpiresAt?: string | null;
  sstExpiresAt?: string | null;
  ssiapExpiresAt?: string | null;
  qualityScore: number;
  active: boolean;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
};

export type LocalAssignment = {
  id: string;
  companyId: string;
  agentId: string;
  clientId: string;
  siteId: string;
  jobTitle: string;
  customJobTitle?: string | null;
  startsAt: string;
  endsAt?: string | null;
  status: "ACTIVE" | "PLANNED" | "ENDED" | "ARCHIVED";
  history?: JsonRecord | null;
  createdAt: string;
  updatedAt: string;
  agent?: LocalAgent;
  client?: LocalClient;
  site?: LocalSite;
};

export type LocalStore = {
  clients: LocalClient[];
  sites: LocalSite[];
  agents: LocalAgent[];
  assignments: LocalAssignment[];
};

export class LocalStoreError extends Error {
  constructor(
    message: string,
    public status = 400
  ) {
    super(message);
  }
}

const localStoreDirectory = process.env.LOCAL_DATASTORE_PATH || path.join(process.cwd(), ".sentinelle");
const localStoreFile = path.join(localStoreDirectory, "local-data.json");

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeOptional(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizeDate(value?: string | null) {
  const normalized = normalizeOptional(value);
  return normalized ? new Date(normalized).toISOString() : null;
}

function initialStore(): LocalStore {
  const createdAt = nowIso();
  const clients = demoClients.map((client) => ({
    ...client,
    contactName: client.contactName ?? null,
    contactEmail: client.contactEmail ?? null,
    contactPhone: null,
    address: client.address ?? null,
    settings: null,
    active: true,
    createdAt,
    updatedAt: createdAt,
    archivedAt: null
  }));
  const sites = demoSites.map((site) => ({
    ...site,
    latitude: null,
    longitude: null,
    timezone: "Europe/Paris",
    riskLevel: site.riskLevel ?? null,
    active: true,
    createdAt,
    updatedAt: createdAt,
    archivedAt: null
  }));
  const agents = demoAgents.map((agent) => ({
    ...agent,
    userId: agent.userId ?? null,
    email: agent.email ?? null,
    phone: agent.phone ?? null,
    professionalCardNumber: agent.professionalCardNumber ?? null,
    professionalCardExpiresAt: normalizeDate(agent.professionalCardExpiresAt),
    sstExpiresAt: normalizeDate(agent.sstExpiresAt),
    ssiapExpiresAt: normalizeDate(agent.ssiapExpiresAt),
    qualityScore: agent.qualityScore ?? 0,
    active: true,
    notes: null,
    createdAt,
    updatedAt: createdAt,
    archivedAt: null
  }));
  const assignments = demoAssignments.map((assignment) => {
    const client = clients.find((item) => item.id === assignment.clientId);
    return {
      ...assignment,
      companyId: client?.companyId ?? clients[0]?.companyId ?? "cmp_ops_nord",
      customJobTitle: null,
      startsAt: normalizeDate(assignment.startsAt) ?? createdAt,
      endsAt: null,
      status: "ACTIVE" as const,
      history: null,
      createdAt,
      updatedAt: createdAt
    };
  });

  return { clients, sites, agents, assignments };
}

function completeStore(partial: Partial<LocalStore>): LocalStore {
  const base = initialStore();
  return {
    clients: partial.clients ?? base.clients,
    sites: partial.sites ?? base.sites,
    agents: partial.agents ?? base.agents,
    assignments: partial.assignments ?? base.assignments
  };
}

export function localPersistenceEnabled() {
  return process.env.LOCAL_DATASTORE_DISABLED !== "true" && (process.env.NODE_ENV !== "production" || process.env.DEMO_MODE === "true" || process.env.LOCAL_DATASTORE_ENABLED === "true");
}

function shouldFallbackToLocalStore(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return ["P1000", "P1001", "P1002", "P1003", "P1017"].includes(error.code);
  }

  const message = error instanceof Error ? error.message : String(error);
  return [
    "Can't reach database server",
    "could not connect",
    "Prisma Client could not locate",
    "Unable to require",
    "Query Engine",
    "code signature",
    "was not initialized"
  ].some((item) => message.includes(item));
}

export async function withDatabaseFallback<TDatabase, TLocal>(operation: () => Promise<TDatabase>, fallback: () => Promise<TLocal>, label: string): Promise<TDatabase | TLocal> {
  try {
    return await operation();
  } catch (error) {
    if (!localPersistenceEnabled() || !shouldFallbackToLocalStore(error)) {
      throw error;
    }
    console.warn(`[SENTINELLE] ${label}: bascule sur la persistance locale de developpement.`);
    return fallback();
  }
}

export async function readLocalStore() {
  if (!localPersistenceEnabled()) {
    throw new LocalStoreError("Persistance locale desactivee", 503);
  }

  await mkdir(localStoreDirectory, { recursive: true });

  try {
    const raw = await readFile(localStoreFile, "utf8");
    return completeStore(JSON.parse(raw) as Partial<LocalStore>);
  } catch {
    const store = initialStore();
    await writeLocalStore(store);
    return store;
  }
}

export async function writeLocalStore(store: LocalStore) {
  await mkdir(localStoreDirectory, { recursive: true });
  await writeFile(localStoreFile, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

export function scopedLocalRecords<T extends { companyId: string }>(records: T[], user: SessionUser) {
  return user.role === "SUPER_ADMIN" ? records : records.filter((record) => record.companyId === user.companyId);
}

export function withRelations(store: LocalStore) {
  const clients = store.clients.filter((client) => client.active);
  const sites = store.sites
    .filter((site) => site.active)
    .map((site) => ({
      ...site,
      client: clients.find((client) => client.id === site.clientId)
    }));
  const agents = store.agents.filter((agent) => agent.active);
  const assignments = store.assignments
    .filter((assignment) => assignment.status !== "ARCHIVED")
    .map((assignment) => ({
      ...assignment,
      agent: agents.find((agent) => agent.id === assignment.agentId),
      client: clients.find((client) => client.id === assignment.clientId),
      site: sites.find((site) => site.id === assignment.siteId)
    }));

  return { clients, sites, agents, assignments };
}

export async function listLocalClients(user: SessionUser) {
  const store = await readLocalStore();
  return scopedLocalRecords(withRelations(store).clients, user).sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

export async function createLocalClient(user: SessionUser, input: Omit<LocalClient, "id" | "companyId" | "active" | "createdAt" | "updatedAt" | "archivedAt">, companyId?: string | null) {
  const store = await readLocalStore();
  const resolvedCompanyId = companyId ?? user.companyId;
  if (!resolvedCompanyId) throw new LocalStoreError("Entreprise requise", 400);
  if (user.role !== "SUPER_ADMIN" && user.companyId !== resolvedCompanyId) throw new LocalStoreError("Acces entreprise interdit", 403);
  if (store.clients.some((client) => client.companyId === resolvedCompanyId && client.reference === input.reference && client.active)) {
    throw new LocalStoreError("Reference client deja utilisee", 409);
  }

  const timestamp = nowIso();
  const client: LocalClient = {
    id: createId("cli"),
    companyId: resolvedCompanyId,
    name: input.name.trim(),
    reference: input.reference.trim(),
    contactName: normalizeOptional(input.contactName),
    contactEmail: normalizeOptional(input.contactEmail),
    contactPhone: normalizeOptional(input.contactPhone),
    address: normalizeOptional(input.address),
    settings: input.settings ?? null,
    active: true,
    createdAt: timestamp,
    updatedAt: timestamp,
    archivedAt: null
  };

  store.clients.push(client);
  await writeLocalStore(store);
  return client;
}

export async function updateLocalClient(user: SessionUser, id: string, input: Partial<LocalClient>) {
  const store = await readLocalStore();
  const index = store.clients.findIndex((client) => client.id === id);
  if (index === -1) throw new LocalStoreError("Client introuvable", 404);
  const current = store.clients[index];
  if (user.role !== "SUPER_ADMIN" && current.companyId !== user.companyId) throw new LocalStoreError("Acces entreprise interdit", 403);
  const updated: LocalClient = {
    ...current,
    ...input,
    name: input.name?.trim() ?? current.name,
    reference: input.reference?.trim() ?? current.reference,
    contactName: input.contactName !== undefined ? normalizeOptional(input.contactName) : current.contactName,
    contactEmail: input.contactEmail !== undefined ? normalizeOptional(input.contactEmail) : current.contactEmail,
    contactPhone: input.contactPhone !== undefined ? normalizeOptional(input.contactPhone) : current.contactPhone,
    address: input.address !== undefined ? normalizeOptional(input.address) : current.address,
    updatedAt: nowIso()
  };
  store.clients[index] = updated;
  await writeLocalStore(store);
  return updated;
}

export async function archiveLocalClient(user: SessionUser, id: string) {
  return updateLocalClient(user, id, { active: false, archivedAt: nowIso() });
}

export async function listLocalSites(user: SessionUser) {
  const store = await readLocalStore();
  return scopedLocalRecords(withRelations(store).sites, user).sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

export async function createLocalSite(user: SessionUser, input: Omit<LocalSite, "id" | "companyId" | "timezone" | "active" | "createdAt" | "updatedAt" | "archivedAt" | "client">) {
  const store = await readLocalStore();
  const client = store.clients.find((item) => item.id === input.clientId && item.active);
  if (!client) throw new LocalStoreError("Client introuvable", 404);
  if (user.role !== "SUPER_ADMIN" && client.companyId !== user.companyId) throw new LocalStoreError("Acces entreprise interdit", 403);
  if (store.sites.some((site) => site.companyId === client.companyId && site.reference === input.reference && site.active)) {
    throw new LocalStoreError("Reference site deja utilisee", 409);
  }

  const timestamp = nowIso();
  const site: LocalSite = {
    id: createId("site"),
    companyId: client.companyId,
    clientId: client.id,
    name: input.name.trim(),
    reference: input.reference.trim(),
    address: input.address.trim(),
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    timezone: "Europe/Paris",
    riskLevel: normalizeOptional(input.riskLevel),
    active: true,
    createdAt: timestamp,
    updatedAt: timestamp,
    archivedAt: null
  };

  store.sites.push(site);
  await writeLocalStore(store);
  return { ...site, client };
}

export async function updateLocalSite(user: SessionUser, id: string, input: Partial<LocalSite>) {
  const store = await readLocalStore();
  const index = store.sites.findIndex((site) => site.id === id);
  if (index === -1) throw new LocalStoreError("Site introuvable", 404);
  const current = store.sites[index];
  if (user.role !== "SUPER_ADMIN" && current.companyId !== user.companyId) throw new LocalStoreError("Acces entreprise interdit", 403);

  let client = store.clients.find((item) => item.id === current.clientId);
  if (input.clientId && input.clientId !== current.clientId) {
    client = store.clients.find((item) => item.id === input.clientId && item.active);
    if (!client) throw new LocalStoreError("Client introuvable", 404);
    if (client.companyId !== current.companyId) throw new LocalStoreError("Client hors entreprise", 403);
  }

  const updated: LocalSite = {
    ...current,
    ...input,
    clientId: input.clientId ?? current.clientId,
    name: input.name?.trim() ?? current.name,
    reference: input.reference?.trim() ?? current.reference,
    address: input.address?.trim() ?? current.address,
    latitude: input.latitude ?? current.latitude,
    longitude: input.longitude ?? current.longitude,
    riskLevel: input.riskLevel !== undefined ? normalizeOptional(input.riskLevel) : current.riskLevel,
    updatedAt: nowIso()
  };
  store.sites[index] = updated;
  await writeLocalStore(store);
  return { ...updated, client };
}

export async function archiveLocalSite(user: SessionUser, id: string) {
  return updateLocalSite(user, id, { active: false, archivedAt: nowIso() });
}

export async function listLocalAgents(user: SessionUser) {
  const store = await readLocalStore();
  return scopedLocalRecords(withRelations(store).agents, user).sort((a, b) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, "fr"));
}

export async function createLocalAgent(user: SessionUser, input: Omit<LocalAgent, "id" | "companyId" | "qualityScore" | "active" | "createdAt" | "updatedAt" | "archivedAt">) {
  const store = await readLocalStore();
  if (!user.companyId) throw new LocalStoreError("Entreprise requise", 400);
  if (store.agents.some((agent) => agent.companyId === user.companyId && agent.matricule === input.matricule && agent.active)) {
    throw new LocalStoreError("Matricule deja utilise", 409);
  }

  const timestamp = nowIso();
  const agent: LocalAgent = {
    id: createId("agt"),
    companyId: user.companyId,
    userId: input.userId ?? null,
    matricule: input.matricule.trim(),
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    email: normalizeOptional(input.email),
    phone: normalizeOptional(input.phone),
    professionalCardNumber: normalizeOptional(input.professionalCardNumber),
    professionalCardExpiresAt: normalizeDate(input.professionalCardExpiresAt),
    sstExpiresAt: normalizeDate(input.sstExpiresAt),
    ssiapExpiresAt: normalizeDate(input.ssiapExpiresAt),
    qualityScore: 0,
    active: true,
    notes: normalizeOptional(input.notes),
    createdAt: timestamp,
    updatedAt: timestamp,
    archivedAt: null
  };

  store.agents.push(agent);
  await writeLocalStore(store);
  return agent;
}

export async function updateLocalAgent(user: SessionUser, id: string, input: Partial<LocalAgent>) {
  const store = await readLocalStore();
  const index = store.agents.findIndex((agent) => agent.id === id);
  if (index === -1) throw new LocalStoreError("Agent introuvable", 404);
  const current = store.agents[index];
  if (user.role !== "SUPER_ADMIN" && current.companyId !== user.companyId) throw new LocalStoreError("Acces entreprise interdit", 403);

  const updated: LocalAgent = {
    ...current,
    ...input,
    matricule: input.matricule?.trim() ?? current.matricule,
    firstName: input.firstName?.trim() ?? current.firstName,
    lastName: input.lastName?.trim() ?? current.lastName,
    email: input.email !== undefined ? normalizeOptional(input.email) : current.email,
    phone: input.phone !== undefined ? normalizeOptional(input.phone) : current.phone,
    professionalCardNumber: input.professionalCardNumber !== undefined ? normalizeOptional(input.professionalCardNumber) : current.professionalCardNumber,
    professionalCardExpiresAt: input.professionalCardExpiresAt !== undefined ? normalizeDate(input.professionalCardExpiresAt) : current.professionalCardExpiresAt,
    sstExpiresAt: input.sstExpiresAt !== undefined ? normalizeDate(input.sstExpiresAt) : current.sstExpiresAt,
    ssiapExpiresAt: input.ssiapExpiresAt !== undefined ? normalizeDate(input.ssiapExpiresAt) : current.ssiapExpiresAt,
    notes: input.notes !== undefined ? normalizeOptional(input.notes) : current.notes,
    updatedAt: nowIso()
  };
  store.agents[index] = updated;
  await writeLocalStore(store);
  return updated;
}

export async function archiveLocalAgent(user: SessionUser, id: string) {
  return updateLocalAgent(user, id, { active: false, archivedAt: nowIso() });
}

export async function listLocalAssignments(user: SessionUser) {
  const store = await readLocalStore();
  return scopedLocalRecords(withRelations(store).assignments, user).sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());
}

export async function createLocalAssignment(user: SessionUser, input: Omit<LocalAssignment, "id" | "companyId" | "status" | "createdAt" | "updatedAt" | "agent" | "client" | "site">) {
  const store = await readLocalStore();
  if (!user.companyId) throw new LocalStoreError("Entreprise requise", 400);

  const agent = store.agents.find((item) => item.id === input.agentId && item.companyId === user.companyId && item.active);
  const client = store.clients.find((item) => item.id === input.clientId && item.companyId === user.companyId && item.active);
  const site = store.sites.find((item) => item.id === input.siteId && item.companyId === user.companyId && item.clientId === input.clientId && item.active);
  if (!agent || !client || !site) throw new LocalStoreError("Agent, client ou site introuvable", 404);

  const timestamp = nowIso();
  const assignment: LocalAssignment = {
    id: createId("asg"),
    companyId: user.companyId,
    agentId: agent.id,
    clientId: client.id,
    siteId: site.id,
    jobTitle: input.jobTitle.trim(),
    customJobTitle: normalizeOptional(input.customJobTitle),
    startsAt: normalizeDate(input.startsAt) ?? timestamp,
    endsAt: normalizeDate(input.endsAt),
    status: "ACTIVE",
    history: null,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  store.assignments.push(assignment);
  await writeLocalStore(store);
  return { ...assignment, agent, client, site };
}

export async function updateLocalAssignment(user: SessionUser, id: string, input: Partial<LocalAssignment>) {
  const store = await readLocalStore();
  const index = store.assignments.findIndex((assignment) => assignment.id === id);
  if (index === -1) throw new LocalStoreError("Affectation introuvable", 404);
  const current = store.assignments[index];
  if (user.role !== "SUPER_ADMIN" && current.companyId !== user.companyId) throw new LocalStoreError("Acces entreprise interdit", 403);

  const updated: LocalAssignment = {
    ...current,
    ...input,
    jobTitle: input.jobTitle?.trim() ?? current.jobTitle,
    customJobTitle: input.customJobTitle !== undefined ? normalizeOptional(input.customJobTitle) : current.customJobTitle,
    startsAt: input.startsAt !== undefined ? (normalizeDate(input.startsAt) ?? current.startsAt) : current.startsAt,
    endsAt: input.endsAt !== undefined ? normalizeDate(input.endsAt) : current.endsAt,
    updatedAt: nowIso()
  };
  store.assignments[index] = updated;
  await writeLocalStore(store);
  const relations = withRelations(store);
  return relations.assignments.find((assignment) => assignment.id === id) ?? updated;
}

export async function archiveLocalAssignment(user: SessionUser, id: string) {
  return updateLocalAssignment(user, id, { status: "ARCHIVED", endsAt: nowIso() });
}
