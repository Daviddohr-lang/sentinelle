import * as XLSX from "xlsx";
import { slugify } from "@/lib/utils";

export const importTypes = ["agents", "clients-sites", "qcm", "control-points"] as const;
export type ImportType = (typeof importTypes)[number];
export type DuplicateMode = "skip" | "update" | "reject";

export type ParsedImportRow = {
  rowNumber: number;
  key: string;
  label: string;
  data: Record<string, unknown>;
  errors: string[];
  warnings: string[];
};

export type ImportTemplate = {
  type: ImportType | "all";
  filename: string;
  buffer: Buffer;
};

const templateColumns: Record<ImportType, string[]> = {
  agents: [
    "Email",
    "Matricule",
    "Civilite",
    "Nom",
    "Prenom",
    "Date de naissance",
    "Lieu de naissance",
    "Pays de naissance",
    "Adresse",
    "Code postal",
    "Ville",
    "Telephone",
    "Emploi",
    "Qualifications",
    "Numero carte professionnelle",
    "Validite carte professionnelle",
    "Validite SSIAP",
    "Validite SST",
    "Validite H0B0",
    "Validite BS BE Manoeuvre",
    "Type de contrat",
    "Date entree entreprise",
    "Notes"
  ],
  "clients-sites": [
    "Reference client",
    "Nom client",
    "Contact client",
    "Email contact",
    "Telephone contact",
    "Adresse client",
    "Reference site",
    "Nom site",
    "Adresse site",
    "Latitude",
    "Longitude",
    "Niveau de risque",
    "Consignes site"
  ],
  qcm: [
    "Banque QCM",
    "Type banque",
    "Qualification",
    "Reference client",
    "Reference site",
    "Question",
    "Type question",
    "Reponse",
    "Bonne reponse",
    "Explication",
    "Difficulte",
    "Actif"
  ],
  "control-points": [
    "Modele controle",
    "Thematique",
    "Coefficient thematique",
    "Point de controle",
    "Coefficient point",
    "Statut reponse",
    "Choix de reponse",
    "Gravite",
    "Delai correction heures",
    "Action corrective",
    "Bloquant",
    "Visible client",
    "Visible agent",
    "Visible interne",
    "Impact couleur",
    "Score",
    "Photo",
    "Fichier",
    "Commentaire vocal"
  ]
};

const templateExamples: Record<ImportType, unknown[][]> = {
  agents: [
    [
      "agent@example.com",
      "AG-001",
      "Monsieur",
      "Durand",
      "Lucas",
      "1990-05-12",
      "Amiens",
      "France",
      "10 rue Exemple",
      "80000",
      "Amiens",
      "0600000000",
      "Agent de prevention et de securite",
      "APS, SSIAP 1, SST",
      "CAR-080-2030-01-01-000001",
      "2030-01-01",
      "2028-01-01",
      "2027-01-01",
      "2027-01-01",
      "2027-01-01",
      "CDI",
      "2026-01-01",
      "Import exemple"
    ]
  ],
  "clients-sites": [
    [
      "CLI-001",
      "Client Exemple",
      "Marie Martin",
      "client@example.com",
      "0300000000",
      "1 avenue Exemple, 80000 Amiens",
      "SITE-001",
      "Site Exemple",
      "1 avenue Exemple, 80000 Amiens",
      49.894,
      2.295,
      "Commerce",
      "Consignes principales du site"
    ]
  ],
  qcm: [
    ["Banque APS", "METIER", "APS", "", "", "Quel document l'agent doit-il pouvoir presenter ?", "CHOIX_UNIQUE", "Carte professionnelle", "oui", "Document obligatoire.", "FACILE", "oui"],
    ["Banque APS", "METIER", "APS", "", "", "Quel document l'agent doit-il pouvoir presenter ?", "CHOIX_UNIQUE", "Permis de conduire", "non", "", "FACILE", "oui"]
  ],
  "control-points": [
    ["Modele controle interne", "Tenue professionnelle", 1, "Tenue conforme au poste", 1, "CONFORME", "Tenue complete portee", "MINEURE", 0, "Aucune action", "non", "oui", "oui", "oui", "VERT", 100, "OPTIONAL", "NONE", "NONE"],
    ["Modele controle interne", "Tenue professionnelle", 1, "Tenue conforme au poste", 1, "NON_CONFORME", "Tenue incomplete", "MINEURE", 24, "Corriger la tenue avant prochaine vacation", "non", "oui", "oui", "oui", "ORANGE", 50, "OPTIONAL", "NONE", "NONE"]
  ]
};

