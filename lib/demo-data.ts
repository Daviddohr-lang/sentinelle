import type { Role } from "@prisma/client";

export const demoCompany = {
  id: "cmp_ops_nord",
  name: "OPS Securite Nord",
  slug: "ops-securite-nord",
  logoUrl: null,
  cnapsAuthorizationNumber: "AUT-080-2026-0001",
  siret: "81234567800029",
  address: "12 rue de la Conformite, 80000 Amiens"
};

export const demoUsers = [
  {
    id: "usr_super_admin",
    companyId: null,
    email: "superadmin@sentinelle.local",
    firstName: "Nora",
    lastName: "Plateforme",
    role: "SUPER_ADMIN" as Role
  },
  {
    id: "usr_admin",
    companyId: demoCompany.id,
    email: "admin@ops.example",
    firstName: "Claire",
    lastName: "Martin",
    role: "COMPANY_ADMIN" as Role
  },
  {
    id: "usr_controller",
    companyId: demoCompany.id,
    email: "controleur@ops.example",
    firstName: "Yanis",
    lastName: "Benali",
    role: "QUALITY_CONTROLLER" as Role
  },
  {
    id: "usr_agent",
    companyId: demoCompany.id,
    email: "agent@ops.example",
    firstName: "Lucas",
    lastName: "Morel",
    role: "AGENT" as Role
  },
  {
    id: "usr_owner",
    companyId: demoCompany.id,
    email: "direction@ops.example",
    firstName: "Sophie",
    lastName: "Dumont",
    role: "BUSINESS_OWNER" as Role
  },
  {
    id: "usr_client",
    companyId: demoCompany.id,
    email: "client@intermarche.example",
    firstName: "Hugo",
    lastName: "Lefevre",
    role: "CLIENT" as Role
  }
];

export const demoClients = [
  {
    id: "cli_inter",
    companyId: demoCompany.id,
    name: "Intermarche Glisy",
    reference: "CLIENT-INTERMARCHE-GLISY",
    contactName: "Hugo Lefevre",
    contactEmail: "client@intermarche.example",
    address: "Centre commercial, 80440 Glisy"
  },
  {
    id: "cli_log",
    companyId: demoCompany.id,
    name: "Logiparc Amiens",
    reference: "CLIENT-LOGIPARC",
    contactName: "Maya Colin",
    contactEmail: "exploitation@logiparc.example",
    address: "Zone industrielle Nord, 80080 Amiens"
  }
];

export const demoSites = [
  {
    id: "site_glisy",
    companyId: demoCompany.id,
    clientId: "cli_inter",
    name: "Intermarche Glisy - Galerie",
    reference: "SITE-GLISY-GALERIE",
    address: "Avenue de la Defense Passive, 80440 Glisy",
    riskLevel: "Commerce recevant du public"
  },
  {
    id: "site_logiparc",
    companyId: demoCompany.id,
    clientId: "cli_log",
    name: "Logiparc Amiens - Entrepot A",
    reference: "SITE-LOG-A",
    address: "18 rue des Transporteurs, 80080 Amiens",
    riskLevel: "Logistique nuit"
  }
];

export const demoAgents = [
  {
    id: "agt_lucas",
    companyId: demoCompany.id,
    userId: "usr_agent",
    matricule: "OPS-0142",
    firstName: "Lucas",
    lastName: "Morel",
    email: "agent@ops.example",
    phone: "06 10 20 30 40",
    professionalCardNumber: "CAR-2024-99012",
    professionalCardExpiresAt: "2026-09-30",
    sstExpiresAt: "2026-12-18",
    ssiapExpiresAt: null,
    qualityScore: 86
  },
  {
    id: "agt_amina",
    companyId: demoCompany.id,
    matricule: "OPS-0177",
    firstName: "Amina",
    lastName: "Roux",
    email: "amina.roux@ops.example",
    phone: "06 22 11 55 18",
    professionalCardNumber: "CAR-2023-77340",
    professionalCardExpiresAt: "2026-07-12",
    sstExpiresAt: "2026-08-02",
    ssiapExpiresAt: "2027-02-12",
    qualityScore: 91
  },
  {
    id: "agt_marc",
    companyId: demoCompany.id,
    matricule: "OPS-0098",
    firstName: "Marc",
    lastName: "Vidal",
    email: "marc.vidal@ops.example",
    phone: "06 38 22 90 01",
    professionalCardNumber: "CAR-2022-10450",
    professionalCardExpiresAt: "2026-06-20",
    sstExpiresAt: "2026-05-31",
    ssiapExpiresAt: null,
    qualityScore: 73
  }
];

