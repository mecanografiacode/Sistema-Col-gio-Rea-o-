import React, { useState } from 'react';
import { UserRole } from '../types';
import {
  ClipboardList,
  Monitor,
  Package,
  Megaphone,
  Wrench,
  SearchCheck,
  Users,
  Bell,
  Grid,
  X,
  ChevronRight
} from 'lucide-react';

export type NavTab =
  | 'ordens_servico'
  | 'equipamentos'
  | 'materiais'
  | 'marketing'
  | 'suporte_tecnico'
  | 'auditoria'
  | 'usuarios'
  | 'notificacoes';

interface NavigationProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  userRole: UserRole;
  unreadCount: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onSelectTab,
  userRole,
  unreadCount
}) => {
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const isSuperAdmin = userRole === 'super_admin';
  const isAdmin = userRole === 'admin' || isSuperAdmin;
  const isOperador = userRole === 'operador';

  const navItems = [
    {
      id: 'ordens_servico' as NavTab,
      label: 'Ordens de Serviço',
      shortLabel: 'O.S.',
      description: 'Abertura, acompanhamento e baixa de ordens de manutenção e serviços.',
      icon: ClipboardList,
      visible: true
    },
    {
      id: 'equipamentos' as NavTab,
      label: 'Equipamentos',
      shortLabel: 'Patrimônio',
      description: 'Inventário com fotos, status, QR Code e controle de empréstimos.',
      icon: Monitor,
      visible: isSuperAdmin
    },
    {
      id: 'materiais' as NavTab,
      label: 'Requisição de Materiais',
      shortLabel: 'Materiais',
      description: 'Solicitação de suprimentos pedagógicos e de limpeza.',
      icon: Package,
      visible: true
    },
    {
      id: 'marketing' as NavTab,
      label: 'Marketing & Mídia',
      shortLabel: 'Marketing',
      description: 'Cronograma de publicações, carrosséis, stories e métricas sociais.',
      icon: Megaphone,
      visible: isSuperAdmin
    },
    {
      id: 'suporte_tecnico' as NavTab,
      label: 'Suporte Técnico TI',
      shortLabel: 'Suporte TI',
      description: 'Helpdesk de tecnologia, computadores, redes e sistemas.',
      icon: Wrench,
      visible: true
    },
    {
      id: 'auditoria' as NavTab,
      label: 'Logs de Auditoria',
      shortLabel: 'Auditoria',
      description: 'Histórico completo de alterações e atividades dos usuários.',
      icon: SearchCheck,
      visible: isSuperAdmin
    },
    {
      id: 'usuarios' as NavTab,
      label: 'Gestão de Usuários',
      shortLabel: 'Equipe',
      description: 'Controle de acesso, perfis e permissões da equipe escolar.',
      icon: Users,
      visible: isSuperAdmin
    },
    {
      id: 'notificacoes' as NavTab,
      label: 'Notificações & Avisos',
      shortLabel: 'Avisos',
      description: 'Avisos do sistema e alertas em tempo real.',
      icon: Bell,
      visible: true,
      badge: unreadCount > 0 ? unreadCount : undefined
    }
  ];

  const visibleItems = navItems.filter((i) => i.visible);
  const primaryMobileItems = visibleItems.slice(0, 4);

  const handleSelectMobileTab = (tab: NavTab) => {
    onSelectTab(tab);
    setIsMobileDrawerOpen(false);
  };

  return (
    <>
      {/* Desktop Navigation Sidebar with Editorial Red Theme */}
      <aside className="hidden lg:flex w-64 shrink-0 bg-[#D32F2F] text-white flex-col justify-between min-h-[calc(100vh-4rem)] p-5 shadow-md">
        <div>
          {/* Logo & School Branding Badge */}
          <div className="flex flex-col items-center text-center pb-5 border-b border-white/15 mb-5">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center p-2.5 mb-3 shadow-md ring-4 ring-white/20">
              <img
                src="https://i.imgur.com/8RP9DL7.png"
                alt="Logo Colégio Reação"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <h2 className="text-white font-serif-editorial font-bold text-lg tracking-tight leading-tight">
              Colégio Reação
            </h2>
            <p className="text-white/75 text-[10px] font-semibold uppercase tracking-widest mt-1">
              Recanto das Emas — DF
            </p>
          </div>

          <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-white/60 mb-2">
            Módulos do Sistema
          </p>

          {/* Nav Items */}
          <div className="space-y-1">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-white/20 text-white font-bold border-l-4 border-white shadow-xs'
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-white/70'}`} />
                    <span className="tracking-wide">{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span className="bg-white text-[#D32F2F] text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Metadata & Info Box */}
        <div className="mt-8 pt-4 border-t border-white/15">
          <div className="bg-white/10 rounded-xl p-3 border border-white/15 text-white">
            <p className="text-xs font-bold text-white">Gestão Interna</p>
            <p className="text-[11px] text-white/80 mt-0.5">Versão 2.4 PWA • Supabase</p>
            <p className="text-[10px] text-white/60 mt-1.5">Colégio Reação — Recanto das Emas</p>
          </div>
        </div>
      </aside>

      {/* Mobile Professional Native App Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900 text-white border-t border-slate-800 px-2 py-2 shadow-2xl backdrop-blur-md bg-slate-900/95">
        <div className="flex items-center justify-around max-w-lg mx-auto">
          {primaryMobileItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelectMobileTab(item.id)}
                className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all ${
                  isActive
                    ? 'text-white font-bold bg-[#D32F2F] shadow-sm'
                    : 'text-slate-400 hover:text-white active:scale-95'
                }`}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {item.badge !== undefined && (
                    <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[9px] font-extrabold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center ring-2 ring-slate-900">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] mt-1 tracking-tight truncate max-w-[68px]">
                  {item.shortLabel}
                </span>
              </button>
            );
          })}

          {/* All Modules Drawer Toggle Button */}
          <button
            onClick={() => setIsMobileDrawerOpen(true)}
            className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all ${
              isMobileDrawerOpen || !primaryMobileItems.some((i) => i.id === activeTab)
                ? 'text-white font-bold bg-slate-800 border border-slate-700'
                : 'text-slate-400 hover:text-white active:scale-95'
            }`}
          >
            <div className="relative">
              <Grid className="w-5 h-5 text-red-400" />
              {unreadCount > 0 && !primaryMobileItems.some((i) => i.id === 'notificacoes') && (
                <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[9px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-slate-900">
                  {unreadCount}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-1 tracking-tight">Módulos</span>
          </button>
        </div>
      </nav>

      {/* Mobile Native App Bottom Sheet / Drawer */}
      {isMobileDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex flex-col justify-end animate-in fade-in duration-200">
          <div
            className="fixed inset-0"
            onClick={() => setIsMobileDrawerOpen(false)}
          />
          <div className="relative bg-white rounded-t-3xl shadow-2xl border-t border-slate-200 overflow-hidden max-h-[85vh] flex flex-col z-10 animate-in slide-in-from-bottom duration-250">
            {/* Sheet Handle & Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-full bg-red-600 flex items-center justify-center shadow-md">
                  <Grid className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Módulos do Sistema</h3>
                  <p className="text-[11px] text-slate-400">Colégio Reação — Recanto das Emas</p>
                </div>
              </div>
              <button
                onClick={() => setIsMobileDrawerOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List of Modules */}
            <div className="p-4 overflow-y-auto space-y-2 divide-y divide-slate-100">
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectMobileTab(item.id)}
                    className={`w-full text-left pt-2.5 pb-2.5 px-3 rounded-2xl flex items-center justify-between transition-all ${
                      isActive
                        ? 'bg-red-50 border border-red-200 text-red-900 font-bold'
                        : 'hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center space-x-3.5 pr-2">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          isActive
                            ? 'bg-[#D32F2F] text-white shadow-xs'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold leading-tight">{item.label}</span>
                          {item.badge !== undefined && (
                            <span className="bg-red-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                              {item.badge} novo{item.badge > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                          {item.description}
                        </p>
                      </div>
                    </div>
                    <ChevronRight
                      className={`w-5 h-5 shrink-0 ${
                        isActive ? 'text-red-600' : 'text-slate-300'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
