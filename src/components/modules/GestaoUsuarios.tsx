import React, { useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../../types';
import { storage } from '../../lib/storage';
import {
  Users,
  UserPlus,
  ShieldAlert,
  UserCheck,
  User,
  X,
  Mail,
  Building2,
  CheckCircle2,
  XCircle,
  Key
} from 'lucide-react';

interface GestaoUsuariosProps {
  currentUser: UserProfile;
}

export const GestaoUsuarios: React.FC<GestaoUsuariosProps> = ({ currentUser }) => {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false);

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('Secretaria Acadêmica');
  const [role, setRole] = useState<UserRole>('operador');

  const isSuperAdmin = currentUser.role === 'super_admin';
  const isAdmin = currentUser.role === 'admin' || isSuperAdmin;

  const loadData = async () => {
    const data = await storage.getProfiles();
    setProfiles(data);
  };

  useEffect(() => {
    loadData();
    const unsubscribe = storage.subscribe(() => {
      loadData();
    });
    return () => unsubscribe();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) return;

    await storage.addProfile(
      {
        email,
        full_name: fullName,
        role,
        department,
        is_active: true
      },
      currentUser
    );

    setIsNewUserModalOpen(false);
    setFullName('');
    setEmail('');
  };

  const handleChangeRole = async (userId: string, newRole: UserRole) => {
    await storage.updateProfileRole(userId, newRole, currentUser);
  };

  const handleToggleActive = async (userId: string) => {
    await storage.toggleProfileActive(userId, currentUser);
  };

  const getRoleBadge = (r: UserRole) => {
    switch (r) {
      case 'super_admin':
        return <span className="bg-red-100 text-red-800 border border-red-200 text-xs font-bold px-2.5 py-0.5 rounded-full">Super Admin</span>;
      case 'admin':
        return <span className="bg-blue-100 text-blue-800 border border-blue-200 text-xs font-bold px-2.5 py-0.5 rounded-full">Admin</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold px-2.5 py-0.5 rounded-full">Operador</span>;
    }
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Users className="w-6 h-6 text-[#D32F2F]" />
            <h2 className="text-2xl font-serif-editorial font-bold text-gray-900">Gestão de Equipe & Perfis</h2>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Cadastro de colaboradores do Colégio Reação e atribuição de níveis de acesso
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setIsNewUserModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#D32F2F] text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-red-800 shadow-sm transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>Cadastrar Colaborador</span>
          </button>
        )}
      </div>

      {/* Users Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {profiles.map((p) => (
          <div
            key={p.id}
            className={`bg-white rounded-2xl border p-5 shadow-xs flex flex-col justify-between space-y-4 ${
              !p.is_active ? 'opacity-60 bg-slate-50 border-slate-300' : 'border-slate-200'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-11 h-11 rounded-xl bg-slate-900 text-white font-bold text-sm flex items-center justify-center shrink-0 uppercase shadow-xs">
                  {p.full_name.charAt(0) || 'U'}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-snug">{p.full_name}</h3>
                  <p className="text-xs text-slate-500">{p.email}</p>
                  <span className="text-[11px] text-slate-400 mt-0.5 block">{p.department}</span>
                </div>
              </div>

              {getRoleBadge(p.role)}
            </div>

            {/* ACTION BUTTONS FOR SUPER ADMIN & ADMIN */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
              {isSuperAdmin && (
                <div className="flex items-center space-x-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Role:</span>
                  <select
                    value={p.role}
                    onChange={(e) => handleChangeRole(p.id, e.target.value as UserRole)}
                    className="py-1 px-2 border border-slate-300 rounded-lg text-xs font-bold bg-white text-slate-800"
                  >
                    <option value="super_admin">Super Admin</option>
                    <option value="admin">Admin</option>
                    <option value="operador">Operador</option>
                  </select>
                </div>
              )}

              {isAdmin && (
                <button
                  onClick={() => handleToggleActive(p.id)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                    p.is_active
                      ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  {p.is_active ? 'Desativar' : 'Ativar Acesso'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* NEW USER MODAL */}
      {isNewUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-red-600 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <UserPlus className="w-4 h-4" /> Cadastrar Colaborador
              </h3>
              <button onClick={() => setIsNewUserModalOpen(false)} className="text-white hover:opacity-80">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ex: Prof. Roberto Mendes"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">E-mail Corporativo</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nome@colegioreacaodf.com"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Setor / Departamento</label>
                <input
                  type="text"
                  required
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nível de Acesso (Role)</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-red-600"
                >
                  <option value="operador">Operador (Acesso a Setor)</option>
                  <option value="admin">Admin (Aprovações e Operação)</option>
                  {isSuperAdmin && <option value="super_admin">Super Admin (Acesso Total)</option>}
                </select>
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsNewUserModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 shadow-sm"
                >
                  Criar Cadastro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
