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
  Key,
  Pencil,
  Trash2,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';

interface GestaoUsuariosProps {
  currentUser: UserProfile;
}

export const GestaoUsuarios: React.FC<GestaoUsuariosProps> = ({ currentUser }) => {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  // Form State for New / Edit User
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('Secretaria Acadêmica');
  const [role, setRole] = useState<UserRole>('operador');
  const [password, setPassword] = useState('123456');
  const [isActive, setIsActive] = useState(true);
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});

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

  const handleOpenNewModal = () => {
    setFullName('');
    setEmail('');
    setDepartment('Secretaria Acadêmica');
    setRole('operador');
    setPassword('123456');
    setIsActive(true);
    setIsNewUserModalOpen(true);
  };

  const handleOpenEditModal = (u: UserProfile) => {
    setEditingUser(u);
    setFullName(u.full_name);
    setEmail(u.email);
    setDepartment(u.department || 'Geral');
    setRole(u.role);
    setPassword(u.password || '123456');
    setIsActive(u.is_active);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) return;

    await storage.addProfile(
      {
        email: email.trim(),
        full_name: fullName.trim(),
        role,
        department: department.trim(),
        password: password.trim() || '123456',
        is_active: isActive
      },
      currentUser
    );

    setIsNewUserModalOpen(false);
    setFullName('');
    setEmail('');
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !fullName.trim() || !email.trim()) return;

    await storage.updateProfile(
      editingUser.id,
      {
        email: email.trim(),
        full_name: fullName.trim(),
        role,
        department: department.trim(),
        password: password.trim() || '123456',
        is_active: isActive
      },
      currentUser
    );

    setEditingUser(null);
  };

  const handleDeleteUser = async (userId: string) => {
    await storage.deleteProfile(userId, currentUser);
    setDeletingUserId(null);
  };

  const handleToggleActive = async (userId: string) => {
    await storage.toggleProfileActive(userId, currentUser);
  };

  const toggleShowPassword = (id: string) => {
    setShowPasswordMap((prev) => ({ ...prev, [id]: !prev[id] }));
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
            Cadastro, edição e controle de permissões dos usuários do Colégio Reação
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleOpenNewModal}
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
              !p.is_active ? 'opacity-70 bg-slate-50 border-slate-300' : 'border-slate-200'
            }`}
          >
            <div>
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-11 h-11 rounded-xl bg-slate-900 text-white font-bold text-sm flex items-center justify-center shrink-0 uppercase shadow-xs">
                    {p.full_name.charAt(0) || 'U'}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 leading-snug">{p.full_name}</h3>
                    <p className="text-xs text-slate-500">{p.email}</p>
                    <span className="text-[11px] text-slate-400 mt-0.5 block">{p.department || 'Geral'}</span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  {getRoleBadge(p.role)}
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      p.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {p.is_active ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              </div>

              {/* Password Preview for Admin */}
              {isAdmin && (
                <div className="mt-4 p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs text-slate-600">
                  <div className="flex items-center space-x-2">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-mono font-medium">
                      Senha: {showPasswordMap[p.id] ? (p.password || '123456') : '••••••••'}
                    </span>
                  </div>
                  <button
                    onClick={() => toggleShowPassword(p.id)}
                    className="text-slate-400 hover:text-slate-700"
                    title="Alternar exibição da senha"
                  >
                    {showPasswordMap[p.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              )}
            </div>

            {/* ACTION BUTTONS FOR SUPER ADMIN & ADMIN */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
              {isAdmin && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleOpenEditModal(p)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 rounded-lg font-bold text-xs transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Editar</span>
                  </button>

                  <button
                    onClick={() => handleToggleActive(p.id)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                      p.is_active
                        ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                    }`}
                  >
                    {p.is_active ? 'Desativar' : 'Ativar'}
                  </button>
                </div>
              )}

              {isSuperAdmin && p.id !== currentUser.id && (
                <button
                  onClick={() => setDeletingUserId(p.id)}
                  className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-auto"
                  title="Excluir Usuário"
                >
                  <Trash2 className="w-4 h-4" />
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
                <UserPlus className="w-4 h-4" /> Cadastrar Novo Colaborador
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
                  placeholder="Ex: Secretaria / TI / Manutenção"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Senha de Acesso</label>
                <input
                  type="text"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Senha para login"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nível de Acesso (Role)</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-red-600"
                >
                  <option value="operador">Operador (Acesso Operacional)</option>
                  <option value="admin">Admin (Aprovações e Operações)</option>
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
                  Salvar Cadastramento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Pencil className="w-4 h-4 text-red-400" /> Editar Dados do Colaborador
              </h3>
              <button onClick={() => setEditingUser(null)} className="text-white hover:opacity-80">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
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
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Senha de Acesso</label>
                <input
                  type="text"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nível de Acesso (Role)</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-red-600"
                >
                  <option value="operador">Operador (Acesso Operacional)</option>
                  <option value="admin">Admin (Aprovações e Operações)</option>
                  {isSuperAdmin && <option value="super_admin">Super Admin (Acesso Total)</option>}
                </select>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="isActiveCheck"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded text-red-600 focus:ring-red-500 h-4 w-4"
                />
                <label htmlFor="isActiveCheck" className="text-xs font-bold text-slate-700">
                  Conta Ativa (permite login)
                </label>
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 shadow-sm"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {deletingUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Excluir Cadastro?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Esta ação removerá permanentemente o acesso do usuário ao sistema.
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <button
                onClick={() => setDeletingUserId(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteUser(deletingUserId)}
                className="px-5 py-2 bg-rose-600 text-white text-xs font-bold rounded-lg hover:bg-rose-700 shadow-sm"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
