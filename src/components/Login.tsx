import React, { useState } from 'react';
import { UserProfile, UserRole } from '../types';
import { storage } from '../lib/storage';
import { getSupabaseClient } from '../lib/supabase';
import { ShieldAlert, UserCheck, User, ArrowRight, Lock, Mail, Building2, Loader2, Wrench, Package, ExternalLink } from 'lucide-react';

interface LoginProps {
  profiles: UserProfile[];
  onLoginSuccess: (user: UserProfile) => void;
  onOpenPublicPortal?: (type: 'os' | 'materiais') => void;
}

export const Login: React.FC<LoginProps> = ({ profiles, onLoginSuccess, onOpenPublicPortal }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      if (!email.trim()) {
        setErrorMessage('Por favor, digite seu e-mail corporativo.');
        setIsLoading(false);
        return;
      }

      const emailTrimmed = email.trim().toLowerCase();
      const supabase = getSupabaseClient();

      if (supabase) {
        // 1. Try to login via Supabase Auth first
        try {
          const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: emailTrimmed,
            password: password || '123456'
          });

          if (!authError && authData?.user) {
            const u = authData.user;
            // Fetch profile for this user
            const { data: profileData, error: profileErr } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', u.id)
              .maybeSingle();

            let loggedInUser: UserProfile;

            if (!profileErr && profileData) {
              loggedInUser = {
                id: profileData.id,
                email: profileData.email,
                full_name: profileData.full_name,
                role: (profileData.role as UserRole) || 'operador',
                department: profileData.department || 'Geral',
                avatar_url: profileData.avatar_url || undefined,
                is_active: profileData.is_active ?? true,
                created_at: profileData.created_at,
                password: password || '123456' // Keep locally in session
              };
            } else {
              // Create profile in profiles table if it doesn't exist
              loggedInUser = {
                id: u.id,
                email: emailTrimmed,
                full_name: u.user_metadata?.full_name || emailTrimmed.split('@')[0].toUpperCase(),
                role: (u.user_metadata?.role as UserRole) || 'operador',
                department: u.user_metadata?.department || 'Geral',
                is_active: true,
                created_at: u.created_at || new Date().toISOString(),
                password: password || '123456'
              };
              const payload = {
                id: loggedInUser.id,
                email: loggedInUser.email,
                full_name: loggedInUser.full_name,
                role: loggedInUser.role,
                department: loggedInUser.department,
                is_active: loggedInUser.is_active,
                created_at: loggedInUser.created_at
              };
              await supabase.from('profiles').upsert([payload]);
            }

            if (!loggedInUser.is_active) {
              setErrorMessage('Sua conta está desativada. Fale com o Super Admin.');
              setIsLoading(false);
              return;
            }

            // Sync with local memory cache
            const cachedProfiles = storage.getItem<UserProfile>('cr_profiles');
            const existIdx = cachedProfiles.findIndex(p => p.id === loggedInUser.id);
            if (existIdx !== -1) {
              cachedProfiles[existIdx] = loggedInUser;
            } else {
              cachedProfiles.push(loggedInUser);
            }
            storage.setItem('cr_profiles', cachedProfiles);

            // Audit
            await storage.logAudit(
              loggedInUser,
              'login',
              'usuarios',
              `Acesso ao Sistema: ${loggedInUser.full_name} (${loggedInUser.email})`,
              undefined,
              `Role: ${loggedInUser.role} (Via Supabase Auth)`
            );

            onLoginSuccess(loggedInUser);
            setIsLoading(false);
            return;
          } else if (authError) {
            console.warn('Supabase Auth error, checking fallback:', authError.message);
            // If they are admin or user trying to sign in for the first time and we have offline/cached credentials,
            // or if they had registered locally but auth credentials failed, continue to fallback below.
            if (authError.message?.includes('Invalid login credentials') && profiles.some(p => p.email.toLowerCase() === emailTrimmed)) {
              // Continue to fallback check below
            } else if (authError.message?.includes('Email not confirmed')) {
              setErrorMessage('Por favor, confirme seu e-mail antes de fazer login ou use as credenciais padrão se for teste.');
              setIsLoading(false);
              return;
            }
          }
        } catch (authExc) {
          console.warn('Supabase Auth exception, checking fallback:', authExc);
        }
      }

      // 2. Fallback to local profile check (or offline mode)
      let targetUser = profiles.find((p) => p.email.toLowerCase() === emailTrimmed);

      // Try reading directly from profiles table as query fallback
      if (!targetUser && supabase) {
        try {
          const { data: dbProfiles } = await supabase
            .from('profiles')
            .select('*')
            .ilike('email', emailTrimmed);

          if (dbProfiles && dbProfiles.length > 0) {
            const raw = dbProfiles[0];
            targetUser = {
              id: raw.id || crypto.randomUUID(),
              email: raw.email.toLowerCase(),
              full_name: raw.full_name || 'Usuário Sem Nome',
              role: (raw.role as UserRole) || 'operador',
              department: raw.department || 'Geral',
              avatar_url: raw.avatar_url || undefined,
              is_active: raw.is_active ?? true,
              created_at: raw.created_at || new Date().toISOString(),
              password: '123456' // Local fallback password
            };
            const cachedProfiles = storage.getItem<UserProfile>('cr_profiles');
            cachedProfiles.push(targetUser);
            storage.setItem('cr_profiles', cachedProfiles);
          }
        } catch (dbErr) {
          console.warn('Error querying fallback profiles:', dbErr);
        }
      }

      if (targetUser) {
        if (!targetUser.is_active) {
          setErrorMessage('Sua conta está desativada. Fale com o Super Admin.');
          setIsLoading(false);
          return;
        }

        const storedPassword = targetUser.password || '123456';
        if (password !== storedPassword) {
          setErrorMessage('Senha incorreta. Verifique suas credenciais.');
          setIsLoading(false);
          return;
        }

        // Auto signup the fallback user to Supabase Auth to enable modern auth next time
        if (supabase) {
          try {
            await supabase.auth.signUp({
              email: targetUser.email,
              password: password || '123456',
              options: {
                data: {
                  full_name: targetUser.full_name,
                  role: targetUser.role,
                  department: targetUser.department
                }
              }
            });
          } catch (signUpErr) {
            // Ignore if already signed up
          }
        }

        await storage.logAudit(
          targetUser,
          'login',
          'usuarios',
          `Acesso ao Sistema: ${targetUser.full_name} (${targetUser.email})`,
          undefined,
          `Role: ${targetUser.role} (Fallback/Local)`
        );

        onLoginSuccess(targetUser);
      } else {
        // Fallback: If database has no users, create initial Super Admin
        const allProfiles = await storage.getProfiles();
        if (allProfiles.length === 0) {
          const newProfile: UserProfile = {
            id: crypto.randomUUID(),
            email: email.trim().toLowerCase(),
            full_name: email.split('@')[0].replace(/[._]/g, ' ').toUpperCase(),
            role: 'super_admin',
            department: 'Direção Geral',
            is_active: true,
            password: password || '123456',
            created_at: new Date().toISOString()
          };
          await storage.addProfile(newProfile, null);
          await storage.logAudit(
            newProfile,
            'login',
            'usuarios',
            `Primeiro Acesso — Super Admin Criado: ${newProfile.full_name}`,
            undefined,
            `Role: super_admin`
          );
          onLoginSuccess(newProfile);
        } else {
          setErrorMessage('E-mail não cadastrado no sistema. Solicite o cadastro ao Super Admin.');
        }
      }
    } catch (err) {
      console.error('Erro no fluxo de login:', err);
      setErrorMessage('Ocorreu um erro ao processar o login. Tente novamente.');
    } finally {
      setIsLoading(false);
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
              disabled={isLoading}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-xs uppercase tracking-wider font-bold text-white bg-[#D32F2F] hover:bg-red-800 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Autenticando...</span>
                </>
              ) : (
                <>
                  <span>Entrar no Sistema</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-200 text-center">
            <p className="text-xs text-slate-500">
              🔒 <strong className="text-slate-700">Acesso Restrito:</strong> Os usuários devem ser cadastrados previamente pelo Super Admin na aba <strong>Usuários</strong> do sistema.
            </p>
          </div>
        </div>

        {/* PORTAL EXTERNO SEM NECESSIDADE DE LOGIN */}
        <div className="mt-6 bg-white py-5 px-6 shadow-xl rounded-2xl border border-slate-200 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-[#D32F2F] text-[11px] font-bold uppercase tracking-wider mb-2 border border-red-200">
            <ExternalLink className="w-3.5 h-3.5" /> Portal de Acesso Externo
          </div>
          <h3 className="text-sm font-bold text-slate-900">
            Abertura de Chamados e Requisições Sem Login
          </h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            Qualquer pessoa fora do sistema (professores, alunos, pais, prestadores) pode abrir chamados de manutenção e materiais com link direto.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => onOpenPublicPortal?.('os')}
              className="flex items-center justify-center gap-2 py-3 px-3 rounded-xl border border-red-200 bg-red-50/80 text-[#D32F2F] hover:bg-red-100 text-xs font-bold transition-all shadow-2xs cursor-pointer"
            >
              <Wrench className="w-4 h-4 shrink-0 text-[#D32F2F]" />
              <span>Abrir Ordem de Serviço (OS)</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenPublicPortal?.('materiais')}
              className="flex items-center justify-center gap-2 py-3 px-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 hover:bg-slate-100 text-xs font-bold transition-all shadow-2xs cursor-pointer"
            >
              <Package className="w-4 h-4 shrink-0 text-slate-700" />
              <span>Abrir Requisição de Materiais</span>
            </button>
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
