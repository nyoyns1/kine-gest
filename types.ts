
export enum UserRole {
  ADMIN = 'Admin',
  THERAPEUTE = 'Thérapeute',
  SECRETAIRE = 'Secrétaire',
  PATIENT = 'Patient'
}

export enum UserPermission {
  VIEW_DASHBOARD = 'Tableau de bord',
  MANAGE_PATIENTS = 'Gestion Patients',
  VIEW_MEDICAL_RECORDS = 'Voir les dossiers médicaux',
  MANAGE_AGENDA = 'Gérer l\'agenda',
  DELETE_APPOINTMENT = 'Supprimer un rendez-vous',
  MANAGE_BILLING = 'Modifier les tarifs / Facturation',
  VIEW_STATS = 'Accéder aux rapports financiers',
  MANAGE_USERS = 'Créer de nouveaux utilisateurs'
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  permissions: UserPermission[];
  lastLogin?: string;
}

export enum PatientCategory {
  MUTUALISTE = 'Mutualiste',
  HORS_MUTUELLE = 'Hors Mutuelle'
}

export type AppointmentType = 'Cabinet' | 'Domicile' | 'Clinique' | 'Visio';

export interface Exercise {
  id: string;
  sessionId: string;
  title: string;
  videoUrl: string;
  therapistComment: string;
  isCompleted: boolean;
  date: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  imageUrl?: string;
  isRead: boolean;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt?: string;
}

export interface Reward {
  id: string;
  name: string;
  description: string;
  pointsRequired: number;
  isUnlocked: boolean;
}

export interface Gamification {
  patientId: string;
  points: number;
  delayCount: number;
  badges: Badge[];
  rewards: Reward[];
}

export interface Patient extends User {
  birthDate: string;
  phone: string;
  cin?: string;
  category: PatientCategory;
  mutuelleName?: string;
  prescribingDoctor: string;
  pathology: string;
  antecedents: string[];
  consentRGPD: boolean;
  createdAt: string;
  totalSessionsPrescribed: number;
  sessionsRemaining: number;
  recoveryRate: number; // 0-100
  satisfactionRate: number; // 0-10
  gamification: Gamification;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  therapistId?: string;
  date: string;
  startTime: string;
  endTime?: string;
  type: AppointmentType;
  status: 'Confirmé' | 'Absent' | 'Annulé' | 'En attente' | 'En retard';
}

export interface SessionNote {
  id: string;
  patientId: string;
  date: string;
  eva: number; // Pain scale 0-10
  content: string;
  objectives: string[];
  progress: number; // 0-100
}

export interface Invoice {
  id: string;
  patientId: string;
  amount: number;
  date: string;
  status: 'Payé' | 'Impayé' | 'En cours';
  sessionsCount: number;
}

export interface Expense {
  id: string;
  label: string;
  amount: number;
  date: string;
  category: string;
  paymentMethod: 'Virement' | 'Carte' | 'Espèces' | 'Chèque';
}

// Bilan Diagnostique Types
export interface MuscleTest {
  muscle: string;
  side: 'Gauche' | 'Droite' | 'Bilatéral';
  force: number; // 0-5 (MRC scale)
  perimeter?: number; // cm (amyotrophie)
  extensibility?: string; // cm or degrees
  contracture: boolean;
}

export interface JointTest {
  joint: string;
  side: 'Gauche' | 'Droite' | 'Bilatéral';
  movement: string;
  value: number; // Degrees (Global/Main)
  activeAmplitude?: number; // Degrees
  passiveAmplitude?: number; // Degrees
  mobilityQuality?: 'Gêne en début de course' | 'Gêne en fin de course' | 'Normal';
  reference?: number; // Standard reference
}

export interface Assessment {
  id: string;
  patientId: string;
  therapistId?: string;
  date: string;
  type: 'Initial' | 'Intermédiaire' | 'Final';
  enabledSections?: {
    pain: boolean;
    muscle: boolean;
    joint: boolean;
    painBodyChart?: boolean;
    painEVA?: boolean;
    painNature?: boolean;
    painFactors?: boolean;
    functional: boolean;
    functionalUpperLimb?: boolean;
    functionalLowerLimb?: boolean;
    functionalTransfert?: boolean;
    functionalTug?: boolean;
    functionalAppui?: boolean;
    functionalVitesse?: boolean;
    functionalEscaliers?: boolean;
    functionalConclusion?: boolean;
    functionalAutonomie?: boolean;
    functionalRisqueChute?: boolean;
    functionalScoreGlobal?: boolean;
  };
  pain: {
    eva: number;
    type: 'Mécanique' | 'Inflammatoire' | 'Neuropathique' | 'Mixte';
    impact: number; // 0-10
    localisation: string[]; // Zones du corps
    frequency: 'Intermittente' | 'Constante';
    aggravatingFactors: string;
    relievingFactors: string;
  };
  muscleTests: MuscleTest[];
  jointTests: JointTest[];
  functional: {
    score: number; // Generic score (e.g. 0-100)
    upperLimb: {
      mainBouche: number; // 0, 1, 2
      mainNuque: number;
      mainDos: number;
      prehension: number;
      boutonnage: number;
      total: number; // /10
    };
    lowerLimb: {
      transfert: 'Facile' | 'Pénible' | 'Aide humaine';
      tugTest: number; // seconds
      appuiUnipodal: {
        droit: boolean;
        gauche: boolean;
      };
      vitesseMarche: number; // m/s
      escaliers: 'Alterné' | 'Un par un' | 'Impossible';
    };
    conclusion: {
      autonomie: 'Indépendant' | 'Surveillance/Aide technique' | 'Dépendant';
      risqueChute: 'Faible' | 'Modéré' | 'Élevé';
    };
  };
}
