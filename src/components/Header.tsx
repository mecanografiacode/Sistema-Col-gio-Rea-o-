import React, { useState } from 'react';
import { UserProfile } from '../types';
import { isSupabaseConfigured } from '../lib/supabase';
import {
  Bell,
  Download,
  Database,
  LogOut,
  ShieldAlert,
  UserCheck,
  User,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface HeaderProps {
  currentUser: UserProfile;
  unreadCount: number;
  onOpenNotifications: () => void;
  onOpenSupabaseModal: () => void;
  onOpenInstallModal: () => void;
  onSwitchUser: () => void;
  canInstallPWA: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  unreadCount,
  onOpenNotifications,
  onOpenSupabaseModal,
  onOpenInstallModal,
  onSwitchUser,
  canInstallPWA
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const isDbConfigured = isSupabaseConfigured();

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
          {/* Supabase Connection Status Indicator */}
          <button
            onClick={onOpenSupabaseModal}
            title={isDbConfigured ? 'Supabase Conectado' : 'Configurar Supabase (Modo Local Ativo)'}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              isDbConfigured
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-current" />
            <span className="hidden md:inline">
              {isDbConfigured ? 'Supabase OK' : 'Supabase SQL'}
            </span>
            {isDbConfigured ? (
              <CheckCircle2 className="w-3 h-3 text-emerald-600 hidden sm:inline" />
            ) : (
              <AlertCircle className="w-3 h-3 text-amber-600 hidden sm:inline" />
            )}
          </button>

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
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-2 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-slate-800 text-white font-bold text-xs flex items-center justify-center ring-2 ring-slate-200 uppercase">
                {currentUser.full_name.charAt(0) || 'U'}
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-xs font-semibold text-slate-800 leading-none">{currentUser.full_name}</p>
                <div className="mt-0.5">{getRoleBadge(currentUser.role)}</div>
              </div>
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <div
                className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                onClick={() => setShowUserMenu(false)}
              >
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="text-sm font-bold text-slate-900">{currentUser.full_name}</p>
                  <p className="text-xs text-slate-500 truncate">{currentUser.email}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">Setor: {currentUser.department}</span>
                    {getRoleBadge(currentUser.role)}
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    onClick={onSwitchUser}
                    className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center space-x-2"
                  >
                    <User className="w-4 h-4 text-slate-500" />
                    <span>Alternar Perfil / Sair</span>
                  </button>
                  <button
                    onClick={onOpenSupabaseModal}
                    className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center space-x-2"
                  >
                    <Database className="w-4 h-4 text-slate-500" />
                    <span>Configurações & Script SQL</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