export const demoAssignments = [
  {
    id: "asg_1",
    agentId: "agt_lucas",
    clientId: "cli_inter",
    siteId: "site_glisy",
    jobTitle: "APS",
    startsAt: "2026-01-01",
    status: "ACTIVE"
  },
  {
    id: "asg_2",
    agentId: "agt_amina",
    clientId: "cli_log",
    siteId: "site_logiparc",
    jobTitle: "SSIAP 1",
    startsAt: "2026-03-15",
    status: "ACTIVE"
  }
];

export const demoControlItems = [
  {
    id: "item_tenue",
    label: "Tenue reglementaire",
    category: "Image et presentation",
    coefficient: 1,
    severity: "MINEURE",
    color: "#f59e0b",
    correctionDelayHours: 48,
    blocking: false,
    recommendedAction: "Rappel de la dotation et verification au prochain controle",
    autoNotify: false,
    clientVisible: true,
    impactsGlobalScore: true,
    photoRequirement: "OPTIONAL",
    fileRequirement: "NONE",
    voiceRequirement: "OPTIONAL"
  },
  {
    id: "item_carte",
    label: "Validite de la carte professionnelle",
    category: "Reglementaire CNAPS",
    coefficient: 3,
    severity: "CRITIQUE",
    color: "#991b1b",
    correctionDelayHours: 0,
    blocking: true,
    recommendedAction: "Retrait immediat du poste et verification du droit d'exercice",
    autoNotify: true,
    clientVisible: false,
    impactsGlobalScore: true,
    photoRequirement: "REQUIRED",
    fileRequirement: "REQUIRED",
    voiceRequirement: "OPTIONAL"
  },
  {
    id: "item_main_courante",
    label: "Main courante",
    category: "Execution de mission",
    coefficient: 2,
    severity: "MAJEURE",
    color: "#dc2626",
    correctionDelayHours: 24,
    blocking: false,
    recommendedAction: "Reprise de consigne et controle de tracabilite",
    autoNotify: true,
    clientVisible: true,
    impactsGlobalScore: true,
    photoRequirement: "OPTIONAL",
    fileRequirement: "OPTIONAL",
    voiceRequirement: "OPTIONAL"
  },
  {
    id: "item_deonto",
    label: "Code de deontologie",
    category: "Comportement",
    coefficient: 2,
    severity: "MAJEURE",
    color: "#dc2626",
    correctionDelayHours: 48,
    blocking: false,
    recommendedAction: "Brief comportemental et rappel des obligations",
    autoNotify: false,
    clientVisible: false,
    impactsGlobalScore: true,
    photoRequirement: "NONE",
    fileRequirement: "NONE",
    voiceRequirement: "OPTIONAL"
  }
];

