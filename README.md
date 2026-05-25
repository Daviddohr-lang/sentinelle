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
tests/                   Tests unitaires RBAC et PDF
```

## Modules inclus

- Multi-entreprise : entreprises, clients, sites, agents, affectations et séparation stricte par `companyId`.
- Sécurité : rôles, permissions, cookies HttpOnly, middleware de protection, journal d’activité, contrôle d’accès documentaire.
- Contrôles qualité : type programmé/inopiné, géolocalisation, items pondérés, signatures tactiles, preuves, notes par item et note globale.
- Non-conformités : gravité mineure/majeure/critique, délais, statuts, validation avant notification, clôture et historique.
- Rapports PDF : rapport complet interne et rapport simplifié client.
- QCM : OPS, ligne métier, client, coefficients 1/2/3, score en pourcentage, historique.
- Documentaire : documents agents, entreprise, clients, sites, consignes, statuts et alertes d’expiration.
- Planning : demandes, planification, plages dates/heures et statuts.
- Espaces par rôle : super admin, admin entreprise, contrôleur, agent, chef d’entreprise, client.
- Dashboards : contrôles, notes, non-conformités, documents, QCM, connexions, exports.
- PWA : manifest, service worker, file locale hors ligne et API `/api/sync`.
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

En cible, ces actions passent par Prisma et PostgreSQL. En developpement, si PostgreSQL ou le moteur Prisma n'est pas disponible, l'application bascule automatiquement sur une persistance locale dans `.sentinelle/local-data.json`. Ce dossier est ignore par Git et sert uniquement a tester l'outil avant de brancher une base hebergee ou Docker.

Pour forcer l'usage exclusif de PostgreSQL en local :

```bash
LOCAL_DATASTORE_DISABLED="true"
```

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
- `NonConformity`, `NonConformityComment`, `Evidence`
- `Document`, `Qcm`, `QcmQuestion`, `QcmChoice`, `QcmSession`
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
npm run db:migrate   # migration Prisma en développement
npm run db:seed      # seed de démonstration
```

## Déploiement

1. Créer une base PostgreSQL managée.
2. Renseigner `DATABASE_URL`, `AUTH_SECRET`, `APP_URL` et `FILE_STORAGE_PATH`.
3. Exécuter `npm run db:migrate` puis `npm run build`.
4. Servir avec `npm run start` derrière HTTPS.
5. Brancher un stockage objet pour les fichiers terrain et documents réglementaires.
6. Activer `AI_FEATURES_ENABLED=true` lorsque le connecteur IA réel est configuré.

## Notes sécurité et conformité

- Les rapports clients simplifiés excluent les sanctions, commentaires RH et non-conformités internes détaillées.
- Les documents agents ne sont visibles que selon rôle, visibilité et autorisation.
- Les non-conformités internes ne sont pas notifiées automatiquement au client.
- Les actions sensibles doivent être journalisées dans `AuditLog`.
- Les suppressions métier doivent préférer l’archivage lorsque la conservation réglementaire est nécessaire.
