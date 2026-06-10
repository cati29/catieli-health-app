import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { appClient } from '@/api/appClient';
import { useQuery } from '@tanstack/react-query';
import { Bell } from 'lucide-react';

export default function NotificationBell({ onClick }) {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const user = await appClient.auth.me();
      setCurrentUser(user);
    };
    fetchUser();
  }, []);

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const user = await appClient.auth.me();
      return appClient.entities.Notification.filter({ user_id: user.email, read: false }, '-created_date');
    },
    enabled: !!currentUser,
    refetchInterval: 30000, // Refresh every 30 seconds
    initialData: []
  });

  const unreadCount = notifications?.length || 0;

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="relative h-10 w-10 rounded-full border border-[var(--app-line)] bg-[var(--app-surface)] text-[var(--app-subtle)] shadow-[var(--app-shadow-1)] hover:text-[var(--app-ink)] transition-colors grid place-items-center"
      type="button"
      aria-label={`Abrir notificações${unreadCount > 0 ? `, ${unreadCount} não lidas` : ''}`}
      title="Notificações"
    >
      <Bell size={20} />
      
      <AnimatePresence>
        {unreadCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 px-1 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
