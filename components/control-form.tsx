"use client";

import {
  AlertTriangle,
  BookOpenCheck,
  Camera,
  CheckCircle2,
  ClipboardList,
  FileUp,
  LocateFixed,
  Mic,
  Save,
  ShieldAlert,
  Signature,
  SlidersHorizontal,
  WifiOff,
  type LucideIcon
} from "lucide-react";
import type { PointerEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildInitialControlLibrary,
  calculateControlScore,
  controlLibraryPointCount,
  type ControlCriterionSeed,
  type ControlPointResponseOptionSeed,
  type ControlPointSeed,
  type ControlTemplateSeed
} from "@/lib/control-template-library";
import { demoAgents, demoClients, demoCompany, demoSites } from "@/lib/demo-data";
import { cn } from "@/lib/utils";

const evidenceOptions: Array<{ value: string; label: string; icon: LucideIcon }> = [
  { value: "none", label: "Passer", icon: WifiOff },
  { value: "camera", label: "Photo", icon: Camera },
  { value: "upload", label: "Importer", icon: FileUp },
  { value: "file", label: "Fichier", icon: FileUp },
  { value: "voice", label: "Vocal", icon: Mic }
];

const qcmCategories = [
  { id: "ENTREPRISE", label: "QCM entreprise", coefficient: 1 },
  { id: "METIER", label: "QCM métier", coefficient: 2 },
  { id: "CLIENT_SITE", label: "QCM client/site", coefficient: 3 }
] as const;

const impactClasses: Record<string, string> = {
  VERT: "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-400/30 dark:bg-emerald-500/15 dark:text-emerald-100",
  JAUNE: "border-yellow-200 bg-yellow-50 text-yellow-900 dark:border-yellow-400/30 dark:bg-yellow-500/15 dark:text-yellow-100",
  ORANGE: "border-orange-200 bg-orange-50 text-orange-900 dark:border-orange-400/30 dark:bg-orange-500/15 dark:text-orange-100",
  ROUGE: "border-red-200 bg-red-50 text-red-900 dark:border-red-400/30 dark:bg-red-500/15 dark:text-red-100",
  CRITIQUE: "border-red-700 bg-red-950 text-white dark:border-red-300 dark:bg-red-950 dark:text-white"
};

type LibraryData = {
  templates: ControlTemplateSeed[];
  criteria: ControlCriterionSeed[];
  points: ControlPointSeed[];
  responseOptions: ControlPointResponseOptionSeed[];
  agents: typeof demoAgents;
  clients: typeof demoClients;
  sites: typeof demoSites;
};

type NonConformityDraft = {
  observation: string;
  severity: string;
  action: string;
  delayHours: number;
  proofMode: string;
  notification: boolean;
  clientVisible: boolean;
};

type SignatureCanvasProps = {
  label: string;
  onChange: (value: string) => void;
};

function fallbackLibrary(): LibraryData {
  const createdAt = new Date().toISOString();
  const library = buildInitialControlLibrary(demoCompany.id, createdAt);
  return {
    templates: library.controlTemplates,
    criteria: library.controlCriteria,
    points: library.controlPoints,
    responseOptions: library.controlPointResponseOptions,
    agents: demoAgents,
    clients: demoClients,
    sites: demoSites
  };
}

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

function firstDefaultOption(options: ControlPointResponseOptionSeed[]) {
  return options.find((option) => option.status === "CONFORME" && option.impactLevel === "VERT") ?? options[0];
}

function toDraft(option: ControlPointResponseOptionSeed): NonConformityDraft {
  return {
    observation: "",
    severity: option.severity,
    action: option.correctiveAction ?? "Action corrective à préciser par le contrôleur.",
    delayHours: option.correctionDelayHours ?? 48,
    proofMode: option.blocking ? "camera" : "none",
    notification: option.notificationRequired,
    clientVisible: option.visibleInClientReport
  };
}

