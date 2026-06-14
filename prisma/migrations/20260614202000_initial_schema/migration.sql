-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'COMPANY_ADMIN', 'QUALITY_CONTROLLER', 'AGENT', 'BUSINESS_OWNER', 'CLIENT');

-- CreateEnum
CREATE TYPE "Civility" AS ENUM ('MONSIEUR', 'MADAME');

-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('CDD', 'CDI', 'APPRENTI');

-- CreateEnum
CREATE TYPE "CompanyStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('INVITED', 'ACTIVE', 'DISABLED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('ACTIVE', 'PLANNED', 'ENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ControlType" AS ENUM ('PROGRAMME', 'INOPINE');

-- CreateEnum
CREATE TYPE "ControlStatus" AS ENUM ('BROUILLON', 'EN_COURS', 'EN_ATTENTE_QCM', 'A_VALIDER', 'VALIDE', 'CLOTURE', 'ANNULE');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('MINEURE', 'MAJEURE', 'CRITIQUE');

-- CreateEnum
CREATE TYPE "Requirement" AS ENUM ('NONE', 'OPTIONAL', 'REQUIRED');

-- CreateEnum
CREATE TYPE "ControlPointStatus" AS ENUM ('CONFORME', 'NON_CONFORME', 'SANS_OBJET');

-- CreateEnum
CREATE TYPE "ControlImpactLevel" AS ENUM ('VERT', 'JAUNE', 'ORANGE', 'ROUGE', 'CRITIQUE');

-- CreateEnum
CREATE TYPE "NonConformityStatus" AS ENUM ('OUVERTE', 'EN_COURS', 'CORRIGEE', 'VALIDEE', 'REFUSEE', 'CLOTUREE');

-- CreateEnum
CREATE TYPE "EvidenceType" AS ENUM ('PHOTO_CAPTURE', 'PHOTO_UPLOAD', 'FILE', 'VOICE_COMMENT', 'SIGNATURE');

-- CreateEnum
CREATE TYPE "DocumentScope" AS ENUM ('AGENT', 'ENTREPRISE', 'CLIENT', 'SITE', 'CONSIGNE_SITE', 'RAPPORT_AUDIT', 'JUSTIFICATIF_REGLEMENTAIRE');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('VALIDE', 'EN_ATTENTE_VALIDATION', 'MANQUANT', 'EXPIRANT_BIENTOT', 'EXPIRE', 'REFUSE', 'ARCHIVE');

-- CreateEnum
CREATE TYPE "FileVisibility" AS ENUM ('INTERNE', 'AGENT', 'CLIENT_AUTORISE', 'DIRECTION', 'PUBLIC_CONTROLE');

-- CreateEnum
CREATE TYPE "QcmType" AS ENUM ('OPS', 'LIGNE_METIER', 'CLIENT');

-- CreateEnum
CREATE TYPE "QcmBankType" AS ENUM ('ENTREPRISE', 'METIER', 'CLIENT_SITE');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('CHOIX_UNIQUE', 'CHOIX_MULTIPLE');

-- CreateEnum
CREATE TYPE "QcmDifficulty" AS ENUM ('FACILE', 'MOYEN', 'DIFFICILE');

-- CreateEnum
CREATE TYPE "QcmSessionStatus" AS ENUM ('ENVOYE', 'EN_COURS', 'TERMINE', 'INTERROMPU', 'EXPIRE', 'ANNULE');

-- CreateEnum
CREATE TYPE "QcmLaunchTiming" AS ENUM ('PENDANT_CONTROLE', 'FIN_CONTROLE', 'APRES_CONTROLE');

-- CreateEnum
CREATE TYPE "PlanningStatus" AS ENUM ('DEMANDE', 'ACCEPTE', 'PLANIFIE', 'REALISE', 'CLOTURE', 'REFUSE', 'REPORTE');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('QCM_A_REALISER', 'DOCUMENT_EXPIRANT', 'DOCUMENT_MANQUANT', 'NON_CONFORMITE_VALIDEE', 'CONTROLE_PLANIFIE', 'DEMANDE_CONTROLE', 'RAPPORT_DISPONIBLE', 'PREVENTION_VALIDEE', 'ALERTE_CRITIQUE');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('COMPLET_INTERNE', 'SIMPLIFIE_CLIENT', 'RAPPORT_AGENT', 'RAPPORT_DIRECTION', 'SYNTHESE_MENSUELLE');

