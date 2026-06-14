import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Prisma } from "@prisma/client";
import type { SessionUser } from "@/lib/auth";
import {
  buildInitialControlLibrary,
  calculateControlScore,
  type ControlCriterionSeed,
  type ControlPointResponseOptionSeed,
  type ControlPointSeed,
  type ControlPointSelection,
  type ControlTemplateSeed
} from "@/lib/control-template-library";
import { demoAgents, demoAssignments, demoClients, demoCompany, demoControls, demoPrevention, demoSites } from "@/lib/demo-data";

type JsonRecord = Record<string, unknown>;

export type LocalCompany = {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  siret?: string | null;
  cnapsAuthorizationNumber?: string | null;
  address?: string | null;
  phone?: string | null;
  website?: string | null;
  legalNotice?: string | null;
  status: "ACTIVE" | "SUSPENDED" | "ARCHIVED";
  settings?: JsonRecord | null;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
};

export type LocalClient = {
  id: string;
  companyId: string;
  name: string;
  reference: string;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  address?: string | null;
  settings?: JsonRecord | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
};

export type LocalSite = {
  id: string;
  companyId: string;
  clientId: string;
  name: string;
  reference: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  timezone: string;
  riskLevel?: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
  client?: LocalClient;
};

export type LocalAgent = {
  id: string;
  companyId: string;
  userId?: string | null;
  photoUrl?: string | null;
  civility?: "MONSIEUR" | "MADAME" | null;
  matricule: string;
  firstName: string;
  lastName: string;
  birthDate?: string | null;
  birthPlace?: string | null;
  email?: string | null;
  phone?: string | null;
  professionalCardNumber?: string | null;
  professionalCardExpiresAt?: string | null;
  sstExpiresAt?: string | null;
  ssiapExpiresAt?: string | null;
  diplomas?: string[];
  eligibleJobTitles?: string[];
  contractType?: "CDD" | "CDI" | "APPRENTI" | null;
  hiredAt?: string | null;
  qualityScore: number;
  active: boolean;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
};

export type LocalAssignment = {
  id: string;
  companyId: string;
  agentId: string;
  clientId: string;
  siteId: string;
  jobTitle: string;
  customJobTitle?: string | null;
  startsAt: string;
  endsAt?: string | null;
  status: "ACTIVE" | "PLANNED" | "ENDED" | "ARCHIVED";
  history?: JsonRecord | null;
  createdAt: string;
  updatedAt: string;
  agent?: LocalAgent;
  client?: LocalClient;
  site?: LocalSite;
};

export type LocalQcmBankType = "ENTREPRISE" | "METIER" | "CLIENT_SITE";
export type LocalQcmQuestionType = "CHOIX_UNIQUE" | "CHOIX_MULTIPLE";
export type LocalQcmDifficulty = "FACILE" | "MOYEN" | "DIFFICILE";
export type LocalQcmSessionStatus = "ENVOYE" | "EN_COURS" | "TERMINE" | "INTERROMPU" | "EXPIRE" | "ANNULE";
export type LocalQcmLaunchTiming = "PENDANT_CONTROLE" | "FIN_CONTROLE" | "APRES_CONTROLE";

export type LocalQcmBank = {
  id: string;
  companyId: string;
  type: LocalQcmBankType;
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
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
};

export type LocalQcmChoice = {
  id: string;
  questionId: string;
  label: string;
  isCorrect: boolean;
};

export type LocalQcmQuestion = {
  id: string;
  companyId: string;
  bankId: string;
  label: string;
  type: LocalQcmQuestionType;
  category?: string | null;
  qualification?: string | null;
  clientId?: string | null;
  siteId?: string | null;
  explanation?: string | null;
  active: boolean;
  difficulty?: LocalQcmDifficulty | null;
  sortOrder: number;
  points: number;
  choices: LocalQcmChoice[];
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
};

