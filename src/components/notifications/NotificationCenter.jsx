import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  X,
  Trophy,
  Target,
  Award,
  Clock,
  TrendingUp,
  CheckCircle2,
  Trash2,
  ChevronRight
} from 'lucide-react';
import { appClient } from '@/api/appClient';
import { Button } from '@/components/ui/button';

export default function NotificationCenter({ isOpen, onClose }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    let mounted = true;
    const fetchUser = async () => {
      try {
        const user = await appClient.auth.me();
        if (mounted) setCurrentUser(user);
      } catch {
        if (mounted) setCurrentUser(null);
      }
    };
    fetchUser();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onEsc = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [isOpen, onClose]);

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const user = await appClient.auth.me();
      return appClient.entities.Notification.filter({ user_id: user.email }, '-created_date');
    },
    enabled: !!currentUser && isOpen,
    initialData: []
  });

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId) => appClient.entities.Notification.update(notificationId, { read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: (notificationId) => appClient.entities.Notification.delete(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter((notification) => !notification.read);
      await Promise.all(
        unread.map((notification) =>
          appClient.entities.Notification.update(notification.id, { read: true })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const handleNotificationClick = (notification) => {
    markAsReadMutation.mutate(notification.id);
    if (notification.action_url) {
      navigate(notification.action_url);
      onClose();
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'challenge_expiring':
        return <Clock className="text-orange-500" size={20} />;
      case 'goal_completed':
        return <Target className="text-emerald-500" size={20} />;
      case 'badge_unlocked':
        return <Award className="text-amber-500" size={20} />;
      case 'reminder':
        return <Bell className="text-blue-500" size={20} />;
      case 'achievement':
        return <Trophy className="text-violet-500" size={20} />;
      case 'level_up':
        return <TrendingUp className="text-indigo-500" size={20} />;
      default:
        return <Bell className="text-gray-500" size={20} />;
    }
  };

  const unreadNotifications = useMemo(
    () => notifications.filter((notification) => !notification.read),
    [notifications]
  );

  const readNotifications = useMemo(
    () => notifications.filter((notification) => notification.read),
    [notifications]
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/30 backdrop-blur-[1px] z-[65]"
          />

          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 210 }}
            className="fixed top-0 right-0 bottom-0 w-full md:w-[27rem] bg-[var(--app-surface)] border-l border-[var(--app-line)] shadow-[var(--app-shadow-3)] z-[70] flex flex-col"
            aria-label="Painel de notificações"
          >
            <div className="p-4 md:p-5 border-b border-[var(--app-line)] bg-[var(--app-surface-soft)]">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Bell className="text-emerald-500" size={22} />
                  <h2 className="text-xl font-bold text-[var(--app-ink)]">Notificações</h2>
                </div>
                <div className="flex items-center gap-2">
                  {unreadNotifications.length > 0 && (
                    <Button
                      onClick={() => markAllAsReadMutation.mutate()}
                      size="sm"
                      variant="outline"
                      className="h-9 px-3"
                    >
                      <CheckCircle2 size={15} className="mr-2" />
                      Marcar lidas
                    </Button>
                  )}
                  <button
                    onClick={onClose}
                    className="h-9 w-9 rounded-xl border border-[var(--app-line)] bg-[var(--app-surface)] text-[var(--app-subtle)] hover:text-[var(--app-ink)] transition-colors grid place-items-center"
                    aria-label="Recolher notificações"
                    title="Recolher notificações"
                    type="button"
                  >
                    <ChevronRight size={18} />
                  </button>
                  <button
                    onClick={onClose}
                    className="h-9 w-9 rounded-xl border border-[var(--app-line)] bg-[var(--app-surface)] text-[var(--app-subtle)] hover:text-[var(--app-ink)] transition-colors grid place-items-center"
                    aria-label="Fechar notificações"
                    title="Fechar notificações"
                    type="button"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-6">
                  <div className="w-16 h-16 bg-[var(--app-surface-soft)] rounded-full flex items-center justify-center mb-4">
                    <Bell className="text-gray-400" size={32} />
                  </div>
                  <p className="text-[var(--app-subtle)]">Nenhuma notificação</p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--app-line)]">
                  {unreadNotifications.length > 0 && (
                    <>
                      <div className="px-5 py-2.5 bg-[var(--app-surface-soft)]">
                        <p className="text-xs font-semibold text-[var(--app-subtle)] uppercase">
                          Não lidas ({unreadNotifications.length})
                        </p>
                      </div>
                      {unreadNotifications.map((notification) => (
                        <motion.div
                          key={notification.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="p-4 hover:bg-[var(--app-surface-soft)] transition-colors cursor-pointer bg-emerald-50/50"
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div className="flex gap-3">
                            <div className="flex-shrink-0 mt-1">
                              {getNotificationIcon(notification.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-[var(--app-ink)] text-sm mb-1">
                                {notification.title}
                              </h4>
                              <p className="text-sm text-[var(--app-subtle)] mb-2">
                                {notification.message}
                              </p>
                              <p className="text-xs text-gray-400">
                                {new Date(notification.created_date).toLocaleString('pt-BR')}
                              </p>
                            </div>
                            <button
                              onClick={(event) => {
                                event.stopPropagation();
                                deleteNotificationMutation.mutate(notification.id);
                              }}
                              className="flex-shrink-0 p-1 hover:bg-red-100 rounded transition-colors"
                              type="button"
                              aria-label="Excluir notificação"
                            >
                              <Trash2 size={14} className="text-red-500" />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </>
                  )}

                  {readNotifications.length > 0 && (
                    <>
                      <div className="px-5 py-2.5 bg-[var(--app-surface-soft)]">
                        <p className="text-xs font-semibold text-[var(--app-subtle)] uppercase">
                          Anteriores
                        </p>
                      </div>
                      {readNotifications.map((notification) => (
                        <motion.div
                          key={notification.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="p-4 hover:bg-[var(--app-surface-soft)] transition-colors cursor-pointer opacity-70"
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div className="flex gap-3">
                            <div className="flex-shrink-0 mt-1">
                              {getNotificationIcon(notification.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-[var(--app-ink)] text-sm mb-1">
                                {notification.title}
                              </h4>
                              <p className="text-sm text-[var(--app-subtle)] mb-2">
                                {notification.message}
                              </p>
                              <p className="text-xs text-gray-400">
                                {new Date(notification.created_date).toLocaleString('pt-BR')}
                              </p>
                            </div>
                            <button
                              onClick={(event) => {
                                event.stopPropagation();
                                deleteNotificationMutation.mutate(notification.id);
                              }}
                              className="flex-shrink-0 p-1 hover:bg-red-100 rounded transition-colors"
                              type="button"
                              aria-label="Excluir notificação"
                            >
                              <Trash2 size={14} className="text-red-500" />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
