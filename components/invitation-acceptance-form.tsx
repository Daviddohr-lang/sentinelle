"use client";

import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { roleLabels } from "@/lib/constants";

type InvitationDetails = {
  email: string;
  firstName: string;
  lastName: string;
  role: keyof typeof roleLabels;
  companyName: string;
  expiresAt: string;
};

export function InvitationAcceptanceForm({ token }: { token: string }) {
  const router = useRouter();
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadInvitation() {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/invitations/${encodeURIComponent(token)}`);
      const body = await response.json().catch(() => null);
      if (!mounted) return;
      setLoading(false);
      if (!response.ok) {
        setError(body?.error ?? "Invitation indisponible");
        return;
      }
      setInvitation(body.invitation);
      setFirstName(body.invitation.firstName);
      setLastName(body.invitation.lastName);
    }
    void loadInvitation();
    return () => {
      mounted = false;
    };
  }, [token]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (password.length < 12) {
      setError("Le mot de passe doit contenir au moins 12 caractères.");
      return;
    }
    if (password !== confirmation) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setSubmitting(true);
    const response = await fetch(`/api/invitations/${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ firstName, lastName, phone, password })
    });
    const body = await response.json().catch(() => null);
    setSubmitting(false);
    if (!response.ok) {
      setError(body?.error ?? "Activation impossible");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="grid min-h-screen bg-ink-50 dark:bg-ink-950 lg:grid-cols-[1fr_480px]">
      <section className="flex min-h-[34vh] flex-col justify-between bg-ink-950 p-8 text-white lg:min-h-screen lg:p-12">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-sentinel-500">
            <ShieldCheck className="h-6 w-6" />
          </span>
          <div>
            <p className="text-lg font-bold tracking-normal">SENTINELLE</p>
            <p className="text-sm text-ink-300">Invitation sécurisée</p>
          </div>
        </div>
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-normal text-sentinel-200">Création de compte</p>
          <h1 className="mt-4 text-3xl font-semibold leading-tight sm:text-4xl">Activez votre espace professionnel.</h1>
          <p className="mt-5 max-w-2xl text-sm leading-6 text-ink-300">
            Votre accès est lié à votre rôle, votre entreprise et vos droits de consultation dans SENTINELLE.
          </p>
        </div>
        <div className="grid gap-3 text-sm text-ink-300 sm:grid-cols-3">
          <span>Compte nominatif</span>
          <span>Mot de passe personnel</span>
          <span>Accès par rôle</span>
        </div>
      </section>
      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="surface rounded-lg p-6">
            <h2 className="text-xl font-semibold text-ink-950 dark:text-white">Finaliser l’invitation</h2>
            {loading ? <p className="mt-4 text-sm text-ink-500 dark:text-ink-300">Vérification du lien...</p> : null}
            {!loading && error && !invitation ? <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:bg-red-500/15 dark:text-red-100">{error}</p> : null}
            {invitation ? (
              <>
                <div className="mt-4 rounded-lg bg-sentinel-50 p-4 text-sm text-sentinel-950 dark:bg-sentinel-500/15 dark:text-sentinel-50">
                  <p className="font-semibold">{invitation.companyName}</p>
                  <p className="mt-1">{invitation.email}</p>
                  <p className="mt-1">{roleLabels[invitation.role]}</p>
                </div>
                <form onSubmit={submit} className="mt-6 space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label>
                      <span className="label">Prénom</span>
                      <input className="field mt-2" value={firstName} onChange={(event) => setFirstName(event.target.value)} required />
                    </label>
                    <label>
                      <span className="label">Nom</span>
                      <input className="field mt-2" value={lastName} onChange={(event) => setLastName(event.target.value)} required />
                    </label>
                  </div>
                  <label>
                    <span className="label">Téléphone</span>
                    <input className="field mt-2" value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" />
                  </label>
                  <label>
                    <span className="label">Mot de passe</span>
                    <input className="field mt-2" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" required />
                  </label>
                  <label>
                    <span className="label">Confirmer le mot de passe</span>
                    <input className="field mt-2" type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" required />
                  </label>
                  {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:bg-red-500/15 dark:text-red-100">{error}</p> : null}
                  <button className="button-primary w-full" disabled={submitting}>
                    {submitting ? "Activation..." : "Activer mon compte"}
                  </button>
                </form>
              </>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