const aliases: Record<string, string[]> = {
  email: ["email", "adresse mail", "mail", "courriel"],
  matricule: ["matricule", "numero agent", "id agent"],
  civility: ["civilite", "genre", "monsieur madame"],
  lastName: ["nom", "nom agent"],
  firstName: ["prenom", "prénom"],
  birthDate: ["date de naissance", "naissance"],
  birthPlace: ["lieu de naissance"],
  birthCountry: ["pays de naissance"],
  address: ["adresse"],
  postalCode: ["code postal", "cp"],
  city: ["ville"],
  phone: ["telephone", "tel", "mobile"],
  jobTitle: ["emploi", "poste", "fonction"],
  qualifications: ["qualification", "qualifications", "diplomes", "diplômes"],
  professionalCardNumber: ["numero carte professionnelle", "numero de carte pro", "numero carte pro", "carte pro"],
  professionalCardExpiresAt: ["validite carte professionnelle", "date de validite", "date validite carte pro"],
  ssiapExpiresAt: ["validite ssiap", "date de validite du ssiap"],
  sstExpiresAt: ["validite sst", "date de validite du sst"],
  h0b0ExpiresAt: ["validite h0b0", "date de validite hobov", "date de validite h0b0"],
  bsbeExpiresAt: ["validite bs be manoeuvre", "date de validite bsbem", "validite bsbem"],
  contractType: ["type de contrat", "contrat"],
  hiredAt: ["date entree entreprise", "date d'entree", "date entree"],
  notes: ["notes", "commentaire", "commentaires"],
  clientReference: ["reference client", "ref client", "client reference"],
  clientName: ["nom client", "client"],
  clientContactName: ["contact client", "nom contact"],
  clientContactEmail: ["email contact", "mail contact"],
  clientContactPhone: ["telephone contact", "tel contact"],
  clientAddress: ["adresse client"],
  siteReference: ["reference site", "ref site"],
  siteName: ["nom site", "site"],
  siteAddress: ["adresse site"],
  latitude: ["latitude", "lat"],
  longitude: ["longitude", "lng", "lon"],
  riskLevel: ["niveau de risque", "risque"],
  siteInstructions: ["consignes site", "consignes"],
  bankTitle: ["banque qcm", "banque"],
  bankType: ["type banque", "type qcm"],
  qualification: ["qualification"],
  question: ["question"],
  questionType: ["type question"],
  answer: ["reponse", "réponse"],
  correct: ["bonne reponse", "bonne réponse", "correcte"],
  explanation: ["explication"],
  difficulty: ["difficulte", "difficulté"],
  active: ["actif", "active"],
  templateTitle: ["modele controle", "modèle contrôle", "modele"],
  criterionLabel: ["thematique", "thématique", "critere", "critère"],
  criterionCoefficient: ["coefficient thematique", "coefficient critere"],
  pointLabel: ["point de controle", "point à contrôler", "point controle"],
  pointCoefficient: ["coefficient point"],
  responseStatus: ["statut reponse", "statut"],
  responseLabel: ["choix de reponse", "choix réponse", "reponse"],
  severity: ["gravite", "gravité"],
  correctionDelayHours: ["delai correction heures", "delai", "délai"],
  correctiveAction: ["action corrective"],
  blocking: ["bloquant"],
  visibleClient: ["visible client"],
  visibleAgent: ["visible agent"],
  visibleInternal: ["visible interne"],
  impactLevel: ["impact couleur", "impact"],
  score: ["score", "note"],
  photoRequirement: ["photo"],
  fileRequirement: ["fichier"],
  voiceRequirement: ["commentaire vocal", "vocal"]
};

