# SENTINELLE

SENTINELLE est une plateforme SaaS professionnelle de contrôle qualité, conformité réglementaire, audit terrain et suivi opérationnel pour les entreprises de sécurité privée.

La V1 fournit un socle exploitable : Next.js/TypeScript, Prisma/PostgreSQL, authentification JWT en cookie HttpOnly, RBAC, séparation multi-entreprise, PWA préparée, mode hors ligne, seed de démonstration, API métier, tableaux de bord, QCM, documentaire, non-conformités et génération PDF.

## Architecture

```txt
app/
  (app)/                 Espace connecté et pages métier
  api/                   API REST sécurisée
components/              Shell, formulaires, tableaux, graphiques, PWA
lib/                     Auth, RBAC, Prisma, PDF, données demo, utilitaires
prisma/
  schema.prisma          Modèle relationnel PostgreSQL
  seed.ts                Données de démonstration
public/                  Manifest PWA, service worker, icône
Dockerfile               Image de production Next.js
docker-compose.production.yml
                         App + PostgreSQL + volume fichiers persistant
tests/                   Tests unitaires RBAC et PDF
```

## Modules inclus

- Multi-entreprise : entreprises, clients, sites, agents, affectations et séparation stricte par `companyId`.
- Sécurité : rôles, permissions, cookies HttpOnly, middleware de protection, journal d’activité, contrôle d’accès documentaire.
- Contrôles qualité : bibliothèque dynamique OPS, 12 critères, 80 points, réponses Conforme/Non conforme/Sans objet, critères sélectionnables, score automatique, alertes bloquantes, signatures tactiles et preuves.
- Non-conformités : gravité mineure/majeure/critique, délais, statuts, validation avant notification, clôture et historique.
- Rapports PDF : rapport complet interne, rapport agent, rapport direction et rapport client simplifié.
- QCM : banques de questions entreprise, métier et client/site, tirage aléatoire de 10 questions, chronomètre 60s, interruptions journalisées, coefficients 1/2/3, résultats agent/contrôleur et historique.
- Documentaire : documents agents, entreprise, clients, sites, consignes, statuts et alertes d’expiration.
- Planning : demandes, planification, plages dates/heures et statuts.
- Espaces par rôle : super admin, admin entreprise, contrôleur, agent, chef d’entreprise, client.
- Dashboards : contrôles, notes, non-conformités, documents, QCM, connexions, exports.
- PWA : manifest, service worker, file locale hors ligne et API `/api/sync`.
- Diffusion : page `/diffusion`, installation PWA, Docker de production, stockage fichiers persistant et préflight configuration.
- IA : endpoint `/api/ai/analyze` simulé et désactivable par variable d’environnement.

## Installation

```bash
cp .env.example .env
docker compose up -d
npm install
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

Ouvrir ensuite `http://localhost:3000`.

## Mode exploitable avant deploiement

Les modules `Clients et sites` et `Agents` sont maintenant utilisables en CRUD :

- creation, modification et archivage des clients ;
- creation, modification et archivage des sites ;
- creation, modification et archivage des agents ;
- creation, modification et archivage des affectations agents/clients/sites.
- administration des banques QCM, questions, lancement depuis contrôle, passage agent chronométré et résultats historisés.
- lancement d'un contrôle qualité dynamique depuis `/controles/nouveau`, choix partiel ou complet des critères, panneau automatique de non-conformité, actions correctives et génération des quatre rapports PDF.

En cible, ces actions passent par Prisma et PostgreSQL. En developpement, si PostgreSQL ou le moteur Prisma n'est pas disponible, l'application bascule automatiquement sur une persistance locale dans `.sentinelle/local-data.json`. Ce dossier est ignore par Git et sert uniquement a tester l'outil avant de brancher une base hebergee ou Docker.

Pour forcer l'usage exclusif de PostgreSQL en local :

```bash
LOCAL_DATASTORE_DISABLED="true"
```

## Installation PWA

SENTINELLE peut être installée comme application sur ordinateur, tablette ou smartphone depuis la rubrique `Diffusion`.

En local, ouvrir `http://localhost:3000/diffusion` avec Chrome, Edge ou Safari. Le bouton `Installer SENTINELLE` lance l'installation lorsque le navigateur expose l'événement PWA. Si le bouton d'installation natif du navigateur apparaît dans la barre d'adresse, il peut aussi être utilisé.

