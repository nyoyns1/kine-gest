
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Patient, PatientCategory, SessionNote, UserRole, UserPermission } from '../types';
import { generateClinicalReport } from '../geminiService';
import { useStore } from '../store';
import BilanDiagnostic from './BilanDiagnostic';
import { FileDown, Sparkles, ChevronLeft, Clock, User, MapPin, AlertCircle, Stethoscope, Edit, Save, X, Mail, Phone, Calendar, CreditCard } from 'lucide-react';
import { exportEvaluationToPDF } from '../src/utils/pdfExport';

const mockNotes: SessionNote[] = [
  { id: '101', patientId: '1', date: '2024-01-05', eva: 7, content: 'Douleur intense au réveil. Oedème persistant. Travail circulatoire et drainage.', objectives: ['Diminuer oedème'], progress: 10 },
  { id: '102', patientId: '1', date: '2024-01-12', eva: 4, content: 'Oedème en nette régression. Amplitudes articulaires : 10° en flexion dorsale. Début proprioception.', objectives: ['Gagner en flexion dorsale'], progress: 35 },
  { id: '103', patientId: '1', date: '2024-01-19', eva: 2, content: 'Marche sans boiterie. Proprioception sur plan stable OK. Début fentes légères.', objectives: ['Stabilisation'], progress: 60 },
];

