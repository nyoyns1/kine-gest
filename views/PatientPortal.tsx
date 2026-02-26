
import React, { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { UserRole, UserPermission, Exercise, Message } from '../types';
import { 
  Activity, 
  Calendar, 
  CheckCircle2, 
  ChevronRight, 
  CreditCard, 
  Download, 
  MessageSquare, 
  Play, 
  Send, 
  Trophy, 
  User as UserIcon,
  Video,
  Camera,
  ArrowUpRight,
  Clock,
  Star,
  LogOut
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

const PatientPortal: React.FC = () => {
  const { 
    currentUser, 
    patients, 
    appointments, 
    exercises, 
    messages, 
    sendMessage, 
    completeExercise, 
    invoices,
    assessments,
    logout,
    cancelAppointment
  } = useStore();

  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'exercises' | 'billing' | 'chat' | 'gamification'>('dashboard');
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const patient = useMemo(() => 
    patients.find(p => p.email === currentUser?.email), 
    [patients, currentUser]
  );

  const patientAppointments = useMemo(() => 
    appointments.filter(a => a.patientId === patient?.id),
    [appointments, patient]
  );

  const nextAppointment = useMemo(() => 
    patientAppointments.find(a => new Date(a.date) >= new Date() && a.status === 'Confirmé'),
    [patientAppointments]
  );

  const addToCalendar = (app: any) => {
    const title = `Séance de Kinésithérapie - KinéGest Pro`;
    const details = `Séance de kinésithérapie au ${app.type}`;
    const startTime = `${app.date.replace(/-/g, '')}T${app.startTime.replace(/:/g, '')}00`;
    const endTime = `${app.date.replace(/-/g, '')}T${(parseInt(app.startTime.split(':')[0]) + 1).toString().padStart(2, '0')}${app.startTime.split(':')[1].replace(/:/g, '')}00`;
    
    const googleUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${startTime}/${endTime}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(app.type)}&sf=true&output=xml`;
    
    window.open(googleUrl, '_blank');
  };

  const evolutionData = useMemo(() => {
    if (!patient) return [];
    const patientAssessments = assessments.filter(a => a.patientId === patient.id);
    return patientAssessments.map(a => ({
      date: format(parseISO(a.date), 'dd MMM', { locale: fr }),
      pain: a.pain.eva,
      mobility: a.jointTests[0]?.value || 0,
      strength: a.muscleTests[0]?.force || 0
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [patient, assessments]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !patient) return;
    // For demo, we send message to therapist 'u2'
    sendMessage(chatInput, 'u2');
    setChatInput('');
    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  if (!patient) return <div>Chargement...</div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-20 md:pb-0">
      {/* Mobile Header */}
      <header className="bg-white border-b border-slate-200 p-4 sticky top-0 z-30 md:hidden">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold text-sky-600">KinéGest Pro</h1>
          <div className="flex items-center gap-3">
            <div className="bg-sky-50 text-sky-600 px-3 py-1 rounded-full text-xs font-bold">
              {patient.gamification.points} pts
            </div>
            <button 
              onClick={() => { logout(); navigate('/login'); }}
              className="p-2 text-slate-400 hover:text-red-500 transition-colors"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Sidebar Navigation (Desktop) */}
          <aside className="hidden lg:block space-y-4">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-20 h-20 bg-sky-100 rounded-full flex items-center justify-center text-sky-600 mb-3">
                  <UserIcon size={40} />
                </div>
                <h2 className="font-bold text-lg">{patient.firstName} {patient.lastName}</h2>
                <p className="text-sm text-slate-500">{patient.pathology}</p>
              </div>
              
              <nav className="space-y-1">
                {[
                  { id: 'dashboard', label: 'Tableau de bord', icon: Activity },
                  { id: 'exercises', label: 'Mes Exercices', icon: Video },
                  { id: 'billing', label: 'Facturation', icon: CreditCard },
                  { id: 'chat', label: 'Messagerie', icon: MessageSquare },
                  { id: 'gamification', label: 'Fidélité', icon: Trophy },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as any)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all ${
                      activeTab === item.id 
                        ? 'bg-sky-600 text-white shadow-lg shadow-sky-100' 
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <item.icon size={18} />
                    {item.label}
                  </button>
                ))}
              </nav>

              <div className="mt-8 pt-6 border-t border-slate-100">
                <button 
                  onClick={() => { logout(); navigate('/login'); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold text-red-500 hover:bg-red-50 transition-all"
                >
                  <LogOut size={18} />
                  Déconnexion
                </button>
              </div>
            </div>

            <div className="bg-gradient-to-br from-sky-600 to-indigo-600 p-6 rounded-3xl text-white shadow-xl shadow-sky-100">
              <div className="flex items-center justify-between mb-4">
                <Trophy size={24} />
                <span className="text-xs font-bold uppercase tracking-wider opacity-80">Niveau 2</span>
              </div>
              <p className="text-2xl font-bold mb-1">{patient.gamification.points} Points</p>
              <p className="text-xs opacity-80 mb-4">Plus que 350 pts pour votre récompense !</p>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white transition-all duration-1000" 
                  style={{ width: `${(patient.gamification.points / 500) * 100}%` }}
                />
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="lg:col-span-3 space-y-8 p-4 md:p-0">
            
            {activeTab === 'dashboard' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Profile Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="p-3 bg-sky-50 text-sky-600 rounded-2xl">
                        <Calendar size={24} />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Prochain RDV</p>
                        <p className="font-bold">{nextAppointment ? format(parseISO(nextAppointment.date), 'dd MMMM', { locale: fr }) : 'Aucun'}</p>
                      </div>
                    </div>
                    <p className="text-sm text-slate-500">
                      {nextAppointment ? `À ${nextAppointment.startTime} au ${nextAppointment.type}` : 'Prenez rendez-vous avec votre kiné.'}
                    </p>
                    {nextAppointment && (
                      <div className="mt-4 flex gap-2">
                        <button 
                          onClick={() => addToCalendar(nextAppointment)}
                          className="flex-1 flex items-center justify-center gap-2 bg-sky-50 text-sky-600 py-2 rounded-xl text-xs font-bold hover:bg-sky-100 transition-all"
                        >
                          <Calendar size={14} /> Ajouter au calendrier
                        </button>
                        <button 
                          onClick={() => {
                            if (confirm("Voulez-vous vraiment annuler ce rendez-vous ?")) {
                              cancelAppointment(nextAppointment.id);
                            }
                          }}
                          className="px-3 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 transition-all"
                        >
                          Annuler
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                        <Activity size={24} />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Objectif</p>
                        <p className="font-bold">Récupération 80%</p>
                      </div>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 w-[65%]" />
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="p-3 bg-violet-50 text-violet-600 rounded-2xl">
                        <CheckCircle2 size={24} />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Séances</p>
                        <p className="font-bold">{patient.sessionsRemaining} restantes</p>
                      </div>
                    </div>
                    <p className="text-sm text-slate-500">Sur {patient.totalSessionsPrescribed} prescrites</p>
                  </div>
                </div>

                {/* Evolution Charts */}
                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="text-xl font-bold">Mon Évolution</h3>
                    <div className="flex gap-2">
                      <span className="flex items-center gap-1 text-xs font-bold text-sky-600 bg-sky-50 px-2 py-1 rounded-lg">
                        <div className="w-2 h-2 rounded-full bg-sky-600" /> Douleur
                      </span>
                      <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                        <div className="w-2 h-2 rounded-full bg-emerald-600" /> Mobilité
                      </span>
                    </div>
                  </div>
                  
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={evolutionData.length > 0 ? evolutionData : [
                        { date: '1 Mai', pain: 8, mobility: 30 },
                        { date: '5 Mai', pain: 6, mobility: 45 },
                        { date: '10 Mai', pain: 4, mobility: 60 },
                        { date: '15 Mai', pain: 3, mobility: 75 },
                        { date: '20 Mai', pain: 2, mobility: 85 },
                      ]}>
                        <defs>
                          <linearGradient id="colorPain" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorMob" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        />
                        <Area type="monotone" dataKey="pain" stroke="#0ea5e9" strokeWidth={3} fillOpacity={1} fill="url(#colorPain)" />
                        <Area type="monotone" dataKey="mobility" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorMob)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'exercises' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <header>
                  <h3 className="text-2xl font-bold">Mes Exercices Vidéos</h3>
                  <p className="text-slate-500">Réalisez vos exercices quotidiennement pour gagner des points.</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {exercises.map((ex) => (
                    <div key={ex.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden group">
                      <div className="aspect-video bg-slate-900 relative">
                        <iframe 
                          src={ex.videoUrl} 
                          className="w-full h-full"
                          title={ex.title}
                          allowFullScreen
                        />
                      </div>
                      <div className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h4 className="font-bold text-lg">{ex.title}</h4>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{ex.date}</p>
                          </div>
                          {ex.isCompleted ? (
                            <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                              <CheckCircle2 size={14} /> Complété
                            </span>
                          ) : (
                            <button 
                              onClick={() => completeExercise(ex.id)}
                              className="bg-sky-600 text-white px-4 py-1.5 rounded-full text-xs font-bold hover:bg-sky-700 transition-all active:scale-95"
                            >
                              Valider l'exercice
                            </button>
                          )}
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl">
                          <p className="text-xs font-bold text-slate-500 uppercase mb-1">Commentaire du kiné</p>
                          <p className="text-sm text-slate-700 italic">"{ex.therapistComment}"</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'billing' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <header className="flex justify-between items-center">
                  <div>
                    <h3 className="text-2xl font-bold">Facturation & Paiements</h3>
                    <p className="text-slate-500">Consultez vos factures et l'état de vos règlements.</p>
                  </div>
                </header>

                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                        <th className="px-6 py-4">Facture</th>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4">Montant</th>
                        <th className="px-6 py-4">Statut</th>
                        <th className="px-6 py-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {invoices.filter(inv => inv.patientId === patient.id).map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 font-bold text-sm">{inv.id}</td>
                          <td className="px-6 py-4 text-sm text-slate-500">{inv.date}</td>
                          <td className="px-6 py-4 font-bold text-sm">{inv.amount} DH</td>
                          <td className="px-6 py-4">
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
                              inv.status === 'Payé' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                            }`}>
                              {inv.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button className="p-2 text-sky-600 hover:bg-sky-50 rounded-xl transition-colors">
                              <Download size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'chat' && (
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm h-[600px] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="p-6 border-b border-slate-100 flex items-center gap-4">
                  <div className="w-12 h-12 bg-sky-100 rounded-full flex items-center justify-center text-sky-600 font-bold">
                    SL
                  </div>
                  <div>
                    <h4 className="font-bold">Sarah Lemoine</h4>
                    <div className="text-xs text-emerald-500 flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" /> En ligne
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {messages.filter(m => m.senderId === patient.id || m.receiverId === patient.id).map((m) => (
                    <div key={m.id} className={`flex ${m.senderId === patient.id ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] p-4 rounded-2xl text-sm ${
                        m.senderId === patient.id 
                          ? 'bg-sky-600 text-white rounded-tr-none' 
                          : 'bg-slate-100 text-slate-800 rounded-tl-none'
                      }`}>
                        {m.imageUrl && (
                          <img src={m.imageUrl} alt="Post" className="rounded-lg mb-2 max-w-full h-auto" />
                        )}
                        <p>{m.content}</p>
                        <p className={`text-[10px] mt-1 opacity-60 ${m.senderId === patient.id ? 'text-right' : 'text-left'}`}>
                          {format(parseISO(m.timestamp), 'HH:mm')}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>

                <form onSubmit={handleSendMessage} className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
                  <button type="button" className="p-3 text-slate-400 hover:text-sky-600 transition-colors">
                    <Camera size={20} />
                  </button>
                  <input 
                    type="text" 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Tapez votre message..."
                    className="flex-1 bg-white border-none rounded-2xl px-4 py-2 focus:ring-2 focus:ring-sky-500 outline-none text-sm"
                  />
                  <button type="submit" className="p-3 bg-sky-600 text-white rounded-2xl hover:bg-sky-700 transition-all active:scale-95">
                    <Send size={20} />
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'gamification' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Points Summary */}
                  <div className="bg-gradient-to-br from-sky-600 to-indigo-700 p-8 rounded-3xl text-white shadow-xl">
                    <div className="flex justify-between items-start mb-8">
                      <div>
                        <p className="text-sky-100 text-sm font-bold uppercase tracking-wider mb-1">Mon Solde</p>
                        <h3 className="text-5xl font-bold">{patient.gamification.points} <span className="text-2xl font-normal opacity-60">pts</span></h3>
                      </div>
                      <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                        <Trophy size={32} />
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between text-sm font-bold">
                        <span>Prochaine récompense</span>
                        <span>{Math.round((patient.gamification.points / 500) * 100)}%</span>
                      </div>
                      <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.5)] transition-all duration-1000" 
                          style={{ width: `${(patient.gamification.points / 500) * 100}%` }}
                        />
                      </div>
                      <p className="text-xs text-sky-100">Gagnez encore 350 points pour débloquer "Pressothérapie offerte".</p>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold flex items-center gap-2">
                        <Star className="text-amber-500" size={24} /> Mes Badges
                      </h3>
                      <div className="flex items-center gap-2 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                        <Clock size={14} className="text-slate-400" />
                        <span className="text-xs font-bold text-slate-600">Retards : {patient.gamification.delayCount || 0}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      {patient.gamification.badges.map((badge) => (
                        <div key={badge.id} className="flex flex-col items-center text-center group">
                          <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center text-3xl mb-2 group-hover:scale-110 transition-transform">
                            {badge.icon}
                          </div>
                          <p className="text-[10px] font-bold text-slate-800 leading-tight">{badge.name}</p>
                        </div>
                      ))}
                      {[1, 2].map(i => (
                        <div key={i} className="flex flex-col items-center text-center opacity-30 grayscale">
                          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-3xl mb-2">
                            🔒
                          </div>
                          <p className="text-[10px] font-bold text-slate-800 leading-tight">Verrouillé</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Points History & Rules */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                    <h3 className="text-xl font-bold mb-6">Comment gagner des points ?</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { label: 'Séance honorée', pts: '+10', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                        { label: 'Exercice à la maison', pts: '+5', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                        { label: 'Parrainage', pts: '+50', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                        { label: 'Amélioration mobilité', pts: '+20', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                        { label: 'Annulation tardive', pts: '-20', color: 'text-red-600', bg: 'bg-red-50' },
                        { label: 'Retard séance', pts: '-10', color: 'text-red-600', bg: 'bg-red-50' },
                      ].map((rule, i) => (
                        <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                          <span className="text-sm font-semibold text-slate-700">{rule.label}</span>
                          <span className={`font-bold ${rule.color} ${rule.bg} px-3 py-1 rounded-full text-xs`}>{rule.pts} pts</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                    <h3 className="text-xl font-bold mb-6">Récompenses</h3>
                    <div className="space-y-4">
                      {patient.gamification.rewards.map((reward) => (
                        <div key={reward.id} className={`p-4 rounded-2xl border ${reward.isUnlocked ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                          <div className="flex justify-between items-start mb-2">
                            <h4 className={`font-bold text-sm ${reward.isUnlocked ? 'text-emerald-900' : 'text-slate-900'}`}>{reward.name}</h4>
                            <span className="text-[10px] font-bold uppercase tracking-wider">{reward.pointsRequired} pts</span>
                          </div>
                          <p className="text-xs text-slate-500">{reward.description}</p>
                          {reward.isUnlocked && (
                            <button className="w-full mt-3 bg-emerald-600 text-white py-2 rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all">
                              Utiliser maintenant
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

          </main>
        </div>
      </div>

      {/* Mobile Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-2 flex justify-around items-center md:hidden z-40">
        {[
          { id: 'dashboard', icon: Activity },
          { id: 'exercises', icon: Video },
          { id: 'chat', icon: MessageSquare },
          { id: 'gamification', icon: Trophy },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as any)}
            className={`p-3 rounded-2xl transition-all ${
              activeTab === item.id ? 'bg-sky-50 text-sky-600' : 'text-slate-400'
            }`}
          >
            <item.icon size={24} />
          </button>
        ))}
      </nav>
    </div>
  );
};

export default PatientPortal;