-- CreateEnum
CREATE TYPE "ReportVisibility" AS ENUM ('INTERNE', 'AGENT', 'DIRECTION', 'CLIENT_SIMPLIFIE', 'CLIENT_COMPLET_APPROUVE');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'ARCHIVE', 'LOGIN', 'LOGOUT', 'EXPORT', 'VALIDATE', 'CLOSE', 'SYNC');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('PENDING', 'APPLIED', 'REJECTED');

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "siret" TEXT,
    "cnapsAuthorizationNumber" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "legalNotice" TEXT,
    "status" "CompanyStatus" NOT NULL DEFAULT 'ACTIVE',
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "phone" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "emailVerifiedAt" TIMESTAMP(3),
    "preferences" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "address" TEXT,
    "settings" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Site" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Paris',
    "riskLevel" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT,
    "photoUrl" TEXT,
    "civility" "Civility",
    "matricule" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3),
    "birthPlace" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "professionalCardNumber" TEXT,
    "professionalCardExpiresAt" TIMESTAMP(3),
    "sstExpiresAt" TIMESTAMP(3),
    "ssiapExpiresAt" TIMESTAMP(3),
    "diplomas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "eligibleJobTitles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "contractType" "ContractType",
    "hiredAt" TIMESTAMP(3),
    "qualityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assignment" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "customJobTitle" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "status" "AssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "history" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ControlItemDefinition" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "coefficient" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "severity" "Severity" NOT NULL DEFAULT 'MINEURE',
    "color" TEXT NOT NULL DEFAULT '#f59e0b',
    "correctionDelayHours" INTEGER,
    "blocking" BOOLEAN NOT NULL DEFAULT false,
    "recommendedAction" TEXT,
    "autoNotify" BOOLEAN NOT NULL DEFAULT false,
    "clientVisible" BOOLEAN NOT NULL DEFAULT true,
    "impactsGlobalScore" BOOLEAN NOT NULL DEFAULT true,
    "photoRequirement" "Requirement" NOT NULL DEFAULT 'OPTIONAL',
    "fileRequirement" "Requirement" NOT NULL DEFAULT 'NONE',
    "voiceRequirement" "Requirement" NOT NULL DEFAULT 'OPTIONAL',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ControlItemDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Control" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" "ControlType" NOT NULL,
    "status" "ControlStatus" NOT NULL DEFAULT 'BROUILLON',
    "plannedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "controllerId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "detectedAddress" TEXT,
    "globalScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "observations" TEXT,
    "agentSignature" TEXT,
    "controllerSignature" TEXT,
    "validatedAt" TIMESTAMP(3),
    "validatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Control_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ControlTemplate" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "reportRules" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "ControlTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ControlCriterion" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "coefficient" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "ControlCriterion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ControlPoint" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "criterionId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "coefficient" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "defaultSeverity" "Severity" NOT NULL DEFAULT 'MINEURE',
    "blocking" BOOLEAN NOT NULL DEFAULT false,
    "defaultCorrectiveAction" TEXT,
    "defaultCorrectionDelayHours" INTEGER,
    "photoRequirement" "Requirement" NOT NULL DEFAULT 'OPTIONAL',
    "fileRequirement" "Requirement" NOT NULL DEFAULT 'NONE',
    "voiceRequirement" "Requirement" NOT NULL DEFAULT 'OPTIONAL',
    "visibleInAgentReport" BOOLEAN NOT NULL DEFAULT true,
    "visibleInDirectionReport" BOOLEAN NOT NULL DEFAULT true,
    "visibleInClientReport" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "ControlPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ControlPointResponseOption" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "pointId" TEXT NOT NULL,
    "status" "ControlPointStatus" NOT NULL,
    "label" TEXT NOT NULL,
    "impactLevel" "ControlImpactLevel" NOT NULL DEFAULT 'VERT',
    "severity" "Severity" NOT NULL DEFAULT 'MINEURE',
    "score" INTEGER NOT NULL DEFAULT 100,
    "affectsScore" BOOLEAN NOT NULL DEFAULT true,
    "affectsCompliance" BOOLEAN NOT NULL DEFAULT true,
    "correctiveAction" TEXT,
    "correctionDelayHours" INTEGER,
    "blocking" BOOLEAN NOT NULL DEFAULT false,
    "notificationRequired" BOOLEAN NOT NULL DEFAULT false,
    "visibleInAgentReport" BOOLEAN NOT NULL DEFAULT true,
    "visibleInDirectionReport" BOOLEAN NOT NULL DEFAULT true,
    "visibleInClientReport" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "ControlPointResponseOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ControlSession" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "controlId" TEXT,
    "templateId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "type" "ControlType" NOT NULL DEFAULT 'INOPINE',
    "status" "ControlStatus" NOT NULL DEFAULT 'BROUILLON',
    "selectedCriterionIds" TEXT[],
    "globalScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "complianceLevel" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "ControlSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ControlCriterionResult" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "criterionId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ControlCriterionResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ControlPointResult" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "criterionResultId" TEXT,
    "criterionId" TEXT NOT NULL,
    "pointId" TEXT NOT NULL,
    "responseOptionId" TEXT NOT NULL,
    "status" "ControlPointStatus" NOT NULL,
    "score" INTEGER NOT NULL,
    "impactLevel" "ControlImpactLevel" NOT NULL,
    "severity" "Severity" NOT NULL,
    "blockingTriggered" BOOLEAN NOT NULL DEFAULT false,
    "observation" TEXT,
    "correctiveAction" TEXT,
    "correctionDelayHours" INTEGER,
    "reportVisibility" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ControlPointResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ControlNonConformityLink" (
    "id" TEXT NOT NULL,
    "pointResultId" TEXT NOT NULL,
    "nonConformityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ControlNonConformityLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorrectiveAction" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "sessionId" TEXT,
    "nonConformityId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "severity" "Severity" NOT NULL DEFAULT 'MINEURE',
    "dueAt" TIMESTAMP(3),
    "status" "NonConformityStatus" NOT NULL DEFAULT 'OUVERTE',
    "assignedToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "CorrectiveAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ControlReport" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "type" "ReportType" NOT NULL,
    "title" TEXT NOT NULL,
    "fileUrl" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ControlReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ControlEvidence" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "pointResultId" TEXT,
    "type" "EvidenceType" NOT NULL,
    "fileName" TEXT,
    "fileUrl" TEXT,
    "mimeType" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ControlEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ControlSignature" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "signerName" TEXT,
    "dataUrl" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ControlSignature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ControlItemResult" (
    "id" TEXT NOT NULL,
    "controlId" TEXT NOT NULL,
    "itemDefinitionId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "compliant" BOOLEAN NOT NULL DEFAULT true,
    "comment" TEXT,
    "blockingTriggered" BOOLEAN NOT NULL DEFAULT false,
    "evidenceRequired" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ControlItemResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NonConformity" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "Severity" NOT NULL,
    "status" "NonConformityStatus" NOT NULL DEFAULT 'OUVERTE',
    "itemDefinitionId" TEXT,
    "itemResultId" TEXT,
    "agentId" TEXT,
    "clientId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "controlId" TEXT,
    "dueAt" TIMESTAMP(3),
    "delayLabel" TEXT,
    "internalOnly" BOOLEAN NOT NULL DEFAULT true,
    "validatedAt" TIMESTAMP(3),
    "validatedById" TEXT,
    "closedAt" TIMESTAMP(3),
    "agentSignature" TEXT,
    "controllerSignature" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NonConformity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NonConformityComment" (
    "id" TEXT NOT NULL,
    "nonConformityId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "internal" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NonConformityComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evidence" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "nonConformityId" TEXT,
    "controlItemResultId" TEXT,
    "type" "EvidenceType" NOT NULL,
    "fileName" TEXT,
    "fileUrl" TEXT,
    "mimeType" TEXT,
    "size" INTEGER,
    "voiceTranscription" TEXT,
    "metadata" JSONB,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "scope" "DocumentScope" NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'EN_ATTENTE_VALIDATION',
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "fileUrl" TEXT,
    "fileName" TEXT,
    "mimeType" TEXT,
    "expiresAt" TIMESTAMP(3),
    "validatedAt" TIMESTAMP(3),
    "validatedById" TEXT,
    "agentId" TEXT,
    "clientId" TEXT,
    "siteId" TEXT,
    "visibility" "FileVisibility" NOT NULL DEFAULT 'INTERNE',
    "allowedRoles" "Role"[],
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Qcm" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" "QcmType" NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "coefficient" INTEGER NOT NULL,
    "clientId" TEXT,
    "siteId" TEXT,
    "jobTitle" TEXT,
    "minimumScore" INTEGER NOT NULL DEFAULT 80,
    "maxQuestionsPerItem" INTEGER NOT NULL DEFAULT 10,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Qcm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QcmBank" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" "QcmBankType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "coefficient" INTEGER NOT NULL,
    "qualification" TEXT,
    "clientId" TEXT,
    "siteId" TEXT,
    "questionCountPerSession" INTEGER NOT NULL DEFAULT 10,
    "timePerQuestionSeconds" INTEGER NOT NULL DEFAULT 60,
    "passingScore" INTEGER NOT NULL DEFAULT 80,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "guidanceTitle" TEXT,
    "guidanceBody" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "QcmBank_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QcmQuestion" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "qcmId" TEXT,
    "bankId" TEXT,
    "label" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL DEFAULT 'CHOIX_UNIQUE',
    "category" TEXT,
    "qualification" TEXT,
    "clientId" TEXT,
    "siteId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "points" INTEGER NOT NULL DEFAULT 1,
    "explanation" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "difficulty" "QcmDifficulty",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QcmQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QcmChoice" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "QcmChoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QcmSession" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "qcmId" TEXT,
    "bankId" TEXT,
    "controlId" TEXT,
    "agentId" TEXT NOT NULL,
    "clientId" TEXT,
    "siteId" TEXT,
    "qualification" TEXT,
    "launchTiming" "QcmLaunchTiming",
    "availableAt" TIMESTAMP(3),
    "status" "QcmSessionStatus" NOT NULL DEFAULT 'ENVOYE',
    "score" DOUBLE PRECISION,
    "passed" BOOLEAN,
    "weightedScore" DOUBLE PRECISION,
    "questionIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "currentQuestionIndex" INTEGER NOT NULL DEFAULT 0,
    "resumeAllowed" BOOLEAN NOT NULL DEFAULT false,
    "resumeCount" INTEGER NOT NULL DEFAULT 0,
    "interruptionReason" TEXT,
    "startedAt" TIMESTAMP(3),
    "interruptedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "sentById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QcmSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QcmAnswer" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "selectedChoiceIds" TEXT[],
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "timedOut" BOOLEAN NOT NULL DEFAULT false,
    "timeSpentSeconds" INTEGER,
    "pointsAwarded" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QcmAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QcmResult" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "weightedScore" DOUBLE PRECISION,
    "correctAnswers" INTEGER NOT NULL,
    "totalQuestions" INTEGER NOT NULL,
    "timedOutQuestions" INTEGER NOT NULL DEFAULT 0,
    "interruptionCount" INTEGER NOT NULL DEFAULT 0,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QcmResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QcmInterruption" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "cause" TEXT NOT NULL,
    "interruptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resumedAt" TIMESTAMP(3),
    "authorizedById" TEXT,
    "metadata" JSONB,

    CONSTRAINT "QcmInterruption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QcmSetting" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" "QcmBankType",
    "questionCountPerSession" INTEGER NOT NULL DEFAULT 10,
    "timePerQuestionSeconds" INTEGER NOT NULL DEFAULT 60,
    "passingScore" INTEGER NOT NULL DEFAULT 80,
    "companyCoefficient" INTEGER NOT NULL DEFAULT 1,
    "jobCoefficient" INTEGER NOT NULL DEFAULT 2,
    "clientSiteCoefficient" INTEGER NOT NULL DEFAULT 3,
    "postControlDelayHours" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QcmSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanningRequest" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "controllerId" TEXT,
    "agentId" TEXT,
    "clientId" TEXT,
    "siteId" TEXT,
    "title" TEXT NOT NULL,
    "requestedStart" TIMESTAMP(3) NOT NULL,
    "requestedEnd" TIMESTAMP(3) NOT NULL,
    "preferredTimeWindow" TEXT,
    "status" "PlanningStatus" NOT NULL DEFAULT 'DEMANDE',
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanningRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "userId" TEXT,
    "targetRole" "Role",
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "controlId" TEXT,
    "type" "ReportType" NOT NULL,
    "visibility" "ReportVisibility" NOT NULL,
    "title" TEXT NOT NULL,
    "fileUrl" TEXT,
    "generatedById" TEXT,
    "sentToAgent" BOOLEAN NOT NULL DEFAULT false,
    "sentToManager" BOOLEAN NOT NULL DEFAULT false,
    "sentToClient" BOOLEAN NOT NULL DEFAULT false,
    "requestedByClientAt" TIMESTAMP(3),
    "approvedFullForClientAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreventionMessage" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "title" TEXT NOT NULL,
    "theme" TEXT,
    "body" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "expectedAnswer" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PreventionMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreventionAcknowledgement" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT,
    "answer" TEXT NOT NULL,
    "validated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PreventionAcknowledgement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlySummary" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "metrics" JSONB NOT NULL,
    "analysis" TEXT NOT NULL,
    "recommendations" TEXT NOT NULL,
    "pdfUrl" TEXT,
    "sentToDirectorAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MonthlySummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiInsight" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SIMULE',
    "result" JSONB,
    "disabledReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiInsight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportTemplate" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "name" TEXT NOT NULL,
    "type" "ReportType" NOT NULL,
    "body" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "actorId" TEXT,
    "action" "AuditAction" NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncEvent" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT,
    "deviceId" TEXT NOT NULL,
    "status" "SyncStatus" NOT NULL DEFAULT 'PENDING',
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "operation" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "appliedAt" TIMESTAMP(3),

    CONSTRAINT "SyncEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_slug_key" ON "Company"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Client_companyId_idx" ON "Client"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Client_companyId_reference_key" ON "Client"("companyId", "reference");

