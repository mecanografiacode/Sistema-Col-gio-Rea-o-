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

    if (!email.trim()) {
      setErrorMessage('Por favor, digite seu e-mail corporativo.');
      return;
    }

    const emailTrimmed = email.trim().toLowerCase();
    const found = profiles.find((p) => p.email.toLowerCase() === emailTrimmed);

    if (found) {
      if (!found.is_active) {
        setErrorMessage('Sua conta está desativada. Fale com o Super Admin.');
        return;
      }

      // Check password if set or fallback to default
      const storedPassword = found.password || '123456';
      if (password !== storedPassword) {
        setErrorMessage('Senha incorreta. Verifique suas credenciais ou solicite redefinição.');
        return;
      }

      onLoginSuccess(found);
    } else {
      // First boot fallback: if database has zero users, register as initial Super Admin
      if (profiles.length === 0) {
        const newProfile: UserProfile = {
          id: `user-${Date.now()}`,
          email: email.trim(),
          full_name: email.split('@')[0].replace(/[._]/g, ' ').toUpperCase(),
          role: 'super_admin',
          department: 'Direção Geral',
          is_active: true,
          password: password || '123456',
          created_at: new Date().toISOString()
        };
        onLoginSuccess(newProfile);
      } else {
        setErrorMessage('E-mail não cadastrado no sistema. Solicite o cadastro ao Super Admin na aba Usuários.');
      }
    }
  };

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
                  required
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
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600"
                />
              </div>
            </div>

            {errorMessage && (
              <p className="text-xs font-medium text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
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

          <div className="mt-6 pt-5 border-t border-slate-200 text-center">
            <p className="text-xs text-slate-500">
              🔒 <strong className="text-slate-700">Acesso Restrito:</strong> Os usuários devem ser cadastrados previamente pelo Super Admin na aba <strong>Usuários</strong> do sistema.
            </p>
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
