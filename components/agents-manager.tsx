"use client";

import Image from "next/image";
import { Archive, BadgeCheck, Camera, ClipboardCheck, FileWarning, Loader2, Pencil, Plus, Save, UserRoundCheck, X } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Badge, DataTable, PageHeader, ProgressBar, Section, StatCard } from "@/components/ui";
import { daysUntil } from "@/lib/utils";

type ClientRecord = {
  id: string;
  companyId: string;
  name: string;
};

type SiteRecord = {
  id: string;
  clientId: string;
  name: string;
};

type AgentRecord = {
  id: string;
  companyId?: string;
  photoUrl?: string | null;
  civility?: "MONSIEUR" | "MADAME" | null;
  matricule: string;
  firstName: string;
  lastName: string;
  birthDate?: string | null;
  birthPlace?: string | null;
  email?: string | null;
  phone?: string | null;
  professionalCardNumber?: string | null;
  professionalCardExpiresAt?: string | null;
  sstExpiresAt?: string | null;
  ssiapExpiresAt?: string | null;
  diplomas?: string[];
  eligibleJobTitles?: string[];
  contractType?: "CDD" | "CDI" | "APPRENTI" | null;
  hiredAt?: string | null;
  qualityScore: number;
  notes?: string | null;
};

type AssignmentRecord = {
  id: string;
  agentId: string;
  clientId: string;
  siteId: string;
  jobTitle: string;
  customJobTitle?: string | null;
  startsAt: string;
  endsAt?: string | null;
  status: string;
  agent?: AgentRecord | null;
  client?: ClientRecord | null;
  site?: SiteRecord | null;
};

type AgentForm = {
  companyId: string;
  photoUrl: string;
  civility: "" | "MONSIEUR" | "MADAME";
  matricule: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  birthPlace: string;
  email: string;
  phone: string;
  professionalCardNumber: string;
  professionalCardExpiresAt: string;
  sstExpiresAt: string;
  ssiapExpiresAt: string;
  diplomas: string[];
  eligibleJobTitles: string[];
  contractType: "" | "CDD" | "CDI" | "APPRENTI";
  hiredAt: string;
  notes: string;
};

type AssignmentForm = {
  agentId: string;
  clientId: string;
  siteId: string;
  jobTitle: string;
  customJobTitle: string;
  startsAt: string;
  endsAt: string;
};

const diplomaOptions = ["Carte professionnelle", "SST", "SSIAP 1", "SSIAP 2", "SSIAP 3", "H0 B0", "BS", "BE Manoeuvre"];
const jobTitles = ["Agent", "Chef d'equipe", "Referent", "SSIAP 1", "SSIAP 2", "SSIAP 3", "Rondier intervenant", "Operateur en videoprotection", "Autre"];

const emptyAgentForm: AgentForm = {
  companyId: "",
  photoUrl: "",
  civility: "",
  matricule: "",
  firstName: "",
  lastName: "",
  birthDate: "",
  birthPlace: "",
  email: "",
  phone: "",
  professionalCardNumber: "",
  professionalCardExpiresAt: "",
  sstExpiresAt: "",
  ssiapExpiresAt: "",
  diplomas: [],
  eligibleJobTitles: [],
  contractType: "",
  hiredAt: "",
  notes: ""
};

const emptyAssignmentForm: AssignmentForm = {
  agentId: "",
  clientId: "",
  siteId: "",
  jobTitle: "Agent",
  customJobTitle: "",
  startsAt: new Date().toISOString().slice(0, 10),
  endsAt: ""
};

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...init?.headers
    }
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.error ?? "Action impossible");
  }
  return body as T;
}

function cleanPayload(form: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(form).map(([key, value]) => {
      if (typeof value === "string") return [key, value.trim() || undefined];
      if (Array.isArray(value)) return [key, value];
      return [key, value];
    })
  );
}

function toInputDate(value?: string | null) {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString("fr-FR") : "-";
}

