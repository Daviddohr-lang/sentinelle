export type ControlPointStatus = "CONFORME" | "NON_CONFORME" | "SANS_OBJET";
export type ControlImpactLevel = "VERT" | "JAUNE" | "ORANGE" | "ROUGE" | "CRITIQUE";
export type ControlSeverity = "MINEURE" | "MAJEURE" | "CRITIQUE";
export type ControlRequirement = "NONE" | "OPTIONAL" | "REQUIRED";

export type ControlTemplateSeed = {
  id: string;
  companyId: string;
  title: string;
  description?: string | null;
  version: number;
  active: boolean;
  reportRules?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
};

export type ControlCriterionSeed = {
  id: string;
  companyId: string;
  templateId: string;
  label: string;
  description?: string | null;
  coefficient: number;
  sortOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
};

export type ControlPointSeed = {
  id: string;
  companyId: string;
  criterionId: string;
  label: string;
  description?: string | null;
  coefficient: number;
  defaultSeverity: ControlSeverity;
  blocking: boolean;
  defaultCorrectiveAction?: string | null;
  defaultCorrectionDelayHours?: number | null;
  photoRequirement: ControlRequirement;
  fileRequirement: ControlRequirement;
  voiceRequirement: ControlRequirement;
  visibleInAgentReport: boolean;
  visibleInDirectionReport: boolean;
  visibleInClientReport: boolean;
  sortOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
};

export type ControlPointResponseOptionSeed = {
  id: string;
  companyId: string;
  pointId: string;
  status: ControlPointStatus;
  label: string;
  impactLevel: ControlImpactLevel;
  severity: ControlSeverity;
  score: number;
  affectsScore: boolean;
  affectsCompliance: boolean;
  correctiveAction?: string | null;
  correctionDelayHours?: number | null;
  blocking: boolean;
  notificationRequired: boolean;
  visibleInAgentReport: boolean;
  visibleInDirectionReport: boolean;
  visibleInClientReport: boolean;
  sortOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
};

export type ControlLibrarySeed = {
  controlTemplates: ControlTemplateSeed[];
  controlCriteria: ControlCriterionSeed[];
  controlPoints: ControlPointSeed[];
  controlPointResponseOptions: ControlPointResponseOptionSeed[];
};

export type ControlPointSelection = {
  criterionId: string;
  pointId: string;
  responseOptionId: string;
  observation?: string | null;
};

export type ControlCriterionScore = {
  criterionId: string;
  score: number;
  controlledPoints: number;
  nonConformities: number;
  criticalCount: number;
  blockingCount: number;
};

export type ControlScoreSummary = {
  globalScore: number;
  complianceLevel: string;
  criterionScores: ControlCriterionScore[];
  nonConformingResults: Array<ControlPointSelection & { option: ControlPointResponseOptionSeed; point: ControlPointSeed }>;
  criticalAlerts: Array<ControlPointSelection & { option: ControlPointResponseOptionSeed; point: ControlPointSeed }>;
};

type PointDefinition = {
  id: string;
  label: string;
  coefficient?: number;
  severity?: ControlSeverity;
  critical?: boolean;
  delayHours?: number;
  action?: string;
  photoRequirement?: ControlRequirement;
  fileRequirement?: ControlRequirement;
  visibleInClientReport?: boolean;
  ncLabel?: string;
  reserveLabel?: string;
};

type CriterionDefinition = {
  id: string;
  label: string;
  coefficient: number;
  points: PointDefinition[];
};

export const controlComplianceLevels = [
  { id: "CONFORME", label: "Conforme", color: "vert", minScore: 95, severity: "MINEURE" },
  { id: "RESERVE", label: "Conforme avec réserve", color: "jaune", minScore: 85, severity: "MINEURE" },
  { id: "NC_MINEURE", label: "Non-conformité mineure", color: "orange", minScore: 70, severity: "MINEURE" },
  { id: "NC_MAJEURE", label: "Non-conformité majeure", color: "rouge", minScore: 1, severity: "MAJEURE" },
  { id: "NC_CRITIQUE", label: "Non-conformité critique", color: "rouge critique", minScore: 0, severity: "CRITIQUE" }
] as const;