const PatientDetail: React.FC = () => {
  const { id } = useParams();
  const { patients, setAppointmentModalOpen, setSelectedPatientId, showToast, reportPatientDelay, appointments, cancelAppointment, sessionNotes, deleteSessionNote, addSessionNote, assessments, currentUser, users, createAccountForExistingPatient } = useStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'medical' | 'appointments' | 'bilan' | 'sessions' | 'docs' | 'billing'>('medical');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [reportType, setReportType] = useState<'initial' | 'intermediaire' | 'final'>('intermediaire');
  const [isConfirmingDelay, setIsConfirmingDelay] = useState(false);
  const [confirmingCancelId, setConfirmingCancelId] = useState<string | null>(null);
  const [isConfirmingSidebarCancel, setIsConfirmingSidebarCancel] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [newNote, setNewNote] = useState({ eva: 3, content: '', objectives: '' });
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const patient = patients.find(p => p.id === id);
  const patientAssessments = assessments.filter(a => a.patientId === id);
  const patientNotes = sessionNotes.filter(n => n.patientId === id);
  const hasAccount = users.some(u => u.id === id);

  const canManageAgenda = (currentUser?.permissions || []).includes(UserPermission.MANAGE_AGENDA);
  const canViewMedicalRecords = (currentUser?.permissions || []).includes(UserPermission.VIEW_MEDICAL_RECORDS);
  const canManageBilling = (currentUser?.permissions || []).includes(UserPermission.MANAGE_BILLING);

  if (!patient) {
    return (
      <div className="py-20 text-center space-y-4">
        <p className="text-slate-500">Patient introuvable.</p>
        <button onClick={() => navigate('/patients')} className="text-sky-600 font-bold">Retour à la liste</button>
      </div>
    );
  }

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    setAiReport(null);
    try {
      const report = await generateClinicalReport(patient, patientNotes, reportType, patientAssessments);
      setAiReport(report);
      showToast(`Bilan ${reportType} IA généré`);
    } catch (err) {
      showToast("Erreur lors de la génération");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportPDF = () => {
    const latestAssessment = patientAssessments[patientAssessments.length - 1];
    if (!latestAssessment) {
      showToast("Aucune évaluation disponible pour l'export");
      return;
    }
    exportEvaluationToPDF(patient, latestAssessment, aiReport || undefined);
    showToast("PDF généré avec succès");
  };

  const handleNewRDV = () => {
    setSelectedPatientId(patient.id);
    setAppointmentModalOpen(true);
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    addSessionNote({
      patientId: patient.id,
      date: new Date().toISOString().split('T')[0],
      eva: newNote.eva,
      content: newNote.content,
      objectives: newNote.objectives.split(',').map(o => o.trim()).filter(o => o !== ''),
      progress: 0
    });
    setNewNote({ eva: 3, content: '', objectives: '' });
    setShowNoteForm(false);
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/patients')}
          className="p-2 hover:bg-white rounded-xl text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        <div>
          <h2 className="text-2xl font-bold">
            {patient.lastName || patient.firstName ? `${patient.lastName} ${patient.firstName}` : 'Patient sans nom'}
          </h2>
          <p className="text-sm text-slate-500">ID: #{patient.id} • {patient.pathology}</p>
        </div>
        <div className="ml-auto flex gap-3">
          {isConfirmingDelay ? (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2 duration-200">
              <span className="text-[10px] font-bold text-amber-600 uppercase">Confirmer le retard ?</span>
              <button 
                onClick={() => {
                  reportPatientDelay(patient.id);
                  setIsConfirmingDelay(false);
                }}
                className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 transition-all shadow-sm"
              >
                OUI
              </button>
              <button 
                onClick={() => setIsConfirmingDelay(false)}
                className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition-all"
              >
                NON
              </button>
            </div>
          ) : (
            <button 
              type="button"
              onClick={() => setIsConfirmingDelay(true)}
              className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-600 rounded-xl text-sm font-semibold hover:bg-amber-100 transition-all border border-amber-100 active:scale-95"
            >
              <Clock size={16} />
              Signaler Retard
            </button>
          )}
          <button 
            onClick={() => setIsEditModalOpen(true)}
            className="hidden md:block px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold hover:bg-white transition-colors"
          >
            Modifier
          </button>
          <button 
            onClick={handleNewRDV}
            className="px-4 py-2 bg-sky-600 text-white rounded-xl text-sm font-semibold hover:bg-sky-700 transition-colors shadow-lg shadow-sky-100"
          >
            Nouveau RDV
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Profile Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="w-24 h-24 mx-auto bg-sky-100 rounded-full flex items-center justify-center text-3xl font-bold text-sky-600 mb-4">
              {patient.firstName || patient.lastName ? (
                <>
                  {patient.firstName?.charAt(0)}{patient.lastName?.charAt(0)}
                </>
              ) : (
                <User size={40} />
              )}
            </div>
            <div className="text-center space-y-1 mb-6">
              <p className="font-bold text-lg">
                {patient.firstName || patient.lastName ? `${patient.firstName} ${patient.lastName}` : 'Patient sans nom'}
              </p>
              <div className="flex items-center justify-center gap-2">
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-tighter ${
                  patient.gender === 'Homme' ? 'bg-blue-50 text-blue-600' : 
                  patient.gender === 'Femme' ? 'bg-pink-50 text-pink-600' : 'bg-slate-100 text-slate-600'
                }`}>
                  {patient.gender}
                </span>
                <p className="text-xs text-slate-400">{patient.birthDate}</p>
              </div>
            </div>
            
            <div className="space-y-4 pt-4 border-t border-slate-50">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">CIN / NIR</p>
                <p className="text-sm font-medium">{patient.cin || '---'}</p>
                {patient.socialSecurityNumber && <p className="text-[10px] text-slate-400 font-mono">{patient.socialSecurityNumber}</p>}
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Contact</p>
                <p className="text-sm font-medium">{patient.phone}</p>
                <p className="text-sm text-slate-500">{patient.email}</p>
              </div>
              {patient.address && (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Adresse</p>
                  <p className="text-sm font-medium leading-tight">{patient.address}</p>
                  <p className="text-xs text-slate-500">{patient.postalCode} {patient.city}</p>
                </div>
              )}
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Médecin Prescripteur</p>
                <p className="text-sm font-medium">{patient.prescribingDoctor}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Couverture Sociale</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${patient.category === PatientCategory.MUTUALISTE ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                  <p className="text-sm font-medium">{patient.category}</p>
                </div>
                {patient.mutuelleName && <p className="text-xs text-slate-500 mt-1">{patient.mutuelleName}</p>}
              </div>

              <div className="pt-4 border-t border-slate-50">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Compte Patient</p>
                {hasAccount ? (
                  <div className="flex items-center gap-2 text-emerald-600">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                    <span className="text-xs font-bold uppercase tracking-tighter">Compte Actif</span>
                  </div>
                ) : (
                  <button 
                    onClick={() => {
                      if (window.confirm("Voulez-vous créer un compte utilisateur pour ce patient ?")) {
                        createAccountForExistingPatient(patient.id);
                      }
                    }}
                    className="w-full py-2 bg-sky-50 text-sky-600 rounded-xl text-[10px] font-bold uppercase hover:bg-sky-100 transition-all border border-sky-100"
                  >
                    Créer un compte d'accès
                  </button>
                )}
              </div>

              <div className="pt-4 border-t border-slate-50">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Fidélité & Ponctualité</p>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Points</p>
                    <p className="text-lg font-bold text-sky-600">{patient.gamification.points}</p>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Retards</p>
                    <p className={`text-lg font-bold ${patient.gamification.delayCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {patient.gamification.delayCount || 0}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    if (window.confirm("Confirmer le retard ?")) {
                      reportPatientDelay(patient.id);
                    }
                  }}
                  className="w-full py-2 bg-amber-50 text-amber-600 rounded-xl text-[10px] font-bold uppercase hover:bg-amber-100 transition-all border border-amber-100 mb-4"
                >
                  Signaler un retard ici
                </button>

                {/* Next Appointment Shortcut */}
                {appointments.filter(a => a.patientId === patient.id && a.status === 'Confirmé').sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0] && (
                  <div className="pt-4 border-t border-slate-50">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Prochaine Séance</p>
                    <div className="bg-sky-50 p-3 rounded-xl border border-sky-100">
                      <p className="text-xs font-bold text-sky-900">
                        {new Date(appointments.filter(a => a.patientId === patient.id && a.status === 'Confirmé').sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0].date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </p>
                      <p className="text-[10px] text-sky-700 mb-2">
                        à {appointments.filter(a => a.patientId === patient.id && a.status === 'Confirmé').sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0].startTime}
                      </p>
                      <button 
                        onClick={() => {
                          const nextApp = appointments.filter(a => a.patientId === patient.id && a.status === 'Confirmé').sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
                          if (isConfirmingSidebarCancel) {
                            cancelAppointment(nextApp.id);
                            setIsConfirmingSidebarCancel(false);
                          } else {
                            setIsConfirmingSidebarCancel(true);
                          }
                        }}
                        className={`w-full py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all border ${
                          isConfirmingSidebarCancel 
                          ? 'bg-red-600 text-white border-red-700' 
                          : 'bg-white text-red-600 border-red-100 hover:bg-red-50'
                        }`}
                      >
                        {isConfirmingSidebarCancel ? 'CONFIRMER ANNULATION ?' : 'Annuler la séance'}
                      </button>
                      {isConfirmingSidebarCancel && (
                        <button 
                          onClick={() => setIsConfirmingSidebarCancel(false)}
                          className="w-full mt-1 text-[9px] text-slate-400 hover:text-slate-600 underline"
                        >
                          Annuler l'action
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden min-h-[600px]">
            <div className="flex border-b border-slate-100 overflow-x-auto scrollbar-hide">
              {[
                { id: 'medical', label: 'Dossier Médical', permission: UserPermission.VIEW_MEDICAL_RECORDS },
                { id: 'appointments', label: 'Rendez-vous', permission: UserPermission.MANAGE_AGENDA },
                { id: 'bilan', label: 'Bilans & Evolution', permission: UserPermission.VIEW_MEDICAL_RECORDS },
                { id: 'sessions', label: 'Notes de Séances', permission: UserPermission.VIEW_MEDICAL_RECORDS },
                { id: 'docs', label: 'Bilan AI & Courriers', permission: UserPermission.VIEW_MEDICAL_RECORDS },
                { id: 'billing', label: 'Facturation', permission: UserPermission.MANAGE_BILLING },
              ].filter(tab => currentUser && currentUser.permissions?.includes(tab.permission)).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-6 py-4 text-sm font-semibold transition-all relative whitespace-nowrap ${
                    activeTab === tab.id ? 'text-sky-600' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab.label}
                  {activeTab === tab.id && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-sky-600"></div>}
                </button>
              ))}
            </div>

            <div className="p-6">
              {activeTab === 'medical' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                  <section className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold flex items-center gap-2">
                        <div className="w-2 h-6 bg-sky-500 rounded-full"></div>
                        Informations Administratives
                      </h4>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <User size={14} className="text-sky-500" />
                          Identité
                        </p>
                        <div className="space-y-2">
                          <p className="text-sm font-bold text-slate-700">{patient.lastName} {patient.firstName}</p>
                          <p className="text-xs text-slate-500">Né(e) le {patient.birthDate} ({patient.gender})</p>
                          <p className="text-xs text-slate-500">CIN: {patient.cin || '---'}</p>
                          <p className="text-xs text-slate-500 font-mono">NIR: {patient.socialSecurityNumber || '---'}</p>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <MapPin size={14} className="text-sky-500" />
                          Coordonnées
                        </p>
                        <div className="space-y-2">
                          <p className="text-xs text-slate-500">{patient.address || 'Adresse non renseignée'}</p>
                          <p className="text-xs text-slate-500">{patient.postalCode} {patient.city}</p>
                          <p className="text-xs font-bold text-slate-700 mt-2">{patient.phone}</p>
                          <p className="text-xs text-sky-600">{patient.email}</p>
                        </div>
                      </div>

                      <div className="bg-amber-50/50 p-5 rounded-2xl border border-amber-100 space-y-4">
                        <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-2">
                          <AlertCircle size={14} />
                          Urgence
                        </p>
                        <div className="space-y-2">
                          <p className="text-xs font-bold text-slate-700">{patient.emergencyContactName || 'Non renseigné'}</p>
                          <p className="text-xs text-slate-500">{patient.emergencyContactPhone || '---'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <Stethoscope size={14} className="text-sky-500" />
                          Motif de consultation
                        </p>
                        <p className="text-sm font-medium text-slate-700 leading-relaxed">{patient.pathology}</p>
                      </div>
                      
                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <AlertCircle size={14} className="text-sky-500" />
                          Antécédents
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {patient.antecedents.map((a, i) => (
                            <span key={i} className="px-3 py-1.5 bg-white border border-slate-200 text-[10px] font-bold rounded-xl text-slate-600 uppercase">{a}</span>
                          ))}
                          {patient.antecedents.length === 0 && <span className="text-xs text-slate-400 italic">Aucun antécédent noté.</span>}
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              )}

              {activeTab === 'appointments' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-slate-800">Prochains Rendez-vous</h4>
                    <button 
                      onClick={handleNewRDV}
                      className="text-sm font-bold text-sky-600 hover:underline"
                    >
                      + Programmer
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {appointments.filter(a => a.patientId === patient.id && a.status === 'Confirmé').sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(app => (
                      <div key={app.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-white rounded-lg flex flex-col items-center justify-center border border-slate-100 shadow-sm">
                            <span className="text-[10px] font-bold text-sky-600 uppercase">{new Date(app.date).toLocaleDateString('fr-FR', { month: 'short' })}</span>
                            <span className="text-sm font-bold text-slate-800">{new Date(app.date).getDate()}</span>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">{app.startTime} - {app.endTime || '...'}</p>
                            <p className="text-xs text-slate-500">{app.type}</p>
                          </div>
                        </div>
                        {confirmingCancelId === app.id ? (
                          <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-1 duration-200">
                            <button 
                              onClick={() => {
                                cancelAppointment(app.id);
                                setConfirmingCancelId(null);
                              }}
                              className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 shadow-sm"
                            >
                              CONFIRMER
                            </button>
                            <button 
                              onClick={() => setConfirmingCancelId(null)}
                              className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200"
                            >
                              NON
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => setConfirmingCancelId(app.id)}
                            className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors border border-red-100"
                          >
                            Annuler
                          </button>
                        )}
                      </div>
                    ))}
                    {appointments.filter(a => a.patientId === patient.id && a.status === 'Confirmé').length === 0 && (
                      <div className="py-10 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <p className="text-sm text-slate-400">Aucun rendez-vous à venir.</p>
                      </div>
                    )}
                  </div>

                  <h4 className="font-bold text-slate-800 pt-4">Historique des statuts</h4>
                  <div className="space-y-2">
                    {appointments.filter(a => a.patientId === patient.id && a.status !== 'Confirmé').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5).map(app => (
                      <div key={app.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-100 text-sm">
                        <span className="text-slate-500">{new Date(app.date).toLocaleDateString()}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          app.status === 'Annulé' ? 'bg-red-50 text-red-600' : 
                          app.status === 'En retard' ? 'bg-amber-50 text-amber-600' : 
                          'bg-slate-50 text-slate-600'
                        }`}>
                          {app.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'bilan' && (
                <BilanDiagnostic patientId={patient.id} />
              )}
              
              {activeTab === 'sessions' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-slate-800">Historique des séances</h4>
                    <button 
                      onClick={() => setShowNoteForm(!showNoteForm)}
                      className="text-sm font-bold text-sky-600 hover:underline"
                    >
                      {showNoteForm ? 'Annuler' : '+ Nouvelle Note'}
                    </button>
                  </div>

                  {showNoteForm && (
                    <form onSubmit={handleAddNote} className="p-6 bg-white border border-sky-100 rounded-2xl shadow-sm space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Douleur (EVA)</label>
                          <div className="flex items-center gap-3">
                            <input 
                              type="range" min="0" max="10" 
                              value={newNote.eva} 
                              onChange={(e) => setNewNote({...newNote, eva: Number(e.target.value)})}
                              className="flex-1 h-1.5 bg-slate-100 rounded-full appearance-none cursor-pointer accent-sky-600"
                            />
                            <span className="text-sm font-black text-sky-600 w-8">{newNote.eva}/10</span>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Objectifs (séparés par virgule)</label>
                          <input 
                            type="text"
                            value={newNote.objectives}
                            onChange={(e) => setNewNote({...newNote, objectives: e.target.value})}
                            placeholder="ex: Mobilité, Force"
                            className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-sky-500 outline-none"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contenu de la séance</label>
                        <textarea 
                          required
                          value={newNote.content}
                          onChange={(e) => setNewNote({...newNote, content: e.target.value})}
                          className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-sky-500 outline-none h-24 resize-none"
                          placeholder="Décrivez le travail effectué..."
                        />
                      </div>
                      <div className="flex justify-end">
                        <button type="submit" className="px-6 py-2 bg-sky-600 text-white rounded-xl text-sm font-bold hover:bg-sky-700 transition-all shadow-lg shadow-sky-100">
                          Enregistrer la note
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="space-y-4">
                    {patientNotes.map(note => (
                      <div key={note.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 relative group">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs font-bold text-slate-400">{note.date}</span>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-1 bg-sky-100 text-sky-700 text-[10px] font-bold rounded-lg uppercase tracking-tighter">EVA: {note.eva}/10</span>
                            <button 
                              onClick={() => deleteSessionNote(note.id)}
                              className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                              title="Supprimer la note"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                            </button>
                          </div>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed">{note.content}</p>
                        <div className="mt-3 flex gap-2">
                          {note.objectives.map((obj, i) => (
                            <span key={i} className="text-[10px] bg-white border border-slate-200 px-2 py-1 rounded-md text-slate-500 italic">#{obj}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                    {patientNotes.length === 0 && (
                      <div className="py-10 text-center border-2 border-dashed border-slate-100 rounded-3xl">
                        <p className="text-slate-400 text-sm italic">Aucune note de séance pour le moment.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'docs' && (
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h4 className="font-bold text-slate-800">Comptes-rendus & IA</h4>
                    <div className="flex items-center gap-3">
                      <select 
                        value={reportType}
                        onChange={(e) => setReportType(e.target.value as any)}
                        className="bg-slate-50 border-none rounded-xl px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-sky-500 outline-none"
                      >
                        <option value="initial">Bilan Initial</option>
                        <option value="intermediaire">Bilan Intermédiaire</option>
                        <option value="final">Bilan Final</option>
                      </select>
                      <button 
                        onClick={handleGenerateReport}
                        disabled={isGenerating}
                        className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-slate-100 disabled:bg-slate-300 flex items-center gap-2"
                      >
                        {isGenerating ? (
                          <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                          <Sparkles size={14} />
                        )}
                        {isGenerating ? 'Analyse...' : 'Générer IA'}
                      </button>
                      {aiReport && (
                        <button 
                          onClick={handleExportPDF}
                          className="bg-sky-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-sky-100 flex items-center gap-2"
                        >
                          <FileDown size={14} />
                          Exporter PDF
                        </button>
                      )}
                    </div>
                  </div>
                  {aiReport && (
                    <div className="bg-sky-50/50 p-6 rounded-2xl border border-sky-100 prose prose-sky prose-sm max-w-none animate-in fade-in slide-in-from-top-2 duration-500">
                       <div className="flex items-center gap-2 mb-4">
                         <div className="w-8 h-8 bg-sky-600 text-white rounded-lg flex items-center justify-center">
                           <Sparkles size={16} />
                         </div>
                         <h5 className="font-bold text-sky-900 m-0">Synthèse Clinique ({reportType})</h5>
                       </div>
                       <div className="text-slate-700 whitespace-pre-line text-sm leading-relaxed">{aiReport}</div>
                       <div className="mt-6 flex gap-2">
                         <button className="text-xs bg-white border border-slate-200 px-3 py-1.5 rounded-lg font-bold text-slate-600 hover:bg-slate-50 transition-colors">Copier</button>
                         <button 
                          onClick={handleExportPDF}
                          className="text-xs bg-white border border-slate-200 px-3 py-1.5 rounded-lg font-bold text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-1"
                         >
                           <FileDown size={12} />
                           Télécharger
                         </button>
                       </div>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border border-slate-100 rounded-xl flex items-center gap-4 hover:bg-slate-50 cursor-pointer transition-colors">
                      <div className="w-10 h-10 bg-red-50 text-red-600 rounded-lg flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>
                      </div>
                      <div>
                        <p className="text-sm font-bold">Ordonnance_Initial.pdf</p>
                        <p className="text-xs text-slate-400">Ajouté le 05/01/2024</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'billing' && (
                <div className="space-y-4">
                  <h4 className="font-bold text-slate-800">Suivi des paiements</h4>
                  <div className="overflow-hidden rounded-xl border border-slate-100">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <tr>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Séances</th>
                          <th className="px-4 py-3">Montant</th>
                          <th className="px-4 py-3">Statut</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                         <tr className="text-sm">
                           <td className="px-4 py-3">15/01/2024</td>
                           <td className="px-4 py-3">8 séances</td>
                           <td className="px-4 py-3 font-bold">2 400 DH</td>
                           <td className="px-4 py-3">
                             <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-full uppercase">Payé</span>
                           </td>
                         </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Edit Patient Modal */}
      {isEditModalOpen && (
        <EditPatientModal 
          patient={patient} 
          onClose={() => setIsEditModalOpen(false)} 
        />
      )}
    </div>
  );
};

const EditPatientModal: React.FC<{ patient: Patient, onClose: () => void }> = ({ patient, onClose }) => {
  const { updatePatient, showToast } = useStore();
  const formRef = React.useRef<HTMLFormElement>(null);
  const [totalSessions, setTotalSessions] = useState(patient.totalSessionsPrescribed.toString());

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const lastName = (formData.get('lastName') as string) || '';
    const firstName = (formData.get('firstName') as string) || '';
    const birthDate = (formData.get('birthDate') as string) || '';
    const email = (formData.get('email') as string) || '';
    const phone = (formData.get('phone') as string) || '';
    const prescribingDoctor = (formData.get('prescribingDoctor') as string) || '';
    const pathology = (formData.get('pathology') as string) || '';
    const totalSessions = parseInt(formData.get('totalSessions') as string) || patient.totalSessionsPrescribed;

    // Validation
    if (!lastName || !firstName || !birthDate || !email || !phone || !prescribingDoctor || !pathology) {
      showToast("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    updatePatient(patient.id, {
      firstName,
      lastName,
      email,
      phone,
      gender: (formData.get('gender') as 'Homme' | 'Femme' | 'Autre') || 'Autre',
      cin: (formData.get('cin') as string) || '',
      socialSecurityNumber: (formData.get('socialSecurityNumber') as string) || '',
      birthDate,
      address: (formData.get('address') as string) || '',
      city: (formData.get('city') as string) || '',
      postalCode: (formData.get('postalCode') as string) || '',
      emergencyContactName: (formData.get('emergencyContactName') as string) || '',
      emergencyContactPhone: (formData.get('emergencyContactPhone') as string) || '',
      category: (formData.get('category') as PatientCategory) || PatientCategory.HORS_MUTUELLE,
      mutuelleName: (formData.get('mutuelleName') as string) || undefined,
      prescribingDoctor,
      pathology,
      totalSessionsPrescribed: totalSessions,
    });
    onClose();
  };

  const InputWrapper = ({ label, icon: Icon, children }: { label: string, icon: any, children: React.ReactNode }) => (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] flex items-center gap-2">
        <Icon size={12} className="text-sky-500" />
        {label}
      </label>
      {children}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[60] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-[2.5rem] w-full max-w-3xl shadow-2xl border border-white/20 overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-sky-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-sky-200">
              <Edit size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Modifier le Dossier</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{patient.lastName} {patient.firstName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-white hover:shadow-md rounded-2xl transition-all text-slate-400 hover:text-red-500">
            <X size={20} strokeWidth={3} />
          </button>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} className="p-8" noValidate>
          <div className="space-y-8 max-h-[60vh] overflow-y-auto pr-4 custom-scrollbar">
            {/* Section 1: Identité */}
            <div className="space-y-6">
              <h4 className="text-xs font-black text-sky-600 uppercase tracking-[0.2em] border-b border-sky-100 pb-2">1. Identité & État Civil</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputWrapper label="Nom de famille" icon={User}>
                  <input name="lastName" defaultValue={patient.lastName} className="w-full px-5 py-3.5 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-sky-500 focus:bg-white transition-all outline-none font-bold text-slate-700" placeholder="ex: DURAND" />
                </InputWrapper>
                <InputWrapper label="Prénom" icon={User}>
                  <input name="firstName" defaultValue={patient.firstName} className="w-full px-5 py-3.5 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-sky-500 focus:bg-white transition-all outline-none font-bold text-slate-700" placeholder="ex: Thomas" />
                </InputWrapper>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputWrapper label="Date de naissance" icon={Calendar}>
                  <input name="birthDate" type="date" defaultValue={patient.birthDate} className="w-full px-5 py-3.5 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-sky-500 focus:bg-white transition-all outline-none font-bold text-slate-700" />
                </InputWrapper>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] flex items-center gap-2">
                    <User size={12} className="text-sky-500" />
                    Genre
                  </label>
                  <div className="flex gap-4">
                    {['Homme', 'Femme', 'Autre'].map((g) => (
                      <label key={g} className="flex-1 cursor-pointer group">
                        <input type="radio" name="gender" value={g} className="hidden peer" defaultChecked={patient.gender === g} />
                        <div className="py-3 text-center rounded-2xl border-2 border-slate-100 peer-checked:border-sky-500 peer-checked:bg-sky-50 peer-checked:text-sky-600 font-bold text-slate-500 group-hover:bg-slate-50 transition-all">
                          {g}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputWrapper label="CIN / Passeport" icon={CreditCard}>
                  <input name="cin" defaultValue={patient.cin} className="w-full px-5 py-3.5 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-sky-500 focus:bg-white transition-all outline-none font-bold text-slate-700" placeholder="ex: AB123456" />
                </InputWrapper>
                <InputWrapper label="Numéro de Sécurité Sociale (NIR)" icon={Sparkles}>
                  <input name="socialSecurityNumber" defaultValue={patient.socialSecurityNumber} className="w-full px-5 py-3.5 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-sky-500 focus:bg-white transition-all outline-none font-bold text-slate-700" placeholder="1 85 06 75 123 456 78" />
                </InputWrapper>
              </div>
            </div>

            {/* Section 2: Coordonnées */}
            <div className="space-y-6">
              <h4 className="text-xs font-black text-sky-600 uppercase tracking-[0.2em] border-b border-sky-100 pb-2">2. Coordonnées & Adresse</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputWrapper label="Email" icon={Mail}>
                  <input name="email" type="email" defaultValue={patient.email} className="w-full px-5 py-3.5 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-sky-500 focus:bg-white transition-all outline-none font-bold text-slate-700" placeholder="contact@email.fr" />
                </InputWrapper>
                <InputWrapper label="Téléphone" icon={Phone}>
                  <input name="phone" defaultValue={patient.phone} className="w-full px-5 py-3.5 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-sky-500 focus:bg-white transition-all outline-none font-bold text-slate-700" placeholder="06 12 34 56 78" />
                </InputWrapper>
              </div>

              <InputWrapper label="Adresse complète" icon={MapPin}>
                <input name="address" defaultValue={patient.address} className="w-full px-5 py-3.5 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-sky-500 focus:bg-white transition-all outline-none font-bold text-slate-700" placeholder="12 rue de la Paix" />
              </InputWrapper>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputWrapper label="Code Postal" icon={MapPin}>
                  <input name="postalCode" defaultValue={patient.postalCode} className="w-full px-5 py-3.5 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-sky-500 focus:bg-white transition-all outline-none font-bold text-slate-700" placeholder="75001" />
                </InputWrapper>
                <InputWrapper label="Ville" icon={MapPin}>
                  <input name="city" defaultValue={patient.city} className="w-full px-5 py-3.5 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-sky-500 focus:bg-white transition-all outline-none font-bold text-slate-700" placeholder="Paris" />
                </InputWrapper>
              </div>

              <div className="p-6 bg-amber-50 rounded-[2rem] border border-amber-100 space-y-4">
                <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-2">
                  <AlertCircle size={14} />
                  Contact d'urgence
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input name="emergencyContactName" defaultValue={patient.emergencyContactName} className="w-full px-5 py-3 bg-white rounded-xl border-none focus:ring-2 focus:ring-amber-500 outline-none text-sm font-bold" placeholder="Nom du contact" />
                  <input name="emergencyContactPhone" defaultValue={patient.emergencyContactPhone} className="w-full px-5 py-3 bg-white rounded-xl border-none focus:ring-2 focus:ring-amber-500 outline-none text-sm font-bold" placeholder="Téléphone" />
                </div>
              </div>
            </div>

            {/* Section 3: Médical */}
            <div className="space-y-6">
              <h4 className="text-xs font-black text-sky-600 uppercase tracking-[0.2em] border-b border-sky-100 pb-2">3. Informations Médicales</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputWrapper label="Couverture Mutuelle" icon={CreditCard}>
                  <select name="category" defaultValue={patient.category} className="w-full px-5 py-3.5 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-sky-500 focus:bg-white transition-all outline-none font-bold text-slate-700 appearance-none">
                    <option value={PatientCategory.MUTUALISTE}>Mutualiste</option>
                    <option value={PatientCategory.HORS_MUTUELLE}>Hors Mutuelle (HN)</option>
                  </select>
                </InputWrapper>
                <InputWrapper label="Médecin Prescripteur" icon={Stethoscope}>
                  <input name="prescribingDoctor" defaultValue={patient.prescribingDoctor} className="w-full px-5 py-3.5 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-sky-500 focus:bg-white transition-all outline-none font-bold text-slate-700" placeholder="Dr. Martin" />
                </InputWrapper>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputWrapper label="Nombre de séances prescrites" icon={Calendar}>
                  <div className="space-y-3">
                    <input 
                      type="number"
                      name="totalSessions" 
                      value={totalSessions}
                      onChange={(e) => setTotalSessions(e.target.value)}
                      className="w-full px-5 py-3.5 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-sky-500 focus:bg-white transition-all outline-none font-bold text-slate-700" 
                      placeholder="ex: 10"
                    />
                    <div className="flex flex-wrap gap-2">
                      {['10', '15', '20', '30', '50'].map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setTotalSessions(val)}
                          className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition-all border-2 ${
                            totalSessions === val 
                              ? 'bg-sky-600 border-sky-600 text-white shadow-lg shadow-sky-100' 
                              : 'bg-white border-slate-100 text-slate-400 hover:border-sky-200 hover:text-sky-600'
                          }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>
                </InputWrapper>
              </div>

              <InputWrapper label="Motif de consultation / Pathologie" icon={AlertCircle}>
                <textarea name="pathology" defaultValue={patient.pathology} className="w-full px-5 py-3.5 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-sky-500 focus:bg-white transition-all outline-none h-32 resize-none font-bold text-slate-700" placeholder="Décrivez brièvement le diagnostic initial..."></textarea>
              </InputWrapper>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-8 flex gap-4 border-t border-slate-100 mt-8">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-8 py-4 border-2 border-slate-100 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all"
            >
              Annuler
            </button>
            <div className="flex-1" />
            <button 
              type="submit" 
              className="px-12 py-4 bg-sky-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-sky-200 hover:bg-sky-700 transition-all active:scale-95 flex items-center gap-2"
            >
              <Save size={16} />
              Enregistrer les modifications
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PatientDetail;
