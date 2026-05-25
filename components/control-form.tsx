"use client";

import { Camera, FileUp, LocateFixed, Mic, Save, Signature, WifiOff } from "lucide-react";
import type { PointerEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { demoAgents, demoClients, demoControlItems, demoSites } from "@/lib/demo-data";
import { cn } from "@/lib/utils";

type SignatureCanvasProps = {
  label: string;
  onChange: (value: string) => void;
};

function SignatureCanvas({ label, onChange }: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);

  function point(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function start(event: PointerEvent<HTMLCanvasElement>) {
    drawing.current = true;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const p = point(event);
    if (!ctx || !p) return;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  }

  function move(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const p = point(event);
    if (!ctx || !p) return;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#124740";
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }

  function end() {
    drawing.current = false;
    const canvas = canvasRef.current;
    if (canvas) onChange(canvas.toDataURL("image/png"));
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onChange("");
  }

  return (
    <div className="rounded-lg border border-ink-200 bg-white p-3 dark:border-white/10 dark:bg-ink-950">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm font-semibold text-ink-800 dark:text-ink-100">
          <Signature className="h-4 w-4" />
          {label}
        </span>
        <button type="button" onClick={clear} className="text-xs font-semibold text-ink-500 hover:text-red-700">
          Effacer
        </button>
      </div>
      <canvas
        ref={canvasRef}
        width={520}
        height={150}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        className="h-32 w-full touch-none rounded-md bg-ink-50 dark:bg-white"
      />
    </div>
  );
}

export function ControlForm() {
  const [agentId, setAgentId] = useState(demoAgents[0]?.id ?? "");
  const [clientId, setClientId] = useState(demoClients[0]?.id ?? "");
  const availableSites = useMemo(() => demoSites.filter((site) => site.clientId === clientId), [clientId]);
  const [siteId, setSiteId] = useState(availableSites[0]?.id ?? demoSites[0]?.id ?? "");
  const [type, setType] = useState<"PROGRAMME" | "INOPINE">("INOPINE");
  const [position, setPosition] = useState<{ latitude?: number; longitude?: number; address: string }>({ address: "Geolocalisation en attente" });
  const [scores, setScores] = useState<Record<string, number>>(() => Object.fromEntries(demoControlItems.map((item) => [item.id, 100])));
  const [evidence, setEvidence] = useState<Record<string, string>>({});
  const [agentSignature, setAgentSignature] = useState("");
  const [controllerSignature, setControllerSignature] = useState("");
  const [observations, setObservations] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    setSiteId(availableSites[0]?.id ?? demoSites[0]?.id ?? "");
  }, [availableSites]);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setPosition({ address: "Geolocalisation non disponible sur cet appareil" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (result) =>
        setPosition({
          latitude: result.coords.latitude,
          longitude: result.coords.longitude,
          address: `Position detectee (${result.coords.latitude.toFixed(5)}, ${result.coords.longitude.toFixed(5)})`
        }),
      () => setPosition({ address: "Geolocalisation refusee ou indisponible" }),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  const globalScore = useMemo(() => {
    const weighted = demoControlItems.reduce(
      (acc, item) => {
        if (!item.impactsGlobalScore) return acc;
        return {
          score: acc.score + (scores[item.id] ?? 100) * item.coefficient,
          coefficient: acc.coefficient + item.coefficient
        };
      },
      { score: 0, coefficient: 0 }
    );
    return weighted.coefficient ? Math.round(weighted.score / weighted.coefficient) : 0;
  }, [scores]);

  async function submit() {
    const payload = {
      type,
      agentId,
      clientId,
      siteId,
      latitude: position.latitude,
      longitude: position.longitude,
      detectedAddress: position.address,
      observations,
      agentSignature,
      controllerSignature,
      itemResults: demoControlItems.map((item) => ({
        itemDefinitionId: item.id,
        score: scores[item.id] ?? 100,
        comment: evidence[item.id] ? `Preuve demandee: ${evidence[item.id]}` : undefined
      }))
    };

    if (!navigator.onLine) {
      const queue = JSON.parse(localStorage.getItem("sentinelle-offline-controls") ?? "[]") as unknown[];
      queue.push({ payload, queuedAt: new Date().toISOString() });
      localStorage.setItem("sentinelle-offline-controls", JSON.stringify(queue));
      setStatus("Controle conserve hors ligne. Synchronisation prevue au retour reseau.");
      return;
    }

    const response = await fetch("/api/controls", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      setStatus("Controle conserve en local car l'API n'a pas repondu.");
      const queue = JSON.parse(localStorage.getItem("sentinelle-offline-controls") ?? "[]") as unknown[];
      queue.push({ payload, queuedAt: new Date().toISOString() });
      localStorage.setItem("sentinelle-offline-controls", JSON.stringify(queue));
      return;
    }
    setStatus("Controle enregistre et transmis pour validation.");
  }

  return (
    <div className="space-y-6">
      <div className="surface rounded-lg p-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="label">Type de controle</label>
            <div className="mt-2 grid grid-cols-2 rounded-lg border border-ink-200 p-1 dark:border-white/10">
              {(["INOPINE", "PROGRAMME"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setType(value)}
                  className={cn("rounded-md px-3 py-2 text-sm font-semibold", type === value ? "bg-sentinel-700 text-white" : "text-ink-600 dark:text-ink-300")}
                >
                  {value === "INOPINE" ? "Inopine" : "Programme"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label" htmlFor="client">
              Client
            </label>
            <select id="client" value={clientId} onChange={(event) => setClientId(event.target.value)} className="field mt-2">
              {demoClients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="site">
              Site
            </label>
            <select id="site" value={siteId} onChange={(event) => setSiteId(event.target.value)} className="field mt-2">
              {availableSites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="agent">
              Agent controle
            </label>
            <select id="agent" value={agentId} onChange={(event) => setAgentId(event.target.value)} className="field mt-2">
              {demoAgents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.firstName} {agent.lastName}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-3 rounded-lg bg-ink-50 p-4 text-sm text-ink-700 dark:bg-white/5 dark:text-ink-200 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-center gap-2">
            <LocateFixed className="h-4 w-4 text-sentinel-700 dark:text-sentinel-200" />
            {position.address}
          </span>
          <span className="font-semibold">Note globale actuelle : {globalScore} %</span>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {demoControlItems.map((item) => {
          const score = scores[item.id] ?? 100;
          const needsEvidence = score < 80 || (item.blocking && score < 100) || item.photoRequirement === "REQUIRED" || item.fileRequirement === "REQUIRED";
          return (
            <div key={item.id} className="surface rounded-lg p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-ink-950 dark:text-white">{item.label}</p>
                  <p className="mt-1 text-xs text-ink-500 dark:text-ink-300">
                    {item.category} · coefficient {item.coefficient}
                  </p>
                </div>
                {item.blocking ? <span className="rounded-full bg-red-950 px-2.5 py-1 text-xs font-semibold text-white">bloquant</span> : null}
              </div>
              <div className="mt-4">
                <label className="label" htmlFor={`score-${item.id}`}>
                  Note par item : {score} %
                </label>
                <input
                  id={`score-${item.id}`}
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={score}
                  onChange={(event) => setScores((current) => ({ ...current, [item.id]: Number(event.target.value) }))}
                  className="mt-3 w-full accent-sentinel-700"
                />
              </div>
              {needsEvidence ? (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-400/30 dark:bg-amber-500/15">
                  <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">Souhaitez-vous ajouter une preuve ?</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {[
                      ["none", "Non, passer", WifiOff],
                      ["camera", "Prendre photo", Camera],
                      ["upload", "Importer photo", FileUp],
                      ["file", "Ajouter fichier", FileUp],
                      ["voice", "Commentaire vocal", Mic]
                    ].map(([value, label, Icon]) => (
                      <button
                        key={String(value)}
                        type="button"
                        onClick={() => setEvidence((current) => ({ ...current, [item.id]: String(value) }))}
                        className={cn(
                          "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold",
                          evidence[item.id] === value
                            ? "border-sentinel-700 bg-white text-sentinel-800 dark:bg-ink-950 dark:text-sentinel-100"
                            : "border-amber-200 bg-white/70 text-amber-900 dark:border-amber-400/30 dark:bg-white/5 dark:text-amber-100"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="surface rounded-lg p-5">
        <label className="label" htmlFor="observations">
          Observations
        </label>
        <textarea id="observations" value={observations} onChange={(event) => setObservations(event.target.value)} className="field mt-2 h-28 py-3" />
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <SignatureCanvas label="Signature agent" onChange={setAgentSignature} />
          <SignatureCanvas label="Signature controleur" onChange={setControllerSignature} />
        </div>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {status ? <p className="text-sm font-semibold text-sentinel-800 dark:text-sentinel-100">{status}</p> : <span />}
          <button type="button" onClick={submit} className="button-primary">
            <Save className="h-4 w-4" />
            Enregistrer le controle
          </button>
        </div>
      </div>
    </div>
  );
}
