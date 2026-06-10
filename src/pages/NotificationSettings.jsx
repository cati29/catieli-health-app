import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { appClient } from '@/api/appClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { 
  Bell, Droplet, Target, Trophy, MessageCircle, 
  Sparkles, Mail, Smartphone, Clock, Plus, X
} from 'lucide-react';

export default function NotificationSettings() {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const user = await appClient.auth.me();
      setCurrentUser(user);
    };
    fetchUser();
  }, []);

  // Fetch user profile
  const { data: profiles } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const user = await appClient.auth.me();
      return appClient.entities.UserProfile.filter({ created_by: user.email });
    },
    enabled: !!currentUser,
    initialData: []
  });

  const profile = profiles?.[0];

  // Default notification preferences if not set
  const notifPrefs = profile?.notification_preferences || {
    water_reminders: true,
    water_reminder_times: ['09:00', '12:00', '15:00', '18:00'],
    goal_reminders: true,
    goal_reminder_time: '20:00',
    challenge_alerts: true,
    achievement_alerts: true,
    nutritionist_messages: true,
    app_updates: true,
    marketing: false,
    email_notifications: true,
    push_notifications: true
  };

  const [prefs, setPrefs] = useState(notifPrefs);
  const [newWaterTime, setNewWaterTime] = useState('');

  useEffect(() => {
    if (profile?.notification_preferences) {
      setPrefs(profile.notification_preferences);
    }
  }, [profile]);

  // Update preferences mutation
  const updatePrefsMutation = useMutation({
    mutationFn: (newPrefs) => 
      appClient.entities.UserProfile.update(profile.id, {
        notification_preferences: newPrefs
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
    }
  });

  const handleToggle = (key, value) => {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    updatePrefsMutation.mutate(updated);
  };

  const addWaterTime = () => {
    if (newWaterTime && !prefs.water_reminder_times.includes(newWaterTime)) {
      const updated = { 
        ...prefs, 
        water_reminder_times: [...prefs.water_reminder_times, newWaterTime].sort() 
      };
      setPrefs(updated);
      updatePrefsMutation.mutate(updated);
      setNewWaterTime('');
    }
  };

  const removeWaterTime = (time) => {
    const updated = { 
      ...prefs, 
      water_reminder_times: prefs.water_reminder_times.filter(t => t !== time) 
    };
    setPrefs(updated);
    updatePrefsMutation.mutate(updated);
  };

  const updateGoalTime = (time) => {
    const updated = { ...prefs, goal_reminder_time: time };
    setPrefs(updated);
    updatePrefsMutation.mutate(updated);
  };

  const sections = [
    {
      title: 'Lembretes de Atividades',
      icon: Clock,
      color: 'text-blue-500',
      items: [
        {
          key: 'water_reminders',
          label: 'Lembretes de Hidratação',
          description: 'Receba lembretes para beber água durante o dia',
          icon: Droplet
        },
        {
          key: 'goal_reminders',
          label: 'Lembretes de Metas',
          description: 'Lembre-se de completar suas metas diárias',
          icon: Target
        }
      ]
    },
    {
      title: 'Notificações de Conquistas',
      icon: Trophy,
      color: 'text-amber-500',
      items: [
        {
          key: 'challenge_alerts',
          label: 'Alertas de Desafios',
          description: 'Notificações sobre novos desafios e prazos',
          icon: Trophy
        },
        {
          key: 'achievement_alerts',
          label: 'Conquistas e Badges',
          description: 'Celebre quando desbloquear conquistas',
          icon: Sparkles
        }
      ]
    },
    {
      title: 'Comunicação',
      icon: MessageCircle,
      color: 'text-emerald-500',
      items: [
        {
          key: 'nutritionist_messages',
          label: 'Mensagens do Nutricionista',
          description: 'Alertas de novas mensagens do seu nutricionista',
          icon: MessageCircle
        },
        {
          key: 'app_updates',
          label: 'Atualizações do App',
          description: 'Novos recursos e melhorias',
          icon: Sparkles
        },
        {
          key: 'marketing',
          label: 'Ofertas e Promoções',
          description: 'Notificações sobre planos e ofertas especiais',
          icon: Bell
        }
      ]
    },
    {
      title: 'Canais de Notificação',
      icon: Smartphone,
      color: 'text-emerald-600',
      items: [
        {
          key: 'push_notifications',
          label: 'Notificações Push',
          description: 'Receber notificações no dispositivo',
          icon: Smartphone
        },
        {
          key: 'email_notifications',
          label: 'Notificações por Email',
          description: 'Receber alertas importantes por email',
          icon: Mail
        }
      ]
    }
  ];

  return (
    <div className="app-shell min-h-screen bg-gradient-to-b from-slate-50 via-white to-[#f4f7f8] pb-20 md:pb-8">
      {/* Header */}
      <div className="module-header">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <Bell size={32} />
              </div>
              <div>
                <h1 className="text-4xl font-bold">Notificações</h1>
                <p className="text-white/80">Personalize seus alertas e lembretes</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {sections.map((section, idx) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white rounded-2xl shadow-md p-6"
          >
            <div className="flex items-center gap-2 mb-6">
              <section.icon className={section.color} size={24} />
              <h2 className="text-xl font-bold text-gray-800">{section.title}</h2>
            </div>

            <div className="space-y-4">
              {section.items.map((item) => (
                <div key={item.key} className="flex items-start justify-between py-3 border-b border-gray-100 last:border-0">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                      <item.icon size={20} className="text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <Label className="text-base font-semibold text-gray-800 mb-1 block">
                        {item.label}
                      </Label>
                      <p className="text-sm text-gray-500">{item.description}</p>

                      {/* Water reminder times */}
                      {item.key === 'water_reminders' && prefs.water_reminders && (
                        <div className="mt-3 space-y-2">
                          <p className="text-xs font-medium text-gray-600">Horários dos lembretes:</p>
                          <div className="flex flex-wrap gap-2">
                            {prefs.water_reminder_times?.map((time) => (
                              <div key={time} className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                                <span>{time}</span>
                                <button
                                  onClick={() => removeWaterTime(time)}
                                  className="hover:bg-blue-200 rounded-full p-0.5"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <Input
                              type="time"
                              value={newWaterTime}
                              onChange={(e) => setNewWaterTime(e.target.value)}
                              className="w-32 h-8 text-sm"
                            />
                            <Button
                              size="sm"
                              onClick={addWaterTime}
                              className="h-8"
                            >
                              <Plus size={14} className="mr-1" />
                              Adicionar
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Goal reminder time */}
                      {item.key === 'goal_reminders' && prefs.goal_reminders && (
                        <div className="mt-3">
                          <p className="text-xs font-medium text-gray-600 mb-2">Horário do lembrete:</p>
                          <Input
                            type="time"
                            value={prefs.goal_reminder_time}
                            onChange={(e) => updateGoalTime(e.target.value)}
                            className="w-32 h-8 text-sm"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  <Switch
                    checked={prefs[item.key]}
                    onCheckedChange={(checked) => handleToggle(item.key, checked)}
                    className="ml-4"
                  />
                </div>
              ))}
            </div>
          </motion.div>
        ))}

        {/* Save Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
          <p className="text-sm text-blue-800">
            S Suas preferências são salvas automaticamente
          </p>
        </div>
      </div>
    </div>
  );
}