export const demoControls = [
  {
    id: "ctrl_2026_05_21",
    companyId: demoCompany.id,
    type: "INOPINE",
    status: "VALIDE",
    startedAt: "2026-05-21T21:15:00.000Z",
    completedAt: "2026-05-21T22:05:00.000Z",
    controllerId: "usr_controller",
    controllerName: "Yanis Benali",
    agentId: "agt_lucas",
    agentName: "Lucas Morel",
    clientId: "cli_inter",
    clientName: "Intermarche Glisy",
    siteId: "site_glisy",
    siteName: "Intermarche Glisy - Galerie",
    detectedAddress: "Avenue de la Defense Passive, 80440 Glisy",
    globalScore: 88,
    observations: "Agent present, poste tenu, une consigne a faire relire.",
    itemResults: [
      { itemId: "item_tenue", label: "Tenue reglementaire", score: 92, compliant: true },
      { itemId: "item_carte", label: "Validite de la carte professionnelle", score: 100, compliant: true },
      { itemId: "item_main_courante", label: "Main courante", score: 78, compliant: false },
      { itemId: "item_deonto", label: "Code de deontologie", score: 85, compliant: true }
    ]
  },
  {
    id: "ctrl_2026_05_18",
    companyId: demoCompany.id,
    type: "PROGRAMME",
    status: "EN_ATTENTE_QCM",
    startedAt: "2026-05-18T07:30:00.000Z",
    completedAt: null,
    controllerId: "usr_controller",
    controllerName: "Yanis Benali",
    agentId: "agt_marc",
    agentName: "Marc Vidal",
    clientId: "cli_log",
    clientName: "Logiparc Amiens",
    siteId: "site_logiparc",
    siteName: "Logiparc Amiens - Entrepot A",
    detectedAddress: "18 rue des Transporteurs, 80080 Amiens",
    globalScore: 72,
    observations: "QCM client envoye. Document SST a renouveler.",
    itemResults: [
      { itemId: "item_tenue", label: "Tenue reglementaire", score: 70, compliant: false },
      { itemId: "item_main_courante", label: "Main courante", score: 74, compliant: false },
      { itemId: "item_deonto", label: "Code de deontologie", score: 80, compliant: true }
    ]
  }
];

export const demoNonConformities = [
  {
    id: "nc_main_courante",
    title: "Main courante incomplete",
    description: "Les rondes de 20h et 21h n'ont pas ete tracees avec le niveau de detail attendu.",
    severity: "MAJEURE",
    status: "EN_COURS",
    itemLabel: "Main courante",
    agentName: "Lucas Morel",
    siteName: "Intermarche Glisy - Galerie",
    clientName: "Intermarche Glisy",
    dueAt: "2026-05-25T18:00:00.000Z",
    internalOnly: false,
    evidenceCount: 1
  },
  {
    id: "nc_sst",
    title: "SST expirant bientot",
    description: "Le recyclage SST arrive a echeance et doit etre planifie avant fin mai.",
    severity: "MINEURE",
    status: "OUVERTE",
    itemLabel: "Documents agents",
    agentName: "Marc Vidal",
    siteName: "Logiparc Amiens - Entrepot A",
    clientName: "Logiparc Amiens",
    dueAt: "2026-05-31T18:00:00.000Z",
    internalOnly: true,
    evidenceCount: 0
  }
];

export const demoDocuments = [
  {
    id: "doc_carte_lucas",
    title: "Carte professionnelle Lucas Morel",
    category: "Carte professionnelle",
    scope: "AGENT",
    status: "VALIDE",
    expiresAt: "2026-09-30",
    visibility: "INTERNE",
    owner: "Lucas Morel"
  },
  {
    id: "doc_sst_marc",
    title: "SST Marc Vidal",
    category: "SST",
    scope: "AGENT",
    status: "EXPIRANT_BIENTOT",
    expiresAt: "2026-05-31",
    visibility: "INTERNE",
    owner: "Marc Vidal"
  },
  {
    id: "doc_consigne_glisy",
    title: "Consignes site - Galerie Glisy",
    category: "Consignes site",
    scope: "CONSIGNE_SITE",
    status: "VALIDE",
    expiresAt: null,
    visibility: "CLIENT_AUTORISE",
    owner: "Intermarche Glisy"
  }
];

