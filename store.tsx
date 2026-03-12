
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Patient, Appointment, PatientCategory, AppointmentType, Expense, Invoice, Assessment, SessionNote, User, UserRole, UserPermission, Exercise, Message, Badge, Reward, Gamification } from './types';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning';
  date: string;
  read: boolean;
}

interface AppContextType {
  patients: Patient[];
  appointments: Appointment[];
  expenses: Expense[];
  invoices: Invoice[];
  assessments: Assessment[];
  sessionNotes: SessionNote[];
  notifications: Notification[];
  users: User[];
  currentUser: User | null;
  login: (email: string, password?: string) => boolean;
  logout: () => void;
  registerPatient: (userData: Omit<User, 'id' | 'role' | 'isActive' | 'permissions'>) => void;
  createAccountForExistingPatient: (patientId: string) => void;
  addEmployee: (userData: Omit<User, 'id' | 'isActive' | 'permissions'>) => void;
  updateUserRole: (userId: string, role: UserRole) => void;
  updateUserPermissions: (userId: string, permissions: UserPermission[]) => void;
  toggleUserStatus: (userId: string) => void;
  deleteAppointment: (id: string) => void;
  updateAppointmentStatus: (id: string, status: Appointment['status']) => void;
  cancelAppointment: (id: string) => void;
  addPatient: (patient: Omit<Patient, 'id' | 'createdAt' | 'role' | 'isActive' | 'permissions'>, createAccount?: boolean) => Patient;
  addAppointment: (appointment: Omit<Appointment, 'id' | 'status'>) => void;
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  addInvoice: (invoice: Omit<Invoice, 'id'>) => void;
  updateInvoiceStatus: (id: string, status: Invoice['status']) => void;
  sendInvoiceReminders: () => void;
  addAssessment: (assessment: Omit<Assessment, 'id'>) => void;
  deleteAssessment: (id: string) => void;
  addSessionNote: (note: Omit<SessionNote, 'id'>) => void;
  deleteSessionNote: (id: string) => void;
  billSession: (appointmentId: string, amount: number) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'date' | 'read'>) => void;
  markNotificationAsRead: (id: string) => void;
  clearNotifications: () => void;
  showToast: (message: string) => void;
  toast: string | null;
  isPatientModalOpen: boolean;
  setPatientModalOpen: (open: boolean) => void;
  isAppointmentModalOpen: boolean;
  setAppointmentModalOpen: (open: boolean) => void;
  selectedPatientId: string | null;
  setSelectedPatientId: (id: string | null) => void;
  prefilledDate: string;
  setPrefilledDate: (date: string) => void;
  prefilledTime: string;
  setPrefilledTime: (time: string) => void;
  exercises: Exercise[];
  messages: Message[];
  completeExercise: (exerciseId: string) => void;
  sendMessage: (content: string, receiverId: string, imageUrl?: string) => void;
  awardPoints: (patientId: string, amount: number, reason: string) => void;
  reportPatientDelay: (patientId: string) => void;
  updatePatient: (id: string, updates: Partial<Patient>) => void;
  resetPassword: (userId: string, newPassword?: string) => void;
  isLoaded: boolean;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const MOCK_DATA = {
  patients: [
    {
      id: 'u4',
      firstName: 'Alice',
      lastName: 'Dubois',
      birthDate: '1985-06-15',
      gender: 'Femme',
      phone: '06 12 34 56 78',
      email: 'alice.dubois@mail.com',
      role: UserRole.PATIENT,
      isActive: true,
      permissions: [UserPermission.VIEW_DASHBOARD, UserPermission.MANAGE_AGENDA],
      category: PatientCategory.MUTUALISTE,
      mutuelleName: 'Harmonie Mutuelle',
      prescribingDoctor: 'Dr. Martin',
      pathology: 'Entorse cheville droite',
      antecedents: ['Asthme'],
      consentRGPD: true,
      createdAt: '2023-10-01',
      totalSessionsPrescribed: 20,
      sessionsRemaining: 12,
      recoveryRate: 65,
      satisfactionRate: 9,
      gamification: {
        patientId: 'u4',
        points: 150,
        delayCount: 0,
        badges: [
          { id: 'b1', name: '7 jours consécutifs', description: 'Exercices faits pendant une semaine', icon: '🔥', unlockedAt: '2024-05-10' }
        ],
        rewards: [
          { id: 'r1', name: 'Pressothérapie offerte', description: 'Une séance de pressothérapie gratuite', pointsRequired: 500, isUnlocked: false },
          { id: 'r2', name: 'Bilan gratuit', description: 'Un bilan complet offert', pointsRequired: 1000, isUnlocked: false }
        ]
      }
    },
    {
      id: 'u5',
      firstName: 'Marc',
      lastName: 'Lefebvre',
      birthDate: '1970-03-22',
      gender: 'Homme',
      phone: '06 98 76 54 32',
      email: 'marc.lefe@mail.com',
      role: UserRole.PATIENT,
      isActive: true,
      permissions: [UserPermission.VIEW_DASHBOARD, UserPermission.MANAGE_AGENDA],
      category: PatientCategory.HORS_MUTUELLE,
      prescribingDoctor: 'Dr. Petit',
      pathology: 'Lombalgie chronique',
      antecedents: [],
      consentRGPD: true,
      createdAt: '2023-11-15',
      totalSessionsPrescribed: 15,
      sessionsRemaining: 5,
      recoveryRate: 80,
      satisfactionRate: 10,
      gamification: {
        patientId: 'u5',
        points: 450,
        delayCount: 1,
        badges: [],
        rewards: []
      }
    },
    {
      id: 'u6',
      firstName: 'Sophie',
      lastName: 'Moreau',
      birthDate: '1992-11-05',
      gender: 'Femme',
      phone: '06 55 44 33 22',
      email: 'sophie.m@mail.com',
      role: UserRole.PATIENT,
      isActive: true,
      permissions: [UserPermission.VIEW_DASHBOARD, UserPermission.MANAGE_AGENDA],
      category: PatientCategory.MUTUALISTE,
      prescribingDoctor: 'Dr. Roux',
      pathology: 'Rééducation LCA',
      antecedents: [],
      consentRGPD: true,
      createdAt: '2024-01-10',
      totalSessionsPrescribed: 30,
      sessionsRemaining: 25,
      recoveryRate: 30,
      satisfactionRate: 8,
      gamification: {
        patientId: 'u6',
        points: 80,
        delayCount: 0,
        badges: [],
        rewards: []
      }
    },
    {
      id: 'u7',
      firstName: 'Julien',
      lastName: 'Bernard',
      birthDate: '1988-08-30',
      gender: 'Homme',
      phone: '06 11 22 33 44',
      email: 'j.bernard@mail.com',
      role: UserRole.PATIENT,
      isActive: true,
      permissions: [UserPermission.VIEW_DASHBOARD, UserPermission.MANAGE_AGENDA],
      category: PatientCategory.MUTUALISTE,
      prescribingDoctor: 'Dr. Martin',
      pathology: 'Lombalgie chronique',
      antecedents: [],
      consentRGPD: true,
      createdAt: '2024-02-20',
      totalSessionsPrescribed: 10,
      sessionsRemaining: 2,
      recoveryRate: 95,
      satisfactionRate: 10,
      gamification: {
        patientId: 'u7',
        points: 600,
        delayCount: 0,
        badges: [],
        rewards: []
      }
    }
  ],
  exercises: [
    { id: 'ex1', sessionId: '1', title: 'Renforcement Cheville', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', therapistComment: 'Faire 3 séries de 15 répétitions doucement.', isCompleted: false, date: '2025-05-12' },
    { id: 'ex2', sessionId: '1', title: 'Équilibre sur un pied', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', therapistComment: 'Tenir 30 secondes sur chaque pied.', isCompleted: true, date: '2025-05-12' }
  ],
  messages: [
    { id: 'm1', senderId: 'u2', receiverId: 'u4', content: 'Bonjour Alice, comment se passe vos exercices ?', timestamp: new Date().toISOString(), isRead: true }
  ],
  appointments: [
    { id: '1', patientId: 'u4', patientName: 'Alice Dubois', therapistId: 'u2', date: '2025-05-12', startTime: '09:00', endTime: '09:30', type: 'Cabinet', status: 'Confirmé' },
    { id: '2', patientId: 'u5', patientName: 'Marc Lefebvre', therapistId: 'u2', date: '2025-05-12', startTime: '10:00', endTime: '10:30', type: 'Cabinet', status: 'Confirmé' },
    { id: '3', patientId: 'u6', patientName: 'Sophie Moreau', therapistId: 'u1', date: '2025-05-12', startTime: '11:00', endTime: '11:30', type: 'Cabinet', status: 'Confirmé' },
    { id: '4', patientId: 'u7', patientName: 'Julien Bernard', therapistId: 'u1', date: '2025-05-12', startTime: '14:00', endTime: '14:30', type: 'Cabinet', status: 'Confirmé' },
    { id: '5', patientId: 'u4', patientName: 'Alice Dubois', therapistId: 'u2', date: '2025-05-13', startTime: '09:00', endTime: '09:30', type: 'Cabinet', status: 'Confirmé' },
  ],
  expenses: [
    { id: 'e1', label: 'Loyer Cabinet', amount: 8500, date: '2024-05-01', category: 'Loyer', paymentMethod: 'Virement' },
    { id: 'e2', label: 'Achat Table de Massage', amount: 4200, date: '2024-05-05', category: 'Matériel', paymentMethod: 'Carte' },
    { id: 'e3', label: 'Logiciel KinéGest Pro', amount: 450, date: '2024-05-10', category: 'Logiciels', paymentMethod: 'Carte' },
    { id: 'e4', label: 'Consommables (Gels, Draps)', amount: 1200, date: '2024-05-15', category: 'Consommables', paymentMethod: 'Espèces' },
    { id: 'e5', label: 'Loyer Cabinet', amount: 8500, date: '2024-04-01', category: 'Loyer', paymentMethod: 'Virement' },
    { id: 'e6', label: 'Electricité', amount: 800, date: '2024-04-10', category: 'Charges', paymentMethod: 'Virement' },
  ],
  invoices: [
    { id: 'FAC-2024-001', patientId: 'u4', amount: 3200.00, status: 'Payé', date: '2024-01-15', sessionsCount: 8 },
    { id: 'FAC-2024-002', patientId: 'u4', amount: 1500.00, status: 'Impayé', date: '2024-05-10', sessionsCount: 4 },
  ],
  sessionNotes: [
    { id: '101', patientId: 'u4', date: '2024-01-05', eva: 7, content: 'Douleur intense au réveil. Oedème persistant. Travail circulatoire et drainage.', objectives: ['Diminuer oedème'], progress: 10 },
    { id: '102', patientId: 'u4', date: '2024-01-12', eva: 4, content: 'Oedème en nette régression. Amplitudes articulaires : 10° en flexion dorsale. Début proprioception.', objectives: ['Gagner en flexion dorsale'], progress: 35 },
    { id: '103', patientId: 'u4', date: '2024-01-19', eva: 2, content: 'Marche sans boiterie. Proprioception sur plan stable OK. Début fentes légères.', objectives: ['Stabilisation'], progress: 60 },
  ],
  users: [
    { id: 'u1', firstName: 'Jean', lastName: 'Dupont', email: 'reforme3334@gmail.com', password: 'admin', role: UserRole.ADMIN, isActive: true, permissions: Object.values(UserPermission) },
    { id: 'u2', firstName: 'Sarah', lastName: 'Lemoine', email: 'therapeute@kinegest.com', password: 'password', role: UserRole.THERAPEUTE, isActive: true, permissions: [UserPermission.VIEW_DASHBOARD, UserPermission.MANAGE_PATIENTS, UserPermission.VIEW_MEDICAL_RECORDS, UserPermission.MANAGE_AGENDA, UserPermission.DELETE_APPOINTMENT] },
    { id: 'u3', firstName: 'Marc', lastName: 'Vasseur', email: 'secretaire@kinegest.com', password: 'password', role: UserRole.SECRETAIRE, isActive: true, permissions: [UserPermission.VIEW_DASHBOARD, UserPermission.MANAGE_PATIENTS, UserPermission.MANAGE_AGENDA, UserPermission.MANAGE_BILLING] },
    { id: 'u4', firstName: 'Alice', lastName: 'Dubois', email: 'alice.dubois@mail.com', password: 'password', role: UserRole.PATIENT, isActive: true, permissions: [UserPermission.VIEW_DASHBOARD, UserPermission.MANAGE_AGENDA] },
  ]
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [sessionNotes, setSessionNotes] = useState<SessionNote[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('kinegest_session');
    if (!saved) return null;
    const user = JSON.parse(saved);
    
    // Migration for session
    if (user && !user.permissions) {
      const defaultPermissions = {
        [UserRole.ADMIN]: Object.values(UserPermission),
        [UserRole.THERAPEUTE]: [UserPermission.VIEW_DASHBOARD, UserPermission.MANAGE_PATIENTS, UserPermission.VIEW_MEDICAL_RECORDS, UserPermission.MANAGE_AGENDA],
        [UserRole.SECRETAIRE]: [UserPermission.VIEW_DASHBOARD, UserPermission.MANAGE_PATIENTS, UserPermission.MANAGE_AGENDA, UserPermission.MANAGE_BILLING],
        [UserRole.PATIENT]: [UserPermission.VIEW_DASHBOARD, UserPermission.MANAGE_AGENDA]
      };
      user.permissions = defaultPermissions[user.role as UserRole] || [];
    }
    return user;
  });

  const [isLoaded, setIsLoaded] = useState(false);
  const [hasSuccessfullyLoaded, setHasSuccessfullyLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    const loadFromBackend = async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // Increased timeout

      try {
        const response = await fetch('/api/state', { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Server returned ${response.status}`);
        }
        
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("Invalid content type from server");
        }

        const data = await response.json();
        
        if (data && Object.keys(data).length > 0) {
          if (data.patients) setPatients(data.patients);
          if (data.appointments) setAppointments(data.appointments);
          if (data.expenses) setExpenses(data.expenses);
          if (data.invoices) setInvoices(data.invoices);
          if (data.assessments) setAssessments(data.assessments);
          if (data.sessionNotes) setSessionNotes(data.sessionNotes);
          if (data.notifications) setNotifications(data.notifications);
          if (data.exercises) setExercises(data.exercises);
          if (data.messages) setMessages(data.messages);
          if (data.users) setUsers(data.users);
        } else {
          // First time load or empty server, use mock data
          setPatients(MOCK_DATA.patients);
          setAppointments(MOCK_DATA.appointments);
          setExpenses(MOCK_DATA.expenses);
          setInvoices(MOCK_DATA.invoices);
          setSessionNotes(MOCK_DATA.sessionNotes);
          setExercises(MOCK_DATA.exercises);
          setMessages(MOCK_DATA.messages);
          setUsers(MOCK_DATA.users);
        }
        setHasSuccessfullyLoaded(true);
      } catch (error) {
        console.error("Failed to load state from backend:", error);
        showToast("Erreur de connexion au serveur. Certaines données peuvent être manquantes.");
      } finally {
        setIsLoaded(true);
      }
    };
    loadFromBackend();
    
    // Cleanup any existing local backups to respect privacy request
    localStorage.removeItem('kinegest_backup');
  }, []);

  useEffect(() => {
    if (!isLoaded || !hasSuccessfullyLoaded) return;

    const saveToBackend = async () => {
      setSaveStatus('saving');
      const stateToSave = {
        patients, appointments, expenses, invoices, assessments, sessionNotes, notifications, users, exercises, messages
      };
      
      try {
        const response = await fetch('/api/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(stateToSave),
          keepalive: true
        });
        if (!response.ok) throw new Error('Failed to save state');
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (error) {
        console.error("Failed to save state to backend:", error);
        setSaveStatus('error');
      }
    };

    const timeout = setTimeout(saveToBackend, 1000); // Slightly longer debounce
    return () => clearTimeout(timeout);
  }, [isLoaded, hasSuccessfullyLoaded, patients, appointments, expenses, invoices, assessments, sessionNotes, notifications, users, exercises, messages]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('kinegest_session', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('kinegest_session');
    }
  }, [currentUser]);

  useEffect(() => {
    const checkAutomations = () => {
      const now = new Date();
      
      // 1. Relance 'Exercices Oubliés' (Simplified: check if any exercise is older than 3 days and not completed)
      // In a real app, this would be more complex (tracking daily completion)
      patients.forEach(p => {
        const patientExercises = exercises.filter(ex => {
          const app = appointments.find(a => a.id === ex.sessionId);
          return app?.patientId === p.id;
        });
        
        const lastCompleted = patientExercises
          .filter(ex => ex.isCompleted)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
          
        if (lastCompleted) {
          const lastDate = new Date(lastCompleted.date);
          const diffDays = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
          
          if (diffDays >= 3 && diffDays < 4) { // Only send once around the 3rd day
            sendMessage(
              `Bonjour ${p.firstName}, nous avons remarqué que vous n'avez pas validé vos exercices. La régularité est la clé de votre guérison ! Un petit effort aujourd'hui ? 💪`,
              p.id,
              undefined,
              'u2'
            );
          }
        }
      });

      // 4. Suivi 'Post-Séance' (24h after)
      appointments.forEach(app => {
        if (app.status === 'Confirmé') {
          const appDate = new Date(`${app.date}T${app.startTime}`);
          const diffHours = (now.getTime() - appDate.getTime()) / (1000 * 60 * 60);
          
          if (diffHours >= 24 && diffHours < 25) { // Only send once around 24h later
            sendMessage(
              "Comment vous sentez-vous après la séance d'hier ? Notez votre douleur de 1 à 10 sur votre graphique d'évolution.",
              app.patientId,
              undefined,
              'u2'
            );
          }
        }
      });

      // 6. Notifications de Rendez-vous (24h and 2h before)
      appointments.forEach(app => {
        if (app.status === 'Confirmé') {
          const appDate = new Date(`${app.date}T${app.startTime}`);
          const diffHours = (appDate.getTime() - now.getTime()) / (1000 * 60 * 60);
          
          // 24h before
          if (diffHours >= 23.5 && diffHours <= 24.5) {
            addNotification({
              title: "Rappel de séance",
              message: `Bonjour ${patients.find(p => p.id === app.patientId)?.firstName}, rappel de votre séance de kinésithérapie demain à ${app.startTime} avec votre kiné. À demain !`,
              type: 'info'
            });
          }
          
          // 2h before
          if (diffHours >= 1.5 && diffHours <= 2.5) {
            addNotification({
              title: "Rappel imminent",
              message: `Votre séance commence dans 2 heures (${app.startTime}). À tout de suite !`,
              type: 'warning'
            });
          }
        }
      });
    };

    const interval = setInterval(checkAutomations, 1000 * 60 * 60); // Check every hour
    checkAutomations(); // Initial check
    return () => clearInterval(interval);
  }, [patients, appointments, exercises]);

  const [toast, setToast] = useState<string | null>(null);
  const [isPatientModalOpen, setPatientModalOpen] = useState(false);
  const [isAppointmentModalOpen, setAppointmentModalOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [prefilledDate, setPrefilledDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [prefilledTime, setPrefilledTime] = useState<string>('08:00');

  const completeExercise = (exerciseId: string) => {
    setExercises(prev => prev.map(ex => {
      if (ex.id === exerciseId && !ex.isCompleted) {
        const patient = patients.find(p => appointments.find(a => a.id === ex.sessionId)?.patientId === p.id);
        if (patient) awardPoints(patient.id, 5, "Exercice réalisé à la maison");
        return { ...ex, isCompleted: true };
      }
      return ex;
    }));
    showToast("Exercice validé ! +5 points");
  };

  const sendMessage = (content: string, receiverId: string, imageUrl?: string, senderIdOverride?: string) => {
    if (!currentUser && !senderIdOverride) return;
    
    const senderId = senderIdOverride || currentUser?.id || 'system';
    
    const newMessage: Message = {
      id: Math.random().toString(36).substr(2, 9),
      senderId,
      receiverId,
      content,
      imageUrl,
      timestamp: new Date().toISOString(),
      isRead: false
    };
    setMessages(prev => [...prev, newMessage]);

    // Scenario 5: Sécurité & Horaires
    if (!senderIdOverride && currentUser?.role === UserRole.PATIENT) {
      const now = new Date();
      const hour = now.getHours();
      const day = now.getDay(); // 0 is Sunday
      
      const isClosed = day === 0 || hour < 8 || hour >= 20;
      
      if (isClosed) {
        setTimeout(() => {
          const autoReply: Message = {
            id: Math.random().toString(36).substr(2, 9),
            senderId: receiverId, // Reply from the therapist
            receiverId: senderId,
            content: "Votre kiné a bien reçu votre message et vous répondra dès son retour au cabinet. En cas d'urgence, contactez le 0678646401.",
            timestamp: new Date().toISOString(),
            isRead: false
          };
          setMessages(prev => [...prev, autoReply]);
        }, 1000);
      }
    }
  };

  const awardPoints = (patientId: string, amount: number, reason: string) => {
    setPatients(prev => prev.map(p => {
      if (p.id === patientId) {
        const oldPoints = p.gamification.points || 0;
        const newPoints = Math.max(0, oldPoints + amount);
        
        // Scenario 3: Félicitations 'Palier Atteint'
        if (oldPoints < 500 && newPoints >= 500) {
          setTimeout(() => {
            sendMessage(
              "Félicitations ! Vous avez débloqué votre séance de Pressothérapie offerte. Contactez le secrétariat pour réserver votre cadeau ! 🎁",
              p.id,
              undefined,
              'u2'
            );
          }, 1500);
        }

        // Check for rewards unlocking
        const newRewards = (p.gamification.rewards || []).map(r => ({
          ...r,
          isUnlocked: r.isUnlocked || newPoints >= r.pointsRequired
        }));
        
        if (amount > 0) {
          addNotification({
            title: "Points gagnés !",
            message: `${amount} points gagnés pour : ${reason}`,
            type: 'success'
          });
        } else if (amount < 0) {
          addNotification({
            title: "Points perdus",
            message: `${Math.abs(amount)} points retirés pour : ${reason}`,
            type: 'warning'
          });
        }

        const isDelay = reason.toLowerCase().includes('retard');
        const newDelayCount = isDelay ? (p.gamification.delayCount || 0) + 1 : (p.gamification.delayCount || 0);

        return {
          ...p,
          gamification: {
            ...p.gamification,
            points: newPoints,
            delayCount: newDelayCount,
            rewards: newRewards
          }
        };
      }
      return p;
    }));
  };

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const addPatient = (newPatient: Omit<Patient, 'id' | 'createdAt' | 'role' | 'isActive' | 'permissions'>, createAccount: boolean = false) => {
    const id = Math.random().toString(36).substr(2, 9);
    const patient: Patient = {
      role: UserRole.PATIENT,
      isActive: true,
      permissions: [UserPermission.VIEW_DASHBOARD, UserPermission.MANAGE_AGENDA],
      ...newPatient,
      id,
      createdAt: new Date().toISOString(),
      gamification: {
        ...newPatient.gamification,
        patientId: id
      }
    };
    setPatients(prev => [...prev, patient]);

    if (createAccount) {
      const defaultPermissions = [UserPermission.VIEW_DASHBOARD, UserPermission.MANAGE_AGENDA];
      const newUser: User = {
        id, // Use same ID for patient and user for easier linking
        firstName: patient.firstName,
        lastName: patient.lastName,
        email: patient.email,
        password: 'password',
        role: UserRole.PATIENT,
        isActive: true,
        permissions: defaultPermissions
      };
      setUsers(prev => [...prev, newUser]);
      showToast("Patient et compte utilisateur créés");
    } else {
      showToast("Patient ajouté avec succès");
    }

    return patient;
  };

  const addAppointment = (newApp: Omit<Appointment, 'id' | 'status'>) => {
    const app: Appointment = {
      ...newApp,
      id: Math.random().toString(36).substr(2, 9),
      status: 'Confirmé'
    };
    setAppointments(prev => [...prev, app]);
    showToast("Rendez-vous programmé avec succès");
  };

  const addExpense = (newExp: Omit<Expense, 'id'>) => {
    const expense: Expense = {
      ...newExp,
      id: Math.random().toString(36).substr(2, 9),
    };
    setExpenses(prev => [expense, ...prev]);
    showToast("Dépense enregistrée");
  };

  const addInvoice = (newInv: Omit<Invoice, 'id'>) => {
    const invoice: Invoice = {
      ...newInv,
      id: `FAC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    };
    setInvoices(prev => [invoice, ...prev]);
    showToast("Facture générée avec succès");
  };

  const updateInvoiceStatus = (id: string, status: Invoice['status']) => {
    setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status } : inv));
    
    if (status === 'Payé') {
      const inv = invoices.find(i => i.id === id);
      const patient = patients.find(p => p.id === inv?.patientId);
      addNotification({
        title: "Paiement Reçu",
        message: `Le paiement de ${inv?.amount} DH pour ${patient?.lastName} ${patient?.firstName} a été validé.`,
        type: 'success'
      });
      showToast("Paiement validé");
    }
  };

  const sendInvoiceReminders = () => {
    const unpaidInvoices = invoices.filter(inv => inv.status === 'Impayé' || inv.status === 'En cours');
    if (unpaidInvoices.length === 0) {
      showToast("Aucune facture impayée");
      return;
    }

    unpaidInvoices.forEach(inv => {
      const patient = patients.find(p => p.id === inv.patientId);
      addNotification({
        title: "Rappel Envoyé",
        message: `Un rappel automatique a été envoyé à ${patient?.lastName} ${patient?.firstName} pour la facture ${inv.id}.`,
        type: 'warning'
      });
    });

    showToast(`${unpaidInvoices.length} rappels envoyés`);
  };

  const addNotification = (notif: Omit<Notification, 'id' | 'date' | 'read'>) => {
    const notification: Notification = {
      ...notif,
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toLocaleString('fr-FR'),
      read: false
    };
    setNotifications(prev => [notification, ...prev]);
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const addAssessment = (newAs: Omit<Assessment, 'id'>) => {
    const assessment: Assessment = {
      ...newAs,
      id: Math.random().toString(36).substr(2, 9),
    };
    setAssessments(prev => [assessment, ...prev]);
    showToast("Bilan enregistré");
  };

  const deleteAssessment = (id: string) => {
    setAssessments(prev => prev.filter(a => a.id !== id));
    showToast("Bilan supprimé");
  };

  const addSessionNote = (newNote: Omit<SessionNote, 'id'>) => {
    const note: SessionNote = {
      ...newNote,
      id: Math.random().toString(36).substr(2, 9)
    };
    setSessionNotes(prev => [note, ...prev]);
    showToast("Note de séance ajoutée");
  };

  const deleteSessionNote = (id: string) => {
    setSessionNotes(prev => prev.filter(n => n.id !== id));
    showToast("Note de séance supprimée");
  };

  const deleteAppointment = (id: string) => {
    setAppointments(prev => prev.filter(a => a.id !== id));
    showToast("Rendez-vous supprimé");
  };

  const updateAppointmentStatus = (id: string, status: Appointment['status']) => {
    setAppointments(prev => prev.map(a => {
      if (a.id === id) {
        if (status === 'En retard') {
          awardPoints(a.patientId, -10, "Retard à la séance");
          sendMessage(
            "Mince ! Ce retard vous a coûté 10 points de fidélité. La ponctualité aide votre kiné à mieux vous soigner. ⏱️",
            a.patientId,
            undefined,
            'u2' // Sent by therapist
          );
        }
        return { ...a, status };
      }
      return a;
    }));
    showToast(`Statut mis à jour : ${status}`);
  };

  const reportPatientDelay = (patientId: string) => {
    showToast("Traitement du retard...");
    
    // Find today's confirmed appointment for this patient
    const today = new Date().toISOString().split('T')[0];
    let targetApp = appointments.find(a => a.patientId === patientId && a.date === today && a.status === 'Confirmé');

    // If no appointment today, find the most recent confirmed one (could be a test)
    if (!targetApp) {
      targetApp = [...appointments]
        .filter(a => a.patientId === patientId && a.status === 'Confirmé')
        .sort((a, b) => b.date.localeCompare(a.date))[0];
    }

    if (targetApp) {
      updateAppointmentStatus(targetApp.id, 'En retard');
      showToast(`Retard enregistré pour le RDV du ${targetApp.date}`);
    } else {
      // If no confirmed appointment at all, still apply the penalty
      awardPoints(patientId, -10, "Retard signalé");
      sendMessage(
        "Mince ! Un retard a été signalé. Cela vous a coûté 10 points de fidélité. ⏱️",
        patientId,
        undefined,
        'u2'
      );
      showToast("Retard enregistré (pénalité de points appliquée)");
    }
  };

  const updatePatient = (id: string, updates: Partial<Patient>) => {
    setPatients(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    showToast("Dossier patient mis à jour");
  };

  const cancelAppointment = (id: string) => {
    console.log(`Tentative d'annulation du RDV: ${id}`);
    const app = appointments.find(a => a.id === id);
    if (!app) {
      console.error("RDV non trouvé pour l'annulation");
      return;
    }

    const appDate = new Date(`${app.date}T${app.startTime}`);
    const now = new Date();
    const diffHours = (appDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    let penaltyApplied = false;
    // Penalty only if cancelled less than 24h before AND the appointment is in the future
    if (diffHours < 24 && diffHours > 0) {
      awardPoints(app.patientId, -20, "Annulation moins de 24h à l'avance");
      sendMessage(
        "Vous avez annulé votre séance moins de 24h à l'avance. Cela vous a coûté 20 points de fidélité. 😔",
        app.patientId,
        undefined,
        'u2'
      );
      penaltyApplied = true;
    }

    setAppointments(prev => {
      const updated = prev.map(a => a.id === id ? { ...a, status: 'Annulé' as const } : a);
      console.log("Nouveau statut RDV:", updated.find(a => a.id === id)?.status);
      return updated;
    });
    
    showToast(penaltyApplied ? "RDV Annulé (pénalité appliquée)" : "RDV Annulé avec succès");
  };

  const billSession = (appointmentId: string, amount: number) => {
    const app = appointments.find(a => a.id === appointmentId);
    if (!app) return;

    addInvoice({
      patientId: app.patientId,
      amount: amount,
      date: new Date().toISOString().split('T')[0],
      status: 'En cours',
      sessionsCount: 1
    });
  };

  const login = (email: string, password?: string) => {
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (user && user.isActive) {
      if (user.password && user.password !== password) {
        showToast("Mot de passe incorrect");
        return false;
      }
      setCurrentUser(user);
      showToast(`Bienvenue, ${user.firstName}`);
      return true;
    } else if (user && !user.isActive) {
      showToast("Compte désactivé");
      return false;
    } else {
      showToast("Identifiants incorrects");
      return false;
    }
  };

  const logout = () => {
    setCurrentUser(null);
    showToast("Déconnexion réussie");
  };

  const registerPatient = (userData: Omit<User, 'id' | 'role' | 'isActive' | 'permissions'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newUser: User = {
      ...userData,
      id,
      role: UserRole.PATIENT,
      isActive: true,
      permissions: [UserPermission.VIEW_DASHBOARD, UserPermission.MANAGE_AGENDA]
    };
    
    // Also create a Patient record
    const newPatient: Patient = {
      id,
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      role: UserRole.PATIENT,
      isActive: true,
      permissions: [UserPermission.VIEW_DASHBOARD, UserPermission.MANAGE_AGENDA],
      phone: '',
      gender: 'Autre',
      birthDate: '',
      category: PatientCategory.HORS_MUTUELLE,
      prescribingDoctor: 'Non spécifié',
      pathology: 'Nouveau patient (auto-enregistré)',
      antecedents: [],
      consentRGPD: true,
      createdAt: new Date().toISOString(),
      recoveryRate: 0,
      satisfactionRate: 0,
      totalSessionsPrescribed: 0,
      sessionsRemaining: 0,
      gamification: {
        patientId: id,
        points: 0,
        delayCount: 0,
        badges: [],
        rewards: []
      }
    };

    setUsers(prev => [...prev, newUser]);
    setPatients(prev => [...prev, newPatient]);
    
    if (!currentUser) {
      setCurrentUser(newUser);
      showToast("Compte et dossier créés avec succès");
    } else {
      showToast("Compte patient créé avec succès");
    }
  };

  const createAccountForExistingPatient = (patientId: string) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;

    // Check if user already exists
    if (users.some(u => u.id === patientId || u.email === patient.email)) {
      showToast("Un compte existe déjà pour ce patient");
      return;
    }

    const newUser: User = {
      id: patient.id,
      firstName: patient.firstName,
      lastName: patient.lastName,
      email: patient.email,
      password: 'password',
      role: UserRole.PATIENT,
      isActive: true,
      permissions: [UserPermission.VIEW_DASHBOARD, UserPermission.MANAGE_AGENDA]
    };

    setUsers(prev => [...prev, newUser]);
    showToast("Compte patient créé avec succès");
  };

  const addEmployee = (userData: Omit<User, 'id' | 'isActive' | 'permissions'>) => {
    const defaultPerms = {
      [UserRole.ADMIN]: Object.values(UserPermission),
      [UserRole.THERAPEUTE]: [UserPermission.VIEW_DASHBOARD, UserPermission.MANAGE_PATIENTS, UserPermission.VIEW_MEDICAL_RECORDS, UserPermission.MANAGE_AGENDA],
      [UserRole.SECRETAIRE]: [UserPermission.VIEW_DASHBOARD, UserPermission.MANAGE_PATIENTS, UserPermission.MANAGE_AGENDA, UserPermission.MANAGE_BILLING],
      [UserRole.PATIENT]: [UserPermission.VIEW_DASHBOARD, UserPermission.MANAGE_AGENDA]
    };

    const newUser: User = {
      ...userData,
      id: Math.random().toString(36).substr(2, 9),
      password: userData.password || 'password',
      isActive: true,
      permissions: defaultPerms[userData.role] || []
    };
    setUsers(prev => [...prev, newUser]);
    showToast("Compte employé créé");
  };

  const updateUserRole = (userId: string, role: UserRole) => {
    const defaultPerms = {
      [UserRole.ADMIN]: Object.values(UserPermission),
      [UserRole.THERAPEUTE]: [UserPermission.VIEW_DASHBOARD, UserPermission.MANAGE_PATIENTS, UserPermission.VIEW_MEDICAL_RECORDS, UserPermission.MANAGE_AGENDA, UserPermission.DELETE_APPOINTMENT],
      [UserRole.SECRETAIRE]: [UserPermission.VIEW_DASHBOARD, UserPermission.MANAGE_PATIENTS, UserPermission.MANAGE_AGENDA, UserPermission.MANAGE_BILLING],
      [UserRole.PATIENT]: [UserPermission.VIEW_DASHBOARD, UserPermission.MANAGE_AGENDA]
    };

    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role, permissions: defaultPerms[role] } : u));
    showToast("Rôle et permissions par défaut mis à jour");
  };

  const updateUserPermissions = (userId: string, permissions: UserPermission[]) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, permissions } : u));
    showToast("Permissions mises à jour avec succès");
  };

  const toggleUserStatus = (userId: string) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, isActive: !u.isActive } : u));
    showToast("Statut utilisateur mis à jour");
  };

  const resetPassword = (userId: string, newPassword?: string) => {
    const password = newPassword || '123456';
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, password } : u));
    showToast(`Mot de passe réinitialisé par défaut : ${password}`);
  };

  return (
    <AppContext.Provider value={{ 
      patients, appointments, expenses, invoices, assessments, sessionNotes, notifications,
      users, currentUser, login, logout, registerPatient, addEmployee, updateUserRole, updateUserPermissions, toggleUserStatus, deleteAppointment, updateAppointmentStatus, cancelAppointment,
      addPatient, addAppointment, addExpense, addInvoice, updateInvoiceStatus, sendInvoiceReminders,
      addAssessment, deleteAssessment, addSessionNote, deleteSessionNote, billSession, addNotification, markNotificationAsRead, clearNotifications, showToast, toast,
      isPatientModalOpen, setPatientModalOpen,
      isAppointmentModalOpen, setAppointmentModalOpen,
      selectedPatientId, setSelectedPatientId,
      prefilledDate, setPrefilledDate,
      prefilledTime, setPrefilledTime,
      exercises, messages, completeExercise, sendMessage, awardPoints, reportPatientDelay, updatePatient, resetPassword,
      isLoaded, saveStatus
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useStore must be used within AppProvider");
  return context;
};
