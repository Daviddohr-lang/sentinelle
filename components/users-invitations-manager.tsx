"use client";

import { MailPlus, RefreshCw, Send, UsersRound } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { Badge, DataTable, StatCard } from "@/components/ui";
import { roleLabels } from "@/lib/constants";

type RoleKey = keyof typeof roleLabels;

type CompanyOption = {
  id: string;
  name: string;
};

type UserRow = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: RoleKey;
  status: string;
  companyName: string;
  lastLoginAt: string | null;
};

type InvitationRow = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: RoleKey;
  status: string;
  expiresAt: string;
  sentAt: string | null;
  acceptedAt: string | null;
  lastEmailError: string | null;
  companyName: string;
  invitedByName: string;
};

type InviteResult = {
  email: string;
  status: string;
  message?: string;
  activationUrl?: string | null;
};

type DirectoryPayload = {
  companies: CompanyOption[];
  users: UserRow[];
  invitations: InvitationRow[];
  warning?: string;
};

const roleOrder: RoleKey[] = ["COMPANY_ADMIN", "BUSINESS_OWNER", "QUALITY_CONTROLLER", "AGENT", "CLIENT", "SUPER_ADMIN"];

function splitLine(line: string) {
  return line
    .split(/[;\t,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function inferNames(email: string) {
  const base = email.split("@")[0]?.replace(/[._-]+/g, " ") || "Utilisateur";
  const parts = base.split(" ").filter(Boolean);
  const firstName = parts[0] ? parts[0][0].toUpperCase() + parts[0].slice(1) : "Utilisateur";
  const lastName = parts.slice(1).join(" ").toUpperCase() || "SENTINELLE";
  return { firstName, lastName };
}

function parseRole(value: string | undefined, fallback: RoleKey) {
  if (!value) return fallback;
  const normalized = value.trim().toUpperCase().replaceAll(" ", "_").replaceAll("-", "_");
  return roleOrder.includes(normalized as RoleKey) ? (normalized as RoleKey) : fallback;
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

export function UsersInvitationsManager({ currentUserRole }: { currentUserRole: RoleKey }) {
  const [directory, setDirectory] = useState<DirectoryPayload | null>(null);
  const [companyId, setCompanyId] = useState("");
  const [role, setRole] = useState<RoleKey>("AGENT");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [bulk, setBulk] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [results, setResults] = useState<InviteResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const isSuperAdmin = currentUserRole === "SUPER_ADMIN";
  const availableRoles = useMemo(() => roleOrder.filter((item) => isSuperAdmin || item !== "SUPER_ADMIN"), [isSuperAdmin]);

  async function loadDirectory() {
    setLoading(true);
    setMessage(null);
    const response = await fetch("/api/user-invitations");
    const body = await response.json().catch(() => null);
    setLoading(false);
    if (!response.ok) {
      setMessage(body?.error ?? "Chargement des utilisateurs impossible");
      return;
    }
    setDirectory(body);
    if (!companyId && body.companies?.length) setCompanyId(body.companies[0].id);
    if (body.warning) setMessage(body.warning);
  }

  useEffect(() => {
    void loadDirectory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function invitationsFromForm() {
    if (bulk.trim()) {
      return bulk
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [lineEmail, lineFirstName, lineLastName, lineRole] = splitLine(line);
          const inferred = inferNames(lineEmail || "");
          return {
            email: lineEmail,
            firstName: lineFirstName || inferred.firstName,
            lastName: lineLastName || inferred.lastName,
            role: parseRole(lineRole, role),
            companyId: isSuperAdmin ? companyId || null : null
          };
        });
    }

    return [
      {
        email,
        firstName,
        lastName,
        role,
        companyId: isSuperAdmin ? companyId || null : null
      }
    ];
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setMessage(null);
    setResults([]);

    const invitations = invitationsFromForm();
    const response = await fetch("/api/user-invitations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ invitations })
    });
    const body = await response.json().catch(() => null);
    setSending(false);
    if (!response.ok) {
      setMessage(body?.error ?? "Envoi des invitations impossible");
      return;
    }
    setResults(body.results ?? []);
    setEmail("");
    setFirstName("");
    setLastName("");
    setBulk("");
    await loadDirectory();
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Comptes" value={directory?.users.length ?? 0} trend="Tous statuts" icon={UsersRound} />
        <StatCard label="Invitations" value={directory?.invitations.length ?? 0} trend="100 dernières" icon={MailPlus} />
        <StatCard label="Rôles disponibles" value={availableRoles.length} trend="Selon vos droits" icon={Send} />
      </div>

      <form onSubmit={submit} className="surface rounded-lg p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold text-ink-950 dark:text-white">Inviter un ou plusieurs utilisateurs</p>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-ink-500 dark:text-ink-300">
              Chaque personne reçoit un lien sécurisé pour créer son mot de passe. Les invitations groupées acceptent une ligne par personne : email ; prénom ; nom ; rôle.
            </p>
          </div>
          <button type="button" className="button-secondary" onClick={() => void loadDirectory()} disabled={loading}>
            <RefreshCw className="h-4 w-4" />
            Actualiser
          </button>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-4">
          {isSuperAdmin ? (
            <label>
              <span className="label">Entreprise</span>
              <select className="field mt-2" value={companyId} onChange={(event) => setCompanyId(event.target.value)}>
                <option value="">Plateforme seulement</option>
                {directory?.companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label>
            <span className="label">Rôle</span>
            <select className="field mt-2" value={role} onChange={(event) => setRole(event.target.value as RoleKey)}>
              {availableRoles.map((item) => (
                <option key={item} value={item}>
                  {roleLabels[item]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="label">Email</span>
            <input className="field mt-2" type="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={Boolean(bulk.trim())} required={!bulk.trim()} />
          </label>
          <label>
            <span className="label">Prénom</span>
            <input className="field mt-2" value={firstName} onChange={(event) => setFirstName(event.target.value)} disabled={Boolean(bulk.trim())} required={!bulk.trim()} />
          </label>
          <label>
            <span className="label">Nom</span>
            <input className="field mt-2" value={lastName} onChange={(event) => setLastName(event.target.value)} disabled={Boolean(bulk.trim())} required={!bulk.trim()} />
          </label>
        </div>

        <label className="mt-4 block">
          <span className="label">Invitation groupée</span>
          <textarea
            className="field mt-2 min-h-28 py-3"
            value={bulk}
            onChange={(event) => setBulk(event.target.value)}
            placeholder="agent1@email.fr ; David ; Dohr ; AGENT"
          />
        </label>

        {message ? <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 dark:bg-amber-500/15 dark:text-amber-100">{message}</p> : null}

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-ink-500 dark:text-ink-300">SMTP Render requis pour l’envoi réel. Sans SMTP, SENTINELLE crée l’invitation et affiche un lien de secours.</p>
          <button className="button-primary" disabled={sending}>
            <Send className="h-4 w-4" />
            {sending ? "Envoi..." : "Envoyer les invitations"}
          </button>
        </div>
      </form>

      {results.length ? (
        <div className="surface rounded-lg p-5">
          <p className="text-sm font-semibold text-ink-950 dark:text-white">Résultat de l’envoi</p>
          <div className="mt-4 space-y-3">
            {results.map((result) => (
              <div key={result.email} className="rounded-lg border border-ink-200 p-3 text-sm dark:border-white/10">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-ink-950 dark:text-white">{result.email}</p>
                    <p className="mt-1 text-ink-500 dark:text-ink-300">{result.message ?? result.status}</p>
                  </div>
                  <Badge tone={result.status === "erreur" || result.status === "refusé" ? "severity" : "status"}>{result.status}</Badge>
                </div>
                {result.activationUrl ? (
                  <div className="mt-3 flex flex-col gap-2 rounded-lg bg-ink-50 p-3 dark:bg-white/5">
                    <p className="break-all text-xs text-ink-600 dark:text-ink-300">{result.activationUrl}</p>
                    <button type="button" className="button-secondary h-9 self-start" onClick={() => navigator.clipboard?.writeText(result.activationUrl || "")}>
                      Copier le lien
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <DataTable
        columns={["Nom", "Email", "Rôle", "Entreprise", "Statut", "Dernière connexion"]}
        rows={(directory?.users ?? []).map((user) => [
          `${user.firstName} ${user.lastName}`,
          user.email,
          roleLabels[user.role],
          user.companyName,
          <Badge key={user.id}>{user.status}</Badge>,
          formatDate(user.lastLoginAt)
        ])}
      />

      <DataTable
        columns={["Invitation", "Rôle", "Entreprise", "Statut", "Envoi", "Expiration"]}
        rows={(directory?.invitations ?? []).map((invitation) => [
          `${invitation.firstName} ${invitation.lastName} - ${invitation.email}`,
          roleLabels[invitation.role],
          invitation.companyName,
          <Badge key={invitation.id} tone={invitation.status === "PENDING" ? "neutral" : "status"}>{invitation.status}</Badge>,
          invitation.sentAt ? formatDate(invitation.sentAt) : invitation.lastEmailError ?? "Non envoyé",
          formatDate(invitation.expiresAt)
        ])}
      />
    </div>
  );
}