function actionButton(label: string, onClick: () => void, icon: ReactNode) {
  return (
    <button type="button" onClick={onClick} className="button-secondary h-9 w-9 p-0" title={label} aria-label={label}>
      {icon}
    </button>
  );
}

function initials(agent: Pick<AgentRecord, "firstName" | "lastName">) {
  return `${agent.firstName[0] ?? ""}${agent.lastName[0] ?? ""}`.toUpperCase() || "AG";
}

function AgentAvatar({ agent, size = 40 }: { agent: AgentRecord; size?: number }) {
  if (agent.photoUrl) {
    return (
      <Image
        src={agent.photoUrl}
        alt={`${agent.firstName} ${agent.lastName}`}
        width={size}
        height={size}
        unoptimized
        className="rounded-full object-cover ring-1 ring-ink-200 dark:ring-white/10"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-sentinel-100 text-sm font-bold text-sentinel-800 ring-1 ring-sentinel-200 dark:bg-sentinel-500/15 dark:text-sentinel-100 dark:ring-sentinel-500/20"
      style={{ width: size, height: size }}
    >
      {initials(agent)}
    </span>
  );
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Lecture de la photo impossible"));
    reader.readAsDataURL(file);
  });
}

export function AgentsManager() {
  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [sites, setSites] = useState<SiteRecord[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRecord[]>([]);
  const [agentForm, setAgentForm] = useState<AgentForm>(emptyAgentForm);
  const [assignmentForm, setAssignmentForm] = useState<AssignmentForm>(emptyAssignmentForm);
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const agentNameById = useMemo(() => new Map(agents.map((agent) => [agent.id, `${agent.firstName} ${agent.lastName}`])), [agents]);
  const clientNameById = useMemo(() => new Map(clients.map((client) => [client.id, client.name])), [clients]);
  const siteNameById = useMemo(() => new Map(sites.map((site) => [site.id, site.name])), [sites]);
  const selectedAssignmentAgent = useMemo(() => agents.find((agent) => agent.id === assignmentForm.agentId), [agents, assignmentForm.agentId]);
  const allowedJobTitles = useMemo(() => {
    const eligible = selectedAssignmentAgent?.eligibleJobTitles?.length ? selectedAssignmentAgent.eligibleJobTitles : jobTitles.filter((jobTitle) => jobTitle !== "Autre");
    return eligible.includes("Autre") ? eligible : [...eligible, "Autre"];
  }, [selectedAssignmentAgent]);
  const filteredSites = useMemo(() => sites.filter((site) => site.clientId === assignmentForm.clientId), [assignmentForm.clientId, sites]);
  const expiringCards = agents.filter((agent) => {
    const remainingDays = daysUntil(agent.professionalCardExpiresAt);
    return remainingDays !== null && remainingDays <= 120;
  }).length;

  async function load() {
    setError(null);
    setLoading(true);
    try {
      const [agentsResponse, clientsResponse, sitesResponse, assignmentsResponse] = await Promise.all([
        requestJson<{ agents: AgentRecord[] }>("/api/agents"),
        requestJson<{ clients: ClientRecord[] }>("/api/clients"),
        requestJson<{ sites: SiteRecord[] }>("/api/sites"),
        requestJson<{ assignments: AssignmentRecord[] }>("/api/assignments")
      ]);
      setAgents(agentsResponse.agents);
      setClients(clientsResponse.clients);
      setSites(sitesResponse.sites);
      setAssignments(assignmentsResponse.assignments);
      setAssignmentForm((current) => ({
        ...current,
        agentId: current.agentId || agentsResponse.agents[0]?.id || "",
        clientId: current.clientId || clientsResponse.clients[0]?.id || "",
        siteId: current.siteId || sitesResponse.sites.find((site) => site.clientId === (current.clientId || clientsResponse.clients[0]?.id))?.id || ""
      }));
      setAgentForm((current) => ({ ...current, companyId: current.companyId || clientsResponse.clients[0]?.companyId || agentsResponse.agents[0]?.companyId || "" }));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Chargement impossible");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!assignmentForm.clientId) return;
    if (filteredSites.some((site) => site.id === assignmentForm.siteId)) return;
    setAssignmentForm((form) => ({ ...form, siteId: filteredSites[0]?.id ?? "" }));
  }, [assignmentForm.clientId, assignmentForm.siteId, filteredSites]);

  useEffect(() => {
    if (allowedJobTitles.includes(assignmentForm.jobTitle)) return;
    setAssignmentForm((form) => ({ ...form, jobTitle: allowedJobTitles[0] ?? "Agent" }));
  }, [allowedJobTitles, assignmentForm.jobTitle]);

  function editAgent(agent: AgentRecord) {
    setEditingAgentId(agent.id);
    setAgentForm({
      companyId: agent.companyId ?? clients[0]?.companyId ?? "",
      photoUrl: agent.photoUrl ?? "",
      civility: agent.civility ?? "",
      matricule: agent.matricule,
      firstName: agent.firstName,
      lastName: agent.lastName,
      birthDate: toInputDate(agent.birthDate),
      birthPlace: agent.birthPlace ?? "",
      email: agent.email ?? "",
      phone: agent.phone ?? "",
      professionalCardNumber: agent.professionalCardNumber ?? "",
      professionalCardExpiresAt: toInputDate(agent.professionalCardExpiresAt),
      sstExpiresAt: toInputDate(agent.sstExpiresAt),
      ssiapExpiresAt: toInputDate(agent.ssiapExpiresAt),
      diplomas: agent.diplomas ?? [],
      eligibleJobTitles: agent.eligibleJobTitles ?? [],
      contractType: agent.contractType ?? "",
      hiredAt: toInputDate(agent.hiredAt),
      notes: agent.notes ?? ""
    });
  }

  function editAssignment(assignment: AssignmentRecord) {
    setEditingAssignmentId(assignment.id);
    setAssignmentForm({
      agentId: assignment.agentId,
      clientId: assignment.clientId,
      siteId: assignment.siteId,
      jobTitle: assignment.jobTitle,
      customJobTitle: assignment.customJobTitle ?? "",
      startsAt: toInputDate(assignment.startsAt),
      endsAt: toInputDate(assignment.endsAt)
    });
  }

  function resetAgentForm() {
    setEditingAgentId(null);
    setAgentForm({ ...emptyAgentForm, companyId: clients[0]?.companyId ?? agents[0]?.companyId ?? "" });
  }

  function resetAssignmentForm() {
    setEditingAssignmentId(null);
    setAssignmentForm({
      ...emptyAssignmentForm,
      agentId: agents[0]?.id ?? "",
      clientId: clients[0]?.id ?? "",
      siteId: sites.find((site) => site.clientId === clients[0]?.id)?.id ?? ""
    });
  }

  async function submitAgent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const payload = cleanPayload(agentForm);
      if (editingAgentId) {
        await requestJson("/api/agents", { method: "PATCH", body: JSON.stringify({ id: editingAgentId, ...payload }) });
        setMessage("Agent mis a jour.");
      } else {
        await requestJson("/api/agents", { method: "POST", body: JSON.stringify(payload) });
        setMessage("Agent cree.");
      }
      resetAgentForm();
      await load();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  }

  async function handlePhoto(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Le fichier selectionne doit etre une image.");
      return;
    }
    if (file.size > 1_500_000) {
      setError("La photo doit rester inferieure a 1,5 Mo pour cette version locale.");
      return;
    }
    try {
      const photoUrl = await fileToDataUrl(file);
      setAgentForm((form) => ({ ...form, photoUrl }));
      setError(null);
    } catch (photoError) {
      setError(photoError instanceof Error ? photoError.message : "Lecture de la photo impossible");
    }
  }

  function toggleAgentArray(field: "diplomas" | "eligibleJobTitles", value: string) {
    setAgentForm((form) => {
      const current = form[field];
      return {
        ...form,
        [field]: current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
      };
    });
  }

  async function submitAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const payload = cleanPayload(assignmentForm);
      if (editingAssignmentId) {
        await requestJson("/api/assignments", { method: "PATCH", body: JSON.stringify({ id: editingAssignmentId, ...payload }) });
        setMessage("Affectation mise a jour.");
      } else {
        await requestJson("/api/assignments", { method: "POST", body: JSON.stringify(payload) });
        setMessage("Affectation creee.");
      }
      resetAssignmentForm();
      await load();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  }

  async function archiveAgent(id: string) {
    if (!window.confirm("Archiver cet agent ?")) return;
    setSaving(true);
    setError(null);
    try {
      await requestJson(`/api/agents?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      setMessage("Agent archive.");
      await load();
    } catch (archiveError) {
      setError(archiveError instanceof Error ? archiveError.message : "Archivage impossible");
    } finally {
      setSaving(false);
    }
  }

  async function archiveAssignment(id: string) {
    if (!window.confirm("Archiver cette affectation ?")) return;
    setSaving(true);
    setError(null);
    try {
      await requestJson(`/api/assignments?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      setMessage("Affectation archivee.");
      await load();
    } catch (archiveError) {
      setError(archiveError instanceof Error ? archiveError.message : "Archivage impossible");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Agents"
        subtitle="Dossiers agents, affectations, progression qualite, documents reglementaires et acces aux consignes de site."
        action={
          loading ? (
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-ink-500 dark:text-ink-300">
              <Loader2 className="h-4 w-4 animate-spin" />
              Chargement
            </span>
          ) : null
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Agents actifs" value={agents.length} trend="Donnees persistantes" icon={UserRoundCheck} />
        <StatCard label="Affectations" value={assignments.length} trend="Historique conserve" icon={ClipboardCheck} />
        <StatCard label="Cartes a surveiller" value={expiringCards} trend="Alerte avant echeance" icon={FileWarning} />
      </div>

      {error ? <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:bg-red-500/15 dark:text-red-100">{error}</p> : null}
      {message ? <p className="rounded-lg bg-sentinel-50 px-4 py-3 text-sm font-semibold text-sentinel-800 dark:bg-sentinel-500/15 dark:text-sentinel-100">{message}</p> : null}

      <Section title={editingAgentId ? "Modifier un agent" : "Ajouter un agent"}>
        <form onSubmit={submitAgent} className="surface rounded-lg p-4">
          <div className="grid gap-4 xl:grid-cols-[180px_1fr]">
            <div className="rounded-lg border border-ink-200 bg-ink-50 p-4 dark:border-white/10 dark:bg-white/5">
              <span className="label">Photo agent</span>
              <div className="mt-3 flex flex-col items-center gap-3">
                {agentForm.photoUrl ? (
                  <Image src={agentForm.photoUrl} alt="Photo agent" width={112} height={112} unoptimized className="h-28 w-28 rounded-full object-cover ring-1 ring-ink-200 dark:ring-white/10" />
                ) : (
                  <span className="flex h-28 w-28 items-center justify-center rounded-full bg-white text-ink-400 ring-1 ring-ink-200 dark:bg-ink-950 dark:ring-white/10">
                    <Camera className="h-8 w-8" />
                  </span>
                )}
                <label className="button-secondary h-9 cursor-pointer">
                  Choisir
                  <input type="file" accept="image/*" className="sr-only" onChange={(event) => void handlePhoto(event.target.files?.[0])} />
                </label>
                {agentForm.photoUrl ? (
                  <button type="button" className="text-xs font-semibold text-red-700 dark:text-red-200" onClick={() => setAgentForm((form) => ({ ...form, photoUrl: "" }))}>
                    Retirer
                  </button>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
              <label className="block">
                <span className="label">Civilite</span>
                <select className="field mt-2" value={agentForm.civility} onChange={(event) => setAgentForm((form) => ({ ...form, civility: event.target.value as AgentForm["civility"] }))}>
                  <option value="">Non renseigne</option>
                  <option value="MONSIEUR">Monsieur</option>
                  <option value="MADAME">Madame</option>
                </select>
              </label>
              <label className="block">
                <span className="label">Matricule</span>
                <input className="field mt-2" value={agentForm.matricule} onChange={(event) => setAgentForm((form) => ({ ...form, matricule: event.target.value }))} required />
              </label>
              <label className="block">
                <span className="label">Prenom</span>
                <input className="field mt-2" value={agentForm.firstName} onChange={(event) => setAgentForm((form) => ({ ...form, firstName: event.target.value }))} required />
              </label>
              <label className="block">
                <span className="label">Nom</span>
                <input className="field mt-2" value={agentForm.lastName} onChange={(event) => setAgentForm((form) => ({ ...form, lastName: event.target.value }))} required />
              </label>
              <label className="block">
                <span className="label">Date de naissance</span>
                <input className="field mt-2" type="date" value={agentForm.birthDate} onChange={(event) => setAgentForm((form) => ({ ...form, birthDate: event.target.value }))} />
              </label>
              <label className="block">
                <span className="label">Lieu de naissance</span>
                <input className="field mt-2" value={agentForm.birthPlace} onChange={(event) => setAgentForm((form) => ({ ...form, birthPlace: event.target.value }))} />
              </label>
              <label className="block">
                <span className="label">Email</span>
                <input className="field mt-2" type="email" value={agentForm.email} onChange={(event) => setAgentForm((form) => ({ ...form, email: event.target.value }))} />
              </label>
              <label className="block">
                <span className="label">Telephone</span>
                <input className="field mt-2" value={agentForm.phone} onChange={(event) => setAgentForm((form) => ({ ...form, phone: event.target.value }))} />
              </label>
              <label className="block">
                <span className="label">Type de contrat</span>
                <select className="field mt-2" value={agentForm.contractType} onChange={(event) => setAgentForm((form) => ({ ...form, contractType: event.target.value as AgentForm["contractType"] }))}>
                  <option value="">Non renseigne</option>
                  <option value="CDD">CDD</option>
                  <option value="CDI">CDI</option>
                  <option value="APPRENTI">Apprenti</option>
                </select>
              </label>
              <label className="block">
                <span className="label">Date d&apos;entree</span>
                <input className="field mt-2" type="date" value={agentForm.hiredAt} onChange={(event) => setAgentForm((form) => ({ ...form, hiredAt: event.target.value }))} />
              </label>
              <label className="block">
                <span className="label">Carte pro</span>
                <input className="field mt-2" value={agentForm.professionalCardNumber} onChange={(event) => setAgentForm((form) => ({ ...form, professionalCardNumber: event.target.value }))} />
              </label>
              <label className="block">
                <span className="label">Fin carte</span>
                <input className="field mt-2" type="date" value={agentForm.professionalCardExpiresAt} onChange={(event) => setAgentForm((form) => ({ ...form, professionalCardExpiresAt: event.target.value }))} />
              </label>
              <label className="block">
                <span className="label">Fin SST</span>
                <input className="field mt-2" type="date" value={agentForm.sstExpiresAt} onChange={(event) => setAgentForm((form) => ({ ...form, sstExpiresAt: event.target.value }))} />
              </label>
              <label className="block">
                <span className="label">Fin SSIAP</span>
                <input className="field mt-2" type="date" value={agentForm.ssiapExpiresAt} onChange={(event) => setAgentForm((form) => ({ ...form, ssiapExpiresAt: event.target.value }))} />
              </label>
              <label className="block md:col-span-2">
                <span className="label">Notes</span>
                <input className="field mt-2" value={agentForm.notes} onChange={(event) => setAgentForm((form) => ({ ...form, notes: event.target.value }))} />
              </label>
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <fieldset className="rounded-lg border border-ink-200 p-4 dark:border-white/10">
              <legend className="px-1 text-xs font-semibold uppercase text-ink-500 dark:text-ink-300">Diplomes et habilitations</legend>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {diplomaOptions.map((diploma) => (
                  <label key={diploma} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-ink-700 hover:bg-ink-50 dark:text-ink-200 dark:hover:bg-white/10">
                    <input type="checkbox" className="h-4 w-4 accent-sentinel-700" checked={agentForm.diplomas.includes(diploma)} onChange={() => toggleAgentArray("diplomas", diploma)} />
                    {diploma}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="rounded-lg border border-ink-200 p-4 dark:border-white/10">
              <legend className="px-1 text-xs font-semibold uppercase text-ink-500 dark:text-ink-300">Postes attribuables</legend>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {jobTitles
                  .filter((jobTitle) => jobTitle !== "Autre")
                  .map((jobTitle) => (
                    <label key={jobTitle} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-ink-700 hover:bg-ink-50 dark:text-ink-200 dark:hover:bg-white/10">
                      <input type="checkbox" className="h-4 w-4 accent-sentinel-700" checked={agentForm.eligibleJobTitles.includes(jobTitle)} onChange={() => toggleAgentArray("eligibleJobTitles", jobTitle)} />
                      {jobTitle}
                    </label>
                  ))}
              </div>
            </fieldset>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button className="button-primary" disabled={saving}>
              {editingAgentId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {editingAgentId ? "Enregistrer" : "Ajouter"}
            </button>
            {editingAgentId ? (
              <button type="button" className="button-secondary" onClick={resetAgentForm}>
                <X className="h-4 w-4" />
                Annuler
              </button>
            ) : null}
          </div>
        </form>
      </Section>

      <Section title="Registre agents">
        <DataTable
          columns={["Matricule", "Agent", "Contrat", "Diplomes", "Postes", "Carte pro", "Score qualite", "Actions"]}
          rows={agents.map((agent) => [
            agent.matricule,
            <div key={`${agent.id}-identity`} className="flex min-w-56 items-center gap-3">
              <AgentAvatar agent={agent} />
              <div>
                <p className="font-semibold text-ink-950 dark:text-white">
                  {agent.civility === "MADAME" ? "Mme" : agent.civility === "MONSIEUR" ? "M." : ""} {agent.firstName} {agent.lastName}
                </p>
                <p className="text-xs text-ink-500 dark:text-ink-300">
                  {agent.birthDate ? `${formatDate(agent.birthDate)} - ` : ""}
                  {agent.birthPlace || agent.email || "-"}
                </p>
              </div>
            </div>,
            <div key={`${agent.id}-contract`} className="min-w-28">
              <p className="font-semibold">{agent.contractType ?? "-"}</p>
              <p className="text-xs text-ink-500 dark:text-ink-300">{agent.hiredAt ? `Entree ${formatDate(agent.hiredAt)}` : "Entree non renseignee"}</p>
            </div>,
            <span key={`${agent.id}-diplomas`} className="block max-w-64 text-xs leading-5">
              {agent.diplomas?.length ? agent.diplomas.join(", ") : "-"}
            </span>,
            <span key={`${agent.id}-jobs`} className="block max-w-64 text-xs leading-5">
              {agent.eligibleJobTitles?.length ? agent.eligibleJobTitles.join(", ") : "-"}
            </span>,
            agent.professionalCardExpiresAt ? `${daysUntil(agent.professionalCardExpiresAt)} j` : "Manquante",
            <div key={`${agent.id}-score`} className="min-w-32">
              <div className="mb-1 flex items-center gap-2 font-semibold">
                <BadgeCheck className="h-4 w-4 text-sentinel-700" />
                {agent.qualityScore} %
              </div>
              <ProgressBar value={agent.qualityScore} tone={agent.qualityScore < 80 ? "amber" : "sentinel"} />
            </div>,
            <div key={agent.id} className="flex items-center gap-2">
              {actionButton("Modifier", () => editAgent(agent), <Pencil className="h-4 w-4" />)}
              {actionButton("Archiver", () => void archiveAgent(agent.id), <Archive className="h-4 w-4" />)}
            </div>
          ])}
        />
      </Section>

      <Section title={editingAssignmentId ? "Modifier une affectation" : "Ajouter une affectation"}>
        <form onSubmit={submitAssignment} className="surface rounded-lg p-4">
          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
            <label className="block">
              <span className="label">Agent</span>
              <select className="field mt-2" value={assignmentForm.agentId} onChange={(event) => setAssignmentForm((form) => ({ ...form, agentId: event.target.value }))} required>
                <option value="" disabled>
                  Selectionner
                </option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.firstName} {agent.lastName}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="label">Client</span>
              <select className="field mt-2" value={assignmentForm.clientId} onChange={(event) => setAssignmentForm((form) => ({ ...form, clientId: event.target.value }))} required>
                <option value="" disabled>
                  Selectionner
                </option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="label">Site</span>
              <select className="field mt-2" value={assignmentForm.siteId} onChange={(event) => setAssignmentForm((form) => ({ ...form, siteId: event.target.value }))} required>
                <option value="" disabled>
                  Selectionner
                </option>
                {filteredSites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="label">Poste</span>
              <select className="field mt-2" value={assignmentForm.jobTitle} onChange={(event) => setAssignmentForm((form) => ({ ...form, jobTitle: event.target.value }))} required>
                {allowedJobTitles.map((jobTitle) => (
                  <option key={jobTitle} value={jobTitle}>
                    {jobTitle}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="label">Debut</span>
              <input className="field mt-2" type="date" value={assignmentForm.startsAt} onChange={(event) => setAssignmentForm((form) => ({ ...form, startsAt: event.target.value }))} required />
            </label>
            <label className="block">
              <span className="label">Fin</span>
              <input className="field mt-2" type="date" value={assignmentForm.endsAt} onChange={(event) => setAssignmentForm((form) => ({ ...form, endsAt: event.target.value }))} />
            </label>
          </div>
          {assignmentForm.jobTitle === "Autre" ? (
            <label className="mt-4 block">
              <span className="label">Poste personnalise</span>
              <input className="field mt-2" value={assignmentForm.customJobTitle} onChange={(event) => setAssignmentForm((form) => ({ ...form, customJobTitle: event.target.value }))} />
            </label>
          ) : null}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button className="button-primary" disabled={saving || agents.length === 0 || clients.length === 0 || filteredSites.length === 0}>
              {editingAssignmentId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {editingAssignmentId ? "Enregistrer" : "Ajouter"}
            </button>
            {editingAssignmentId ? (
              <button type="button" className="button-secondary" onClick={resetAssignmentForm}>
                <X className="h-4 w-4" />
                Annuler
              </button>
            ) : null}
          </div>
        </form>
      </Section>

      <Section title="Affectations">
        <DataTable
          columns={["Agent", "Client", "Site", "Poste", "Debut", "Fin", "Statut", "Actions"]}
          rows={assignments.map((assignment) => [
            assignment.agent ? `${assignment.agent.firstName} ${assignment.agent.lastName}` : agentNameById.get(assignment.agentId) ?? assignment.agentId,
            assignment.client?.name ?? clientNameById.get(assignment.clientId) ?? assignment.clientId,
            assignment.site?.name ?? siteNameById.get(assignment.siteId) ?? assignment.siteId,
            assignment.customJobTitle || assignment.jobTitle,
            formatDate(assignment.startsAt),
            formatDate(assignment.endsAt),
            <Badge key={`${assignment.id}-status`}>{assignment.status}</Badge>,
            <div key={assignment.id} className="flex items-center gap-2">
              {actionButton("Modifier", () => editAssignment(assignment), <Pencil className="h-4 w-4" />)}
              {actionButton("Archiver", () => void archiveAssignment(assignment.id), <Archive className="h-4 w-4" />)}
            </div>
          ])}
        />
      </Section>
    </div>
  );
}
