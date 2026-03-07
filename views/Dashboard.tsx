
import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useStore } from '../store';
import { useNavigate } from 'react-router-dom';
import { format, subDays, isSameDay, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
import { UserPermission } from '../types';

const Dashboard: React.FC = () => {
  const { setPatientModalOpen, appointments, setSelectedPatientId, setAppointmentModalOpen, invoices, patients, currentUser } = useStore();
  const navigate = useNavigate();

  const canManagePatients = (currentUser?.permissions || []).includes(UserPermission.MANAGE_PATIENTS);
  const canManageAgenda = (currentUser?.permissions || []).includes(UserPermission.MANAGE_AGENDA);
  const canManageBilling = (currentUser?.permissions || []).includes(UserPermission.MANAGE_BILLING);
  const canViewStats = (currentUser?.permissions || []).includes(UserPermission.VIEW_STATS);

  const pendingInvoices = invoices.filter(inv => inv.status === 'Impayé' || inv.status === 'En cours');
  
  // Calculate stats
  const sessionsToday = appointments.filter(app => {
    try {
      return app.date && isSameDay(parseISO(app.date), new Date());
    } catch (e) {
      return false;
    }
  }).length;
  
  const currentMonthStart = startOfMonth(new Date());
  const currentMonthEnd = endOfMonth(new Date());
  
  const newPatientsThisMonth = patients.filter(p => {
    try {
      if (!p.createdAt) return false;
      const pDate = parseISO(p.createdAt);
      return isWithinInterval(pDate, { start: currentMonthStart, end: currentMonthEnd });
    } catch (e) {
      return false;
    }
  }).length;

  const revenueThisMonth = invoices.filter(inv => {
    try {
      if (!inv.date) return false;
      const invDate = parseISO(inv.date);
      return isWithinInterval(invDate, { start: currentMonthStart, end: currentMonthEnd });
    } catch (e) {
      return false;
    }
  }).reduce((acc, inv) => acc + inv.amount, 0);

  // Weekly activity data
  const weeklyData = useMemo(() => {
    const days = Array.from({ length: 6 }, (_, i) => subDays(new Date(), 5 - i));
    return days.map(day => {
      const dayStr = format(day, 'EEE', { locale: fr });
      const count = appointments.filter(app => {
        try {
          return app.date && isSameDay(parseISO(app.date), day);
        } catch (e) {
          return false;
        }
      }).length;
      return { name: dayStr, patients: count };
    });
  }, [appointments]);

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Bonjour, {currentUser?.firstName}</h2>
          <p className="text-slate-500">Voici un résumé de l'activité de votre cabinet aujourd'hui.</p>
        </div>
        {canManagePatients && (
          <button 
            onClick={() => setPatientModalOpen(true)}
            className="bg-sky-600 text-white px-6 py-2 rounded-xl font-semibold hover:bg-sky-700 transition-colors shadow-lg shadow-sky-100"
          >
            + Nouveau Patient
          </button>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Séances Aujourd\'hui', value: sessionsToday.toString(), change: '+2', color: 'bg-sky-500', show: canManageAgenda },
          { label: 'Nouveaux Patients (Mois)', value: newPatientsThisMonth.toString(), change: '+1', color: 'bg-emerald-500', show: canManagePatients },
          { label: 'Chiffre d\'Affaires (Mois)', value: `${revenueThisMonth.toLocaleString('fr-FR')} DH`, change: '+12%', color: 'bg-violet-500', show: canManageBilling },
          { label: 'Factures en attente', value: pendingInvoices.length.toString(), change: '-2', color: 'bg-amber-500', show: canManageBilling },
        ].filter(s => s.show).map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">{stat.label}</p>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-3xl font-bold whitespace-nowrap">{stat.value}</span>
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${stat.change.startsWith('+') ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                {stat.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {canViewStats && (
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="text-lg font-bold mb-6">Activité des 6 derniers jours</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                < BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="patients" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {canManageAgenda && (
          <div className={`${canViewStats ? 'lg:col-span-1' : 'lg:col-span-3'} bg-white p-6 rounded-2xl border border-slate-100 shadow-sm`}>
            <h3 className="text-lg font-bold mb-6">Prochains Rendez-vous</h3>
            <div className="space-y-4">
              {appointments.slice(0, 5).map((rdv, i) => (
                <div 
                  key={i} 
                  onClick={() => navigate(`/patients/${rdv.patientId}`)}
                  className="flex items-center gap-4 p-3 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer group border border-transparent hover:border-slate-100"
                >
                  <div className="text-xs font-bold text-sky-600 bg-sky-50 w-12 h-12 flex items-center justify-center rounded-lg flex-shrink-0">
                    {rdv.startTime}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{rdv.patientName}</p>
                    <p className="text-xs text-slate-500">{rdv.type}</p>
                  </div>
                  <div className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                    {rdv.status}
                  </div>
                </div>
              ))}
              {appointments.length === 0 && (
                <p className="text-sm text-slate-400 py-4 text-center">Aucun rendez-vous prévu.</p>
              )}
            </div>
            <button 
              onClick={() => navigate('/agenda')}
              className="w-full mt-6 text-sm font-semibold text-sky-600 hover:text-sky-700"
            >
              Voir tout l'agenda →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
