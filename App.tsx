
import React, { useState, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { ICONS, COLORS } from './constants';
import Dashboard from './views/Dashboard';
import Patients from './views/Patients';
import Agenda from './views/Agenda';
import Billing from './views/Billing';
import Stats from './views/Stats';
import Admin from './views/Admin';
import Login from './views/Login';
import Register from './views/Register';
import PatientDetail from './views/PatientDetail';
import PatientPortal from './views/PatientPortal';
import { AppProvider, useStore } from './store';
import { PatientCategory, AppointmentType, UserRole, UserPermission } from './types';
import { Settings, LogOut, User as UserIcon, ShieldAlert } from 'lucide-react';

const Sidebar = () => {
  const location = useLocation();
  const { notifications, currentUser } = useStore();
  const unreadCount = notifications.filter(n => !n.read).length;

  const menuItems = [
    { name: 'Tableau de bord', path: '/', icon: ICONS.Dashboard, permission: UserPermission.VIEW_DASHBOARD },
    { name: 'Patients', path: '/patients', icon: ICONS.Patients, permission: UserPermission.MANAGE_PATIENTS },
    { name: 'Agenda', path: '/agenda', icon: ICONS.Agenda, permission: UserPermission.MANAGE_AGENDA },
    { name: 'Facturation', path: '/billing', icon: ICONS.Billing, permission: UserPermission.MANAGE_BILLING },
    { name: 'Statistiques', path: '/stats', icon: ICONS.Stats, permission: UserPermission.VIEW_STATS },
    { name: 'Gestion des Accès', path: '/admin', icon: () => <Settings size={20} />, permission: UserPermission.MANAGE_USERS },
  ];

  const filteredItems = menuItems.filter(item => 
    currentUser && currentUser.permissions?.includes(item.permission)
  );

  return (
    <aside className="w-64 bg-white border-r border-slate-200 h-screen sticky top-0 flex flex-col z-20">
      <div className="p-6 text-center md:text-left">
        <h1 className="text-2xl font-bold text-sky-600 flex items-center gap-2 justify-center md:justify-start">
          <div className="w-8 h-8 bg-sky-100 rounded-lg flex items-center justify-center">
            <div className="w-4 h-4 bg-sky-600 rounded-sm"></div>
          </div>
          KinéGest
        </h1>
      </div>
      <nav className="flex-1 px-4 space-y-1">
        {filteredItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path))
                ? 'bg-sky-50 text-sky-600 font-semibold'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <item.icon />
            <span className="hidden md:inline">{item.name}</span>
          </Link>
        ))}
      </nav>
      {currentUser && (
        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-xl">
            <div className="w-10 h-10 rounded-full bg-sky-600 flex items-center justify-center text-white font-bold flex-shrink-0">
              {currentUser.firstName[0]}{currentUser.lastName[0]}
            </div>
            <div className="flex-1 overflow-hidden hidden md:block">
              <p className="text-sm font-semibold truncate">{currentUser.firstName} {currentUser.lastName}</p>
              <p className="text-xs text-slate-500 truncate">{currentUser.role}</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

const PatientModal = () => {
  const { isPatientModalOpen, setPatientModalOpen, addPatient } = useStore();
  const navigate = useNavigate();
  if (!isPatientModalOpen) return null;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newPatient = addPatient({
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      cin: formData.get('cin') as string,
      birthDate: formData.get('birthDate') as string,
      category: formData.get('category') as PatientCategory,
      mutuelleName: formData.get('mutuelleName') as string || undefined,
      prescribingDoctor: formData.get('prescribingDoctor') as string,
      pathology: formData.get('pathology') as string,
      antecedents: [],
      consentRGPD: formData.get('consentRGPD') === 'on',
      recoveryRate: 0,
      satisfactionRate: 0,
      totalSessionsPrescribed: 10,
      sessionsRemaining: 10,
      gamification: {
        patientId: '',
        points: 0,
        delayCount: 0,
        badges: [],
        rewards: []
      }
    });
    setPatientModalOpen(false);
    navigate(`/patients/${newPatient.id}`);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl my-8">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white rounded-t-2xl z-10">
          <h3 className="text-xl font-bold">Ajouter un nouveau Patient</h3>
          <button onClick={() => setPatientModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nom de famille</label>
              <input required name="lastName" className="w-full px-4 py-2.5 bg-slate-50 rounded-xl border border-transparent focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-100 transition-all outline-none" placeholder="ex: Durand" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Prénom</label>
              <input required name="firstName" className="w-full px-4 py-2.5 bg-slate-50 rounded-xl border border-transparent focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-100 transition-all outline-none" placeholder="ex: Thomas" />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email professionnel ou perso</label>
              <input required name="email" type="email" className="w-full px-4 py-2.5 bg-slate-50 rounded-xl border border-transparent focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-100 transition-all outline-none" placeholder="contact@email.fr" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Téléphone</label>
              <input required name="phone" className="w-full px-4 py-2.5 bg-slate-50 rounded-xl border border-transparent focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-100 transition-all outline-none" placeholder="06 12 34 56 78" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">CIN (Carte d'Identité)</label>
              <input name="cin" className="w-full px-4 py-2.5 bg-slate-50 rounded-xl border border-transparent focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-100 transition-all outline-none" placeholder="ex: AB123456" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Date de naissance</label>
              <input required name="birthDate" type="date" className="w-full px-4 py-2.5 bg-slate-50 rounded-xl border border-transparent focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-100 transition-all outline-none" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Couverture Mutuelle</label>
              <select name="category" className="w-full px-4 py-2.5 bg-slate-50 rounded-xl border border-transparent focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-100 transition-all outline-none">
                <option value={PatientCategory.MUTUALISTE}>Mutualiste</option>
                <option value={PatientCategory.HORS_MUTUELLE}>Hors Mutuelle (HN)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Médecin Prescripteur</label>
              <input required name="prescribingDoctor" className="w-full px-4 py-2.5 bg-slate-50 rounded-xl border border-transparent focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-100 transition-all outline-none" placeholder="Dr. Nom du Médecin" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Motif de consultation / Pathologie</label>
            <textarea required name="pathology" className="w-full px-4 py-2.5 bg-slate-50 rounded-xl border border-transparent focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-100 transition-all outline-none h-24 resize-none" placeholder="Décrivez brièvement le diagnostic initial..."></textarea>
          </div>

          <div className="bg-sky-50/50 p-4 rounded-xl border border-sky-100 space-y-3">
            <div className="flex items-start gap-3">
              <input 
                required 
                type="checkbox" 
                name="consentRGPD" 
                id="consentRGPD"
                className="mt-1 w-4 h-4 text-sky-600 bg-white border-slate-300 rounded focus:ring-sky-500" 
              />
              <label htmlFor="consentRGPD" className="text-xs text-slate-600 leading-relaxed">
                <span className="font-bold text-sky-900 block mb-1">Consentement RGPD</span>
                Je confirme que le patient a été informé du traitement de ses données personnelles et qu'il accepte que ses informations médicales soient conservées de manière sécurisée dans le cadre de son suivi de soins.
              </label>
            </div>
          </div>

          <div className="pt-4 flex flex-col md:flex-row gap-3">
            <button type="button" onClick={() => setPatientModalOpen(false)} className="flex-1 px-6 py-3 border border-slate-200 rounded-xl font-semibold hover:bg-slate-50 transition-colors">Annuler</button>
            <button type="submit" className="flex-1 px-6 py-3 bg-sky-600 text-white rounded-xl font-bold hover:bg-sky-700 transition-all shadow-lg shadow-sky-100 active:scale-95">Créer la fiche patient</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AppointmentModal = () => {
  const { isAppointmentModalOpen, setAppointmentModalOpen, patients, addAppointment, selectedPatientId, setSelectedPatientId, prefilledDate, prefilledTime, setPatientModalOpen, users } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionRef = useRef<HTMLDivElement>(null);

  const therapists = users.filter(u => u.role === UserRole.THERAPEUTE || u.role === UserRole.ADMIN);

  useEffect(() => {
    if (selectedPatientId) {
      const p = patients.find(patient => patient.id === selectedPatientId);
      if (p) setSearchTerm(`${p.lastName} ${p.firstName}`);
    } else {
      setSearchTerm('');
    }
  }, [selectedPatientId, isAppointmentModalOpen, patients]);

  if (!isAppointmentModalOpen) return null;

  const filteredPatients = patients.filter(p => 
    `${p.lastName} ${p.firstName}`.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 5);

  const handleSelect = (id: string, name: string) => {
    setSelectedPatientId(id);
    setSearchTerm(name);
    setShowSuggestions(false);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedPatientId) return;

    const patient = patients.find(p => p.id === selectedPatientId);
    if (!patient) return;

    const formData = new FormData(e.currentTarget);
    addAppointment({
      patientId: selectedPatientId,
      patientName: `${patient.lastName} ${patient.firstName}`,
      therapistId: formData.get('therapistId') as string,
      date: formData.get('date') as string,
      startTime: formData.get('startTime') as string,
      type: formData.get('type') as AppointmentType,
    });
    setAppointmentModalOpen(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-xl font-bold">Nouveau Rendez-vous</h3>
          <button onClick={() => setAppointmentModalOpen(false)} className="p-2 hover:bg-slate-50 rounded-full text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1.5 relative">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Écrire le nom du Patient</label>
            <div className="relative">
              <input 
                type="text" 
                placeholder="Commencez à taper..."
                className={`w-full px-4 py-2.5 bg-slate-50 rounded-xl border border-transparent focus:ring-2 focus:ring-sky-500 transition-all outline-none ${selectedPatientId ? 'border-sky-200 bg-sky-50/30' : ''}`}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setSelectedPatientId(null);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
              />
              {selectedPatientId && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sky-600">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
              )}
            </div>

            {showSuggestions && searchTerm.length > 0 && !selectedPatientId && (
              <div className="absolute z-20 w-full mt-1 bg-white border border-slate-100 rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">
                {filteredPatients.length > 0 ? (
                  filteredPatients.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      className="w-full px-4 py-3 text-left hover:bg-sky-50 flex flex-col transition-colors border-b border-slate-50 last:border-0"
                      onClick={() => handleSelect(p.id, `${p.lastName} ${p.firstName}`)}
                    >
                      <span className="font-bold text-sm text-slate-800">{p.lastName} {p.firstName}</span>
                      <span className="text-[10px] text-slate-400 uppercase tracking-tighter">Patho: {p.pathology.substring(0, 30)}...</span>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-4 text-center">
                    <p className="text-xs text-slate-500 mb-2 italic">Aucun patient trouvé.</p>
                    <button 
                      type="button"
                      onClick={() => { setAppointmentModalOpen(false); setPatientModalOpen(true); }}
                      className="text-xs font-bold text-sky-600 hover:underline"
                    >
                      + Créer un nouveau patient ?
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase">Date</label>
              <input required name="date" type="date" className="w-full px-4 py-2 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-sky-500 outline-none" defaultValue={prefilledDate} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase">Heure de début</label>
              <input required name="startTime" type="time" className="w-full px-4 py-2 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-sky-500 outline-none" defaultValue={prefilledTime} />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase">Lieu</label>
              <select name="type" className="w-full px-4 py-2 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-sky-500 outline-none">
                <option value="Cabinet">Cabinet</option>
                <option value="Domicile">Domicile</option>
                <option value="Clinique">Clinique</option>
                <option value="Visio">Visio</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase">Thérapeute</label>
              <select name="therapistId" className="w-full px-4 py-2 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-sky-500 outline-none">
                {therapists.map(t => (
                  <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="pt-4">
            <button 
              type="submit" 
              disabled={!selectedPatientId}
              className="w-full px-6 py-3.5 bg-sky-600 text-white rounded-xl font-bold hover:bg-sky-700 transition-all shadow-lg shadow-sky-100 disabled:bg-slate-300 disabled:shadow-none active:scale-[0.98]"
            >
              Planifier le rendez-vous
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Toast = () => {
  const { toast } = useStore();
  if (!toast) return null;
  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-8 duration-300">
      <div className="bg-slate-900 text-white px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700 backdrop-blur-md bg-opacity-90">
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#10b981]"></div>
        <span className="text-sm font-semibold tracking-wide">{toast}</span>
      </div>
    </div>
  );
};

const NotificationCenter = () => {
  const { notifications, markNotificationAsRead, clearNotifications } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-sky-600 hover:border-sky-200 transition-all relative"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h4 className="font-bold text-sm">Notifications</h4>
            <button 
              onClick={clearNotifications}
              className="text-[10px] font-bold text-slate-400 uppercase hover:text-red-500 transition-colors"
            >
              Tout effacer
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.map(n => (
                <div 
                  key={n.id} 
                  className={`p-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors cursor-pointer ${!n.read ? 'bg-sky-50/30' : ''}`}
                  onClick={() => markNotificationAsRead(n.id)}
                >
                  <div className="flex gap-3">
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                      n.type === 'success' ? 'bg-emerald-500' : 
                      n.type === 'warning' ? 'bg-amber-500' : 'bg-sky-500'
                    }`} />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-800">{n.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{n.message}</p>
                      <p className="text-[10px] text-slate-400 mt-2 font-medium">{n.date}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center">
                <p className="text-sm text-slate-400 italic">Aucune notification</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const Layout = () => {
  const { currentUser, logout } = useStore();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!currentUser && location.pathname !== '/login' && location.pathname !== '/register') {
      navigate('/login');
    }
  }, [currentUser, navigate, location.pathname]);

  if (!currentUser) return null;

  if (currentUser.role === UserRole.PATIENT) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Routes>
          <Route path="/*" element={<PatientPortal />} />
        </Routes>
        <Toast />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="sticky top-0 bg-slate-50/80 backdrop-blur-md z-10 px-4 md:px-8 py-4 flex justify-end items-center gap-4">
          <NotificationCenter />
          <div className="relative">
            <button 
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2 p-1.5 pr-4 bg-white border border-slate-200 rounded-2xl hover:border-sky-200 transition-all"
            >
              <div className="w-8 h-8 rounded-full bg-sky-600 flex items-center justify-center text-white text-xs font-bold">
                {currentUser.firstName[0]}{currentUser.lastName[0]}
              </div>
              <span className="text-sm font-semibold hidden sm:inline">{currentUser.firstName}</span>
            </button>
            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                <div className="px-4 py-2 border-b border-slate-50 mb-2">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Rôle Actuel</p>
                  <p className="text-sm font-bold text-sky-600">{currentUser.role}</p>
                </div>
                <button 
                  onClick={() => { logout(); setIsUserMenuOpen(false); navigate('/login'); }}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                >
                  <LogOut size={16} />
                  Déconnexion
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="max-w-7xl mx-auto p-4 md:p-8 pt-0 md:pt-0">
          <Routes>
            <Route path="/" element={currentUser.permissions?.includes(UserPermission.VIEW_DASHBOARD) ? <Dashboard /> : <Agenda />} />
            <Route path="/patients" element={currentUser.permissions?.includes(UserPermission.MANAGE_PATIENTS) ? <Patients /> : <Agenda />} />
            <Route path="/patients/:id" element={currentUser.permissions?.includes(UserPermission.VIEW_MEDICAL_RECORDS) || currentUser.permissions?.includes(UserPermission.MANAGE_PATIENTS) ? <PatientDetail /> : <Agenda />} />
            <Route path="/agenda" element={currentUser.permissions?.includes(UserPermission.MANAGE_AGENDA) ? <Agenda /> : <Dashboard />} />
            <Route path="/billing" element={currentUser.permissions?.includes(UserPermission.MANAGE_BILLING) ? <Billing /> : <Agenda />} />
            <Route path="/stats" element={currentUser.permissions?.includes(UserPermission.VIEW_STATS) ? <Stats /> : <Agenda />} />
            <Route path="/admin" element={currentUser.permissions?.includes(UserPermission.MANAGE_USERS) ? <Admin /> : <Agenda />} />
          </Routes>
        </div>
      </main>
      <PatientModal />
      <AppointmentModal />
      <Toast />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <AppProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/*" element={<Layout />} />
        </Routes>
      </AppProvider>
    </HashRouter>
  );
};

export default App;
