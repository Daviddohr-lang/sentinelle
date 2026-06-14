"use client";

import { AlertTriangle, BookOpenCheck, CheckCircle2, Clock, Download, FileQuestion, History, PauseCircle, Play, Plus, RotateCcw, Send, ShieldQuestion, XCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge, DataTable, PageHeader, ProgressBar, Section, StatCard } from "@/components/ui";
import { cn } from "@/lib/utils";

type Role = "SUPER_ADMIN" | "COMPANY_ADMIN" | "QUALITY_CONTROLLER" | "AGENT" | "BUSINESS_OWNER" | "CLIENT";
type QcmBankType = "ENTREPRISE" | "METIER" | "CLIENT_SITE";
type QuestionType = "CHOIX_UNIQUE" | "CHOIX_MULTIPLE";
type SessionStatus = "ENVOYE" | "EN_COURS" | "TERMINE" | "INTERROMPU" | "EXPIRE" | "ANNULE";

type QcmChoice = {
  id: string;
  questionId: string;
  label: string;
  isCorrect?: boolean;
};

type QcmQuestion = {
  id: string;
  companyId: string;
  bankId: string;
  label: string;
  type: QuestionType;
  explanation?: string | null;
  active: boolean;
  difficulty?: "FACILE" | "MOYEN" | "DIFFICILE" | null;
  choices: QcmChoice[];
};

type QcmBank = {
  id: string;
  companyId: string;
  type: QcmBankType;
  title: string;
  description?: string | null;
  coefficient: number;
  qualification?: string | null;
  clientId?: string | null;
  siteId?: string | null;
  questionCountPerSession: number;
  timePerQuestionSeconds: number;
  passingScore: number;
  active: boolean;
  guidanceTitle?: string | null;
  guidanceBody?: string | null;
  questionsCount?: number;
  activeQuestionsCount?: number;
  successRate?: number | null;
  client?: { name: string } | null;
  site?: { name: string } | null;
};

type Agent = {
  id: string;
  firstName: string;
  lastName: string;
  eligibleJobTitles?: string[];
};

type Client = { id: string; name: string };
type Site = { id: string; name: string; clientId: string };

type Control = {
  id: string;
  startedAt: string;
  status: string;
  agentId: string;
  agentName?: string;
  agent?: Agent;
  clientId: string;
  clientName?: string;
  client?: Client;
  siteId: string;
  siteName?: string;
  site?: Site;
};

type QcmAnswer = {
  id: string;
  sessionId: string;
  questionId: string;
  selectedChoiceIds: string[];
  isCorrect: boolean;
  timedOut: boolean;
  timeSpentSeconds?: number | null;
};

type QcmInterruption = {
  id: string;
  cause: string;
  interruptedAt: string;
  resumedAt?: string | null;
  authorizedById?: string | null;
};

type QcmSession = {
  id: string;
  bankId: string;
  bankTitle: string;
  bankType: QcmBankType;
  coefficient: number;
  passingScore: number;
  timePerQuestionSeconds: number;
  guidanceTitle?: string | null;
  guidanceBody?: string | null;
  controlId?: string | null;
  agentId: string;
  agentName: string;
  clientId?: string | null;
  clientName?: string | null;
  siteId?: string | null;
  siteName?: string | null;
  qualification?: string | null;
  status: SessionStatus;
  score?: number | null;
  passed?: boolean | null;
  weightedScore?: number | null;
  selectedQuestionIds: string[];
  currentQuestionIndex: number;
  resumeAllowed: boolean;
  resumeCount: number;
  startedAt?: string | null;
  interruptedAt?: string | null;
  completedAt?: string | null;
  answers: QcmAnswer[];
  interruptions: QcmInterruption[];
  answeredCount: number;
  timedOutCount: number;
};

type QcmData = {
  source: string;
  banks: QcmBank[];
  questions: QcmQuestion[];
  sessions: QcmSession[];
  agents: Agent[];
  clients: Client[];
  sites: Site[];
  controls: Control[];
  stats: {
    bankCount: number;
    questionCount: number;
    activeSessions: number;
    completedSessions: number;
    averageScore: number;
    interrupted: number;
  };
};

const typeLabels: Record<QcmBankType, string> = {
  ENTREPRISE: "Entreprise",
  METIER: "Métier",
  CLIENT_SITE: "Client / site"
};

const tabs = [
  { id: "banks", label: "Banques", icon: BookOpenCheck },
  { id: "launch", label: "Lancement", icon: Send },
  { id: "agent", label: "Passage agent", icon: Play },
  { id: "results", label: "Résultats", icon: History },
  { id: "stats", label: "Statistiques", icon: ShieldQuestion }
] as const;

type TabId = (typeof tabs)[number]["id"];

function fullName(agent?: Agent) {
  return agent ? `${agent.firstName} ${agent.lastName}` : "";
}

