"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Save, X } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { SECURITY_COMPANY_LEGAL_NOTICE } from "@/lib/constants";

type CompanyRecord = {
  id: string;
  name: string;
  slug?: string | null;
  logoUrl?: string | null;
  siret?: string | null;
  cnapsAuthorizationNumber?: string | null;
  address?: string | null;
  phone?: string | null;
  website?: string | null;
  legalNotice?: string | null;
};

type CompanyForm = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string;
  siret: string;
  cnapsAuthorizationNumber: string;
  address: string;
  phone: string;
  website: string;
  legalNotice: string;
};

const emptyForm: CompanyForm = {
  id: "",
  name: "",
  slug: "",
  logoUrl: "",
  siret: "",
  cnapsAuthorizationNumber: "",
  address: "",
  phone: "",
  website: "",
  legalNotice: SECURITY_COMPANY_LEGAL_NOTICE
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

function toForm(company: CompanyRecord): CompanyForm {
  return {
    id: company.id,
    name: company.name,
    slug: company.slug ?? "",
    logoUrl: company.logoUrl ?? "",
    siret: company.siret ?? "",
    cnapsAuthorizationNumber: company.cnapsAuthorizationNumber ?? "",
    address: company.address ?? "",
    phone: company.phone ?? "",
    website: company.website ?? "",
    legalNotice: company.legalNotice ?? SECURITY_COMPANY_LEGAL_NOTICE
  };
}

function cleanPayload(form: CompanyForm) {
  return Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value.trim() || undefined]));
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Lecture du logo impossible"));
    reader.readAsDataURL(file);
  });
}

export function CompanyIdentityManager() {
  const router = useRouter();
  const [form, setForm] = useState<CompanyForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const response = await requestJson<{ companies: CompanyRecord[] }>("/api/companies");
      const company = response.companies[0];
      if (company) setForm(toForm(company));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Chargement impossible");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleLogo(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Le fichier selectionne doit etre une image.");
      return;
    }
    if (file.size > 1_500_000) {
      setError("Le logo doit rester inferieur a 1,5 Mo pour cette version locale.");
      return;
    }
    try {
      const logoUrl = await fileToDataUrl(file);
      setForm((current) => ({ ...current, logoUrl }));
      setError(null);
    } catch (logoError) {
      setError(logoError instanceof Error ? logoError.message : "Lecture du logo impossible");
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.id) {
      setError("Entreprise introuvable.");
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const payload = cleanPayload(form);
      await requestJson("/api/companies", { method: "PATCH", body: JSON.stringify(payload) });
      setMessage("Identite entreprise mise a jour.");
      router.refresh();
      await load();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="surface rounded-lg p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-ink-950 dark:text-white">Identite entreprise</h3>
          <p className="mt-1 text-xs leading-5 text-ink-500 dark:text-ink-300">Informations legales affichees dans le bandeau SENTINELLE.</p>
        </div>
        {loading ? (
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-ink-500 dark:text-ink-300">
            <Loader2 className="h-4 w-4 animate-spin" />
            Chargement
          </span>
        ) : null}
      </div>

      {error ? <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:bg-red-500/15 dark:text-red-100">{error}</p> : null}
      {message ? <p className="mt-4 rounded-lg bg-sentinel-50 px-4 py-3 text-sm font-semibold text-sentinel-800 dark:bg-sentinel-500/15 dark:text-sentinel-100">{message}</p> : null}

      <div className="mt-4 grid gap-4 xl:grid-cols-[180px_1fr]">
        <div className="rounded-lg border border-ink-200 bg-ink-50 p-4 dark:border-white/10 dark:bg-white/5">
          <span className="label">Logo</span>
          <div className="mt-3 flex flex-col items-center gap-3">
            {form.logoUrl ? (
              <Image src={form.logoUrl} alt={`Logo ${form.name || "entreprise"}`} width={112} height={112} unoptimized className="h-28 w-28 rounded-lg object-contain ring-1 ring-ink-200 dark:ring-white/10" />
            ) : (
              <span className="flex h-28 w-28 items-center justify-center rounded-lg bg-white text-ink-400 ring-1 ring-ink-200 dark:bg-ink-950 dark:ring-white/10">
                <Camera className="h-8 w-8" />
              </span>
            )}
            <label className="button-secondary h-9 cursor-pointer">
              Choisir
              <input type="file" accept="image/*" className="sr-only" onChange={(event) => void handleLogo(event.target.files?.[0])} />
            </label>
            {form.logoUrl ? (
              <button type="button" className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 dark:text-red-200" onClick={() => setForm((current) => ({ ...current, logoUrl: "" }))}>
                <X className="h-3 w-3" />
                Retirer
              </button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="block xl:col-span-2">
            <span className="label">Nom de l&apos;entreprise</span>
            <input className="field mt-2" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
          </label>
          <label className="block">
            <span className="label">Slug</span>
            <input className="field mt-2" value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))} />
          </label>
          <label className="block">
            <span className="label">SIRET</span>
            <input className="field mt-2" value={form.siret} onChange={(event) => setForm((current) => ({ ...current, siret: event.target.value }))} />
          </label>
          <label className="block">
            <span className="label">Numero CNAPS</span>
            <input className="field mt-2" value={form.cnapsAuthorizationNumber} onChange={(event) => setForm((current) => ({ ...current, cnapsAuthorizationNumber: event.target.value }))} />
          </label>
          <label className="block">
            <span className="label">Telephone</span>
            <input className="field mt-2" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
          </label>
          <label className="block md:col-span-2">
            <span className="label">Adresse du siege social</span>
            <input className="field mt-2" value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} />
          </label>
          <label className="block">
            <span className="label">Site internet</span>
            <input className="field mt-2" value={form.website} onChange={(event) => setForm((current) => ({ ...current, website: event.target.value }))} />
          </label>
          <label className="block md:col-span-2 xl:col-span-3">
            <span className="label">Mention Article L612-14 du CSI</span>
            <textarea className="field mt-2 h-24 py-3" value={form.legalNotice} onChange={(event) => setForm((current) => ({ ...current, legalNotice: event.target.value }))} />
          </label>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button className="button-primary" disabled={saving || loading || !form.id}>
          <Save className="h-4 w-4" />
          Enregistrer l&apos;entreprise
        </button>
        <button type="button" className="button-secondary" onClick={() => setForm((current) => ({ ...current, legalNotice: SECURITY_COMPANY_LEGAL_NOTICE }))}>
          Mention par defaut
        </button>
      </div>
    </form>
  );
}