-- CreateIndex
CREATE INDEX "Site_companyId_clientId_idx" ON "Site"("companyId", "clientId");

-- CreateIndex
CREATE UNIQUE INDEX "Site_companyId_reference_key" ON "Site"("companyId", "reference");

-- CreateIndex
CREATE UNIQUE INDEX "Agent_userId_key" ON "Agent"("userId");

-- CreateIndex
CREATE INDEX "Agent_companyId_idx" ON "Agent"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Agent_companyId_matricule_key" ON "Agent"("companyId", "matricule");

-- CreateIndex
CREATE INDEX "Assignment_companyId_agentId_siteId_idx" ON "Assignment"("companyId", "agentId", "siteId");

-- CreateIndex
CREATE INDEX "ControlItemDefinition_companyId_category_idx" ON "ControlItemDefinition"("companyId", "category");

-- CreateIndex
CREATE INDEX "Control_companyId_startedAt_idx" ON "Control"("companyId", "startedAt");

-- CreateIndex
CREATE INDEX "Control_companyId_status_idx" ON "Control"("companyId", "status");

-- CreateIndex
CREATE INDEX "ControlTemplate_companyId_active_idx" ON "ControlTemplate"("companyId", "active");

-- CreateIndex
CREATE INDEX "ControlCriterion_companyId_templateId_sortOrder_idx" ON "ControlCriterion"("companyId", "templateId", "sortOrder");

