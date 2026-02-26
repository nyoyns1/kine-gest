
import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar, LineChart, Line } from 'recharts';
import { useStore } from '../store';
import { PatientCategory, UserRole } from '../types';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO, differenceInYears } from 'date-fns';
import { fr } from 'date-fns/locale';
import { TrendingUp, Users, CreditCard, Calendar, Activity, Heart, Star, Briefcase, PieChart as PieIcon, DollarSign } from 'lucide-react';

const Stats: React.FC = () => {
  const { patients, invoices, appointments, expenses, users } = useStore();

  // Advanced Financial Performance (Revenue vs Expenses vs Profit)
  const financialPerformanceData = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => subMonths(new Date(), 5 - i));
    
    return months.map(month => {
      const start = startOfMonth(month);
      const end = endOfMonth(month);
      const monthStr = format(month, 'MMM', { locale: fr });

      const monthInvoices = invoices.filter(inv => {
        const invDate = parseISO(inv.date);
        return isWithinInterval(invDate, { start, end });
      });

      const monthExpenses = expenses.filter(exp => {
        const expDate = parseISO(exp.date);
        return isWithinInterval(expDate, { start, end });
      });

      const revenue = monthInvoices.reduce((acc, inv) => acc + inv.amount, 0);
      const cost = monthExpenses.reduce((acc, exp) => acc + exp.amount, 0);
      
      return {
        month: monthStr,
        revenue,
        expenses: cost,
        profit: revenue - cost
      };
    });
  }, [invoices, expenses]);

  // Therapist Workload (Appointments per therapist)
  const therapistWorkloadData = useMemo(() => {
    const therapists = users.filter(u => u.role === UserRole.THERAPEUTE || u.role === UserRole.ADMIN);
    
    return therapists.map(t => {
      const count = appointments.filter(app => app.therapistId === t.id).length;
      return {
        name: `${t.firstName} ${t.lastName}`,
        appointments: count
      };
    }).filter(d => d.appointments > 0);
  }, [users, appointments]);

  // Patient Demographics (Age Distribution)
  const ageDemographicsData = useMemo(() => {
    const ageGroups = {
      '0-18': 0,
      '19-35': 0,
      '36-50': 0,
      '51-70': 0,
      '70+': 0
    };

    patients.forEach(p => {
      const age = differenceInYears(new Date(), parseISO(p.birthDate));
      if (age <= 18) ageGroups['0-18']++;
      else if (age <= 35) ageGroups['19-35']++;
      else if (age <= 50) ageGroups['36-50']++;
      else if (age <= 70) ageGroups['51-70']++;
      else ageGroups['70+']++;
    });

    const colors = ['#38bdf8', '#818cf8', '#c084fc', '#f472b6', '#fb923c'];
    return Object.entries(ageGroups).map(([name, value], index) => ({
      name,
      value,
      color: colors[index]
    }));
  }, [patients]);

  // Calculate revenue and patient growth over the last 6 months
  const activityData = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => subMonths(new Date(), 5 - i));
    
    return months.map(month => {
      const start = startOfMonth(month);
      const end = endOfMonth(month);
      const monthStr = format(month, 'MMM', { locale: fr });

      const monthInvoices = invoices.filter(inv => {
        const invDate = parseISO(inv.date);
        return isWithinInterval(invDate, { start, end });
      });

      const monthRevenue = monthInvoices.reduce((acc, inv) => acc + inv.amount, 0);
      
      const monthNewPatients = patients.filter(p => {
        const pDate = parseISO(p.createdAt);
        return isWithinInterval(pDate, { start, end });
      }).length;

      return {
        month: monthStr,
        revenue: monthRevenue,
        patients: monthNewPatients
      };
    });
  }, [invoices, patients]);

  // Calculate patient category distribution
  const categoryData = useMemo(() => {
    const counts = patients.reduce((acc, p) => {
      acc[p.category] = (acc[p.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return [
      { name: 'Mutualistes', value: counts[PatientCategory.MUTUALISTE] || 0, color: '#0ea5e9' },
      { name: 'Hors Mutuelle', value: counts[PatientCategory.HORS_MUTUELLE] || 0, color: '#f59e0b' },
    ];
  }, [patients]);

  // Calculate session volume by type
  const sessionTypeData = useMemo(() => {
    const counts = appointments.reduce((acc, app) => {
      acc[app.type] = (acc[app.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [appointments]);

  // Calculate pathology distribution
  const pathologyData = useMemo(() => {
    const counts = patients.reduce((acc, p) => {
      acc[p.pathology] = (acc[p.pathology] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const colors = ['#0ea5e9', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444'];
    return Object.entries(counts).map(([name, value], index) => ({
      name,
      value,
      color: colors[index % colors.length]
    }));
  }, [patients]);

  // Calculate average recovery and satisfaction by pathology
  const clinicalMetricsData = useMemo(() => {
    const groups = patients.reduce((acc, p) => {
      const path = p.pathology || 'Inconnue';
      if (!acc[path]) {
        acc[path] = { recovery: 0, satisfaction: 0, count: 0 };
      }
      acc[path].recovery += p.recoveryRate || 0;
      acc[path].satisfaction += p.satisfactionRate || 0;
      acc[path].count += 1;
      return acc;
    }, {} as Record<string, { recovery: number, satisfaction: number, count: number }>);

    return Object.entries(groups).map(([name, data]) => {
      const d = data as { recovery: number; satisfaction: number; count: number };
      return {
        name,
        recovery: Math.round(d.recovery / d.count),
        satisfaction: Number((d.satisfaction / d.count).toFixed(1))
      };
    });
  }, [patients]);

  const totalRevenue = invoices.reduce((acc, inv) => acc + inv.amount, 0);
  const totalExpenses = expenses.reduce((acc, exp) => acc + exp.amount, 0);
  const totalProfit = totalRevenue - totalExpenses;
  const totalPatients = patients.length;
  const totalSessions = appointments.length;
  const averageRevenuePerPatient = totalPatients > 0 ? (totalRevenue / totalPatients).toFixed(0) : 0;

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-800">Reporting Avancé</h2>
          <p className="text-slate-500">Analyses détaillées de la charge de travail, démographie et performance financière.</p>
        </div>
        <div className="text-right hidden md:block">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Dernière mise à jour</p>
          <p className="text-sm font-medium text-slate-600">{format(new Date(), 'dd MMMM yyyy HH:mm', { locale: fr })}</p>
        </div>
      </header>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-sky-50 text-sky-600 rounded-lg">
              <DollarSign size={20} />
            </div>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">Profit</span>
          </div>
          <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Bénéfice Net</p>
          <p className="text-2xl font-bold mt-1">{totalProfit.toLocaleString('fr-FR')} DH</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
              <TrendingUp size={20} />
            </div>
            <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-full">Dépenses</span>
          </div>
          <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Total Dépenses</p>
          <p className="text-2xl font-bold mt-1">{totalExpenses.toLocaleString('fr-FR')} DH</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <Users size={20} />
            </div>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">+5</span>
          </div>
          <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Total Patients</p>
          <p className="text-2xl font-bold mt-1">{totalPatients}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-violet-50 text-violet-600 rounded-lg">
              <Calendar size={20} />
            </div>
            <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-full">Stable</span>
          </div>
          <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Volume Séances</p>
          <p className="text-2xl font-bold mt-1">{totalSessions}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <CreditCard size={20} />
            </div>
          </div>
          <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Panier Moyen</p>
          <p className="text-2xl font-bold mt-1">{averageRevenuePerPatient.toLocaleString('fr-FR')} DH</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Financial Performance Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <DollarSign size={18} className="text-emerald-500" />
            Performance Financière (6 mois)
          </h3>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={financialPerformanceData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend />
                <Line type="monotone" dataKey="revenue" name="Revenus" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="expenses" name="Dépenses" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="profit" name="Bénéfice" stroke="#0ea5e9" strokeWidth={3} strokeDasharray="5 5" dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Therapist Workload Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <Briefcase size={18} className="text-sky-500" />
            Charge de Travail par Thérapeute
          </h3>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={therapistWorkloadData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="appointments" name="Nombre de RDV" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Patient Age Demographics */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <PieIcon size={18} className="text-violet-500" />
            Démographie (Âge des Patients)
          </h3>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={ageDemographicsData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {ageDemographicsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                   contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Patient Distribution Pie Chart (Mutualiste vs Hors Mutuelle) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold mb-6">Répartition de la Patientèle</h3>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                   contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Session Volume Bar Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold mb-6">Volume de Séances par Type</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sessionTypeData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Growth Stats */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center">
          <h3 className="text-lg font-bold mb-6">Indicateurs de Croissance</h3>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-500">Nouveaux Patients (Mois)</span>
                <span className="font-bold text-emerald-600">+15%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full w-[65%] rounded-full"></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-500">Taux de Rétention</span>
                <span className="font-bold text-sky-600">92%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-sky-500 h-full w-[92%] rounded-full"></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-500">Objectif CA Mensuel</span>
                <span className="font-bold text-violet-600">78%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-violet-500 h-full w-[78%] rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Clinical Analysis Section */}
      <div className="pt-8 border-t border-slate-100">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
            <Activity size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-slate-800">Analyse Clinique & Qualité</h3>
            <p className="text-slate-500 text-sm">Performance thérapeutique et satisfaction patient par pathologie.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Pathology Distribution */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <Heart size={18} className="text-rose-500" />
              Répartition par Pathologie
            </h3>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pathologyData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={120}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {pathologyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                     contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recovery and Satisfaction Bar Chart */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <Star size={18} className="text-amber-500" />
              Performance & Satisfaction
            </h3>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={clinicalMetricsData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} width={120} />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend />
                  <Bar dataKey="recovery" name="Taux de Récupération (%)" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
                  <Bar dataKey="satisfaction" name="Satisfaction (/10)" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Stats;
