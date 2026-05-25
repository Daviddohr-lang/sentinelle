import {
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  ClipboardCheck,
  FileText,
  FolderLock,
  LayoutDashboard,
  MessagesSquare,
  Search,
  Settings,
  ShieldCheck,
  UserRoundCheck,
  UsersRound
} from "lucide-react";

export const APP_NAME = "SENTINELLE";

export const roleLabels = {
  SUPER_ADMIN: "Super administrateur plateforme",
  COMPANY_ADMIN: "Administrateur entreprise",
  QUALITY_CONTROLLER: "Controleur qualite",
  AGENT: "Agent",
  BUSINESS_OWNER: "Chef d'entreprise",
  CLIENT: "Client"
} as const;

export const controlItemDefaults = [
  "Tenue reglementaire",
  "Port des insignes",
  "Proprete de l'agent",
  "Presentation generale",
  "Detention physique de la carte professionnelle",
  "Validite de la carte professionnelle",
  "Poste de travail",
  "Proprete du poste",
  "Main courante",
  "Taches realisees",
  "Ronde accompagnee par le controleur",
  "Assiduite",
  "Vigilance",
  "Etat d'ebriete",
  "Absence au poste",
  "Abandon de poste",
  "Connaissance des consignes",
  "Criteres CNAPS",
  "Code de deontologie",
  "Criteres specifiques client",
  "Criteres specifiques metier"
];

export const blockingItems = [
  "Carte professionnelle perimee",
  "Absence de droit d'exercice",
  "Etat d'ebriete",
  "Agent absent du poste",
  "Agent ayant quitte son poste sans autorisation",
  "Abandon de poste"
];

export const navItems = [
  { href: "/", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/controles", label: "Controles", icon: ClipboardCheck },
  { href: "/non-conformites", label: "Non-conformites", icon: ShieldCheck },
  { href: "/qcm", label: "QCM agents", icon: UserRoundCheck },
  { href: "/documents", label: "Documents", icon: FolderLock },
  { href: "/planning", label: "Planning", icon: CalendarDays },
  { href: "/rapports", label: "Rapports", icon: FileText },
  { href: "/statistiques", label: "Statistiques", icon: BarChart3 },
  { href: "/agents", label: "Agents", icon: UsersRound },
  { href: "/clients-sites", label: "Clients & sites", icon: Building2 },
  { href: "/recherche", label: "Recherche", icon: Search },
  { href: "/admin", label: "Administration", icon: Settings },
  { href: "/parametres", label: "Parametres", icon: Bell },
  { href: "/parametres#messages", label: "Prevention", icon: MessagesSquare }
];

export const demoCredentials = [
  ["Super admin", "superadmin@sentinelle.local", "Sentinelle2026!"],
  ["Admin entreprise", "admin@ops.example", "Sentinelle2026!"],
  ["Controleur qualite", "controleur@ops.example", "Sentinelle2026!"],
  ["Agent", "agent@ops.example", "Sentinelle2026!"],
  ["Chef d'entreprise", "direction@ops.example", "Sentinelle2026!"],
  ["Client", "client@intermarche.example", "Sentinelle2026!"]
];
