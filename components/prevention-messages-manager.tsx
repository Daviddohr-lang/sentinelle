"use client";

import { CheckCircle2, Edit3, MessageSquarePlus, PauseCircle, PlayCircle, Plus, RefreshCw, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge, EmptyState, Section } from "@/components/ui";

type PreventionMessage = {
  id: string;
  companyId?: string | null;
  title: string;
  theme?: string | null;
  body: string;
  question: string;
  expectedAnswer: string;
  active: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  acknowledged?: boolean;
  createdAt: string;
  updatedAt: string;
};

type PreventionForm = {
  id?: string;
  title: string;
  theme: string;
  body: string;
  question: string;
  expectedAnswer: string;
  active: boolean;
  startsAt: string;
  endsAt: string;
};

const emptyForm: PreventionForm = {
  title: "",
  theme: "Vigilance",
  body: "",
  question: "",
  expectedAnswer: "",
  active: true,
  startsAt: "",
  endsAt: ""
};

const defaultThemes = ["Vigilance", "Traçabilité", "Main courante", "Tenue", "Déontologie", "Relation client", "Sécurité incendie", "Intervention", "RGPD", "Consignes site"];

function toInputDateTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function toForm(message: PreventionMessage): PreventionForm {
  return {
    id: message.id,
    title: message.title,
    theme: message.theme ?? "Général",
    body: message.body,
    question: message.question,
    expectedAnswer: message.expectedAnswer,
    active: message.active,
    startsAt: toInputDateTime(message.startsAt),
    endsAt: toInputDateTime(message.endsAt)
  };
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString("fr-FR") : "Non défini";
}

