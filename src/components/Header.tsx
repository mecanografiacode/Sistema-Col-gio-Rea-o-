import React, { useState } from 'react';
import { UserProfile } from '../types';
import { storage } from '../lib/storage';
import {
  Bell,
  Download,
  ShieldAlert,
  UserCheck,
  User,
  Key,
  X,
  Lock,
  Check
} from 'lucide-react';

interface HeaderProps {
  currentUser: UserProfile;
  unreadCount: number;
  onOpenNotifications: () => void;
  onOpenInstallModal: () => void;
  onSwitchUser: () => void;
  canInstallPWA: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  unreadCount,
  onOpenNotifications,
  onOpenInstallModal,
  onSwitchUser,
  canInstallPWA
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<{ message: string; isError: boolean } | null>(null);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const handleOpenPasswordModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowUserMenu(false);
    setNewPassword('');
    setConfirmPassword('');
    setPasswordStatus(null);
    setIsPasswordModalOpen(true);
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatus(null);

    if (!newPassword.trim()) {
      setPasswordStatus({ message: 'Digite a nova senha desejada.', isError: true });
      return;
    }

    if (newPassword.trim().length < 4) {
      setPasswordStatus({ message: 'A senha deve ter pelo menos 4 caracteres.', isError: true });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordStatus({ message: 'A confirmação de senha não confere.', isError: true });
      return;
    }

    setIsSavingPassword(true);
    try {
      await storage.updateProfile(
        currentUser.id,
        { password: newPassword.trim() },
        currentUser
      );
      setPasswordStatus({ message: 'Sua senha foi alterada com sucesso!', isError: false });
      setTimeout(() => {
        setIsPasswordModalOpen(false);
        setNewPassword('');
        setConfirmPassword('');
      }, 1200);
    } catch (err) {
      console.error('Erro ao alterar senha:', err);
      setPasswordStatus({ message: 'Erro ao salvar nova senha. Tente novamente.', isError: true });
    } finally {
      setIsSavingPassword(false);
    }
  };

  const getRoleBadge = (role: UserProfile['role']) => {
    switch (role) {
      case 'super_admin':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-200">
            <ShieldAlert className="w-3 h-3 text-red-600" /> Super Admin
          </span>
        );
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
            <UserCheck className="w-3 h-3 text-blue-600" /> Admin
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            <User className="w-3 h-3 text-slate-500" /> Operador
          </span>
        );
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
      <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo & School Name */}
        <div className="flex items-center space-x-3">
          <img
            src="https://i.imgur.com/8RP9DL7.png"
            alt="Logo Colégio Reação"
            className="h-10 w-auto object-contain drop-shadow-xs"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-xl font-serif-editorial font-bold text-gray-900 tracking-tight leading-tight">
                Colégio Reação
              </h1>
              <span className="hidden sm:inline-block text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-red-50 text-[#D32F2F] border border-red-200">
                Gestão
              </span>
            </div>
            <p className="text-xs text-gray-500 hidden sm:block">Recanto das Emas — DF</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* PWA Install Button */}
          {canInstallPWA && (
            <button
              onClick={onOpenInstallModal}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#D32F2F] text-white hover:bg-red-800 shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Instalar App</span>
            </button>
          )}

          {/* Notifications Bell */}
          <button
            onClick={onOpenNotifications}
            className="relative p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            aria-label="Notificações"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-600 rounded-full ring-2 ring-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Profile Dropdown */}
          <div className="relative shrink-0">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-2 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-slate-800 text-white font-bold text-xs flex items-center justify-center ring-2 ring-slate-200 uppercase shrink-0">
                {currentUser.full_name.charAt(0) || 'U'}
              </div>
              <div className="hidden lg:block text-left min-w-0 max-w-[140px]">
                <p className="text-xs font-semibold text-slate-800 leading-none truncate">{currentUser.full_name}</p>
                <div className="mt-0.5 truncate">{getRoleBadge(currentUser.role)}</div>
              </div>
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <div
                className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                onClick={() => setShowUserMenu(false)}
              >
                <div className="px-4 py-2 border-b border-slate-100 min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{currentUser.full_name}</p>
                  <p className="text-xs text-slate-500 truncate">{currentUser.email}</p>
                  <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[11px] text-slate-500 truncate">Setor: {currentUser.department}</span>
                    {getRoleBadge(currentUser.role)}
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    onClick={handleOpenPasswordModal}
                    className="w-full text-left px-4 py-2 text-xs text-red-700 hover:bg-red-50 font-bold flex items-center space-x-2"
                  >
                    <Key className="w-4 h-4 text-red-600" />
                    <span>Alterar Minha Senha</span>
                  </button>
                  <button
                    onClick={onSwitchUser}
                    className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center space-x-2"
                  >
                    <User className="w-4 h-4 text-slate-500" />
                    <span>Alternar Perfil / Sair</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL ALTERAR SENHA DO PRÓPRIO USUÁRIO */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-[#D32F2F] text-white flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Key className="w-4 h-4" /> Alterar Minha Senha
              </h3>
              <button
                onClick={() => setIsPasswordModalOpen(false)}
                className="text-white hover:opacity-80"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleChangePasswordSubmit} className="p-6 space-y-4">
              <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <p className="font-bold text-slate-800">{currentUser.full_name}</p>
                <p className="text-[11px] text-slate-500">{currentUser.email}</p>
              </div>

              {passwordStatus && (
                <div
                  className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                    passwordStatus.isError
                      ? 'bg-rose-50 text-rose-800 border border-rose-200'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  }`}
                >
                  {passwordStatus.isError ? (
                    <X className="w-4 h-4 shrink-0" />
                  ) : (
                    <Check className="w-4 h-4 shrink-0" />
                  )}
                  <span>{passwordStatus.message}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nova Senha
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Digite a nova senha"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Confirmar Nova Senha
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a nova senha"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingPassword}
                  className="px-5 py-2 bg-[#D32F2F] text-white text-xs font-bold rounded-lg hover:bg-red-800 disabled:opacity-50 shadow-sm"
                >
                  {isSavingPassword ? 'Salvando...' : 'Atualizar Senha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};