const defaultCorrectiveAction = "Formaliser l'écart, rappeler la consigne et vérifier la correction au prochain contrôle.";

const criterionDefinitions: CriterionDefinition[] = [
  {
    id: "crit_identite_administrative",
    label: "Identité administrative de l'agent",
    coefficient: 1.3,
    points: [
      {
        id: "pt_carte_physique",
        label: "Carte professionnelle présentée physiquement",
        critical: true,
        delayHours: 0,
        action: "Retirer l'agent du poste tant que la carte professionnelle n'est pas présentée.",
        photoRequirement: "REQUIRED",
        fileRequirement: "REQUIRED",
        visibleInClientReport: false,
        ncLabel: "Incapacité à présenter la carte professionnelle"
      },
      {
        id: "pt_carte_validite",
        label: "Validité de la carte professionnelle contrôlée",
        critical: true,
        delayHours: 0,
        action: "Suspendre l'affectation et vérifier immédiatement le droit d'exercice.",
        photoRequirement: "REQUIRED",
        fileRequirement: "REQUIRED",
        visibleInClientReport: false,
        ncLabel: "Carte professionnelle périmée ou non vérifiable"
      },
      {
        id: "pt_identite_planning",
        label: "Concordance identité agent, planning et carte",
        severity: "MAJEURE",
        delayHours: 24,
        ncLabel: "Identité ou affectation incohérente"
      },
      {
        id: "pt_droit_exercice",
        label: "Droit d'exercice compatible avec la mission",
        critical: true,
        delayHours: 0,
        action: "Stopper la mission et alerter la direction pour contrôle réglementaire.",
        fileRequirement: "REQUIRED",
        visibleInClientReport: false,
        ncLabel: "Absence de droit d'exercice"
      },
      { id: "pt_piece_identite", label: "Pièce d'identité disponible selon procédure interne", delayHours: 48 },
      { id: "pt_matricule_coordonnees", label: "Matricule et coordonnées agent à jour", delayHours: 72 },
      { id: "pt_documents_obligatoires", label: "Documents obligatoires consultables dans SENTINELLE", severity: "MAJEURE", delayHours: 24 }
    ]
  },
  {
    id: "crit_habilitations_formations",
    label: "Habilitations et formations",
    coefficient: 1.2,
    points: [
      { id: "pt_sst_valide", label: "SST valide lorsque le poste l'exige", severity: "MAJEURE", delayHours: 48, fileRequirement: "OPTIONAL" },
      { id: "pt_ssiap_valide", label: "SSIAP valide lorsque le poste incendie l'exige", severity: "MAJEURE", delayHours: 48, fileRequirement: "OPTIONAL" },
      {
        id: "pt_habilitation_electrique",
        label: "Habilitation HO BO / BS BE Manœuvre adaptée au poste",
        severity: "MAJEURE",
        delayHours: 48,
        fileRequirement: "OPTIONAL"
      },
      { id: "pt_formation_aps", label: "Formation APS ou équivalence référencée", severity: "MAJEURE", delayHours: 48 },
      { id: "pt_autorisations_site", label: "Autorisations spécifiques site connues", delayHours: 48 },
      { id: "pt_recyclages_planifies", label: "Recyclages réglementaires planifiés", delayHours: 168 },
      { id: "pt_aptitude_poste", label: "Aptitude au poste vérifiée", severity: "MAJEURE", delayHours: 24 }
    ]
  },
  {
    id: "crit_tenue_professionnelle",
    label: "Tenue professionnelle",
    coefficient: 1,
    points: [
      {
        id: "pt_tenue_complete",
        label: "Tenue professionnelle complète portée",
        severity: "MAJEURE",
        delayHours: 24,
        photoRequirement: "OPTIONAL",
        ncLabel: "Tenue absente ou incomplète"
      },
      { id: "pt_insignes_visibles", label: "Insignes ou éléments d'identification visibles", delayHours: 24, photoRequirement: "OPTIONAL", ncLabel: "Insignes absents" },
      { id: "pt_tenue_propre", label: "Tenue propre et correcte", delayHours: 48, photoRequirement: "OPTIONAL" },
      { id: "pt_chaussures_adaptees", label: "Chaussures adaptées à la mission", delayHours: 48 },
      { id: "pt_epi_visibilite", label: "EPI ou vêtement haute visibilité porté si requis", severity: "MAJEURE", delayHours: 24, photoRequirement: "OPTIONAL" },
      { id: "pt_telephone_personnel", label: "Usage du téléphone personnel conforme aux règles du site", delayHours: 24 },
      {
        id: "pt_absence_tenue_obligatoire",
        label: "Absence de tenue obligatoire lorsque la tenue est imposée",
        critical: true,
        delayHours: 0,
        action: "Remplacer ou retirer l'agent du poste si la tenue imposée n'est pas portée.",
        photoRequirement: "REQUIRED",
        ncLabel: "Tenue obligatoire non portée"
      }
    ]
  },
  {
    id: "crit_equipements_individuels",
    label: "Équipements individuels",
    coefficient: 1,
    points: [
      { id: "pt_radio_service", label: "Radio ou téléphone de service opérationnel", severity: "MAJEURE", delayHours: 24 },
      { id: "pt_lampe_ronde", label: "Lampe ou matériel de ronde disponible", delayHours: 24 },
      { id: "pt_badge_cles", label: "Badge, clés ou moyens d'accès disponibles", severity: "MAJEURE", delayHours: 24 },
      { id: "pt_dati_pti", label: "DATI/PTI testé si prévu", severity: "MAJEURE", delayHours: 24 },
      { id: "pt_main_courante_accessible", label: "Main courante numérique ou papier accessible", severity: "MAJEURE", delayHours: 24 },
      { id: "pt_dotation_conforme", label: "Matériel remis conforme à la dotation", delayHours: 48 }
    ]
  },
  {
    id: "crit_prise_service",
    label: "Prise de service",
    coefficient: 1.1,
    points: [
      { id: "pt_ponctualite", label: "Arrivée à l'heure et assiduité constatée", severity: "MAJEURE", delayHours: 24 },
      { id: "pt_releve_transmission", label: "Relève effectuée avec transmission claire", delayHours: 24 },
      { id: "pt_consigne_jour", label: "Consignes du jour consultées", delayHours: 24 },
      { id: "pt_poste_propre", label: "Poste repris propre et opérationnel", delayHours: 48 },
      { id: "pt_evenements_precedents", label: "Événements précédents lus dans la main courante", delayHours: 24 },
      { id: "pt_brief_hierarchique", label: "Brief hiérarchique reçu si prévu", delayHours: 48 },
      {
        id: "pt_agent_absent",
        label: "Agent présent au poste prévu",
        critical: true,
        delayHours: 0,
        action: "Déclencher une alerte exploitation et organiser le remplacement immédiat.",
        ncLabel: "Agent absent du poste"
      }
    ]
  },
  {
    id: "crit_execution_mission",
    label: "Exécution de la mission",
    coefficient: 1.4,
    points: [
      { id: "pt_presence_continue", label: "Présence continue au poste", severity: "MAJEURE", delayHours: 24 },
      { id: "pt_vigilance", label: "Vigilance adaptée au niveau de risque", severity: "MAJEURE", delayHours: 24 },
      { id: "pt_perimetre_contractuel", label: "Respect du périmètre contractuel", severity: "MAJEURE", delayHours: 24 },
      { id: "pt_taches_consigne", label: "Tâches réalisées selon les consignes", delayHours: 24 },
      { id: "pt_gestion_acces", label: "Gestion des visiteurs ou livreurs conforme", severity: "MAJEURE", delayHours: 24 },
      { id: "pt_signalement_anomalies", label: "Signalement immédiat des anomalies", severity: "MAJEURE", delayHours: 24 },
      {
        id: "pt_mission_etrangere",
        label: "Refus des missions étrangères à la sécurité privée",
        critical: true,
        delayHours: 0,
        action: "Faire cesser la tâche étrangère à la sécurité et alerter la direction.",
        visibleInClientReport: false,
        ncLabel: "Mission étrangère à la sécurité acceptée ou demandée"
      }
    ]
  },
  {
    id: "crit_rondes_surveillance",
    label: "Rondes et surveillances",
    coefficient: 1.1,
    points: [
      { id: "pt_rondes_horaires", label: "Ronde effectuée aux horaires prévus", severity: "MAJEURE", delayHours: 24 },
      { id: "pt_itineraire_ronde", label: "Itinéraire de ronde respecté", delayHours: 24 },
      { id: "pt_points_controle", label: "Points de contrôle badge ou QR validés", delayHours: 24 },
      { id: "pt_anomalies_ronde", label: "Anomalies de ronde tracées", severity: "MAJEURE", delayHours: 24 },
      { id: "pt_issues_verifiees", label: "Portes, issues et accès sensibles vérifiés", delayHours: 24 },
      { id: "pt_surveillance_video_alarme", label: "Caméras ou alarmes surveillées selon consigne", delayHours: 24 },
      {
        id: "pt_abandon_ronde",
        label: "Aucun abandon de poste pendant la ronde",
        critical: true,
        delayHours: 0,
        action: "Qualifier l'abandon, sécuriser le site et notifier la direction.",
        ncLabel: "Abandon de poste"
      }
    ]
  },
  {
    id: "crit_procedures_intervention",
    label: "Procédures d'intervention",
    coefficient: 1.2,
    points: [
      { id: "pt_procedure_intrusion", label: "Procédure intrusion connue", severity: "MAJEURE", delayHours: 24 },
      { id: "pt_procedure_incendie", label: "Procédure incendie et évacuation connue", severity: "MAJEURE", delayHours: 24 },
      { id: "pt_appels_urgence", label: "Appels d'urgence et chaîne hiérarchique connus", delayHours: 24 },
      { id: "pt_priorite_personnes", label: "Préservation des personnes avant les biens", severity: "MAJEURE", delayHours: 24 },
      { id: "pt_compte_rendu_incident", label: "Compte rendu d'incident réalisé après intervention", delayHours: 24 },
      { id: "pt_gestion_conflit", label: "Gestion du conflit sans disproportion", severity: "MAJEURE", delayHours: 24 },
      {
        id: "pt_violence_hors_cadre",
        label: "Absence de violence hors cadre légal",
        critical: true,
        delayHours: 0,
        action: "Alerter immédiatement la direction, préserver les éléments et qualifier l'événement.",
        visibleInClientReport: false,
        ncLabel: "Violence hors cadre légal"
      }
    ]
  },
  {
    id: "crit_redaction_documents",
    label: "Rédaction des documents",
    coefficient: 1,
    points: [
      { id: "pt_main_courante_temps_reel", label: "Main courante renseignée en temps réel", severity: "MAJEURE", delayHours: 24 },
      { id: "pt_ecriture_factuelle", label: "Écriture factuelle sans jugement RH", delayHours: 24 },
      { id: "pt_horodatages_coherents", label: "Horodatages cohérents", delayHours: 24 },
      { id: "pt_incidents_preuves", label: "Incidents documentés avec preuves utiles", delayHours: 48 },
      { id: "pt_corrections_tracables", label: "Corrections de saisie traçables", delayHours: 48 },
      { id: "pt_donnees_sensibles", label: "Données sensibles protégées", severity: "MAJEURE", delayHours: 24 }
    ]
  },
  {
    id: "crit_deontologie",
    label: "Déontologie professionnelle",
    coefficient: 1.4,
    points: [
      { id: "pt_code_deontologie", label: "Respect du code de déontologie", severity: "MAJEURE", delayHours: 24 },
      { id: "pt_courtoisie_maitrise", label: "Courtoisie et maîtrise comportementale", delayHours: 24 },
      { id: "pt_confidentialite_client", label: "Confidentialité des informations client", severity: "MAJEURE", delayHours: 24 },
      { id: "pt_neutralite", label: "Neutralité et absence de discrimination", severity: "MAJEURE", delayHours: 24 },
      { id: "pt_usage_proportionne", label: "Usage proportionné des moyens", severity: "MAJEURE", delayHours: 24 },
      { id: "pt_pas_puissance_publique", label: "Refus de toute prérogative de puissance publique", severity: "MAJEURE", delayHours: 24 },
      {
        id: "pt_ebriete",
        label: "Absence d'état d'ébriété ou d'emprise produit",
        critical: true,
        delayHours: 0,
        action: "Retirer l'agent du poste, sécuriser la mission et notifier la direction.",
        visibleInClientReport: false,
        ncLabel: "État d'ébriété ou emprise produit"
      }
    ]
  },
  {
    id: "crit_securite_collective",
    label: "Sécurité personnelle et collective",
    coefficient: 1.1,
    points: [
      { id: "pt_positionnement_securise", label: "Positionnement sécurisé sur le poste", delayHours: 24 },
      { id: "pt_evacuation_maitrisee", label: "Consignes d'évacuation maîtrisées", severity: "MAJEURE", delayHours: 24 },
      { id: "pt_risques_site", label: "Risques principaux du site identifiés", delayHours: 24 },
      { id: "pt_equipements_collectifs", label: "Équipements de sécurité collectifs non entravés", severity: "MAJEURE", delayHours: 24 },
      { id: "pt_incident_sante_securite", label: "Incident santé/sécurité signalé", severity: "MAJEURE", delayHours: 24 },
      { id: "pt_travail_isole", label: "Travail isolé couvert par la procédure prévue", severity: "MAJEURE", delayHours: 24 }
    ]
  },
  {
    id: "crit_suivi_hierarchique",
    label: "Suivi hiérarchique",
    coefficient: 1,
    points: [
      { id: "pt_cr_exploitation", label: "Compte rendu à l'exploitation effectué", delayHours: 24 },
      { id: "pt_alertes_critiques", label: "Alertes critiques transmises sans délai", severity: "MAJEURE", delayHours: 24 },
      { id: "pt_actions_precedentes", label: "Actions correctives précédentes suivies", delayHours: 48 },
      { id: "pt_debriefing_controle", label: "Disponibilité pour le débriefing contrôle", delayHours: 48 },
      { id: "pt_demandes_client", label: "Demandes client remontées à la direction", delayHours: 48 },
      { id: "pt_historique_qualite", label: "Historique qualité agent consulté", delayHours: 72 }
    ]
  }
];