export function PreventionMessagesManager() {
  const [messages, setMessages] = useState<PreventionMessage[]>([]);
  const [form, setForm] = useState<PreventionForm>(emptyForm);
  const [availableThemes, setAvailableThemes] = useState(defaultThemes);
  const [themeDraft, setThemeDraft] = useState("");
  const [canManage, setCanManage] = useState(false);
  const [status, setStatus] = useState("Chargement des messages de prévention...");
  const [error, setError] = useState<string | null>(null);

  const activeCount = useMemo(() => messages.filter((message) => message.active).length, [messages]);

  async function loadThemes() {
    try {
      const response = await fetch("/api/prevention-themes");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Chargement des thématiques impossible");
      const themes = data.themes?.length ? data.themes : defaultThemes;
      setAvailableThemes(themes);
      setForm((current) => ({ ...current, theme: themes.includes(current.theme) ? current.theme : themes[0] ?? "Vigilance" }));
    } catch {
      setAvailableThemes(defaultThemes);
    }
  }

  async function loadMessages() {
    setError(null);
    setStatus("Chargement des messages de prévention...");
    try {
      const response = await fetch("/api/prevention-messages");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Chargement impossible");
      setMessages(data.messages ?? []);
      setCanManage(Boolean(data.canManage));
      setStatus(`${data.messages?.length ?? 0} message(s), ${data.messages?.filter((message: PreventionMessage) => message.active).length ?? 0} actif(s).`);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Chargement impossible");
      setStatus("Messages indisponibles.");
    }
  }

  useEffect(() => {
    loadMessages();
    loadThemes();
  }, []);

  async function createTheme() {
    const name = themeDraft.trim();
    if (!name) {
      setError("Renseignez le nom de la thématique à créer.");
      return;
    }
    setError(null);
    try {
      const response = await fetch("/api/prevention-themes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Création de la thématique impossible");
      const themes = data.themes?.length ? data.themes : [...availableThemes, name];
      setAvailableThemes(themes);
      setForm((current) => ({ ...current, theme: data.theme ?? name }));
      setThemeDraft("");
      setStatus(`Thématique "${data.theme ?? name}" créée.`);
    } catch (themeError) {
      setError(themeError instanceof Error ? themeError.message : "Création de la thématique impossible");
    }
  }

  async function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      const method = form.id ? "PATCH" : "POST";
      const response = await fetch("/api/prevention-messages", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          startsAt: form.startsAt || null,
          endsAt: form.endsAt || null
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Enregistrement impossible");
      setForm(emptyForm);
      setStatus(form.id ? "Message modifié." : "Message créé.");
      await loadMessages();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Enregistrement impossible");
    }
  }

  async function toggleMessage(message: PreventionMessage) {
    setError(null);
    try {
      const response = await fetch("/api/prevention-messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: message.id, active: !message.active })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Modification impossible");
      await loadMessages();
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "Modification impossible");
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="surface rounded-lg p-4">
          <p className="text-sm font-medium text-ink-500 dark:text-ink-300">Messages actifs</p>
          <p className="mt-2 text-2xl font-semibold text-ink-950 dark:text-white">{activeCount}</p>
        </div>
        <div className="surface rounded-lg p-4">
          <p className="text-sm font-medium text-ink-500 dark:text-ink-300">Thématiques</p>
          <p className="mt-2 text-2xl font-semibold text-ink-950 dark:text-white">{availableThemes.length}</p>
        </div>
        <div className="surface rounded-lg p-4">
          <p className="text-sm font-medium text-ink-500 dark:text-ink-300">Statut</p>
          <p className="mt-2 text-sm font-semibold text-ink-950 dark:text-white">{status}</p>
        </div>
      </div>

      {error ? <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-800 dark:bg-red-500/15 dark:text-red-100">{error}</p> : null}

      {canManage ? (
        <Section title={form.id ? "Modifier un message" : "Créer un message de prévention"}>
          <div className="surface rounded-lg p-5">
            <div className="mb-5 rounded-lg border border-ink-200 bg-ink-50 p-4 dark:border-white/10 dark:bg-white/5">
              <p className="text-sm font-semibold text-ink-950 dark:text-white">Créer une thématique</p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  className="field"
                  value={themeDraft}
                  onChange={(event) => setThemeDraft(event.target.value)}
                  placeholder="Ex. Téléphone en vacation, Accueil client, Ronde..."
                />
                <button type="button" className="button-secondary sm:w-auto" onClick={() => void createTheme()}>
                  <Plus className="h-4 w-4" />
                  Ajouter la thématique
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {availableThemes.map((theme) => (
                  <button
                    key={theme}
                    type="button"
                    onClick={() => setForm((current) => ({ ...current, theme }))}
                    className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${
                      form.theme === theme
                        ? "bg-sentinel-50 text-sentinel-800 ring-sentinel-200 dark:bg-sentinel-500/15 dark:text-sentinel-100 dark:ring-sentinel-500/30"
                        : "bg-white text-ink-600 ring-ink-200 dark:bg-white/5 dark:text-ink-200 dark:ring-white/10"
                    }`}
                  >
                    {theme}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={submitForm} className="grid gap-4 lg:grid-cols-2">
            <label className="text-sm font-medium text-ink-700 dark:text-ink-200">
              Titre
              <input className="field mt-2" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} required />
            </label>
            <label className="text-sm font-medium text-ink-700 dark:text-ink-200">
              Thématique
              <select className="field mt-2" value={form.theme} onChange={(event) => setForm((current) => ({ ...current, theme: event.target.value }))} required>
                {availableThemes.map((theme) => (
                  <option key={theme} value={theme}>
                    {theme}
                  </option>
                ))}
              </select>
            </label>
            <label className="lg:col-span-2 text-sm font-medium text-ink-700 dark:text-ink-200">
              Message affiché à l&apos;agent
              <textarea className="field mt-2 min-h-28" value={form.body} onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))} required />
            </label>
            <label className="text-sm font-medium text-ink-700 dark:text-ink-200">
              Question de validation
              <input className="field mt-2" value={form.question} onChange={(event) => setForm((current) => ({ ...current, question: event.target.value }))} required />
            </label>
            <label className="text-sm font-medium text-ink-700 dark:text-ink-200">
              Réponse attendue
              <input className="field mt-2" value={form.expectedAnswer} onChange={(event) => setForm((current) => ({ ...current, expectedAnswer: event.target.value }))} required />
            </label>
            <label className="text-sm font-medium text-ink-700 dark:text-ink-200">
              Début de diffusion
              <input type="datetime-local" className="field mt-2" value={form.startsAt} onChange={(event) => setForm((current) => ({ ...current, startsAt: event.target.value }))} />
            </label>
            <label className="text-sm font-medium text-ink-700 dark:text-ink-200">
              Fin de diffusion
              <input type="datetime-local" className="field mt-2" value={form.endsAt} onChange={(event) => setForm((current) => ({ ...current, endsAt: event.target.value }))} />
            </label>
            <label className="flex items-center gap-3 text-sm font-semibold text-ink-700 dark:text-ink-200">
              <input type="checkbox" checked={form.active} onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))} className="h-4 w-4 accent-sentinel-700" />
              Message actif
            </label>
            <div className="flex flex-wrap justify-end gap-2 lg:col-span-2">
              {form.id ? (
                <button type="button" className="button-secondary" onClick={() => setForm(emptyForm)}>
                  Annuler
                </button>
              ) : null}
              <button type="submit" className="button-primary">
                {form.id ? <Save className="h-4 w-4" /> : <MessageSquarePlus className="h-4 w-4" />}
                {form.id ? "Enregistrer" : "Créer le message"}
              </button>
            </div>
          </form>
          </div>
        </Section>
      ) : null}

      <Section
        title="Bibliothèque des messages"
        action={
          <button type="button" onClick={loadMessages} className="button-secondary">
            <RefreshCw className="h-4 w-4" />
            Actualiser
          </button>
        }
      >
        {messages.length ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {messages.map((message) => (
              <article key={message.id} className="surface rounded-lg p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-ink-950 dark:text-white">{message.title}</p>
                    <p className="mt-1 text-xs font-semibold uppercase text-sentinel-700 dark:text-sentinel-200">{message.theme ?? "Général"}</p>
                  </div>
                  <Badge tone="neutral">{message.active ? "Actif" : "Inactif"}</Badge>
                </div>
                <p className="mt-4 text-sm leading-6 text-ink-600 dark:text-ink-300">{message.body}</p>
                <div className="mt-4 rounded-lg bg-ink-50 p-3 text-sm dark:bg-white/5">
                  <p className="font-semibold text-ink-800 dark:text-ink-100">{message.question}</p>
                  <p className="mt-1 text-ink-500 dark:text-ink-300">Réponse attendue : {message.expectedAnswer}</p>
                </div>
                <div className="mt-4 grid gap-2 text-xs font-medium text-ink-500 dark:text-ink-300 sm:grid-cols-2">
                  <p>Début : {formatDate(message.startsAt)}</p>
                  <p>Fin : {formatDate(message.endsAt)}</p>
                  <p>Créé : {formatDate(message.createdAt)}</p>
                  <p className="flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {message.acknowledged ? "Validé par vous" : "Non validé par vous"}
                  </p>
                </div>
                {canManage ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" className="button-secondary" onClick={() => setForm(toForm(message))}>
                      <Edit3 className="h-4 w-4" />
                      Modifier
                    </button>
                    <button type="button" className="button-secondary" onClick={() => void toggleMessage(message)}>
                      {message.active ? <PauseCircle className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
                      {message.active ? "Désactiver" : "Activer"}
                    </button>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="Aucun message de prévention" description="Aucun message n'est disponible pour votre périmètre." />
        )}
      </Section>
    </div>
  );
}