export const demoQcms = [
  {
    id: "qcm_ops",
    title: "QCM OPS - Qualite et comportement",
    type: "OPS",
    category: "OPS",
    coefficient: 1,
    minimumScore: 80,
    questions: 8,
    successRate: 86
  },
  {
    id: "qcm_aps",
    title: "QCM ligne metier APS",
    type: "LIGNE_METIER",
    category: "APS",
    coefficient: 2,
    minimumScore: 80,
    questions: 10,
    successRate: 79
  },
  {
    id: "qcm_client_glisy",
    title: "QCM client - Intermarche Glisy",
    type: "CLIENT",
    category: "CLIENT-INTERMARCHE-GLISY",
    coefficient: 3,
    minimumScore: 80,
    questions: 6,
    successRate: 92
  }
];

export const demoQcmSessions = [
  {
    id: "session_lucas_ops",
    qcmTitle: "QCM OPS - Qualite et comportement",
    agentName: "Lucas Morel",
    status: "TERMINE",
    score: 88,
    passed: true,
    completedAt: "2026-05-21T22:22:00.000Z"
  },
  {
    id: "session_marc_client",
    qcmTitle: "QCM client - Intermarche Glisy",
    agentName: "Marc Vidal",
    status: "EN_COURS",
    score: null,
    passed: null,
    completedAt: null
  }
];

export const demoPlanning = [
  {
    id: "plan_1",
    title: "Controle inopine galerie Glisy",
    requestedStart: "2026-06-05T18:00:00.000Z",
    requestedEnd: "2026-06-12T00:00:00.000Z",
    preferredTimeWindow: "20h - 2h",
    status: "PLANIFIE",
    siteName: "Intermarche Glisy - Galerie",
    agentName: "Lucas Morel"
  },
  {
    id: "plan_2",
    title: "Controle chef de poste entrepot A",
    requestedStart: "2026-06-10T06:00:00.000Z",
    requestedEnd: "2026-06-10T14:00:00.000Z",
    preferredTimeWindow: "Matin",
    status: "DEMANDE",
    siteName: "Logiparc Amiens - Entrepot A",
    agentName: "Amina Roux"
  }
];

export const demoReports = [
  {
    id: "rep_interne_1",
    title: "Rapport complet interne - Controle du 21/05",
    type: "COMPLET_INTERNE",
    visibility: "DIRECTION",
    controlId: "ctrl_2026_05_21",
    sentToAgent: true,
    sentToManager: true,
    sentToClient: false,
    createdAt: "2026-05-21T22:08:00.000Z"
  },
  {
    id: "rep_client_1",
    title: "Rapport simplifie client - Glisy",
    type: "SIMPLIFIE_CLIENT",
    visibility: "CLIENT_SIMPLIFIE",
    controlId: "ctrl_2026_05_21",
    sentToAgent: false,
    sentToManager: false,
    sentToClient: true,
    createdAt: "2026-05-21T22:10:00.000Z"
  }
];

export const demoNotifications = [
  {
    id: "notif_1",
    type: "DOCUMENT_EXPIRANT",
    title: "SST expirant bientot",
    message: "Le document SST de Marc Vidal expire dans moins de 10 jours.",
    readAt: null,
    createdAt: "2026-05-24T08:00:00.000Z"
  },
  {
    id: "notif_2",
    type: "QCM_A_REALISER",
    title: "QCM client a realiser",
    message: "Un QCM client est disponible pour votre controle Logiparc.",
    readAt: null,
    createdAt: "2026-05-23T18:30:00.000Z"
  },
  {
    id: "notif_3",
    type: "RAPPORT_DISPONIBLE",
    title: "Rapport simplifie disponible",
    message: "Le rapport client du controle Glisy est disponible.",
    readAt: "2026-05-22T09:10:00.000Z",
    createdAt: "2026-05-21T22:12:00.000Z"
  }
];

export const demoPrevention = {
  id: "prev_mai_1",
  title: "Prevention du jour",
  body: "La vigilance active commence par une posture visible, une main courante tenue en temps reel et une alerte remontee sans delai.",
  question: "Quel document doit tracer les evenements importants du poste ?",
  expectedAnswer: "main courante"
};

