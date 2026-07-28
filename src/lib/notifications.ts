import { AppNotification, AuditModule } from '../types';
import { storage } from './storage';

export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!('Notification' in window)) {
    console.warn('Este navegador não suporta Notificações Web.');
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted' && 'serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      console.log('Service Worker de Notificações registrado:', registration);
    }
    return permission;
  } catch (err) {
    console.error('Erro ao solicitar permissão de notificação:', err);
    return 'denied';
  }
};

export const sendLocalNotification = (title: string, options?: NotificationOptions & { url?: string }) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(title, {
          icon: 'https://i.imgur.com/8RP9DL7.png',
          badge: 'https://i.imgur.com/8RP9DL7.png',
          vibrate: [100, 50, 100],
          ...options
        } as any);
      });
    } else {
      new Notification(title, {
        icon: 'https://i.imgur.com/8RP9DL7.png',
        ...options
      });
    }
  }
};

export const createSystemNotification = async (
  userId: string,
  title: string,
  body: string,
  module: AuditModule,
  targetId?: string
): Promise<AppNotification> => {
  const newNotif: AppNotification = {
    id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    user_id: userId,
    title,
    body,
    module,
    target_id: targetId,
    is_read: false,
    created_at: new Date().toISOString()
  };

  await storage.addNotification(newNotif);

  // Trigger web browser push / notification if user has granted permission
  sendLocalNotification(title, {
    body,
    data: { url: `/#${module}` }
  });

  return newNotif;
};

export const sendEmailNotification = async (to: string, subject: string, title: string, body: string) => {
  try {
    const res = await fetch('/api/notifications/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, title, body })
    });
    const data = await res.json();
    return data;
  } catch (err) {
    console.error('Erro ao enviar e-mail de notificação:', err);
    return { success: false, error: err };
  }
};