function normalizeHeader(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeEnum(value: unknown) {
  return text(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function text(value: unknown) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return formatDate(value);
  return String(value).trim();
}

function get(row: Record<string, unknown>, name: keyof typeof aliases) {
  const wanted = aliases[name].map(normalizeHeader);
  for (const [key, value] of Object.entries(row)) {
    if (wanted.includes(normalizeHeader(key))) return text(value);
  }
  return "";
}

function splitList(value: string) {
  return value
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseBoolean(value: string, defaultValue = false) {
  if (!value) return defaultValue;
  const normalized = normalizeHeader(value);
  if (["oui", "yes", "true", "vrai", "1", "x"].includes(normalized)) return true;
  if (["non", "no", "false", "faux", "0"].includes(normalized)) return false;
  return defaultValue;
}

function parseNumber(value: string) {
  if (!value) return null;
  const normalized = value.replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseDate(value: string) {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
  const french = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (french) {
    const [, day, month, year] = french;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) return formatDate(parsed);
  return null;
}

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function pushRequired(errors: string[], label: string, value: string) {
  if (!value) errors.push(`${label} requis`);
}

export function isImportType(value: string | null): value is ImportType {
  return !!value && (importTypes as readonly string[]).includes(value);
}

export function buildImportTemplate(type: ImportType | "all"): ImportTemplate {
  const workbook = XLSX.utils.book_new();
  const selectedTypes = type === "all" ? importTypes : [type];
  const readme = XLSX.utils.aoa_to_sheet([
    ["SENTINELLE - Modeles imports Excel"],
    ["Remplir les onglets utiles, conserver les en-tetes, puis importer depuis Administration > Imports Excel."],
    ["Les dates doivent idealement etre au format yyyy-mm-dd."],
    ["Les valeurs oui/non acceptent aussi true/false ou 1/0."]
  ]);
  XLSX.utils.book_append_sheet(workbook, readme, "README");

  for (const importType of selectedTypes) {
    const rows = [templateColumns[importType], ...templateExamples[importType]];
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    sheet["!cols"] = templateColumns[importType].map((column) => ({ wch: Math.min(Math.max(column.length + 4, 14), 34) }));
    XLSX.utils.book_append_sheet(workbook, sheet, sheetNameFor(importType));
  }

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return { type, filename: type === "all" ? "sentinelle-modeles-import.xlsx" : `sentinelle-modele-${type}.xlsx`, buffer };
}

export function parseImportWorkbook(buffer: Buffer, type: ImportType) {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const preferredSheet = workbook.Sheets[sheetNameFor(type)] ?? workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(preferredSheet, { defval: "", raw: false });
  return rows.map((row, index) => parseImportRow(row, index + 2, type)).filter((row) => Object.values(row.data).some((value) => text(value)));
}

export function sheetNameFor(type: ImportType) {
  switch (type) {
    case "agents":
      return "AGENTS";
    case "clients-sites":
      return "CLIENTS_SITES";
    case "qcm":
      return "QCM";
    case "control-points":
      return "POINTS_CONTROLE";
  }
}

function parseImportRow(row: Record<string, unknown>, rowNumber: number, type: ImportType): ParsedImportRow {
  if (type === "agents") return parseAgentRow(row, rowNumber);
  if (type === "clients-sites") return parseClientSiteRow(row, rowNumber);
  if (type === "qcm") return parseQcmRow(row, rowNumber);
  return parseControlPointRow(row, rowNumber);
}

function parseAgentRow(row: Record<string, unknown>, rowNumber: number): ParsedImportRow {
  const errors: string[] = [];
  const warnings: string[] = [];
  const email = get(row, "email").toLowerCase();
  const firstName = get(row, "firstName");
  const lastName = get(row, "lastName");
  const qualifications = splitList(get(row, "qualifications"));
  const h0b0ExpiresAt = parseDate(get(row, "h0b0ExpiresAt"));
  const bsbeExpiresAt = parseDate(get(row, "bsbeExpiresAt"));
  const extraNotes = [
    get(row, "address") ? `Adresse: ${get(row, "address")}` : "",
    get(row, "postalCode") || get(row, "city") ? `Ville: ${get(row, "postalCode")} ${get(row, "city")}`.trim() : "",
    get(row, "birthCountry") ? `Pays de naissance: ${get(row, "birthCountry")}` : "",
    h0b0ExpiresAt ? `Validite H0B0: ${h0b0ExpiresAt}` : "",
    bsbeExpiresAt ? `Validite BS BE Manoeuvre: ${bsbeExpiresAt}` : "",
    get(row, "notes")
  ].filter(Boolean);

  pushRequired(errors, "Email", email);
  pushRequired(errors, "Nom", lastName);
  pushRequired(errors, "Prenom", firstName);
  if (!get(row, "matricule")) warnings.push("Matricule absent: SENTINELLE en generera un automatiquement.");

  const contractType = normalizeEnum(get(row, "contractType"));
  const data = {
    email,
    matricule: get(row, "matricule") || generatedMatricule(email, firstName, lastName, rowNumber),
    civility: normalizeCivility(get(row, "civility")),
    firstName,
    lastName,
    birthDate: parseDate(get(row, "birthDate")),
    birthPlace: get(row, "birthPlace") || null,
    phone: get(row, "phone") || null,
    professionalCardNumber: get(row, "professionalCardNumber") || null,
    professionalCardExpiresAt: parseDate(get(row, "professionalCardExpiresAt")),
    sstExpiresAt: parseDate(get(row, "sstExpiresAt")),
    ssiapExpiresAt: parseDate(get(row, "ssiapExpiresAt")),
    diplomas: qualifications,
    eligibleJobTitles: splitList(get(row, "jobTitle")),
    contractType: ["CDD", "CDI", "APPRENTI"].includes(contractType) ? contractType : null,
    hiredAt: parseDate(get(row, "hiredAt")),
    notes: extraNotes.join("\n") || null
  };

  return {
    rowNumber,
    key: email || data.matricule,
    label: `${firstName} ${lastName}`.trim() || `Ligne ${rowNumber}`,
    data,
    errors,
    warnings
  };
}

function parseClientSiteRow(row: Record<string, unknown>, rowNumber: number): ParsedImportRow {
  const errors: string[] = [];
  const clientName = get(row, "clientName");
  const clientReference = get(row, "clientReference") || slugify(clientName).toUpperCase();
  const siteName = get(row, "siteName");
  const siteReference = get(row, "siteReference") || (siteName ? slugify(`${clientReference}-${siteName}`).toUpperCase() : "");
  pushRequired(errors, "Nom client", clientName);

  const data = {
    client: {
      reference: clientReference,
      name: clientName,
      contactName: get(row, "clientContactName") || null,
      contactEmail: get(row, "clientContactEmail").toLowerCase() || null,
      contactPhone: get(row, "clientContactPhone") || null,
      address: get(row, "clientAddress") || null
    },
    site: siteName
      ? {
          reference: siteReference,
          name: siteName,
          address: get(row, "siteAddress") || get(row, "clientAddress") || "Adresse a completer",
          latitude: parseNumber(get(row, "latitude")),
          longitude: parseNumber(get(row, "longitude")),
          riskLevel: get(row, "riskLevel") || null,
          instructions: get(row, "siteInstructions") || null
        }
      : null
  };

  return { rowNumber, key: `${clientReference}:${siteReference || "client"}`, label: siteName ? `${clientName} / ${siteName}` : clientName, data, errors, warnings: [] };
}

function parseQcmRow(row: Record<string, unknown>, rowNumber: number): ParsedImportRow {
  const errors: string[] = [];
  const bankTitle = get(row, "bankTitle");
  const question = get(row, "question");
  const answer = get(row, "answer");
  pushRequired(errors, "Banque QCM", bankTitle);
  pushRequired(errors, "Question", question);
  pushRequired(errors, "Reponse", answer);
  const bankType = normalizeEnum(get(row, "bankType") || "ENTREPRISE");
  const questionType = normalizeEnum(get(row, "questionType") || "CHOIX_UNIQUE");

  const data = {
    bankTitle,
    bankType: ["ENTREPRISE", "METIER", "CLIENT_SITE"].includes(bankType) ? bankType : "ENTREPRISE",
    qualification: get(row, "qualification") || null,
    clientReference: get(row, "clientReference") || null,
    siteReference: get(row, "siteReference") || null,
    question,
    questionType: ["CHOIX_UNIQUE", "CHOIX_MULTIPLE"].includes(questionType) ? questionType : "CHOIX_UNIQUE",
    answer,
    correct: parseBoolean(get(row, "correct")),
    explanation: get(row, "explanation") || null,
    difficulty: normalizeDifficulty(get(row, "difficulty")),
    active: parseBoolean(get(row, "active"), true)
  };
  return { rowNumber, key: `${bankTitle}:${question}:${answer}`, label: `${bankTitle} - ${question}`, data, errors, warnings: [] };
}

function parseControlPointRow(row: Record<string, unknown>, rowNumber: number): ParsedImportRow {
  const errors: string[] = [];
  const templateTitle = get(row, "templateTitle") || "Modele controle";
  const criterionLabel = get(row, "criterionLabel");
  const pointLabel = get(row, "pointLabel");
  const responseLabel = get(row, "responseLabel");
  pushRequired(errors, "Thematique", criterionLabel);
  pushRequired(errors, "Point de controle", pointLabel);
  pushRequired(errors, "Choix de reponse", responseLabel);

  const responseStatus = normalizeEnum(get(row, "responseStatus") || "CONFORME");
  const severity = normalizeEnum(get(row, "severity") || "MINEURE");
  const impactLevel = normalizeEnum(get(row, "impactLevel") || (responseStatus === "CONFORME" ? "VERT" : "ORANGE"));
  const data = {
    templateTitle,
    criterionLabel,
    criterionCoefficient: parseNumber(get(row, "criterionCoefficient")) ?? 1,
    pointLabel,
    pointCoefficient: parseNumber(get(row, "pointCoefficient")) ?? 1,
    responseStatus: ["CONFORME", "NON_CONFORME", "SANS_OBJET"].includes(responseStatus) ? responseStatus : "CONFORME",
    responseLabel,
    severity: ["MINEURE", "MAJEURE", "CRITIQUE"].includes(severity) ? severity : "MINEURE",
    correctionDelayHours: parseNumber(get(row, "correctionDelayHours")),
    correctiveAction: get(row, "correctiveAction") || null,
    blocking: parseBoolean(get(row, "blocking")),
    visibleInClientReport: parseBoolean(get(row, "visibleClient"), true),
    visibleInAgentReport: parseBoolean(get(row, "visibleAgent"), true),
    visibleInDirectionReport: parseBoolean(get(row, "visibleInternal"), true),
    impactLevel: ["VERT", "JAUNE", "ORANGE", "ROUGE", "CRITIQUE"].includes(impactLevel) ? impactLevel : "VERT",
    score: parseNumber(get(row, "score")) ?? (responseStatus === "CONFORME" ? 100 : 0),
    photoRequirement: normalizeRequirement(get(row, "photoRequirement"), "OPTIONAL"),
    fileRequirement: normalizeRequirement(get(row, "fileRequirement"), "NONE"),
    voiceRequirement: normalizeRequirement(get(row, "voiceRequirement"), "NONE")
  };
  return { rowNumber, key: `${templateTitle}:${criterionLabel}:${pointLabel}:${responseLabel}`, label: `${criterionLabel} - ${pointLabel}`, data, errors, warnings: [] };
}

function generatedMatricule(email: string, firstName: string, lastName: string, rowNumber: number) {
  const source = email || `${firstName}-${lastName}-${rowNumber}`;
  return `IMP-${slugify(source).slice(0, 24).toUpperCase() || rowNumber}`;
}

function normalizeCivility(value: string) {
  const normalized = normalizeHeader(value);
  if (normalized.startsWith("madame") || normalized === "mme") return "MADAME";
  if (normalized.startsWith("monsieur") || normalized === "mr" || normalized === "m") return "MONSIEUR";
  return null;
}

function normalizeDifficulty(value: string) {
  const normalized = normalizeEnum(value);
  if (["FACILE", "MOYEN", "DIFFICILE"].includes(normalized)) return normalized;
  return null;
}

function normalizeRequirement(value: string, fallback: "NONE" | "OPTIONAL" | "REQUIRED") {
  const normalized = normalizeEnum(value);
  if (["NONE", "OPTIONAL", "REQUIRED"].includes(normalized)) return normalized;
  if (["NON", "NO"].includes(normalized)) return "NONE";
  if (["OUI", "YES", "OPTIONNEL"].includes(normalized)) return "OPTIONAL";
  if (["OBLIGATOIRE", "REQUIS"].includes(normalized)) return "REQUIRED";
  return fallback;
}
