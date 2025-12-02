import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { RealtimeChannel } from '@supabase/supabase-js';

interface Notification {
  id: string;
  type: 'check_in' | 'analysis';
  message: string;
  timestamp: Date;
  read: boolean;
}

export const useRealtimeNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  useEffect(() => {
    setUnreadCount(notifications.filter(n => !n.read).length);
  }, [notifications]);

  useEffect(() => {
    if (!user) return;

    let checkInsChannel: RealtimeChannel;
    let analysesChannel: RealtimeChannel;

    const setupSubscriptions = async () => {
      // Subscribe to new check-ins
      checkInsChannel = supabase
        .channel('check-ins-notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'check_ins',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const newNotification: Notification = {
              id: `checkin-${payload.new.id}`,
              type: 'check_in',
              message: 'New check-in submitted',
              timestamp: new Date(),
              read: false,
            };
            setNotifications(prev => [newNotification, ...prev].slice(0, 50));
          }
        )
        .subscribe();

      // Subscribe to new analyses
      analysesChannel = supabase
        .channel('analyses-notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'analyses',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const newNotification: Notification = {
              id: `analysis-${payload.new.id}`,
              type: 'analysis',
              message: `New analysis completed: Score ${payload.new.score}`,
              timestamp: new Date(),
              read: false,
            };
            setNotifications(prev => [newNotification, ...prev].slice(0, 50));
          }
        )
        .subscribe();
    };

    setupSubscriptions();

    return () => {
      if (checkInsChannel) supabase.removeChannel(checkInsChannel);
      if (analysesChannel) supabase.removeChannel(analysesChannel);
    };
  }, [user]);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  };
};
