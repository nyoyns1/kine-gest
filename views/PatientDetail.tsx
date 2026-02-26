
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Patient, PatientCategory, SessionNote, UserRole, UserPermission } from '../types';
import { generateClinicalReport } from '../geminiService';
import { useStore } from '../store';
import BilanDiagnostic from './BilanDiagnostic';
import { FileDown, Sparkles, ChevronLeft, Clock } from 'lucide-react';
import { exportEvaluationToPDF } from '../src/utils/pdfExport';

const mockNotes: SessionNote[] = [
  { id: '101', patientId: '1', date: '2024-01-05', eva: 7, content: 'Douleur intense au réveil. Oedème persistant. Travail circulatoire et drainage.', objectives: ['Diminuer oedème'], progress: 10 },
  { id: '102', patientId: '1', date: '2024-01-12', eva: 4, content: 'Oedème en nette régression. Amplitudes articulaires : 10° en flexion dorsale. Début proprioception.', objectives: ['Gagner en flexion dorsale'], progress: 35 },
  { id: '103', patientId: '1', date: '2024-01-19', eva: 2, content: 'Marche sans boiterie. Proprioception sur plan stable OK. Début fentes légères.', objectives: ['Stabilisation'], progress: 60 },
];

const PatientDetail: React.FC = () => {
  const { id } = useParams();
  const { patients, setAppointmentModalOpen, setSelectedPatientId, showToast, reportPatientDelay, appointments, cancelAppointment, sessionNotes, deleteSessionNote, addSessionNote } = useStore();
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

  const patient = patients.find(p => p.id === id);
  const { assessments, currentUser } = useStore();
  const patientAssessments = assessments.filter(a => a.patientId === id);
  const patientNotes = sessionNotes.filter(n => n.patientId === id);

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
          <h2 className="text-2xl font-bold">{patient.lastName} {patient.firstName}</h2>
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
          <button className="hidden md:block px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold hover:bg-white transition-colors">Modifier</button>
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
              {patient.firstName[0]}{patient.lastName[0]}
            </div>
            <div className="text-center space-y-1 mb-6">
              <p className="font-bold text-lg">{patient.firstName} {patient.lastName}</p>
              <p className="text-xs text-slate-400">{patient.birthDate}</p>
            </div>
            
            <div className="space-y-4 pt-4 border-t border-slate-50">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">CIN</p>
                <p className="text-sm font-medium">{patient.cin || 'Non renseigné'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Contact</p>
                <p className="text-sm font-medium">{patient.phone}</p>
                <p className="text-sm text-slate-500">{patient.email}</p>
              </div>
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
                  <section className="space-y-4">
                    <h4 className="font-bold flex items-center gap-2">
                      <div className="w-2 h-6 bg-sky-500 rounded-full"></div>
                      Évaluation Initiale (Identité & Prescriptions)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-4 rounded-xl space-y-3 border border-slate-100">
                         <div>
                          <p className="text-xs font-bold text-slate-400 uppercase">Motif de consultation</p>
                          <p className="text-sm font-medium">{patient.pathology}</p>
                        </div>
                      </div>
                       <div className="bg-slate-50 p-4 rounded-xl space-y-3 border border-slate-100">
                         <div>
                          <p className="text-xs font-bold text-slate-400 uppercase">Antécédents</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {patient.antecedents.map((a, i) => (
                              <span key={i} className="px-2 py-1 bg-white border border-slate-200 text-xs rounded-lg text-slate-600 font-medium">{a}</span>
                            ))}
                            {patient.antecedents.length === 0 && <span className="text-xs text-slate-400 italic">Aucun antécédent noté.</span>}
                          </div>
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
    </div>
  );
};

export default PatientDetail;