export function controlLibraryPointCount() {
  return criterionDefinitions.reduce((sum, criterion) => sum + criterion.points.length, 0);
}

function optionId(pointId: string, suffix: string) {
  return `resp_${pointId}_${suffix}`;
}

function pointResponseOptions(companyId: string, point: PointDefinition, createdAt: string): ControlPointResponseOptionSeed[] {
  const pointId = point.id;
  const severity = point.critical ? "CRITIQUE" : point.severity ?? "MINEURE";
  const nonConformingImpact: ControlImpactLevel = point.critical ? "CRITIQUE" : severity === "MAJEURE" ? "ROUGE" : "ORANGE";
  const nonConformingScore = point.critical ? 0 : severity === "MAJEURE" ? 35 : 60;
  const action = point.action ?? defaultCorrectiveAction;
  const delay = point.delayHours ?? (point.critical ? 0 : severity === "MAJEURE" ? 24 : 48);
  const options: ControlPointResponseOptionSeed[] = [
    {
      id: optionId(pointId, "conforme"),
      companyId,
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
      createdAt,
      updatedAt: createdAt,
      archivedAt: null
    },
    {
      id: optionId(pointId, "reserve"),
      companyId,
      pointId,
      status: "CONFORME",
      label: point.reserveLabel ?? "Conforme avec réserve : point à surveiller",
      impactLevel: "JAUNE",
      severity: "MINEURE",
      score: 85,
      affectsScore: true,
      affectsCompliance: true,
      correctiveAction: "Surveiller le point et confirmer la conformité lors du prochain passage.",
      correctionDelayHours: 168,
      blocking: false,
      notificationRequired: false,
      visibleInAgentReport: true,
      visibleInDirectionReport: true,
      visibleInClientReport: true,
      sortOrder: 1,
      active: true,
      createdAt,
      updatedAt: createdAt,
      archivedAt: null
    },
    {
      id: optionId(pointId, "non_conforme"),
      companyId,
      pointId,
      status: "NON_CONFORME",
      label: `Non conforme : ${point.ncLabel ?? point.label.toLowerCase()}`,
      impactLevel: nonConformingImpact,
      severity,
      score: nonConformingScore,
      affectsScore: true,
      affectsCompliance: true,
      correctiveAction: action,
      correctionDelayHours: delay,
      blocking: Boolean(point.critical),
      notificationRequired: Boolean(point.critical || severity === "CRITIQUE"),
      visibleInAgentReport: true,
      visibleInDirectionReport: true,
      visibleInClientReport: point.visibleInClientReport ?? !point.critical,
      sortOrder: 2,
      active: true,
      createdAt,
      updatedAt: createdAt,
      archivedAt: null
    },
    {
      id: optionId(pointId, "sans_objet"),
      companyId,
      pointId,
      status: "SANS_OBJET",
      label: "Sans objet : exigence non applicable sur ce poste",
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
      sortOrder: 3,
      active: true,
      createdAt,
      updatedAt: createdAt,
      archivedAt: null
    }
  ];
  return options;
}

