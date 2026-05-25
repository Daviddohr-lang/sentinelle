import { PrismaClient, Role } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();
const password = "Sentinelle2026!";

async function main() {
  const passwordHash = await hash(password, 12);

  await prisma.$transaction([
    prisma.qcmAnswer.deleteMany(),
    prisma.qcmSession.deleteMany(),
    prisma.qcmChoice.deleteMany(),
    prisma.qcmQuestion.deleteMany(),
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
    prisma.agent.deleteMany(),
    prisma.site.deleteMany(),
    prisma.client.deleteMany(),
    prisma.user.deleteMany(),
    prisma.company.deleteMany()
  ]);

  const company = await prisma.company.create({
    data: {
      id: "cmp_ops_nord",
      name: "OPS Securite Nord",
      slug: "ops-securite-nord",
      siret: "81234567800029",
      cnapsAuthorizationNumber: "AUT-080-2026-0001",
      address: "12 rue de la Conformite, 80000 Amiens",
      settings: {
        darkModeDefault: false,
        documentExpiryAlertMonths: 4,
        qcmPassingScore: 80,
        dataRetentionMonths: 60
      }
    }
  });

  const superAdmin = await prisma.user.create({
    data: {
      id: "usr_super_admin",
      email: "superadmin@sentinelle.local",
      passwordHash,
      firstName: "Nora",
      lastName: "Plateforme",
      role: "SUPER_ADMIN"
    }
  });

  const admin = await prisma.user.create({
    data: {
      id: "usr_admin",
      companyId: company.id,
      email: "admin@ops.example",
      passwordHash,
      firstName: "Claire",
      lastName: "Martin",
      role: "COMPANY_ADMIN"
    }
  });

  const controller = await prisma.user.create({
    data: {
      id: "usr_controller",
      companyId: company.id,
      email: "controleur@ops.example",
      passwordHash,
      firstName: "Yanis",
      lastName: "Benali",
      role: "QUALITY_CONTROLLER"
    }
  });

  const agentUser = await prisma.user.create({
    data: {
      id: "usr_agent",
      companyId: company.id,
      email: "agent@ops.example",
      passwordHash,
      firstName: "Lucas",
      lastName: "Morel",
      role: "AGENT"
    }
  });

  const owner = await prisma.user.create({
    data: {
      id: "usr_owner",
      companyId: company.id,
      email: "direction@ops.example",
      passwordHash,
      firstName: "Sophie",
      lastName: "Dumont",
      role: "BUSINESS_OWNER"
    }
  });

  await prisma.user.create({
    data: {
      id: "usr_client",
      companyId: company.id,
      email: "client@intermarche.example",
      passwordHash,
      firstName: "Hugo",
      lastName: "Lefevre",
      role: "CLIENT"
    }
  });

  const inter = await prisma.client.create({
    data: {
      id: "cli_inter",
      companyId: company.id,
      name: "Intermarche Glisy",
      reference: "CLIENT-INTERMARCHE-GLISY",
      contactName: "Hugo Lefevre",
      contactEmail: "client@intermarche.example",
      address: "Centre commercial, 80440 Glisy"
    }
  });

  const logiparc = await prisma.client.create({
    data: {
      id: "cli_log",
      companyId: company.id,
      name: "Logiparc Amiens",
      reference: "CLIENT-LOGIPARC",
      contactName: "Maya Colin",
      contactEmail: "exploitation@logiparc.example",
      address: "Zone industrielle Nord, 80080 Amiens"
    }
  });

  const glisy = await prisma.site.create({
    data: {
      id: "site_glisy",
      companyId: company.id,
      clientId: inter.id,
      name: "Intermarche Glisy - Galerie",
      reference: "SITE-GLISY-GALERIE",
      address: "Avenue de la Defense Passive, 80440 Glisy",
      latitude: 49.871,
      longitude: 2.394,
      riskLevel: "Commerce recevant du public"
    }
  });

  const entrepot = await prisma.site.create({
    data: {
      id: "site_logiparc",
      companyId: company.id,
      clientId: logiparc.id,
      name: "Logiparc Amiens - Entrepot A",
      reference: "SITE-LOG-A",
      address: "18 rue des Transporteurs, 80080 Amiens",
      latitude: 49.916,
      longitude: 2.281,
      riskLevel: "Logistique nuit"
    }
  });

  const lucas = await prisma.agent.create({
    data: {
      id: "agt_lucas",
      companyId: company.id,
      userId: agentUser.id,
      matricule: "OPS-0142",
      firstName: "Lucas",
      lastName: "Morel",
      email: "agent@ops.example",
      phone: "06 10 20 30 40",
      professionalCardNumber: "CAR-2024-99012",
      professionalCardExpiresAt: new Date("2026-09-30"),
      sstExpiresAt: new Date("2026-12-18"),
      qualityScore: 86
    }
  });

  const amina = await prisma.agent.create({
    data: {
      id: "agt_amina",
      companyId: company.id,
      matricule: "OPS-0177",
      firstName: "Amina",
      lastName: "Roux",
      email: "amina.roux@ops.example",
      phone: "06 22 11 55 18",
      professionalCardNumber: "CAR-2023-77340",
      professionalCardExpiresAt: new Date("2026-07-12"),
      sstExpiresAt: new Date("2026-08-02"),
      ssiapExpiresAt: new Date("2027-02-12"),
      qualityScore: 91
    }
  });

  const marc = await prisma.agent.create({
    data: {
      id: "agt_marc",
      companyId: company.id,
      matricule: "OPS-0098",
      firstName: "Marc",
      lastName: "Vidal",
      email: "marc.vidal@ops.example",
      phone: "06 38 22 90 01",
      professionalCardNumber: "CAR-2022-10450",
      professionalCardExpiresAt: new Date("2026-06-20"),
      sstExpiresAt: new Date("2026-05-31"),
      qualityScore: 73
    }
  });

  await prisma.assignment.createMany({
    data: [
      {
        companyId: company.id,
        agentId: lucas.id,
        clientId: inter.id,
        siteId: glisy.id,
        jobTitle: "APS",
        startsAt: new Date("2026-01-01")
      },
      {
        companyId: company.id,
        agentId: amina.id,
        clientId: logiparc.id,
        siteId: entrepot.id,
        jobTitle: "SSIAP 1",
        startsAt: new Date("2026-03-15")
      }
    ]
  });

  const itemTenue = await prisma.controlItemDefinition.create({
    data: {
      id: "item_tenue",
      companyId: company.id,
      label: "Tenue reglementaire",
      category: "Image et presentation",
      coefficient: 1,
      severity: "MINEURE",
      color: "#f59e0b",
      correctionDelayHours: 48,
      recommendedAction: "Rappel de la dotation et verification au prochain controle",
      clientVisible: true
    }
  });

  const itemCarte = await prisma.controlItemDefinition.create({
    data: {
      id: "item_carte",
      companyId: company.id,
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
      photoRequirement: "REQUIRED",
      fileRequirement: "REQUIRED"
    }
  });

  const itemMainCourante = await prisma.controlItemDefinition.create({
    data: {
      id: "item_main_courante",
      companyId: company.id,
      label: "Main courante",
      category: "Execution de mission",
      coefficient: 2,
      severity: "MAJEURE",
      color: "#dc2626",
      correctionDelayHours: 24,
      recommendedAction: "Reprise de consigne et controle de tracabilite",
      autoNotify: true,
      clientVisible: true,
      fileRequirement: "OPTIONAL"
    }
  });

  const itemDeonto = await prisma.controlItemDefinition.create({
    data: {
      id: "item_deonto",
      companyId: company.id,
      label: "Code de deontologie",
      category: "Comportement",
      coefficient: 2,
      severity: "MAJEURE",
      color: "#dc2626",
      correctionDelayHours: 48,
      recommendedAction: "Brief comportemental et rappel des obligations",
      clientVisible: false
    }
  });

  const control = await prisma.control.create({
    data: {
      id: "ctrl_2026_05_21",
      companyId: company.id,
      type: "INOPINE",
      status: "VALIDE",
      startedAt: new Date("2026-05-21T21:15:00.000Z"),
      completedAt: new Date("2026-05-21T22:05:00.000Z"),
      controllerId: controller.id,
      agentId: lucas.id,
      clientId: inter.id,
      siteId: glisy.id,
      latitude: 49.871,
      longitude: 2.394,
      detectedAddress: "Avenue de la Defense Passive, 80440 Glisy",
      globalScore: 88,
      observations: "Agent present, poste tenu, une consigne a faire relire.",
      validatedAt: new Date("2026-05-21T22:08:00.000Z"),
      validatedById: admin.id,
      itemResults: {
        create: [
          { itemDefinitionId: itemTenue.id, score: 92, compliant: true },
          { itemDefinitionId: itemCarte.id, score: 100, compliant: true },
          { itemDefinitionId: itemMainCourante.id, score: 78, compliant: false, comment: "Rondes insuffisamment detaillees." },
          { itemDefinitionId: itemDeonto.id, score: 85, compliant: true }
        ]
      }
    },
    include: { itemResults: true }
  });

  await prisma.nonConformity.create({
    data: {
      id: "nc_main_courante",
      companyId: company.id,
      title: "Main courante incomplete",
      description: "Les rondes de 20h et 21h n'ont pas ete tracees avec le niveau de detail attendu.",
      severity: "MAJEURE",
      status: "EN_COURS",
      itemDefinitionId: itemMainCourante.id,
      itemResultId: control.itemResults.find((item) => item.itemDefinitionId === itemMainCourante.id)?.id,
      agentId: lucas.id,
      clientId: inter.id,
      siteId: glisy.id,
      controlId: control.id,
      dueAt: new Date("2026-05-25T18:00:00.000Z"),
      delayLabel: "48h",
      internalOnly: false,
      validatedAt: new Date("2026-05-21T22:10:00.000Z"),
      validatedById: admin.id,
      comments: {
        create: {
          authorName: "Claire Martin",
          body: "Action de reprise demandee au chef de poste.",
          internal: true
        }
      }
    }
  });

  await prisma.control.create({
    data: {
      id: "ctrl_2026_05_18",
      companyId: company.id,
      type: "PROGRAMME",
      status: "EN_ATTENTE_QCM",
      startedAt: new Date("2026-05-18T07:30:00.000Z"),
      controllerId: controller.id,
      agentId: marc.id,
      clientId: logiparc.id,
      siteId: entrepot.id,
      detectedAddress: "18 rue des Transporteurs, 80080 Amiens",
      globalScore: 72,
      observations: "QCM client envoye. Document SST a renouveler."
    }
  });

  await prisma.document.createMany({
    data: [
      {
        companyId: company.id,
        scope: "AGENT",
        status: "VALIDE",
        title: "Carte professionnelle Lucas Morel",
        category: "Carte professionnelle",
        expiresAt: new Date("2026-09-30"),
        agentId: lucas.id,
        visibility: "INTERNE",
        allowedRoles: [Role.COMPANY_ADMIN, Role.QUALITY_CONTROLLER, Role.BUSINESS_OWNER],
        tags: ["CNAPS", "agent"]
      },
      {
        companyId: company.id,
        scope: "AGENT",
        status: "EXPIRANT_BIENTOT",
        title: "SST Marc Vidal",
        category: "SST",
        expiresAt: new Date("2026-05-31"),
        agentId: marc.id,
        visibility: "INTERNE",
        allowedRoles: [Role.COMPANY_ADMIN, Role.QUALITY_CONTROLLER],
        tags: ["SST", "alerte"]
      },
      {
        companyId: company.id,
        scope: "CONSIGNE_SITE",
        status: "VALIDE",
        title: "Consignes site - Galerie Glisy",
        category: "Consignes site",
        siteId: glisy.id,
        clientId: inter.id,
        visibility: "CLIENT_AUTORISE",
        allowedRoles: [Role.AGENT, Role.CLIENT, Role.COMPANY_ADMIN, Role.QUALITY_CONTROLLER],
        tags: ["site", "consignes"]
      }
    ]
  });

  const qcmOps = await prisma.qcm.create({
    data: {
      id: "qcm_ops",
      companyId: company.id,
      type: "OPS",
      title: "QCM OPS - Qualite et comportement",
      category: "OPS",
      coefficient: 1,
      questions: {
        create: [
          {
            label: "Quel document trace les evenements du poste ?",
            type: "CHOIX_UNIQUE",
            choices: {
              create: [
                { label: "La main courante", isCorrect: true },
                { label: "Le planning commercial", isCorrect: false },
                { label: "Le badge visiteur", isCorrect: false }
              ]
            }
          },
          {
            label: "Quelles actions sont attendues en cas d'incident ?",
            type: "CHOIX_MULTIPLE",
            choices: {
              create: [
                { label: "Alerter selon les consignes", isCorrect: true },
                { label: "Tracer l'evenement", isCorrect: true },
                { label: "Ignorer si le site est calme", isCorrect: false }
              ]
            }
          }
        ]
      }
    }
  });

  await prisma.qcm.create({
    data: {
      id: "qcm_aps",
      companyId: company.id,
      type: "LIGNE_METIER",
      title: "QCM ligne metier APS",
      category: "APS",
      coefficient: 2,
      jobTitle: "APS"
    }
  });

  await prisma.qcm.create({
    data: {
      id: "qcm_client_glisy",
      companyId: company.id,
      type: "CLIENT",
      title: "QCM client - Intermarche Glisy",
      category: "CLIENT-INTERMARCHE-GLISY",
      coefficient: 3,
      clientId: inter.id,
      siteId: glisy.id
    }
  });

  await prisma.qcmSession.create({
    data: {
      id: "session_lucas_ops",
      companyId: company.id,
      qcmId: qcmOps.id,
      controlId: control.id,
      agentId: lucas.id,
      status: "TERMINE",
      score: 88,
      passed: true,
      startedAt: new Date("2026-05-21T22:12:00.000Z"),
      completedAt: new Date("2026-05-21T22:22:00.000Z"),
      sentById: controller.id
    }
  });

  await prisma.planningRequest.createMany({
    data: [
      {
        companyId: company.id,
        requesterId: owner.id,
        controllerId: controller.id,
        agentId: lucas.id,
        clientId: inter.id,
        siteId: glisy.id,
        title: "Controle inopine galerie Glisy",
        requestedStart: new Date("2026-06-05T18:00:00.000Z"),
        requestedEnd: new Date("2026-06-12T00:00:00.000Z"),
        preferredTimeWindow: "20h - 2h",
        status: "PLANIFIE"
      },
      {
        companyId: company.id,
        requesterId: owner.id,
        agentId: amina.id,
        clientId: logiparc.id,
        siteId: entrepot.id,
        title: "Controle chef de poste entrepot A",
        requestedStart: new Date("2026-06-10T06:00:00.000Z"),
        requestedEnd: new Date("2026-06-10T14:00:00.000Z"),
        preferredTimeWindow: "Matin",
        status: "DEMANDE"
      }
    ]
  });

  await prisma.report.createMany({
    data: [
      {
        companyId: company.id,
        controlId: control.id,
        type: "COMPLET_INTERNE",
        visibility: "DIRECTION",
        title: "Rapport complet interne - Controle du 21/05",
        generatedById: controller.id,
        sentToAgent: true,
        sentToManager: true
      },
      {
        companyId: company.id,
        controlId: control.id,
        type: "SIMPLIFIE_CLIENT",
        visibility: "CLIENT_SIMPLIFIE",
        title: "Rapport simplifie client - Glisy",
        generatedById: controller.id,
        sentToClient: true
      }
    ]
  });

  await prisma.preventionMessage.create({
    data: {
      companyId: company.id,
      title: "Prevention du jour",
      body: "La vigilance active commence par une posture visible, une main courante tenue en temps reel et une alerte remontee sans delai.",
      question: "Quel document doit tracer les evenements importants du poste ?",
      expectedAnswer: "main courante"
    }
  });

  await prisma.notification.createMany({
    data: [
      {
        companyId: company.id,
        userId: admin.id,
        type: "DOCUMENT_EXPIRANT",
        title: "SST expirant bientot",
        message: "Le document SST de Marc Vidal expire dans moins de 10 jours."
      },
      {
        companyId: company.id,
        userId: agentUser.id,
        type: "QCM_A_REALISER",
        title: "QCM client a realiser",
        message: "Un QCM client est disponible pour votre controle Logiparc."
      },
      {
        companyId: company.id,
        targetRole: "BUSINESS_OWNER",
        type: "RAPPORT_DISPONIBLE",
        title: "Rapport simplifie disponible",
        message: "Le rapport client du controle Glisy est disponible.",
        readAt: new Date("2026-05-22T09:10:00.000Z")
      }
    ]
  });

  await prisma.monthlySummary.create({
    data: {
      companyId: company.id,
      month: new Date("2026-05-01"),
      metrics: {
        controls: 61,
        averageScore: 86,
        nonConformitiesOpen: 9,
        documentsExpiring: 12,
        qcmCompleted: 44
      },
      analysis: "La qualite progresse de 7 points depuis janvier, avec une recurrence sur la tracabilite main courante.",
      recommendations: "Renforcer les briefings de prise de poste et prioriser les sites logistiques de nuit."
    }
  });

  await prisma.auditLog.create({
    data: {
      companyId: company.id,
      actorId: superAdmin.id,
      action: "CREATE",
      entity: "Seed",
      entityId: company.id,
      after: { demo: true, version: "0.1.0" }
    }
  });

  console.log(`Seed SENTINELLE termine. Mot de passe demo: ${password}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
