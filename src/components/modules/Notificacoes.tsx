import React, { useState, useEffect } from 'react';
import { AppNotification, UserProfile } from '../../types';
import { storage } from '../../lib/storage';
import { requestNotificationPermission } from '../../lib/notifications';
import {
  Bell,
  CheckCircle,
  Clock,
  ExternalLink,
  Smartphone,
  ShieldCheck,
  CheckCheck
} from 'lucide-react';

interface NotificacoesProps {
  currentUser: UserProfile;
  onNavigateTab: (tab: any) => void;
}

export const Notificacoes: React.FC<NotificacoesProps> = ({ currentUser, onNavigateTab }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [pushStatus, setPushStatus] = useState<NotificationPermission>(
    'Notification' in window ? Notification.permission : 'denied'
  );

  const loadData = async () => {
    const list = await storage.getNotifications(currentUser.id, currentUser.role);
    setNotifications(list);
  };

  useEffect(() => {
    loadData();
    const unsubscribe = storage.subscribe(() => {
      loadData();
    });
    return () => unsubscribe();
  }, [currentUser.id, currentUser.role]);

  const handleEnableWebPush = async () => {
    const status = await requestNotificationPermission();
    setPushStatus(status);
  };

  const handleMarkAsRead = async (id: string, module: any) => {
    await storage.markNotificationRead(id);
    if (module) {
      if (currentUser.role === 'operador' && !['ordens_servico', 'materiais', 'suporte_tecnico', 'notificacoes'].includes(module)) {
        onNavigateTab('materiais');
      } else {
        onNavigateTab(module);
      }
    }
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Bell className="w-6 h-6 text-[#D32F2F]" />
            <h2 className="text-2xl font-serif-editorial font-bold text-gray-900">Central de Notificações</h2>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {currentUser.role === 'operador'
              ? 'Notificações e avisos referentes exclusivamente às requisições de materiais'
              : 'Avisos de novas OS, chamados respondidos, aprovações de materiais e tarefas'}
          </p>
        </div>

        {/* Web Push Permission Button */}
        <button
          onClick={handleEnableWebPush}
          className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider shadow-sm transition-colors ${
            pushStatus === 'granted'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-[#D32F2F] text-white hover:bg-red-800'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>
            {pushStatus === 'granted' ? 'Notificações Push Ativas' : 'Ativar Push no Navegador'}
          </span>
        </button>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-xs">
            <Bell className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">Nenhuma notificação no momento</p>
            <p className="text-xs text-slate-400 mt-1">Você receberá alertas em tempo real aqui.</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => handleMarkAsRead(n.id, n.module)}
              className={`p-4 rounded-2xl border shadow-2xs transition-all cursor-pointer flex items-start justify-between ${
                !n.is_read ? 'bg-red-50/50 border-red-200' : 'bg-white border-slate-200 opacity-80'
              }`}
            >
              <div className="flex items-start space-x-3">
                <div
                  className={`p-2 rounded-xl mt-0.5 ${
                    !n.is_read ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="text-xs font-bold text-slate-900">{n.title}</h4>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.2 rounded-md font-semibold">
                      {n.module}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{n.body}</p>
                  <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(n.created_at).toLocaleDateString('pt-BR')} {new Date(n.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {!n.is_read && (
                  <span className="w-2.5 h-2.5 bg-red-600 rounded-full animate-pulse" />
                )}
                <ExternalLink className="w-4 h-4 text-slate-400 hover:text-slate-700" />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
