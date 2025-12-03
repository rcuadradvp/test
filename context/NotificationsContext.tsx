import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/config/supabase.config';
import { useAuthContext } from './AuthContext';
import { RealtimeChannel } from '@supabase/supabase-js';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export type Notification = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  data: any;
  created_at: string;
  updated_at: string;
};

type NotificationsContextType = {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  refreshNotifications: () => Promise<void>;
};

const NotificationsContext = createContext<NotificationsContextType>({} as NotificationsContextType);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { userLogged, isAuthenticated } = useAuthContext();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  // Cargar notificaciones
  const loadNotifications = useCallback(async () => {
    if (!userLogged?.userId || !isAuthenticated) return;

    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userLogged.userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setNotifications(data || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userLogged?.userId, isAuthenticated]);

  // Setup real-time subscription
  useEffect(() => {
    if (!userLogged?.userId || !isAuthenticated) {
      // Limpiar si no está autenticado
      if (channel) {
        channel.unsubscribe();
        setChannel(null);
      }
      setNotifications([]);
      return;
    }

    // Cargar notificaciones iniciales
    loadNotifications();

    // Setup real-time channel
    const realtimeChannel = supabase
      .channel(`notifications:${userLogged.userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userLogged.userId}`,
        },
        (payload) => {
          console.log('New notification:', payload.new);
          setNotifications((prev) => [payload.new as Notification, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userLogged.userId}`,
        },
        (payload) => {
          console.log('Updated notification:', payload.new);
          setNotifications((prev) =>
            prev.map((notif) =>
              notif.id === payload.new.id ? (payload.new as Notification) : notif
            )
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userLogged.userId}`,
        },
        (payload) => {
          console.log('Deleted notification:', payload.old);
          setNotifications((prev) =>
            prev.filter((notif) => notif.id !== payload.old.id)
          );
        }
      )
      .subscribe();

    setChannel(realtimeChannel);

    // Cleanup
    return () => {
      if (realtimeChannel) {
        realtimeChannel.unsubscribe();
      }
    };
  }, [userLogged?.userId, isAuthenticated, loadNotifications]);

  // Marcar como leída
  const markAsRead = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);

      if (error) throw error;

      // Actualizar localmente (también se actualizará por real-time)
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === id ? { ...notif, read: true } : notif
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  // Marcar todas como leídas
  const markAllAsRead = useCallback(async () => {
    if (!userLogged?.userId) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userLogged.userId)
        .eq('read', false);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, read: true }))
      );
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  }, [userLogged?.userId]);

  // Eliminar notificación
  const deleteNotification = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setNotifications((prev) => prev.filter((notif) => notif.id !== id));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }, []);

  // Refresh manual
  const refreshNotifications = useCallback(async () => {
    await loadNotifications();
  }, [loadNotifications]);

  // Contar no leídas
  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      isLoading,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      refreshNotifications,
    }),
    [
      notifications,
      unreadCount,
      isLoading,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      refreshNotifications,
    ]
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationsProvider');
  }
  return context;
}
