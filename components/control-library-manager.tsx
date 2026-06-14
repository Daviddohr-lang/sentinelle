"use client";

import { Archive, Layers3, ListChecks, Plus, RefreshCw, Save, ShieldAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type {
  ControlCriterionSeed,
  ControlImpactLevel,
  ControlPointResponseOptionSeed,
  ControlPointSeed,
  ControlPointStatus,
  ControlRequirement,
  ControlSeverity,
  ControlTemplateSeed
} from "@/lib/control-template-library";
import { cn } from "@/lib/utils";

type LibraryPayload = {
  templates: ControlTemplateSeed[];
  criteria: ControlCriterionSeed[];
  points: ControlPointSeed[];
  responseOptions: ControlPointResponseOptionSeed[];
  stats?: {
    templates: number;
    criteria: number;
    points: number;
    responseOptions: number;
  };
};

type Tab = "modeles" | "criteres" | "points" | "reponses";

const emptyLibrary: LibraryPayload = {
  templates: [],
  criteria: [],
  points: [],
  responseOptions: []
};

const statusLabels: Record<ControlPointStatus, string> = {
  CONFORME: "Conforme",
  NON_CONFORME: "Non conforme",
  SANS_OBJET: "Sans objet"
};

const severityLabels: Record<ControlSeverity, string> = {
  MINEURE: "Mineure",
  MAJEURE: "Majeure",
  CRITIQUE: "Critique"
};

const requirementLabels: Record<ControlRequirement, string> = {
  NONE: "Non demandé",
  OPTIONAL: "Proposé",
  REQUIRED: "Obligatoire"
};

const impactLabels: Record<ControlImpactLevel, string> = {
  VERT: "Vert",
  JAUNE: "Jaune",
  ORANGE: "Orange",
  ROUGE: "Rouge",
  CRITIQUE: "Critique"
};

const impactClasses: Record<ControlImpactLevel, string> = {
  VERT: "bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-100 dark:ring-emerald-400/30",
  JAUNE: "bg-yellow-50 text-yellow-800 ring-yellow-200 dark:bg-yellow-500/15 dark:text-yellow-100 dark:ring-yellow-400/30",
  ORANGE: "bg-orange-50 text-orange-800 ring-orange-200 dark:bg-orange-500/15 dark:text-orange-100 dark:ring-orange-400/30",
  ROUGE: "bg-red-50 text-red-800 ring-red-200 dark:bg-red-500/15 dark:text-red-100 dark:ring-red-400/30",
  CRITIQUE: "bg-red-950 text-white ring-red-700 dark:bg-red-950 dark:text-white dark:ring-red-400"
};

function defaultOption(pointId: string) {
  return {
    pointId,
    status: "NON_CONFORME" as ControlPointStatus,
    label: "",
    impactLevel: "ORANGE" as ControlImpactLevel,
    severity: "MINEURE" as ControlSeverity,
    score: 60,
    affectsScore: true,
    affectsCompliance: true,
    correctiveAction: "",
    correctionDelayHours: 48,
    blocking: false,
    notificationRequired: false,
    visibleInAgentReport: true,
    visibleInDirectionReport: true,
    visibleInClientReport: true
  };
}

export function ControlLibraryManager() {
  const [library, setLibrary] = useState<LibraryPayload>(emptyLibrary);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("modeles");
  const [templateId, setTemplateId] = useState("");
  const [criterionId, setCriterionId] = useState("");
  const [pointId, setPointId] = useState("");
  const [templateForm, setTemplateForm] = useState({ title: "", description: "" });
  const [criterionForm, setCriterionForm] = useState({ label: "", description: "", coefficient: 1 });
  const [pointForm, setPointForm] = useState({
    label: "",
    coefficient: 1,
    defaultSeverity: "MINEURE" as ControlSeverity,
    blocking: false,
    defaultCorrectiveAction: "",
    defaultCorrectionDelayHours: 48,
    photoRequirement: "OPTIONAL" as ControlRequirement,
    fileRequirement: "NONE" as ControlRequirement,
    voiceRequirement: "OPTIONAL" as ControlRequirement,
    visibleInAgentReport: true,
    visibleInDirectionReport: true,
    visibleInClientReport: true
  });
  const [responseForm, setResponseForm] = useState(defaultOption(""));

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/control-library");
      if (!response.ok) throw new Error("Référentiel indisponible");
      const data = await response.json();
      setLibrary({
        templates: data.templates ?? [],
        criteria: data.criteria ?? [],
        points: data.points ?? [],
        responseOptions: data.responseOptions ?? [],
        stats: data.stats
      });
      setStatus(`${data.source === "database" ? "Base de données" : "Local"} synchronisé.`);
    } catch {
      setStatus("Impossible de charger le référentiel.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const selectedTemplate = useMemo(() => library.templates.find((template) => template.id === templateId) ?? library.templates[0], [library.templates, templateId]);
  const criteria = useMemo(() => library.criteria.filter((criterion) => criterion.templateId === selectedTemplate?.id), [library.criteria, selectedTemplate?.id]);
  const selectedCriterion = useMemo(() => criteria.find((criterion) => criterion.id === criterionId) ?? criteria[0], [criteria, criterionId]);
  const points = useMemo(() => library.points.filter((point) => point.criterionId === selectedCriterion?.id), [library.points, selectedCriterion?.id]);
  const selectedPoint = useMemo(() => points.find((point) => point.id === pointId) ?? points[0], [points, pointId]);
  const responseOptions = useMemo(() => library.responseOptions.filter((option) => option.pointId === selectedPoint?.id), [library.responseOptions, selectedPoint?.id]);

  useEffect(() => {
    if (selectedTemplate && selectedTemplate.id !== templateId) setTemplateId(selectedTemplate.id);
  }, [selectedTemplate, templateId]);

  useEffect(() => {
    if (selectedCriterion && selectedCriterion.id !== criterionId) setCriterionId(selectedCriterion.id);
  }, [selectedCriterion, criterionId]);

  useEffect(() => {
    if (selectedPoint && selectedPoint.id !== pointId) {
      setPointId(selectedPoint.id);
      setResponseForm(defaultOption(selectedPoint.id));
    }
  }, [selectedPoint, pointId]);

  async function post(body: unknown, success: string) {
    const response = await fetch("/api/control-library", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setStatus(data?.error ?? "Action impossible.");
      return false;
    }
    setStatus(success);
    await load();
    return true;
  }

  async function createTemplate() {
    if (!templateForm.title.trim()) return;
    const ok = await post({ action: "create-template", template: templateForm }, "Modèle créé.");
    if (ok) setTemplateForm({ title: "", description: "" });
  }

  async function updateTemplate(template: ControlTemplateSeed) {
    await post({ action: "update-template", id: template.id, template: { title: template.title, description: template.description ?? "" } }, "Modèle modifié.");
  }

  async function createCriterion() {
    if (!selectedTemplate || !criterionForm.label.trim()) return;
    const ok = await post({ action: "create-criterion", criterion: { ...criterionForm, templateId: selectedTemplate.id } }, "Critère créé.");
    if (ok) setCriterionForm({ label: "", description: "", coefficient: 1 });
  }

  async function createPoint() {
    if (!selectedCriterion || !pointForm.label.trim()) return;
    const ok = await post({ action: "create-point", point: { ...pointForm, criterionId: selectedCriterion.id } }, "Point créé avec réponses par défaut.");
    if (ok) {
      setPointForm({
        label: "",
        coefficient: 1,
        defaultSeverity: "MINEURE",
        blocking: false,
        defaultCorrectiveAction: "",
        defaultCorrectionDelayHours: 48,
        photoRequirement: "OPTIONAL",
        fileRequirement: "NONE",
        voiceRequirement: "OPTIONAL",
        visibleInAgentReport: true,
        visibleInDirectionReport: true,
        visibleInClientReport: true
      });
    }
  }

  async function createResponseOption() {
    if (!selectedPoint || !responseForm.label.trim()) return;
    const ok = await post({ action: "create-response-option", responseOption: { ...responseForm, pointId: selectedPoint.id } }, "Réponse ajoutée.");
    if (ok) setResponseForm(defaultOption(selectedPoint.id));
  }

  function updatePointDraft(id: string, patch: Partial<ControlPointSeed>) {
    setLibrary((current) => ({ ...current, points: current.points.map((item) => (item.id === id ? { ...item, ...patch } : item)) }));
  }

  function updateResponseDraft(id: string, patch: Partial<ControlPointResponseOptionSeed>) {
    setLibrary((current) => ({ ...current, responseOptions: current.responseOptions.map((item) => (item.id === id ? { ...item, ...patch } : item)) }));
  }

  function pointPayload(point: ControlPointSeed) {
    return {
      label: point.label,
      coefficient: point.coefficient,
      defaultSeverity: point.defaultSeverity,
      blocking: point.blocking,
      defaultCorrectiveAction: point.defaultCorrectiveAction ?? "",
      defaultCorrectionDelayHours: point.defaultCorrectionDelayHours ?? 48,
      photoRequirement: point.photoRequirement,
      fileRequirement: point.fileRequirement,
      voiceRequirement: point.voiceRequirement,
      visibleInAgentReport: point.visibleInAgentReport,
      visibleInDirectionReport: point.visibleInDirectionReport,
      visibleInClientReport: point.visibleInClientReport
    };
  }

  function responsePayload(option: ControlPointResponseOptionSeed) {
    return {
      pointId: option.pointId,
      status: option.status,
      label: option.label,
      impactLevel: option.impactLevel,
      severity: option.severity,
      score: Number(option.score),
      affectsScore: option.affectsScore,
      affectsCompliance: option.affectsCompliance,
      correctiveAction: option.correctiveAction ?? "",
      correctionDelayHours: option.correctionDelayHours ?? 48,
      blocking: option.blocking,
      notificationRequired: option.notificationRequired,
      visibleInAgentReport: option.visibleInAgentReport,
      visibleInDirectionReport: option.visibleInDirectionReport,
      visibleInClientReport: option.visibleInClientReport
    };
  }

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "modeles", label: "Modèles" },
    { id: "criteres", label: "Thématiques" },
    { id: "points", label: "Points à contrôler" },
    { id: "reponses", label: "Choix de réponse" }
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-4">
        <div className="surface rounded-lg p-4">
          <p className="text-xs font-semibold uppercase text-ink-500 dark:text-ink-300">Modèles</p>
          <p className="mt-2 text-2xl font-semibold text-ink-950 dark:text-white">{library.stats?.templates ?? library.templates.length}</p>
        </div>
        <div className="surface rounded-lg p-4">
          <p className="text-xs font-semibold uppercase text-ink-500 dark:text-ink-300">Thématiques</p>
          <p className="mt-2 text-2xl font-semibold text-ink-950 dark:text-white">{library.stats?.criteria ?? library.criteria.length}</p>
        </div>
        <div className="surface rounded-lg p-4">
          <p className="text-xs font-semibold uppercase text-ink-500 dark:text-ink-300">Points à contrôler</p>
          <p className="mt-2 text-2xl font-semibold text-ink-950 dark:text-white">{library.stats?.points ?? library.points.length}</p>
        </div>
        <div className="surface rounded-lg p-4">
          <p className="text-xs font-semibold uppercase text-ink-500 dark:text-ink-300">Choix de réponse</p>
          <p className="mt-2 text-2xl font-semibold text-ink-950 dark:text-white">{library.stats?.responseOptions ?? library.responseOptions.length}</p>
        </div>
      </div>

      <div className="surface rounded-lg p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn("rounded-lg px-3 py-2 text-sm font-semibold", activeTab === tab.id ? "bg-sentinel-700 text-white" : "bg-ink-100 text-ink-700 dark:bg-white/10 dark:text-ink-100")}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <button type="button" onClick={load} className="button-secondary">
            <RefreshCw className="h-4 w-4" />
            Actualiser
          </button>
        </div>
        {status ? <p className="mt-3 text-sm font-semibold text-sentinel-800 dark:text-sentinel-100">{loading ? "Chargement..." : status}</p> : null}
      </div>

      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <div className="surface rounded-lg p-4">
          <label className="label" htmlFor="control-template">
            Modèle actif
          </label>
          <select id="control-template" value={selectedTemplate?.id ?? ""} onChange={(event) => setTemplateId(event.target.value)} className="field mt-2">
            {library.templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.title}
              </option>
            ))}
          </select>
          <label className="label mt-4 block" htmlFor="control-criterion">
            Thématique active
          </label>
          <select id="control-criterion" value={selectedCriterion?.id ?? ""} onChange={(event) => setCriterionId(event.target.value)} className="field mt-2">
            {criteria.map((criterion) => (
              <option key={criterion.id} value={criterion.id}>
                {criterion.sortOrder}. {criterion.label}
              </option>
            ))}
          </select>
          <label className="label mt-4 block" htmlFor="control-point">
            Point / critère d&apos;évaluation actif
          </label>
          <select id="control-point" value={selectedPoint?.id ?? ""} onChange={(event) => setPointId(event.target.value)} className="field mt-2">
            {points.map((point) => (
              <option key={point.id} value={point.id}>
                {point.sortOrder}. {point.label}
              </option>
            ))}
          </select>
        </div>

        <div className="surface rounded-lg p-4">
          {activeTab === "modeles" ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-ink-950 dark:text-white">
                <Layers3 className="h-4 w-4" />
                Modèles de contrôle
              </div>
              <div className="grid gap-3 lg:grid-cols-[1.2fr_2fr_auto]">
                <input value={templateForm.title} onChange={(event) => setTemplateForm((current) => ({ ...current, title: event.target.value }))} className="field" placeholder="Nom du modèle" />
                <input value={templateForm.description} onChange={(event) => setTemplateForm((current) => ({ ...current, description: event.target.value }))} className="field" placeholder="Description" />
                <button type="button" onClick={createTemplate} className="button-primary">
                  <Plus className="h-4 w-4" />
                  Créer
                </button>
              </div>
              <div className="space-y-2">
                {library.templates.map((template) => (
                  <div key={template.id} className="rounded-lg border border-ink-200 p-3 dark:border-white/10">
                    <input
                      value={template.title}
                      onChange={(event) => setLibrary((current) => ({ ...current, templates: current.templates.map((item) => (item.id === template.id ? { ...item, title: event.target.value } : item)) }))}
                      className="field"
                    />
                    <div className="mt-2 flex gap-2">
                      <button type="button" onClick={() => updateTemplate(template)} className="button-secondary">
                        <Save className="h-4 w-4" />
                        Modifier
                      </button>
                      <button type="button" onClick={() => post({ action: "archive-template", id: template.id }, "Modèle archivé.")} className="button-secondary">
                        <Archive className="h-4 w-4" />
                        Archiver
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {activeTab === "criteres" ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-ink-950 dark:text-white">
                <ListChecks className="h-4 w-4" />
                Thématiques de contrôle du modèle
              </div>
              <p className="text-sm leading-6 text-ink-500 dark:text-ink-300">
                Une thématique regroupe les points à contrôler pendant le contrôle agent, par exemple tenue, prise de service, déontologie ou main courante.
              </p>
              <div className="grid gap-3 lg:grid-cols-[2fr_1fr_auto]">
                <input value={criterionForm.label} onChange={(event) => setCriterionForm((current) => ({ ...current, label: event.target.value }))} className="field" placeholder="Nouvelle thématique" />
                <input type="number" min={0} step={0.1} value={criterionForm.coefficient} onChange={(event) => setCriterionForm((current) => ({ ...current, coefficient: Number(event.target.value) }))} className="field" />
                <button type="button" onClick={createCriterion} className="button-primary">
                  <Plus className="h-4 w-4" />
                  Créer la thématique
                </button>
              </div>
              <div className="grid gap-2">
                {criteria.map((criterion) => (
                  <div key={criterion.id} className="flex flex-col gap-2 rounded-lg border border-ink-200 p-3 dark:border-white/10 lg:flex-row lg:items-center">
                    <input
                      value={criterion.label}
                      onChange={(event) => setLibrary((current) => ({ ...current, criteria: current.criteria.map((item) => (item.id === criterion.id ? { ...item, label: event.target.value } : item)) }))}
                      className="field lg:flex-1"
                    />
                    <input
                      type="number"
                      min={0}
                      step={0.1}
                      value={criterion.coefficient}
                      onChange={(event) => setLibrary((current) => ({ ...current, criteria: current.criteria.map((item) => (item.id === criterion.id ? { ...item, coefficient: Number(event.target.value) } : item)) }))}
                      className="field lg:w-28"
                    />
                    <button type="button" onClick={() => post({ action: "update-criterion", id: criterion.id, criterion: { label: criterion.label, coefficient: criterion.coefficient } }, "Critère modifié.")} className="button-secondary">
                      <Save className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => post({ action: "archive-criterion", id: criterion.id }, "Critère archivé.")} className="button-secondary">
                      <Archive className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {activeTab === "points" ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-ink-950 dark:text-white">
                <ShieldAlert className="h-4 w-4" />
                Points à contrôler dans la thématique
              </div>
              <p className="text-sm leading-6 text-ink-500 dark:text-ink-300">
                Chaque point est proposé au contrôleur pendant le contrôle. Les choix de réponse associés détermineront ensuite la note, la conformité, les non-conformités et les rapports PDF.
              </p>
              <div className="grid gap-3 lg:grid-cols-2">
                <input value={pointForm.label} onChange={(event) => setPointForm((current) => ({ ...current, label: event.target.value }))} className="field" placeholder="Nouveau point à contrôler" />
                <input value={pointForm.defaultCorrectiveAction} onChange={(event) => setPointForm((current) => ({ ...current, defaultCorrectiveAction: event.target.value }))} className="field" placeholder="Action corrective par défaut" />
                <select value={pointForm.defaultSeverity} onChange={(event) => setPointForm((current) => ({ ...current, defaultSeverity: event.target.value as ControlSeverity }))} className="field">
                  {Object.entries(severityLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      Gravité {label.toLowerCase()}
                    </option>
                  ))}
                </select>
                <input type="number" min={0} value={pointForm.defaultCorrectionDelayHours} onChange={(event) => setPointForm((current) => ({ ...current, defaultCorrectionDelayHours: Number(event.target.value) }))} className="field" />
                <select value={pointForm.photoRequirement} onChange={(event) => setPointForm((current) => ({ ...current, photoRequirement: event.target.value as ControlRequirement }))} className="field">
                  {Object.entries(requirementLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      Photo : {label.toLowerCase()}
                    </option>
                  ))}
                </select>
                <select value={pointForm.fileRequirement} onChange={(event) => setPointForm((current) => ({ ...current, fileRequirement: event.target.value as ControlRequirement }))} className="field">
                  {Object.entries(requirementLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      Fichier : {label.toLowerCase()}
                    </option>
                  ))}
                </select>
                <select value={pointForm.voiceRequirement} onChange={(event) => setPointForm((current) => ({ ...current, voiceRequirement: event.target.value as ControlRequirement }))} className="field">
                  {Object.entries(requirementLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      Commentaire vocal : {label.toLowerCase()}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-ink-700 dark:text-ink-200">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={pointForm.blocking} onChange={(event) => setPointForm((current) => ({ ...current, blocking: event.target.checked, defaultSeverity: event.target.checked ? "CRITIQUE" : current.defaultSeverity }))} />
                  Bloquant
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={pointForm.visibleInAgentReport} onChange={(event) => setPointForm((current) => ({ ...current, visibleInAgentReport: event.target.checked }))} />
                  Rapport agent
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={pointForm.visibleInDirectionReport} onChange={(event) => setPointForm((current) => ({ ...current, visibleInDirectionReport: event.target.checked }))} />
                  Rapport direction
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={pointForm.visibleInClientReport} onChange={(event) => setPointForm((current) => ({ ...current, visibleInClientReport: event.target.checked }))} />
                  Rapport client
                </label>
              </div>
              <button type="button" onClick={createPoint} className="button-primary">
                <Plus className="h-4 w-4" />
                Créer le point
              </button>
              <div className="grid gap-2">
                {points.map((point) => (
                  <div key={point.id} className="rounded-lg border border-ink-200 p-3 dark:border-white/10">
                    <div className="grid gap-2 lg:grid-cols-[2fr_1fr_1fr]">
                      <input value={point.label} onChange={(event) => updatePointDraft(point.id, { label: event.target.value })} className="field" />
                      <select value={point.defaultSeverity} onChange={(event) => updatePointDraft(point.id, { defaultSeverity: event.target.value as ControlSeverity })} className="field">
                        {Object.entries(severityLabels).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                      <input type="number" min={0} max={2160} value={point.defaultCorrectionDelayHours ?? 48} onChange={(event) => updatePointDraft(point.id, { defaultCorrectionDelayHours: Number(event.target.value) })} className="field" />
                      <input value={point.defaultCorrectiveAction ?? ""} onChange={(event) => updatePointDraft(point.id, { defaultCorrectiveAction: event.target.value })} className="field lg:col-span-3" placeholder="Action corrective proposée" />
                      <select value={point.photoRequirement} onChange={(event) => updatePointDraft(point.id, { photoRequirement: event.target.value as ControlRequirement })} className="field">
                        {Object.entries(requirementLabels).map(([value, label]) => (
                          <option key={value} value={value}>
                            Photo : {label.toLowerCase()}
                          </option>
                        ))}
                      </select>
                      <select value={point.fileRequirement} onChange={(event) => updatePointDraft(point.id, { fileRequirement: event.target.value as ControlRequirement })} className="field">
                        {Object.entries(requirementLabels).map(([value, label]) => (
                          <option key={value} value={value}>
                            Fichier : {label.toLowerCase()}
                          </option>
                        ))}
                      </select>
                      <select value={point.voiceRequirement} onChange={(event) => updatePointDraft(point.id, { voiceRequirement: event.target.value as ControlRequirement })} className="field">
                        {Object.entries(requirementLabels).map(([value, label]) => (
                          <option key={value} value={value}>
                            Vocal : {label.toLowerCase()}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-3 text-sm text-ink-700 dark:text-ink-200">
                      {[
                        ["blocking", "Point bloquant"],
                        ["visibleInAgentReport", "Rapport agent"],
                        ["visibleInDirectionReport", "Rapport direction"],
                        ["visibleInClientReport", "Rapport client"]
                      ].map(([key, label]) => (
                        <label key={key} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={Boolean(point[key as keyof ControlPointSeed])}
                            onChange={(event) => updatePointDraft(point.id, { [key]: event.target.checked } as Partial<ControlPointSeed>)}
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" onClick={() => post({ action: "update-point", id: point.id, point: pointPayload(point) }, "Point modifié.")} className="button-secondary">
                        <Save className="h-4 w-4" />
                        Enregistrer
                      </button>
                      <button type="button" onClick={() => post({ action: "archive-point", id: point.id }, "Point supprimé du référentiel actif.")} className="button-secondary">
                        <Archive className="h-4 w-4" />
                        Supprimer
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-ink-500 dark:text-ink-300">
                      {severityLabels[point.defaultSeverity]} · délai {point.defaultCorrectionDelayHours ?? 48}h · {point.blocking ? "bloquant" : "non bloquant"} ·{" "}
                      {library.responseOptions.filter((option) => option.pointId === point.id).length} réponse(s)
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {activeTab === "reponses" ? (
            <div className="space-y-4">
              <div>
                <div className="text-sm font-semibold text-ink-950 dark:text-white">Choix de réponse pour le point actif</div>
                <p className="mt-2 text-sm leading-6 text-ink-500 dark:text-ink-300">
                  Chaque choix de réponse peut modifier la note, créer une non-conformité, déclencher une alerte, proposer une action corrective et définir sa visibilité dans les rapports.
                </p>
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                <input value={responseForm.label} onChange={(event) => setResponseForm((current) => ({ ...current, label: event.target.value }))} className="field" placeholder="Libellé de réponse" />
                <input value={responseForm.correctiveAction ?? ""} onChange={(event) => setResponseForm((current) => ({ ...current, correctiveAction: event.target.value }))} className="field" placeholder="Action corrective" />
                <select value={responseForm.status} onChange={(event) => setResponseForm((current) => ({ ...current, status: event.target.value as ControlPointStatus }))} className="field">
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <select value={responseForm.impactLevel} onChange={(event) => setResponseForm((current) => ({ ...current, impactLevel: event.target.value as ControlImpactLevel }))} className="field">
                  {Object.entries(impactLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <select value={responseForm.severity} onChange={(event) => setResponseForm((current) => ({ ...current, severity: event.target.value as ControlSeverity }))} className="field">
                  <option value="MINEURE">Mineure</option>
                  <option value="MAJEURE">Majeure</option>
                  <option value="CRITIQUE">Critique</option>
                </select>
                <input type="number" min={0} max={100} value={responseForm.score} onChange={(event) => setResponseForm((current) => ({ ...current, score: Number(event.target.value) }))} className="field" />
                <input type="number" min={0} max={2160} value={responseForm.correctionDelayHours ?? 48} onChange={(event) => setResponseForm((current) => ({ ...current, correctionDelayHours: Number(event.target.value) }))} className="field" placeholder="Délai de correction en heures" />
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-ink-700 dark:text-ink-200">
                {[
                  ["affectsScore", "Impact note"],
                  ["affectsCompliance", "Impact conformité"],
                  ["blocking", "Bloquant"],
                  ["notificationRequired", "Notification"],
                  ["visibleInAgentReport", "Rapport agent"],
                  ["visibleInDirectionReport", "Rapport direction"],
                  ["visibleInClientReport", "Rapport client"]
                ].map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2">
                    <input type="checkbox" checked={Boolean(responseForm[key as keyof typeof responseForm])} onChange={(event) => setResponseForm((current) => ({ ...current, [key]: event.target.checked }))} />
                    {label}
                  </label>
                ))}
              </div>
              <button type="button" onClick={createResponseOption} className="button-primary">
                <Plus className="h-4 w-4" />
                Ajouter la réponse
              </button>
              <div className="grid gap-2">
                {responseOptions.map((option) => (
                  <div key={option.id} className="rounded-lg border border-ink-200 p-3 dark:border-white/10">
                    <div className="grid gap-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
                      <input value={option.label} onChange={(event) => updateResponseDraft(option.id, { label: event.target.value })} className="field lg:col-span-4" />
                      <select value={option.status} onChange={(event) => updateResponseDraft(option.id, { status: event.target.value as ControlPointStatus })} className="field">
                        {Object.entries(statusLabels).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                      <select value={option.impactLevel} onChange={(event) => updateResponseDraft(option.id, { impactLevel: event.target.value as ControlImpactLevel })} className="field">
                        {Object.entries(impactLabels).map(([value, label]) => (
                          <option key={value} value={value}>
                            Impact {label.toLowerCase()}
                          </option>
                        ))}
                      </select>
                      <select value={option.severity} onChange={(event) => updateResponseDraft(option.id, { severity: event.target.value as ControlSeverity })} className="field">
                        {Object.entries(severityLabels).map(([value, label]) => (
                          <option key={value} value={value}>
                            Gravité {label.toLowerCase()}
                          </option>
                        ))}
                      </select>
                      <input type="number" min={0} max={100} value={option.score} onChange={(event) => updateResponseDraft(option.id, { score: Number(event.target.value) })} className="field" />
                      <input value={option.correctiveAction ?? ""} onChange={(event) => updateResponseDraft(option.id, { correctiveAction: event.target.value })} className="field lg:col-span-3" placeholder="Action corrective proposée" />
                      <input type="number" min={0} max={2160} value={option.correctionDelayHours ?? 48} onChange={(event) => updateResponseDraft(option.id, { correctionDelayHours: Number(event.target.value) })} className="field" />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-3 text-sm text-ink-700 dark:text-ink-200">
                      {[
                        ["affectsScore", "Impacte la note"],
                        ["affectsCompliance", "Impacte la conformité"],
                        ["blocking", "Bloquant"],
                        ["notificationRequired", "Notification direction"],
                        ["visibleInAgentReport", "Rapport agent"],
                        ["visibleInDirectionReport", "Rapport direction"],
                        ["visibleInClientReport", "Rapport client"]
                      ].map(([key, label]) => (
                        <label key={key} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={Boolean(option[key as keyof ControlPointResponseOptionSeed])}
                            onChange={(event) => updateResponseDraft(option.id, { [key]: event.target.checked } as Partial<ControlPointResponseOptionSeed>)}
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className={cn("inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1", impactClasses[option.impactLevel])}>{option.score} %</span>
                      <button type="button" onClick={() => post({ action: "update-response-option", id: option.id, responseOption: responsePayload(option) }, "Choix de réponse modifié.")} className="button-secondary">
                        <Save className="h-4 w-4" />
                        Enregistrer
                      </button>
                      <button type="button" onClick={() => post({ action: "archive-response-option", id: option.id }, "Choix de réponse supprimé du référentiel actif.")} className="button-secondary">
                        <Archive className="h-4 w-4" />
                        Supprimer
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-ink-500 dark:text-ink-300">
                      {statusLabels[option.status]} · impact {impactLabels[option.impactLevel].toLowerCase()} · {severityLabels[option.severity].toLowerCase()} · délai {option.correctionDelayHours ?? 48}h ·{" "}
                      {option.blocking ? "bloquant" : "non bloquant"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