-- CreateIndex
CREATE INDEX "ControlPoint_companyId_criterionId_sortOrder_idx" ON "ControlPoint"("companyId", "criterionId", "sortOrder");

-- CreateIndex
CREATE INDEX "ControlPointResponseOption_companyId_pointId_status_idx" ON "ControlPointResponseOption"("companyId", "pointId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ControlSession_controlId_key" ON "ControlSession"("controlId");

-- CreateIndex
CREATE INDEX "ControlSession_companyId_status_startedAt_idx" ON "ControlSession"("companyId", "status", "startedAt");

-- CreateIndex
CREATE INDEX "ControlSession_agentId_startedAt_idx" ON "ControlSession"("agentId", "startedAt");

-- CreateIndex
CREATE INDEX "ControlSession_siteId_startedAt_idx" ON "ControlSession"("siteId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ControlCriterionResult_sessionId_criterionId_key" ON "ControlCriterionResult"("sessionId", "criterionId");

-- CreateIndex
CREATE INDEX "ControlPointResult_sessionId_status_idx" ON "ControlPointResult"("sessionId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ControlPointResult_sessionId_pointId_key" ON "ControlPointResult"("sessionId", "pointId");

-- CreateIndex
CREATE UNIQUE INDEX "ControlNonConformityLink_pointResultId_key" ON "ControlNonConformityLink"("pointResultId");

-- CreateIndex
CREATE INDEX "CorrectiveAction_companyId_status_dueAt_idx" ON "CorrectiveAction"("companyId", "status", "dueAt");

-- CreateIndex
CREATE INDEX "ControlReport_companyId_type_createdAt_idx" ON "ControlReport"("companyId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "ControlEvidence_companyId_sessionId_idx" ON "ControlEvidence"("companyId", "sessionId");

-- CreateIndex
CREATE INDEX "ControlSignature_companyId_sessionId_idx" ON "ControlSignature"("companyId", "sessionId");

-- CreateIndex
CREATE INDEX "ControlItemResult_controlId_idx" ON "ControlItemResult"("controlId");

-- CreateIndex
CREATE UNIQUE INDEX "NonConformity_itemResultId_key" ON "NonConformity"("itemResultId");

-- CreateIndex
CREATE INDEX "NonConformity_companyId_severity_idx" ON "NonConformity"("companyId", "severity");

-- CreateIndex
CREATE INDEX "NonConformity_companyId_status_idx" ON "NonConformity"("companyId", "status");

-- CreateIndex
CREATE INDEX "Evidence_companyId_idx" ON "Evidence"("companyId");

-- CreateIndex
CREATE INDEX "Document_companyId_status_idx" ON "Document"("companyId", "status");

-- CreateIndex
CREATE INDEX "Document_companyId_scope_idx" ON "Document"("companyId", "scope");

-- CreateIndex
CREATE INDEX "Qcm_companyId_type_idx" ON "Qcm"("companyId", "type");

-- CreateIndex
CREATE INDEX "QcmBank_companyId_type_idx" ON "QcmBank"("companyId", "type");

-- CreateIndex
CREATE INDEX "QcmBank_companyId_qualification_idx" ON "QcmBank"("companyId", "qualification");

-- CreateIndex
CREATE INDEX "QcmBank_companyId_clientId_siteId_idx" ON "QcmBank"("companyId", "clientId", "siteId");

-- CreateIndex
CREATE INDEX "QcmQuestion_companyId_bankId_active_idx" ON "QcmQuestion"("companyId", "bankId", "active");

-- CreateIndex
CREATE INDEX "QcmSession_companyId_status_idx" ON "QcmSession"("companyId", "status");

-- CreateIndex
CREATE INDEX "QcmSession_agentId_idx" ON "QcmSession"("agentId");

-- CreateIndex
CREATE INDEX "QcmSession_companyId_controlId_idx" ON "QcmSession"("companyId", "controlId");

-- CreateIndex
CREATE UNIQUE INDEX "QcmAnswer_sessionId_questionId_key" ON "QcmAnswer"("sessionId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "QcmResult_sessionId_key" ON "QcmResult"("sessionId");

-- CreateIndex
CREATE INDEX "QcmResult_companyId_createdAt_idx" ON "QcmResult"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "QcmInterruption_sessionId_interruptedAt_idx" ON "QcmInterruption"("sessionId", "interruptedAt");

-- CreateIndex
CREATE UNIQUE INDEX "QcmSetting_companyId_type_key" ON "QcmSetting"("companyId", "type");

-- CreateIndex
CREATE INDEX "Notification_companyId_userId_readAt_idx" ON "Notification"("companyId", "userId", "readAt");

-- CreateIndex
CREATE INDEX "Report_companyId_type_idx" ON "Report"("companyId", "type");

-- CreateIndex
CREATE INDEX "PreventionAcknowledgement_userId_createdAt_idx" ON "PreventionAcknowledgement"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlySummary_companyId_month_key" ON "MonthlySummary"("companyId", "month");

-- CreateIndex
CREATE INDEX "AiInsight_companyId_scope_idx" ON "AiInsight"("companyId", "scope");

-- CreateIndex
CREATE INDEX "AuditLog_companyId_createdAt_idx" ON "AuditLog"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "SyncEvent_companyId_status_idx" ON "SyncEvent"("companyId", "status");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Site" ADD CONSTRAINT "Site_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Site" ADD CONSTRAINT "Site_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControlItemDefinition" ADD CONSTRAINT "ControlItemDefinition_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Control" ADD CONSTRAINT "Control_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Control" ADD CONSTRAINT "Control_controllerId_fkey" FOREIGN KEY ("controllerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Control" ADD CONSTRAINT "Control_validatedById_fkey" FOREIGN KEY ("validatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Control" ADD CONSTRAINT "Control_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Control" ADD CONSTRAINT "Control_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Control" ADD CONSTRAINT "Control_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControlTemplate" ADD CONSTRAINT "ControlTemplate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControlCriterion" ADD CONSTRAINT "ControlCriterion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ControlTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControlPoint" ADD CONSTRAINT "ControlPoint_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES "ControlCriterion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControlPointResponseOption" ADD CONSTRAINT "ControlPointResponseOption_pointId_fkey" FOREIGN KEY ("pointId") REFERENCES "ControlPoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControlSession" ADD CONSTRAINT "ControlSession_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControlSession" ADD CONSTRAINT "ControlSession_controlId_fkey" FOREIGN KEY ("controlId") REFERENCES "Control"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControlSession" ADD CONSTRAINT "ControlSession_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ControlTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControlSession" ADD CONSTRAINT "ControlSession_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControlSession" ADD CONSTRAINT "ControlSession_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControlSession" ADD CONSTRAINT "ControlSession_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControlCriterionResult" ADD CONSTRAINT "ControlCriterionResult_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ControlSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControlCriterionResult" ADD CONSTRAINT "ControlCriterionResult_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES "ControlCriterion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControlPointResult" ADD CONSTRAINT "ControlPointResult_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ControlSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControlPointResult" ADD CONSTRAINT "ControlPointResult_criterionResultId_fkey" FOREIGN KEY ("criterionResultId") REFERENCES "ControlCriterionResult"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControlPointResult" ADD CONSTRAINT "ControlPointResult_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES "ControlCriterion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControlPointResult" ADD CONSTRAINT "ControlPointResult_pointId_fkey" FOREIGN KEY ("pointId") REFERENCES "ControlPoint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControlPointResult" ADD CONSTRAINT "ControlPointResult_responseOptionId_fkey" FOREIGN KEY ("responseOptionId") REFERENCES "ControlPointResponseOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControlNonConformityLink" ADD CONSTRAINT "ControlNonConformityLink_pointResultId_fkey" FOREIGN KEY ("pointResultId") REFERENCES "ControlPointResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControlNonConformityLink" ADD CONSTRAINT "ControlNonConformityLink_nonConformityId_fkey" FOREIGN KEY ("nonConformityId") REFERENCES "NonConformity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrectiveAction" ADD CONSTRAINT "CorrectiveAction_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrectiveAction" ADD CONSTRAINT "CorrectiveAction_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ControlSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrectiveAction" ADD CONSTRAINT "CorrectiveAction_nonConformityId_fkey" FOREIGN KEY ("nonConformityId") REFERENCES "NonConformity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControlReport" ADD CONSTRAINT "ControlReport_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControlReport" ADD CONSTRAINT "ControlReport_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ControlSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControlEvidence" ADD CONSTRAINT "ControlEvidence_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControlEvidence" ADD CONSTRAINT "ControlEvidence_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ControlSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControlEvidence" ADD CONSTRAINT "ControlEvidence_pointResultId_fkey" FOREIGN KEY ("pointResultId") REFERENCES "ControlPointResult"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControlSignature" ADD CONSTRAINT "ControlSignature_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControlSignature" ADD CONSTRAINT "ControlSignature_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ControlSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControlItemResult" ADD CONSTRAINT "ControlItemResult_controlId_fkey" FOREIGN KEY ("controlId") REFERENCES "Control"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControlItemResult" ADD CONSTRAINT "ControlItemResult_itemDefinitionId_fkey" FOREIGN KEY ("itemDefinitionId") REFERENCES "ControlItemDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NonConformity" ADD CONSTRAINT "NonConformity_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NonConformity" ADD CONSTRAINT "NonConformity_itemDefinitionId_fkey" FOREIGN KEY ("itemDefinitionId") REFERENCES "ControlItemDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NonConformity" ADD CONSTRAINT "NonConformity_itemResultId_fkey" FOREIGN KEY ("itemResultId") REFERENCES "ControlItemResult"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NonConformity" ADD CONSTRAINT "NonConformity_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NonConformity" ADD CONSTRAINT "NonConformity_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NonConformity" ADD CONSTRAINT "NonConformity_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NonConformity" ADD CONSTRAINT "NonConformity_controlId_fkey" FOREIGN KEY ("controlId") REFERENCES "Control"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NonConformity" ADD CONSTRAINT "NonConformity_validatedById_fkey" FOREIGN KEY ("validatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NonConformityComment" ADD CONSTRAINT "NonConformityComment_nonConformityId_fkey" FOREIGN KEY ("nonConformityId") REFERENCES "NonConformity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_nonConformityId_fkey" FOREIGN KEY ("nonConformityId") REFERENCES "NonConformity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_controlItemResultId_fkey" FOREIGN KEY ("controlItemResultId") REFERENCES "ControlItemResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_validatedById_fkey" FOREIGN KEY ("validatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Qcm" ADD CONSTRAINT "Qcm_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Qcm" ADD CONSTRAINT "Qcm_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Qcm" ADD CONSTRAINT "Qcm_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QcmBank" ADD CONSTRAINT "QcmBank_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QcmBank" ADD CONSTRAINT "QcmBank_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QcmBank" ADD CONSTRAINT "QcmBank_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QcmQuestion" ADD CONSTRAINT "QcmQuestion_qcmId_fkey" FOREIGN KEY ("qcmId") REFERENCES "Qcm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QcmQuestion" ADD CONSTRAINT "QcmQuestion_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "QcmBank"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QcmChoice" ADD CONSTRAINT "QcmChoice_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "QcmQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QcmSession" ADD CONSTRAINT "QcmSession_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QcmSession" ADD CONSTRAINT "QcmSession_qcmId_fkey" FOREIGN KEY ("qcmId") REFERENCES "Qcm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QcmSession" ADD CONSTRAINT "QcmSession_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "QcmBank"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QcmSession" ADD CONSTRAINT "QcmSession_controlId_fkey" FOREIGN KEY ("controlId") REFERENCES "Control"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QcmSession" ADD CONSTRAINT "QcmSession_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QcmSession" ADD CONSTRAINT "QcmSession_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QcmAnswer" ADD CONSTRAINT "QcmAnswer_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "QcmSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QcmAnswer" ADD CONSTRAINT "QcmAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "QcmQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QcmResult" ADD CONSTRAINT "QcmResult_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "QcmSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QcmInterruption" ADD CONSTRAINT "QcmInterruption_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "QcmSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QcmSetting" ADD CONSTRAINT "QcmSetting_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanningRequest" ADD CONSTRAINT "PlanningRequest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanningRequest" ADD CONSTRAINT "PlanningRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanningRequest" ADD CONSTRAINT "PlanningRequest_controllerId_fkey" FOREIGN KEY ("controllerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanningRequest" ADD CONSTRAINT "PlanningRequest_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanningRequest" ADD CONSTRAINT "PlanningRequest_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanningRequest" ADD CONSTRAINT "PlanningRequest_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_controlId_fkey" FOREIGN KEY ("controlId") REFERENCES "Control"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreventionMessage" ADD CONSTRAINT "PreventionMessage_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreventionAcknowledgement" ADD CONSTRAINT "PreventionAcknowledgement_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "PreventionMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreventionAcknowledgement" ADD CONSTRAINT "PreventionAcknowledgement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlySummary" ADD CONSTRAINT "MonthlySummary_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiInsight" ADD CONSTRAINT "AiInsight_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportTemplate" ADD CONSTRAINT "ReportTemplate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncEvent" ADD CONSTRAINT "SyncEvent_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