export const qualityEvolution = [
  { month: "Jan", score: 78, controls: 9 },
  { month: "Fev", score: 81, controls: 12 },
  { month: "Mar", score: 83, controls: 11 },
  { month: "Avr", score: 85, controls: 15 },
  { month: "Mai", score: 88, controls: 14 }
];

export const severityStats = [
  { label: "Mineures", value: 18, color: "#f59e0b" },
  { label: "Majeures", value: 7, color: "#dc2626" },
  { label: "Critiques", value: 1, color: "#991b1b" }
];

export const dashboardStats = {
  controls: 61,
  averageScore: 86,
  nonConformitiesOpen: 9,
  criticalAlerts: 1,
  documentsExpiring: 12,
  qcmCompleted: 44,
  qcmAverageScore: 84,
  monthlyLogins: 389
};

export function getRoleDashboard(role: Role) {
  switch (role) {
    case "SUPER_ADMIN":
      return {
        title: "Vue globale plateforme",
        subtitle: "Supervision multi-entreprise, activite SaaS, alertes critiques et conformite.",
        highlights: ["2 entreprises actives", "389 connexions mensuelles", "1 alerte critique", "99,9 % separation logique"]
      };
    case "COMPANY_ADMIN":
      return {
        title: "Pilotage entreprise",
        subtitle: "Controle qualite, documents reglementaires, utilisateurs et actions de levee.",
        highlights: ["61 controles", "12 documents expirants", "9 non-conformites ouvertes", "3 QCM actifs"]
      };
    case "QUALITY_CONTROLLER":
      return {
        title: "Espace controleur",
        subtitle: "Controles a realiser, alertes terrain, QCM envoyes et rapports a valider.",
        highlights: ["2 controles a venir", "1 QCM en cours", "2 rapports disponibles", "Geolocalisation prete"]
      };
    case "AGENT":
      return {
        title: "Espace agent",
        subtitle: "Progression qualite, QCM, documents personnels, consignes de sites et prevention.",
        highlights: ["Score qualite 86 %", "1 QCM a terminer", "1 document a surveiller", "Message prevention du jour"]
      };
    case "BUSINESS_OWNER":
      return {
        title: "Direction",
        subtitle: "Indicateurs, demandes de controle, syntheses mensuelles et exports appel d'offres.",
        highlights: ["Evolution +7 pts", "5 sites audites", "Synthese mensuelle prete", "Exports disponibles"]
      };
    case "CLIENT":
      return {
        title: "Espace client",
        subtitle: "Rapports simplifies, statistiques de sites et documents autorises.",
        highlights: ["1 rapport disponible", "Note site 88 %", "3 consignes publiees", "Aucune donnee RH sensible"]
      };
  }
}

export function demoSearch(query: string) {
  const q = query.toLowerCase();
  return [
    ...demoAgents.map((agent) => ({ type: "Agent", title: `${agent.firstName} ${agent.lastName}`, detail: agent.matricule, href: "/agents" })),
    ...demoClients.map((client) => ({ type: "Client", title: client.name, detail: client.reference, href: "/clients-sites" })),
    ...demoSites.map((site) => ({ type: "Site", title: site.name, detail: site.address, href: "/clients-sites" })),
    ...demoControls.map((control) => ({ type: "Controle", title: control.siteName, detail: `${control.agentName} - ${control.globalScore} %`, href: "/controles" })),
    ...demoDocuments.map((document) => ({ type: "Document", title: document.title, detail: document.status, href: "/documents" })),
    ...demoNonConformities.map((nc) => ({ type: "Non-conformite", title: nc.title, detail: nc.status, href: "/non-conformites" })),
    ...demoQcms.map((qcm) => ({ type: "QCM", title: qcm.title, detail: qcm.type, href: "/qcm" }))
  ].filter((item) => `${item.type} ${item.title} ${item.detail}`.toLowerCase().includes(q));
}
