
import React, { useState } from 'react';
import { useStore } from '../store';
import { Expense, Invoice } from '../types';

const Billing: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'invoices' | 'expenses'>('invoices');
  const [showAddExpense, setShowAddExpense] = useState(false);
  const { expenses, addExpense, invoices, patients, updateInvoiceStatus, sendInvoiceReminders } = useStore();

  const totalInvoicesValue = invoices.reduce((acc, inv) => acc + inv.amount, 0);
  const totalExpensesValue = expenses.reduce((acc, exp) => acc + exp.amount, 0);

  const handleAddExpense = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    addExpense({
      label: formData.get('label') as string,
      amount: parseFloat(formData.get('amount') as string),
      date: formData.get('date') as string,
      category: formData.get('category') as string,
      paymentMethod: formData.get('paymentMethod') as any,
    });
    setShowAddExpense(false);
  };

  const getPatientName = (id: string) => {
    const p = patients.find(p => p.id === id);
    return p ? `${p.lastName} ${p.firstName}` : "Patient inconnu";
  };

  const exportToCSV = () => {
    let csvContent = "";
    let fileName = "";

    if (activeTab === 'invoices') {
      fileName = `factures_${new Date().toISOString().split('T')[0]}.csv`;
      const headers = ["ID", "Patient", "Seances", "Montant (DH)", "Date", "Statut"];
      const rows = invoices.map(inv => [
        inv.id,
        getPatientName(inv.patientId),
        inv.sessionsCount,
        inv.amount,
        inv.date,
        inv.status
      ]);
      csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    } else {
      fileName = `depenses_${new Date().toISOString().split('T')[0]}.csv`;
      const headers = ["Label", "Categorie", "Date", "Mode", "Montant (DH)"];
      const rows = expenses.map(exp => [
        exp.label,
        exp.category,
        exp.date,
        exp.paymentMethod,
        exp.amount
      ]);
      csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-800">Facturation & Comptabilité</h2>
          <p className="text-slate-500">Gérez vos revenus, dépenses et votre bilan financier.</p>
        </div>
        <div className="flex gap-3">
          {activeTab === 'invoices' && (
            <button 
              onClick={() => sendInvoiceReminders()}
              className="bg-amber-500 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-amber-600 transition-all flex items-center gap-2 shadow-lg shadow-amber-100"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 17a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9.5C2 7 4 5 6.5 5H18c2.2 0 4 1.8 4 4v8Z"/><path d="m2 9 10 7 10-7"/></svg>
              Rappels Automatiques
            </button>
          )}
          <button 
            onClick={exportToCSV}
            className="bg-white border border-slate-200 text-slate-700 px-6 py-2.5 rounded-xl font-semibold hover:bg-slate-50 transition-all flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
            Exporter
          </button>
          {activeTab === 'expenses' && (
            <button 
              onClick={() => setShowAddExpense(true)}
              className="bg-sky-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-sky-700 transition-all flex items-center gap-2"
            >
              + Ajouter Dépense
            </button>
          )}
        </div>
      </header>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2">Total Recettes</p>
          <p className="text-3xl font-bold text-emerald-600">{totalInvoicesValue.toLocaleString('fr-FR')} DH</p>
          <p className="text-xs text-slate-400 mt-4">{invoices.length} factures générées</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2">Total Dépenses</p>
          <p className="text-3xl font-bold text-red-500">{totalExpensesValue.toLocaleString('fr-FR')} DH</p>
          <p className="text-xs text-slate-400 mt-4">{expenses.length} transactions ce mois</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2">Solde Net (Bénéfice)</p>
          <p className="text-3xl font-bold text-sky-600">{(totalInvoicesValue - totalExpensesValue).toLocaleString('fr-FR')} DH</p>
          <p className="text-xs text-slate-400 mt-4">Calculé sur l'ensemble des données</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-100">
          <button
            onClick={() => setActiveTab('invoices')}
            className={`px-8 py-4 text-sm font-bold transition-all relative ${
              activeTab === 'invoices' ? 'text-sky-600' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Factures Patients
            {activeTab === 'invoices' && <div className="absolute bottom-0 left-0 w-full h-1 bg-sky-600"></div>}
          </button>
          <button
            onClick={() => setActiveTab('expenses')}
            className={`px-8 py-4 text-sm font-bold transition-all relative ${
              activeTab === 'expenses' ? 'text-sky-600' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Dépenses Cabinet
            {activeTab === 'expenses' && <div className="absolute bottom-0 left-0 w-full h-1 bg-sky-600"></div>}
          </button>
        </div>

        <div className="p-0 overflow-x-auto">
          {activeTab === 'invoices' ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                  <th className="px-6 py-4">N° Facture</th>
                  <th className="px-6 py-4">Patient</th>
                  <th className="px-6 py-4">Séances</th>
                  <th className="px-6 py-4">Montant</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Statut</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">{inv.id}</td>
                    <td className="px-6 py-4 font-semibold text-sm">{getPatientName(inv.patientId)}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{inv.sessionsCount} séances</td>
                    <td className="px-6 py-4 font-bold text-sm whitespace-nowrap text-emerald-600">{inv.amount.toLocaleString('fr-FR')} DH</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{inv.date}</td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${
                        inv.status === 'Payé' ? 'bg-emerald-50 text-emerald-600' : 
                        inv.status === 'Impayé' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {inv.status !== 'Payé' && (
                          <button 
                            onClick={() => updateInvoiceStatus(inv.id, 'Payé')}
                            className="p-2 hover:bg-emerald-50 rounded-lg text-emerald-600 transition-colors"
                            title="Marquer comme payé"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                          </button>
                        )}
                        <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {invoices.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-20 text-center text-slate-400">Aucune facture générée.</td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                  <th className="px-6 py-4">Désignation</th>
                  <th className="px-6 py-4">Catégorie</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Mode</th>
                  <th className="px-6 py-4">Montant</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-sm">{exp.label}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-md uppercase">
                        {exp.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">{exp.date}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{exp.paymentMethod}</td>
                    <td className="px-6 py-4 font-bold text-sm whitespace-nowrap text-red-500">-{exp.amount.toLocaleString('fr-FR')} DH</td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors hover:text-red-500">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                      </button>
                    </td>
                  </tr>
                ))}
                {expenses.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center text-slate-400">Aucune dépense enregistrée.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal Add Expense */}
      {showAddExpense && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-bold">Enregistrer une Dépense</h3>
              <button onClick={() => setShowAddExpense(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            <form onSubmit={handleAddExpense} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Désignation / Libellé</label>
                <input required name="label" className="w-full px-4 py-2.5 bg-slate-50 rounded-xl border border-transparent focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-100 outline-none" placeholder="ex: Facture électricité" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Montant (DH)</label>
                  <input required name="amount" type="number" step="0.01" className="w-full px-4 py-2.5 bg-slate-50 rounded-xl border border-transparent focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-100 outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Date</label>
                  <input required name="date" type="date" className="w-full px-4 py-2.5 bg-slate-50 rounded-xl border border-transparent focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-100 outline-none" defaultValue={new Date().toISOString().split('T')[0]} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Type de dépense / Catégorie</label>
                  <input required name="category" className="w-full px-4 py-2.5 bg-slate-50 rounded-xl border border-transparent focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-100 outline-none" placeholder="ex: Loyer, Matériel, Transport..." />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Mode de Paiement</label>
                  <select name="paymentMethod" className="w-full px-4 py-2.5 bg-slate-50 rounded-xl border border-transparent focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-100 outline-none">
                    <option value="Virement">Virement</option>
                    <option value="Carte">Carte Bancaire</option>
                    <option value="Espèces">Espèces</option>
                    <option value="Chèque">Chèque</option>
                  </select>
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowAddExpense(false)} className="flex-1 px-6 py-3 border border-slate-200 rounded-xl font-semibold hover:bg-slate-50 transition-colors">Annuler</button>
                <button type="submit" className="flex-1 px-6 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-100 active:scale-95">Valider la dépense</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Billing;
