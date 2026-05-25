"use client";

import { Archive, BadgeCheck, ClipboardCheck, FileWarning, Loader2, Pencil, Plus, Save, UserRoundCheck, X } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Badge, DataTable, PageHeader, ProgressBar, Section, StatCard } from "@/components/ui";
import { daysUntil } from "@/lib/utils";

type ClientRecord = {
  id: string;
  name: string;
};

type SiteRecord = {
  id: string;
  clientId: string;
  name: string;
};

type AgentRecord = {
  id: string;
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
  matricule: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  professionalCardNumber: string;
  professionalCardExpiresAt: string;
  sstExpiresAt: string;
  ssiapExpiresAt: string;
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

const jobTitles = ["APS", "SSIAP 1", "SSIAP 2", "Chef de poste", "Referent", "Autre"];

const emptyAgentForm: AgentForm = {
  matricule: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  professionalCardNumber: "",
  professionalCardExpiresAt: "",
  sstExpiresAt: "",
  ssiapExpiresAt: "",
  notes: ""
};

const emptyAssignmentForm: AssignmentForm = {
  agentId: "",
  clientId: "",
  siteId: "",
  jobTitle: "APS",
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

function cleanPayload<T extends Record<string, string>>(form: T) {
  return Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value.trim() || undefined]));
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

  function editAgent(agent: AgentRecord) {
    setEditingAgentId(agent.id);
    setAgentForm({
      matricule: agent.matricule,
      firstName: agent.firstName,
      lastName: agent.lastName,
      email: agent.email ?? "",
      phone: agent.phone ?? "",
      professionalCardNumber: agent.professionalCardNumber ?? "",
      professionalCardExpiresAt: toInputDate(agent.professionalCardExpiresAt),
      sstExpiresAt: toInputDate(agent.sstExpiresAt),
      ssiapExpiresAt: toInputDate(agent.ssiapExpiresAt),
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
    setAgentForm(emptyAgentForm);
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
          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
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
              <span className="label">Email</span>
              <input className="field mt-2" type="email" value={agentForm.email} onChange={(event) => setAgentForm((form) => ({ ...form, email: event.target.value }))} />
            </label>
            <label className="block">
              <span className="label">Telephone</span>
              <input className="field mt-2" value={agentForm.phone} onChange={(event) => setAgentForm((form) => ({ ...form, phone: event.target.value }))} />
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
            <label className="block">
              <span className="label">Notes</span>
              <input className="field mt-2" value={agentForm.notes} onChange={(event) => setAgentForm((form) => ({ ...form, notes: event.target.value }))} />
            </label>
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
          columns={["Matricule", "Agent", "Carte pro", "SST", "SSIAP", "Score qualite", "Actions"]}
          rows={agents.map((agent) => [
            agent.matricule,
            `${agent.firstName} ${agent.lastName}`,
            agent.professionalCardExpiresAt ? `${daysUntil(agent.professionalCardExpiresAt)} j` : "Manquante",
            agent.sstExpiresAt ? `${daysUntil(agent.sstExpiresAt)} j` : "Manquant",
            agent.ssiapExpiresAt ? `${daysUntil(agent.ssiapExpiresAt)} j` : "Non applicable",
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
                {jobTitles.map((jobTitle) => (
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