export type LocalQcmSession = {
  id: string;
  companyId: string;
  bankId: string;
  controlId?: string | null;
  agentId: string;
  clientId?: string | null;
  siteId?: string | null;
  qualification?: string | null;
  launchTiming?: LocalQcmLaunchTiming | null;
  availableAt?: string | null;
  status: LocalQcmSessionStatus;
  score?: number | null;
  passed?: boolean | null;
  weightedScore?: number | null;
  selectedQuestionIds: string[];
  currentQuestionIndex: number;
  resumeAllowed: boolean;
  resumeCount: number;
  interruptionReason?: string | null;
  startedAt?: string | null;
  interruptedAt?: string | null;
  completedAt?: string | null;
  sentById?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LocalQcmAnswer = {
  id: string;
  sessionId: string;
  questionId: string;
  selectedChoiceIds: string[];
  isCorrect: boolean;
  timedOut: boolean;
  timeSpentSeconds?: number | null;
  pointsAwarded: number;
  createdAt: string;
};

export type LocalQcmInterruption = {
  id: string;
  sessionId: string;
  cause: string;
  interruptedAt: string;
  resumedAt?: string | null;
  authorizedById?: string | null;
  metadata?: JsonRecord | null;
};

export type LocalQcmSetting = {
  id: string;
  companyId: string;
  type?: LocalQcmBankType | null;
  questionCountPerSession: number;
  timePerQuestionSeconds: number;
  passingScore: number;
  companyCoefficient: number;
  jobCoefficient: number;
  clientSiteCoefficient: number;
  postControlDelayHours?: number | null;
  createdAt: string;
  updatedAt: string;
};

export type LocalControlTemplate = ControlTemplateSeed;
export type LocalControlCriterion = ControlCriterionSeed;
export type LocalControlPoint = ControlPointSeed;
export type LocalControlPointResponseOption = ControlPointResponseOptionSeed;

export type LocalControlSession = {
  id: string;
  companyId: string;
  controlId?: string | null;
  templateId: string;
  agentId: string;
  clientId: string;
  siteId: string;
  type: "PROGRAMME" | "INOPINE";
  status: "BROUILLON" | "EN_COURS" | "EN_ATTENTE_QCM" | "A_VALIDER" | "VALIDE" | "CLOTURE" | "ANNULE";
  selectedCriterionIds: string[];
  globalScore: number;
  complianceLevel?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  detectedAddress?: string | null;
  observations?: string | null;
  qcmCategories?: string[];
  qcmWeightedScore?: number | null;
  startedAt: string;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
  metadata?: JsonRecord | null;
};

export type LocalControlCriterionResult = {
  id: string;
  sessionId: string;
  criterionId: string;
  score: number;
  comment?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LocalControlPointResult = {
  id: string;
  sessionId: string;
  criterionResultId?: string | null;
  criterionId: string;
  pointId: string;
  responseOptionId: string;
  status: "CONFORME" | "NON_CONFORME" | "SANS_OBJET";
  score: number;
  impactLevel: "VERT" | "JAUNE" | "ORANGE" | "ROUGE" | "CRITIQUE";
  severity: "MINEURE" | "MAJEURE" | "CRITIQUE";
  blockingTriggered: boolean;
  observation?: string | null;
  correctiveAction?: string | null;
  correctionDelayHours?: number | null;
  reportVisibility?: JsonRecord | null;
  createdAt: string;
  updatedAt: string;
};

export type LocalControlNonConformityLink = {
  id: string;
  pointResultId: string;
  nonConformityId: string;
  createdAt: string;
};

export type LocalCorrectiveAction = {
  id: string;
  companyId: string;
  sessionId?: string | null;
  nonConformityId?: string | null;
  title: string;
  description?: string | null;
  severity: "MINEURE" | "MAJEURE" | "CRITIQUE";
  dueAt?: string | null;
  status: "OUVERTE" | "EN_COURS" | "CORRIGEE" | "VALIDEE" | "REFUSEE" | "CLOTUREE";
  assignedToId?: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt?: string | null;
  archivedAt?: string | null;
};

export type LocalControlReport = {
  id: string;
  companyId: string;
  sessionId: string;
  type: "COMPLET_INTERNE" | "SIMPLIFIE_CLIENT" | "RAPPORT_AGENT" | "RAPPORT_DIRECTION";
  title: string;
  fileUrl?: string | null;
  payload?: JsonRecord | null;
  createdAt: string;
};

export type LocalControlEvidence = {
  id: string;
  companyId: string;
  sessionId: string;
  pointResultId?: string | null;
  type: "PHOTO_CAPTURE" | "PHOTO_UPLOAD" | "FILE" | "VOICE_COMMENT" | "SIGNATURE";
  fileName?: string | null;
  fileUrl?: string | null;
  mimeType?: string | null;
  required: boolean;
  createdAt: string;
};

export type LocalControlSignature = {
  id: string;
  companyId: string;
  sessionId: string;
  role: string;
  signerName?: string | null;
  dataUrl: string;
  signedAt: string;
};

export type LocalPreventionMessage = {
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
  createdAt: string;
  updatedAt: string;
};

export type LocalPreventionAcknowledgement = {
  id: string;
  messageId: string;
  userId: string;
  companyId?: string | null;
  answer: string;
  validated: boolean;
  createdAt: string;
};

export type LocalStore = {
  companies: LocalCompany[];
  clients: LocalClient[];
  sites: LocalSite[];
  agents: LocalAgent[];
  assignments: LocalAssignment[];
  qcmBanks: LocalQcmBank[];
  qcmQuestions: LocalQcmQuestion[];
  qcmSessions: LocalQcmSession[];
  qcmAnswers: LocalQcmAnswer[];
  qcmInterruptions: LocalQcmInterruption[];
  qcmSettings: LocalQcmSetting[];
  controlTemplates: LocalControlTemplate[];
  controlCriteria: LocalControlCriterion[];
  controlPoints: LocalControlPoint[];
  controlPointResponseOptions: LocalControlPointResponseOption[];
  controlSessions: LocalControlSession[];
  controlCriterionResults: LocalControlCriterionResult[];
  controlPointResults: LocalControlPointResult[];
  controlNonConformityLinks: LocalControlNonConformityLink[];
  correctiveActions: LocalCorrectiveAction[];
  controlReports: LocalControlReport[];
  controlEvidences: LocalControlEvidence[];
  controlSignatures: LocalControlSignature[];
  preventionMessages: LocalPreventionMessage[];
  preventionAcknowledgements: LocalPreventionAcknowledgement[];
};

export class LocalStoreError extends Error {
  constructor(
    message: string,
    public status = 400
  ) {
    super(message);
  }
}

const localStoreDirectory = process.env.LOCAL_DATASTORE_PATH || path.join(process.cwd(), ".sentinelle");
const localStoreFile = path.join(localStoreDirectory, "local-data.json");

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeOptional(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizeDate(value?: string | null) {
  const normalized = normalizeOptional(value);
  return normalized ? new Date(normalized).toISOString() : null;
}

function normalizeStringArray(value?: string[] | null) {
  return Array.isArray(value) ? [...new Set(value.map((item) => item.trim()).filter(Boolean))] : [];
}

function normalizeCivility(value?: string | null): LocalAgent["civility"] {
  return value === "MONSIEUR" || value === "MADAME" ? value : null;
}

function normalizeContractType(value?: string | null): LocalAgent["contractType"] {
  return value === "CDD" || value === "CDI" || value === "APPRENTI" ? value : null;
}

function normalizeQcmBankType(value?: string | null): LocalQcmBankType {
  return value === "METIER" || value === "CLIENT_SITE" ? value : "ENTREPRISE";
}

function normalizeQuestionType(value?: string | null): LocalQcmQuestionType {
  return value === "CHOIX_MULTIPLE" ? "CHOIX_MULTIPLE" : "CHOIX_UNIQUE";
}

function normalizeDifficulty(value?: string | null): LocalQcmDifficulty | null {
  return value === "FACILE" || value === "MOYEN" || value === "DIFFICILE" ? value : null;
}

function normalizeLaunchTiming(value?: string | null): LocalQcmLaunchTiming {
  if (value === "FIN_CONTROLE" || value === "APRES_CONTROLE") return value;
  return "PENDANT_CONTROLE";
}

function normalizeComparable(value?: string | null) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

const qcmQuestionTemplates = [
  "Quelle est la première action attendue en cas d'anomalie constatée sur le poste ?",
  "Quelle information doit être tracée dans la main courante pendant la vacation ?",
  "Que doit faire l'agent lorsqu'une consigne client paraît incomplète ou contradictoire ?",
  "Quel comportement est attendu lors d'un échange avec un public mécontent ?",
  "Quelle est la conduite à tenir en cas de doute sur le droit d'accès d'une personne ?",
  "Quel document permet de vérifier le droit d'exercer d'un agent de sécurité privée ?",
  "Quelle action est prioritaire lorsqu'un risque immédiat est identifié ?",
  "Que doit faire l'agent avant de quitter temporairement son poste ?",
  "Quelle donnée ne doit pas être communiquée au client sans validation interne ?",
  "Quel réflexe qualité permet de fiabiliser un contrôle ou une ronde ?",
  "Quelle attitude respecte le code de déontologie de la sécurité privée ?",
  "Que doit contenir un compte rendu d'incident exploitable ?",
  "Quelle action est attendue après la découverte d'une porte non sécurisée ?",
  "Comment traiter une instruction orale non prévue dans les consignes ?",
  "Quelle est la bonne pratique pour une prise de poste efficace ?",
  "Que doit faire l'agent face à un équipement de sécurité défaillant ?",
  "Quelle information doit être transmise lors d'une relève ?",
  "Quelle action évite une rupture de continuité de surveillance ?",
  "Quel élément doit rester visible lorsque la mission l'exige ?",
  "Quelle est la réaction attendue face à une suspicion d'ébriété d'un collègue en poste ?",
  "Quelle règle s'applique à l'usage d'un téléphone personnel en vacation ?",
  "Que doit faire l'agent après une ronde présentant une anomalie ?",
  "Quelle preuve peut renforcer une observation de non-conformité ?",
  "Quel principe RGPD doit guider la rédaction d'un commentaire terrain ?",
  "Quelle action est attendue si l'agent ne connaît pas une consigne essentielle ?",
  "Quel est le bon usage des documents du site pendant le QCM ou le contrôle ?",
  "Quelle information doit être vérifiée avant d'appliquer une procédure spécifique ?",
  "Quelle conduite favorise la prévention plutôt que la sanction ?",
  "Quelle donnée doit permettre d'exploiter une statistique qualité ?",
  "Quel élément confirme la clôture correcte d'une action corrective ?"
];

type SeedBankDefinition = Omit<LocalQcmBank, "createdAt" | "updatedAt" | "archivedAt">;

function defaultQcmBanks(): SeedBankDefinition[] {
  const companyId = demoCompany.id;
  return [
    {
      id: "bank_entreprise_ops",
      companyId,
      type: "ENTREPRISE",
      title: "Connaissance entreprise - OPS Sécurité Nord",
      description: "Règles internes, qualité, comportement et procédures générales.",
      coefficient: 1,
      qualification: null,
      clientId: null,
      siteId: null,
      questionCountPerSession: 10,
      timePerQuestionSeconds: 60,
      passingScore: 80,
      active: true,
      guidanceTitle: "Rappels entreprise",
      guidanceBody: "Respecter les consignes internes, tracer les faits importants, alerter l'exploitation et préserver les données sensibles."
    },
    {
      id: "bank_metier_aps",
      companyId,
      type: "METIER",
      title: "Connaissance métier - APS",
      description: "Socle métier APS, accueil, filtrage, rondes et main courante.",
      coefficient: 2,
      qualification: "APS",
      clientId: null,
      siteId: null,
      questionCountPerSession: 10,
      timePerQuestionSeconds: 60,
      passingScore: 80,
      active: true,
      guidanceTitle: "Rappels APS",
      guidanceBody: "Filtrer sans excès, appliquer les consignes, rester visible, tracer les anomalies et alerter sans délai."
    },
    {
      id: "bank_metier_ssiap_1",
      companyId,
      type: "METIER",
      title: "Connaissance métier - SSIAP 1",
      description: "Prévention incendie, SSI, évacuation et rondes sécurité incendie.",
      coefficient: 2,
      qualification: "SSIAP 1",
      clientId: null,
      siteId: null,
      questionCountPerSession: 10,
      timePerQuestionSeconds: 60,
      passingScore: 80,
      active: true,
      guidanceTitle: "Rappels SSIAP 1",
      guidanceBody: "Identifier les risques incendie, vérifier les dégagements, appliquer les procédures SSI et rendre compte précisément."
    },
    {
      id: "bank_metier_ssiap_2",
      companyId,
      type: "METIER",
      title: "Connaissance métier - SSIAP 2",
      description: "Encadrement SSIAP, coordination d'équipe et exploitation des consignes incendie.",
      coefficient: 2,
      qualification: "SSIAP 2",
      clientId: null,
      siteId: null,
      questionCountPerSession: 10,
      timePerQuestionSeconds: 60,
      passingScore: 80,
      active: true,
      guidanceTitle: "Rappels SSIAP 2",
      guidanceBody: "Coordonner les agents, contrôler les rondes, organiser la réponse opérationnelle et conserver une traçabilité claire."
    },
    {
      id: "bank_metier_chef",
      companyId,
      type: "METIER",
      title: "Connaissance métier - Chef de poste",
      description: "Pilotage de poste, relais client, gestion des consignes et coordination terrain.",
      coefficient: 2,
      qualification: "Chef de poste",
      clientId: null,
      siteId: null,
      questionCountPerSession: 10,
      timePerQuestionSeconds: 60,
      passingScore: 80,
      active: true,
      guidanceTitle: "Rappels chef de poste",
      guidanceBody: "S'assurer de la continuité du service, accompagner l'équipe, documenter les écarts et informer la hiérarchie."
    },
    {
      id: "bank_metier_referent",
      companyId,
      type: "METIER",
      title: "Connaissance métier - Référent",
      description: "Référent site, contrôle des pratiques et accompagnement qualité.",
      coefficient: 2,
      qualification: "Référent",
      clientId: null,
      siteId: null,
      questionCountPerSession: 10,
      timePerQuestionSeconds: 60,
      passingScore: 80,
      active: true,
      guidanceTitle: "Rappels référent",
      guidanceBody: "Faire appliquer les consignes, expliquer les écarts, suivre les corrections et remonter les récurrences."
    },
    {
      id: "bank_client_glisy",
      companyId,
      type: "CLIENT_SITE",
      title: "Connaissance client/site - Intermarché Glisy",
      description: "Consignes client, particularités galerie et procédures de site.",
      coefficient: 3,
      qualification: null,
      clientId: "cli_inter",
      siteId: "site_glisy",
      questionCountPerSession: 10,
      timePerQuestionSeconds: 60,
      passingScore: 80,
      active: true,
      guidanceTitle: "Consignes site Glisy",
      guidanceBody: "Appliquer les consignes d'ouverture, surveiller les accès de livraison, tracer les rondes galerie et prévenir le responsable site."
    },
    {
      id: "bank_client_logiparc",
      companyId,
      type: "CLIENT_SITE",
      title: "Connaissance client/site - Logiparc Amiens",
      description: "Consignes logistique nuit, accès chauffeurs et surveillance entrepôt.",
      coefficient: 3,
      qualification: null,
      clientId: "cli_log",
      siteId: "site_logiparc",
      questionCountPerSession: 10,
      timePerQuestionSeconds: 60,
      passingScore: 80,
      active: true,
      guidanceTitle: "Consignes site Logiparc",
      guidanceBody: "Contrôler les accès chauffeurs, respecter les rondes horaires, alerter en cas d'intrusion et documenter les anomalies."
    }
  ];
}

function buildSeedQuestion(bank: SeedBankDefinition, index: number, createdAt: string): LocalQcmQuestion {
  const questionId = `qq_${bank.id}_${String(index + 1).padStart(2, "0")}`;
  const multiple = (index + 1) % 6 === 0;
  const difficulty = index % 3 === 0 ? "FACILE" : index % 3 === 1 ? "MOYEN" : "DIFFICILE";
  const context =
    bank.type === "ENTREPRISE"
      ? "l'entreprise"
      : bank.type === "METIER"
        ? `la qualification ${bank.qualification}`
        : "le client ou le site";
  const label = `${qcmQuestionTemplates[index]} (${context})`;
  const choices = multiple
    ? [
        { label: "Alerter la hiérarchie ou le PC selon la consigne", isCorrect: true },
        { label: "Tracer l'événement dans l'outil prévu", isCorrect: true },
        { label: "Attendre la fin de vacation sans information", isCorrect: false },
        { label: "Communiquer une sanction au client", isCorrect: false }
      ]
    : [
        { label: "Alerter, appliquer la consigne et tracer les faits", isCorrect: true },
        { label: "Improviser une procédure sans validation", isCorrect: false },
        { label: "Ne rien écrire pour éviter une remontée", isCorrect: false },
        { label: "Quitter le poste pour chercher une solution seul", isCorrect: false }
      ];

  return {
    id: questionId,
    companyId: bank.companyId,
    bankId: bank.id,
    label,
    type: multiple ? "CHOIX_MULTIPLE" : "CHOIX_UNIQUE",
    category: bank.type,
    qualification: bank.qualification ?? null,
    clientId: bank.clientId ?? null,
    siteId: bank.siteId ?? null,
    explanation: "Le contrôleur peut utiliser cette explication pour le débriefing, sans l'afficher automatiquement à l'agent.",
    active: true,
    difficulty,
    sortOrder: index,
    points: 1,
    choices: choices.map((choice, choiceIndex) => ({
      id: `${questionId}_c${choiceIndex + 1}`,
      questionId,
      label: choice.label,
      isCorrect: choice.isCorrect
    })),
    createdAt,
    updatedAt: createdAt,
    archivedAt: null
  };
}

function initialQcmData(createdAt: string) {
  const qcmBanks = defaultQcmBanks().map((bank) => ({
    ...bank,
    createdAt,
    updatedAt: createdAt,
    archivedAt: null
  }));
  const qcmQuestions = defaultQcmBanks().flatMap((bank) =>
    qcmQuestionTemplates.map((_, index) => buildSeedQuestion(bank, index, createdAt))
  );
  const selectedQuestionIds = qcmQuestions
    .filter((question) => question.bankId === "bank_client_logiparc")
    .slice(0, 10)
    .map((question) => question.id);
  const qcmSessions: LocalQcmSession[] = [
    {
      id: "qcmsession_marc_logiparc",
      companyId: demoCompany.id,
      bankId: "bank_client_logiparc",
      controlId: "ctrl_2026_05_18",
      agentId: "agt_marc",
      clientId: "cli_log",
      siteId: "site_logiparc",
      qualification: "Chef d'equipe",
      launchTiming: "FIN_CONTROLE",
      availableAt: createdAt,
      status: "ENVOYE",
      score: null,
      passed: null,
      weightedScore: null,
      selectedQuestionIds,
      currentQuestionIndex: 0,
      resumeAllowed: false,
      resumeCount: 0,
      interruptionReason: null,
      startedAt: null,
      interruptedAt: null,
      completedAt: null,
      sentById: "usr_controller",
      createdAt,
      updatedAt: createdAt
    }
  ];
  const qcmSettings: LocalQcmSetting[] = [
    {
      id: "qcmsettings_ops",
      companyId: demoCompany.id,
      type: null,
      questionCountPerSession: 10,
      timePerQuestionSeconds: 60,
      passingScore: 80,
      companyCoefficient: 1,
      jobCoefficient: 2,
      clientSiteCoefficient: 3,
      postControlDelayHours: 72,
      createdAt,
      updatedAt: createdAt
    }
  ];

  return { qcmBanks, qcmQuestions, qcmSessions, qcmAnswers: [] as LocalQcmAnswer[], qcmInterruptions: [] as LocalQcmInterruption[], qcmSettings };
}

function resolveDefaultCompanyId(store: LocalStore, companyId?: string | null) {
  return (
    companyId ??
    store.companies.find((company) => company.status === "ACTIVE")?.id ??
    store.clients.find((client) => client.active)?.companyId ??
    store.agents.find((agent) => agent.active)?.companyId ??
    store.sites.find((site) => site.active)?.companyId ??
    null
  );
}

function initialStore(): LocalStore {
  const createdAt = nowIso();
  const companies = [
    {
      ...demoCompany,
      logoUrl: demoCompany.logoUrl ?? null,
      siret: demoCompany.siret ?? null,
      cnapsAuthorizationNumber: demoCompany.cnapsAuthorizationNumber ?? null,
      address: demoCompany.address ?? null,
      phone: demoCompany.phone ?? null,
      website: demoCompany.website ?? null,
      legalNotice: demoCompany.legalNotice ?? null,
      status: "ACTIVE" as const,
      settings: null,
      createdAt,
      updatedAt: createdAt,
      archivedAt: null
    }
  ];
  const clients = demoClients.map((client) => ({
    ...client,
    contactName: client.contactName ?? null,
    contactEmail: client.contactEmail ?? null,
    contactPhone: null,
    address: client.address ?? null,
    settings: null,
    active: true,
    createdAt,
    updatedAt: createdAt,
    archivedAt: null
  }));
  const sites = demoSites.map((site) => ({
    ...site,
    latitude: null,
    longitude: null,
    timezone: "Europe/Paris",
    riskLevel: site.riskLevel ?? null,
    active: true,
    createdAt,
    updatedAt: createdAt,
    archivedAt: null
  }));
  const agents = demoAgents.map((agent) => ({
    ...agent,
    userId: agent.userId ?? null,
    photoUrl: agent.photoUrl ?? null,
    civility: normalizeCivility(agent.civility),
    birthDate: normalizeDate(agent.birthDate),
    birthPlace: agent.birthPlace ?? null,
    email: agent.email ?? null,
    phone: agent.phone ?? null,
    professionalCardNumber: agent.professionalCardNumber ?? null,
    professionalCardExpiresAt: normalizeDate(agent.professionalCardExpiresAt),
    sstExpiresAt: normalizeDate(agent.sstExpiresAt),
    ssiapExpiresAt: normalizeDate(agent.ssiapExpiresAt),
    diplomas: normalizeStringArray(agent.diplomas),
    eligibleJobTitles: normalizeStringArray(agent.eligibleJobTitles),
    contractType: normalizeContractType(agent.contractType),
    hiredAt: normalizeDate(agent.hiredAt),
    qualityScore: agent.qualityScore ?? 0,
    active: true,
    notes: null,
    createdAt,
    updatedAt: createdAt,
    archivedAt: null
  }));
  const assignments = demoAssignments.map((assignment) => {
    const client = clients.find((item) => item.id === assignment.clientId);
    return {
      ...assignment,
      companyId: client?.companyId ?? clients[0]?.companyId ?? "cmp_ops_nord",
      customJobTitle: null,
      startsAt: normalizeDate(assignment.startsAt) ?? createdAt,
      endsAt: null,
      status: "ACTIVE" as const,
      history: null,
      createdAt,
      updatedAt: createdAt
    };
  });
  const qcmData = initialQcmData(createdAt);
  const controlLibrary = buildInitialControlLibrary(demoCompany.id, createdAt);

  return {
    companies,
    clients,
    sites,
    agents,
    assignments,
    ...qcmData,
    ...controlLibrary,
    controlSessions: [],
    controlCriterionResults: [],
    controlPointResults: [],
    controlNonConformityLinks: [],
    correctiveActions: [],
    controlReports: [],
    controlEvidences: [],
    controlSignatures: [],
    preventionMessages: [
      {
        id: demoPrevention.id,
        companyId: demoCompany.id,
        title: demoPrevention.title,
        theme: "Traçabilité",
        body: demoPrevention.body,
        question: demoPrevention.question,
        expectedAnswer: demoPrevention.expectedAnswer,
        active: true,
        startsAt: null,
        endsAt: null,
        createdAt,
        updatedAt: createdAt
      }
    ],
    preventionAcknowledgements: []
  };
}

function completeStore(partial: Partial<LocalStore>): LocalStore {
  const base = initialStore();
  return {
    companies: partial.companies ?? base.companies,
    clients: partial.clients ?? base.clients,
    sites: partial.sites ?? base.sites,
    agents: partial.agents ?? base.agents,
    assignments: partial.assignments ?? base.assignments,
    qcmBanks: partial.qcmBanks ?? base.qcmBanks,
    qcmQuestions: partial.qcmQuestions ?? base.qcmQuestions,
    qcmSessions: partial.qcmSessions ?? base.qcmSessions,
    qcmAnswers: partial.qcmAnswers ?? base.qcmAnswers,
    qcmInterruptions: partial.qcmInterruptions ?? base.qcmInterruptions,
    qcmSettings: partial.qcmSettings ?? base.qcmSettings,
    controlTemplates: partial.controlTemplates ?? base.controlTemplates,
    controlCriteria: partial.controlCriteria ?? base.controlCriteria,
    controlPoints: partial.controlPoints ?? base.controlPoints,
    controlPointResponseOptions: partial.controlPointResponseOptions ?? base.controlPointResponseOptions,
    controlSessions: partial.controlSessions ?? base.controlSessions,
    controlCriterionResults: partial.controlCriterionResults ?? base.controlCriterionResults,
    controlPointResults: partial.controlPointResults ?? base.controlPointResults,
    controlNonConformityLinks: partial.controlNonConformityLinks ?? base.controlNonConformityLinks,
    correctiveActions: partial.correctiveActions ?? base.correctiveActions,
    controlReports: partial.controlReports ?? base.controlReports,
    controlEvidences: partial.controlEvidences ?? base.controlEvidences,
    controlSignatures: partial.controlSignatures ?? base.controlSignatures,
    preventionMessages: partial.preventionMessages ?? base.preventionMessages,
    preventionAcknowledgements: partial.preventionAcknowledgements ?? base.preventionAcknowledgements
  };
}

export function localPersistenceEnabled() {
  return process.env.LOCAL_DATASTORE_DISABLED !== "true" && (process.env.NODE_ENV !== "production" || process.env.DEMO_MODE === "true" || process.env.LOCAL_DATASTORE_ENABLED === "true");
}

function shouldFallbackToLocalStore(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return ["P1000", "P1001", "P1002", "P1003", "P1017"].includes(error.code);
  }

  const message = error instanceof Error ? error.message : String(error);
  return [
    "Can't reach database server",
    "could not connect",
    "Prisma Client could not locate",
    "Unable to require",
    "Query Engine",
    "code signature",
    "was not initialized",
    "does not exist",
    "Cannot read properties of undefined"
  ].some((item) => message.includes(item));
}

export async function withDatabaseFallback<TDatabase, TLocal>(operation: () => Promise<TDatabase>, fallback: () => Promise<TLocal>, label: string): Promise<TDatabase | TLocal> {
  try {
    return await operation();
  } catch (error) {
    if (!localPersistenceEnabled() || !shouldFallbackToLocalStore(error)) {
      throw error;
    }
    console.warn(`[SENTINELLE] ${label}: bascule sur la persistance locale de developpement.`);
    return fallback();
  }
}

export async function readLocalStore() {
  if (!localPersistenceEnabled()) {
    throw new LocalStoreError("Persistance locale desactivee", 503);
  }

  await mkdir(localStoreDirectory, { recursive: true });

  try {
    const raw = await readFile(localStoreFile, "utf8");
    return completeStore(JSON.parse(raw) as Partial<LocalStore>);
  } catch {
    const store = initialStore();
    await writeLocalStore(store);
    return store;
  }
}

export async function writeLocalStore(store: LocalStore) {
  await mkdir(localStoreDirectory, { recursive: true });
  await writeFile(localStoreFile, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

export function scopedLocalRecords<T extends { companyId: string }>(records: T[], user: SessionUser) {
  return user.role === "SUPER_ADMIN" ? records : records.filter((record) => record.companyId === user.companyId);
}

export function scopedLocalCompanies(companies: LocalCompany[], user: SessionUser) {
  return user.role === "SUPER_ADMIN" ? companies : companies.filter((company) => company.id === user.companyId);
}

function canSeeLocalPreventionMessage(user: SessionUser, message: LocalPreventionMessage) {
  return user.role === "SUPER_ADMIN" || !message.companyId || message.companyId === user.companyId;
}

function canManageLocalPreventionMessage(user: SessionUser, message: LocalPreventionMessage) {
  return user.role === "SUPER_ADMIN" || Boolean(user.companyId && message.companyId === user.companyId);
}

function isLocalPreventionMessageCurrentlyActive(message: LocalPreventionMessage) {
  const now = Date.now();
  const startsAt = message.startsAt ? new Date(message.startsAt).getTime() : null;
  const endsAt = message.endsAt ? new Date(message.endsAt).getTime() : null;
  return message.active && (!startsAt || startsAt <= now) && (!endsAt || endsAt >= now);
}

export async function listLocalPreventionMessages(user: SessionUser, options?: { activeOnly?: boolean; pendingOnly?: boolean }) {
  const store = await readLocalStore();
  const acknowledgedIds = new Set(
    store.preventionAcknowledgements.filter((acknowledgement) => acknowledgement.userId === user.id && acknowledgement.validated).map((acknowledgement) => acknowledgement.messageId)
  );
  return store.preventionMessages
    .filter((message) => canSeeLocalPreventionMessage(user, message))
    .filter((message) => (!options?.activeOnly ? true : isLocalPreventionMessageCurrentlyActive(message)))
    .filter((message) => (!options?.pendingOnly ? true : !acknowledgedIds.has(message.id)))
    .map((message) => ({ ...message, acknowledged: acknowledgedIds.has(message.id) }))
    .sort((a, b) => Number(b.active) - Number(a.active) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function createLocalPreventionMessage(
  user: SessionUser,
  input: Omit<LocalPreventionMessage, "id" | "createdAt" | "updatedAt">
) {
  const store = await readLocalStore();
  const timestamp = nowIso();
  const companyId = user.role === "SUPER_ADMIN" ? input.companyId ?? user.companyId ?? null : user.companyId;
  if (user.role !== "SUPER_ADMIN" && !companyId) throw new LocalStoreError("Entreprise requise", 400);
  const message: LocalPreventionMessage = {
    id: createId("prev"),
    companyId,
    title: input.title.trim(),
    theme: normalizeOptional(input.theme) ?? "Général",
    body: input.body.trim(),
    question: input.question.trim(),
    expectedAnswer: input.expectedAnswer.trim().toLowerCase(),
    active: input.active,
    startsAt: normalizeDate(input.startsAt),
    endsAt: normalizeDate(input.endsAt),
    createdAt: timestamp,
    updatedAt: timestamp
  };
  store.preventionMessages.push(message);
  await writeLocalStore(store);
  return message;
}

export async function updateLocalPreventionMessage(user: SessionUser, id: string, input: Partial<Omit<LocalPreventionMessage, "id" | "createdAt" | "updatedAt">>) {
  const store = await readLocalStore();
  const index = store.preventionMessages.findIndex((message) => message.id === id);
  if (index === -1) throw new LocalStoreError("Message de prévention introuvable", 404);
  const current = store.preventionMessages[index];
  if (!canManageLocalPreventionMessage(user, current)) throw new LocalStoreError("Accès message interdit", 403);
  const updated: LocalPreventionMessage = {
    ...current,
    companyId: user.role === "SUPER_ADMIN" ? input.companyId ?? current.companyId ?? null : current.companyId,
    title: input.title !== undefined ? input.title.trim() : current.title,
    theme: input.theme !== undefined ? normalizeOptional(input.theme) ?? "Général" : current.theme,
    body: input.body !== undefined ? input.body.trim() : current.body,
    question: input.question !== undefined ? input.question.trim() : current.question,
    expectedAnswer: input.expectedAnswer !== undefined ? input.expectedAnswer.trim().toLowerCase() : current.expectedAnswer,
    active: input.active ?? current.active,
    startsAt: input.startsAt !== undefined ? normalizeDate(input.startsAt) : current.startsAt,
    endsAt: input.endsAt !== undefined ? normalizeDate(input.endsAt) : current.endsAt,
    updatedAt: nowIso()
  };
  store.preventionMessages[index] = updated;
  await writeLocalStore(store);
  return updated;
}

export async function acknowledgeLocalPreventionMessage(user: SessionUser, messageId: string, answer: string) {
  const store = await readLocalStore();
  const message = store.preventionMessages.find((item) => item.id === messageId && canSeeLocalPreventionMessage(user, item) && isLocalPreventionMessageCurrentlyActive(item));
  if (!message) throw new LocalStoreError("Message de prévention introuvable", 404);
  const normalizedAnswer = normalizeComparable(answer);
  const normalizedExpected = normalizeComparable(message.expectedAnswer);
  const validated = Boolean(normalizedExpected && normalizedAnswer.includes(normalizedExpected));
  const acknowledgement: LocalPreventionAcknowledgement = {
    id: createId("prevack"),
    messageId,
    userId: user.id,
    companyId: message.companyId ?? user.companyId,
    answer,
    validated,
    createdAt: nowIso()
  };
  store.preventionAcknowledgements.push(acknowledgement);
  await writeLocalStore(store);
  return { acknowledgement, validated, expectedAnswer: message.expectedAnswer };
}

export async function listLocalCompanies(user: SessionUser) {
  const store = await readLocalStore();
  return scopedLocalCompanies(store.companies.filter((company) => company.status !== "ARCHIVED"), user).sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

export async function getLocalCompanyProfile(user: SessionUser) {
  const companies = await listLocalCompanies(user);
  return companies[0] ?? null;
}

export async function createLocalCompany(input: Omit<LocalCompany, "id" | "status" | "createdAt" | "updatedAt" | "archivedAt">) {
  const store = await readLocalStore();
  const timestamp = nowIso();
  const company: LocalCompany = {
    id: createId("cmp"),
    name: input.name.trim(),
    slug: input.slug.trim(),
    logoUrl: normalizeOptional(input.logoUrl),
    siret: normalizeOptional(input.siret),
    cnapsAuthorizationNumber: normalizeOptional(input.cnapsAuthorizationNumber),
    address: normalizeOptional(input.address),
    phone: normalizeOptional(input.phone),
    website: normalizeOptional(input.website),
    legalNotice: normalizeOptional(input.legalNotice),
    status: "ACTIVE",
    settings: input.settings ?? null,
    createdAt: timestamp,
    updatedAt: timestamp,
    archivedAt: null
  };
  store.companies.push(company);
  await writeLocalStore(store);
  return company;
}

export async function updateLocalCompany(user: SessionUser, id: string, input: Partial<LocalCompany>) {
  const store = await readLocalStore();
  const index = store.companies.findIndex((company) => company.id === id);
  if (index === -1) throw new LocalStoreError("Entreprise introuvable", 404);
  const current = store.companies[index];
  if (user.role !== "SUPER_ADMIN" && current.id !== user.companyId) throw new LocalStoreError("Acces entreprise interdit", 403);
  const updated: LocalCompany = {
    ...current,
    ...input,
    name: input.name?.trim() ?? current.name,
    slug: input.slug?.trim() ?? current.slug,
    logoUrl: input.logoUrl !== undefined ? normalizeOptional(input.logoUrl) : current.logoUrl,
    siret: input.siret !== undefined ? normalizeOptional(input.siret) : current.siret,
    cnapsAuthorizationNumber: input.cnapsAuthorizationNumber !== undefined ? normalizeOptional(input.cnapsAuthorizationNumber) : current.cnapsAuthorizationNumber,
    address: input.address !== undefined ? normalizeOptional(input.address) : current.address,
    phone: input.phone !== undefined ? normalizeOptional(input.phone) : current.phone,
    website: input.website !== undefined ? normalizeOptional(input.website) : current.website,
    legalNotice: input.legalNotice !== undefined ? normalizeOptional(input.legalNotice) : current.legalNotice,
    updatedAt: nowIso()
  };
  store.companies[index] = updated;
  await writeLocalStore(store);
  return updated;
}

export function withRelations(store: LocalStore) {
  const clients = store.clients.filter((client) => client.active);
  const sites = store.sites
    .filter((site) => site.active)
    .map((site) => ({
      ...site,
      client: clients.find((client) => client.id === site.clientId)
    }));
  const agents = store.agents.filter((agent) => agent.active);
  const assignments = store.assignments
    .filter((assignment) => assignment.status !== "ARCHIVED")
    .map((assignment) => ({
      ...assignment,
      agent: agents.find((agent) => agent.id === assignment.agentId),
      client: clients.find((client) => client.id === assignment.clientId),
      site: sites.find((site) => site.id === assignment.siteId)
    }));

  return { clients, sites, agents, assignments };
}

export async function listLocalClients(user: SessionUser) {
  const store = await readLocalStore();
  return scopedLocalRecords(withRelations(store).clients, user).sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

export async function createLocalClient(user: SessionUser, input: Omit<LocalClient, "id" | "companyId" | "active" | "createdAt" | "updatedAt" | "archivedAt">, companyId?: string | null) {
  const store = await readLocalStore();
  const resolvedCompanyId = companyId ?? user.companyId ?? resolveDefaultCompanyId(store);
  if (!resolvedCompanyId) throw new LocalStoreError("Entreprise requise", 400);
  if (user.role !== "SUPER_ADMIN" && user.companyId !== resolvedCompanyId) throw new LocalStoreError("Acces entreprise interdit", 403);
  if (store.clients.some((client) => client.companyId === resolvedCompanyId && client.reference === input.reference && client.active)) {
    throw new LocalStoreError("Reference client deja utilisee", 409);
  }

  const timestamp = nowIso();
  const client: LocalClient = {
    id: createId("cli"),
    companyId: resolvedCompanyId,
    name: input.name.trim(),
    reference: input.reference.trim(),
    contactName: normalizeOptional(input.contactName),
    contactEmail: normalizeOptional(input.contactEmail),
    contactPhone: normalizeOptional(input.contactPhone),
    address: normalizeOptional(input.address),
    settings: input.settings ?? null,
    active: true,
    createdAt: timestamp,
    updatedAt: timestamp,
    archivedAt: null
  };

  store.clients.push(client);
  await writeLocalStore(store);
  return client;
}

export async function updateLocalClient(user: SessionUser, id: string, input: Partial<LocalClient>) {
  const store = await readLocalStore();
  const index = store.clients.findIndex((client) => client.id === id);
  if (index === -1) throw new LocalStoreError("Client introuvable", 404);
  const current = store.clients[index];
  if (user.role !== "SUPER_ADMIN" && current.companyId !== user.companyId) throw new LocalStoreError("Acces entreprise interdit", 403);
  const updated: LocalClient = {
    ...current,
    ...input,
    name: input.name?.trim() ?? current.name,
    reference: input.reference?.trim() ?? current.reference,
    contactName: input.contactName !== undefined ? normalizeOptional(input.contactName) : current.contactName,
    contactEmail: input.contactEmail !== undefined ? normalizeOptional(input.contactEmail) : current.contactEmail,
    contactPhone: input.contactPhone !== undefined ? normalizeOptional(input.contactPhone) : current.contactPhone,
    address: input.address !== undefined ? normalizeOptional(input.address) : current.address,
    updatedAt: nowIso()
  };
  store.clients[index] = updated;
  await writeLocalStore(store);
  return updated;
}

export async function archiveLocalClient(user: SessionUser, id: string) {
  return updateLocalClient(user, id, { active: false, archivedAt: nowIso() });
}

export async function listLocalSites(user: SessionUser) {
  const store = await readLocalStore();
  return scopedLocalRecords(withRelations(store).sites, user).sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

export async function createLocalSite(user: SessionUser, input: Omit<LocalSite, "id" | "companyId" | "timezone" | "active" | "createdAt" | "updatedAt" | "archivedAt" | "client">) {
  const store = await readLocalStore();
  const client = store.clients.find((item) => item.id === input.clientId && item.active);
  if (!client) throw new LocalStoreError("Client introuvable", 404);
  if (user.role !== "SUPER_ADMIN" && client.companyId !== user.companyId) throw new LocalStoreError("Acces entreprise interdit", 403);
  if (store.sites.some((site) => site.companyId === client.companyId && site.reference === input.reference && site.active)) {
    throw new LocalStoreError("Reference site deja utilisee", 409);
  }

  const timestamp = nowIso();
  const site: LocalSite = {
    id: createId("site"),
    companyId: client.companyId,
    clientId: client.id,
    name: input.name.trim(),
    reference: input.reference.trim(),
    address: input.address.trim(),
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    timezone: "Europe/Paris",
    riskLevel: normalizeOptional(input.riskLevel),
    active: true,
    createdAt: timestamp,
    updatedAt: timestamp,
    archivedAt: null
  };

  store.sites.push(site);
  await writeLocalStore(store);
  return { ...site, client };
}

export async function updateLocalSite(user: SessionUser, id: string, input: Partial<LocalSite>) {
  const store = await readLocalStore();
  const index = store.sites.findIndex((site) => site.id === id);
  if (index === -1) throw new LocalStoreError("Site introuvable", 404);
  const current = store.sites[index];
  if (user.role !== "SUPER_ADMIN" && current.companyId !== user.companyId) throw new LocalStoreError("Acces entreprise interdit", 403);

  let client = store.clients.find((item) => item.id === current.clientId);
  if (input.clientId && input.clientId !== current.clientId) {
    client = store.clients.find((item) => item.id === input.clientId && item.active);
    if (!client) throw new LocalStoreError("Client introuvable", 404);
    if (client.companyId !== current.companyId) throw new LocalStoreError("Client hors entreprise", 403);
  }

  const updated: LocalSite = {
    ...current,
    ...input,
    clientId: input.clientId ?? current.clientId,
    name: input.name?.trim() ?? current.name,
    reference: input.reference?.trim() ?? current.reference,
    address: input.address?.trim() ?? current.address,
    latitude: input.latitude ?? current.latitude,
    longitude: input.longitude ?? current.longitude,
    riskLevel: input.riskLevel !== undefined ? normalizeOptional(input.riskLevel) : current.riskLevel,
    updatedAt: nowIso()
  };
  store.sites[index] = updated;
  await writeLocalStore(store);
  return { ...updated, client };
}

export async function archiveLocalSite(user: SessionUser, id: string) {
  return updateLocalSite(user, id, { active: false, archivedAt: nowIso() });
}

export async function listLocalAgents(user: SessionUser) {
  const store = await readLocalStore();
  return scopedLocalRecords(withRelations(store).agents, user).sort((a, b) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, "fr"));
}

export async function createLocalAgent(user: SessionUser, input: Omit<LocalAgent, "id" | "companyId" | "qualityScore" | "active" | "createdAt" | "updatedAt" | "archivedAt">, companyId?: string | null) {
  const store = await readLocalStore();
  const resolvedCompanyId = user.companyId ?? resolveDefaultCompanyId(store, companyId);
  if (!resolvedCompanyId) throw new LocalStoreError("Entreprise requise", 400);
  if (user.role !== "SUPER_ADMIN" && user.companyId !== resolvedCompanyId) throw new LocalStoreError("Acces entreprise interdit", 403);
  if (store.agents.some((agent) => agent.companyId === resolvedCompanyId && agent.matricule === input.matricule && agent.active)) {
    throw new LocalStoreError("Matricule deja utilise", 409);
  }

  const timestamp = nowIso();
  const agent: LocalAgent = {
    id: createId("agt"),
    companyId: resolvedCompanyId,
    userId: input.userId ?? null,
    photoUrl: normalizeOptional(input.photoUrl),
    civility: normalizeCivility(input.civility),
    matricule: input.matricule.trim(),
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    birthDate: normalizeDate(input.birthDate),
    birthPlace: normalizeOptional(input.birthPlace),
    email: normalizeOptional(input.email),
    phone: normalizeOptional(input.phone),
    professionalCardNumber: normalizeOptional(input.professionalCardNumber),
    professionalCardExpiresAt: normalizeDate(input.professionalCardExpiresAt),
    sstExpiresAt: normalizeDate(input.sstExpiresAt),
    ssiapExpiresAt: normalizeDate(input.ssiapExpiresAt),
    diplomas: normalizeStringArray(input.diplomas),
    eligibleJobTitles: normalizeStringArray(input.eligibleJobTitles),
    contractType: normalizeContractType(input.contractType),
    hiredAt: normalizeDate(input.hiredAt),
    qualityScore: 0,
    active: true,
    notes: normalizeOptional(input.notes),
    createdAt: timestamp,
    updatedAt: timestamp,
    archivedAt: null
  };

  store.agents.push(agent);
  await writeLocalStore(store);
  return agent;
}

export async function updateLocalAgent(user: SessionUser, id: string, input: Partial<LocalAgent>) {
  const store = await readLocalStore();
  const index = store.agents.findIndex((agent) => agent.id === id);
  if (index === -1) throw new LocalStoreError("Agent introuvable", 404);
  const current = store.agents[index];
  if (user.role !== "SUPER_ADMIN" && current.companyId !== user.companyId) throw new LocalStoreError("Acces entreprise interdit", 403);

  const updated: LocalAgent = {
    ...current,
    ...input,
    photoUrl: input.photoUrl !== undefined ? normalizeOptional(input.photoUrl) : current.photoUrl,
    civility: input.civility !== undefined ? normalizeCivility(input.civility) : current.civility,
    matricule: input.matricule?.trim() ?? current.matricule,
    firstName: input.firstName?.trim() ?? current.firstName,
    lastName: input.lastName?.trim() ?? current.lastName,
    birthDate: input.birthDate !== undefined ? normalizeDate(input.birthDate) : current.birthDate,
    birthPlace: input.birthPlace !== undefined ? normalizeOptional(input.birthPlace) : current.birthPlace,
    email: input.email !== undefined ? normalizeOptional(input.email) : current.email,
    phone: input.phone !== undefined ? normalizeOptional(input.phone) : current.phone,
    professionalCardNumber: input.professionalCardNumber !== undefined ? normalizeOptional(input.professionalCardNumber) : current.professionalCardNumber,
    professionalCardExpiresAt: input.professionalCardExpiresAt !== undefined ? normalizeDate(input.professionalCardExpiresAt) : current.professionalCardExpiresAt,
    sstExpiresAt: input.sstExpiresAt !== undefined ? normalizeDate(input.sstExpiresAt) : current.sstExpiresAt,
    ssiapExpiresAt: input.ssiapExpiresAt !== undefined ? normalizeDate(input.ssiapExpiresAt) : current.ssiapExpiresAt,
    diplomas: input.diplomas !== undefined ? normalizeStringArray(input.diplomas) : (current.diplomas ?? []),
    eligibleJobTitles: input.eligibleJobTitles !== undefined ? normalizeStringArray(input.eligibleJobTitles) : (current.eligibleJobTitles ?? []),
    contractType: input.contractType !== undefined ? normalizeContractType(input.contractType) : current.contractType,
    hiredAt: input.hiredAt !== undefined ? normalizeDate(input.hiredAt) : current.hiredAt,
    notes: input.notes !== undefined ? normalizeOptional(input.notes) : current.notes,
    updatedAt: nowIso()
  };
  store.agents[index] = updated;
  await writeLocalStore(store);
  return updated;
}

export async function archiveLocalAgent(user: SessionUser, id: string) {
  return updateLocalAgent(user, id, { active: false, archivedAt: nowIso() });
}

export async function listLocalAssignments(user: SessionUser) {
  const store = await readLocalStore();
  return scopedLocalRecords(withRelations(store).assignments, user).sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());
}

export async function createLocalAssignment(user: SessionUser, input: Omit<LocalAssignment, "id" | "companyId" | "status" | "createdAt" | "updatedAt" | "agent" | "client" | "site">) {
  const store = await readLocalStore();
  const companyScope = user.companyId;

  const agent = store.agents.find((item) => item.id === input.agentId && (!companyScope || item.companyId === companyScope) && item.active);
  const client = store.clients.find((item) => item.id === input.clientId && (!companyScope || item.companyId === companyScope) && item.active);
  const site = store.sites.find((item) => item.id === input.siteId && (!companyScope || item.companyId === companyScope) && item.clientId === input.clientId && item.active);
  if (!agent || !client || !site) throw new LocalStoreError("Agent, client ou site introuvable", 404);
  if (agent.companyId !== client.companyId || agent.companyId !== site.companyId) throw new LocalStoreError("Agent, client et site doivent appartenir a la meme entreprise", 400);
  if (user.role !== "SUPER_ADMIN" && agent.companyId !== user.companyId) throw new LocalStoreError("Acces entreprise interdit", 403);

  const timestamp = nowIso();
  const assignment: LocalAssignment = {
    id: createId("asg"),
    companyId: agent.companyId,
    agentId: agent.id,
    clientId: client.id,
    siteId: site.id,
    jobTitle: input.jobTitle.trim(),
    customJobTitle: normalizeOptional(input.customJobTitle),
    startsAt: normalizeDate(input.startsAt) ?? timestamp,
    endsAt: normalizeDate(input.endsAt),
    status: "ACTIVE",
    history: null,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  store.assignments.push(assignment);
  await writeLocalStore(store);
  return { ...assignment, agent, client, site };
}

export async function updateLocalAssignment(user: SessionUser, id: string, input: Partial<LocalAssignment>) {
  const store = await readLocalStore();
  const index = store.assignments.findIndex((assignment) => assignment.id === id);
  if (index === -1) throw new LocalStoreError("Affectation introuvable", 404);
  const current = store.assignments[index];
  if (user.role !== "SUPER_ADMIN" && current.companyId !== user.companyId) throw new LocalStoreError("Acces entreprise interdit", 403);

  const updated: LocalAssignment = {
    ...current,
    ...input,
    jobTitle: input.jobTitle?.trim() ?? current.jobTitle,
    customJobTitle: input.customJobTitle !== undefined ? normalizeOptional(input.customJobTitle) : current.customJobTitle,
    startsAt: input.startsAt !== undefined ? (normalizeDate(input.startsAt) ?? current.startsAt) : current.startsAt,
    endsAt: input.endsAt !== undefined ? normalizeDate(input.endsAt) : current.endsAt,
    updatedAt: nowIso()
  };
  store.assignments[index] = updated;
  await writeLocalStore(store);
  const relations = withRelations(store);
  return relations.assignments.find((assignment) => assignment.id === id) ?? updated;
}

export async function archiveLocalAssignment(user: SessionUser, id: string) {
  return updateLocalAssignment(user, id, { status: "ARCHIVED", endsAt: nowIso() });
}

function dueDateIso(hours?: number | null) {
  if (hours === null || hours === undefined) return null;
  const date = new Date();
  date.setHours(date.getHours() + hours);
  return date.toISOString();
}

function canReadControlSession(user: SessionUser, session: LocalControlSession) {
  return user.role === "SUPER_ADMIN" || session.companyId === user.companyId;
}

function enrichLocalControlSession(store: LocalStore, session: LocalControlSession) {
  const template = store.controlTemplates.find((item) => item.id === session.templateId);
  const agent = store.agents.find((item) => item.id === session.agentId);
  const client = store.clients.find((item) => item.id === session.clientId);
  const site = store.sites.find((item) => item.id === session.siteId);
  const criterionResults = store.controlCriterionResults
    .filter((result) => result.sessionId === session.id)
    .map((result) => ({
      ...result,
      criterion: store.controlCriteria.find((criterion) => criterion.id === result.criterionId)
    }));
  const pointResults = store.controlPointResults
    .filter((result) => result.sessionId === session.id)
    .map((result) => ({
      ...result,
      criterion: store.controlCriteria.find((criterion) => criterion.id === result.criterionId),
      point: store.controlPoints.find((point) => point.id === result.pointId),
      responseOption: store.controlPointResponseOptions.find((option) => option.id === result.responseOptionId),
      evidences: store.controlEvidences.filter((evidence) => evidence.pointResultId === result.id),
      nonConformityLink: store.controlNonConformityLinks.find((link) => link.pointResultId === result.id)
    }));
  return {
    ...session,
    template,
    agent,
    agentName: agent ? `${agent.firstName} ${agent.lastName}` : "Agent archivé",
    client,
    clientName: client?.name ?? "Client archivé",
    site,
    siteName: site?.name ?? "Site archivé",
    criterionResults,
    pointResults,
    correctiveActions: store.correctiveActions.filter((action) => action.sessionId === session.id),
    reports: store.controlReports.filter((report) => report.sessionId === session.id),
    evidences: store.controlEvidences.filter((evidence) => evidence.sessionId === session.id),
    signatures: store.controlSignatures.filter((signature) => signature.sessionId === session.id),
    qcmSessions: store.qcmSessions.filter((qcmSession) => qcmSession.controlId === session.controlId)
  };
}

export async function listLocalControlLibrary(user: SessionUser) {
  const store = await readLocalStore();
  const templates = scopedLocalRecords(store.controlTemplates.filter((template) => template.active && !template.archivedAt), user);
  const companyIds = new Set(templates.map((template) => template.companyId));
  const templateIds = new Set(templates.map((template) => template.id));
  const criteria = store.controlCriteria
    .filter((criterion) => templateIds.has(criterion.templateId) && criterion.active && !criterion.archivedAt)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const criterionIds = new Set(criteria.map((criterion) => criterion.id));
  const points = store.controlPoints
    .filter((point) => criterionIds.has(point.criterionId) && point.active && !point.archivedAt)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const pointIds = new Set(points.map((point) => point.id));
  const responseOptions = store.controlPointResponseOptions
    .filter((option) => pointIds.has(option.pointId) && option.active && !option.archivedAt)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const sessions = store.controlSessions.filter((session) => canReadControlSession(user, session)).map((session) => enrichLocalControlSession(store, session));
  return {
    templates,
    criteria,
    points,
    responseOptions,
    sessions,
    agents: scopedLocalRecords(store.agents.filter((agent) => agent.active && companyIds.has(agent.companyId)), user),
    clients: scopedLocalRecords(store.clients.filter((client) => client.active && companyIds.has(client.companyId)), user),
    sites: scopedLocalRecords(store.sites.filter((site) => site.active && companyIds.has(site.companyId)), user),
    stats: {
      templates: templates.length,
      criteria: criteria.length,
      points: points.length,
      responseOptions: responseOptions.length,
      sessions: sessions.length
    }
  };
}

export async function createLocalControlTemplate(
  user: SessionUser,
  input: {
    companyId?: string | null;
    title: string;
    description?: string | null;
  }
) {
  const store = await readLocalStore();
  const companyId = input.companyId ?? user.companyId ?? resolveDefaultCompanyId(store);
  if (!companyId) throw new LocalStoreError("Entreprise requise", 400);
  assertLocalCompanyAccess(user, companyId);
  const timestamp = nowIso();
  const template: LocalControlTemplate = {
    id: createId("tpl"),
    companyId,
    title: input.title.trim(),
    description: normalizeOptional(input.description),
    version: 1,
    active: true,
    reportRules: {
      reportTypes: ["COMPLET_INTERNE", "RAPPORT_AGENT", "RAPPORT_DIRECTION", "SIMPLIFIE_CLIENT"],
      qcmIncluded: true
    },
    createdAt: timestamp,
    updatedAt: timestamp,
    archivedAt: null
  };
  store.controlTemplates.push(template);
  await writeLocalStore(store);
  return template;
}

export async function updateLocalControlTemplate(user: SessionUser, id: string, input: Partial<LocalControlTemplate>) {
  const store = await readLocalStore();
  const index = store.controlTemplates.findIndex((template) => template.id === id);
  if (index === -1) throw new LocalStoreError("Modèle de contrôle introuvable", 404);
  const current = store.controlTemplates[index];
  assertLocalCompanyAccess(user, current.companyId);
  const updated: LocalControlTemplate = {
    ...current,
    ...input,
    title: input.title?.trim() ?? current.title,
    description: input.description !== undefined ? normalizeOptional(input.description) : current.description,
    updatedAt: nowIso()
  };
  store.controlTemplates[index] = updated;
  await writeLocalStore(store);
  return updated;
}

export async function archiveLocalControlTemplate(user: SessionUser, id: string) {
  return updateLocalControlTemplate(user, id, { active: false, archivedAt: nowIso() });
}

export async function createLocalControlCriterion(
  user: SessionUser,
  input: {
    templateId: string;
    label: string;
    description?: string | null;
    coefficient?: number;
  }
) {
  const store = await readLocalStore();
  const template = store.controlTemplates.find((item) => item.id === input.templateId && item.active && !item.archivedAt);
  if (!template) throw new LocalStoreError("Modèle de contrôle introuvable", 404);
  assertLocalCompanyAccess(user, template.companyId);
  const timestamp = nowIso();
  const criterion: LocalControlCriterion = {
    id: createId("crit"),
    companyId: template.companyId,
    templateId: template.id,
    label: input.label.trim(),
    description: normalizeOptional(input.description),
    coefficient: input.coefficient ?? 1,
    sortOrder: store.controlCriteria.filter((item) => item.templateId === template.id).length + 1,
    active: true,
    createdAt: timestamp,
    updatedAt: timestamp,
    archivedAt: null
  };
  store.controlCriteria.push(criterion);
  await writeLocalStore(store);
  return criterion;
}

export async function updateLocalControlCriterion(user: SessionUser, id: string, input: Partial<LocalControlCriterion>) {
  const store = await readLocalStore();
  const index = store.controlCriteria.findIndex((criterion) => criterion.id === id);
  if (index === -1) throw new LocalStoreError("Critère de contrôle introuvable", 404);
  const current = store.controlCriteria[index];
  assertLocalCompanyAccess(user, current.companyId);
  const updated: LocalControlCriterion = {
    ...current,
    ...input,
    label: input.label?.trim() ?? current.label,
    description: input.description !== undefined ? normalizeOptional(input.description) : current.description,
    updatedAt: nowIso()
  };
  store.controlCriteria[index] = updated;
  await writeLocalStore(store);
  return updated;
}

export async function archiveLocalControlCriterion(user: SessionUser, id: string) {
  return updateLocalControlCriterion(user, id, { active: false, archivedAt: nowIso() });
}

export async function createLocalControlPoint(
  user: SessionUser,
  input: {
    criterionId: string;
    label: string;
    coefficient?: number;
    defaultSeverity?: LocalControlPoint["defaultSeverity"];
    blocking?: boolean;
    defaultCorrectiveAction?: string | null;
    defaultCorrectionDelayHours?: number | null;
    photoRequirement?: LocalControlPoint["photoRequirement"];
    fileRequirement?: LocalControlPoint["fileRequirement"];
    voiceRequirement?: LocalControlPoint["voiceRequirement"];
    visibleInAgentReport?: boolean;
    visibleInDirectionReport?: boolean;
    visibleInClientReport?: boolean;
  }
) {
  const store = await readLocalStore();
  const criterion = store.controlCriteria.find((item) => item.id === input.criterionId && item.active && !item.archivedAt);
  if (!criterion) throw new LocalStoreError("Critère de contrôle introuvable", 404);
  assertLocalCompanyAccess(user, criterion.companyId);
  const timestamp = nowIso();
  const pointId = createId("pt");
  const point: LocalControlPoint = {
    id: pointId,
    companyId: criterion.companyId,
    criterionId: criterion.id,
    label: input.label.trim(),
    description: null,
    coefficient: input.coefficient ?? 1,
    defaultSeverity: input.defaultSeverity ?? "MINEURE",
    blocking: input.blocking ?? false,
    defaultCorrectiveAction: normalizeOptional(input.defaultCorrectiveAction) ?? "Rappeler la consigne et suivre la correction.",
    defaultCorrectionDelayHours: input.defaultCorrectionDelayHours ?? 48,
    photoRequirement: input.photoRequirement ?? "OPTIONAL",
    fileRequirement: input.fileRequirement ?? "NONE",
    voiceRequirement: input.voiceRequirement ?? "OPTIONAL",
    visibleInAgentReport: input.visibleInAgentReport ?? true,
    visibleInDirectionReport: input.visibleInDirectionReport ?? true,
    visibleInClientReport: input.visibleInClientReport ?? true,
    sortOrder: store.controlPoints.filter((item) => item.criterionId === criterion.id).length + 1,
    active: true,
    createdAt: timestamp,
    updatedAt: timestamp,
    archivedAt: null
  };
  const ncSeverity = point.blocking ? "CRITIQUE" : point.defaultSeverity;
  const options: LocalControlPointResponseOption[] = [
    {
      id: `${pointId}_conforme`,
      companyId: point.companyId,
      pointId,
      status: "CONFORME",
      label: "Conforme : exigence respectée",
      impactLevel: "VERT",
      severity: "MINEURE",
      score: 100,
      affectsScore: true,
      affectsCompliance: true,
      correctiveAction: null,
      correctionDelayHours: null,
      blocking: false,
      notificationRequired: false,
      visibleInAgentReport: true,
      visibleInDirectionReport: true,
      visibleInClientReport: true,
      sortOrder: 0,
      active: true,
      createdAt: timestamp,
      updatedAt: timestamp,
      archivedAt: null
    },
    {
      id: `${pointId}_non_conforme`,
      companyId: point.companyId,
      pointId,
      status: "NON_CONFORME",
      label: `Non conforme : ${point.label.toLowerCase()}`,
      impactLevel: point.blocking ? "CRITIQUE" : ncSeverity === "MAJEURE" ? "ROUGE" : "ORANGE",
      severity: ncSeverity,
      score: point.blocking ? 0 : ncSeverity === "MAJEURE" ? 35 : 60,
      affectsScore: true,
      affectsCompliance: true,
      correctiveAction: point.defaultCorrectiveAction,
      correctionDelayHours: point.defaultCorrectionDelayHours,
      blocking: point.blocking,
      notificationRequired: point.blocking,
      visibleInAgentReport: point.visibleInAgentReport,
      visibleInDirectionReport: point.visibleInDirectionReport,
      visibleInClientReport: point.visibleInClientReport,
      sortOrder: 1,
      active: true,
      createdAt: timestamp,
      updatedAt: timestamp,
      archivedAt: null
    },
    {
      id: `${pointId}_sans_objet`,
      companyId: point.companyId,
      pointId,
      status: "SANS_OBJET",
      label: "Sans objet : exigence non applicable",
      impactLevel: "JAUNE",
      severity: "MINEURE",
      score: 100,
      affectsScore: false,
      affectsCompliance: false,
      correctiveAction: null,
      correctionDelayHours: null,
      blocking: false,
      notificationRequired: false,
      visibleInAgentReport: true,
      visibleInDirectionReport: true,
      visibleInClientReport: true,
      sortOrder: 2,
      active: true,
      createdAt: timestamp,
      updatedAt: timestamp,
      archivedAt: null
    }
  ];
  store.controlPoints.push(point);
  store.controlPointResponseOptions.push(...options);
  await writeLocalStore(store);
  return { point, responseOptions: options };
}

export async function updateLocalControlPoint(user: SessionUser, id: string, input: Partial<LocalControlPoint>) {
  const store = await readLocalStore();
  const index = store.controlPoints.findIndex((point) => point.id === id);
  if (index === -1) throw new LocalStoreError("Point de contrôle introuvable", 404);
  const current = store.controlPoints[index];
  assertLocalCompanyAccess(user, current.companyId);
  const updated: LocalControlPoint = {
    ...current,
    ...input,
    label: input.label?.trim() ?? current.label,
    defaultCorrectiveAction: input.defaultCorrectiveAction !== undefined ? normalizeOptional(input.defaultCorrectiveAction) : current.defaultCorrectiveAction,
    updatedAt: nowIso()
  };
  store.controlPoints[index] = updated;
  await writeLocalStore(store);
  return updated;
}

export async function archiveLocalControlPoint(user: SessionUser, id: string) {
  return updateLocalControlPoint(user, id, { active: false, archivedAt: nowIso() });
}

function normalizeControlPointStatus(value?: string | null): LocalControlPointResponseOption["status"] {
  if (value === "NON_CONFORME" || value === "SANS_OBJET") return value;
  return "CONFORME";
}

function normalizeControlImpact(value?: string | null): LocalControlPointResponseOption["impactLevel"] {
  if (value === "JAUNE" || value === "ORANGE" || value === "ROUGE" || value === "CRITIQUE") return value;
  return "VERT";
}

function normalizeSeverity(value?: string | null): LocalControlPointResponseOption["severity"] {
  if (value === "MAJEURE" || value === "CRITIQUE") return value;
  return "MINEURE";
}

export async function createLocalControlResponseOption(
  user: SessionUser,
  input: {
    pointId: string;
    status?: string;
    label: string;
    impactLevel?: string;
    severity?: string;
    score?: number;
    affectsScore?: boolean;
    affectsCompliance?: boolean;
    correctiveAction?: string | null;
    correctionDelayHours?: number | null;
    blocking?: boolean;
    notificationRequired?: boolean;
    visibleInAgentReport?: boolean;
    visibleInDirectionReport?: boolean;
    visibleInClientReport?: boolean;
  }
) {
  const store = await readLocalStore();
  const point = store.controlPoints.find((item) => item.id === input.pointId && item.active && !item.archivedAt);
  if (!point) throw new LocalStoreError("Point de contrôle introuvable", 404);
  assertLocalCompanyAccess(user, point.companyId);
  const timestamp = nowIso();
  const responseOption: LocalControlPointResponseOption = {
    id: createId("resp"),
    companyId: point.companyId,
    pointId: point.id,
    status: normalizeControlPointStatus(input.status),
    label: input.label.trim(),
    impactLevel: normalizeControlImpact(input.impactLevel),
    severity: normalizeSeverity(input.severity),
    score: Math.max(0, Math.min(100, input.score ?? 100)),
    affectsScore: input.affectsScore ?? true,
    affectsCompliance: input.affectsCompliance ?? true,
    correctiveAction: normalizeOptional(input.correctiveAction),
    correctionDelayHours: input.correctionDelayHours ?? null,
    blocking: input.blocking ?? false,
    notificationRequired: input.notificationRequired ?? false,
    visibleInAgentReport: input.visibleInAgentReport ?? true,
    visibleInDirectionReport: input.visibleInDirectionReport ?? true,
    visibleInClientReport: input.visibleInClientReport ?? true,
    sortOrder: store.controlPointResponseOptions.filter((item) => item.pointId === point.id).length,
    active: true,
    createdAt: timestamp,
    updatedAt: timestamp,
    archivedAt: null
  };
  store.controlPointResponseOptions.push(responseOption);
  await writeLocalStore(store);
  return responseOption;
}

export async function updateLocalControlResponseOption(user: SessionUser, id: string, input: Partial<LocalControlPointResponseOption>) {
  const store = await readLocalStore();
  const index = store.controlPointResponseOptions.findIndex((option) => option.id === id);
  if (index === -1) throw new LocalStoreError("Réponse de contrôle introuvable", 404);
  const current = store.controlPointResponseOptions[index];
  assertLocalCompanyAccess(user, current.companyId);
  const updated: LocalControlPointResponseOption = {
    ...current,
    ...input,
    status: input.status ? normalizeControlPointStatus(input.status) : current.status,
    label: input.label?.trim() ?? current.label,
    impactLevel: input.impactLevel ? normalizeControlImpact(input.impactLevel) : current.impactLevel,
    severity: input.severity ? normalizeSeverity(input.severity) : current.severity,
    score: input.score !== undefined ? Math.max(0, Math.min(100, input.score)) : current.score,
    correctiveAction: input.correctiveAction !== undefined ? normalizeOptional(input.correctiveAction) : current.correctiveAction,
    updatedAt: nowIso()
  };
  store.controlPointResponseOptions[index] = updated;
  await writeLocalStore(store);
  return updated;
}

export async function archiveLocalControlResponseOption(user: SessionUser, id: string) {
  return updateLocalControlResponseOption(user, id, { active: false, archivedAt: nowIso() });
}

export async function createLocalDynamicControlSession(
  user: SessionUser,
  input: {
    type: "PROGRAMME" | "INOPINE";
    templateId: string;
    selectedCriterionIds: string[];
    pointResults: ControlPointSelection[];
    agentId: string;
    clientId: string;
    siteId: string;
    latitude?: number | null;
    longitude?: number | null;
    detectedAddress?: string | null;
    observations?: string | null;
    agentSignature?: string | null;
    controllerSignature?: string | null;
    qcmCategories?: string[];
  }
) {
  const store = await readLocalStore();
  const template = store.controlTemplates.find((item) => item.id === input.templateId && item.active && !item.archivedAt);
  if (!template) throw new LocalStoreError("Modèle de contrôle introuvable", 404);
  assertLocalCompanyAccess(user, template.companyId);
  const agent = store.agents.find((item) => item.id === input.agentId && item.companyId === template.companyId && item.active);
  const client = store.clients.find((item) => item.id === input.clientId && item.companyId === template.companyId && item.active);
  const site = store.sites.find((item) => item.id === input.siteId && item.companyId === template.companyId && item.active);
  if (!agent || !client || !site) throw new LocalStoreError("Agent, client ou site introuvable", 404);
  if (site.clientId !== client.id) throw new LocalStoreError("Le site sélectionné n'appartient pas au client choisi", 400);

  const templateCriteria = store.controlCriteria.filter((criterion) => criterion.templateId === template.id && criterion.active && !criterion.archivedAt);
  const selectedCriterionIds = input.selectedCriterionIds.length ? input.selectedCriterionIds : templateCriteria.map((criterion) => criterion.id);
  const allowedCriterionIds = new Set(templateCriteria.map((criterion) => criterion.id));
  const selectedSet = new Set(selectedCriterionIds);
  if ([...selectedSet].some((criterionId) => !allowedCriterionIds.has(criterionId))) {
    throw new LocalStoreError("Un ou plusieurs critères ne font pas partie du modèle", 400);
  }
  const selectedPointIds = new Set(store.controlPoints.filter((point) => selectedSet.has(point.criterionId) && point.active && !point.archivedAt).map((point) => point.id));
  const optionById = new Map(store.controlPointResponseOptions.map((option) => [option.id, option]));
  if (!input.pointResults.length || input.pointResults.some((result) => !selectedPointIds.has(result.pointId) || optionById.get(result.responseOptionId)?.pointId !== result.pointId)) {
    throw new LocalStoreError("Résultats de points de contrôle invalides", 400);
  }

  const timestamp = nowIso();
  const score = calculateControlScore(
    {
      controlCriteria: store.controlCriteria,
      controlPoints: store.controlPoints,
      controlPointResponseOptions: store.controlPointResponseOptions
    },
    [...selectedSet],
    input.pointResults
  );
  const controlId = createId("ctrl");
  const sessionId = createId("csession");
  const session: LocalControlSession = {
    id: sessionId,
    companyId: template.companyId,
    controlId,
    templateId: template.id,
    agentId: agent.id,
    clientId: client.id,
    siteId: site.id,
    type: input.type,
    status: input.qcmCategories?.length ? "EN_ATTENTE_QCM" : "A_VALIDER",
    selectedCriterionIds: [...selectedSet],
    globalScore: score.globalScore,
    complianceLevel: score.complianceLevel,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    detectedAddress: normalizeOptional(input.detectedAddress),
    observations: normalizeOptional(input.observations),
    qcmCategories: input.qcmCategories ?? [],
    qcmWeightedScore: null,
    startedAt: timestamp,
    completedAt: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
    archivedAt: null,
    metadata: {
      controllerId: user.id,
      controllerName: `${user.firstName} ${user.lastName}`,
      qcmFeedsScore: true
    }
  };

  const criterionResults: LocalControlCriterionResult[] = score.criterionScores.map((criterionScore) => ({
    id: createId("cresult"),
    sessionId,
    criterionId: criterionScore.criterionId,
    score: criterionScore.score,
    comment: null,
    createdAt: timestamp,
    updatedAt: timestamp
  }));
  const criterionResultIdByCriterion = new Map(criterionResults.map((result) => [result.criterionId, result.id]));
  const pointById = new Map(store.controlPoints.map((point) => [point.id, point]));
  const pointResults: LocalControlPointResult[] = input.pointResults.map((result) => {
    const option = optionById.get(result.responseOptionId);
    if (!option) throw new LocalStoreError("Réponse de point introuvable", 404);
    return {
      id: createId("presult"),
      sessionId,
      criterionResultId: criterionResultIdByCriterion.get(result.criterionId) ?? null,
      criterionId: result.criterionId,
      pointId: result.pointId,
      responseOptionId: result.responseOptionId,
      status: option.status,
      score: option.score,
      impactLevel: option.impactLevel,
      severity: option.severity,
      blockingTriggered: option.blocking,
      observation: normalizeOptional(result.observation),
      correctiveAction: option.correctiveAction ?? pointById.get(result.pointId)?.defaultCorrectiveAction ?? null,
      correctionDelayHours: option.correctionDelayHours ?? pointById.get(result.pointId)?.defaultCorrectionDelayHours ?? null,
      reportVisibility: {
        agent: option.visibleInAgentReport,
        direction: option.visibleInDirectionReport,
        client: option.visibleInClientReport
      },
      createdAt: timestamp,
      updatedAt: timestamp
    };
  });
  const nonConformingPointResults = pointResults.filter((result) => result.status === "NON_CONFORME");
  const nonConformityLinks: LocalControlNonConformityLink[] = nonConformingPointResults.map((result) => ({
    id: createId("nclink"),
    pointResultId: result.id,
    nonConformityId: createId(result.blockingTriggered ? "nc_critique" : "nc"),
    createdAt: timestamp
  }));
  const correctiveActions: LocalCorrectiveAction[] = nonConformingPointResults.map((result) => {
    const point = pointById.get(result.pointId);
    const link = nonConformityLinks.find((item) => item.pointResultId === result.id);
    return {
      id: createId("action"),
      companyId: template.companyId,
      sessionId,
      nonConformityId: link?.nonConformityId ?? null,
      title: `Action corrective - ${point?.label ?? "Point de contrôle"}`,
      description: result.correctiveAction ?? "Correction à définir par le contrôleur.",
      severity: result.severity,
      dueAt: dueDateIso(result.correctionDelayHours),
      status: "OUVERTE",
      assignedToId: agent.userId ?? null,
      createdAt: timestamp,
      updatedAt: timestamp,
      closedAt: null,
      archivedAt: null
    };
  });
  const reports: LocalControlReport[] = [
    { type: "COMPLET_INTERNE", title: "Rapport complet interne" },
    { type: "RAPPORT_AGENT", title: "Rapport agent" },
    { type: "RAPPORT_DIRECTION", title: "Rapport direction" },
    { type: "SIMPLIFIE_CLIENT", title: "Rapport client simplifié" }
  ].map((report) => ({
    id: createId("creport"),
    companyId: template.companyId,
    sessionId,
    type: report.type as LocalControlReport["type"],
    title: report.title,
    fileUrl: `/api/reports/control/${sessionId}?type=${report.type}`,
    payload: {
      globalScore: score.globalScore,
      complianceLevel: score.complianceLevel,
      criteriaCount: selectedSet.size,
      pointsCount: pointResults.length,
      nonConformitiesCount: nonConformingPointResults.length,
      criticalAlertsCount: score.criticalAlerts.length,
      qcmIncluded: true
    },
    createdAt: timestamp
  }));
  const signatures: LocalControlSignature[] = [
    input.agentSignature
      ? {
          id: createId("sig"),
          companyId: template.companyId,
          sessionId,
          role: "agent",
          signerName: `${agent.firstName} ${agent.lastName}`,
          dataUrl: input.agentSignature,
          signedAt: timestamp
        }
      : null,
    input.controllerSignature
      ? {
          id: createId("sig"),
          companyId: template.companyId,
          sessionId,
          role: "controleur",
          signerName: `${user.firstName} ${user.lastName}`,
          dataUrl: input.controllerSignature,
          signedAt: timestamp
        }
      : null
  ].filter(Boolean) as LocalControlSignature[];
  const evidences: LocalControlEvidence[] = pointResults
    .filter((result) => result.status === "NON_CONFORME")
    .map((result) => ({
      id: createId("cevidence"),
      companyId: template.companyId,
      sessionId,
      pointResultId: result.id,
      type: "PHOTO_UPLOAD",
      fileName: null,
      fileUrl: null,
      mimeType: null,
      required: pointById.get(result.pointId)?.photoRequirement === "REQUIRED" || pointById.get(result.pointId)?.fileRequirement === "REQUIRED",
      createdAt: timestamp
    }));

  store.controlSessions.push(session);
  store.controlCriterionResults.push(...criterionResults);
  store.controlPointResults.push(...pointResults);
  store.controlNonConformityLinks.push(...nonConformityLinks);
  store.correctiveActions.push(...correctiveActions);
  store.controlReports.push(...reports);
  store.controlSignatures.push(...signatures);
  store.controlEvidences.push(...evidences);
  await writeLocalStore(store);

  return {
    control: {
      id: controlId,
      companyId: template.companyId,
      type: session.type,
      status: session.status,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
      controllerId: user.id,
      controllerName: `${user.firstName} ${user.lastName}`,
      agentId: agent.id,
      agentName: `${agent.firstName} ${agent.lastName}`,
      clientId: client.id,
      clientName: client.name,
      siteId: site.id,
      siteName: site.name,
      detectedAddress: session.detectedAddress,
      globalScore: session.globalScore,
      complianceLevel: session.complianceLevel,
      observations: session.observations,
      itemResults: pointResults.map((result) => ({
        itemId: result.pointId,
        label: pointById.get(result.pointId)?.label ?? "Point de contrôle",
        score: result.score,
        compliant: result.status !== "NON_CONFORME"
      }))
    },
    session: enrichLocalControlSession(store, session),
    generatedNonConformities: nonConformingPointResults.length,
    criticalAlerts: score.criticalAlerts.length,
    reports
  };
}

function assertLocalCompanyAccess(user: SessionUser, companyId: string) {
  if (user.role !== "SUPER_ADMIN" && user.companyId !== companyId) {
    throw new LocalStoreError("Acces entreprise interdit", 403);
  }
}

function canReadQcmSession(user: SessionUser, store: LocalStore, session: LocalQcmSession) {
  if (user.role === "SUPER_ADMIN") return true;
  if (user.role === "AGENT") {
    const agent = store.agents.find((item) => item.id === session.agentId);
    return agent?.userId === user.id || agent?.email === user.email;
  }
  return session.companyId === user.companyId;
}

function activeQuestionsForBank(store: LocalStore, bankId: string) {
  return store.qcmQuestions
    .filter((question) => question.bankId === bankId && question.active && !question.archivedAt)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

function enrichLocalQcmSession(store: LocalStore, session: LocalQcmSession) {
  const bank = store.qcmBanks.find((item) => item.id === session.bankId);
  const agent = store.agents.find((item) => item.id === session.agentId);
  const client = store.clients.find((item) => item.id === session.clientId);
  const site = store.sites.find((item) => item.id === session.siteId);
  const control = demoControls.find((item) => item.id === session.controlId);
  const answers = store.qcmAnswers.filter((answer) => answer.sessionId === session.id);
  const interruptions = store.qcmInterruptions.filter((interruption) => interruption.sessionId === session.id);
  return {
    ...session,
    bank,
    bankTitle: bank?.title ?? "Banque QCM archivée",
    bankType: bank?.type ?? "ENTREPRISE",
    coefficient: bank?.coefficient ?? 1,
    passingScore: bank?.passingScore ?? 80,
    timePerQuestionSeconds: bank?.timePerQuestionSeconds ?? 60,
    guidanceTitle: bank?.guidanceTitle ?? null,
    guidanceBody: bank?.guidanceBody ?? null,
    agent,
    agentName: agent ? `${agent.firstName} ${agent.lastName}` : "Agent archivé",
    client,
    clientName: client?.name ?? control?.clientName ?? null,
    site,
    siteName: site?.name ?? control?.siteName ?? null,
    control,
    answers,
    interruptions,
    answeredCount: answers.length,
    timedOutCount: answers.filter((answer) => answer.timedOut).length
  };
}

function localQcmStats(store: LocalStore, sessions: LocalQcmSession[]) {
  const completed = sessions.filter((session) => session.status === "TERMINE" && typeof session.score === "number");
  const active = sessions.filter((session) => session.status === "ENVOYE" || session.status === "EN_COURS" || session.status === "INTERROMPU");
  const averageScore = completed.length ? Math.round(completed.reduce((sum, session) => sum + (session.score ?? 0), 0) / completed.length) : 0;
  const interrupted = sessions.filter((session) => session.status === "INTERROMPU").length;
  const bankCount = store.qcmBanks.filter((bank) => bank.active && !bank.archivedAt).length;
  return {
    bankCount,
    questionCount: store.qcmQuestions.filter((question) => question.active && !question.archivedAt).length,
    activeSessions: active.length,
    completedSessions: completed.length,
    averageScore,
    interrupted
  };
}

export async function listLocalQcmData(user: SessionUser) {
  const store = await readLocalStore();
  const banks = scopedLocalRecords(store.qcmBanks.filter((bank) => !bank.archivedAt), user)
    .map((bank) => {
      const questions = activeQuestionsForBank(store, bank.id);
      const sessions = store.qcmSessions.filter((session) => session.bankId === bank.id);
      const completed = sessions.filter((session) => session.status === "TERMINE" && typeof session.score === "number");
      const successRate = completed.length ? Math.round((completed.filter((session) => session.passed).length / completed.length) * 100) : null;
      return {
        ...bank,
        questionsCount: questions.length,
        activeQuestionsCount: questions.length,
        successRate,
        client: store.clients.find((client) => client.id === bank.clientId),
        site: store.sites.find((site) => site.id === bank.siteId)
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title, "fr"));
  const questions = scopedLocalRecords(store.qcmQuestions.filter((question) => !question.archivedAt), user)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((question) =>
      user.role === "AGENT"
        ? {
            ...question,
            explanation: null,
            choices: question.choices.map((choice) => ({ ...choice, isCorrect: false }))
          }
        : question
    );
  const sessions = store.qcmSessions.filter((session) => canReadQcmSession(user, store, session)).map((session) => enrichLocalQcmSession(store, session));
  return {
    banks,
    questions,
    sessions,
    answers: store.qcmAnswers,
    interruptions: store.qcmInterruptions,
    settings: scopedLocalRecords(store.qcmSettings, user),
    agents: scopedLocalRecords(store.agents.filter((agent) => agent.active), user),
    clients: scopedLocalRecords(store.clients.filter((client) => client.active), user),
    sites: scopedLocalRecords(store.sites.filter((site) => site.active), user),
    controls: demoControls.filter((control) => user.role === "SUPER_ADMIN" || control.companyId === user.companyId),
    stats: localQcmStats(store, store.qcmSessions.filter((session) => canReadQcmSession(user, store, session)))
  };
}

export async function createLocalQcmBank(
  user: SessionUser,
  input: {
    companyId?: string | null;
    type: string;
    title: string;
    description?: string | null;
    qualification?: string | null;
    clientId?: string | null;
    siteId?: string | null;
    questionCountPerSession?: number;
    timePerQuestionSeconds?: number;
    passingScore?: number;
    coefficient?: number;
    guidanceTitle?: string | null;
    guidanceBody?: string | null;
  }
) {
  const store = await readLocalStore();
  const companyId = input.companyId ?? user.companyId ?? resolveDefaultCompanyId(store);
  if (!companyId) throw new LocalStoreError("Entreprise requise", 400);
  assertLocalCompanyAccess(user, companyId);
  const timestamp = nowIso();
  const type = normalizeQcmBankType(input.type);
  const bank: LocalQcmBank = {
    id: createId("qbank"),
    companyId,
    type,
    title: input.title.trim(),
    description: normalizeOptional(input.description),
    coefficient: input.coefficient ?? (type === "ENTREPRISE" ? 1 : type === "METIER" ? 2 : 3),
    qualification: normalizeOptional(input.qualification),
    clientId: normalizeOptional(input.clientId),
    siteId: normalizeOptional(input.siteId),
    questionCountPerSession: Math.max(1, Math.min(30, input.questionCountPerSession ?? 10)),
    timePerQuestionSeconds: Math.max(15, Math.min(300, input.timePerQuestionSeconds ?? 60)),
    passingScore: Math.max(0, Math.min(100, input.passingScore ?? 80)),
    active: true,
    guidanceTitle: normalizeOptional(input.guidanceTitle),
    guidanceBody: normalizeOptional(input.guidanceBody),
    createdAt: timestamp,
    updatedAt: timestamp,
    archivedAt: null
  };
  store.qcmBanks.push(bank);
  await writeLocalStore(store);
  return bank;
}

export async function updateLocalQcmBank(user: SessionUser, id: string, input: Omit<Partial<LocalQcmBank>, "companyId"> & { companyId?: string | null }) {
  const store = await readLocalStore();
  const index = store.qcmBanks.findIndex((bank) => bank.id === id);
  if (index === -1) throw new LocalStoreError("Banque QCM introuvable", 404);
  const current = store.qcmBanks[index];
  assertLocalCompanyAccess(user, current.companyId);
  const type = input.type ? normalizeQcmBankType(input.type) : current.type;
  const updated: LocalQcmBank = {
    ...current,
    type,
    title: input.title?.trim() ?? current.title,
    description: input.description !== undefined ? normalizeOptional(input.description) : current.description,
    qualification: input.qualification !== undefined ? normalizeOptional(input.qualification) : current.qualification,
    clientId: input.clientId !== undefined ? normalizeOptional(input.clientId) : current.clientId,
    siteId: input.siteId !== undefined ? normalizeOptional(input.siteId) : current.siteId,
    coefficient: input.coefficient ?? current.coefficient,
    questionCountPerSession: input.questionCountPerSession ?? current.questionCountPerSession,
    timePerQuestionSeconds: input.timePerQuestionSeconds ?? current.timePerQuestionSeconds,
    passingScore: input.passingScore ?? current.passingScore,
    active: input.active ?? current.active,
    archivedAt: input.archivedAt !== undefined ? input.archivedAt : current.archivedAt,
    guidanceTitle: input.guidanceTitle !== undefined ? normalizeOptional(input.guidanceTitle) : current.guidanceTitle,
    guidanceBody: input.guidanceBody !== undefined ? normalizeOptional(input.guidanceBody) : current.guidanceBody,
    updatedAt: nowIso()
  };
  store.qcmBanks[index] = updated;
  await writeLocalStore(store);
  return updated;
}

export async function archiveLocalQcmBank(user: SessionUser, id: string) {
  return updateLocalQcmBank(user, id, { active: false, archivedAt: nowIso() });
}

export async function createLocalQcmQuestion(
  user: SessionUser,
  input: {
    bankId: string;
    label: string;
    type?: string;
    choices: Array<{ label: string; isCorrect: boolean }>;
    explanation?: string | null;
    difficulty?: string | null;
    active?: boolean;
  }
) {
  const store = await readLocalStore();
  const bank = store.qcmBanks.find((item) => item.id === input.bankId && !item.archivedAt);
  if (!bank) throw new LocalStoreError("Banque QCM introuvable", 404);
  assertLocalCompanyAccess(user, bank.companyId);
  if (!input.choices.some((choice) => choice.isCorrect)) throw new LocalStoreError("Au moins une bonne réponse est requise", 400);
  const timestamp = nowIso();
  const questionId = createId("qquest");
  const question: LocalQcmQuestion = {
    id: questionId,
    companyId: bank.companyId,
    bankId: bank.id,
    label: input.label.trim(),
    type: normalizeQuestionType(input.type),
    category: bank.type,
    qualification: bank.qualification ?? null,
    clientId: bank.clientId ?? null,
    siteId: bank.siteId ?? null,
    explanation: normalizeOptional(input.explanation),
    active: input.active ?? true,
    difficulty: normalizeDifficulty(input.difficulty),
    sortOrder: store.qcmQuestions.filter((item) => item.bankId === bank.id).length,
    points: 1,
    choices: input.choices.map((choice, index) => ({
      id: `${questionId}_c${index + 1}`,
      questionId,
      label: choice.label.trim(),
      isCorrect: choice.isCorrect
    })),
    createdAt: timestamp,
    updatedAt: timestamp,
    archivedAt: null
  };
  store.qcmQuestions.push(question);
  await writeLocalStore(store);
  return question;
}

export async function updateLocalQcmQuestion(user: SessionUser, id: string, input: Omit<Partial<LocalQcmQuestion>, "choices"> & { choices?: Array<{ label: string; isCorrect: boolean }> }) {
  const store = await readLocalStore();
  const index = store.qcmQuestions.findIndex((question) => question.id === id);
  if (index === -1) throw new LocalStoreError("Question QCM introuvable", 404);
  const current = store.qcmQuestions[index];
  assertLocalCompanyAccess(user, current.companyId);
  const choices =
    input.choices !== undefined
      ? input.choices.map((choice, choiceIndex) => ({
          id: `${current.id}_c${choiceIndex + 1}`,
          questionId: current.id,
          label: choice.label.trim(),
          isCorrect: choice.isCorrect
        }))
      : current.choices;
  if (!choices.some((choice) => choice.isCorrect)) throw new LocalStoreError("Au moins une bonne réponse est requise", 400);
  const updated: LocalQcmQuestion = {
    ...current,
    ...input,
    label: input.label?.trim() ?? current.label,
    type: input.type ? normalizeQuestionType(input.type) : current.type,
    explanation: input.explanation !== undefined ? normalizeOptional(input.explanation) : current.explanation,
    difficulty: input.difficulty !== undefined ? normalizeDifficulty(input.difficulty) : current.difficulty,
    active: input.active ?? current.active,
    choices,
    updatedAt: nowIso()
  };
  store.qcmQuestions[index] = updated;
  await writeLocalStore(store);
  return updated;
}

export async function archiveLocalQcmQuestion(user: SessionUser, id: string) {
  return updateLocalQcmQuestion(user, id, { active: false, archivedAt: nowIso() });
}

function chooseQuestions(store: LocalStore, bank: LocalQcmBank) {
  const questions = activeQuestionsForBank(store, bank.id);
  if (questions.length < 30) {
    throw new LocalStoreError(`La banque "${bank.title}" doit contenir au moins 30 questions actives avant génération`, 400);
  }
  if (questions.length < bank.questionCountPerSession) {
    throw new LocalStoreError(`La banque "${bank.title}" ne contient pas assez de questions actives`, 400);
  }
  return [...questions]
    .sort(() => Math.random() - 0.5)
    .slice(0, bank.questionCountPerSession)
    .map((question) => question.id);
}

function resolveLocalQcmLaunchContext(
  store: LocalStore,
  input: {
    agentId: string;
    controlId?: string | null;
    clientId?: string | null;
    siteId?: string | null;
    qualification?: string | null;
  }
) {
  const agent = store.agents.find((item) => item.id === input.agentId && item.active);
  if (!agent) throw new LocalStoreError("Agent introuvable", 404);
  const control = demoControls.find((item) => item.id === input.controlId);
  const assignment = store.assignments.find((item) => item.agentId === agent.id && item.status === "ACTIVE");
  const clientId = input.clientId ?? control?.clientId ?? assignment?.clientId ?? null;
  const siteId = input.siteId ?? control?.siteId ?? assignment?.siteId ?? null;
  const qualification = normalizeOptional(input.qualification) ?? assignment?.jobTitle ?? agent.eligibleJobTitles?.[0] ?? "APS";
  const client = store.clients.find((item) => item.id === clientId);
  const site = store.sites.find((item) => item.id === siteId);
  return { agent, control, assignment, client, site, clientId, siteId, qualification };
}

function findBankForCategory(
  store: LocalStore,
  companyId: string,
  category: LocalQcmBankType,
  context: { qualification?: string | null; clientId?: string | null; siteId?: string | null }
) {
  const banks = store.qcmBanks.filter((bank) => bank.companyId === companyId && bank.type === category && bank.active && !bank.archivedAt);
  if (category === "ENTREPRISE") return banks[0];
  if (category === "METIER") {
    const qualification = normalizeComparable(context.qualification);
    return banks.find((bank) => normalizeComparable(bank.qualification) === qualification) ?? banks.find((bank) => normalizeComparable(context.qualification).includes(normalizeComparable(bank.qualification))) ?? banks[0];
  }
  return banks.find((bank) => bank.siteId && bank.siteId === context.siteId) ?? banks.find((bank) => bank.clientId && bank.clientId === context.clientId) ?? banks[0];
}

export async function generateLocalQcmSessions(
  user: SessionUser,
  input: {
    agentId: string;
    controlId?: string | null;
    clientId?: string | null;
    siteId?: string | null;
    qualification?: string | null;
    categories: string[];
    launchTiming?: string | null;
    delayHours?: number | null;
  }
) {
  const store = await readLocalStore();
  const context = resolveLocalQcmLaunchContext(store, input);
  assertLocalCompanyAccess(user, context.agent.companyId);
  const categories = [...new Set(input.categories.map((category) => normalizeQcmBankType(category)))];
  if (!categories.length) throw new LocalStoreError("Selectionne au moins une categorie QCM", 400);
  const timestamp = nowIso();
  const availableAt = new Date();
  if (input.launchTiming === "APRES_CONTROLE" && input.delayHours) {
    availableAt.setHours(availableAt.getHours() + input.delayHours);
  }
  const sessions = categories.map((category) => {
    const bank = findBankForCategory(store, context.agent.companyId, category, context);
    if (!bank) throw new LocalStoreError(`Aucune banque active pour la categorie ${category}`, 404);
    const session: LocalQcmSession = {
      id: createId("qsession"),
      companyId: context.agent.companyId,
      bankId: bank.id,
      controlId: input.controlId ?? null,
      agentId: context.agent.id,
      clientId: context.clientId,
      siteId: context.siteId,
      qualification: context.qualification,
      launchTiming: normalizeLaunchTiming(input.launchTiming),
      availableAt: availableAt.toISOString(),
      status: "ENVOYE",
      score: null,
      passed: null,
      weightedScore: null,
      selectedQuestionIds: chooseQuestions(store, bank),
      currentQuestionIndex: 0,
      resumeAllowed: false,
      resumeCount: 0,
      interruptionReason: null,
      startedAt: null,
      interruptedAt: null,
      completedAt: null,
      sentById: user.id,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    store.qcmSessions.push(session);
    return session;
  });
  await writeLocalStore(store);
  return sessions.map((session) => enrichLocalQcmSession(store, session));
}

export async function startLocalQcmSession(user: SessionUser, sessionId: string) {
  const store = await readLocalStore();
  const index = store.qcmSessions.findIndex((session) => session.id === sessionId);
  if (index === -1) throw new LocalStoreError("Session QCM introuvable", 404);
  const session = store.qcmSessions[index];
  if (!canReadQcmSession(user, store, session)) throw new LocalStoreError("Acces QCM interdit", 403);
  if (session.status === "INTERROMPU" && !session.resumeAllowed) throw new LocalStoreError("Reprise non autorisee", 403);
  const timestamp = nowIso();
  store.qcmSessions[index] = {
    ...session,
    status: "EN_COURS",
    startedAt: session.startedAt ?? timestamp,
    interruptedAt: null,
    interruptionReason: null,
    resumeAllowed: false,
    resumeCount: session.status === "INTERROMPU" ? session.resumeCount + 1 : session.resumeCount,
    updatedAt: timestamp
  };
  if (session.status === "INTERROMPU") {
    const last = [...store.qcmInterruptions].reverse().find((item) => item.sessionId === session.id && !item.resumedAt);
    if (last) last.resumedAt = timestamp;
  }
  await writeLocalStore(store);
  return enrichLocalQcmSession(store, store.qcmSessions[index]);
}

function isLocalAnswerCorrect(question: LocalQcmQuestion, selectedChoiceIds: string[], timedOut: boolean) {
  if (timedOut) return false;
  const expected = question.choices.filter((choice) => choice.isCorrect).map((choice) => choice.id).sort();
  const selected = [...selectedChoiceIds].sort();
  return expected.length === selected.length && expected.every((choiceId, index) => choiceId === selected[index]);
}

export async function submitLocalQcmAnswer(
  user: SessionUser,
  input: {
    sessionId: string;
    questionId: string;
    selectedChoiceIds?: string[];
    timeSpentSeconds?: number | null;
    timedOut?: boolean;
  }
) {
  const store = await readLocalStore();
  const sessionIndex = store.qcmSessions.findIndex((session) => session.id === input.sessionId);
  if (sessionIndex === -1) throw new LocalStoreError("Session QCM introuvable", 404);
  const session = store.qcmSessions[sessionIndex];
  if (!canReadQcmSession(user, store, session)) throw new LocalStoreError("Acces QCM interdit", 403);
  if (session.status !== "EN_COURS") throw new LocalStoreError("La session QCM n'est pas en cours", 400);
  const bank = store.qcmBanks.find((item) => item.id === session.bankId);
  const question = store.qcmQuestions.find((item) => item.id === input.questionId && item.bankId === session.bankId);
  if (!bank || !question || !session.selectedQuestionIds.includes(question.id)) throw new LocalStoreError("Question QCM introuvable", 404);
  const timeSpentSeconds = Math.max(0, Math.round(input.timeSpentSeconds ?? 0));
  const timedOut = Boolean(input.timedOut || timeSpentSeconds > bank.timePerQuestionSeconds);
  const selectedChoiceIds = timedOut ? [] : input.selectedChoiceIds ?? [];
  const isCorrect = isLocalAnswerCorrect(question, selectedChoiceIds, timedOut);
  const existingIndex = store.qcmAnswers.findIndex((answer) => answer.sessionId === session.id && answer.questionId === question.id);
  const answer: LocalQcmAnswer = {
    id: existingIndex === -1 ? createId("qanswer") : store.qcmAnswers[existingIndex].id,
    sessionId: session.id,
    questionId: question.id,
    selectedChoiceIds,
    isCorrect,
    timedOut,
    timeSpentSeconds,
    pointsAwarded: isCorrect ? question.points : 0,
    createdAt: nowIso()
  };
  if (existingIndex === -1) store.qcmAnswers.push(answer);
  else store.qcmAnswers[existingIndex] = answer;
  const questionPosition = session.selectedQuestionIds.indexOf(question.id);
  store.qcmSessions[sessionIndex] = {
    ...session,
    currentQuestionIndex: Math.min(session.selectedQuestionIds.length, Math.max(session.currentQuestionIndex, questionPosition + 1)),
    updatedAt: nowIso()
  };
  await writeLocalStore(store);
  return { session: enrichLocalQcmSession(store, store.qcmSessions[sessionIndex]), answer };
}

export async function completeLocalQcmSession(user: SessionUser, sessionId: string) {
  const store = await readLocalStore();
  const index = store.qcmSessions.findIndex((session) => session.id === sessionId);
  if (index === -1) throw new LocalStoreError("Session QCM introuvable", 404);
  const session = store.qcmSessions[index];
  if (!canReadQcmSession(user, store, session)) throw new LocalStoreError("Acces QCM interdit", 403);
  const bank = store.qcmBanks.find((item) => item.id === session.bankId);
  if (!bank) throw new LocalStoreError("Banque QCM introuvable", 404);
  const selectedQuestions = session.selectedQuestionIds.map((questionId) => store.qcmQuestions.find((question) => question.id === questionId)).filter(Boolean) as LocalQcmQuestion[];
  const answers = store.qcmAnswers.filter((answer) => answer.sessionId === session.id);
  const answerByQuestion = new Map(answers.map((answer) => [answer.questionId, answer]));
  const correctAnswers = selectedQuestions.filter((question) => answerByQuestion.get(question.id)?.isCorrect).length;
  const score = selectedQuestions.length ? Math.round((correctAnswers / selectedQuestions.length) * 100) : 0;
  const passed = score >= bank.passingScore;
  const timestamp = nowIso();
  store.qcmSessions[index] = {
    ...session,
    status: "TERMINE",
    score,
    passed,
    weightedScore: score * bank.coefficient,
    currentQuestionIndex: selectedQuestions.length,
    completedAt: timestamp,
    updatedAt: timestamp
  };
  await writeLocalStore(store);
  return enrichLocalQcmSession(store, store.qcmSessions[index]);
}

export async function interruptLocalQcmSession(user: SessionUser, sessionId: string, cause = "Interruption déclarée") {
  const store = await readLocalStore();
  const index = store.qcmSessions.findIndex((session) => session.id === sessionId);
  if (index === -1) throw new LocalStoreError("Session QCM introuvable", 404);
  const session = store.qcmSessions[index];
  if (!canReadQcmSession(user, store, session)) throw new LocalStoreError("Acces QCM interdit", 403);
  const timestamp = nowIso();
  store.qcmSessions[index] = {
    ...session,
    status: "INTERROMPU",
    interruptedAt: timestamp,
    interruptionReason: cause,
    resumeAllowed: false,
    updatedAt: timestamp
  };
  store.qcmInterruptions.push({
    id: createId("qinterrupt"),
    sessionId,
    cause,
    interruptedAt: timestamp,
    resumedAt: null,
    authorizedById: null,
    metadata: null
  });
  await writeLocalStore(store);
  return enrichLocalQcmSession(store, store.qcmSessions[index]);
}

export async function authorizeLocalQcmResume(user: SessionUser, sessionId: string) {
  const store = await readLocalStore();
  const index = store.qcmSessions.findIndex((session) => session.id === sessionId);
  if (index === -1) throw new LocalStoreError("Session QCM introuvable", 404);
  const session = store.qcmSessions[index];
  assertLocalCompanyAccess(user, session.companyId);
  store.qcmSessions[index] = { ...session, resumeAllowed: true, updatedAt: nowIso() };
  const last = [...store.qcmInterruptions].reverse().find((item) => item.sessionId === sessionId && !item.authorizedById);
  if (last) last.authorizedById = user.id;
  await writeLocalStore(store);
  return enrichLocalQcmSession(store, store.qcmSessions[index]);
}
