import React from 'react';
import { UserRole } from '../types';
import {
  ClipboardList,
  Monitor,
  Package,
  Megaphone,
  Wrench,
  SearchCheck,
  Users,
  Bell
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
  const isSuperAdmin = userRole === 'super_admin';
  const isAdmin = userRole === 'admin' || isSuperAdmin;

  const navItems = [
    {
      id: 'ordens_servico' as NavTab,
      label: 'Ordens de Serviço',
      shortLabel: 'OS',
      icon: ClipboardList,
      visible: true
    },
    {
      id: 'equipamentos' as NavTab,
      label: 'Equipamentos',
      shortLabel: 'Equipamentos',
      icon: Monitor,
      visible: true
    },
    {
      id: 'materiais' as NavTab,
      label: 'Materiais',
      shortLabel: 'Materiais',
      icon: Package,
      visible: true
    },
    {
      id: 'marketing' as NavTab,
      label: 'Marketing',
      shortLabel: 'Marketing',
      icon: Megaphone,
      visible: true
    },
    {
      id: 'suporte_tecnico' as NavTab,
      label: 'Suporte Técnico',
      shortLabel: 'Suporte TI',
      icon: Wrench,
      visible: true
    },
    {
      id: 'auditoria' as NavTab,
      label: 'Auditoria',
      shortLabel: 'Auditoria',
      icon: SearchCheck,
      visible: isAdmin
    },
    {
      id: 'usuarios' as NavTab,
      label: 'Usuários',
      shortLabel: 'Equipe',
      icon: Users,
      visible: isAdmin
    },
    {
      id: 'notificacoes' as NavTab,
      label: 'Notificações',
      shortLabel: 'Avisos',
      icon: Bell,
      visible: true,
      badge: unreadCount > 0 ? unreadCount : undefined
    }
  ];

  const visibleItems = navItems.filter((i) => i.visible);

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

      {/* Mobile Fixed Bottom Navigation Bar in Editorial Red */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#D32F2F] text-white border-t border-red-800 px-2 py-1.5 shadow-2xl">
        <div className="flex items-center justify-around max-w-md mx-auto">
          {visibleItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg transition-colors ${
                  isActive ? 'text-white font-bold bg-white/20' : 'text-white/70 hover:text-white'
                }`}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {item.badge !== undefined && (
                    <span className="absolute -top-1 -right-2 bg-white text-[#D32F2F] text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-[60px]">
                  {item.shortLabel}
                </span>
              </button>
            );
          })}
          {/* Overflow Menu trigger for Admin/Super Admin */}
          {isAdmin && (
            <button
              onClick={() => onSelectTab(activeTab === 'auditoria' ? 'usuarios' : 'auditoria')}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg transition-colors ${
                activeTab === 'auditoria' || activeTab === 'usuarios'
                  ? 'text-white font-bold bg-white/20'
                  : 'text-white/70'
              }`}
            >
              <SearchCheck className="w-5 h-5" />
              <span className="text-[10px] mt-0.5 tracking-tight">Mais</span>
            </button>
          )}
        </div>
      </nav>
    </>
  );
};
