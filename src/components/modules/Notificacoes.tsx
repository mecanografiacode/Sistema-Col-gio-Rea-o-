import React, { useState, useEffect } from 'react';
import { AppNotification, UserProfile } from '../../types';
import { storage } from '../../lib/storage';
import { requestNotificationPermission, sendEmailNotification } from '../../lib/notifications';
import {
  Bell,
  CheckCircle,
  Clock,
  ExternalLink,
  Smartphone,
  ShieldCheck,
  CheckCheck,
  Mail
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
  const [testEmailStatus, setTestEmailStatus] = useState<string | null>(null);
  const [isSendingTest, setIsSendingTest] = useState(false);

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

  const handleTestEmail = async () => {
    setIsSendingTest(true);
    setTestEmailStatus(null);
    try {
      const res = await sendEmailNotification(
        currentUser.email,
        'Teste de Notificação por E-mail - Colégio Reação',
        'Notificação de Teste Funcionando!',
        `Olá ${currentUser.full_name}, este é um teste de disparo de e-mail para confirmar que as notificações do sistema estão configuradas corretamente.`
      );
      if (res.success) {
        setTestEmailStatus(res.provider === 'resend' ? 'E-mail enviado com sucesso via Resend!' : 'E-mail simulado com sucesso (configure RESEND_API_KEY no .env para envios reais).');
      } else {
        setTestEmailStatus('Erro ao enviar e-mail: ' + (res.error || 'Erro desconhecido'));
      }
    } catch (err: any) {
      setTestEmailStatus('Erro ao enviar: ' + err.message);
    } finally {
      setIsSendingTest(false);
    }
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

      {/* Email Integration Guide & Test Card */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-6 shadow-md space-y-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-red-600 rounded-xl">
            <Mail className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold">Como ativar o envio de notificações por e-mail para os usuários?</h3>
            <p className="text-xs text-slate-300 mt-0.5">
              O sistema possui integração nativa com o serviço de e-mail <strong>Resend</strong> (ou provedores SMTP).
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-300 pt-2 border-t border-slate-700">
          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
            <span className="font-bold text-white block mb-1">Passo 1: Obter Chave</span>
            Crie uma conta gratuita em <span className="text-red-400 font-mono">resend.com</span> e gere uma API Key de envio de e-mails.
          </div>
          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
            <span className="font-bold text-white block mb-1">Passo 2: Configurar Servidor</span>
            Adicione a variável <span className="text-red-400 font-mono">RESEND_API_KEY=re_...</span> no arquivo <span className="font-mono">.env</span> do projeto.
          </div>
          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
            <span className="font-bold text-white block mb-1">Passo 3: Disparos Automáticos</span>
            Sempre que houver eventos importantes (OS, Materiais, Suporte), o e-mail será entregue ao usuário.
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <span className="text-xs text-slate-400 truncate max-w-md">
            Destinatário do teste: <strong className="text-white">{currentUser.email}</strong>
          </span>
          <button
            onClick={handleTestEmail}
            disabled={isSendingTest}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors disabled:opacity-50 shadow-sm shrink-0"
          >
            {isSendingTest ? 'Enviando...' : 'Testar Envio para Meu E-mail'}
          </button>
        </div>

        {testEmailStatus && (
          <div className="p-3 bg-slate-800 border border-slate-700 rounded-xl text-xs text-amber-300 font-medium">
            {testEmailStatus}
          </div>
        )}
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
