
import React, { useState } from 'react';
import { useStore } from '../store';
import { useNavigate } from 'react-router-dom';
import { UserRole, UserPermission } from '../types';

const HOURS = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30'];

const getWeekDates = () => {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1)); // Start on Monday
  
  // Return 6 days: Monday to Saturday
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
};

const Agenda: React.FC = () => {
  const { appointments, setAppointmentModalOpen, setSelectedPatientId, setPrefilledDate, setPrefilledTime, billSession, currentUser, patients, deleteAppointment, updateAppointmentStatus, cancelAppointment } = useStore();
  const navigate = useNavigate();
  const weekDates = getWeekDates();

  const isPatient = currentUser?.role === UserRole.PATIENT;
  const canManageAgenda = currentUser?.permissions?.includes(UserPermission.MANAGE_AGENDA);
  const canViewMedicalRecords = currentUser?.permissions?.includes(UserPermission.VIEW_MEDICAL_RECORDS);
  const canManageBilling = currentUser?.permissions?.includes(UserPermission.MANAGE_BILLING);
  const canDeleteAppointment = currentUser?.permissions?.includes(UserPermission.DELETE_APPOINTMENT);

  const currentPatient = isPatient ? patients.find(p => p.email === currentUser?.email) : null;
  
  const [billingAppId, setBillingAppId] = useState<string | null>(null);
  const [sessionAmount, setSessionAmount] = useState<number>(300);
  const [confirmingCancelId, setConfirmingCancelId] = useState<string | null>(null);

  const getAppointmentsForSlot = (date: string, hour: string) => {
    const slotApps = appointments.filter(app => app.date === date && app.startTime === hour);
    if (isPatient) {
      return slotApps.filter(app => app.patientId === currentPatient?.id);
    }
    return slotApps;
  };

  const handleSlotClick = (date: Date, hour: string) => {
    if (!canManageAgenda) return;
    setSelectedPatientId(null);
    setPrefilledDate(date.toISOString().split('T')[0]);
    setPrefilledTime(hour);
    setAppointmentModalOpen(true);
  };

  const handleOpenBillModal = (e: React.MouseEvent, appId: string) => {
    e.stopPropagation();
    setBillingAppId(appId);
  };

  const handleConfirmBill = () => {
    if (billingAppId) {
      billSession(billingAppId, sessionAmount);
      setBillingAppId(null);
      setSessionAmount(300); // Reset
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-800">Agenda Interactif</h2>
          <p className="text-slate-500">Cliquez sur un créneau pour planifier. Cliquez sur le symbole "$" pour facturer.</p>
        </div>
        <div className="flex gap-2">
          <div className="bg-white border border-slate-200 rounded-xl flex p-1 shadow-sm">
            <button className="px-4 py-1.5 text-xs font-bold rounded-lg bg-sky-50 text-sky-600">Semaine</button>
            <button className="px-4 py-1.5 text-xs font-bold rounded-lg text-slate-500 hover:bg-slate-50">Mois</button>
            <button className="px-4 py-1.5 text-xs font-bold rounded-lg text-slate-500 hover:bg-slate-50">Jour</button>
          </div>
          {canManageAgenda && (
            <button 
              onClick={() => {
                setPrefilledDate(new Date().toISOString().split('T')[0]);
                setPrefilledTime('08:00');
                setAppointmentModalOpen(true);
              }}
              className="bg-sky-600 text-white px-4 py-1.5 rounded-xl font-semibold hover:bg-sky-700 transition-all text-sm shadow-lg shadow-sky-100"
            >
              Nouveau RDV
            </button>
          )}
        </div>
      </header>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[750px]">
        {/* Grille Header */}
        <div className="grid grid-cols-7 border-b border-slate-100 sticky top-0 bg-white z-20">
          <div className="p-4 border-r border-slate-100 bg-slate-50/50 flex items-end justify-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Heure</span>
          </div>
          {weekDates.map((date, i) => {
            const isToday = new Date().toDateString() === date.toDateString();
            return (
              <div key={i} className={`p-4 text-center border-r border-slate-100 last:border-r-0 ${isToday ? 'bg-sky-50/30' : ''}`}>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">
                  {date.toLocaleDateString('fr-FR', { weekday: 'short' })}
                </p>
                <p className={`text-lg font-bold ${isToday ? 'text-sky-600' : 'text-slate-800'}`}>
                  {date.getDate()}
                </p>
              </div>
            );
          })}
        </div>

        {/* Grille Body */}
        <div className="flex-1 overflow-y-auto relative scrollbar-hide">
          <div className="grid grid-cols-7 min-h-full">
            <div className="col-span-1 border-r border-slate-100 bg-slate-50/10">
              {HOURS.map((hour) => (
                <div key={hour} className="h-16 border-b border-slate-100/50 p-2 text-[10px] font-bold text-slate-400 text-right sticky left-0">
                  {hour}
                </div>
              ))}
            </div>
            
            {weekDates.map((dateObj, dayIndex) => {
              const dateStr = dateObj.toISOString().split('T')[0];
              return (
                <div key={dayIndex} className="col-span-1 border-r border-slate-100 last:border-r-0 relative">
                  {HOURS.map((hour) => {
                    const slotApps = getAppointmentsForSlot(dateStr, hour);
                    return (
                      <div 
                        key={hour} 
                        onClick={() => handleSlotClick(dateObj, hour)}
                        className="h-16 border-b border-slate-100/50 hover:bg-sky-50/40 transition-colors cursor-pointer p-0.5 relative group"
                      >
                        <div className="flex flex-col gap-0.5 h-full overflow-hidden">
                          {slotApps.map((app) => (
                            <div 
                              key={app.id}
                              className={`bg-white border-l-2 border-sky-500 shadow-sm rounded p-1 text-[9px] leading-tight transition-colors relative group/card min-h-[32px] ${canViewMedicalRecords ? 'hover:bg-sky-100' : ''}`}
                            >
                              {/* Action Buttons - Absolute positioned to be always clickable and on top */}
                              <div 
                                className="absolute top-0.5 right-0.5 flex gap-1 z-[60]"
                                onClick={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                              >
                                {canManageBilling && (
                                  <button 
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleOpenBillModal(e, app.id);
                                    }}
                                    className="bg-emerald-50 text-emerald-600 p-1 rounded hover:bg-emerald-100 transition-all flex items-center justify-center cursor-pointer shadow-sm border border-emerald-100"
                                    title="Facturer cette séance"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                                  </button>
                                )}
                                {canManageAgenda && (
                                  confirmingCancelId === app.id ? (
                                    <div className="flex gap-1 animate-in zoom-in-95 duration-200 bg-white/90 p-0.5 rounded shadow-sm z-10">
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          cancelAppointment(app.id);
                                          setConfirmingCancelId(null);
                                        }}
                                        className="bg-red-600 text-white px-1.5 py-0.5 rounded hover:bg-red-700 text-[8px] font-bold"
                                      >
                                        OUI
                                      </button>
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setConfirmingCancelId(null);
                                        }}
                                        className="bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded hover:bg-slate-300 text-[8px] font-bold"
                                      >
                                        NON
                                      </button>
                                    </div>
                                  ) : (
                                    <button 
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setConfirmingCancelId(app.id);
                                      }}
                                      className="bg-orange-50 text-orange-600 p-1 rounded hover:bg-orange-100 transition-all flex items-center justify-center cursor-pointer shadow-sm border border-orange-100"
                                      title="Annuler le RDV"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                    </button>
                                  )
                                )}
                                {canDeleteAppointment && (
                                  <button 
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      if (window.confirm('Supprimer ce rendez-vous ?')) {
                                        deleteAppointment(app.id);
                                      }
                                    }}
                                    className="bg-red-50 text-red-600 p-1 rounded hover:bg-red-100 transition-all flex items-center justify-center cursor-pointer shadow-sm border border-red-100"
                                    title="Supprimer"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                                  </button>
                                )}
                              </div>

                              {/* Card Content - Clickable for navigation */}
                              <div 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (canViewMedicalRecords) navigate(`/patients/${app.patientId}`);
                                }}
                                className="cursor-pointer pr-8"
                              >
                                <div className="flex items-center gap-1">
                                  <p className="font-bold text-slate-800 truncate">{app.patientName}</p>
                                  {app.status === 'En retard' && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title="En retard"></span>
                                  )}
                                </div>
                                <p className="text-slate-400 text-[8px] truncate">{app.type}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal Facturation Rapide */}
      {billingAppId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-xs shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </div>
              <h3 className="text-lg font-bold">Facturer la séance</h3>
              <p className="text-sm text-slate-500">Saisissez le montant de la séance pour ce patient.</p>
              
              <div className="relative">
                <input 
                  autoFocus
                  type="number" 
                  value={sessionAmount} 
                  onChange={(e) => setSessionAmount(Number(e.target.value))}
                  className="w-full text-center text-2xl font-bold py-3 bg-slate-50 rounded-xl border-2 border-transparent focus:border-sky-500 outline-none transition-all"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">DH</span>
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  onClick={() => setBillingAppId(null)}
                  className="flex-1 px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Annuler
                </button>
                <button 
                  onClick={handleConfirmBill}
                  className="flex-1 px-4 py-2 text-sm font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-lg shadow-sky-100 transition-all active:scale-95"
                >
                  Valider
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Agenda;