function formatDate(value?: string | null) {
  if (!value) return "Non renseigné";
  return new Date(value).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

function statusTone(status: SessionStatus) {
  if (status === "TERMINE") return "text-emerald-700 dark:text-emerald-200";
  if (status === "INTERROMPU") return "text-red-700 dark:text-red-200";
  if (status === "EN_COURS") return "text-sentinel-700 dark:text-sentinel-200";
  return "text-amber-700 dark:text-amber-200";
}

function scoreTone(score?: number | null) {
  if (score === null || score === undefined) return "neutral";
  if (score >= 80) return "sentinel";
  if (score >= 60) return "amber";
  return "red";
}

async function qcmAction(body: unknown) {
  const response = await fetch("/api/qcms", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? "Action QCM impossible");
  return payload;
}

export function QcmManager({ userRole }: { userRole: Role }) {
  const [data, setData] = useState<QcmData | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>(userRole === "AGENT" ? "agent" : "banks");
  const [selectedBankId, setSelectedBankId] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [selectedChoices, setSelectedChoices] = useState<string[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [questionStartedAt, setQuestionStartedAt] = useState<number | null>(null);
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [bankForm, setBankForm] = useState({
    title: "",
    type: "ENTREPRISE" as QcmBankType,
    qualification: "",
    clientId: "",
    siteId: "",
    questionCountPerSession: 10,
    timePerQuestionSeconds: 60,
    passingScore: 80,
    guidanceBody: ""
  });
  const [questionForm, setQuestionForm] = useState({
    label: "",
    type: "CHOIX_UNIQUE" as QuestionType,
    difficulty: "MOYEN",
    explanation: "",
    choices: [
      { label: "", isCorrect: true },
      { label: "", isCorrect: false },
      { label: "", isCorrect: false },
      { label: "", isCorrect: false }
    ]
  });
  const [launchForm, setLaunchForm] = useState({
    controlId: "",
    agentId: "",
    clientId: "",
    siteId: "",
    qualification: "APS",
    categories: ["ENTREPRISE", "METIER", "CLIENT_SITE"] as QcmBankType[],
    launchTiming: "PENDANT_CONTROLE",
    delayHours: 72
  });

  const canAdminister = ["SUPER_ADMIN", "COMPANY_ADMIN", "QUALITY_CONTROLLER"].includes(userRole);
  const canViewDetails = canAdminister;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/qcms", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Chargement QCM impossible");
      const controlIdFromUrl = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("controlId") : "";
      const controlFromUrl = payload.controls?.find((control: Control) => control.id === controlIdFromUrl);
      setData(payload);
      setSelectedBankId((current) => current || payload.banks?.[0]?.id || "");
      setSelectedSessionId((current) => current || payload.sessions?.find((session: QcmSession) => session.status !== "TERMINE")?.id || payload.sessions?.[0]?.id || "");
      setLaunchForm((current) => ({
        ...current,
        agentId: current.agentId || payload.agents?.[0]?.id || "",
        clientId: current.clientId || payload.clients?.[0]?.id || "",
        siteId: current.siteId || payload.sites?.[0]?.id || "",
        controlId: controlFromUrl?.id || current.controlId || payload.controls?.[0]?.id || "",
        ...(controlFromUrl
          ? {
              agentId: controlFromUrl.agentId ?? controlFromUrl.agent?.id ?? current.agentId,
              clientId: controlFromUrl.clientId ?? controlFromUrl.client?.id ?? current.clientId,
              siteId: controlFromUrl.siteId ?? controlFromUrl.site?.id ?? current.siteId
            }
          : {})
      }));
      if (controlFromUrl) setActiveTab("launch");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erreur de chargement QCM");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedBank = useMemo(() => data?.banks.find((bank) => bank.id === selectedBankId), [data, selectedBankId]);
  const selectedBankQuestions = useMemo(() => data?.questions.filter((question) => question.bankId === selectedBankId) ?? [], [data, selectedBankId]);
  const selectedSession = useMemo(() => data?.sessions.find((session) => session.id === selectedSessionId), [data, selectedSessionId]);
  const activeQuestion = useMemo(() => {
    if (!data || !selectedSession) return null;
    const questionId = selectedSession.selectedQuestionIds[selectedSession.currentQuestionIndex];
    return data.questions.find((question) => question.id === questionId) ?? null;
  }, [data, selectedSession]);

  useEffect(() => {
    if (!selectedSession || !activeQuestion || selectedSession.status !== "EN_COURS") return;
    setSelectedChoices([]);
    setSecondsLeft(selectedSession.timePerQuestionSeconds || 60);
    setQuestionStartedAt(Date.now());
  }, [activeQuestion, selectedSession]);

  const submitCurrentQuestion = useCallback(
    async (timedOut = false) => {
      if (!selectedSession || !activeQuestion || submittingAnswer) return;
      setSubmittingAnswer(true);
      try {
        const timeSpentSeconds = questionStartedAt ? Math.round((Date.now() - questionStartedAt) / 1000) : selectedSession.timePerQuestionSeconds - secondsLeft;
        const payload = await qcmAction({
          action: "submit-answer",
          sessionId: selectedSession.id,
          questionId: activeQuestion.id,
          selectedChoiceIds: timedOut ? [] : selectedChoices,
          timeSpentSeconds,
          timedOut
        });
        await load();
        const nextSession = payload.session as QcmSession;
        if (nextSession.currentQuestionIndex >= nextSession.selectedQuestionIds.length) {
          await qcmAction({ action: "complete-session", sessionId: selectedSession.id });
          await load();
          setMessage("QCM clôturé et historisé.");
        }
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Réponse non enregistrée");
      } finally {
        setSubmittingAnswer(false);
      }
    },
    [activeQuestion, load, questionStartedAt, secondsLeft, selectedChoices, selectedSession, submittingAnswer]
  );

  useEffect(() => {
    if (!selectedSession || !activeQuestion || selectedSession.status !== "EN_COURS" || submittingAnswer) return;
    if (secondsLeft <= 0) {
      void submitCurrentQuestion(true);
      return;
    }
    const timer = window.setTimeout(() => setSecondsLeft((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [activeQuestion, secondsLeft, selectedSession, submitCurrentQuestion, submittingAnswer]);

  useEffect(() => {
    if (!selectedSession || selectedSession.status !== "EN_COURS") return;
    const handler = () => {
      const blob = new Blob([JSON.stringify({ action: "interrupt-session", sessionId: selectedSession.id, cause: "Fermeture ou perte de navigation" })], { type: "application/json" });
      navigator.sendBeacon("/api/qcms", blob);
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [selectedSession]);

  async function createBank() {
    try {
      await qcmAction({ action: "create-bank", bank: bankForm });
      setMessage("Banque QCM créée.");
      setBankForm((current) => ({ ...current, title: "", qualification: "", guidanceBody: "" }));
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Création impossible");
    }
  }

  async function createQuestion() {
    try {
      await qcmAction({
        action: "create-question",
        question: {
          bankId: selectedBankId,
          label: questionForm.label,
          type: questionForm.type,
          difficulty: questionForm.difficulty,
          explanation: questionForm.explanation,
          choices: questionForm.choices.filter((choice) => choice.label.trim())
        }
      });
      setMessage("Question ajoutée à la banque.");
      setQuestionForm((current) => ({ ...current, label: "", explanation: "", choices: current.choices.map((choice, index) => ({ label: "", isCorrect: index === 0 })) }));
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Question impossible");
    }
  }

  async function launchSessions() {
    try {
      const payload = await qcmAction({ action: "generate-sessions", ...launchForm });
      setMessage(`${payload.sessions.length} QCM généré(s) et envoyé(s) à l'agent.`);
      await load();
      setActiveTab("results");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Lancement impossible");
    }
  }

  async function startSession(sessionId: string) {
    try {
      await qcmAction({ action: "start-session", sessionId });
      await load();
      setSelectedSessionId(sessionId);
      setActiveTab("agent");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Démarrage impossible");
    }
  }

  async function interruptSession(sessionId: string) {
    try {
      await qcmAction({ action: "interrupt-session", sessionId, cause: "Interruption volontaire de la session" });
      await load();
      setMessage("Session interrompue. Une reprise devra être autorisée.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Interruption impossible");
    }
  }

  async function authorizeResume(sessionId: string) {
    try {
      await qcmAction({ action: "authorize-resume", sessionId });
      await load();
      setMessage("Reprise autorisée et journalisée.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Autorisation impossible");
    }
  }

  function toggleCategory(category: QcmBankType) {
    setLaunchForm((current) => ({
      ...current,
      categories: current.categories.includes(category) ? current.categories.filter((item) => item !== category) : [...current.categories, category]
    }));
  }

  function toggleChoice(choiceId: string) {
    if (!activeQuestion) return;
    setSelectedChoices((current) => {
      if (activeQuestion.type === "CHOIX_UNIQUE") return [choiceId];
      return current.includes(choiceId) ? current.filter((id) => id !== choiceId) : [...current, choiceId];
    });
  }

  function applyControl(controlId: string) {
    const control = data?.controls.find((item) => item.id === controlId);
    setLaunchForm((current) => ({
      ...current,
      controlId,
      agentId: control?.agentId ?? control?.agent?.id ?? current.agentId,
      clientId: control?.clientId ?? control?.client?.id ?? current.clientId,
      siteId: control?.siteId ?? control?.site?.id ?? current.siteId
    }));
  }

  function exportResults() {
    if (!data) return;
    const header = ["Agent", "QCM", "Catégorie", "Statut", "Score", "Réussite", "Questions dépassées", "Reprises"];
    const rows = data.sessions.map((session) => [
      session.agentName,
      session.bankTitle,
      typeLabels[session.bankType],
      session.status,
      session.score ?? "",
      session.passed === null || session.passed === undefined ? "" : session.passed ? "Réussi" : "Échec",
      session.timedOutCount,
      session.resumeCount
    ]);
    const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "sentinelle-qcm-resultats.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="QCM agents" subtitle="Chargement des banques, sessions et résultats." />
        <div className="surface rounded-lg p-8 text-sm text-ink-600 dark:text-ink-300">Préparation du module QCM...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <PageHeader title="QCM agents" subtitle="Le module QCM n'a pas pu être chargé." />
        <button type="button" onClick={() => void load()} className="button-primary">
          <RotateCcw className="h-4 w-4" />
          Réessayer
        </button>
      </div>
    );
  }

  const pendingSessions = data.sessions.filter((session) => session.status === "ENVOYE" || session.status === "INTERROMPU" || session.status === "EN_COURS");

  return (
    <div className="space-y-8">
      <PageHeader
        title="QCM agents"
        subtitle="Banques de questions administrables, génération aléatoire pendant ou après contrôle, passage chronométré et résultats historisés."
        action={
          canAdminister ? (
            <button type="button" onClick={exportResults} className="button-secondary">
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          ) : null
        }
      />

      {message ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-sentinel-200 bg-sentinel-50 px-4 py-3 text-sm font-medium text-sentinel-900 dark:border-sentinel-400/30 dark:bg-sentinel-500/10 dark:text-sentinel-100">
          <span>{message}</span>
          <button type="button" onClick={() => setMessage(null)} className="rounded-lg p-1 hover:bg-white/70 dark:hover:bg-white/10" aria-label="Fermer le message">
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Banques actives" value={data.stats.bankCount} trend={`${data.stats.questionCount} questions actives`} icon={BookOpenCheck} />
        <StatCard label="Sessions ouvertes" value={data.stats.activeSessions} trend="Envoyées, en cours, interrompues" icon={Clock} />
        <StatCard label="QCM clôturés" value={data.stats.completedSessions} trend={`Score moyen ${data.stats.averageScore} %`} icon={CheckCircle2} />
        <StatCard label="Interruptions" value={data.stats.interrupted} trend="Reprise contrôleur requise" icon={PauseCircle} />
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition",
                activeTab === tab.id
                  ? "border-sentinel-700 bg-sentinel-700 text-white"
                  : "border-ink-200 bg-white text-ink-700 hover:bg-ink-50 dark:border-white/10 dark:bg-ink-900 dark:text-ink-100 dark:hover:bg-white/10"
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "banks" ? (
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Section title="Banques QCM">
            <DataTable
              columns={["Banque", "Type", "Cible", "Questions", "Temps", "Seuil", "Coefficient"]}
              rows={data.banks.map((bank) => [
                <button key={`${bank.id}-title`} type="button" onClick={() => setSelectedBankId(bank.id)} className="text-left font-semibold text-sentinel-800 hover:underline dark:text-sentinel-100">
                  {bank.title}
                </button>,
                <Badge key={`${bank.id}-type`} tone="neutral">
                  {typeLabels[bank.type]}
                </Badge>,
                bank.qualification || bank.site?.name || bank.client?.name || "Entreprise",
                <span key={`${bank.id}-questions`} className={cn((bank.activeQuestionsCount ?? 0) < 30 && "font-semibold text-amber-700 dark:text-amber-200")}>
                  {bank.activeQuestionsCount ?? 0} / 30
                </span>,
                `${bank.timePerQuestionSeconds}s`,
                `${bank.passingScore} %`,
                `x${bank.coefficient}`
              ])}
            />
          </Section>

          {canAdminister ? (
            <Section title="Administration rapide">
              <div className="surface space-y-4 rounded-lg p-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="label">Titre de la banque</label>
                    <input value={bankForm.title} onChange={(event) => setBankForm((current) => ({ ...current, title: event.target.value }))} className="field mt-2" placeholder="Connaissance métier - Rondier intervenant" />
                  </div>
                  <div>
                    <label className="label">Catégorie</label>
                    <select value={bankForm.type} onChange={(event) => setBankForm((current) => ({ ...current, type: event.target.value as QcmBankType }))} className="field mt-2">
                      <option value="ENTREPRISE">Entreprise</option>
                      <option value="METIER">Métier</option>
                      <option value="CLIENT_SITE">Client / site</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Qualification</label>
                    <input value={bankForm.qualification} onChange={(event) => setBankForm((current) => ({ ...current, qualification: event.target.value }))} className="field mt-2" placeholder="APS, SSIAP 1..." />
                  </div>
                  <div>
                    <label className="label">Client</label>
                    <select value={bankForm.clientId} onChange={(event) => setBankForm((current) => ({ ...current, clientId: event.target.value }))} className="field mt-2">
                      <option value="">Aucun</option>
                      {data.clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Site</label>
                    <select value={bankForm.siteId} onChange={(event) => setBankForm((current) => ({ ...current, siteId: event.target.value }))} className="field mt-2">
                      <option value="">Aucun</option>
                      {data.sites.map((site) => (
                        <option key={site.id} value={site.id}>
                          {site.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Questions tirées</label>
                    <input type="number" value={bankForm.questionCountPerSession} onChange={(event) => setBankForm((current) => ({ ...current, questionCountPerSession: Number(event.target.value) }))} className="field mt-2" />
                  </div>
                  <div>
                    <label className="label">Temps par question</label>
                    <input type="number" value={bankForm.timePerQuestionSeconds} onChange={(event) => setBankForm((current) => ({ ...current, timePerQuestionSeconds: Number(event.target.value) }))} className="field mt-2" />
                  </div>
                  <div>
                    <label className="label">Seuil de réussite</label>
                    <input type="number" value={bankForm.passingScore} onChange={(event) => setBankForm((current) => ({ ...current, passingScore: Number(event.target.value) }))} className="field mt-2" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label">Consignes consultables pendant le QCM</label>
                    <textarea value={bankForm.guidanceBody} onChange={(event) => setBankForm((current) => ({ ...current, guidanceBody: event.target.value }))} className="field mt-2 min-h-24 py-3" />
                  </div>
                </div>
                <button type="button" onClick={createBank} className="button-primary">
                  <Plus className="h-4 w-4" />
                  Créer la banque
                </button>
              </div>
            </Section>
          ) : null}

          <Section title={`Questions ${selectedBank ? `- ${selectedBank.title}` : ""}`}>
            <div className="space-y-4">
              <select value={selectedBankId} onChange={(event) => setSelectedBankId(event.target.value)} className="field max-w-xl">
                {data.banks.map((bank) => (
                  <option key={bank.id} value={bank.id}>
                    {bank.title}
                  </option>
                ))}
              </select>
              <div className="grid gap-3">
                {selectedBankQuestions.slice(0, 8).map((question) => (
                  <div key={question.id} className="surface rounded-lg p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-semibold text-ink-950 dark:text-white">{question.label}</p>
                        <p className="mt-1 text-xs text-ink-500 dark:text-ink-300">
                          {question.type === "CHOIX_MULTIPLE" ? "Choix multiple" : "Choix unique"} - {question.difficulty ?? "Difficulté libre"}
                        </p>
                      </div>
                      <Badge tone="neutral">{question.active ? "active" : "inactive"}</Badge>
                    </div>
                    {canViewDetails ? (
                      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                        {question.choices.map((choice) => (
                          <span key={choice.id} className={cn("rounded-lg px-3 py-2", choice.isCorrect ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-100" : "bg-ink-50 text-ink-600 dark:bg-white/5 dark:text-ink-300")}>
                            {choice.label}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </Section>

          {canAdminister ? (
            <Section title="Ajouter une question">
              <div className="surface space-y-4 rounded-lg p-5">
                <div>
                  <label className="label">Libellé</label>
                  <textarea value={questionForm.label} onChange={(event) => setQuestionForm((current) => ({ ...current, label: event.target.value }))} className="field mt-2 min-h-24 py-3" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="label">Type</label>
                    <select value={questionForm.type} onChange={(event) => setQuestionForm((current) => ({ ...current, type: event.target.value as QuestionType }))} className="field mt-2">
                      <option value="CHOIX_UNIQUE">Choix unique</option>
                      <option value="CHOIX_MULTIPLE">Choix multiple</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Difficulté</label>
                    <select value={questionForm.difficulty} onChange={(event) => setQuestionForm((current) => ({ ...current, difficulty: event.target.value }))} className="field mt-2">
                      <option value="FACILE">Facile</option>
                      <option value="MOYEN">Moyen</option>
                      <option value="DIFFICILE">Difficile</option>
                    </select>
                  </div>
                </div>
                <div className="grid gap-3">
                  {questionForm.choices.map((choice, index) => (
                    <div key={index} className="grid gap-2 sm:grid-cols-[1fr_auto]">
                      <input
                        value={choice.label}
                        onChange={(event) =>
                          setQuestionForm((current) => ({
                            ...current,
                            choices: current.choices.map((item, itemIndex) => (itemIndex === index ? { ...item, label: event.target.value } : item))
                          }))
                        }
                        className="field"
                        placeholder={`Réponse ${index + 1}`}
                      />
                      <label className="inline-flex h-11 items-center gap-2 rounded-lg border border-ink-200 px-3 text-sm font-semibold dark:border-white/10">
                        <input
                          type="checkbox"
                          checked={choice.isCorrect}
                          onChange={(event) =>
                            setQuestionForm((current) => ({
                              ...current,
                              choices: current.choices.map((item, itemIndex) => (itemIndex === index ? { ...item, isCorrect: event.target.checked } : item))
                            }))
                          }
                        />
                        Bonne réponse
                      </label>
                    </div>
                  ))}
                </div>
                <div>
                  <label className="label">Explication interne</label>
                  <textarea value={questionForm.explanation} onChange={(event) => setQuestionForm((current) => ({ ...current, explanation: event.target.value }))} className="field mt-2 min-h-20 py-3" />
                </div>
                <button type="button" onClick={createQuestion} className="button-primary">
                  <FileQuestion className="h-4 w-4" />
                  Ajouter la question
                </button>
              </div>
            </Section>
          ) : null}
        </div>
      ) : null}

      {activeTab === "launch" ? (
        <Section title="Lancer un QCM depuis un contrôle">
          <div className="surface space-y-5 rounded-lg p-5">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <label className="label">Contrôle lié</label>
                <select value={launchForm.controlId} onChange={(event) => applyControl(event.target.value)} className="field mt-2">
                  <option value="">Sans contrôle</option>
                  {data.controls.map((control) => (
                    <option key={control.id} value={control.id}>
                      {formatDate(control.startedAt)} - {control.siteName ?? control.site?.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Agent</label>
                <select value={launchForm.agentId} onChange={(event) => setLaunchForm((current) => ({ ...current, agentId: event.target.value }))} className="field mt-2">
                  {data.agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {fullName(agent)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Client</label>
                <select value={launchForm.clientId} onChange={(event) => setLaunchForm((current) => ({ ...current, clientId: event.target.value }))} className="field mt-2">
                  {data.clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Site</label>
                <select value={launchForm.siteId} onChange={(event) => setLaunchForm((current) => ({ ...current, siteId: event.target.value }))} className="field mt-2">
                  {data.sites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="label">Qualification métier</label>
                <input value={launchForm.qualification} onChange={(event) => setLaunchForm((current) => ({ ...current, qualification: event.target.value }))} className="field mt-2" />
              </div>
              <div>
                <label className="label">Moment de lancement</label>
                <select value={launchForm.launchTiming} onChange={(event) => setLaunchForm((current) => ({ ...current, launchTiming: event.target.value }))} className="field mt-2">
                  <option value="PENDANT_CONTROLE">Pendant le contrôle</option>
                  <option value="FIN_CONTROLE">À la fin du contrôle</option>
                  <option value="APRES_CONTROLE">Après le contrôle</option>
                </select>
              </div>
              <div>
                <label className="label">Délai après contrôle</label>
                <input type="number" value={launchForm.delayHours} onChange={(event) => setLaunchForm((current) => ({ ...current, delayHours: Number(event.target.value) }))} className="field mt-2" />
              </div>
            </div>
            <div>
              <p className="label mb-2">Catégories à envoyer</p>
              <div className="grid gap-3 md:grid-cols-3">
                {(["ENTREPRISE", "METIER", "CLIENT_SITE"] as QcmBankType[]).map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => toggleCategory(category)}
                    className={cn(
                      "rounded-lg border p-4 text-left transition",
                      launchForm.categories.includes(category)
                        ? "border-sentinel-700 bg-sentinel-50 text-sentinel-900 dark:border-sentinel-300 dark:bg-sentinel-500/10 dark:text-sentinel-100"
                        : "border-ink-200 bg-white text-ink-600 dark:border-white/10 dark:bg-ink-950 dark:text-ink-300"
                    )}
                  >
                    <span className="font-semibold">{typeLabels[category]}</span>
                    <span className="mt-1 block text-xs">{category === "ENTREPRISE" ? "Coefficient 1" : category === "METIER" ? "Coefficient 2" : "Coefficient 3"}</span>
                  </button>
                ))}
              </div>
            </div>
            <button type="button" onClick={launchSessions} disabled={!canAdminister || !launchForm.categories.length} className="button-primary">
              <Send className="h-4 w-4" />
              Générer et envoyer
            </button>
          </div>
        </Section>
      ) : null}

      {activeTab === "agent" ? (
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <Section title="Sessions à réaliser">
            <div className="space-y-3">
              {pendingSessions.length ? (
                pendingSessions.map((session) => (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => setSelectedSessionId(session.id)}
                    className={cn(
                      "w-full rounded-lg border p-4 text-left transition",
                      selectedSessionId === session.id ? "border-sentinel-700 bg-sentinel-50 dark:border-sentinel-300 dark:bg-sentinel-500/10" : "border-ink-200 bg-white hover:bg-ink-50 dark:border-white/10 dark:bg-ink-900 dark:hover:bg-white/10"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-ink-950 dark:text-white">{session.bankTitle}</p>
                        <p className="mt-1 text-sm text-ink-500 dark:text-ink-300">{session.agentName} - {session.siteName ?? "Site non lié"}</p>
                      </div>
                      <span className={cn("text-xs font-bold", statusTone(session.status))}>{session.status.replaceAll("_", " ")}</span>
                    </div>
                    <div className="mt-3 text-xs text-ink-500 dark:text-ink-300">
                      {session.answeredCount} / {session.selectedQuestionIds.length} réponses - {session.timePerQuestionSeconds}s par question
                    </div>
                  </button>
                ))
              ) : (
                <div className="surface rounded-lg p-6 text-sm text-ink-500 dark:text-ink-300">Aucun QCM à réaliser pour le moment.</div>
              )}
            </div>
          </Section>

          <Section title="Écran chronométré">
            {!selectedSession ? (
              <div className="surface rounded-lg p-6 text-sm text-ink-500 dark:text-ink-300">Sélectionne une session QCM.</div>
            ) : selectedSession.status !== "EN_COURS" ? (
              <div className="surface space-y-4 rounded-lg p-6">
                <div>
                  <p className="text-lg font-semibold text-ink-950 dark:text-white">{selectedSession.bankTitle}</p>
                  <p className="mt-2 text-sm text-ink-500 dark:text-ink-300">{selectedSession.guidanceBody ?? "Les consignes utiles seront consultables pendant le QCM."}</p>
                </div>
                {selectedSession.status === "INTERROMPU" && !selectedSession.resumeAllowed ? (
                  <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-500/10 dark:text-red-100">
                    <AlertTriangle className="mt-0.5 h-4 w-4" />
                    Session interrompue. Un contrôleur ou administrateur doit autoriser la reprise.
                  </div>
                ) : null}
                <button type="button" onClick={() => startSession(selectedSession.id)} disabled={selectedSession.status === "INTERROMPU" && !selectedSession.resumeAllowed} className="button-primary">
                  <Play className="h-4 w-4" />
                  {selectedSession.status === "INTERROMPU" ? "Reprendre le QCM" : "Démarrer le QCM"}
                </button>
              </div>
            ) : activeQuestion ? (
              <div className="surface space-y-5 rounded-lg p-5">
                <div className="flex flex-col gap-3 border-b border-ink-200 pb-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="label">Question {selectedSession.currentQuestionIndex + 1} / {selectedSession.selectedQuestionIds.length}</p>
                    <h2 className="mt-2 text-lg font-semibold text-ink-950 dark:text-white">{activeQuestion.label}</h2>
                  </div>
                  <div className={cn("flex h-16 w-16 shrink-0 items-center justify-center rounded-lg text-xl font-bold", secondsLeft <= 10 ? "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-100" : "bg-sentinel-50 text-sentinel-800 dark:bg-sentinel-500/10 dark:text-sentinel-100")}>
                    {secondsLeft}s
                  </div>
                </div>
                <div className="rounded-lg bg-ink-50 p-4 text-sm text-ink-600 dark:bg-white/5 dark:text-ink-300">
                  <p className="font-semibold text-ink-900 dark:text-white">{selectedSession.guidanceTitle ?? "Consignes utiles"}</p>
                  <p className="mt-1 leading-6">{selectedSession.guidanceBody ?? "Consulte les consignes associées sans quitter la session. Le chronomètre continue pendant la consultation."}</p>
                </div>
                <div className="grid gap-3">
                  {activeQuestion.choices.map((choice) => (
                    <button
                      key={choice.id}
                      type="button"
                      onClick={() => toggleChoice(choice.id)}
                      className={cn(
                        "rounded-lg border p-4 text-left text-sm font-semibold transition",
                        selectedChoices.includes(choice.id)
                          ? "border-sentinel-700 bg-sentinel-50 text-sentinel-900 dark:border-sentinel-300 dark:bg-sentinel-500/10 dark:text-sentinel-100"
                          : "border-ink-200 bg-white text-ink-700 hover:bg-ink-50 dark:border-white/10 dark:bg-ink-950 dark:text-ink-200 dark:hover:bg-white/10"
                      )}
                    >
                      {choice.label}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-3">
                  <button type="button" onClick={() => void submitCurrentQuestion(false)} disabled={!selectedChoices.length || submittingAnswer} className="button-primary">
                    <CheckCircle2 className="h-4 w-4" />
                    Valider la question
                  </button>
                  <button type="button" onClick={() => void interruptSession(selectedSession.id)} className="button-secondary">
                    <PauseCircle className="h-4 w-4" />
                    Interrompre
                  </button>
                </div>
              </div>
            ) : (
              <div className="surface rounded-lg p-6">
                <p className="text-lg font-semibold text-ink-950 dark:text-white">QCM terminé</p>
                <p className="mt-2 text-sm text-ink-500 dark:text-ink-300">Le résultat est enregistré dans l&apos;historique.</p>
              </div>
            )}
          </Section>
        </div>
      ) : null}

      {activeTab === "results" ? (
        <div className="space-y-6">
          <Section title="Historique QCM">
            <DataTable
              columns={["Agent", "QCM", "Catégorie", "Statut", "Score", "Résultat", "Interruptions", "Action"]}
              rows={data.sessions.map((session) => [
                session.agentName,
                <button key={`${session.id}-select`} type="button" onClick={() => setSelectedSessionId(session.id)} className="text-left font-semibold text-sentinel-800 hover:underline dark:text-sentinel-100">
                  {session.bankTitle}
                </button>,
                typeLabels[session.bankType],
                <Badge key={`${session.id}-status`}>{session.status}</Badge>,
                session.score === null || session.score === undefined ? "En attente" : `${session.score} %`,
                session.passed === null || session.passed === undefined ? "Non clôturé" : session.passed ? "Réussi" : "Échec conservé",
                session.interruptions.length,
                session.status === "INTERROMPU" && canAdminister ? (
                  <button key={`${session.id}-resume`} type="button" onClick={() => authorizeResume(session.id)} className="button-secondary h-9 px-3">
                    Autoriser reprise
                  </button>
                ) : (
                  "Non applicable"
                )
              ])}
            />
          </Section>

          {selectedSession ? (
            <Section title="Détail contrôleur">
              <div className="surface rounded-lg p-5">
                <div className="grid gap-4 md:grid-cols-4">
                  <div>
                    <p className="label">Score</p>
                    <p className="mt-2 text-2xl font-semibold text-ink-950 dark:text-white">{selectedSession.score ?? "Non renseigné"}{typeof selectedSession.score === "number" ? " %" : ""}</p>
                  </div>
                  <div>
                    <p className="label">Score pondéré</p>
                    <p className="mt-2 text-2xl font-semibold text-ink-950 dark:text-white">{selectedSession.weightedScore ?? "Non renseigné"}</p>
                  </div>
                  <div>
                    <p className="label">Questions dépassées</p>
                    <p className="mt-2 text-2xl font-semibold text-ink-950 dark:text-white">{selectedSession.timedOutCount}</p>
                  </div>
                  <div>
                    <p className="label">Reprises</p>
                    <p className="mt-2 text-2xl font-semibold text-ink-950 dark:text-white">{selectedSession.resumeCount}</p>
                  </div>
                </div>
                {canViewDetails ? (
                  <div className="mt-6 space-y-3">
                    {selectedSession.selectedQuestionIds.map((questionId) => {
                      const question = data.questions.find((item) => item.id === questionId);
                      const answer = selectedSession.answers.find((item) => item.questionId === questionId);
                      if (!question) return null;
                      return (
                        <div key={questionId} className="rounded-lg border border-ink-200 p-4 dark:border-white/10">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <p className="font-semibold text-ink-950 dark:text-white">{question.label}</p>
                            <span className={cn("text-sm font-bold", answer?.isCorrect ? "text-emerald-700 dark:text-emerald-200" : "text-red-700 dark:text-red-200")}>
                              {answer ? (answer.isCorrect ? "Correct" : answer.timedOut ? "Temps dépassé" : "Incorrect") : "Sans réponse"}
                            </span>
                          </div>
                          <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
                            {question.choices.map((choice) => (
                              <span
                                key={choice.id}
                                className={cn(
                                  "rounded-lg px-3 py-2",
                                  choice.isCorrect
                                    ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-100"
                                    : answer?.selectedChoiceIds.includes(choice.id)
                                      ? "bg-red-50 text-red-800 dark:bg-red-500/10 dark:text-red-100"
                                      : "bg-ink-50 text-ink-600 dark:bg-white/5 dark:text-ink-300"
                                )}
                              >
                                {choice.label}
                              </span>
                            ))}
                          </div>
                          {answer ? <p className="mt-3 text-xs text-ink-500 dark:text-ink-300">Temps passé : {answer.timeSpentSeconds ?? 0}s</p> : null}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-6 text-sm text-ink-500 dark:text-ink-300">Le détail des bonnes et mauvaises réponses est réservé au contrôleur.</p>
                )}
              </div>
            </Section>
          ) : null}
        </div>
      ) : null}

      {activeTab === "stats" ? (
        <Section title="Statistiques QCM">
          <div className="grid gap-4 lg:grid-cols-3">
            {(["ENTREPRISE", "METIER", "CLIENT_SITE"] as QcmBankType[]).map((type) => {
              const sessions = data.sessions.filter((session) => session.bankType === type);
              const completed = sessions.filter((session) => typeof session.score === "number");
              const average = completed.length ? Math.round(completed.reduce((sum, session) => sum + (session.score ?? 0), 0) / completed.length) : 0;
              return (
                <div key={type} className="surface rounded-lg p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-ink-950 dark:text-white">{typeLabels[type]}</p>
                      <p className="mt-1 text-sm text-ink-500 dark:text-ink-300">{sessions.length} session(s)</p>
                    </div>
                    <Badge tone="neutral">coef {type === "ENTREPRISE" ? "1" : type === "METIER" ? "2" : "3"}</Badge>
                  </div>
                  <div className="mt-5">
                    <div className="mb-2 flex justify-between text-sm">
                      <span>Score moyen</span>
                      <span className="font-semibold">{average} %</span>
                    </div>
                    <ProgressBar value={average} tone={scoreTone(average) as "sentinel" | "amber" | "red"} />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-ink-600 dark:text-ink-300">
                    <span>Réussis : {completed.filter((session) => session.passed).length}</span>
                    <span>Échecs : {completed.filter((session) => session.passed === false).length}</span>
                    <span>En cours : {sessions.filter((session) => session.status === "EN_COURS").length}</span>
                    <span>Interrompus : {sessions.filter((session) => session.status === "INTERROMPU").length}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      ) : null}

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-100">
        Les banques livrées contiennent au moins 30 questions actives chacune. Toute nouvelle banque doit atteindre 30 questions pour respecter le standard attendu avant exploitation complète.
      </div>
    </div>
  );
}
