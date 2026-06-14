"use client";

import { ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { demoPrevention } from "@/lib/demo-data";

type PreventionMessage = {
  id: string;
  title: string;
  theme?: string | null;
  body: string;
  question: string;
  expectedAnswer?: string;
};

export function PreventionGate({ enabled }: { enabled: boolean }) {
  const [visible, setVisible] = useState(false);
  const [answer, setAnswer] = useState("");
  const [message, setMessage] = useState<PreventionMessage | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    async function loadMessage() {
      try {
        const response = await fetch("/api/prevention-messages?activeOnly=1&pending=1");
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Message indisponible");
        const nextMessage = data.messages?.[0] as PreventionMessage | undefined;
        if (!cancelled && nextMessage) {
          setMessage(nextMessage);
          setVisible(true);
        }
      } catch {
        if (!cancelled) {
          const today = new Date().toISOString().slice(0, 10);
          const fallbackVisible = localStorage.getItem(`sentinelle-prevention-${today}`) !== "ok";
          setMessage(demoPrevention);
          setVisible(fallbackVisible);
        }
      }
    }
    loadMessage();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  if (!visible || !message) return null;
  const activeMessage = message;

  async function validate() {
    setError(null);
    try {
      const response = await fetch("/api/prevention-messages/acknowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: activeMessage.id, answer })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Validation impossible");
      if (!result.validated) {
        setError(`Réponse attendue : ${result.expectedAnswer ?? activeMessage.expectedAnswer ?? "réponse exacte"}.`);
        return;
      }
      setVisible(false);
    } catch {
      const expectedAnswer = activeMessage.expectedAnswer ?? demoPrevention.expectedAnswer;
      const ok = answer.trim().toLowerCase().includes(expectedAnswer);
      if (!ok) {
        setError(`Réponse attendue : ${expectedAnswer}.`);
        return;
      }
      const today = new Date().toISOString().slice(0, 10);
      localStorage.setItem(`sentinelle-prevention-${today}`, "ok");
      localStorage.setItem(`sentinelle-prevention-history-${Date.now()}`, JSON.stringify({ messageId: activeMessage.id, answer, validatedAt: new Date().toISOString() }));
      setVisible(false);
    }
  }

  function updateAnswer(value: string) {
    if (error) {
      setError(null);
    }
    setAnswer(value);
  }

  function titleLine() {
    return activeMessage.theme ? `${activeMessage.title} - ${activeMessage.theme}` : activeMessage.title;
  }

  async function onValidateClick() {
    if (!answer.trim()) {
      setError("Réponse obligatoire.");
      return;
    }
    await validate();
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-ink-950/70 p-4 backdrop-blur">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-soft dark:bg-ink-900">
        <div className="flex items-start gap-3">
          <span className="rounded-lg bg-sentinel-50 p-2 text-sentinel-700 dark:bg-sentinel-500/15 dark:text-sentinel-100">
            <ShieldAlert className="h-5 w-5" />
          </span>
          <div>
            <p className="label">{titleLine()}</p>
            <h2 className="mt-2 text-lg font-semibold text-ink-950 dark:text-white">Lecture obligatoire avant acces</h2>
          </div>
        </div>
        <p className="mt-5 text-sm leading-6 text-ink-600 dark:text-ink-300">{activeMessage.body}</p>
        <div className="mt-5">
          <label className="label" htmlFor="prevention-answer">
            {activeMessage.question}
          </label>
          <input id="prevention-answer" value={answer} onChange={(event) => updateAnswer(event.target.value)} className="field mt-2" />
          {error ? <p className="mt-2 text-sm font-medium text-red-700 dark:text-red-200">{error}</p> : null}
        </div>
        <button type="button" onClick={() => void onValidateClick()} className="button-primary mt-5 w-full">
          Valider le message
        </button>
      </div>
    </div>
  );
}