export function buildInitialControlLibrary(companyId: string, createdAt: string): ControlLibrarySeed {
  const template: ControlTemplateSeed = {
    id: "tpl_ops_controle_interne_v1",
    companyId,
    title: "Contrôle interne OPS - modèle 12 critères",
    description: "Référentiel dynamique de contrôle terrain pour les prestations de sécurité privée.",
    version: 1,
    active: true,
    reportRules: {
      reportTypes: ["COMPLET_INTERNE", "RAPPORT_AGENT", "RAPPORT_DIRECTION", "SIMPLIFIE_CLIENT"],
      clientReportExcludes: ["commentaires RH", "sanctions", "données internes confidentielles"],
      qcmIncluded: true
    },
    createdAt,
    updatedAt: createdAt,
    archivedAt: null
  };

  const controlCriteria = criterionDefinitions.map((criterion, index) => ({
    id: criterion.id,
    companyId,
    templateId: template.id,
    label: criterion.label,
    description: `Critère ${index + 1} du référentiel OPS.`,
    coefficient: criterion.coefficient,
    sortOrder: index + 1,
    active: true,
    createdAt,
    updatedAt: createdAt,
    archivedAt: null
  }));

  const controlPoints = criterionDefinitions.flatMap((criterion) =>
    criterion.points.map((point, index) => ({
      id: point.id,
      companyId,
      criterionId: criterion.id,
      label: point.label,
      description: null,
      coefficient: point.coefficient ?? 1,
      defaultSeverity: point.critical ? "CRITIQUE" : point.severity ?? "MINEURE",
      blocking: Boolean(point.critical),
      defaultCorrectiveAction: point.action ?? defaultCorrectiveAction,
      defaultCorrectionDelayHours: point.delayHours ?? (point.critical ? 0 : point.severity === "MAJEURE" ? 24 : 48),
      photoRequirement: point.photoRequirement ?? "OPTIONAL",
      fileRequirement: point.fileRequirement ?? "NONE",
      voiceRequirement: "OPTIONAL" as const,
      visibleInAgentReport: true,
      visibleInDirectionReport: true,
      visibleInClientReport: point.visibleInClientReport ?? !point.critical,
      sortOrder: index + 1,
      active: true,
      createdAt,
      updatedAt: createdAt,
      archivedAt: null
    }))
  );

  const controlPointResponseOptions = criterionDefinitions.flatMap((criterion) =>
    criterion.points.flatMap((point) => pointResponseOptions(companyId, point, createdAt))
  );

  return {
    controlTemplates: [template],
    controlCriteria,
    controlPoints,
    controlPointResponseOptions
  };
}