Le service worker est actif en production et sur `localhost` pour permettre les tests d'installation. Les routes API ne sont pas mises en cache afin d'éviter d'afficher des données métier périmées.

## Prévisualisation sans dépendances

Si `npm` n'est pas encore disponible sur la machine, un serveur de démonstration minimal permet de vérifier l'accès local :

```bash
node server.js
```

Cette prévisualisation sert uniquement à confirmer l'interface et quelques parcours simulés. Elle ne remplace pas l'application Next.js complète avec Prisma, PostgreSQL et les API métier.

## Comptes de démonstration

Mot de passe commun : `Sentinelle2026!`

| Rôle | Email |
| --- | --- |
| Super administrateur | `superadmin@sentinelle.local` |
| Administrateur entreprise | `admin@ops.example` |
| Contrôleur qualité | `controleur@ops.example` |
| Agent | `agent@ops.example` |
| Chef d’entreprise | `direction@ops.example` |
| Client | `client@intermarche.example` |

## Base de données

Le modèle Prisma couvre notamment :

- `Company`, `User`, `Agent`, `Client`, `Site`, `Assignment`
- `Control`, `ControlItemDefinition`, `ControlItemResult`
- `ControlTemplate`, `ControlCriterion`, `ControlPoint`, `ControlPointResponseOption`, `ControlSession`, `ControlCriterionResult`, `ControlPointResult`, `ControlNonConformityLink`, `CorrectiveAction`, `ControlReport`, `ControlEvidence`, `ControlSignature`
- `NonConformity`, `NonConformityComment`, `Evidence`
- `Document`, `Qcm`, `QcmBank`, `QcmQuestion`, `QcmChoice`, `QcmSession`, `QcmAnswer`, `QcmResult`, `QcmInterruption`, `QcmSetting`
- `PlanningRequest`, `Notification`, `Report`
- `PreventionMessage`, `MonthlySummary`, `AiInsight`, `AuditLog`, `SyncEvent`

La séparation tenant est portée par `companyId`. Le super administrateur peut traverser les entreprises ; les autres rôles sont filtrés par leur entreprise.

## Commandes utiles

```bash
npm run dev          # lancement local
npm run build        # génération Prisma + build Next.js
npm run start        # lancement production
npm run typecheck    # vérification TypeScript
npm run lint         # lint
npm run test         # tests unitaires
npm run preflight:prod # verification minimale avant diffusion
npm run db:migrate   # migration Prisma en développement
npm run db:seed      # seed de démonstration
```

## Déploiement

### Déploiement Docker

```bash
cp .env.production.example .env.production
# Modifier les secrets, APP_URL et POSTGRES_PASSWORD
docker compose -f docker-compose.production.yml up -d --build
```

Le compose de production lance :

- l'application Next.js ;
- PostgreSQL 16 ;
- un volume `sentinelle-files` monté sur `/app/storage` pour les documents, preuves terrain, signatures et rapports ;
- `LOCAL_DATASTORE_DISABLED=true` pour empêcher la persistance locale de démonstration.

### Déploiement managé

1. Créer une base PostgreSQL managée.
2. Créer un stockage fichiers persistant et renseigner `FILE_STORAGE_PATH`.
3. Renseigner `DATABASE_URL`, `AUTH_SECRET`, `APP_URL` et `LOCAL_DATASTORE_DISABLED=true`.
4. Pour les invitations email, renseigner `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` et `SMTP_FROM`.
   Avec iCloud, utiliser un mot de passe d'application Apple, jamais le mot de passe principal du compte.
5. Exécuter `npm run preflight:prod`, `npm run db:migrate`, puis `npm run build`.
6. Servir avec `npm run start` derrière HTTPS.
7. Activer `AI_FEATURES_ENABLED=true` lorsque le connecteur IA réel est configuré.

La production ne doit pas utiliser `.sentinelle/local-data.json`. Ce fichier reste uniquement un filet de sécurité de développement.

## Notes sécurité et conformité

- Les rapports clients simplifiés excluent les sanctions, commentaires RH et non-conformités internes détaillées.
- Les documents agents ne sont visibles que selon rôle, visibilité et autorisation.
- Les non-conformités internes ne sont pas notifiées automatiquement au client.
- Les actions sensibles doivent être journalisées dans `AuditLog`.
- Les suppressions métier doivent préférer l’archivage lorsque la conservation réglementaire est nécessaire.
