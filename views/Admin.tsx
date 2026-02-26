import React, { useState } from 'react';
import { useStore } from '../store';
import { UserRole, UserPermission } from '../types';
import { Shield, UserCheck, UserX, Edit3, Mail, UserPlus, X, Lock } from 'lucide-react';

const Admin: React.FC = () => {
  const { users, updateUserRole, toggleUserStatus, currentUser, addEmployee, updateUserPermissions } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [permissionModalUser, setPermissionModalUser] = useState<string | null>(null);
  const [tempPermissions, setTempPermissions] = useState<UserPermission[]>([]);
  const [newEmployee, setNewEmployee] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: UserRole.THERAPEUTE
  });

  if (currentUser?.role !== UserRole.ADMIN) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <div className="p-4 bg-red-50 text-red-600 rounded-2xl">
          <Shield size={48} />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">Accès Refusé</h2>
        <p className="text-slate-500">Vous n'avez pas les permissions nécessaires pour accéder à cette page.</p>
      </div>
    );
  }

  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    addEmployee(newEmployee);
    setIsModalOpen(false);
    setNewEmployee({
      firstName: '',
      lastName: '',
      email: '',
      role: UserRole.THERAPEUTE
    });
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-800">Gestion des Accès</h2>
          <p className="text-slate-500">Configurez les droits et permissions de chaque utilisateur.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-sky-600 text-white px-6 py-2.5 rounded-2xl font-bold flex items-center gap-2 hover:bg-sky-700 transition-all shadow-lg shadow-sky-100 active:scale-95"
        >
          <UserPlus size={18} />
          Nouvel Employé
        </button>
      </header>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-4">Utilisateur</th>
                <th className="px-6 py-4">Rôle</th>
                <th className="px-6 py-4">Permissions</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600">
                        {user.firstName[0]}{user.lastName[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{user.lastName} {user.firstName}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <Mail size={12} />
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={user.role}
                      onChange={(e) => updateUserRole(user.id, e.target.value as UserRole)}
                      className="bg-slate-50 border-none rounded-lg px-3 py-1.5 text-sm font-medium focus:ring-2 focus:ring-sky-500 outline-none"
                    >
                      {Object.values(UserRole).map((role) => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {user.permissions?.slice(0, 2).map(p => (
                        <span key={p} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                          {p}
                        </span>
                      ))}
                      {(user.permissions?.length || 0) > 2 && (
                        <span className="text-[10px] text-slate-400">+{(user.permissions?.length || 0) - 2}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full uppercase ${
                      user.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                    }`}>
                      {user.isActive ? 'Actif' : 'Désactivé'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setPermissionModalUser(user.id);
                          setTempPermissions(user.permissions || []);
                        }}
                        className="p-2 text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                        title="Modifier les permissions"
                      >
                        <Lock size={18} />
                      </button>
                      <button
                        onClick={() => toggleUserStatus(user.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          user.isActive ? 'text-red-500 hover:bg-red-50' : 'text-emerald-500 hover:bg-emerald-50'
                        }`}
                        title={user.isActive ? 'Désactiver' : 'Activer'}
                      >
                        {user.isActive ? <UserX size={18} /> : <UserCheck size={18} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-sky-50 p-6 rounded-2xl border border-sky-100">
          <h4 className="font-bold text-sky-900 mb-2">Sécurité des données</h4>
          <p className="text-sm text-sky-700 leading-relaxed">
            Les rôles définissent strictement l'accès aux données. Les secrétaires n'ont pas accès aux notes médicales privées.
          </p>
        </div>
        <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
          <h4 className="font-bold text-emerald-900 mb-2">Audit des accès</h4>
          <p className="text-sm text-emerald-700 leading-relaxed">
            Toutes les modifications de rôles sont enregistrées dans les journaux d'audit pour assurer la traçabilité.
          </p>
        </div>
        <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100">
          <h4 className="font-bold text-amber-900 mb-2">Gestion des comptes</h4>
          <p className="text-sm text-amber-700 leading-relaxed">
            Désactivez immédiatement les comptes en cas de départ d'un collaborateur pour maintenir la sécurité.
          </p>
        </div>
      </div>

      {/* Modal Nouvel Employé */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-bold">Ajouter un employé</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddEmployee} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Prénom</label>
                  <input
                    required
                    type="text"
                    value={newEmployee.firstName}
                    onChange={(e) => setNewEmployee({...newEmployee, firstName: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Nom</label>
                  <input
                    required
                    type="text"
                    value={newEmployee.lastName}
                    onChange={(e) => setNewEmployee({...newEmployee, lastName: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Email professionnel</label>
                <input
                  required
                  type="email"
                  value={newEmployee.email}
                  onChange={(e) => setNewEmployee({...newEmployee, email: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-sky-500 outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Rôle</label>
                <select
                  value={newEmployee.role}
                  onChange={(e) => setNewEmployee({...newEmployee, role: e.target.value as UserRole})}
                  className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-sky-500 outline-none"
                >
                  <option value={UserRole.THERAPEUTE}>Thérapeute</option>
                  <option value={UserRole.SECRETAIRE}>Secrétaire</option>
                  <option value={UserRole.ADMIN}>Administrateur</option>
                </select>
              </div>
              <div className="pt-4">
                <button 
                  type="submit"
                  className="w-full bg-sky-600 text-white py-3 rounded-2xl font-bold hover:bg-sky-700 transition-all shadow-lg shadow-sky-100 active:scale-95"
                >
                  Créer le compte
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal Permissions */}
      {permissionModalUser && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold">Permissions d'accès</h3>
                <p className="text-xs text-slate-500">
                  {users.find(u => u.id === permissionModalUser)?.firstName} {users.find(u => u.id === permissionModalUser)?.lastName}
                </p>
              </div>
              <button onClick={() => setPermissionModalUser(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                {Object.values(UserPermission).map((permission) => {
                  const isChecked = tempPermissions.includes(permission);
                  
                  return (
                    <label key={permission} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors border border-transparent hover:border-slate-100">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          setTempPermissions(prev => 
                            e.target.checked
                              ? [...prev, permission]
                              : prev.filter(p => p !== permission)
                          );
                        }}
                        className="w-5 h-5 rounded-lg border-slate-300 text-sky-600 focus:ring-sky-500"
                      />
                      <span className="text-sm font-medium text-slate-700">{permission}</span>
                    </label>
                  );
                })}
              </div>
              <div className="pt-4 flex gap-3">
                <button 
                  onClick={() => setPermissionModalUser(null)}
                  className="flex-1 px-4 py-3 border border-slate-200 rounded-2xl font-bold hover:bg-slate-50 transition-all"
                >
                  Annuler
                </button>
                <button 
                  onClick={() => {
                    if (permissionModalUser) {
                      updateUserPermissions(permissionModalUser, tempPermissions);
                      setPermissionModalUser(null);
                    }
                  }}
                  className="flex-1 bg-sky-600 text-white py-3 rounded-2xl font-bold hover:bg-sky-700 transition-all shadow-lg shadow-sky-100 active:scale-95"
                >
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
