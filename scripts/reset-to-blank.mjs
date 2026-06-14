import { PrismaClient } from "@prisma/client";
import { bootstrapMinimal } from "./bootstrap-minimal.mjs";

const confirmation = process.env.CONFIRM_RESET_TO_BLANK;

if (confirmation !== "SENTINELLE_RESET") {
  console.error("Remise a zero refusee. Relance avec CONFIRM_RESET_TO_BLANK=SENTINELLE_RESET.");
  process.exit(1);
}

const prisma = new PrismaClient();

try {
  await prisma.$transaction([
    prisma.controlSignature.deleteMany(),
    prisma.controlEvidence.deleteMany(),
    prisma.controlReport.deleteMany(),
    prisma.correctiveAction.deleteMany(),
    prisma.controlNonConformityLink.deleteMany(),
    prisma.controlPointResult.deleteMany(),
    prisma.controlCriterionResult.deleteMany(),
    prisma.controlSession.deleteMany(),
    prisma.qcmInterruption.deleteMany(),
    prisma.qcmResult.deleteMany(),
    prisma.qcmAnswer.deleteMany(),
    prisma.qcmSession.deleteMany(),
    prisma.qcmChoice.deleteMany(),
    prisma.qcmQuestion.deleteMany(),
    prisma.qcmSetting.deleteMany(),
    prisma.qcmBank.deleteMany(),
    prisma.qcm.deleteMany(),
    prisma.nonConformityComment.deleteMany(),
    prisma.evidence.deleteMany(),
    prisma.nonConformity.deleteMany(),
    prisma.controlItemResult.deleteMany(),
    prisma.report.deleteMany(),
    prisma.control.deleteMany(),
    prisma.document.deleteMany(),
    prisma.assignment.deleteMany(),
    prisma.planningRequest.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.preventionAcknowledgement.deleteMany(),
    prisma.preventionMessage.deleteMany(),
    prisma.monthlySummary.deleteMany(),
    prisma.aiInsight.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.reportTemplate.deleteMany(),
    prisma.syncEvent.deleteMany(),
    prisma.controlItemDefinition.deleteMany(),
    prisma.controlPointResponseOption.deleteMany(),
    prisma.controlPoint.deleteMany(),
    prisma.controlCriterion.deleteMany(),
    prisma.controlTemplate.deleteMany(),
    prisma.agent.deleteMany(),
    prisma.site.deleteMany(),
    prisma.client.deleteMany(),
    prisma.user.deleteMany(),
    prisma.company.deleteMany()
  ]);

  await bootstrapMinimal(prisma);
  console.log("Base SENTINELLE remise a zero en mode vierge.");
} catch (error) {
  console.error("Remise a zero impossible.", error);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}

