import React, { useState } from 'react';
import { UserProfile } from '../types';
import { ShieldAlert, UserCheck, User, ArrowRight, Lock, Mail, Building2 } from 'lucide-react';

interface LoginProps {
  profiles: UserProfile[];
  onLoginSuccess: (user: UserProfile) => void;
}

export const Login: React.FC<LoginProps> = ({ profiles, onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email) {
      setErrorMessage('Por favor, digite seu e-mail corporativo.');
      return;
    }

    const found = profiles.find((p) => p.email.toLowerCase() === email.trim().toLowerCase());
    if (found) {
      onLoginSuccess(found);
    } else {
      // Auto-assign role for new login: super_admin if first user or admin email
      const emailLower = email.toLowerCase();
      const isFirstUser = profiles.length === 0;
      const isAdminEmail = emailLower.includes('direcao') || emailLower.includes('admin') || emailLower.includes('mecanografia');

      const newProfile: UserProfile = {
        id: `user-${Date.now()}`,
        email: email.trim(),
        full_name: email.split('@')[0].replace(/[._]/g, ' ').toUpperCase(),
        role: isFirstUser || isAdminEmail ? 'super_admin' : 'operador',
        department: isFirstUser || isAdminEmail ? 'Direção Geral' : 'Setor Operacional',
        is_active: true,
        created_at: new Date().toISOString()
      };
      onLoginSuccess(newProfile);
    }
  };

  const handleQuickRoleLogin = (user: UserProfile) => {
    onLoginSuccess(user);
  };

  const superAdminUser = profiles.find((p) => p.role === 'super_admin');
  const adminUser = profiles.find((p) => p.role === 'admin');
  const operatorUsers = profiles.filter((p) => p.role === 'operador');

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-24 h-24 bg-[#D32F2F] rounded-full mx-auto flex items-center justify-center p-3 mb-4 shadow-lg ring-4 ring-red-100">
          <img
            src="https://i.imgur.com/8RP9DL7.png"
            alt="Colégio Reação"
            className="w-full h-full object-contain"
          />
        </div>
        <h2 className="text-3xl font-serif-editorial font-bold text-gray-900 tracking-tight">
          Colégio Reação
        </h2>
        <p className="text-xs font-bold uppercase tracking-widest text-[#D32F2F] mt-1">
          Sistema de Gestão Interna — Recanto das Emas, DF
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg px-4">
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-slate-200">
          <form onSubmit={handleManualLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                E-mail Corporativo
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.nome@colegioreacaodf.com"
                  className="block w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Senha de Acesso
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600"
                />
              </div>
            </div>

            {errorMessage && (
              <p className="text-xs font-medium text-red-600 bg-red-50 p-2 rounded-md">
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-xs uppercase tracking-wider font-bold text-white bg-[#D32F2F] hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
            >
              <span>Entrar no Sistema</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-200">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider text-center mb-3">
              Modo Demonstrativo — Acesso Rápido por Nível
            </p>

            <div className="space-y-2.5">
              {/* Super Admin */}
              {superAdminUser && (
                <button
                  onClick={() => handleQuickRoleLogin(superAdminUser)}
                  className="w-full text-left p-3 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100/80 transition-colors flex items-center justify-between group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-red-600 text-white rounded-lg">
                      <ShieldAlert className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-red-900">
                          {superAdminUser.full_name}
                        </span>
                        <span className="text-[10px] bg-red-200 text-red-900 font-bold px-1.5 py-0.5 rounded-full">
                          Super Admin
                        </span>
                      </div>
                      <p className="text-[11px] text-red-700">Acesso Total + Auditoria + Usuários</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-red-600 group-hover:translate-x-1 transition-transform" />
                </button>
              )}

              {/* Admin */}
              {adminUser && (
                <button
                  onClick={() => handleQuickRoleLogin(adminUser)}
                  className="w-full text-left p-3 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100/80 transition-colors flex items-center justify-between group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-600 text-white rounded-lg">
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-blue-900">
                          {adminUser.full_name}
                        </span>
                        <span className="text-[10px] bg-blue-200 text-blue-900 font-bold px-1.5 py-0.5 rounded-full">
                          Admin
                        </span>
                      </div>
                      <p className="text-[11px] text-blue-700">Aprovações + Relatórios + Operações</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-blue-600 group-hover:translate-x-1 transition-transform" />
                </button>
              )}

              {/* Operador */}
              {operatorUsers.length > 0 && (
                <button
                  onClick={() => handleQuickRoleLogin(operatorUsers[0])}
                  className="w-full text-left p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-between group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-slate-600 text-white rounded-lg">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-slate-900">
                          {operatorUsers[0].full_name}
                        </span>
                        <span className="text-[10px] bg-slate-200 text-slate-800 font-bold px-1.5 py-0.5 rounded-full">
                          Operador
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600">Abertura de Chamados e Requisições</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-600 group-hover:translate-x-1 transition-transform" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-slate-500">
          <p className="flex items-center justify-center gap-1">
            <Building2 className="w-3.5 h-3.5" /> Colégio Reação — Recanto das Emas, DF
          </p>
        </div>
      </div>
    </div>
  );
};
