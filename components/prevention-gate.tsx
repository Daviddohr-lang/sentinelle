"use client";

import { ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { demoPrevention } from "@/lib/demo-data";

export function PreventionGate({ enabled }: { enabled: boolean }) {
  const [visible, setVisible] = useState(false);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const today = new Date().toISOString().slice(0, 10);
    setVisible(localStorage.getItem(`sentinelle-prevention-${today}`) !== "ok");
  }, [enabled]);

  if (!visible) return null;

  function validate() {
    const ok = answer.trim().toLowerCase().includes(demoPrevention.expectedAnswer);
    if (!ok) {
      setError(true);
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem(`sentinelle-prevention-${today}`, "ok");
    localStorage.setItem(`sentinelle-prevention-history-${Date.now()}`, JSON.stringify({ messageId: demoPrevention.id, answer, validatedAt: new Date().toISOString() }));
    setVisible(false);
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-ink-950/70 p-4 backdrop-blur">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-soft dark:bg-ink-900">
        <div className="flex items-start gap-3">
          <span className="rounded-lg bg-sentinel-50 p-2 text-sentinel-700 dark:bg-sentinel-500/15 dark:text-sentinel-100">
            <ShieldAlert className="h-5 w-5" />
          </span>
          <div>
            <p className="label">{demoPrevention.title}</p>
            <h2 className="mt-2 text-lg font-semibold text-ink-950 dark:text-white">Lecture obligatoire avant acces</h2>
          </div>
        </div>
        <p className="mt-5 text-sm leading-6 text-ink-600 dark:text-ink-300">{demoPrevention.body}</p>
        <div className="mt-5">
          <label className="label" htmlFor="prevention-answer">
            {demoPrevention.question}
          </label>
          <input id="prevention-answer" value={answer} onChange={(event) => setAnswer(event.target.value)} className="field mt-2" />
          {error ? <p className="mt-2 text-sm font-medium text-red-700 dark:text-red-200">Reponse attendue : main courante.</p> : null}
        </div>
        <button type="button" onClick={validate} className="button-primary mt-5 w-full">
          Valider le message
        </button>
      </div>
    </div>
  );
}
