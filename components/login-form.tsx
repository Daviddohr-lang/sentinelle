"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { demoCredentials } from "@/lib/constants";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("admin@ops.example");
  const [password, setPassword] = useState("Sentinelle2026!");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    setLoading(false);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error ?? "Connexion impossible");
      return;
    }
    router.push(params.get("next") || "/");
    router.refresh();
  }

  return (
    <div className="grid min-h-screen bg-ink-50 dark:bg-ink-950 lg:grid-cols-[1fr_460px]">
      <section className="flex min-h-[42vh] flex-col justify-between bg-ink-950 p-8 text-white lg:min-h-screen lg:p-12">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-sentinel-500">
            <ShieldCheck className="h-6 w-6" />
          </span>
          <div>
            <p className="text-lg font-bold tracking-normal">SENTINELLE</p>
            <p className="text-sm text-ink-300">Controle qualite securite privee</p>
          </div>
        </div>
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-normal text-sentinel-200">SaaS metier</p>
          <h1 className="mt-4 text-3xl font-semibold leading-tight sm:text-4xl">Conformite, audit terrain, QCM et pilotage qualite dans un meme espace securise.</h1>
          <p className="mt-5 max-w-2xl text-sm leading-6 text-ink-300">
            Architecture multi-entreprise, separation des donnees, controles terrain horodates, non-conformites suivies, rapports PDF et mode hors ligne prepare.
          </p>
        </div>
        <div className="grid gap-3 text-sm text-ink-300 sm:grid-cols-3">
          <span>CNAPS & deontologie</span>
          <span>PWA terrain</span>
          <span>RBAC par role</span>
        </div>
      </section>
      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="surface rounded-lg p-6">
            <h2 className="text-xl font-semibold text-ink-950 dark:text-white">Connexion</h2>
            <p className="mt-2 text-sm leading-6 text-ink-500 dark:text-ink-300">Utilisez un compte de demonstration ou un utilisateur cree en base.</p>
            <form onSubmit={submit} className="mt-6 space-y-4">
              <div>
                <label className="label" htmlFor="email">
                  Email
                </label>
                <input id="email" value={email} onChange={(event) => setEmail(event.target.value)} className="field mt-2" type="email" autoComplete="email" />
              </div>
              <div>
                <label className="label" htmlFor="password">
                  Mot de passe
                </label>
                <input id="password" value={password} onChange={(event) => setPassword(event.target.value)} className="field mt-2" type="password" autoComplete="current-password" />
              </div>
              {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:bg-red-500/15 dark:text-red-100">{error}</p> : null}
              <button className="button-primary w-full" disabled={loading}>
                {loading ? "Connexion..." : "Se connecter"}
              </button>
            </form>
          </div>
          <div className="mt-4 rounded-lg border border-ink-200 bg-white p-4 text-xs text-ink-600 dark:border-white/10 dark:bg-ink-900 dark:text-ink-300">
            <p className="font-semibold text-ink-900 dark:text-white">Comptes demo</p>
            <div className="mt-3 space-y-2">
              {demoCredentials.map(([label, login, demoPassword]) => (
                <button
                  key={login}
                  type="button"
                  onClick={() => {
                    setEmail(login);
                    setPassword(demoPassword);
                  }}
                  className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left hover:bg-ink-50 dark:hover:bg-white/10"
                >
                  <span>{label}</span>
                  <span className="truncate text-ink-400">{login}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