export function ControlForm() {
  const [library, setLibrary] = useState<LibraryData>(() => fallbackLibrary());
  const [libraryStatus, setLibraryStatus] = useState("Référentiel OPS chargé localement.");
  const [templateId, setTemplateId] = useState("");
  const [selectedCriteria, setSelectedCriteria] = useState<string[]>([]);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [ncDrafts, setNcDrafts] = useState<Record<string, NonConformityDraft>>({});
  const [agentId, setAgentId] = useState(demoAgents[0]?.id ?? "");
  const [clientId, setClientId] = useState(demoClients[0]?.id ?? "");
  const [siteId, setSiteId] = useState(demoSites[0]?.id ?? "");
  const [type, setType] = useState<"PROGRAMME" | "INOPINE">("INOPINE");
  const [position, setPosition] = useState<{ latitude?: number; longitude?: number; address: string }>({ address: "Géolocalisation en attente" });
  const [observations, setObservations] = useState("");
  const [agentSignature, setAgentSignature] = useState("");
  const [controllerSignature, setControllerSignature] = useState("");
  const [selectedQcms, setSelectedQcms] = useState<string[]>(["ENTREPRISE"]);
  const [status, setStatus] = useState<string | null>(null);
  const [adminCriterionId, setAdminCriterionId] = useState("");
  const [adminPointLabel, setAdminPointLabel] = useState("");
  const [adminBlocking, setAdminBlocking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadLibrary() {
      try {
        const response = await fetch("/api/control-library");
        if (!response.ok) throw new Error("Référentiel indisponible");
        const data = await response.json();
        if (cancelled) return;
        setLibrary({
          templates: data.templates ?? [],
          criteria: data.criteria ?? [],
          points: data.points ?? [],
          responseOptions: data.responseOptions ?? [],
          agents: data.agents?.length ? data.agents : demoAgents,
          clients: data.clients?.length ? data.clients : demoClients,
          sites: data.sites?.length ? data.sites : demoSites
        });
        setLibraryStatus(`${data.source === "database" ? "Base de données" : "Persistance locale"} : ${data.stats?.criteria ?? 0} critères, ${data.stats?.points ?? 0} points.`);
      } catch {
        if (!cancelled) setLibraryStatus(`Mode démonstration : 12 critères, ${controlLibraryPointCount()} points.`);
      }
    }
    loadLibrary();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const firstTemplate = library.templates[0]?.id ?? "";
    if (!templateId && firstTemplate) setTemplateId(firstTemplate);
  }, [library.templates, templateId]);

  const criteriaForTemplate = useMemo(
    () => library.criteria.filter((criterion) => criterion.templateId === templateId).sort((a, b) => a.sortOrder - b.sortOrder),
    [library.criteria, templateId]
  );

  useEffect(() => {
    if (!criteriaForTemplate.length) return;
    setSelectedCriteria((current) => (current.length ? current.filter((criterionId) => criteriaForTemplate.some((criterion) => criterion.id === criterionId)) : criteriaForTemplate.map((criterion) => criterion.id)));
    setAdminCriterionId((current) => current || criteriaForTemplate[0]?.id || "");
  }, [criteriaForTemplate]);

  const availableSites = useMemo(() => library.sites.filter((site) => site.clientId === clientId), [clientId, library.sites]);

  useEffect(() => {
    setSiteId((current) => (availableSites.some((site) => site.id === current) ? current : availableSites[0]?.id ?? library.sites[0]?.id ?? ""));
  }, [availableSites, library.sites]);

  useEffect(() => {
    if (!agentId && library.agents[0]) setAgentId(library.agents[0].id);
    if (!clientId && library.clients[0]) setClientId(library.clients[0].id);
  }, [agentId, clientId, library.agents, library.clients]);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setPosition({ address: "Géolocalisation non disponible sur cet appareil" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (result) =>
        setPosition({
          latitude: result.coords.latitude,
          longitude: result.coords.longitude,
          address: `Position détectée (${result.coords.latitude.toFixed(5)}, ${result.coords.longitude.toFixed(5)})`
        }),
      () => setPosition({ address: "Géolocalisation refusée ou indisponible" }),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  const selectedCriterionSet = useMemo(() => new Set(selectedCriteria), [selectedCriteria]);
  const pointsForSelectedCriteria = useMemo(
    () => library.points.filter((point) => selectedCriterionSet.has(point.criterionId)).sort((a, b) => a.sortOrder - b.sortOrder),
    [library.points, selectedCriterionSet]
  );
  const optionsByPoint = useMemo(() => {
    const map = new Map<string, ControlPointResponseOptionSeed[]>();
    for (const option of library.responseOptions) {
      const existing = map.get(option.pointId) ?? [];
      existing.push(option);
      map.set(option.pointId, existing.sort((a, b) => a.sortOrder - b.sortOrder));
    }
    return map;
  }, [library.responseOptions]);

  useEffect(() => {
    setResponses((current) => {
      const next = { ...current };
      for (const point of pointsForSelectedCriteria) {
        if (!next[point.id]) {
          const option = firstDefaultOption(optionsByPoint.get(point.id) ?? []);
          if (option) next[point.id] = option.id;
        }
      }
      return next;
    });
  }, [optionsByPoint, pointsForSelectedCriteria]);

  const pointSelections = useMemo(
    () =>
      pointsForSelectedCriteria
        .map((point) => ({
          criterionId: point.criterionId,
          pointId: point.id,
          responseOptionId: responses[point.id],
          observation: ncDrafts[point.id]?.observation
        }))
        .filter((selection) => Boolean(selection.responseOptionId)),
    [ncDrafts, pointsForSelectedCriteria, responses]
  );

  const score = useMemo(
    () =>
      calculateControlScore(
        {
          controlCriteria: library.criteria,
          controlPoints: library.points,
          controlPointResponseOptions: library.responseOptions
        },
        selectedCriteria,
        pointSelections
      ),
    [library.criteria, library.points, library.responseOptions, pointSelections, selectedCriteria]
  );

  const responseById = useMemo(() => new Map(library.responseOptions.map((option) => [option.id, option])), [library.responseOptions]);

  function toggleCriterion(criterionId: string) {
    setSelectedCriteria((current) => (current.includes(criterionId) ? current.filter((id) => id !== criterionId) : [...current, criterionId]));
  }

  function selectResponse(point: ControlPointSeed, option: ControlPointResponseOptionSeed) {
    setResponses((current) => ({ ...current, [point.id]: option.id }));
    if (option.status === "NON_CONFORME") {
      setNcDrafts((current) => ({ ...current, [point.id]: current[point.id] ?? toDraft(option) }));
    }
  }

  function updateDraft(pointId: string, patch: Partial<NonConformityDraft>) {
    setNcDrafts((current) => ({ ...current, [pointId]: { ...(current[pointId] ?? toDraft(responseById.get(responses[pointId]) as ControlPointResponseOptionSeed)), ...patch } }));
  }

  async function addAdminPoint() {
    if (!adminCriterionId || !adminPointLabel.trim()) return;
    const response = await fetch("/api/control-library", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "create-point",
        point: {
          criterionId: adminCriterionId,
          label: adminPointLabel,
          blocking: adminBlocking,
          defaultSeverity: adminBlocking ? "CRITIQUE" : "MINEURE",
          defaultCorrectionDelayHours: adminBlocking ? 0 : 48,
          photoRequirement: adminBlocking ? "REQUIRED" : "OPTIONAL",
          visibleInClientReport: !adminBlocking
        }
      })
    });
    if (!response.ok) {
      setStatus("Le point n'a pas pu être ajouté au référentiel.");
      return;
    }
    setAdminPointLabel("");
    setAdminBlocking(false);
    const refreshed = await fetch("/api/control-library");
    if (refreshed.ok) {
      const data = await refreshed.json();
      setLibrary((current) => ({
        ...current,
        templates: data.templates ?? current.templates,
        criteria: data.criteria ?? current.criteria,
        points: data.points ?? current.points,
        responseOptions: data.responseOptions ?? current.responseOptions
      }));
    }
    setStatus("Point de contrôle ajouté au référentiel.");
  }

  async function submit() {
    const payload = {
      type,
      templateId,
      selectedCriterionIds: selectedCriteria,
      pointResults: pointSelections,
      agentId,
      clientId,
      siteId,
      latitude: position.latitude,
      longitude: position.longitude,
      detectedAddress: position.address,
      observations,
      agentSignature,
      controllerSignature,
      qcmCategories: selectedQcms
    };

    if (!navigator.onLine) {
      const queue = JSON.parse(localStorage.getItem("sentinelle-offline-controls") ?? "[]") as unknown[];
      queue.push({ payload, queuedAt: new Date().toISOString() });
      localStorage.setItem("sentinelle-offline-controls", JSON.stringify(queue));
      setStatus("Contrôle conservé hors ligne. Synchronisation prévue au retour réseau.");
      return;
    }

    const response = await fetch("/api/controls", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const queue = JSON.parse(localStorage.getItem("sentinelle-offline-controls") ?? "[]") as unknown[];
      queue.push({ payload, queuedAt: new Date().toISOString() });
      localStorage.setItem("sentinelle-offline-controls", JSON.stringify(queue));
      setStatus("Contrôle conservé en local car l'API n'a pas répondu.");
      return;
    }
    const data = await response.json();
    setStatus(`Contrôle enregistré : ${data.generatedNonConformities ?? 0} non-conformité(s), ${data.criticalAlerts ?? 0} alerte(s) critique(s), 4 rapports préparés.`);
  }

  return (
    <div className="space-y-6">
      <div className="surface rounded-lg p-5">
        <div className="grid gap-4 lg:grid-cols-4">
          <div>
            <label className="label">Type de contrôle</label>
            <div className="mt-2 grid grid-cols-2 rounded-lg border border-ink-200 p-1 dark:border-white/10">
              {(["INOPINE", "PROGRAMME"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setType(value)}
                  className={cn("rounded-md px-3 py-2 text-sm font-semibold", type === value ? "bg-sentinel-700 text-white" : "text-ink-600 dark:text-ink-300")}
                >
                  {value === "INOPINE" ? "Inopiné" : "Programmé"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label" htmlFor="client">
              Client
            </label>
            <select id="client" value={clientId} onChange={(event) => setClientId(event.target.value)} className="field mt-2">
              {library.clients.map((client) => (
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
              Agent contrôlé
            </label>
            <select id="agent" value={agentId} onChange={(event) => setAgentId(event.target.value)} className="field mt-2">
              {library.agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.firstName} {agent.lastName}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 grid gap-3 text-sm md:grid-cols-4">
          <div className="rounded-lg bg-ink-50 p-3 dark:bg-white/5">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500 dark:text-ink-300">Référentiel</p>
            <p className="mt-1 font-semibold text-ink-950 dark:text-white">{libraryStatus}</p>
          </div>
          <div className="rounded-lg bg-ink-50 p-3 dark:bg-white/5">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500 dark:text-ink-300">Sélection</p>
            <p className="mt-1 font-semibold text-ink-950 dark:text-white">
              {selectedCriteria.length} critères, {pointsForSelectedCriteria.length} points
            </p>
          </div>
          <div className="rounded-lg bg-ink-50 p-3 dark:bg-white/5">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500 dark:text-ink-300">Note</p>
            <p className="mt-1 font-semibold text-ink-950 dark:text-white">{score.globalScore} %</p>
          </div>
          <div className="rounded-lg bg-ink-50 p-3 dark:bg-white/5">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500 dark:text-ink-300">Conformité</p>
            <p className="mt-1 font-semibold text-ink-950 dark:text-white">{score.complianceLevel}</p>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-3 rounded-lg bg-ink-50 p-4 text-sm text-ink-700 dark:bg-white/5 dark:text-ink-200 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-center gap-2">
            <LocateFixed className="h-4 w-4 text-sentinel-700 dark:text-sentinel-200" />
            {position.address}
          </span>
          <span className="font-semibold">Rapports préparés : interne, agent, direction, client simplifié</span>
        </div>
      </div>

      <div className="surface rounded-lg p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-ink-950 dark:text-white">
              <ClipboardList className="h-4 w-4" />
              Critères à contrôler
            </p>
            <p className="mt-1 text-sm text-ink-500 dark:text-ink-300">Un contrôle peut porter sur un seul critère, plusieurs critères ou le référentiel complet.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" className="button-secondary" onClick={() => setSelectedCriteria(criteriaForTemplate.map((criterion) => criterion.id))}>
              Tout sélectionner
            </button>
            <button type="button" className="button-secondary" onClick={() => setSelectedCriteria([])}>
              Vider
            </button>
          </div>
        </div>
        <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {criteriaForTemplate.map((criterion) => {
            const active = selectedCriteria.includes(criterion.id);
            const criterionScore = score.criterionScores.find((item) => item.criterionId === criterion.id)?.score ?? 100;
            return (
              <button
                key={criterion.id}
                type="button"
                onClick={() => toggleCriterion(criterion.id)}
                className={cn(
                  "flex min-h-20 items-start justify-between gap-3 rounded-lg border p-3 text-left transition",
                  active ? "border-sentinel-700 bg-sentinel-50 dark:border-sentinel-300 dark:bg-sentinel-500/15" : "border-ink-200 bg-white dark:border-white/10 dark:bg-ink-950"
                )}
              >
                <span>
                  <span className="block text-sm font-semibold text-ink-950 dark:text-white">{criterion.sortOrder}. {criterion.label}</span>
                  <span className="mt-1 block text-xs text-ink-500 dark:text-ink-300">Coefficient {criterion.coefficient}</span>
                </span>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-ink-700 shadow-sm dark:bg-ink-900 dark:text-ink-100">{criterionScore} %</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="surface rounded-lg p-5">
        <p className="flex items-center gap-2 text-sm font-semibold text-ink-950 dark:text-white">
          <BookOpenCheck className="h-4 w-4" />
          QCM intégrés au contrôle
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {qcmCategories.map((category) => {
            const active = selectedQcms.includes(category.id);
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => setSelectedQcms((current) => (current.includes(category.id) ? current.filter((item) => item !== category.id) : [...current, category.id]))}
                className={cn(
                  "rounded-lg border p-3 text-left text-sm",
                  active ? "border-sentinel-700 bg-sentinel-50 text-sentinel-950 dark:border-sentinel-300 dark:bg-sentinel-500/15 dark:text-white" : "border-ink-200 bg-white text-ink-700 dark:border-white/10 dark:bg-ink-950 dark:text-ink-200"
                )}
              >
                <span className="block font-semibold">{category.label}</span>
                <span className="mt-1 block text-xs opacity-80">Coefficient {category.coefficient}, score injecté au rapport et à l&apos;historique agent.</span>
              </button>
            );
          })}
        </div>
      </div>

      {score.criticalAlerts.length ? (
        <div className="rounded-lg border border-red-700 bg-red-950 p-4 text-white">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <ShieldAlert className="h-5 w-5" />
            {score.criticalAlerts.length} alerte(s) critique(s) ou bloquante(s) détectée(s)
          </p>
          <p className="mt-1 text-sm text-red-100">La direction sera notifiée après enregistrement et les non-conformités seront liées au contrôle, à l&apos;agent et au site.</p>
        </div>
      ) : null}

      <div className="space-y-4">
        {criteriaForTemplate
          .filter((criterion) => selectedCriterionSet.has(criterion.id))
          .map((criterion) => {
            const criterionPoints = pointsForSelectedCriteria.filter((point) => point.criterionId === criterion.id);
            const criterionScore = score.criterionScores.find((item) => item.criterionId === criterion.id)?.score ?? 100;
            return (
              <section key={criterion.id} className="surface rounded-lg p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-base font-semibold text-ink-950 dark:text-white">{criterion.sortOrder}. {criterion.label}</p>
                    <p className="mt-1 text-sm text-ink-500 dark:text-ink-300">{criterionPoints.length} points de contrôle affichés automatiquement.</p>
                  </div>
                  <span className="rounded-full bg-sentinel-700 px-3 py-1 text-sm font-semibold text-white">{criterionScore} %</span>
                </div>
                <div className="mt-4 divide-y divide-ink-100 dark:divide-white/10">
                  {criterionPoints.map((point) => {
                    const options = optionsByPoint.get(point.id) ?? [];
                    const selectedOption = responseById.get(responses[point.id]);
                    const draft = ncDrafts[point.id] ?? (selectedOption ? toDraft(selectedOption) : null);
                    return (
                      <div key={point.id} className="py-4 first:pt-0 last:pb-0">
                        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-ink-950 dark:text-white">{point.label}</p>
                            <p className="mt-1 text-xs text-ink-500 dark:text-ink-300">
                              Coef. {point.coefficient} · gravité par défaut {point.defaultSeverity.toLowerCase()} · délai {point.defaultCorrectionDelayHours ?? 48}h
                            </p>
                          </div>
                          {point.blocking ? <span className="w-fit rounded-full bg-red-950 px-2.5 py-1 text-xs font-semibold text-white">bloquant</span> : null}
                        </div>
                        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                          {options.map((option) => {
                            const active = responses[point.id] === option.id;
                            return (
                              <button
                                key={option.id}
                                type="button"
                                onClick={() => selectResponse(point, option)}
                                className={cn(
                                  "min-h-24 rounded-lg border p-3 text-left text-sm transition",
                                  active ? impactClasses[option.impactLevel] : "border-ink-200 bg-white text-ink-700 hover:border-sentinel-300 dark:border-white/10 dark:bg-ink-950 dark:text-ink-200",
                                  option.blocking ? "ring-1 ring-red-700" : ""
                                )}
                              >
                                <span className="flex items-center justify-between gap-2">
                                  <span className="font-semibold">{option.status.replace("_", " ")}</span>
                                  {active ? <CheckCircle2 className="h-4 w-4" /> : null}
                                </span>
                                <span className="mt-2 block text-xs leading-relaxed">{option.label}</span>
                                <span className="mt-2 block text-xs font-semibold">Score {option.affectsScore ? `${option.score} %` : "neutralisé"}</span>
                              </button>
                            );
                          })}
                        </div>
                        {selectedOption?.status === "NON_CONFORME" && draft ? (
                          <div className="mt-4 rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-400/30 dark:bg-orange-500/15">
                            <p className="flex items-center gap-2 text-sm font-semibold text-orange-950 dark:text-orange-100">
                              <AlertTriangle className="h-4 w-4" />
                              Non-conformité détectée
                            </p>
                            <div className="mt-3 grid gap-3 lg:grid-cols-4">
                              <label className="lg:col-span-2">
                                <span className="label">Observation</span>
                                <textarea value={draft.observation} onChange={(event) => updateDraft(point.id, { observation: event.target.value })} className="field mt-2 h-24 py-3" />
                              </label>
                              <label>
                                <span className="label">Gravité</span>
                                <select value={draft.severity} onChange={(event) => updateDraft(point.id, { severity: event.target.value })} className="field mt-2">
                                  <option value="MINEURE">Mineure</option>
                                  <option value="MAJEURE">Majeure</option>
                                  <option value="CRITIQUE">Critique</option>
                                </select>
                              </label>
                              <label>
                                <span className="label">Délai</span>
                                <select value={draft.delayHours} onChange={(event) => updateDraft(point.id, { delayHours: Number(event.target.value) })} className="field mt-2">
                                  <option value={0}>Immédiat</option>
                                  <option value={24}>24h</option>
                                  <option value={48}>48h</option>
                                  <option value={168}>7 jours</option>
                                  <option value={720}>1 mois</option>
                                  <option value={2160}>3 mois</option>
                                </select>
                              </label>
                              <label className="lg:col-span-4">
                                <span className="label">Action corrective proposée</span>
                                <input value={draft.action} onChange={(event) => updateDraft(point.id, { action: event.target.value })} className="field mt-2" />
                              </label>
                            </div>
                            <div className="mt-3 grid gap-2 md:grid-cols-5">
                              {evidenceOptions.map(({ value, label, icon: Icon }) => (
                                <button
                                  key={value}
                                  type="button"
                                  onClick={() => updateDraft(point.id, { proofMode: value })}
                                  className={cn(
                                    "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold",
                                    draft.proofMode === value ? "border-sentinel-700 bg-white text-sentinel-800 dark:bg-ink-950 dark:text-sentinel-100" : "border-orange-200 bg-white/70 text-orange-900 dark:border-orange-400/30 dark:bg-white/5 dark:text-orange-100"
                                  )}
                                >
                                  <Icon className="h-4 w-4" />
                                  {label}
                                </button>
                              ))}
                            </div>
                            <div className="mt-3 flex flex-wrap gap-3 text-sm text-orange-950 dark:text-orange-100">
                              <label className="flex items-center gap-2">
                                <input type="checkbox" checked={draft.notification} onChange={(event) => updateDraft(point.id, { notification: event.target.checked })} />
                                Notification direction
                              </label>
                              <label className="flex items-center gap-2">
                                <input type="checkbox" checked={draft.clientVisible} onChange={(event) => updateDraft(point.id, { clientVisible: event.target.checked })} />
                                Visible rapport client
                              </label>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
      </div>

      <div className="surface rounded-lg p-5">
        <p className="flex items-center gap-2 text-sm font-semibold text-ink-950 dark:text-white">
          <SlidersHorizontal className="h-4 w-4" />
          Administration rapide du référentiel
        </p>
        <div className="mt-4 grid gap-3 lg:grid-cols-[1.2fr_2fr_auto_auto]">
          <select value={adminCriterionId} onChange={(event) => setAdminCriterionId(event.target.value)} className="field">
            {criteriaForTemplate.map((criterion) => (
              <option key={criterion.id} value={criterion.id}>
                {criterion.label}
              </option>
            ))}
          </select>
          <input value={adminPointLabel} onChange={(event) => setAdminPointLabel(event.target.value)} className="field" placeholder="Nouveau point de contrôle" />
          <label className="flex items-center gap-2 rounded-lg border border-ink-200 px-3 py-2 text-sm font-semibold text-ink-700 dark:border-white/10 dark:text-ink-200">
            <input type="checkbox" checked={adminBlocking} onChange={(event) => setAdminBlocking(event.target.checked)} />
            Bloquant
          </label>
          <button type="button" onClick={addAdminPoint} className="button-secondary">
            Ajouter
          </button>
        </div>
      </div>

      <div className="surface rounded-lg p-5">
        <label className="label" htmlFor="observations">
          Synthèse générale du contrôle
        </label>
        <textarea id="observations" value={observations} onChange={(event) => setObservations(event.target.value)} className="field mt-2 h-28 py-3" />
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <SignatureCanvas label="Signature agent" onChange={setAgentSignature} />
          <SignatureCanvas label="Signature contrôleur" onChange={setControllerSignature} />
        </div>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {status ? <p className="text-sm font-semibold text-sentinel-800 dark:text-sentinel-100">{status}</p> : <span />}
          <button type="button" onClick={submit} className="button-primary" disabled={!selectedCriteria.length || !pointSelections.length}>
            <Save className="h-4 w-4" />
            Enregistrer le contrôle
          </button>
        </div>
      </div>
    </div>
  );
}
