"use client";

import { Archive, Building2, Loader2, MapPinned, Pencil, Plus, Save, ShieldCheck, X } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { DataTable, PageHeader, Section, StatCard } from "@/components/ui";

type ClientRecord = {
  id: string;
  name: string;
  reference: string;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  address?: string | null;
};

type SiteRecord = {
  id: string;
  clientId: string;
  name: string;
  reference: string;
  address: string;
  riskLevel?: string | null;
  client?: ClientRecord | null;
};

type ClientForm = {
  name: string;
  reference: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
};

type SiteForm = {
  clientId: string;
  name: string;
  reference: string;
  address: string;
  riskLevel: string;
};

const emptyClientForm: ClientForm = {
  name: "",
  reference: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  address: ""
};

const emptySiteForm: SiteForm = {
  clientId: "",
  name: "",
  reference: "",
  address: "",
  riskLevel: ""
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

function actionButton(label: string, onClick: () => void, icon: ReactNode) {
  return (
    <button type="button" onClick={onClick} className="button-secondary h-9 w-9 p-0" title={label} aria-label={label}>
      {icon}
    </button>
  );
}

export function ClientsSitesManager() {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [sites, setSites] = useState<SiteRecord[]>([]);
  const [clientForm, setClientForm] = useState<ClientForm>(emptyClientForm);
  const [siteForm, setSiteForm] = useState<SiteForm>(emptySiteForm);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [editingSiteId, setEditingSiteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clientNameById = useMemo(() => new Map(clients.map((client) => [client.id, client.name])), [clients]);

  async function load() {
    setError(null);
    setLoading(true);
    try {
      const [clientsResponse, sitesResponse] = await Promise.all([
        requestJson<{ clients: ClientRecord[] }>("/api/clients"),
        requestJson<{ sites: SiteRecord[] }>("/api/sites")
      ]);
      setClients(clientsResponse.clients);
      setSites(sitesResponse.sites);
      setSiteForm((current) => ({ ...current, clientId: current.clientId || clientsResponse.clients[0]?.id || "" }));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Chargement impossible");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function editClient(client: ClientRecord) {
    setEditingClientId(client.id);
    setClientForm({
      name: client.name,
      reference: client.reference,
      contactName: client.contactName ?? "",
      contactEmail: client.contactEmail ?? "",
      contactPhone: client.contactPhone ?? "",
      address: client.address ?? ""
    });
  }

  function editSite(site: SiteRecord) {
    setEditingSiteId(site.id);
    setSiteForm({
      clientId: site.clientId,
      name: site.name,
      reference: site.reference,
      address: site.address,
      riskLevel: site.riskLevel ?? ""
    });
  }

  function resetClientForm() {
    setEditingClientId(null);
    setClientForm(emptyClientForm);
  }

  function resetSiteForm() {
    setEditingSiteId(null);
    setSiteForm({ ...emptySiteForm, clientId: clients[0]?.id ?? "" });
  }

  async function submitClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const payload = cleanPayload(clientForm);
      if (editingClientId) {
        await requestJson(`/api/clients`, { method: "PATCH", body: JSON.stringify({ id: editingClientId, ...payload }) });
        setMessage("Client mis a jour.");
      } else {
        await requestJson(`/api/clients`, { method: "POST", body: JSON.stringify(payload) });
        setMessage("Client cree.");
      }
      resetClientForm();
      await load();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  }

  async function submitSite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const payload = cleanPayload(siteForm);
      if (editingSiteId) {
        await requestJson(`/api/sites`, { method: "PATCH", body: JSON.stringify({ id: editingSiteId, ...payload }) });
        setMessage("Site mis a jour.");
      } else {
        await requestJson(`/api/sites`, { method: "POST", body: JSON.stringify(payload) });
        setMessage("Site cree.");
      }
      resetSiteForm();
      await load();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  }

  async function archiveClient(id: string) {
    if (!window.confirm("Archiver ce client ?")) return;
    setSaving(true);
    setError(null);
    try {
      await requestJson(`/api/clients?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      setMessage("Client archive.");
      await load();
    } catch (archiveError) {
      setError(archiveError instanceof Error ? archiveError.message : "Archivage impossible");
    } finally {
      setSaving(false);
    }
  }

  async function archiveSite(id: string) {
    if (!window.confirm("Archiver ce site ?")) return;
    setSaving(true);
    setError(null);
    try {
      await requestJson(`/api/sites?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      setMessage("Site archive.");
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
        title="Clients et sites"
        subtitle="Gestion persistante des clients, sites, consignes, documents autorises et perimetres visibles cote client."
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
        <StatCard label="Clients" value={clients.length} trend="Donnees persistantes" icon={Building2} />
        <StatCard label="Sites" value={sites.length} trend="Rattaches aux clients" icon={MapPinned} />
        <StatCard label="Visibilite client" value="Controlee" trend="Rapports simplifies" icon={ShieldCheck} />
      </div>

      {error ? <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:bg-red-500/15 dark:text-red-100">{error}</p> : null}
      {message ? <p className="rounded-lg bg-sentinel-50 px-4 py-3 text-sm font-semibold text-sentinel-800 dark:bg-sentinel-500/15 dark:text-sentinel-100">{message}</p> : null}

      <Section title={editingClientId ? "Modifier un client" : "Ajouter un client"}>
        <form onSubmit={submitClient} className="surface rounded-lg p-4">
          <div className="grid gap-4 md:grid-cols-3">
            <label className="block">
              <span className="label">Nom</span>
              <input className="field mt-2" value={clientForm.name} onChange={(event) => setClientForm((form) => ({ ...form, name: event.target.value }))} required />
            </label>
            <label className="block">
              <span className="label">Reference</span>
              <input className="field mt-2" value={clientForm.reference} onChange={(event) => setClientForm((form) => ({ ...form, reference: event.target.value }))} required />
            </label>
            <label className="block">
              <span className="label">Contact</span>
              <input className="field mt-2" value={clientForm.contactName} onChange={(event) => setClientForm((form) => ({ ...form, contactName: event.target.value }))} />
            </label>
            <label className="block">
              <span className="label">Email</span>
              <input className="field mt-2" type="email" value={clientForm.contactEmail} onChange={(event) => setClientForm((form) => ({ ...form, contactEmail: event.target.value }))} />
            </label>
            <label className="block">
              <span className="label">Telephone</span>
              <input className="field mt-2" value={clientForm.contactPhone} onChange={(event) => setClientForm((form) => ({ ...form, contactPhone: event.target.value }))} />
            </label>
            <label className="block">
              <span className="label">Adresse</span>
              <input className="field mt-2" value={clientForm.address} onChange={(event) => setClientForm((form) => ({ ...form, address: event.target.value }))} />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button className="button-primary" disabled={saving}>
              {editingClientId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {editingClientId ? "Enregistrer" : "Ajouter"}
            </button>
            {editingClientId ? (
              <button type="button" className="button-secondary" onClick={resetClientForm}>
                <X className="h-4 w-4" />
                Annuler
              </button>
            ) : null}
          </div>
        </form>
      </Section>

      <Section title="Clients">
        <DataTable
          columns={["Reference", "Nom", "Contact", "Email", "Adresse", "Actions"]}
          rows={clients.map((client) => [
            client.reference,
            client.name,
            client.contactName ?? "-",
            client.contactEmail ?? "-",
            client.address ?? "-",
            <div key={client.id} className="flex items-center gap-2">
              {actionButton("Modifier", () => editClient(client), <Pencil className="h-4 w-4" />)}
              {actionButton("Archiver", () => void archiveClient(client.id), <Archive className="h-4 w-4" />)}
            </div>
          ])}
        />
      </Section>

      <Section title={editingSiteId ? "Modifier un site" : "Ajouter un site"}>
        <form onSubmit={submitSite} className="surface rounded-lg p-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <label className="block">
              <span className="label">Client</span>
              <select className="field mt-2" value={siteForm.clientId} onChange={(event) => setSiteForm((form) => ({ ...form, clientId: event.target.value }))} required>
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
              <input className="field mt-2" value={siteForm.name} onChange={(event) => setSiteForm((form) => ({ ...form, name: event.target.value }))} required />
            </label>
            <label className="block">
              <span className="label">Reference</span>
              <input className="field mt-2" value={siteForm.reference} onChange={(event) => setSiteForm((form) => ({ ...form, reference: event.target.value }))} required />
            </label>
            <label className="block">
              <span className="label">Adresse</span>
              <input className="field mt-2" value={siteForm.address} onChange={(event) => setSiteForm((form) => ({ ...form, address: event.target.value }))} required />
            </label>
            <label className="block">
              <span className="label">Risque</span>
              <input className="field mt-2" value={siteForm.riskLevel} onChange={(event) => setSiteForm((form) => ({ ...form, riskLevel: event.target.value }))} />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button className="button-primary" disabled={saving || clients.length === 0}>
              {editingSiteId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {editingSiteId ? "Enregistrer" : "Ajouter"}
            </button>
            {editingSiteId ? (
              <button type="button" className="button-secondary" onClick={resetSiteForm}>
                <X className="h-4 w-4" />
                Annuler
              </button>
            ) : null}
          </div>
        </form>
      </Section>

      <Section title="Sites">
        <DataTable
          columns={["Reference", "Site", "Client", "Adresse", "Risque", "Actions"]}
          rows={sites.map((site) => [
            site.reference,
            site.name,
            site.client?.name ?? clientNameById.get(site.clientId) ?? site.clientId,
            site.address,
            site.riskLevel ?? "-",
            <div key={site.id} className="flex items-center gap-2">
              {actionButton("Modifier", () => editSite(site), <Pencil className="h-4 w-4" />)}
              {actionButton("Archiver", () => void archiveSite(site.id), <Archive className="h-4 w-4" />)}
            </div>
          ])}
        />
      </Section>
    </div>
  );
}