export function calculateControlScore(
  library: Pick<ControlLibrarySeed, "controlCriteria" | "controlPoints" | "controlPointResponseOptions">,
  selectedCriterionIds: string[],
  selections: ControlPointSelection[]
): ControlScoreSummary {
  const selectedCriterionSet = new Set(selectedCriterionIds);
  const pointById = new Map(library.controlPoints.map((point) => [point.id, point]));
  const optionById = new Map(library.controlPointResponseOptions.map((option) => [option.id, option]));
  const criterionScores = library.controlCriteria
    .filter((criterion) => selectedCriterionSet.has(criterion.id))
    .map((criterion) => {
      const criterionPoints = library.controlPoints.filter((point) => point.criterionId === criterion.id && point.active && !point.archivedAt);
      const criterionSelections = selections.filter((selection) => selection.criterionId === criterion.id);
      const weighted = criterionPoints.reduce(
        (acc, point) => {
          const selection = criterionSelections.find((item) => item.pointId === point.id);
          const option = selection ? optionById.get(selection.responseOptionId) : undefined;
          if (!option || !option.affectsScore) return acc;
          return {
            score: acc.score + option.score * point.coefficient,
            coefficient: acc.coefficient + point.coefficient
          };
        },
        { score: 0, coefficient: 0 }
      );
      const selectedOptions = criterionSelections.map((selection) => optionById.get(selection.responseOptionId)).filter(Boolean) as ControlPointResponseOptionSeed[];
      return {
        criterionId: criterion.id,
        score: weighted.coefficient ? Math.round(weighted.score / weighted.coefficient) : 100,
        controlledPoints: criterionSelections.length,
        nonConformities: selectedOptions.filter((option) => option.status === "NON_CONFORME").length,
        criticalCount: selectedOptions.filter((option) => option.impactLevel === "CRITIQUE" || option.severity === "CRITIQUE").length,
        blockingCount: selectedOptions.filter((option) => option.blocking).length
      };
    });

  const selectedCriteria = library.controlCriteria.filter((criterion) => selectedCriterionSet.has(criterion.id));
  const globalWeighted = selectedCriteria.reduce(
    (acc, criterion) => {
      const criterionScore = criterionScores.find((item) => item.criterionId === criterion.id)?.score ?? 100;
      return {
        score: acc.score + criterionScore * criterion.coefficient,
        coefficient: acc.coefficient + criterion.coefficient
      };
    },
    { score: 0, coefficient: 0 }
  );

  const enrichedNonConformities = selections
    .map((selection) => {
      const option = optionById.get(selection.responseOptionId);
      const point = pointById.get(selection.pointId);
      return option && point && option.status === "NON_CONFORME" ? { ...selection, option, point } : null;
    })
    .filter(Boolean) as Array<ControlPointSelection & { option: ControlPointResponseOptionSeed; point: ControlPointSeed }>;

  const globalScore = globalWeighted.coefficient ? Math.round(globalWeighted.score / globalWeighted.coefficient) : 100;
  const criticalAlerts = enrichedNonConformities.filter((item) => item.option.blocking || item.option.impactLevel === "CRITIQUE");
  const hasMajor = enrichedNonConformities.some((item) => item.option.severity === "MAJEURE" || item.option.impactLevel === "ROUGE");
  const hasMinor = enrichedNonConformities.length > 0;
  const hasReserve = selections.some((selection) => optionById.get(selection.responseOptionId)?.impactLevel === "JAUNE");
  const complianceLevel =
    criticalAlerts.length > 0
      ? "Non-conformité critique"
      : hasMajor || globalScore < 70
        ? "Non-conformité majeure"
        : hasMinor || globalScore < 85
          ? "Non-conformité mineure"
          : hasReserve || globalScore < 95
            ? "Conforme avec réserve"
            : "Conforme";

  return {
    globalScore,
    complianceLevel,
    criterionScores,
    nonConformingResults: enrichedNonConformities,
    criticalAlerts
  };
}
