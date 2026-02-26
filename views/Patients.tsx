
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Patient, PatientCategory } from '../types';
import { useStore } from '../store';

const Patients: React.FC = () => {
  const { patients, setPatientModalOpen } = useStore();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | PatientCategory>('all');
  const navigate = useNavigate();

  const filteredPatients = patients.filter(p => {
    const searchLower = search.toLowerCase();
    const matchesSearch = 
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchLower) ||
      p.pathology.toLowerCase().includes(searchLower) ||
      p.phone.includes(search) ||
      (p.cin && p.cin.toLowerCase().includes(searchLower));
    
    const matchesFilter = filter === 'all' || p.category === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-800">Gestion des Patients</h2>
          <p className="text-slate-500">Gérez votre base de patients et leurs dossiers médicaux.</p>
        </div>
        <button 
          onClick={() => setPatientModalOpen(true)}
          className="bg-sky-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-sky-700 transition-all flex items-center justify-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
          Nouveau Patient
        </button>
      </header>

      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              type="text"
              placeholder="Rechercher un patient (nom, pathologie, téléphone, CIN...)"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-sky-500 outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <select
              className="bg-slate-50 border-none rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-sky-500 outline-none"
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
            >
              <option value="all">Tous les statuts</option>
              <option value={PatientCategory.MUTUALISTE}>Mutualistes</option>
              <option value={PatientCategory.HORS_MUTUELLE}>Hors Mutuelle</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-4">Patient</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4">Fidélité</th>
                <th className="px-6 py-4">Pathologie</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPatients.map((patient) => (
                <tr 
                  key={patient.id} 
                  className="hover:bg-slate-50/50 transition-colors cursor-pointer group"
                  onClick={() => navigate(`/patients/${patient.id}`)}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 group-hover:bg-sky-100 group-hover:text-sky-600 transition-colors">
                        {patient.firstName[0]}{patient.lastName[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{patient.lastName} {patient.firstName}</p>
                        <p className="text-xs text-slate-500">{patient.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full uppercase ${
                      patient.category === PatientCategory.MUTUALISTE ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {patient.category}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-sky-600">{patient.gamification.points} pts</span>
                      <span className={`text-[10px] font-medium ${patient.gamification.delayCount > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                        {patient.gamification.delayCount || 0} retard(s)
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-slate-600 line-clamp-1">{patient.pathology}</p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 hover:bg-white rounded-lg transition-colors text-slate-400 hover:text-sky-600">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredPatients.length === 0 && (
            <div className="py-20 text-center text-slate-400">
              Aucun patient trouvé correspondant à vos critères.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Patients;
