import React, { useState, useEffect } from 'react';
import { UserProfile } from './types';
import { storage } from './lib/storage';
import { Header } from './components/Header';
import { Navigation, NavTab } from './components/Navigation';
import { Login } from './components/Login';
import { PublicPortal } from './components/PublicPortal';
import { InstallModal } from './components/InstallModal';

import { OrdensServico } from './components/modules/OrdensServico';
import { Equipamentos } from './components/modules/Equipamentos';
import { RequisicaoMateriais } from './components/modules/RequisicaoMateriais';
import { Marketing } from './components/modules/Marketing';
import { SuporteTecnico } from './components/modules/SuporteTecnico';
import { Auditoria } from './components/modules/Auditoria';
import { GestaoUsuarios } from './components/modules/GestaoUsuarios';
import { Notificacoes } from './components/modules/Notificacoes';
import { EditorHorarios } from './components/modules/EditorHorarios';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('cr_current_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [activeTab, setActiveTab] = useState<NavTab>(() => {
    try {
      const saved = localStorage.getItem('cr_active_tab');
      return (saved as NavTab) || 'ordens_servico';
    } catch {
      return 'ordens_servico';
    }
  });
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('cr_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('cr_current_user');
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('cr_active_tab', activeTab);
  }, [activeTab]);

  // Public External Portal State
  const [isPublicPortalOpen, setIsPublicPortalOpen] = useState(false);
  const [publicPortalType, setPublicPortalType] = useState<'os' | 'materiais'>('os');

  // Modals
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<any>(null);

  // Check URL query params for direct external portal link access
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const portal = params.get('portal') || params.get('public');
    const hash = window.location.hash;

    if (portal === 'materiais' || hash.includes('materiais')) {
      setPublicPortalType('materiais');
      setIsPublicPortalOpen(true);
    } else if (portal === 'os' || portal === 'chamados' || hash.includes('os') || hash.includes('chamados')) {
      setPublicPortalType('os');
      setIsPublicPortalOpen(true);
    }
  }, []);

  const loadData = async () => {
    const profs = await storage.getProfiles();
    setProfiles(profs);

    if (currentUser) {
      const notifs = await storage.getNotifications(currentUser.id, currentUser.role);
      setUnreadCount(notifs.filter((n) => !n.is_read).length);
    }
  };

  useEffect(() => {
    if (currentUser?.role === 'operador') {
      const allowedTabs: NavTab[] = ['ordens_servico', 'materiais', 'suporte_tecnico', 'notificacoes'];
      if (!allowedTabs.includes(activeTab)) {
        setActiveTab('ordens_servico');
      }
    } else if (currentUser?.role === 'admin') {
      const allowedTabs: NavTab[] = ['ordens_servico', 'materiais', 'suporte_tecnico', 'editor_horarios', 'notificacoes'];
      if (!allowedTabs.includes(activeTab)) {
        setActiveTab('ordens_servico');
      }
    }
  }, [currentUser?.role, activeTab]);

  useEffect(() => {
    loadData();
    const unsubscribe = storage.subscribe(() => {
      loadData();
    });
    return () => unsubscribe();
  }, [currentUser?.id, currentUser?.role]);

  // Register PWA Service Worker & capture Install Prompt
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('SW PWA registrado com sucesso:', reg.scope);
          
          // Check for updates
          reg.onupdatefound = () => {
            const installingWorker = reg.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New update available, but we'll let the controllerchange handle the reload
                  console.log('Novo conteúdo disponível. Atualizando...');
                }
              };
            }
          };
        })
        .catch((err) => console.warn('Erro ao registrar SW:', err));

      // Reload the page when the new service worker takes control
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleTriggerInstall = () => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      deferredInstallPrompt.userChoice.then(() => {
        setDeferredInstallPrompt(null);
        setIsInstallModalOpen(false);
      });
    } else {
      setIsInstallModalOpen(true);
    }
  };

  if (isPublicPortalOpen && !currentUser) {
    return (
      <PublicPortal
        initialType={publicPortalType}
        onBackToLogin={() => setIsPublicPortalOpen(false)}
      />
    );
  }

  if (!currentUser) {
    return (
      <Login
        profiles={profiles}
        onLoginSuccess={(u) => {
          setIsPublicPortalOpen(false);
          setCurrentUser(u);
        }}
        onOpenPublicPortal={(type) => {
          setPublicPortalType(type);
          setIsPublicPortalOpen(true);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col font-['Plus_Jakarta_Sans',sans-serif] antialiased text-slate-800 selection:bg-red-100 selection:text-red-900">
      {/* App Header */}
      <Header
        currentUser={currentUser}
        unreadCount={unreadCount}
        onOpenNotifications={() => setActiveTab('notificacoes')}
        onOpenInstallModal={() => setIsInstallModalOpen(true)}
        onSwitchUser={() => setCurrentUser(null)}
        canInstallPWA={Boolean(deferredInstallPrompt) || true}
      />

      {/* Main Content Layout */}
      <div className="flex-1 w-full flex min-h-0">
        {/* Desktop Sidebar & Mobile Bottom Navigation */}
        <Navigation
          activeTab={activeTab}
          onSelectTab={(tab) => setActiveTab(tab)}
          userRole={currentUser.role}
          unreadCount={unreadCount}
        />

        {/* Dynamic Module Content */}
        <main className="flex-1 p-3 sm:p-5 lg:p-6 pb-24 lg:pb-6 min-w-0">
          {activeTab === 'ordens_servico' && <OrdensServico currentUser={currentUser} />}
          {activeTab === 'equipamentos' && <Equipamentos currentUser={currentUser} />}
          {activeTab === 'materiais' && <RequisicaoMateriais currentUser={currentUser} />}
          {activeTab === 'marketing' && <Marketing currentUser={currentUser} />}
          {activeTab === 'suporte_tecnico' && <SuporteTecnico currentUser={currentUser} />}
          {activeTab === 'auditoria' && <Auditoria currentUser={currentUser} />}
          {activeTab === 'usuarios' && <GestaoUsuarios currentUser={currentUser} />}
          {activeTab === 'editor_horarios' && <EditorHorarios currentUser={currentUser} />}
          {activeTab === 'notificacoes' && (
            <Notificacoes currentUser={currentUser} onNavigateTab={(tab) => setActiveTab(tab)} />
          )}
        </main>
      </div>

      {/* PWA Install Modal */}
      <InstallModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        onTriggerInstall={handleTriggerInstall}
      />
    </div>
  );
}
